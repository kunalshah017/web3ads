// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/Web3AdsCore.sol";

contract DeployWeb3AdsCore is Script {
    // Base Sepolia USDC address
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    // Base Mainnet USDC address
    address constant USDC_BASE_MAINNET = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address backendSigner = vm.envAddress("BACKEND_SIGNER");
        
        // Determine USDC address based on chain
        address usdc;
        if (block.chainid == 84532) {
            // Base Sepolia
            usdc = USDC_BASE_SEPOLIA;
        } else if (block.chainid == 8453) {
            // Base Mainnet
            usdc = USDC_BASE_MAINNET;
        } else {
            revert("Unsupported chain");
        }

        vm.startBroadcast(deployerPrivateKey);

        Web3AdsCore core = new Web3AdsCore(usdc, backendSigner);

        vm.stopBroadcast();

        console.log("Web3AdsCore deployed to:", address(core));
        console.log("Payment token (USDC):", usdc);
        console.log("Backend signer:", backendSigner);
    }
}

contract DeployLocal is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy mock USDC for local testing
        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        
        // Use first anvil account as backend signer
        address backendSigner = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        
        Web3AdsCore core = new Web3AdsCore(address(usdc), backendSigner);

        vm.stopBroadcast();

        console.log("MockUSDC deployed to:", address(usdc));
        console.log("Web3AdsCore deployed to:", address(core));
        console.log("Backend signer:", backendSigner);
    }
}

// Import mock for local deployment
import "../src/mocks/MockERC20.sol";
