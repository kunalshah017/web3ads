// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/Web3AdsCoreV2.sol";
import "../src/Forwarder.sol";

/**
 * @notice Deploy Web3AdsCoreV2 (ETH-based) + Forwarder to Base Sepolia
 * 
 * Run with:
 *   forge script script/DeployV2.s.sol:DeployV2 \
 *     --rpc-url base_sepolia \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 */
contract DeployV2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address backendSigner = vm.envAddress("BACKEND_SIGNER");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== Web3Ads V2 Deploy (ETH-based) ===");
        console.log("Deployer:", deployer);
        console.log("Backend Signer:", backendSigner);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Forwarder first
        Forwarder forwarder = new Forwarder();
        console.log("Forwarder deployed:", address(forwarder));

        // 2. Deploy Web3AdsCoreV2 with forwarder as trusted
        Web3AdsCoreV2 core = new Web3AdsCoreV2(backendSigner, address(forwarder));
        console.log("Web3AdsCoreV2 deployed:", address(core));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Update .env files ===");
        console.log("WEB3ADS_CORE_ADDRESS=", address(core));
        console.log("FORWARDER_ADDRESS=", address(forwarder));
        console.log("");
        console.log("=== Constants ===");
        console.log("MIN_WITHDRAWAL:", core.MIN_WITHDRAWAL(), "wei (0.005 ETH)");
        console.log("CPM_BANNER:", core.CPM_BANNER(), "wei");
        console.log("CPM_SQUARE:", core.CPM_SQUARE(), "wei");
        console.log("CPM_SIDEBAR:", core.CPM_SIDEBAR(), "wei");
        console.log("CPM_INTERSTITIAL:", core.CPM_INTERSTITIAL(), "wei");
    }
}

/**
 * @notice Local deployment for testing with Anvil
 */
contract DeployV2Local is Script {
    function run() external {
        // Use first anvil account
        uint256 deployerKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address backendSigner = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

        console.log("=== Web3Ads V2 Local Deploy ===");

        vm.startBroadcast(deployerKey);

        Forwarder forwarder = new Forwarder();
        console.log("Forwarder:", address(forwarder));

        Web3AdsCoreV2 core = new Web3AdsCoreV2(backendSigner, address(forwarder));
        console.log("Web3AdsCoreV2:", address(core));

        vm.stopBroadcast();
    }
}
