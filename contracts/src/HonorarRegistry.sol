// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title HonorarRegistry
/// @notice Registry of works whose authors are paid per verified quote.
/// @dev Holds no money. workId = keccak256(abi.encode(contentHash, registrant)).
contract HonorarRegistry {
    struct Work {
        bytes32 contentHash;
        address[] recipients;
        uint16[] bps;
        uint64 readPrice;
        uint64 quotePrice;
        uint32 version;
        bool active;
        string uri;
    }

    uint256 public constant MAX_RECIPIENTS = 10;
    uint16 public constant BPS_TOTAL = 10_000;

    mapping(bytes32 workId => Work) private _works;
    mapping(bytes32 workId => bool) public exists;

    event WorkRegistered(bytes32 indexed workId, bytes32 contentHash, address indexed registrant, string uri);
    event WorkUpdated(bytes32 indexed workId, uint32 version, bytes32 contentHash);
    event WorkActiveSet(bytes32 indexed workId, bool active);

    error NotRecipient();
    error BpsMustTotal();
    error ZeroPrice();
    error AlreadyRegistered();
    error TooManyRecipients();
    error ZeroAddress();
    error NoRecipients();
    error LengthMismatch();
    error WorkIdMismatch();
    error UnknownWork();
    error NotPrimary();

    function computeWorkId(bytes32 contentHash, address registrant) public pure returns (bytes32) {
        return keccak256(abi.encode(contentHash, registrant));
    }

    function registerWork(
        bytes32 workId,
        bytes32 contentHash,
        string calldata uri,
        address[] calldata recipients,
        uint16[] calldata bps,
        uint64 readPrice,
        uint64 quotePrice
    ) external {
        if (workId != computeWorkId(contentHash, msg.sender)) revert WorkIdMismatch();
        if (exists[workId]) revert AlreadyRegistered();
        _validate(recipients, bps, readPrice, quotePrice);
        if (!_isRecipient(recipients, msg.sender)) revert NotRecipient();

        Work storage w = _works[workId];
        exists[workId] = true;
        w.contentHash = contentHash;
        w.recipients = recipients;
        w.bps = bps;
        w.readPrice = readPrice;
        w.quotePrice = quotePrice;
        w.version = 1;
        w.active = true;
        w.uri = uri;

        emit WorkRegistered(workId, contentHash, msg.sender, uri);
    }

    /// @notice Only the primary recipient (recipients[0]) may update. Version increments on every change.
    function updateWork(
        bytes32 workId,
        bytes32 contentHash,
        string calldata uri,
        address[] calldata recipients,
        uint16[] calldata bps,
        uint64 readPrice,
        uint64 quotePrice
    ) external returns (uint32 newVersion) {
        if (!exists[workId]) revert UnknownWork();
        Work storage w = _works[workId];
        if (w.recipients[0] != msg.sender) revert NotPrimary();
        _validate(recipients, bps, readPrice, quotePrice);
        if (recipients[0] != msg.sender) revert NotPrimary();

        w.contentHash = contentHash;
        w.recipients = recipients;
        w.bps = bps;
        w.readPrice = readPrice;
        w.quotePrice = quotePrice;
        w.uri = uri;
        newVersion = w.version + 1;
        w.version = newVersion;

        emit WorkUpdated(workId, newVersion, contentHash);
    }

    function setActive(bytes32 workId, bool active) external {
        if (!exists[workId]) revert UnknownWork();
        Work storage w = _works[workId];
        if (!_isRecipient(w.recipients, msg.sender)) revert NotRecipient();
        w.active = active;
        emit WorkActiveSet(workId, active);
    }

    function getWork(bytes32 workId) external view returns (Work memory) {
        if (!exists[workId]) revert UnknownWork();
        return _works[workId];
    }

    function _validate(address[] calldata recipients, uint16[] calldata bps, uint64 readPrice, uint64 quotePrice)
        private
        pure
    {
        if (recipients.length == 0) revert NoRecipients();
        if (recipients.length > MAX_RECIPIENTS) revert TooManyRecipients();
        if (recipients.length != bps.length) revert LengthMismatch();
        if (readPrice == 0 || quotePrice == 0) revert ZeroPrice();
        uint256 sum;
        for (uint256 i; i < recipients.length; ++i) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            sum += bps[i];
        }
        if (sum != BPS_TOTAL) revert BpsMustTotal();
    }

    function _isRecipient(address[] memory recipients, address who) private pure returns (bool) {
        for (uint256 i; i < recipients.length; ++i) {
            if (recipients[i] == who) return true;
        }
        return false;
    }
}
