// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HonorarRegistry} from "../src/HonorarRegistry.sol";
import {HonorarLedger} from "../src/HonorarLedger.sol";
import {MockUSDC} from "./Mocks.sol";

abstract contract Base is Test {
    HonorarRegistry registry;
    HonorarLedger ledger;
    MockUSDC usdc;

    address owner = makeAddr("owner");
    address agent = makeAddr("agent");
    address treasury = makeAddr("treasury");
    address reader = makeAddr("reader");
    address writerA = makeAddr("writerA");
    address writerB = makeAddr("writerB");
    address writerC = makeAddr("writerC");

    uint64 constant QUOTE = 4_000;
    uint64 constant READ = 1_000;

    function setUp() public virtual {
        usdc = new MockUSDC();
        registry = new HonorarRegistry();
        ledger = new HonorarLedger(registry, address(usdc), treasury, agent, owner);
        usdc.mint(reader, 100_000_000);
        vm.prank(reader);
        usdc.approve(address(ledger), type(uint256).max);
        vm.prank(reader);
        ledger.setMandate(500_000, 5_000_000);
    }

    function _register(address who, bytes32 contentHash, uint64 quote) internal returns (bytes32 workId) {
        address[] memory r = new address[](1);
        r[0] = who;
        uint16[] memory b = new uint16[](1);
        b[0] = 10_000;
        workId = keccak256(abi.encode(contentHash, who));
        vm.prank(who);
        registry.registerWork(workId, contentHash, "https://example.org/a", r, b, READ, quote);
    }

    function _registerSplit(address a, address b_, address c, bytes32 contentHash, uint64 quote)
        internal
        returns (bytes32 workId)
    {
        address[] memory r = new address[](3);
        r[0] = a;
        r[1] = b_;
        r[2] = c;
        uint16[] memory b = new uint16[](3);
        b[0] = 3333;
        b[1] = 3333;
        b[2] = 3334;
        workId = keccak256(abi.encode(contentHash, a));
        vm.prank(a);
        registry.registerWork(workId, contentHash, "https://example.org/s", r, b, READ, quote);
    }

    function _leaf(bytes32 workId, bytes32 span) internal view returns (HonorarLedger.Leaf memory) {
        HonorarRegistry.Work memory w = registry.getWork(workId);
        return HonorarLedger.Leaf({workId: workId, version: w.version, spanHash: span, amount: w.quotePrice});
    }

    function _root(HonorarLedger.Leaf[] memory leaves) internal pure returns (bytes32) {
        bytes32[] memory level = new bytes32[](leaves.length);
        for (uint256 i; i < leaves.length; ++i) {
            level[i] = keccak256(abi.encode(leaves[i].workId, leaves[i].version, leaves[i].spanHash, leaves[i].amount));
        }
        uint256 len = level.length;
        while (len > 1) {
            uint256 next;
            for (uint256 i; i < len; i += 2) {
                if (i + 1 == len) {
                    level[next++] = level[i];
                } else {
                    (bytes32 a, bytes32 b) =
                        level[i] < level[i + 1] ? (level[i], level[i + 1]) : (level[i + 1], level[i]);
                    level[next++] = keccak256(abi.encodePacked(a, b));
                }
            }
            len = next;
        }
        return level[0];
    }
}
