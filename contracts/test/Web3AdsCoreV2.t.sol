// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Web3AdsCoreV2.sol";
import "../src/Forwarder.sol";

contract Web3AdsCoreV2Test is Test {
    Web3AdsCoreV2 public core;
    Forwarder public forwarder;

    address public owner;
    address public backendSigner;
    uint256 public backendSignerKey;
    address public advertiser;
    address public publisher;
    address public viewer;

    bytes32 public constant CAMPAIGN_ID = keccak256("test-campaign-v2-1");
    uint256 public constant BUDGET = 1 ether; // 1 ETH

    event CampaignCreated(
        address indexed advertiser, bytes32 indexed campaignId, Web3AdsCoreV2.AdType adType, uint256 cpmRate, uint256 budget
    );
    event CampaignFunded(address indexed advertiser, bytes32 indexed campaignId, uint256 amount);
    event CampaignStatusChanged(bytes32 indexed campaignId, Web3AdsCoreV2.CampaignStatus newStatus);
    event ImpressionRecorded(
        bytes32 indexed campaignId,
        address indexed publisher,
        bytes32 viewerCommitment,
        uint256 publisherEarning,
        uint256 viewerEarning
    );
    event PublisherWithdrawal(address indexed publisher, uint256 amount);
    event ViewerWithdrawal(bytes32 indexed commitment, address indexed recipient, uint256 amount);

    function setUp() public {
        owner = address(this);
        (backendSigner, backendSignerKey) = makeAddrAndKey("backendSigner");
        advertiser = makeAddr("advertiser");
        publisher = makeAddr("publisher");
        viewer = makeAddr("viewer");

        // Deploy Forwarder
        forwarder = new Forwarder();

        // Deploy Web3AdsCoreV2
        core = new Web3AdsCoreV2(backendSigner, address(forwarder));

        // Fund advertiser with ETH
        vm.deal(advertiser, 100 ether);
        vm.deal(publisher, 1 ether);
        vm.deal(viewer, 1 ether);
    }

    // ============================================
    // CAMPAIGN CREATION TESTS
    // ============================================

    function test_CreateCampaign() public {
        uint256 expectedCpm = core.CPM_BANNER(); // Should be 0.5 ETH for BANNER

        vm.prank(advertiser);
        core.createCampaign{value: BUDGET}(CAMPAIGN_ID, Web3AdsCoreV2.AdType.BANNER);

        Web3AdsCoreV2.Campaign memory campaign = core.getCampaign(advertiser, CAMPAIGN_ID);
        assertEq(campaign.advertiser, advertiser);
        assertEq(uint256(campaign.adType), uint256(Web3AdsCoreV2.AdType.BANNER));
        assertEq(campaign.cpmRate, expectedCpm);
        assertEq(campaign.budget, BUDGET);
        assertEq(campaign.spent, 0);
        assertEq(uint256(campaign.status), uint256(Web3AdsCoreV2.CampaignStatus.INACTIVE));
    }

    function test_CreateCampaignWithDifferentAdTypes() public {
        bytes32 bannerId = keccak256("banner-campaign");
        bytes32 squareId = keccak256("square-campaign");
        bytes32 sidebarId = keccak256("sidebar-campaign");
        bytes32 interstitialId = keccak256("interstitial-campaign");

        vm.startPrank(advertiser);
        
        core.createCampaign{value: BUDGET}(bannerId, Web3AdsCoreV2.AdType.BANNER);
        assertEq(core.getCampaign(advertiser, bannerId).cpmRate, 0.5 ether);

        core.createCampaign{value: BUDGET}(squareId, Web3AdsCoreV2.AdType.SQUARE);
        assertEq(core.getCampaign(advertiser, squareId).cpmRate, 0.75 ether);

        core.createCampaign{value: BUDGET}(sidebarId, Web3AdsCoreV2.AdType.SIDEBAR);
        assertEq(core.getCampaign(advertiser, sidebarId).cpmRate, 1 ether);

        core.createCampaign{value: BUDGET}(interstitialId, Web3AdsCoreV2.AdType.INTERSTITIAL);
        assertEq(core.getCampaign(advertiser, interstitialId).cpmRate, 2 ether);
        
        vm.stopPrank();
    }

    function test_CreateCampaignWithoutBudget() public {
        vm.prank(advertiser);
        core.createCampaign{value: 0}(CAMPAIGN_ID, Web3AdsCoreV2.AdType.BANNER);

        Web3AdsCoreV2.Campaign memory campaign = core.getCampaign(advertiser, CAMPAIGN_ID);
        assertEq(campaign.budget, 0);
    }

    function test_RevertWhen_DuplicateCampaignId() public {
        vm.prank(advertiser);
        core.createCampaign{value: BUDGET}(CAMPAIGN_ID, Web3AdsCoreV2.AdType.BANNER);

        vm.prank(advertiser);
        vm.expectRevert(Web3AdsCoreV2.InvalidCampaign.selector);
        core.createCampaign{value: BUDGET}(CAMPAIGN_ID, Web3AdsCoreV2.AdType.SQUARE);
    }

    // ============================================
    // CAMPAIGN FUNDING TESTS
    // ============================================

    function test_FundCampaign() public {
        vm.prank(advertiser);
        core.createCampaign{value: 0}(CAMPAIGN_ID, Web3AdsCoreV2.AdType.BANNER);

        vm.prank(advertiser);
        core.fundCampaign{value: BUDGET}(CAMPAIGN_ID);

        Web3AdsCoreV2.Campaign memory campaign = core.getCampaign(advertiser, CAMPAIGN_ID);
        assertEq(campaign.budget, BUDGET);
    }

    function test_FundCampaignMultipleTimes() public {
        vm.prank(advertiser);
        core.createCampaign{value: BUDGET}(CAMPAIGN_ID, Web3AdsCoreV2.AdType.BANNER);

        vm.prank(advertiser);
        core.fundCampaign{value: BUDGET}(CAMPAIGN_ID);

        Web3AdsCoreV2.Campaign memory campaign = core.getCampaign(advertiser, CAMPAIGN_ID);
        assertEq(campaign.budget, BUDGET * 2);
    }

    function test_RevertWhen_FundingNonexistentCampaign() public {
        vm.prank(advertiser);
        vm.expectRevert(Web3AdsCoreV2.InvalidCampaign.selector);
        core.fundCampaign{value: BUDGET}(CAMPAIGN_ID);
    }

    function test_RevertWhen_FundingWithZeroValue() public {
        vm.prank(advertiser);
        core.createCampaign{value: BUDGET}(CAMPAIGN_ID, Web3AdsCoreV2.AdType.BANNER);

        vm.prank(advertiser);
        vm.expectRevert(Web3AdsCoreV2.InvalidPayment.selector);
        core.fundCampaign{value: 0}(CAMPAIGN_ID);
    }

    // ============================================
    // CAMPAIGN ACTIVATION TESTS
    // ============================================

    function test_ActivateCampaign() public {
        _createAndFundCampaign();

        vm.prank(advertiser);
        core.activateCampaign(CAMPAIGN_ID);

        Web3AdsCoreV2.Campaign memory campaign = core.getCampaign(advertiser, CAMPAIGN_ID);
        assertEq(uint256(campaign.status), uint256(Web3AdsCoreV2.CampaignStatus.ACTIVE));
    }

    function test_RevertWhen_ActivatingCampaignWithNoBudget() public {
        vm.prank(advertiser);
        core.createCampaign{value: 0}(CAMPAIGN_ID, Web3AdsCoreV2.AdType.BANNER);

        vm.prank(advertiser);
        vm.expectRevert(Web3AdsCoreV2.InsufficientBudget.selector);
        core.activateCampaign(CAMPAIGN_ID);
    }

    function test_PauseCampaign() public {
        _createFundAndActivateCampaign();

        vm.prank(advertiser);
        core.pauseCampaign(CAMPAIGN_ID);

        Web3AdsCoreV2.Campaign memory campaign = core.getCampaign(advertiser, CAMPAIGN_ID);
        assertEq(uint256(campaign.status), uint256(Web3AdsCoreV2.CampaignStatus.PAUSED));
    }

    // ============================================
    // IMPRESSION RECORDING TESTS
    // ============================================

    function test_RecordImpression_WithViewerExtension() public {
        _createFundAndActivateCampaign();

        bytes32 viewerCommitment = keccak256(abi.encodePacked("viewer-semaphore-commitment"));
        bytes32 nullifier = keccak256(abi.encodePacked("unique-nullifier-1"));

        bytes memory signature = _signImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier);

        // Expected values for BANNER ad type (0.5 ETH CPM)
        uint256 costPerImpression = 0.5 ether / 1000; // 0.0005 ETH per impression
        uint256 publisherEarning = (costPerImpression * 50) / 100; // 50%
        uint256 viewerEarning = (costPerImpression * 20) / 100; // 20%

        vm.expectEmit(true, true, false, true);
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

        uint256 costPerImpression = 0.5 ether / 1000;
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

        bytes memory signature2 = _signImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier);
        vm.expectRevert(Web3AdsCoreV2.NullifierAlreadyUsed.selector);
        core.recordImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier, signature2);
    }

    function test_RevertWhen_InvalidSignature() public {
        _createFundAndActivateCampaign();

        bytes32 viewerCommitment = keccak256(abi.encodePacked("viewer-commitment"));
        bytes32 nullifier = keccak256(abi.encodePacked("nullifier"));

        // Sign with wrong key
        (address wrongSigner, uint256 wrongSignerKey) = makeAddrAndKey("wrongSigner");
        bytes32 messageHash = keccak256(abi.encodePacked(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongSignerKey, ethSignedHash);
        bytes memory badSignature = abi.encodePacked(r, s, v);

        vm.expectRevert(Web3AdsCoreV2.InvalidSignature.selector);
        core.recordImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier, badSignature);
    }

    // ============================================
    // WITHDRAWAL TESTS
    // ============================================

    function test_PublisherWithdrawal() public {
        _createFundAndActivateCampaign();
        _recordImpression();

        uint256 publisherBalanceBefore = publisher.balance;
        uint256 contractBalance = core.getPublisherBalance(publisher);

        vm.prank(publisher);
        core.withdrawPublisher();

        assertEq(publisher.balance, publisherBalanceBefore + contractBalance);
        assertEq(core.getPublisherBalance(publisher), 0);
    }

    function test_PublisherWithdrawalTo_Gasless() public {
        _createFundAndActivateCampaign();
        _recordImpression();

        address recipient = makeAddr("recipient");
        uint256 recipientBalanceBefore = recipient.balance;
        uint256 contractBalance = core.getPublisherBalance(publisher);

        // Sign withdrawal proof
        bytes32 messageHash = keccak256(abi.encodePacked(publisher, recipient));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendSignerKey, ethSignedHash);
        bytes memory proof = abi.encodePacked(r, s, v);

        // Anyone can call this (gasless for publisher)
        core.withdrawPublisherTo(publisher, recipient, proof);

        assertEq(recipient.balance, recipientBalanceBefore + contractBalance);
        assertEq(core.getPublisherBalance(publisher), 0);
    }

    function test_ViewerWithdrawal_Gasless() public {
        _createFundAndActivateCampaign();
        bytes32 viewerCommitment = _recordImpressionWithViewer();

        address recipient = makeAddr("viewerRecipient");
        uint256 recipientBalanceBefore = recipient.balance;
        uint256 viewerBalance = core.getViewerBalance(viewerCommitment);

        // Sign withdrawal proof
        bytes32 messageHash = keccak256(abi.encodePacked(viewerCommitment, recipient));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendSignerKey, ethSignedHash);
        bytes memory proof = abi.encodePacked(r, s, v);

        // Anyone can call this (gasless for viewer)
        core.withdrawViewer(viewerCommitment, recipient, proof);

        assertEq(recipient.balance, recipientBalanceBefore + viewerBalance);
        assertEq(core.getViewerBalance(viewerCommitment), 0);
    }

    function test_RevertWhen_WithdrawingWithNoBalance() public {
        vm.prank(publisher);
        vm.expectRevert(Web3AdsCoreV2.BelowMinimumWithdrawal.selector);
        core.withdrawPublisher();
    }

    // ============================================
    // VIEW FUNCTIONS TESTS
    // ============================================

    function test_GetCpmRate() public view {
        assertEq(core.getCpmRate(Web3AdsCoreV2.AdType.BANNER), 0.5 ether);
        assertEq(core.getCpmRate(Web3AdsCoreV2.AdType.SQUARE), 0.75 ether);
        assertEq(core.getCpmRate(Web3AdsCoreV2.AdType.SIDEBAR), 1 ether);
        assertEq(core.getCpmRate(Web3AdsCoreV2.AdType.INTERSTITIAL), 2 ether);
    }

    function test_Constants() public view {
        assertEq(core.PUBLISHER_SHARE(), 50);
        assertEq(core.VIEWER_SHARE(), 20);
        assertEq(core.PLATFORM_SHARE(), 30);
        assertEq(core.MIN_WITHDRAWAL(), 1);
    }

    // ============================================
    // ADMIN TESTS
    // ============================================

    function test_SetBackendSigner() public {
        address newSigner = makeAddr("newSigner");
        
        core.setBackendSigner(newSigner);
        assertEq(core.backendSigner(), newSigner);
    }

    function test_RevertWhen_NonOwnerSetsBackendSigner() public {
        address newSigner = makeAddr("newSigner");
        
        vm.prank(advertiser);
        vm.expectRevert();
        core.setBackendSigner(newSigner);
    }

    function test_PlatformWithdrawal() public {
        _createFundAndActivateCampaign();
        _recordImpression();

        uint256 platformBalance = core.platformBalance();
        address recipient = makeAddr("platformRecipient");

        core.withdrawPlatform(recipient, platformBalance);

        assertEq(recipient.balance, platformBalance);
        assertEq(core.platformBalance(), 0);
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function _createAndFundCampaign() internal {
        vm.prank(advertiser);
        core.createCampaign{value: BUDGET}(CAMPAIGN_ID, Web3AdsCoreV2.AdType.BANNER);
    }

    function _createFundAndActivateCampaign() internal {
        vm.prank(advertiser);
        core.createCampaign{value: BUDGET}(CAMPAIGN_ID, Web3AdsCoreV2.AdType.BANNER);

        vm.prank(advertiser);
        core.activateCampaign(CAMPAIGN_ID);
    }

    function _recordImpression() internal {
        bytes32 viewerCommitment = bytes32(0);
        bytes32 nullifier = keccak256(abi.encodePacked("impression-nullifier"));
        bytes memory signature = _signImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier);
        core.recordImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier, signature);
    }

    function _recordImpressionWithViewer() internal returns (bytes32 viewerCommitment) {
        viewerCommitment = keccak256(abi.encodePacked("viewer-semaphore-commitment"));
        bytes32 nullifier = keccak256(abi.encodePacked("impression-with-viewer"));
        bytes memory signature = _signImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier);
        core.recordImpression(advertiser, CAMPAIGN_ID, publisher, viewerCommitment, nullifier, signature);
    }

    function _signImpression(
        address _advertiser,
        bytes32 _campaignId,
        address _publisher,
        bytes32 _viewerCommitment,
        bytes32 _nullifier
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encodePacked(_advertiser, _campaignId, _publisher, _viewerCommitment, _nullifier));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendSignerKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }
}
