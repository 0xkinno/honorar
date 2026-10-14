// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {HonorarRegistry} from "../src/HonorarRegistry.sol";
import {HonorarLedger} from "../src/HonorarLedger.sol";

contract Deploy is Script {
    address constant USDC = 0x3600000000000000000000000000000000000000;

    function run() external returns (HonorarRegistry registry, HonorarLedger ledger) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address agent = vm.envAddress("AGENT_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        registry = new HonorarRegistry();
        ledger = new HonorarLedger(registry, USDC, treasury, agent, deployer);
        vm.stopBroadcast();

        console2.log("registry", address(registry));
        console2.log("ledger", address(ledger));
    }
}
