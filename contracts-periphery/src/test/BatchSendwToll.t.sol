// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./UmbraBatchSend.t.sol";

contract BatchSendwTollTest is UmbraBatchSendTest {

    address mockOwner;

    function setUp() public override {

        vm.label(alice, "Alice");
        vm.label(bob, "Bob");
        vm.label(address(this), "UmbraBatchSendTest");

        umbraPrevBal = token.balanceOf(umbra);
        
        // mockOwner = UmbraToll(umbra).owner();
        // emit log_named_address("Umbra owner addr is", mockOwner);
        // vm.deal(mockOwner, type(uint256).max);
        // vm.startPrank(mockOwner);
        // UmbraToll(umbra).setToll(10);
        // vm.stopPrank();
        toll = 0;

        tip(dai, address(this), type(uint256).max);
        vm.deal(address(this), type(uint256).max);
    }

    function testAll(uint128 amount, uint128 amount2) public {

        vm.assume(amount > 0);
        vm.assume(amount2 > 0);

        testFuzz_BatchSendEth(amount, amount2);
        testFuzz_BatchSendTokens(amount, amount2);
        testFuzz_BatchSend(amount, amount2);

    }

}