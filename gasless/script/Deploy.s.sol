// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/Forwarder.sol";
import "../src/GreetingBox.sol";

/**
 * @notice Deploy Forwarder + GreetingBox to Base Sepolia.
 * 
 * Run with:
 *   forge script script/Deploy.s.sol \
 *     --rpc-url base_sepolia \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 *
 * Make sure .env has BASE_SEPOLIA_RPC, PRIVATE_KEY, BASESCAN_API_KEY set.
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        console2.log("=== Web3Ads Gasless Deploy ===");
        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);

        // 1. Deploy Forwarder
        Forwarder fwd = new Forwarder();
        console2.log("Forwarder deployed:", address(fwd));

        // 2. Deploy GreetingBox, trusted to the Forwarder
        GreetingBox box = new GreetingBox(address(fwd));
        console2.log("GreetingBox deployed:", address(box));

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== Add to server/.env ===");
        console2.log("FORWARDER_ADDRESS=", address(fwd));
        console2.log("GREETING_BOX_ADDRESS=", address(box));
    }
}
