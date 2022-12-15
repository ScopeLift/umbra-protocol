// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import {UmbraBatchSend} from "src/UmbraBatchSend.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

contract ApproveTokenScript is Script {

    UmbraBatchSend batchSend = UmbraBatchSend(0x0d81Df222BB44b883265538586829715CF157163);
    address token = 0x57Cf115b0Abdce35dC9A8A8D9DfF1f586eA63ec8; //USDC

    function run() public {
        vm.broadcast();
        batchSend.approveToken(IERC20(address(token)));
    }
}