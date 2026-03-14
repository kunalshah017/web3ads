// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Web3AdsCore.sol";
import "../src/mocks/MockERC20.sol";

contract Web3AdsCoreTest is Test {
    Web3AdsCore public core;
    MockERC20 public usdc;

    address public owner;
    address public backendSigner;
    uint256 public backendSignerKey;
    address public advertiser;
    address public publisher;
    address public viewer;

    bytes32 public constant CAMPAIGN_ID = keccak256("test-campaign-1");
    uint256 public constant CPM_RATE = 3_000_000; // $3 CPM (6 decimals)
    uint256 public constant BUDGET = 100_000_000; // $100 USDC

    event CampaignCreated(
        address indexed advertiser, bytes32 indexed campaignId, Web3AdsCore.AdType adType, uint256 cpmRate, uint256 budget
    );
    event ImpressionRecorded(
        bytes32 indexed campaignId,
        address indexed publisher,
        bytes32 viewerCommitment,
        uint256 publisherEarning,
        uint256 viewerEarning
    );
    event PublisherWithdrawal(address indexed publisher, uint256 amount);

    function setUp() public {
        owner = address(this);
        (backendSigner, backendSignerKey) = makeAddrAndKey("backendSigner");
        advertiser = makeAddr("advertiser");
        publisher = makeAddr("publisher");
        viewer = makeAddr("viewer");

        // Deploy mock USDC
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // Deploy Web3AdsCore
        core = new Web3AdsCore(address(usdc), backendSigner);

        // Fund advertiser with USDC
        usdc.mint(advertiser, 1_000_000_000_000); // 1M USDC
    }

    // ============================================
    // CAMPAIGN CREATION TESTS
    // ============================================

    function test_CreateCampaign() public {
        vm.startPrank(advertiser);
        usdc.approve(address(core), BUDGET);

        vm.expectEmit(true, true, false, true);
        emit CampaignCreated(advertiser, CAMPAIGN_ID, Web3AdsCore.AdType.SQUARE, CPM_RATE, BUDGET);

        core.createCampaign(CAMPAIGN_ID, Web3AdsCore.AdType.SQUARE, CPM_RATE, BUDGET);
        vm.stopPrank();

        Web3AdsCore.Campaign memory campaign = core.getCampaign(advertiser, CAMPAIGN_ID);
        assertEq(campaign.advertiser, advertiser);
        assertEq(uint256(campaign.adType), uint256(Web3AdsCore.AdType.SQUARE));
        assertEq(campaign.cpmRate, CPM_RATE);
        assertEq(campaign.budget, BUDGET);
        assertEq(campaign.spent, 0);
        assertEq(uint256(campaign.status), uint256(Web3AdsCore.CampaignStatus.INACTIVE));
    }

    function test_CreateCampaignWithoutBudget() public {
        vm.prank(advertiser);
        core.createCampaign(CAMPAIGN_ID, Web3AdsCore.AdType.BANNER, CPM_RATE, 0);

        Web3AdsCore.Campaign memory campaign = core.getCampaign(advertiser, CAMPAIGN_ID);
        assertEq(campaign.budget, 0);
    }

    function test_RevertWhen_DuplicateCampaignId() public {
        vm.startPrank(advertiser);
        usdc.approve(address(core), BUDGET * 2);
        core.createCampaign(CAMPAIGN_ID, Web3AdsCore.AdType.SQUARE, CPM_RATE, BUDGET);

        vm.expectRevert(Web3AdsCore.InvalidCampaign.selector);
        core.createCampaign(CAMPAIGN_ID, Web3AdsCore.AdType.BANNER, CPM_RATE, BUDGET);
        vm.stopPrank();
    }

    // ============================================
    // CAMPAIGN FUNDING TESTS
    // ============================================

    function test_FundCampaign() public {
        vm.startPrank(advertiser);
        core.createCampaign(CAMPAIGN_ID, Web3AdsCore.AdType.SQUARE, CPM_RATE, 0);

        usdc.approve(address(core), BUDGET);
        core.fundCampaign(CAMPAIGN_ID, BUDGET);
        vm.stopPrank();

        Web3AdsCore.Campaign memory campaign = core.getCampaign(advertiser, CAMPAIGN_ID);
        assertEq(campaign.budget, BUDGET);
    }

    function test_RevertWhen_FundingNonexistentCampaign() public {
        vm.startPrank(advertiser);
        usdc.approve(address(core), BUDGET);

        vm.expectRevert(Web3AdsCore.InvalidCampaign.selector);
        core.fundCampaign(CAMPAIGN_ID, BUDGET);
        vm.stopPrank();
    }

    // ============================================
    // CAMPAIGN ACTIVATION TESTS
    // ============================================

    function test_ActivateCampaign() public {
        _createAndFundCampaign();

        vm.prank(advertiser);
        core.activateCampaign(CAMPAIGN_ID);

        Web3AdsCore.Campaign memory campaign = core.getCampaign(advertiser, CAMPAIGN_ID);
        assertEq(uint256(campaign.status), uint256(Web3AdsCore.CampaignStatus.ACTIVE));
    }

    function test_RevertWhen_ActivatingCampaignWithNoBudget() public {
        vm.prank(advertiser);
        core.createCampaign(CAMPAIGN_ID, Web3AdsCore.AdType.SQUARE, CPM_RATE, 0);

        vm.prank(advertiser);
        vm.expectRevert(Web3AdsCore.InsufficientBudget.selector);
        core.activateCampaign(CAMPAIGN_ID);
    }

    // ============================================
    // IMPRESSION RECORDING TESTS
    // ============================================

    function test_RecordImpression_WithViewerExtension() public {
        _createFundAndActivateCampaign();

        bytes32 viewerCommitment = keccak256(abi.encodePacked("viewer-semaphore-commitment"));
        bytes32 nullifier = keccak256(abi.encodePacked("unique-nullifier-1"));

        bytes memory signature = _signImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier);

        vm.expectEmit(true, true, false, true);
        uint256 costPerImpression = CPM_RATE / 1000; // $0.003
        uint256 publisherEarning = (costPerImpression * 50) / 100; // 50%
        uint256 viewerEarning = (costPerImpression * 20) / 100; // 20%
        emit ImpressionRecorded(CAMPAIGN_ID, publisher, viewerCommitment, publisherEarning, viewerEarning);

        core.recordImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier, signature);

        // Check balances
        assertEq(core.getPublisherBalance(publisher), publisherEarning);
        assertEq(core.getViewerBalance(viewerCommitment), viewerEarning);

        // Platform gets 30%
        uint256 platformEarning = (costPerImpression * 30) / 100;
        assertEq(core.platformBalance(), platformEarning);
    }

    function test_RecordImpression_WithoutViewerExtension() public {
        _createFundAndActivateCampaign();

        bytes32 viewerCommitment = bytes32(0); // No extension
        bytes32 nullifier = keccak256(abi.encodePacked("unique-nullifier-2"));

        bytes memory signature = _signImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier);

        core.recordImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier, signature);

        uint256 costPerImpression = CPM_RATE / 1000;
        uint256 publisherEarning = (costPerImpression * 50) / 100;

        // Check balances
        assertEq(core.getPublisherBalance(publisher), publisherEarning);
        assertEq(core.getViewerBalance(viewerCommitment), 0);

        // Platform gets publisher's share + viewer's share (50%)
        uint256 platformEarning = costPerImpression - publisherEarning;
        assertEq(core.platformBalance(), platformEarning);
    }

    function test_RevertWhen_DuplicateNullifier() public {
        _createFundAndActivateCampaign();

        bytes32 viewerCommitment = keccak256(abi.encodePacked("viewer-commitment"));
        bytes32 nullifier = keccak256(abi.encodePacked("same-nullifier"));

        bytes memory signature1 = _signImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier);
        core.recordImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier, signature1);

        // Try to use same nullifier again
        bytes memory signature2 = _signImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier);
        vm.expectRevert(Web3AdsCore.NullifierAlreadyUsed.selector);
        core.recordImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier, signature2);
    }

    function test_RevertWhen_InvalidSignature() public {
        _createFundAndActivateCampaign();

        bytes32 viewerCommitment = keccak256(abi.encodePacked("viewer-commitment"));
        bytes32 nullifier = keccak256(abi.encodePacked("unique-nullifier"));

        // Sign with wrong key
        (, uint256 wrongKey) = makeAddrAndKey("wrongSigner");
        bytes32 messageHash =
            keccak256(abi.encodePacked(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, ethSignedHash);
        bytes memory wrongSignature = abi.encodePacked(r, s, v);

        vm.expectRevert(Web3AdsCore.InvalidSignature.selector);
        core.recordImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier, wrongSignature);
    }

    // ============================================
    // WITHDRAWAL TESTS
    // ============================================

    function test_PublisherWithdrawal() public {
        // Record enough impressions to meet minimum withdrawal
        _createFundAndActivateCampaign();

        uint256 costPerImpression = CPM_RATE / 1000;
        uint256 publisherEarningPerImpression = (costPerImpression * 50) / 100;
        uint256 impressionsNeeded = (10_000_000 / publisherEarningPerImpression) + 1; // Slightly over $10

        for (uint256 i = 0; i < impressionsNeeded; i++) {
            bytes32 nullifier = keccak256(abi.encodePacked("nullifier", i));
            bytes memory signature = _signImpression(advertiser, CAMPAIGN_ID, publisher, bytes32(0), nullifier);
            core.recordImpression(advertiser, CAMPAIGN_ID, publisher, bytes32(0), nullifier, signature);
        }

        uint256 publisherBalance = core.getPublisherBalance(publisher);
        assertGe(publisherBalance, core.MIN_WITHDRAWAL());

        vm.prank(publisher);
        core.withdrawPublisher();

        assertEq(core.getPublisherBalance(publisher), 0);
        assertEq(usdc.balanceOf(publisher), publisherBalance);
    }

    function test_RevertWhen_WithdrawalBelowMinimum() public {
        _createFundAndActivateCampaign();

        // Record just one impression
        bytes32 nullifier = keccak256(abi.encodePacked("single-nullifier"));
        bytes memory signature = _signImpression(advertiser, CAMPAIGN_ID, publisher, bytes32(0), nullifier);
        core.recordImpression(advertiser, CAMPAIGN_ID, publisher, bytes32(0), nullifier, signature);

        vm.prank(publisher);
        vm.expectRevert(Web3AdsCore.BelowMinimumWithdrawal.selector);
        core.withdrawPublisher();
    }

    // ============================================
    // FUZZ TESTS
    // ============================================

    function testFuzz_RevenueSplitIntegrity(uint256 cpmRate, uint256 impressionCount) public {
        // Bound inputs to reasonable ranges
        // Use CPM rates that divide evenly by 1000 to avoid dust
        cpmRate = bound(cpmRate, 1_000_000, 100_000_000); // $1 - $100 CPM
        cpmRate = (cpmRate / 1000) * 1000; // Round to nearest 1000 to ensure clean division
        impressionCount = bound(impressionCount, 1, 100);

        uint256 budget = (cpmRate * impressionCount) / 1000 + 1_000_000; // Enough for all impressions

        vm.startPrank(advertiser);
        usdc.approve(address(core), budget);
        bytes32 campaignId = keccak256(abi.encodePacked("fuzz-campaign", cpmRate, impressionCount));
        core.createCampaign(campaignId, Web3AdsCore.AdType.SQUARE, cpmRate, budget);
        core.activateCampaign(campaignId);
        vm.stopPrank();

        uint256 totalPublisher;
        uint256 totalViewer;
        uint256 totalPlatform;

        for (uint256 i = 0; i < impressionCount; i++) {
            bytes32 viewerCommitment = keccak256(abi.encodePacked("viewer", i));
            bytes32 nullifier = keccak256(abi.encodePacked("fuzz-nullifier", cpmRate, i));
            bytes memory signature = _signImpression(advertiser, campaignId, publisher, viewerCommitment, nullifier);

            uint256 publisherBefore = core.getPublisherBalance(publisher);
            uint256 viewerBefore = core.getViewerBalance(viewerCommitment);
            uint256 platformBefore = core.platformBalance();

            core.recordImpression(advertiser, campaignId, publisher, viewerCommitment, nullifier, signature);

            totalPublisher += core.getPublisherBalance(publisher) - publisherBefore;
            totalViewer += core.getViewerBalance(viewerCommitment) - viewerBefore;
            totalPlatform += core.platformBalance() - platformBefore;
        }

        // Verify total revenue equals impressions * cost per impression
        uint256 costPerImpression = cpmRate / 1000;
        uint256 expectedTotal = costPerImpression * impressionCount;

        // Allow for rounding dust: up to 2 wei per impression (from 3 divisions: 50% + 20% + 30%)
        // Each integer division can lose up to 1 wei, total of 3 divisions but they sum close
        uint256 maxDust = impressionCount * 3;
        assertApproxEqAbs(
            totalPublisher + totalViewer + totalPlatform,
            expectedTotal,
            maxDust,
            "Revenue split must approximately equal total spent"
        );
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function _createAndFundCampaign() internal {
        vm.startPrank(advertiser);
        usdc.approve(address(core), BUDGET);
        core.createCampaign(CAMPAIGN_ID, Web3AdsCore.AdType.SQUARE, CPM_RATE, BUDGET);
        vm.stopPrank();
    }

    function _createFundAndActivateCampaign() internal {
        _createAndFundCampaign();
        vm.prank(advertiser);
        core.activateCampaign(CAMPAIGN_ID);
    }

    function _signImpression(
        address _advertiser,
        bytes32 _campaignId,
        address _publisher,
        bytes32 _viewerCommitment,
        bytes32 _nullifier
    ) internal view returns (bytes memory) {
        bytes32 messageHash =
            keccak256(abi.encodePacked(_advertiser, _campaignId, _publisher, _viewerCommitment, _nullifier));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendSignerKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }
}
