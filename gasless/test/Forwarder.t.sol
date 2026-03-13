// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Forwarder.sol";
import "../src/GreetingBox.sol";

contract ForwarderTest is Test {
    Forwarder    public forwarder;
    GreetingBox  public greeting;

    // Test user: we'll use vm.addr + vm.sign
    uint256 internal userPk  = 0xBEEF;
    address internal user;

    function setUp() public {
        user      = vm.addr(userPk);
        forwarder = new Forwarder();
        greeting  = new GreetingBox(address(forwarder));
    }

    // ────────────────────────────────────────────────────────────
    //  Helpers
    // ────────────────────────────────────────────────────────────

    function _buildRequest(
        address from,
        bytes memory data
    ) internal view returns (Forwarder.ForwardRequest memory req) {
        req = Forwarder.ForwardRequest({
            from:  from,
            to:    address(greeting),
            value: 0,
            gas:   100_000,
            nonce: forwarder.nonces(from),
            data:  data
        });
    }

    function _sign(
        Forwarder.ForwardRequest memory req
    ) internal view returns (bytes memory sig) {
        bytes32 digest = forwarder.getDigest(req);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPk, digest);
        sig = abi.encodePacked(r, s, v);
    }

    // ────────────────────────────────────────────────────────────
    //  Tests
    // ────────────────────────────────────────────────────────────

    function test_verify_valid_request() public view {
        bytes memory data = abi.encodeWithSignature("setGreeting(string)", "gm");
        Forwarder.ForwardRequest memory req = _buildRequest(user, data);
        bytes memory sig = _sign(req);
        assertTrue(forwarder.verify(req, sig));
    }

    function test_execute_sets_greeting() public {
        string memory msg_ = "gm from gasless!";
        bytes memory data  = abi.encodeWithSignature("setGreeting(string)", msg_);
        Forwarder.ForwardRequest memory req = _buildRequest(user, data);
        bytes memory sig = _sign(req);

        // Relayer (this contract) calls execute — pays gas
        (bool success,) = forwarder.execute(req, sig);
        assertTrue(success, "execute failed");

        // GreetingBox should map the real user, not the forwarder
        assertEq(greeting.greetings(user), msg_);
    }

    function test_nonce_increments() public {
        bytes memory data = abi.encodeWithSignature("setGreeting(string)", "nonce test");
        Forwarder.ForwardRequest memory req = _buildRequest(user, data);
        bytes memory sig = _sign(req);

        assertEq(forwarder.nonces(user), 0);
        forwarder.execute(req, sig);
        assertEq(forwarder.nonces(user), 1);
    }

    function test_replay_reverts() public {
        bytes memory data = abi.encodeWithSignature("setGreeting(string)", "replay me");
        Forwarder.ForwardRequest memory req = _buildRequest(user, data);
        bytes memory sig = _sign(req);

        forwarder.execute(req, sig);

        // same sig, same nonce → should revert
        vm.expectRevert("Forwarder: invalid signature or nonce");
        forwarder.execute(req, sig);
    }

    function test_wrong_signer_reverts() public {
        bytes memory data = abi.encodeWithSignature("setGreeting(string)", "fake");
        Forwarder.ForwardRequest memory req = _buildRequest(user, data);

        // Sign with a DIFFERENT private key
        uint256 evilPk = 0xDEAD;
        bytes32 digest = forwarder.getDigest(req);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(evilPk, digest);
        bytes memory badSig = abi.encodePacked(r, s, v);

        vm.expectRevert("Forwarder: invalid signature or nonce");
        forwarder.execute(req, badSig);
    }

    function test_greetingbox_direct_call() public {
        // Direct call (no forwarder) — msg.sender is used as-is
        vm.prank(user);
        greeting.setGreeting("direct");
        assertEq(greeting.greetings(user), "direct");
    }
}
