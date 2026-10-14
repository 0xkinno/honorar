// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {HonorarRegistry} from "../src/HonorarRegistry.sol";
import {HonorarLedger} from "../src/HonorarLedger.sol";

contract LedgerTest is Base {
    bytes32 constant SPAN = keccak256("span");
    bytes32 constant GW = keccak256("gateway");

    function _two() internal returns (HonorarLedger.Leaf[] memory leaves, bytes32 idA, bytes32 idB) {
        idA = _register(writerA, keccak256("a"), QUOTE);
        idB = _registerSplit(writerB, writerC, writerA, keccak256("b"), 3_333);
        leaves = new HonorarLedger.Leaf[](2);
        HonorarLedger.Leaf memory la = _leaf(idA, SPAN);
        HonorarLedger.Leaf memory lb = _leaf(idB, keccak256("span2"));
        if (idA < idB) {
            leaves[0] = la;
            leaves[1] = lb;
        } else {
            leaves[0] = lb;
            leaves[1] = la;
        }
    }

    function test_strike_pays_everyone_exactly() public {
        (HonorarLedger.Leaf[] memory leaves,,) = _two();
        bytes32 root = _root(leaves);
        uint64 total = QUOTE + 3_333;
        uint64 fee = uint64((uint256(total) * 250) / 10_000);
        uint64 fronted = 2_000;
        uint256 before = usdc.balanceOf(reader);

        vm.prank(agent);
        ledger.strike(keccak256("ans"), reader, root, leaves, fronted, GW);

        assertEq(before - usdc.balanceOf(reader), uint256(total) + fee + fronted);
        assertEq(usdc.balanceOf(treasury), fee);
        assertEq(usdc.balanceOf(agent), fronted);
        // writerB: 3333 bps of 3333 = 1110 each, writerA(last) absorbs remainder + QUOTE
        assertEq(usdc.balanceOf(writerB), 1_110);
        assertEq(usdc.balanceOf(writerC), 1_110);
        assertEq(usdc.balanceOf(writerA), uint256(QUOTE) + 3_333 - 1_110 - 1_110);
        assertEq(usdc.balanceOf(address(ledger)), 0);
        assertEq(ledger.roots(keccak256("ans")), root);
    }

    function test_strike_emits_events() public {
        (HonorarLedger.Leaf[] memory leaves,,) = _two();
        bytes32 root = _root(leaves);
        bytes32 ans = keccak256("ans");
        vm.expectEmit(true, true, false, true);
        emit HonorarLedger.QuoteStruck(ans, leaves[0].workId, leaves[0].spanHash, leaves[0].amount);
        vm.prank(agent);
        ledger.strike(ans, reader, root, leaves, 0, GW);
    }

    function test_strike_single_leaf_root_is_leaf_hash() public {
        bytes32 id = _register(writerA, keccak256("a"), QUOTE);
        HonorarLedger.Leaf[] memory leaves = new HonorarLedger.Leaf[](1);
        leaves[0] = _leaf(id, SPAN);
        assertEq(_root(leaves), keccak256(abi.encode(id, uint32(1), SPAN, QUOTE)));
        vm.prank(agent);
        ledger.strike(keccak256("one"), reader, _root(leaves), leaves, 0, GW);
    }

    function test_I4_duplicate_answer_reverts() public {
        (HonorarLedger.Leaf[] memory leaves,,) = _two();
        bytes32 root = _root(leaves);
        vm.startPrank(agent);
        ledger.strike(keccak256("ans"), reader, root, leaves, 0, GW);
        vm.expectRevert(HonorarLedger.AlreadyStruck.selector);
        ledger.strike(keccak256("ans"), reader, root, leaves, 0, GW);
        vm.stopPrank();
    }

    function test_I4_same_work_new_answer_ok() public {
        (HonorarLedger.Leaf[] memory leaves,,) = _two();
        bytes32 root = _root(leaves);
        vm.startPrank(agent);
        ledger.strike(keccak256("ans1"), reader, root, leaves, 0, GW);
        ledger.strike(keccak256("ans2"), reader, root, leaves, 0, GW);
        vm.stopPrank();
    }

    function test_I4_duplicate_work_in_one_call_reverts() public {
        bytes32 id = _register(writerA, keccak256("a"), QUOTE);
        HonorarLedger.Leaf[] memory leaves = new HonorarLedger.Leaf[](2);
        leaves[0] = _leaf(id, SPAN);
        leaves[1] = _leaf(id, keccak256("other"));
        vm.prank(agent);
        vm.expectRevert(HonorarLedger.DuplicateWork.selector);
        ledger.strike(keccak256("ans"), reader, _root(leaves), leaves, 0, GW);
    }

    function test_unsorted_leaves_revert() public {
        (HonorarLedger.Leaf[] memory leaves,,) = _two();
        HonorarLedger.Leaf memory t = leaves[0];
        leaves[0] = leaves[1];
        leaves[1] = t;
        vm.prank(agent);
        vm.expectRevert(HonorarLedger.UnsortedLeaves.selector);
        ledger.strike(keccak256("ans"), reader, _root(leaves), leaves, 0, GW);
    }

    function test_I5_per_answer_cap() public {
        (HonorarLedger.Leaf[] memory leaves,,) = _two();
        vm.prank(reader);
        ledger.setMandate(5_000, 5_000_000);
        vm.prank(agent);
        vm.expectRevert(HonorarLedger.PerAnswerCapExceeded.selector);
        ledger.strike(keccak256("ans"), reader, _root(leaves), leaves, 0, GW);
    }

    function test_I5_fronted_counts_against_cap() public {
        (HonorarLedger.Leaf[] memory leaves,,) = _two();
        vm.prank(reader);
        ledger.setMandate(8_000, 5_000_000);
        vm.prank(agent);
        vm.expectRevert(HonorarLedger.PerAnswerCapExceeded.selector);
        ledger.strike(keccak256("ans"), reader, _root(leaves), leaves, 2_000, GW);
    }

    function test_I5_window_cap_and_reset() public {
        bytes32 id = _register(writerA, keccak256("a"), QUOTE);
        HonorarLedger.Leaf[] memory leaves = new HonorarLedger.Leaf[](1);
        leaves[0] = _leaf(id, SPAN);
        bytes32 root = _root(leaves);
        vm.prank(reader);
        ledger.setMandate(10_000, 10_000);
        vm.startPrank(agent);
        ledger.strike(keccak256("a1"), reader, root, leaves, 0, GW);
        ledger.strike(keccak256("a2"), reader, root, leaves, 0, GW);
        vm.expectRevert(HonorarLedger.WindowCapExceeded.selector);
        ledger.strike(keccak256("a3"), reader, root, leaves, 0, GW);
        vm.warp(block.timestamp + 1 days + 1);
        ledger.strike(keccak256("a3"), reader, root, leaves, 0, GW);
        vm.stopPrank();
    }

    function test_revoked_mandate_reverts() public {
        (HonorarLedger.Leaf[] memory leaves,,) = _two();
        vm.prank(reader);
        ledger.revokeMandate();
        vm.prank(agent);
        vm.expectRevert(HonorarLedger.MandateInactive.selector);
        ledger.strike(keccak256("ans"), reader, _root(leaves), leaves, 0, GW);
    }

    function test_no_mandate_reverts() public {
        (HonorarLedger.Leaf[] memory leaves,,) = _two();
        vm.prank(agent);
        vm.expectRevert(HonorarLedger.MandateInactive.selector);
        ledger.strike(keccak256("ans"), makeAddr("stranger"), _root(leaves), leaves, 0, GW);
    }

    function test_I6_version_swap_reverts() public {
        bytes32 id = _register(writerA, keccak256("a"), QUOTE);
        HonorarLedger.Leaf[] memory leaves = new HonorarLedger.Leaf[](1);
        leaves[0] = _leaf(id, SPAN);
        address[] memory r = new address[](1);
        r[0] = writerA;
        uint16[] memory b = new uint16[](1);
        b[0] = 10_000;
        vm.prank(writerA);
        registry.updateWork(id, keccak256("a2"), "u", r, b, READ, QUOTE);
        vm.prank(agent);
        vm.expectRevert(HonorarLedger.VersionMismatch.selector);
        ledger.strike(keccak256("ans"), reader, _root(leaves), leaves, 0, GW);
    }

    function test_I7_forged_root_reverts() public {
        (HonorarLedger.Leaf[] memory leaves,,) = _two();
        vm.prank(agent);
        vm.expectRevert(HonorarLedger.RootMismatch.selector);
        ledger.strike(keccak256("ans"), reader, keccak256("forged"), leaves, 0, GW);
    }

    function test_B11_price_above_registry_reverts() public {
        bytes32 id = _register(writerA, keccak256("a"), QUOTE);
        HonorarLedger.Leaf[] memory leaves = new HonorarLedger.Leaf[](1);
        leaves[0] = _leaf(id, SPAN);
        leaves[0].amount = QUOTE + 1;
        vm.prank(agent);
        vm.expectRevert(HonorarLedger.PriceMismatch.selector);
        ledger.strike(keccak256("ans"), reader, _root(leaves), leaves, 0, GW);
    }

    function test_inactive_work_reverts() public {
        bytes32 id = _register(writerA, keccak256("a"), QUOTE);
        HonorarLedger.Leaf[] memory leaves = new HonorarLedger.Leaf[](1);
        leaves[0] = _leaf(id, SPAN);
        vm.prank(writerA);
        registry.setActive(id, false);
        vm.prank(agent);
        vm.expectRevert(HonorarLedger.WorkInactive.selector);
        ledger.strike(keccak256("ans"), reader, _root(leaves), leaves, 0, GW);
    }

    function test_unknown_work_reverts() public {
        HonorarLedger.Leaf[] memory leaves = new HonorarLedger.Leaf[](1);
        leaves[0] = HonorarLedger.Leaf(bytes32(uint256(5)), 1, SPAN, QUOTE);
        vm.prank(agent);
        vm.expectRevert(HonorarRegistry.UnknownWork.selector);
        ledger.strike(keccak256("ans"), reader, _root(leaves), leaves, 0, GW);
    }

    function test_agent_only() public {
        (HonorarLedger.Leaf[] memory leaves,,) = _two();
        vm.expectRevert(HonorarLedger.NotAgent.selector);
        ledger.strike(keccak256("ans"), reader, _root(leaves), leaves, 0, GW);
    }

    function test_no_leaves_and_zero_root() public {
        HonorarLedger.Leaf[] memory none = new HonorarLedger.Leaf[](0);
        vm.startPrank(agent);
        vm.expectRevert(HonorarLedger.NoLeaves.selector);
        ledger.strike(keccak256("ans"), reader, keccak256("r"), none, 0, GW);
        vm.expectRevert(HonorarLedger.ZeroRoot.selector);
        ledger.strike(keccak256("ans"), reader, bytes32(0), none, 0, GW);
        vm.stopPrank();
    }

    function test_transfer_failure_reverts_whole_strike() public {
        (HonorarLedger.Leaf[] memory leaves,,) = _two();
        usdc.setBlocked(treasury, true);
        vm.prank(agent);
        vm.expectRevert(HonorarLedger.TransferFailed.selector);
        ledger.strike(keccak256("ans"), reader, _root(leaves), leaves, 0, GW);
        assertEq(ledger.roots(keccak256("ans")), bytes32(0));
        assertEq(usdc.balanceOf(writerB), 0);
    }

    function test_bad_mandate() public {
        vm.startPrank(reader);
        vm.expectRevert(HonorarLedger.BadMandate.selector);
        ledger.setMandate(0, 10);
        vm.expectRevert(HonorarLedger.BadMandate.selector);
        ledger.setMandate(10, 5);
        vm.stopPrank();
    }

    function test_owner_cannot_move_money_only_rotate_and_set() public {
        address newAgent = makeAddr("newAgent");
        vm.prank(owner);
        ledger.rotateAgent(newAgent);
        assertEq(ledger.agent(), newAgent);
        vm.prank(owner);
        ledger.setTreasury(makeAddr("t2"));
        vm.prank(owner);
        ledger.transferOwnership(makeAddr("o2"));

        vm.expectRevert(HonorarLedger.NotOwner.selector);
        ledger.rotateAgent(newAgent);
        vm.expectRevert(HonorarLedger.NotOwner.selector);
        ledger.setTreasury(newAgent);
        vm.expectRevert(HonorarLedger.NotOwner.selector);
        ledger.transferOwnership(newAgent);

        vm.startPrank(makeAddr("o2"));
        vm.expectRevert(HonorarLedger.ZeroAddress.selector);
        ledger.rotateAgent(address(0));
        vm.expectRevert(HonorarLedger.ZeroAddress.selector);
        ledger.setTreasury(address(0));
        vm.expectRevert(HonorarLedger.ZeroAddress.selector);
        ledger.transferOwnership(address(0));
        vm.stopPrank();
    }

    function test_constructor_rejects_zero() public {
        vm.expectRevert(HonorarLedger.ZeroAddress.selector);
        new HonorarLedger(registry, address(0), treasury, agent, owner);
        vm.expectRevert(HonorarLedger.ZeroAddress.selector);
        new HonorarLedger(registry, address(usdc), treasury, address(0), owner);
    }

    // ---------------------------------------------------------------- fuzz

    function testFuzz_strike_conserves_money(uint8 n, uint64 fronted, uint32 seed) public {
        uint256 count = bound(n, 1, 8);
        fronted = uint64(bound(fronted, 0, 50_000));
        HonorarLedger.Leaf[] memory leaves = new HonorarLedger.Leaf[](count);
        bytes32[] memory ids = new bytes32[](count);
        for (uint256 i; i < count; ++i) {
            uint64 price = uint64(bound(uint256(keccak256(abi.encode(seed, i))), 1, 20_000));
            address w1 = address(uint160(0x1000 + i * 3));
            address w2 = address(uint160(0x1001 + i * 3));
            address w3 = address(uint160(0x1002 + i * 3));
            ids[i] = _registerSplit(w1, w2, w3, keccak256(abi.encode("w", seed, i)), price);
        }
        // sort ids ascending (insertion sort)
        for (uint256 i = 1; i < count; ++i) {
            bytes32 k = ids[i];
            uint256 j = i;
            while (j > 0 && ids[j - 1] > k) {
                ids[j] = ids[j - 1];
                --j;
            }
            ids[j] = k;
        }
        uint256 sum;
        for (uint256 i; i < count; ++i) {
            leaves[i] = _leaf(ids[i], keccak256(abi.encode("s", i)));
            sum += leaves[i].amount;
        }
        uint256 fee = (sum * 250) / 10_000;
        vm.prank(reader);
        ledger.setMandate(type(uint64).max / 2, type(uint64).max / 2);
        uint256 before = usdc.balanceOf(reader);
        vm.prank(agent);
        ledger.strike(keccak256("fz"), reader, _root(leaves), leaves, fronted, GW);
        assertEq(before - usdc.balanceOf(reader), sum + fee + fronted);
        assertEq(usdc.balanceOf(address(ledger)), 0);
        uint256 recvd;
        for (uint256 i; i < count; ++i) {
            HonorarRegistry.Work memory w = registry.getWork(ids[i]);
            for (uint256 j; j < w.recipients.length; ++j) {
                recvd += usdc.balanceOf(w.recipients[j]);
            }
        }
        assertEq(recvd, sum);
    }
}
