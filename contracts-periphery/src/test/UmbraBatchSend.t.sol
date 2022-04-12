// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./utils/DSTestPlus.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../UmbraBatchSend.sol";

interface UmbraToll {
  function toll() external returns(uint256);
}

contract UmbraBatchSendTest is DSTestPlus {
  using stdStorage for StdStorage;
  StdStorage stdstore;

  UmbraBatchSend public router = new UmbraBatchSend();
    
  address umbra = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;
  address tokenAddr = 0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735;
  address alice = address(0x202204);
  address bob = address(0x202205);
  uint256 alicePrevBal = alice.balance;
  uint256 bobPrevBal = bob.balance;

  uint256 toll;

  bytes32 pkx = "pkx";
  bytes32 ciphertext = "ciphertext";   

  IERC20 token = IERC20(address(tokenAddr));

  uint256 umbraPrevBal = token.balanceOf(umbra);
  UmbraBatchSend.SendEth[] sendEth;
  UmbraBatchSend.SendToken[] sendToken;

  function setUp() virtual public {
    toll = UmbraToll(umbra).toll();
    tip(tokenAddr, address(this), 1e7 ether);
    vm.deal(address(this), 1e5 ether);
  }



  function testFuzz_BatchSendEth(uint64 amount, uint64 amount2) public {
    vm.assume(amount > 0);
    vm.assume(amount2 > 0);
    vm.assume(amount > toll && amount2 > toll);

    sendEth.push(UmbraBatchSend.SendEth(payable(alice), amount, pkx, ciphertext));
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), amount2, pkx, ciphertext));

    uint256 totalAmount = uint256(amount) + uint256(amount2) + (toll * sendEth.length);

    vm.expectCall(address(router), abi.encodeWithSelector(router.batchSendEth.selector, toll, sendEth));
    router.batchSendEth{value: totalAmount}(toll, sendEth);

    assertEq(alice.balance, alicePrevBal + amount);
    assertEq(bob.balance, bobPrevBal + amount2);
  }

  function testFuzz_BatchSendTokens(uint72 amount, uint72 amount2) public {
    uint256 totalAmount = uint256(amount) + uint256(amount2);


    sendToken.push(UmbraBatchSend.SendToken(alice, tokenAddr, amount, pkx, ciphertext));
    sendToken.push(UmbraBatchSend.SendToken(bob, tokenAddr, amount2, pkx, ciphertext));
    uint256 totalToll = toll *  sendToken.length;

    token.approve(address(router), totalAmount);

    vm.expectCall(address(router), abi.encodeWithSelector(router.batchSendTokens.selector, toll, sendToken));
    router.batchSendTokens{value: totalToll}(toll, sendToken);

    assertEq(token.balanceOf(umbra), umbraPrevBal + totalAmount);
    }

  function testFuzz_BatchSend(uint72 amount, uint72 amount2) public {
    vm.assume(amount > 0);
    vm.assume(amount2 > 0);

    uint256 totalAmount = uint256(amount) + uint256(amount2);

    sendEth.push(UmbraBatchSend.SendEth(payable(alice), amount, pkx, ciphertext));
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), amount2, pkx, ciphertext));

    sendToken.push(UmbraBatchSend.SendToken(alice, tokenAddr, amount, pkx, ciphertext));
    sendToken.push(UmbraBatchSend.SendToken(bob, tokenAddr, amount2, pkx, ciphertext));
    token.approve(address(router), totalAmount);

    vm.expectCall(address(router), abi.encodeWithSelector(router.batchSend.selector, toll, sendEth, sendToken));        

    uint256 totalToll = toll * sendEth.length + toll * sendToken.length;

    router.batchSend{value: totalAmount + totalToll}(toll, sendEth, sendToken);

    assertEq(alice.balance, alicePrevBal + amount);
    assertEq(bob.balance, bobPrevBal + amount2);
    assertEq(token.balanceOf(umbra), umbraPrevBal + totalAmount);
    }
}

contract BatchSendWithTollTest is UmbraBatchSendTest {
  using stdStorage for StdStorage;

  function setUp() public override {
    super.setUp();
    stdstore.target(address(umbra)).sig("toll()").checked_write(0.1 ether);
    toll = UmbraToll(umbra).toll();
    assertEq(toll, 0.1 ether);
  }
}

contract BatchSendWithoutTollTest is UmbraBatchSendTest {
  using stdStorage for StdStorage;

  function setUp() public override {
    super.setUp();
    stdstore.target(address(umbra)).sig("toll()").checked_write(uint256(0));
    toll = UmbraToll(umbra).toll();
    assertEq(toll, 0);
  }
}