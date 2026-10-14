// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HonorarRegistry} from "./HonorarRegistry.sol";

interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title HonorarLedger
/// @notice Strikes honoraria for verified quotes. Never holds money: funds move straight from the
/// reader's allowance to the writers, the treasury and the operator, in one transaction.
contract HonorarLedger {
    struct Mandate {
        uint64 maxPerAnswer;
        uint64 maxPer24h;
        uint64 spentWindow;
        uint64 windowStart;
        bool active;
    }

    struct Leaf {
        bytes32 workId;
        uint32 version;
        bytes32 spanHash;
        uint64 amount;
    }

    uint16 public constant FEE_BPS = 250;
    uint256 public constant WINDOW = 1 days;

    HonorarRegistry public immutable registry;
    IERC20Minimal public immutable usdc;

    address public owner;
    address public agent;
    address public treasury;

    mapping(address reader => Mandate) public mandates;
    mapping(bytes32 answerId => bytes32 root) public roots;
    mapping(bytes32 answerId => mapping(bytes32 workId => bool)) public struck;

    uint256 private _lock = 1;

    event MandateSet(address indexed reader, uint64 maxPerAnswer, uint64 maxPer24h);
    event MandateRevoked(address indexed reader);
    event QuoteStruck(bytes32 indexed answerId, bytes32 indexed workId, bytes32 spanHash, uint64 amount);
    event AnswerStruck(
        bytes32 indexed answerId,
        address indexed reader,
        bytes32 root,
        uint64 total,
        uint64 fee,
        uint64 frontedReadingFees,
        bytes32 gatewayTransfersHash
    );
    event AgentRotated(address indexed agent);
    event TreasurySet(address indexed treasury);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotAgent();
    error ZeroAddress();
    error Reentrancy();
    error AlreadyStruck();
    error NoLeaves();
    error UnsortedLeaves();
    error DuplicateWork();
    error WorkInactive();
    error VersionMismatch();
    error PriceMismatch();
    error RootMismatch();
    error MandateInactive();
    error PerAnswerCapExceeded();
    error WindowCapExceeded();
    error TransferFailed();
    error BadMandate();
    error ZeroRoot();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAgent() {
        if (msg.sender != agent) revert NotAgent();
        _;
    }

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor(HonorarRegistry registry_, address usdc_, address treasury_, address agent_, address owner_) {
        if (address(registry_) == address(0) || usdc_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        if (agent_ == address(0) || owner_ == address(0)) revert ZeroAddress();
        registry = registry_;
        usdc = IERC20Minimal(usdc_);
        treasury = treasury_;
        agent = agent_;
        owner = owner_;
        emit OwnershipTransferred(address(0), owner_);
    }

    // ---------------------------------------------------------------- owner

    function rotateAgent(address newAgent) external onlyOwner {
        if (newAgent == address(0)) revert ZeroAddress();
        agent = newAgent;
        emit AgentRotated(newAgent);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        treasury = newTreasury;
        emit TreasurySet(newTreasury);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // --------------------------------------------------------------- reader

    function setMandate(uint64 maxPerAnswer, uint64 maxPer24h) external {
        if (maxPerAnswer == 0 || maxPer24h < maxPerAnswer) revert BadMandate();
        Mandate storage m = mandates[msg.sender];
        m.maxPerAnswer = maxPerAnswer;
        m.maxPer24h = maxPer24h;
        m.active = true;
        emit MandateSet(msg.sender, maxPerAnswer, maxPer24h);
    }

    function revokeMandate() external {
        mandates[msg.sender].active = false;
        emit MandateRevoked(msg.sender);
    }

    // --------------------------------------------------------------- strike

    /// @param leaves must be sorted strictly ascending by workId (this also enforces one leaf per work).
    function strike(
        bytes32 answerId,
        address reader,
        bytes32 root,
        Leaf[] calldata leaves,
        uint64 frontedReadingFees,
        bytes32 gatewayTransfersHash
    ) external onlyAgent nonReentrant {
        if (roots[answerId] != bytes32(0)) revert AlreadyStruck();
        if (root == bytes32(0)) revert ZeroRoot();
        if (leaves.length == 0) revert NoLeaves();

        (bytes32 computed, uint64 total) = _verifyLeaves(answerId, leaves);
        if (computed != root) revert RootMismatch();

        uint64 fee = uint64((uint256(total) * FEE_BPS) / 10_000);
        _chargeMandate(reader, uint256(total) + fee + frontedReadingFees);

        roots[answerId] = root;
        _payAll(answerId, reader, leaves);
        if (fee != 0) _pull(reader, treasury, fee);
        if (frontedReadingFees != 0) _pull(reader, agent, frontedReadingFees);

        emit AnswerStruck(answerId, reader, root, total, fee, frontedReadingFees, gatewayTransfersHash);
    }

    // ------------------------------------------------------------- internal

    function _verifyLeaves(bytes32 answerId, Leaf[] calldata leaves)
        private
        view
        returns (bytes32 root, uint64 total)
    {
        uint256 n = leaves.length;
        bytes32[] memory level = new bytes32[](n);
        bytes32 prev;
        for (uint256 i; i < n; ++i) {
            Leaf calldata leaf = leaves[i];
            if (i != 0 && leaf.workId <= prev) {
                if (leaf.workId == prev) revert DuplicateWork();
                revert UnsortedLeaves();
            }
            prev = leaf.workId;
            if (struck[answerId][leaf.workId]) revert AlreadyStruck();

            HonorarRegistry.Work memory w = registry.getWork(leaf.workId);
            if (!w.active) revert WorkInactive();
            if (w.version != leaf.version) revert VersionMismatch();
            if (w.quotePrice != leaf.amount) revert PriceMismatch();

            level[i] = keccak256(abi.encode(leaf.workId, leaf.version, leaf.spanHash, leaf.amount));
            total += leaf.amount;
        }
        root = _merkleRoot(level);
    }

    function _payAll(bytes32 answerId, address reader, Leaf[] calldata leaves) private {
        for (uint256 i; i < leaves.length; ++i) {
            Leaf calldata leaf = leaves[i];
            struck[answerId][leaf.workId] = true;
            _payLeaf(reader, leaf);
            emit QuoteStruck(answerId, leaf.workId, leaf.spanHash, leaf.amount);
        }
    }

    function _chargeMandate(address reader, uint256 spend) private {
        Mandate storage m = mandates[reader];
        if (!m.active) revert MandateInactive();
        if (spend > m.maxPerAnswer) revert PerAnswerCapExceeded();
        if (block.timestamp >= uint256(m.windowStart) + WINDOW) {
            m.windowStart = uint64(block.timestamp);
            m.spentWindow = 0;
        }
        uint256 newSpent = uint256(m.spentWindow) + spend;
        if (newSpent > m.maxPer24h) revert WindowCapExceeded();
        m.spentWindow = uint64(newSpent);
    }

    function _payLeaf(address reader, Leaf calldata leaf) private {
        HonorarRegistry.Work memory w = registry.getWork(leaf.workId);
        uint256 count = w.recipients.length;
        uint256 paid;
        for (uint256 j; j < count; ++j) {
            uint256 share = j == count - 1 ? uint256(leaf.amount) - paid : (uint256(leaf.amount) * w.bps[j]) / 10_000;
            paid += share;
            if (share != 0) _pull(reader, w.recipients[j], share);
        }
    }

    function _pull(address from, address to, uint256 amount) private {
        (bool ok, bytes memory data) =
            address(usdc).call(abi.encodeCall(IERC20Minimal.transferFrom, (from, to, amount)));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    /// @dev Sorted-pair keccak Merkle. An odd node is promoted unchanged to the next level.
    function _merkleRoot(bytes32[] memory level) private pure returns (bytes32) {
        uint256 len = level.length;
        while (len > 1) {
            uint256 next;
            for (uint256 i; i < len; i += 2) {
                if (i + 1 == len) {
                    level[next++] = level[i];
                } else {
                    (bytes32 a, bytes32 b) = level[i] < level[i + 1] ? (level[i], level[i + 1]) : (level[i + 1], level[i]);
                    level[next++] = keccak256(abi.encodePacked(a, b));
                }
            }
            len = next;
        }
        return level[0];
    }
}
