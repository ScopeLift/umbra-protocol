// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./utils/DSTestPlus.sol";
import "src/UmbraBatchSend.sol";

interface UmbraToll {
  function toll() external returns(uint256);
}

abstract contract UmbraBatchSendTest is DSTestPlus {

  UmbraBatchSend router;
  MockERC20 token;

  address constant umbra = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;
  address alice = address(0x202204);
  address bob = address(0x202205);

  uint256 toll;
  bytes32 pkx = "pkx";
  bytes32 ciphertext = "ciphertext";   

  UmbraBatchSend.SendEth[] sendEth;
  UmbraBatchSend.SendToken[] sendToken;

  error ValueMismatch();

  function setUp() virtual public {
    // Deploy Umbra at an arbitrary address, then place the resulting bytecode at the same address as the production deploys.
    vm.etch(umbra, (deployCode("test/utils/Umbra.json", bytes(abi.encode(0, address(this), address(this))))).code);
    router = new UmbraBatchSend(IUmbra(address(umbra)));
    token = new MockERC20("Test","TT", 18);
    token.mint(address(this), 1e7 ether);
    vm.deal(address(this), 1e5 ether);
  }

  function testPostSetupState() public {
    uint256 currentToll = UmbraToll(umbra).toll();
    assertEq(toll, currentToll);
  }

  function testFuzz_BatchSendEth(uint64 amount, uint64 amount2) public {
    vm.assume(amount > toll && amount2 > toll);

    sendEth.push(UmbraBatchSend.SendEth(payable(alice), amount, pkx, ciphertext));
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), amount2, pkx, ciphertext));

    uint256 totalAmount = uint256(amount) + amount2 + (toll * sendEth.length);

    vm.expectCall(address(router), abi.encodeWithSelector(router.batchSendEth.selector, toll, sendEth));
    vm.expectCall(umbra, abi.encodeWithSelector(IUmbra(umbra).sendEth.selector));
    router.batchSendEth{value: totalAmount}(toll, sendEth);

    assertEq(alice.balance, amount);
    assertEq(bob.balance, amount2);
  }

  function testExpectRevert_BatchSendEth() public {
    sendEth.push(UmbraBatchSend.SendEth(payable(alice), 1 ether, pkx, ciphertext));
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), 1 ether, pkx, ciphertext));

    vm.expectRevert(abi.encodeWithSelector(ValueMismatch.selector));
    router.batchSendEth{value: 1 ether + toll}(toll, sendEth);

  }

  function testFuzz_BatchSendTokens(uint72 amount, uint72 amount2) public {
    uint256 totalAmount = uint256(amount) + amount2;

    sendToken.push(UmbraBatchSend.SendToken(alice, address(token), amount, pkx, ciphertext));
    sendToken.push(UmbraBatchSend.SendToken(bob, address(token), amount2, pkx, ciphertext));
    uint256 totalToll = toll *  sendToken.length;
    token.approve(address(router), totalAmount);

    vm.expectCall(address(router), abi.encodeWithSelector(router.batchSendTokens.selector, toll, sendToken));
    vm.expectCall(umbra, abi.encodeWithSelector(IUmbra(umbra).sendToken.selector));
    router.batchSendTokens{value: totalToll}(toll, sendToken);

    assertEq(token.balanceOf(umbra), totalAmount);
  }

  function testExpectRevert_BatchSendTokens() public {
    sendToken.push(UmbraBatchSend.SendToken(alice, address(token), 1 ether, pkx, ciphertext));
    sendToken.push(UmbraBatchSend.SendToken(bob, address(token), 1 ether, pkx, ciphertext));

    token.approve(address(router), 2 ether);
    vm.expectRevert(abi.encodeWithSelector(ValueMismatch.selector));
    router.batchSendTokens{value: toll * 2 + 42}(toll, sendToken);
  }

  function testFuzz_BatchSend(uint72 amount, uint72 amount2) public {
    vm.assume(amount > toll && amount2 > toll);

    uint256 totalAmount = uint256(amount) + amount2;

    sendEth.push(UmbraBatchSend.SendEth(payable(alice), amount, pkx, ciphertext));
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), amount2, pkx, ciphertext));

    sendToken.push(UmbraBatchSend.SendToken(alice, address(token), amount, pkx, ciphertext));
    sendToken.push(UmbraBatchSend.SendToken(bob, address(token), amount2, pkx, ciphertext));
    token.approve(address(router), totalAmount);

    vm.expectCall(address(router), abi.encodeWithSelector(router.batchSend.selector, toll, sendEth, sendToken));        
    vm.expectCall(umbra, abi.encodeWithSelector(IUmbra(umbra).sendEth.selector));
    vm.expectCall(umbra, abi.encodeWithSelector(IUmbra(umbra).sendToken.selector));

    uint256 totalToll = toll * sendEth.length + toll * sendToken.length;

    router.batchSend{value: totalAmount + totalToll}(toll, sendEth, sendToken);

    assertEq(alice.balance, amount);
    assertEq(bob.balance, amount2);
    assertEq(token.balanceOf(umbra), totalAmount);
    }

  function testExpectRevert_BatchSend() public {
    sendEth.push(UmbraBatchSend.SendEth(payable(alice), 1e16, pkx, ciphertext));
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), 1e16, pkx, ciphertext));

    sendToken.push(UmbraBatchSend.SendToken(alice, address(token), 1e17, pkx, ciphertext));
    sendToken.push(UmbraBatchSend.SendToken(bob, address(token), 1e17, pkx, ciphertext));
    token.approve(address(router), 1e17 * 2);

    uint256 totalToll = toll * sendEth.length + toll * sendToken.length;
    vm.expectRevert(abi.encodeWithSelector(ValueMismatch.selector));
    router.batchSend{value: 1e16*2 + totalToll + 42}(toll, sendEth, sendToken);
  }

}

contract BatchSendWithTollTest is UmbraBatchSendTest {
  function setUp() public override {
    super.setUp();
    toll = 0.1 ether;
    setToll(umbra, toll);
  }

}

contract BatchSendWithoutTollTest is UmbraBatchSendTest {
  function setUp() public override {
    super.setUp();
    toll = 0;
    setToll(umbra, toll);
  }

}