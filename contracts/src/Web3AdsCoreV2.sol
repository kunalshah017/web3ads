// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Web3AdsCoreV2
 * @notice ETH-based Web3Ads platform with ERC-2771 gasless transaction support
 * @dev Handles campaign deposits, impression tracking, and reward distribution using native ETH
 */
contract Web3AdsCoreV2 is Ownable, ReentrancyGuard {
    // ============================================
    // CONSTANTS
    // ============================================

    uint256 public constant PUBLISHER_SHARE = 50; // 50%
    uint256 public constant VIEWER_SHARE = 20; // 20%
    uint256 public constant PLATFORM_SHARE = 30; // 30%
    uint256 public constant SHARE_BASE = 100;

    // Minimum withdrawal: 1 wei for demo (essentially no minimum)
    // For production: 0.0001 ether (~$0.20 at $2000/ETH)
    uint256 public constant MIN_WITHDRAWAL = 1 wei;

    // DEMO CPM rates - inflated for hackathon demo
    // Goal: Viewer earns ~$1 after viewing 5 banner ads
    // At $2000/ETH: 0.5 ETH = $1000 CPM = $1 per ad
    // Viewer gets 20% = $0.20 per ad × 5 ads = $1.00
    uint256 public constant CPM_BANNER = 0.5 ether; // $1000 CPM (demo)
    uint256 public constant CPM_SQUARE = 0.75 ether; // $1500 CPM (demo)
    uint256 public constant CPM_SIDEBAR = 1 ether; // $2000 CPM (demo)
    uint256 public constant CPM_INTERSTITIAL = 2 ether; // $4000 CPM (demo)

    // ============================================
    // ERC-2771 GASLESS SUPPORT
    // ============================================

    address public immutable trustedForwarder;

    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == trustedForwarder;
    }

    function _msgSender() internal view override returns (address sender) {
        if (isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
            // Last 20 bytes = real user appended by Forwarder.execute()
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            sender = msg.sender;
        }
    }

    // ============================================
    // STATE
    // ============================================

    // Advertiser => campaign ID => Campaign
    mapping(address => mapping(bytes32 => Campaign)) public campaigns;

    // Publisher => pending balance (ETH)
    mapping(address => uint256) public publisherBalances;

    // Viewer commitment => pending balance (ETH)
    mapping(bytes32 => uint256) public viewerBalances;

    // Platform treasury balance (ETH)
    uint256 public platformBalance;

    // Processed nullifiers (prevents double-counting)
    mapping(bytes32 => bool) public processedNullifiers;

    // Backend signer address (for impression verification)
    address public backendSigner;

    // ============================================
    // STRUCTS & ENUMS
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
        uint256 cpmRate; // Cost per 1000 impressions in ETH (18 decimals)
        uint256 budget; // Total budget in ETH
        uint256 spent; // Amount spent in ETH
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
    error InvalidPayment();

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor(address _backendSigner, address _trustedForwarder) Ownable(msg.sender) {
        backendSigner = _backendSigner;
        trustedForwarder = _trustedForwarder;
    }

    // ============================================
    // ADVERTISER FUNCTIONS
    // ============================================

    /**
     * @notice Create a new advertising campaign with ETH deposit
     * @param campaignId Unique identifier for the campaign
     * @param adType Type of ad (BANNER, SQUARE, SIDEBAR, INTERSTITIAL)
     */
    function createCampaign(bytes32 campaignId, AdType adType) external payable nonReentrant {
        address sender = _msgSender();
        
        if (campaigns[sender][campaignId].createdAt != 0) {
            revert InvalidCampaign();
        }

        // Get default CPM rate for ad type
        uint256 cpmRate = _getCpmRate(adType);

        campaigns[sender][campaignId] = Campaign({
            advertiser: sender,
            adType: adType,
            cpmRate: cpmRate,
            budget: msg.value,
            spent: 0,
            status: msg.value > 0 ? CampaignStatus.INACTIVE : CampaignStatus.INACTIVE,
            createdAt: block.timestamp
        });

        emit CampaignCreated(sender, campaignId, adType, cpmRate, msg.value);
    }

    /**
     * @notice Add funds to an existing campaign
     * @param campaignId Campaign to fund
     */
    function fundCampaign(bytes32 campaignId) external payable nonReentrant {
        address sender = _msgSender();
        Campaign storage campaign = campaigns[sender][campaignId];
        
        if (campaign.createdAt == 0) revert InvalidCampaign();
        if (msg.value == 0) revert InvalidPayment();

        campaign.budget += msg.value;

        emit CampaignFunded(sender, campaignId, msg.value);
    }

    /**
     * @notice Activate a campaign
     * @param campaignId Campaign to activate
     */
    function activateCampaign(bytes32 campaignId) external {
        address sender = _msgSender();
        Campaign storage campaign = campaigns[sender][campaignId];
        
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
        address sender = _msgSender();
        Campaign storage campaign = campaigns[sender][campaignId];
        
        if (campaign.createdAt == 0) revert InvalidCampaign();

        campaign.status = CampaignStatus.PAUSED;
        emit CampaignStatusChanged(campaignId, CampaignStatus.PAUSED);
    }

    /**
     * @notice Withdraw remaining budget from a paused/completed campaign
     * @param campaignId Campaign to withdraw from
     */
    function withdrawCampaignBudget(bytes32 campaignId) external nonReentrant {
        address sender = _msgSender();
        Campaign storage campaign = campaigns[sender][campaignId];
        
        if (campaign.createdAt == 0) revert InvalidCampaign();
        if (campaign.status == CampaignStatus.ACTIVE) revert CampaignNotActive();
        
        uint256 remaining = campaign.budget - campaign.spent;
        if (remaining == 0) revert InsufficientBalance();
        
        campaign.budget = campaign.spent;
        
        (bool success, ) = payable(sender).call{value: remaining}("");
        if (!success) revert TransferFailed();
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
     * @notice Publisher withdraws their earnings (supports gasless via forwarder)
     */
    function withdrawPublisher() external nonReentrant {
        address sender = _msgSender();
        uint256 balance = publisherBalances[sender];
        
        if (balance < MIN_WITHDRAWAL) revert BelowMinimumWithdrawal();

        publisherBalances[sender] = 0;
        
        (bool success, ) = payable(sender).call{value: balance}("");
        if (!success) revert TransferFailed();

        emit PublisherWithdrawal(sender, balance);
    }

    /**
     * @notice Publisher withdraws to custom recipient using backend signature (gasless)
     * @param publisher Publisher's wallet address
     * @param recipient Address to receive funds
     * @param proof Backend signature proving authorization
     */
    function withdrawPublisherTo(address publisher, address recipient, bytes calldata proof) external nonReentrant {
        // Verify backend signature
        bytes32 messageHash = keccak256(abi.encodePacked(publisher, recipient));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        address signer = _recoverSigner(ethSignedHash, proof);
        if (signer != backendSigner) revert InvalidSignature();

        uint256 balance = publisherBalances[publisher];
        if (balance < MIN_WITHDRAWAL) revert BelowMinimumWithdrawal();

        publisherBalances[publisher] = 0;
        
        (bool success, ) = payable(recipient).call{value: balance}("");
        if (!success) revert TransferFailed();

        emit PublisherWithdrawal(publisher, balance);
    }

    /**
     * @notice Viewer withdraws their earnings using backend signature
     * @param commitment Semaphore commitment
     * @param recipient Address to receive funds
     * @param proof Backend signature proving commitment ownership
     */
    function withdrawViewer(bytes32 commitment, address recipient, bytes calldata proof) external nonReentrant {
        // Verify backend signature
        bytes32 messageHash = keccak256(abi.encodePacked(commitment, recipient));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        address signer = _recoverSigner(ethSignedHash, proof);
        if (signer != backendSigner) revert InvalidSignature();

        uint256 balance = viewerBalances[commitment];
        if (balance < MIN_WITHDRAWAL) revert BelowMinimumWithdrawal();

        viewerBalances[commitment] = 0;
        
        (bool success, ) = payable(recipient).call{value: balance}("");
        if (!success) revert TransferFailed();

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
        
        (bool success, ) = payable(recipient).call{value: amount}("");
        if (!success) revert TransferFailed();

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

    function getCpmRate(AdType adType) external pure returns (uint256) {
        return _getCpmRate(adType);
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    function _getCpmRate(AdType adType) internal pure returns (uint256) {
        if (adType == AdType.BANNER) return CPM_BANNER;
        if (adType == AdType.SQUARE) return CPM_SQUARE;
        if (adType == AdType.SIDEBAR) return CPM_SIDEBAR;
        if (adType == AdType.INTERSTITIAL) return CPM_INTERSTITIAL;
        return CPM_BANNER;
    }

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

    // ============================================
    // RECEIVE ETH
    // ============================================

    receive() external payable {}
}
