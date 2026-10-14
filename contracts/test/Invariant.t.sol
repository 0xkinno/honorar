// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {HonorarLedger} from "../src/HonorarLedger.sol";

contract Handler is Base {
    uint256 public spentInWindow;
    uint256 public windowStartedAt;
    uint256 public counter;
    bytes32 public workId;

    function init() external {
        setUp();
        workId = _register(writerA, keccak256("inv"), QUOTE);
        vm.prank(reader);
        ledger.setMandate(20_000, 30_000);
        windowStartedAt = block.timestamp;
    }

    function strikeOne(uint64 fronted, uint32 warpBy) external {
        fronted = uint64(bound(fronted, 0, 9_000));
        warpBy = uint32(bound(warpBy, 0, 12 hours));
        vm.warp(block.timestamp + warpBy);
        HonorarLedger.Leaf[] memory leaves = new HonorarLedger.Leaf[](1);
        leaves[0] = _leaf(workId, keccak256(abi.encode(counter)));
        bytes32 ans = keccak256(abi.encode("a", counter++));
        uint256 before = usdc.balanceOf(reader);
        vm.prank(agent);
        try ledger.strike(ans, reader, _root(leaves), leaves, fronted, keccak256("g")) {
            uint256 spend = before - usdc.balanceOf(reader);
            if (block.timestamp >= windowStartedAt + 1 days) {
                windowStartedAt = block.timestamp;
                spentInWindow = 0;
            }
            spentInWindow += spend;
        } catch {}
    }

    function reader_() external view returns (address) {
        return reader;
    }
}

contract InvariantTest is Base {
    Handler h;

    function setUp() public override {
        h = new Handler();
        h.init();
        bytes4[] memory sels = new bytes4[](1);
        sels[0] = Handler.strikeOne.selector;
        targetSelector(FuzzSelector({addr: address(h), selectors: sels}));
    }

    function invariant_window_spend_never_exceeds_mandate() public view {
        assertLe(h.spentInWindow(), 30_000);
    }
}
