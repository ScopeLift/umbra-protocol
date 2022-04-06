// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "ds-test/test.sol";
import "forge-std/Vm.sol";
import "forge-std/stdlib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../UmbraBatchSend.sol";

contract UmbraBatchSendTest is DSTest, stdCheats {
  using stdStorage for StdStorage;
  StdStorage stdstore;

  UmbraBatchSend public router = new UmbraBatchSend();

  string constant umbraArtifact = "artifacts/Umbra.json";
  string constant testArtifact = "out/UmbraBatchSend.t.sol/UmbraBatchSendTest.json";
  string constant testArtifact2 = "out/UmbraBatchSend.sol/UmbraBatchSend.json";

  address umbra = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;
  address Dai = 0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735;

  address alice = address(0x202204);
  address bob = address(0x202205);

  Vm vm = Vm(HEVM_ADDRESS);
  bytes payload;

  uint256 public tollCommitment;
  bytes32 test = "test";

  UmbraBatchSend.SendEth newSendEth;
  UmbraBatchSend.SendEth[] sendEth;

  UmbraBatchSend.SendToken newSendToken;
  UmbraBatchSend.SendToken[] sendToken;

  IERC20 token = IERC20(address(Dai));

  function setUp() public {
    vm.label(alice, "Alice");
    vm.label(bob, "Bob");
    vm.label(address(this), "TestContract");

    stdstore.target(Dai).sig(IERC20(token).balanceOf.selector).with_key(address(this)).checked_write(1000 * 1e18);
  }

  function testBatchSendEth() public {
    uint256 alicePrevBal = alice.balance;
    uint256 bobPrevBal = bob.balance;

    uint256 amount = 1 ether;
    uint256 amount2 = 2 ether;
    uint256 toll = 0;

    sendEth.push(UmbraBatchSend.SendEth(payable(alice), amount, test, test));
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), amount2, test, test));
    router.batchSendEth{value: amount + amount2}(toll, sendEth);

    assertEq(alice.balance, alicePrevBal + amount);
    assertEq(bob.balance, bobPrevBal + amount2);
  }

  function testFuzz_BatchSendEth(
    uint8 amount,
    uint8 amount2,
    bytes32 testBytes
  ) public {
    uint256 alicePrevBal = alice.balance;
    uint256 bobPrevBal = bob.balance;
    vm.assume(amount > 0 && amount < type(uint8).max / 2);
    vm.assume(amount2 > 0 && amount2 < type(uint8).max / 2);

    uint256 toll = 0;

    sendEth.push(UmbraBatchSend.SendEth(payable(alice), amount, testBytes, testBytes));
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), amount2, testBytes, testBytes));

    uint256 totalAmount = amount + amount2;

    router.batchSendEth{value: totalAmount}(toll, sendEth);

    assertEq(alice.balance, alicePrevBal + amount);
    assertEq(bob.balance, bobPrevBal + amount2);
  }

  function testBatchSendTokens() public {
    assertTrue(token.balanceOf(address(this)) > 0, "caller's dai balance is zero");

    uint256 toll = 0;
    uint256 umbraPrevBal = token.balanceOf(umbra);

    sendToken.push(UmbraBatchSend.SendToken(alice, Dai, 1000, test, test));
    sendToken.push(UmbraBatchSend.SendToken(bob, Dai, 500, test, test));
    token.approve(address(router), 1500);

    router.batchSendTokens{value: toll}(toll, sendToken);
    assertEq(token.balanceOf(umbra), umbraPrevBal + 1500);
  }

  function testFuzz_BatchSendTokens(uint8 amount, uint8 amount2) public {
    assertTrue(token.balanceOf(address(this)) > 0, "caller's dai balance is zero");

    vm.assume(amount < type(uint8).max / 2);
    vm.assume(amount2 < type(uint8).max / 2);

    uint256 toll = 0;
    uint256 umbraPrevBal = token.balanceOf(umbra);

    sendToken.push(UmbraBatchSend.SendToken(alice, Dai, amount, test, test));
    sendToken.push(UmbraBatchSend.SendToken(bob, Dai, amount2, test, test));
    token.approve(address(router), amount + amount2);

    router.batchSendTokens{value: toll}(toll, sendToken);
    assertEq(token.balanceOf(umbra), umbraPrevBal + amount + amount2);
  }

  function testBatchSend() public {
    uint256 alicePrevBal = alice.balance;
    uint256 bobPrevBal = bob.balance;

    uint256 amount = 1 ether;
    uint256 amount2 = 2 ether;
    uint256 total = amount + amount2;
    uint256 toll = 0;

    sendEth.push(UmbraBatchSend.SendEth(payable(alice), amount, test, test));
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), amount2, test, test));

    //tokens
    assertTrue(token.balanceOf(address(this)) > 0, "caller's dai balance is zero");

    uint256 umbraPrevBal = token.balanceOf(umbra);

    sendToken.push(UmbraBatchSend.SendToken(alice, Dai, 1000, test, test));
    sendToken.push(UmbraBatchSend.SendToken(bob, Dai, 500, test, test));
    token.approve(address(router), 1500);

    router.batchSend{value: total + toll}(toll, sendEth, sendToken);

    assertEq(alice.balance, alicePrevBal + amount);
    assertEq(bob.balance, bobPrevBal + amount2);

    assertEq(token.balanceOf(umbra), umbraPrevBal + 1500);
  }

  function testFuzz_BatchSend(
    uint8 amount,
    uint8 amount2,
    bytes32 testBytes
  ) public {
    uint256 alicePrevBal = alice.balance;
    uint256 bobPrevBal = bob.balance;
    uint256 umbraPrevBal = token.balanceOf(umbra);
    vm.assume(amount > 0 && amount < type(uint8).max / 2);
    vm.assume(amount2 > 0 && amount2 < type(uint8).max / 2);
    assertTrue(token.balanceOf(address(this)) > 0, "caller's dai balance is zero");

    uint256 toll = 0;
    uint256 totalAmount = amount + amount2;

    sendEth.push(UmbraBatchSend.SendEth(payable(alice), amount, testBytes, testBytes));
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), amount2, testBytes, testBytes));

    sendToken.push(UmbraBatchSend.SendToken(alice, Dai, amount, test, test));
    sendToken.push(UmbraBatchSend.SendToken(bob, Dai, amount2, test, test));
    token.approve(address(router), amount + amount2);

    router.batchSend{value: totalAmount + toll}(toll, sendEth, sendToken);

    assertEq(alice.balance, alicePrevBal + amount);
    assertEq(bob.balance, bobPrevBal + amount2);

    assertEq(token.balanceOf(umbra), umbraPrevBal + amount + amount2);
  }
}
