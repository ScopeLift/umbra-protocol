// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./utils/DSTestPlus.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../UmbraBatchSend.sol";

contract UmbraBatchSendTest is DSTestPlus {
    using stdStorage for StdStorage;
    StdStorage stdstore;

    UmbraBatchSend public router = new UmbraBatchSend();

    address umbra = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;
    address dai = 0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735;

    address alice = address(0x202204);
    address bob = address(0x202205);

    Vm vm = Vm(HEVM_ADDRESS);
    bytes payload;

    bytes32 pkx = "pkx";
    bytes32 ciphertext = "ciphertext";

    UmbraBatchSend.SendEth[] sendEth;
    UmbraBatchSend.SendToken[] sendToken;

    IERC20 token = IERC20(address(dai));

    function setUp() public {

        vm.label(alice, "Alice");
        vm.label(bob, "Bob");
        vm.label(address(this), "UmbraBatchSendTest");

        tip(dai, address(this), type(uint256).max);
        vm.deal(address(this), type(uint256).max);
    }

    function testFuzz_BatchSendEth(uint128 amount, uint128 amount2) public {

        uint256 alicePrevBal = alice.balance;
        uint256 bobPrevBal = bob.balance;
        vm.assume(amount > 0);
        vm.assume(amount2 > 0);
        

        uint256 toll = 0;

        sendEth.push(UmbraBatchSend.SendEth(payable(alice), amount, pkx, ciphertext));
        sendEth.push(UmbraBatchSend.SendEth(payable(bob), amount2, pkx, ciphertext));

        uint256 totalAmount = uint256(amount) + uint256(amount2);
        emit log_named_uint("total amount is", totalAmount);

        router.batchSendEth{value: totalAmount}(toll, sendEth);

        assertEq(alice.balance, alicePrevBal + amount);
        assertEq(bob.balance, bobPrevBal + amount2);

    }

    function testFuzz_BatchSendTokens(uint128 amount, uint128 amount2) public {

        assertTrue(token.balanceOf(address(this)) > 0, "caller's dai balance is zero");

        uint256 toll = 0;
        uint256 totalAmount = uint256(amount) + uint256(amount2);
        uint256 umbraPrevBal = token.balanceOf(umbra);

        sendToken.push(UmbraBatchSend.SendToken(alice, dai, amount, pkx, ciphertext));
        sendToken.push(UmbraBatchSend.SendToken(bob, dai, amount2, pkx, ciphertext));
        token.approve(address(router), totalAmount);

        router.batchSendTokens{value: toll}(toll, sendToken);
        assertEq(token.balanceOf(umbra), umbraPrevBal + totalAmount);

    }

    function testFuzz_BatchSend(uint8 amount, uint8 amount2, bytes32 testBytes) public {

        uint256 alicePrevBal = alice.balance;
        uint256 bobPrevBal = bob.balance;
        uint256 umbraPrevBal = token.balanceOf(umbra);
        vm.assume(amount > 0 && amount < type(uint8).max/2);
        vm.assume(amount2 > 0 && amount2 < type(uint8).max/2);
        assertTrue(token.balanceOf(address(this)) > 0, "caller's dai balance is zero");

        uint256 toll = 0;
        uint256 totalAmount = amount + amount2;

        sendEth.push(UmbraBatchSend.SendEth(payable(alice), amount, testBytes, testBytes));
        sendEth.push(UmbraBatchSend.SendEth(payable(bob), amount2, testBytes, testBytes));

        sendToken.push(UmbraBatchSend.SendToken(alice, dai, amount, pkx, ciphertext));
        sendToken.push(UmbraBatchSend.SendToken(bob, dai, amount2, pkx, ciphertext));
        token.approve(address(router), amount + amount2);

        router.batchSend{value: totalAmount + toll}(toll, sendEth, sendToken);

        assertEq(alice.balance, alicePrevBal + amount);
        assertEq(bob.balance, bobPrevBal + amount2);

        assertEq(token.balanceOf(umbra), umbraPrevBal + amount + amount2);

    }

}
