// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {HonorarRegistry} from "../src/HonorarRegistry.sol";

contract RegistryTest is Base {
    bytes32 constant H = keccak256("text");

    function _arrs(address a) internal pure returns (address[] memory r, uint16[] memory b) {
        r = new address[](1);
        r[0] = a;
        b = new uint16[](1);
        b[0] = 10_000;
    }

    function test_register_ok() public {
        bytes32 id = _register(writerA, H, QUOTE);
        HonorarRegistry.Work memory w = registry.getWork(id);
        assertEq(w.contentHash, H);
        assertEq(w.version, 1);
        assertTrue(w.active);
        assertEq(w.quotePrice, QUOTE);
        assertEq(w.recipients[0], writerA);
        assertTrue(registry.exists(id));
    }

    function test_register_emits() public {
        (address[] memory r, uint16[] memory b) = _arrs(writerA);
        bytes32 id = registry.computeWorkId(H, writerA);
        vm.expectEmit(true, true, false, true);
        emit HonorarRegistry.WorkRegistered(id, H, writerA, "u");
        vm.prank(writerA);
        registry.registerWork(id, H, "u", r, b, READ, QUOTE);
    }

    function test_register_duplicate_reverts() public {
        bytes32 id = _register(writerA, H, QUOTE);
        (address[] memory r, uint16[] memory b) = _arrs(writerA);
        vm.prank(writerA);
        vm.expectRevert(HonorarRegistry.AlreadyRegistered.selector);
        registry.registerWork(id, H, "u", r, b, READ, QUOTE);
    }

    function test_register_workIdMismatch() public {
        (address[] memory r, uint16[] memory b) = _arrs(writerA);
        vm.prank(writerA);
        vm.expectRevert(HonorarRegistry.WorkIdMismatch.selector);
        registry.registerWork(bytes32(uint256(1)), H, "u", r, b, READ, QUOTE);
    }

    function test_register_callerMustBeRecipient() public {
        (address[] memory r, uint16[] memory b) = _arrs(writerB);
        bytes32 id = registry.computeWorkId(H, writerA);
        vm.prank(writerA);
        vm.expectRevert(HonorarRegistry.NotRecipient.selector);
        registry.registerWork(id, H, "u", r, b, READ, QUOTE);
    }

    function test_register_bpsMustTotal() public {
        (address[] memory r, uint16[] memory b) = _arrs(writerA);
        b[0] = 9_999;
        bytes32 id = registry.computeWorkId(H, writerA);
        vm.prank(writerA);
        vm.expectRevert(HonorarRegistry.BpsMustTotal.selector);
        registry.registerWork(id, H, "u", r, b, READ, QUOTE);
    }

    function test_register_zeroPrice() public {
        (address[] memory r, uint16[] memory b) = _arrs(writerA);
        bytes32 id = registry.computeWorkId(H, writerA);
        vm.prank(writerA);
        vm.expectRevert(HonorarRegistry.ZeroPrice.selector);
        registry.registerWork(id, H, "u", r, b, 0, QUOTE);
        vm.prank(writerA);
        vm.expectRevert(HonorarRegistry.ZeroPrice.selector);
        registry.registerWork(id, H, "u", r, b, READ, 0);
    }

    function test_register_zeroAddress() public {
        address[] memory r = new address[](2);
        r[0] = writerA;
        r[1] = address(0);
        uint16[] memory b = new uint16[](2);
        b[0] = 5_000;
        b[1] = 5_000;
        bytes32 id = registry.computeWorkId(H, writerA);
        vm.prank(writerA);
        vm.expectRevert(HonorarRegistry.ZeroAddress.selector);
        registry.registerWork(id, H, "u", r, b, READ, QUOTE);
    }

    function test_register_tooMany() public {
        address[] memory r = new address[](11);
        uint16[] memory b = new uint16[](11);
        for (uint256 i; i < 11; ++i) {
            r[i] = i == 0 ? writerA : address(uint160(100 + i));
            b[i] = 909;
        }
        bytes32 id = registry.computeWorkId(H, writerA);
        vm.prank(writerA);
        vm.expectRevert(HonorarRegistry.TooManyRecipients.selector);
        registry.registerWork(id, H, "u", r, b, READ, QUOTE);
    }

    function test_register_noRecipients_and_lengthMismatch() public {
        address[] memory r = new address[](0);
        uint16[] memory b = new uint16[](0);
        bytes32 id = registry.computeWorkId(H, writerA);
        vm.prank(writerA);
        vm.expectRevert(HonorarRegistry.NoRecipients.selector);
        registry.registerWork(id, H, "u", r, b, READ, QUOTE);

        (address[] memory r1,) = _arrs(writerA);
        vm.prank(writerA);
        vm.expectRevert(HonorarRegistry.LengthMismatch.selector);
        registry.registerWork(id, H, "u", r1, b, READ, QUOTE);
    }

    function test_update_bumpsVersion() public {
        bytes32 id = _register(writerA, H, QUOTE);
        (address[] memory r, uint16[] memory b) = _arrs(writerA);
        vm.prank(writerA);
        uint32 v = registry.updateWork(id, keccak256("new"), "u2", r, b, READ, 5_000);
        assertEq(v, 2);
        HonorarRegistry.Work memory w = registry.getWork(id);
        assertEq(w.version, 2);
        assertEq(w.quotePrice, 5_000);
        assertEq(w.contentHash, keccak256("new"));
    }

    function test_update_onlyPrimary() public {
        bytes32 id = _registerSplit(writerA, writerB, writerC, H, QUOTE);
        address[] memory r = new address[](1);
        r[0] = writerB;
        uint16[] memory b = new uint16[](1);
        b[0] = 10_000;
        vm.prank(writerB);
        vm.expectRevert(HonorarRegistry.NotPrimary.selector);
        registry.updateWork(id, H, "u", r, b, READ, QUOTE);
    }

    function test_update_primaryCannotHandOffSilently() public {
        bytes32 id = _register(writerA, H, QUOTE);
        (address[] memory r, uint16[] memory b) = _arrs(writerB);
        vm.prank(writerA);
        vm.expectRevert(HonorarRegistry.NotPrimary.selector);
        registry.updateWork(id, H, "u", r, b, READ, QUOTE);
    }

    function test_update_unknown() public {
        (address[] memory r, uint16[] memory b) = _arrs(writerA);
        vm.prank(writerA);
        vm.expectRevert(HonorarRegistry.UnknownWork.selector);
        registry.updateWork(bytes32(uint256(7)), H, "u", r, b, READ, QUOTE);
    }

    function test_setActive() public {
        bytes32 id = _registerSplit(writerA, writerB, writerC, H, QUOTE);
        vm.prank(writerB);
        registry.setActive(id, false);
        assertFalse(registry.getWork(id).active);
        vm.prank(reader);
        vm.expectRevert(HonorarRegistry.NotRecipient.selector);
        registry.setActive(id, true);
        vm.prank(writerA);
        vm.expectRevert(HonorarRegistry.UnknownWork.selector);
        registry.setActive(bytes32(uint256(9)), true);
    }

    function test_getWork_unknown() public {
        vm.expectRevert(HonorarRegistry.UnknownWork.selector);
        registry.getWork(bytes32(uint256(3)));
    }
}
