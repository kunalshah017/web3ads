// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title GreetingBox
 * @notice A dead-simple demo contract to prove gasless transactions work.
 *         The user calls setGreeting() for free — relayer pays gas.
 *         ERC-2771 aware: reads real sender from last 20 bytes of calldata
 *         when called via the Forwarder.
 */
contract GreetingBox {
    address public immutable trustedForwarder;

    mapping(address => string) public greetings;

    event GreetingSet(address indexed user, string greeting);

    constructor(address _forwarder) {
        trustedForwarder = _forwarder;
    }

    // ────────────────────────────────────────────────────────────
    //  ERC-2771: resolve real sender
    // ────────────────────────────────────────────────────────────

    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == trustedForwarder;
    }

    function _msgSender() internal view returns (address sender) {
        if (isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
            // Last 20 bytes = real user appended by Forwarder.execute()
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            sender = msg.sender;
        }
    }

    // ────────────────────────────────────────────────────────────
    //  Business logic
    // ────────────────────────────────────────────────────────────

    /// @notice Set your greeting. When called via relayer, costs you 0 gas.
    function setGreeting(string calldata message) external {
        require(bytes(message).length > 0 && bytes(message).length <= 280, "GreetingBox: bad length");
        address user = _msgSender();
        greetings[user] = message;
        emit GreetingSet(user, message);
    }

    /// @notice Read anyone's greeting
    function getGreeting(address user) external view returns (string memory) {
        return greetings[user];
    }
}
