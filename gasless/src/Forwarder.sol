// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Forwarder
 * @notice EIP-2771 compatible minimal meta-transaction forwarder.
 *         Users sign a ForwardRequest off-chain (EIP-712 typed data).
 *         The Web3Ads relayer submits it here, paying the gas.
 *         The target contract sees the real user as msg.sender via
 *         ERC2771 context (appended address in calldata).
 */
contract Forwarder {
    // ────────────────────────────────────────────────────────────
    //  Types
    // ────────────────────────────────────────────────────────────

    struct ForwardRequest {
        address from;   // real user (signer)
        address to;     // target contract to call
        uint256 value;  // ETH to forward (usually 0)
        uint256 gas;    // gas limit for the inner call
        uint256 nonce;  // replay protection
        bytes   data;   // calldata for target
    }

    // ────────────────────────────────────────────────────────────
    //  EIP-712 Setup
    // ────────────────────────────────────────────────────────────

    bytes32 private constant _TYPEHASH = keccak256(
        "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
    );

    bytes32 private immutable _DOMAIN_SEPARATOR;

    constructor() {
        _DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("Web3AdsForwarder"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    // ────────────────────────────────────────────────────────────
    //  State
    // ────────────────────────────────────────────────────────────

    /// @notice nonce[user] increments after every executed request
    mapping(address => uint256) public nonces;

    // ────────────────────────────────────────────────────────────
    //  Events
    // ────────────────────────────────────────────────────────────

    event RequestExecuted(
        address indexed from,
        address indexed to,
        uint256          nonce,
        bool             success
    );

    // ────────────────────────────────────────────────────────────
    //  Read helpers
    // ────────────────────────────────────────────────────────────

    function domainSeparator() external view returns (bytes32) {
        return _DOMAIN_SEPARATOR;
    }

    /// @notice Returns the EIP-712 digest that the user must sign
    function getDigest(ForwardRequest calldata req) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                _DOMAIN_SEPARATOR,
                keccak256(abi.encode(
                    _TYPEHASH,
                    req.from,
                    req.to,
                    req.value,
                    req.gas,
                    req.nonce,
                    keccak256(req.data)
                ))
            )
        );
    }

    /// @notice Verify that `sig` was produced by `req.from` over this request
    function verify(ForwardRequest calldata req, bytes calldata sig) public view returns (bool) {
        bytes32 digest = getDigest(req);
        address signer = _recover(digest, sig);
        return signer == req.from && nonces[req.from] == req.nonce;
    }

    // ────────────────────────────────────────────────────────────
    //  Execute
    // ────────────────────────────────────────────────────────────

    /**
     * @notice Execute a meta-transaction on behalf of `req.from`.
     *         Callable by anyone (the relayer pays gas).
     *         The target receives `req.data` with `req.from` appended
     *         at the end so ERC2771-aware contracts can read the real sender.
     */
    function execute(
        ForwardRequest calldata req,
        bytes calldata sig
    ) external payable returns (bool success, bytes memory result) {
        require(verify(req, sig), "Forwarder: invalid signature or nonce");
        nonces[req.from]++;

        // EIP-2771: append real sender so target can read it via _msgSender()
        (success, result) = req.to.call{gas: req.gas, value: req.value}(
            abi.encodePacked(req.data, req.from)
        );

        emit RequestExecuted(req.from, req.to, req.nonce, success);
    }

    // ────────────────────────────────────────────────────────────
    //  Internal: ECDSA recover
    // ────────────────────────────────────────────────────────────

    function _recover(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        require(sig.length == 65, "Forwarder: bad sig length");
        bytes32 r;
        bytes32 s;
        uint8   v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        return ecrecover(digest, v, r, s);
    }
}
