// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import {UmbraBatchSend} from "src/UmbraBatchSend.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

contract ApproveTokenScript is Script {

    UmbraBatchSend batchSend = UmbraBatchSend(0xDf4B5B2C08A77078c05176D8dFAb6274D54215e9);
    address token = 0x187C0F98FEF80E87880Db50241D40551eDd027Bf; //DAI

    function run() public {
        vm.broadcast();
        batchSend.approveToken(IERC20(address(token)));
    }
}