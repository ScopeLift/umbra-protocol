// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {DeployUmbraTest} from "test/utils/DeployUmbraTest.sol";
import {IUmbra} from "src/interface/IUmbra.sol";
import {UmbraBatchSend} from "src/UmbraBatchSend.sol";

abstract contract UmbraBatchSendTest is DeployUmbraTest {
  UmbraBatchSend router;

  uint256 toll;
  uint256 internal constant WAD = 1e18;
  address internal constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

  UmbraBatchSend.SendData[] sendData;

  event BatchSendExecuted(address indexed sender);

  error NotSorted();
  error TooMuchEthSent();

  function setUp() public virtual override {
    super.setUp();
    router = new UmbraBatchSend(IUmbra(address(umbra)));
    router.approveToken(IERC20(address(token)));
    router.approveToken(IERC20(address(token2)));
  }

  function test_PostSetupState() public {
    uint256 currentToll = IUmbra(umbra).toll();
    assertEq(toll, currentToll);
  }

  function testFuzz_BatchSendEth(uint256 amount, uint256 amount2) public {
    amount = bound(amount, toll + 1, 10e20);
    amount2 = bound(amount, toll + 1, 10e20);

    sendData.push(UmbraBatchSend.SendData(payable(alice), ETH, amount, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(payable(bob), ETH, amount2, pkx, ciphertext));

    uint256 totalAmount = amount + amount2 + (toll * sendData.length);

    vm.expectCall(
      address(router), abi.encodeWithSelector(router.batchSend.selector, toll, sendData)
    );
    vm.expectCall(umbra, abi.encodeWithSelector(IUmbra(umbra).sendEth.selector));
    vm.expectEmit(true, true, true, true);
    emit BatchSendExecuted(address(this));
    router.batchSend{value: totalAmount}(toll, sendData);

    assertEq(alice.balance, amount);
    assertEq(bob.balance, amount2);
  }

  function test_RevertIf_TooLittleEthIsSent() public {
    sendData.push(UmbraBatchSend.SendData(payable(alice), ETH, 1 ether, pkx, ciphertext));
    vm.expectRevert(); // TODO stricter check on "EvmError: OutOfFund"
    router.batchSend{value: 1}(toll, sendData);
  }

  function test_RevertIf_TooMuchEthIsSent() public {
    sendData.push(UmbraBatchSend.SendData(payable(alice), ETH, 1 ether, pkx, ciphertext));

    vm.expectRevert(TooMuchEthSent.selector); // TODO stricter check on "EvmError: OutOfFund"
    router.batchSend{value: address(this).balance}(toll, sendData);
  }

  function testFuzz_BatchSendTokens(uint72 amount, uint72 amount2) public {
    uint256 totalAmount = uint256(amount) + amount2;

    sendData.push(UmbraBatchSend.SendData(alice, address(token), amount, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(bob, address(token), amount2, pkx, ciphertext));
    uint256 totalToll = toll * sendData.length;
    token.approve(address(router), totalAmount);

    vm.expectCall(
      address(router), abi.encodeWithSelector(router.batchSend.selector, toll, sendData)
    );
    vm.expectCall(umbra, abi.encodeWithSelector(IUmbra(umbra).sendToken.selector));
    router.batchSend{value: totalToll}(toll, sendData);

    assertEq(token.balanceOf(umbra), totalAmount);
  }

  function testFuzz_BatchSend2Tokens(uint72 amount, uint72 amount2, uint72 amount3, uint72 amount4)
    public
  {
    uint256 totalAmount = uint256(amount) + amount2;
    uint256 totalAmount2 = uint256(amount3) + amount4;

    sendData.push(UmbraBatchSend.SendData(alice, address(token2), amount3, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(bob, address(token2), amount4, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(alice, address(token), amount, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(bob, address(token), amount2, pkx, ciphertext));

    uint256 totalToll = toll * sendData.length;
    token.approve(address(router), totalAmount);
    token2.approve(address(router), totalAmount2);

    vm.expectCall(umbra, abi.encodeWithSelector(IUmbra(umbra).sendToken.selector), 4);
    router.batchSend{value: totalToll}(toll, sendData);

    assertEq(token.balanceOf(umbra), totalAmount);
    assertEq(token2.balanceOf(umbra), totalAmount2);
  }

  function test_RevertIf_SendDataNotSortedByTokenAddress() public {
    sendData.push(UmbraBatchSend.SendData(alice, ETH, 1, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(bob, address(token), 1, pkx, ciphertext));
    vm.expectRevert(NotSorted.selector);
    router.batchSend(toll, sendData);
  }

  function testFuzz_BatchSend(uint256 amount, uint256 amount2, uint72 amount3, uint72 amount4)
    public
  {
    amount = bound(amount, toll + 1, 10e20);
    amount2 = bound(amount, toll + 1, 10e20);
    uint256 totalAmount = uint256(amount) + amount2;
    uint256 totalTokenAmount = uint256(amount3) + amount4;

    sendData.push(UmbraBatchSend.SendData(alice, address(token), amount3, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(bob, address(token), amount4, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(payable(alice), ETH, amount, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(payable(bob), ETH, amount2, pkx, ciphertext));
    token.approve(address(router), totalTokenAmount);

    vm.expectCall(
      address(router), abi.encodeWithSelector(router.batchSend.selector, toll, sendData)
    );
    vm.expectCall(umbra, abi.encodeWithSelector(IUmbra(umbra).sendEth.selector));
    vm.expectCall(umbra, abi.encodeWithSelector(IUmbra(umbra).sendToken.selector));
    vm.expectEmit(true, true, true, true);
    emit BatchSendExecuted(address(this));

    uint256 totalToll = toll * sendData.length;

    router.batchSend{value: totalAmount + totalToll}(toll, sendData);

    assertEq(alice.balance, amount);
    assertEq(bob.balance, amount2);
    assertEq(token.balanceOf(umbra), totalTokenAmount);
  }

  function test_RevertIf_TooLittleEthAmountIsSent2() public {
    sendData.push(UmbraBatchSend.SendData(alice, address(token), 1e17, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(bob, address(token), 1e17, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(payable(alice), ETH, 1e16, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(payable(bob), ETH, 1e16, pkx, ciphertext));

    token.approve(address(router), 1e17 * 2);

    vm.expectRevert(); // TODO stricter check on "EvmError: OutOfFund"
    router.batchSend{value: 0}(toll, sendData);
  }

  function test_RevertIf_TooMuchEthAmountIsSent2() public {
    sendData.push(UmbraBatchSend.SendData(alice, address(token), 1e17, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(bob, address(token), 1e17, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(payable(alice), ETH, 1e16, pkx, ciphertext));
    sendData.push(UmbraBatchSend.SendData(payable(bob), ETH, 1e16, pkx, ciphertext));

    token.approve(address(router), 1e17 * 2);

    vm.expectRevert(TooMuchEthSent.selector);
    router.batchSend{value: address(this).balance}(toll, sendData);
  }
}

contract BatchSendWithTollTest is UmbraBatchSendTest {
  function setUp() public override {
    super.setUp();
    toll = 1e17;
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
