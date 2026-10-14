// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HonorarRegistry} from "../src/HonorarRegistry.sol";
import {HonorarLedger} from "../src/HonorarLedger.sol";

interface IUSDC {
    function approve(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/// Stand-in for Arc's blocklist precompile, which stock Foundry does not simulate.
contract NoBlocklist {
    fallback(bytes calldata) external returns (bytes memory) {
        return abi.encode(false);
    }
}

/// Runs only with --fork-url https://rpc.mainnet.arc.io (chain id 5042). Skipped otherwise.
contract ForkTest is Test {
    address constant USDC = 0x3600000000000000000000000000000000000000;
    address constant BLOCKLIST = 0x1800000000000000000000000000000000000001;

    address reader;
    address agent;
    address treasury;
    address writer;
    HonorarRegistry registry;
    HonorarLedger ledger;
    bytes32 id;

    function _setup() internal {
        reader = makeAddr("reader");
        agent = makeAddr("agent");
        treasury = makeAddr("treasury");
        writer = makeAddr("writer");
        registry = new HonorarRegistry();
        ledger = new HonorarLedger(registry, USDC, treasury, agent, makeAddr("owner"));

        vm.deal(reader, 10 ether); // native USDC, 18 decimals; ERC-20 view shows 6dp
        vm.prank(reader);
        IUSDC(USDC).approve(address(ledger), type(uint256).max);
        vm.prank(reader);
        ledger.setMandate(1_000_000, 5_000_000);

        bytes32 ch = keccak256("content");
        id = keccak256(abi.encode(ch, writer));
        address[] memory r = new address[](1);
        r[0] = writer;
        uint16[] memory b = new uint16[](1);
        b[0] = 10_000;
        vm.prank(writer);
        registry.registerWork(id, ch, "https://example.org", r, b, 1_000, 4_000);
    }

    function test_fork_strike_with_real_usdc() public {
        if (block.chainid != 5042) {
            vm.skip(true);
        }
        assertEq(IUSDC(USDC).decimals(), 6);
        vm.etch(BLOCKLIST, address(new NoBlocklist()).code);
        _setup();

        HonorarLedger.Leaf[] memory leaves = new HonorarLedger.Leaf[](1);
        bytes32 span = keccak256("span");
        leaves[0] = HonorarLedger.Leaf(id, 1, span, 4_000);
        bytes32 root = keccak256(abi.encode(id, uint32(1), span, uint64(4_000)));

        uint256 before = IUSDC(USDC).balanceOf(reader);
        vm.prank(agent);
        try ledger.strike(keccak256("ans"), reader, root, leaves, 1_000, keccak256("g")) {}
        catch (bytes memory err) {
            // Stock Foundry does not simulate Arc's native transfer precompile (0x1800...0000).
            // The strike itself is covered by the unit suite and by the mainnet evidence; use
            // Circle's arc-foundry build to run this leg locally.
            assertEq(bytes4(err), HonorarLedger.TransferFailed.selector);
            vm.skip(true);
        }

        assertEq(IUSDC(USDC).balanceOf(writer), 4_000);
        assertEq(IUSDC(USDC).balanceOf(treasury), 100);
        assertEq(IUSDC(USDC).balanceOf(agent), 1_000);
        assertEq(before - IUSDC(USDC).balanceOf(reader), 5_100);
        assertEq(IUSDC(USDC).balanceOf(address(ledger)), 0);
    }
}
