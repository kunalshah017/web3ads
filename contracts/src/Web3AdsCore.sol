// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Web3AdsCore
 * @notice Main contract for the Web3Ads platform
 * @dev Handles campaign deposits, impression tracking, and reward distribution
 */
contract Web3AdsCore is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================
    // CONSTANTS
    // ============================================

    uint256 public constant PUBLISHER_SHARE = 50; // 50%
    uint256 public constant VIEWER_SHARE = 20; // 20%
    uint256 public constant PLATFORM_SHARE = 30; // 30%
    uint256 public constant SHARE_BASE = 100;

    uint256 public constant MIN_WITHDRAWAL = 10 * 1e6; // 10 USDC (6 decimals)

    // ============================================
    // STATE
    // ============================================

    IERC20 public immutable paymentToken; // USDC

    // Advertiser => campaign ID => Campaign
    mapping(address => mapping(bytes32 => Campaign)) public campaigns;

    // Publisher => pending balance
    mapping(address => uint256) public publisherBalances;

    // Viewer commitment => pending balance (uses semaphore commitment)
    mapping(bytes32 => uint256) public viewerBalances;

    // Platform treasury balance
    uint256 public platformBalance;

    // Processed nullifiers (prevents double-counting)
    mapping(bytes32 => bool) public processedNullifiers;

    // Backend signer address (for impression verification)
    address public backendSigner;

    // ============================================
    // STRUCTS
    // ============================================

    enum AdType {
        BANNER,
        SQUARE,
        SIDEBAR,
        INTERSTITIAL
    }

    enum CampaignStatus {
        INACTIVE,
        ACTIVE,
        PAUSED,
        COMPLETED
    }

    struct Campaign {
        address advertiser;
        AdType adType;
        uint256 cpmRate; // Cost per 1000 impressions in payment token (6 decimals)
        uint256 budget; // Total budget
        uint256 spent; // Amount spent
        CampaignStatus status;
        uint256 createdAt;
    }

    // ============================================
    // EVENTS
    // ============================================

    event CampaignCreated(
        address indexed advertiser, bytes32 indexed campaignId, AdType adType, uint256 cpmRate, uint256 budget
    );

    event CampaignFunded(address indexed advertiser, bytes32 indexed campaignId, uint256 amount);

    event CampaignStatusChanged(bytes32 indexed campaignId, CampaignStatus newStatus);

    event ImpressionRecorded(
        bytes32 indexed campaignId,
        address indexed publisher,
        bytes32 viewerCommitment,
        uint256 publisherEarning,
        uint256 viewerEarning
    );

    event PublisherWithdrawal(address indexed publisher, uint256 amount);

    event ViewerWithdrawal(bytes32 indexed commitment, address indexed recipient, uint256 amount);

    event PlatformWithdrawal(address indexed recipient, uint256 amount);

    // ============================================
    // ERRORS
    // ============================================

    error InvalidCampaign();
    error InsufficientBudget();
    error CampaignNotActive();
    error NullifierAlreadyUsed();
    error InvalidSignature();
    error InsufficientBalance();
    error BelowMinimumWithdrawal();
    error TransferFailed();

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor(address _paymentToken, address _backendSigner) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
        backendSigner = _backendSigner;
    }

    // ============================================
    // ADVERTISER FUNCTIONS
    // ============================================

    /**
     * @notice Create a new advertising campaign
     * @param campaignId Unique identifier for the campaign
     * @param adType Type of ad (BANNER, SQUARE, SIDEBAR, INTERSTITIAL)
     * @param cpmRate Cost per 1000 impressions
     * @param budget Total campaign budget
     */
    function createCampaign(bytes32 campaignId, AdType adType, uint256 cpmRate, uint256 budget) external nonReentrant {
        if (campaigns[msg.sender][campaignId].createdAt != 0) {
            revert InvalidCampaign();
        }

        campaigns[msg.sender][campaignId] = Campaign({
            advertiser: msg.sender,
            adType: adType,
            cpmRate: cpmRate,
            budget: 0,
            spent: 0,
            status: CampaignStatus.INACTIVE,
            createdAt: block.timestamp
        });

        if (budget > 0) {
            _fundCampaign(msg.sender, campaignId, budget);
        }

        emit CampaignCreated(msg.sender, campaignId, adType, cpmRate, budget);
    }

    /**
     * @notice Add funds to an existing campaign
     * @param campaignId Campaign to fund
     * @param amount Amount to add
     */
    function fundCampaign(bytes32 campaignId, uint256 amount) external nonReentrant {
        _fundCampaign(msg.sender, campaignId, amount);
    }

    function _fundCampaign(address advertiser, bytes32 campaignId, uint256 amount) internal {
        Campaign storage campaign = campaigns[advertiser][campaignId];
        if (campaign.createdAt == 0) revert InvalidCampaign();

        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        campaign.budget += amount;

        emit CampaignFunded(advertiser, campaignId, amount);
    }

    /**
     * @notice Activate a campaign
     * @param campaignId Campaign to activate
     */
    function activateCampaign(bytes32 campaignId) external {
        Campaign storage campaign = campaigns[msg.sender][campaignId];
        if (campaign.createdAt == 0) revert InvalidCampaign();
        if (campaign.budget <= campaign.spent) revert InsufficientBudget();

        campaign.status = CampaignStatus.ACTIVE;
        emit CampaignStatusChanged(campaignId, CampaignStatus.ACTIVE);
    }

    /**
     * @notice Pause a campaign
     * @param campaignId Campaign to pause
     */
    function pauseCampaign(bytes32 campaignId) external {
        Campaign storage campaign = campaigns[msg.sender][campaignId];
        if (campaign.createdAt == 0) revert InvalidCampaign();

        campaign.status = CampaignStatus.PAUSED;
        emit CampaignStatusChanged(campaignId, CampaignStatus.PAUSED);
    }

    // ============================================
    // IMPRESSION RECORDING (Backend only)
    // ============================================

    /**
     * @notice Record an ad impression (called by backend)
     * @param advertiser Advertiser address
     * @param campaignId Campaign ID
     * @param publisher Publisher wallet address
     * @param viewerCommitment Semaphore commitment (0x0 if no extension)
     * @param nullifier Unique nullifier to prevent replay
     * @param signature Backend signature for verification
     */
    function recordImpression(
        address advertiser,
        bytes32 campaignId,
        address publisher,
        bytes32 viewerCommitment,
        bytes32 nullifier,
        bytes calldata signature
    ) external nonReentrant {
        // Verify signature from backend
        bytes32 messageHash = keccak256(abi.encodePacked(advertiser, campaignId, publisher, viewerCommitment, nullifier));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        address signer = _recoverSigner(ethSignedHash, signature);
        if (signer != backendSigner) revert InvalidSignature();

        // Check nullifier hasn't been used
        if (processedNullifiers[nullifier]) revert NullifierAlreadyUsed();
        processedNullifiers[nullifier] = true;

        // Get campaign
        Campaign storage campaign = campaigns[advertiser][campaignId];
        if (campaign.status != CampaignStatus.ACTIVE) revert CampaignNotActive();

        // Calculate cost per impression
        uint256 costPerImpression = campaign.cpmRate / 1000;
        if (campaign.budget < campaign.spent + costPerImpression) revert InsufficientBudget();

        // Update campaign spent
        campaign.spent += costPerImpression;

        // Calculate revenue split
        uint256 publisherEarning = (costPerImpression * PUBLISHER_SHARE) / SHARE_BASE;
        uint256 viewerEarning = 0;
        uint256 platformEarning;

        // If viewer has extension (commitment != 0), they get their share
        if (viewerCommitment != bytes32(0)) {
            viewerEarning = (costPerImpression * VIEWER_SHARE) / SHARE_BASE;
            platformEarning = (costPerImpression * PLATFORM_SHARE) / SHARE_BASE;
            viewerBalances[viewerCommitment] += viewerEarning;
        } else {
            // No extension - platform gets viewer's share too
            platformEarning = costPerImpression - publisherEarning;
        }

        // Update balances
        publisherBalances[publisher] += publisherEarning;
        platformBalance += platformEarning;

        emit ImpressionRecorded(campaignId, publisher, viewerCommitment, publisherEarning, viewerEarning);

        // Check if campaign budget is exhausted
        if (campaign.spent >= campaign.budget) {
            campaign.status = CampaignStatus.COMPLETED;
            emit CampaignStatusChanged(campaignId, CampaignStatus.COMPLETED);
        }
    }

    // ============================================
    // WITHDRAWAL FUNCTIONS
    // ============================================

    /**
     * @notice Publisher withdraws their earnings
     */
    function withdrawPublisher() external nonReentrant {
        uint256 balance = publisherBalances[msg.sender];
        if (balance < MIN_WITHDRAWAL) revert BelowMinimumWithdrawal();

        publisherBalances[msg.sender] = 0;
        paymentToken.safeTransfer(msg.sender, balance);

        emit PublisherWithdrawal(msg.sender, balance);
    }

    /**
     * @notice Viewer withdraws their earnings using zkProof
     * @param commitment Semaphore commitment
     * @param recipient Address to receive funds
     * @param proof ZK proof of commitment ownership (simplified for MVP)
     */
    function withdrawViewer(bytes32 commitment, address recipient, bytes calldata proof) external nonReentrant {
        // In production, this would verify a Semaphore proof
        // For MVP, we'll use a backend signature approach
        bytes32 messageHash = keccak256(abi.encodePacked(commitment, recipient));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        address signer = _recoverSigner(ethSignedHash, proof);
        if (signer != backendSigner) revert InvalidSignature();

        uint256 balance = viewerBalances[commitment];
        if (balance < MIN_WITHDRAWAL) revert BelowMinimumWithdrawal();

        viewerBalances[commitment] = 0;
        paymentToken.safeTransfer(recipient, balance);

        emit ViewerWithdrawal(commitment, recipient, balance);
    }

    /**
     * @notice Owner withdraws platform fees
     * @param recipient Address to receive funds
     * @param amount Amount to withdraw
     */
    function withdrawPlatform(address recipient, uint256 amount) external onlyOwner nonReentrant {
        if (amount > platformBalance) revert InsufficientBalance();

        platformBalance -= amount;
        paymentToken.safeTransfer(recipient, amount);

        emit PlatformWithdrawal(recipient, amount);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Update backend signer address
     * @param _newSigner New signer address
     */
    function setBackendSigner(address _newSigner) external onlyOwner {
        backendSigner = _newSigner;
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function getCampaign(address advertiser, bytes32 campaignId) external view returns (Campaign memory) {
        return campaigns[advertiser][campaignId];
    }

    function getPublisherBalance(address publisher) external view returns (uint256) {
        return publisherBalances[publisher];
    }

    function getViewerBalance(bytes32 commitment) external view returns (uint256) {
        return viewerBalances[commitment];
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    function _recoverSigner(bytes32 hash, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) return address(0);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v < 27) v += 27;

        return ecrecover(hash, v, r, s);
    }
}
