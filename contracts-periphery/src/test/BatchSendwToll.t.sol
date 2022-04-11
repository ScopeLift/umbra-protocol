// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./UmbraBatchSend.t.sol";

contract BatchSendwTollTest is UmbraBatchSendTest {
    using stdStorage for StdStorage;
    StdStorage stdstore;

    address mockOwner;

    function setUp() public override {


        vm.label(alice, "Alice");
        vm.label(bob, "Bob");
        vm.label(address(this), "UmbraBatchSendTest");

        umbraPrevBal = token.balanceOf(umbra);

        mockOwner = UmbraToll(umbra).owner();
        emit log_named_address("Umbra owner addr is", mockOwner);
        // vm.deal(mockOwner, type(uint256).max);
        // vm.startPrank(mockOwner);
        // UmbraToll(umbra).setToll(10);
        // vm.stopPrank();
        

        // vm.store(umbra, bytes32(1), bytes32(uint(1)));
        // toll = 100;

        tip(dai, address(this), type(uint256).max);
        vm.deal(address(this), type(uint256).max);


        // Lets say we want to write to the slot for the public
        // variable `exists`. We just pass in the function selector
        // to the `checked_write` command
        stdstore.target(address(umbra)).sig("toll()").checked_write(100);
        toll = UmbraToll(umbra).toll();
        emit log_named_uint("Umbra current toll is", toll);
    }

    function testAll() public {

        // Lets say we want to find the slot for the public
        // variable `exists`. We just pass in the function selector
        // to the `find` command
        uint256 slot = stdstore.target(address(umbra)).sig("toll()").find();
        assertEq(slot, 1);
    
        assertEq(UmbraToll(umbra).toll(), 100);

    }

}