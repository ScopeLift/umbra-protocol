// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "test/utils/DeployUmbraTest.sol";
import "src/UmbraBatchSend.sol";

abstract contract UmbraBatchSendTest is DeployUmbraTest {
  UmbraBatchSend router;

  uint toll;
  uint internal constant WAD = 1e18;

  UmbraBatchSend.SendEth[] sendEth;
  UmbraBatchSend.SendToken[] sendToken;
  UmbraBatchSend.TransferSummary[] transferSummary;

  error ValueMismatch();
  error TransferAmountMismatch();

  function setUp() public virtual override {
    super.setUp();
    router = new UmbraBatchSend(IUmbra(address(umbra)));
    router.approveToken(IERC20(address(token)));
    router.approveToken(IERC20(address(token2)));
  }

  function testPostSetupState() public {
    uint currentToll = IUmbra(umbra).toll();
    assertEq(toll, currentToll);
  }

  function testFuzz_BatchSendEth(uint amount, uint amount2) public {
    amount = bound(amount, toll + 1, 10e20);
    amount2 = bound(amount, toll + 1, 10e20);

    sendEth.push(
      UmbraBatchSend.SendEth(payable(alice), amount, pkx, ciphertext)
    );
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), amount2, pkx, ciphertext));

    uint totalAmount = amount + amount2 + (toll * sendEth.length);

    vm.expectCall(
      address(router),
      abi.encodeWithSelector(router.batchSendEth.selector, toll, sendEth)
    );
    vm.expectCall(umbra, abi.encodeWithSelector(IUmbra(umbra).sendEth.selector));
    router.batchSendEth{value: totalAmount}(toll, sendEth);

    assertEq(alice.balance, amount);
    assertEq(bob.balance, amount2);
  }

  function testExpectRevert_BatchSendEth() public {
    sendEth.push(
      UmbraBatchSend.SendEth(payable(alice), 1 ether, pkx, ciphertext)
    );
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), 1 ether, pkx, ciphertext));

    vm.expectRevert(abi.encodeWithSelector(ValueMismatch.selector));
    router.batchSendEth{value: 1 ether + toll}(toll, sendEth);
  }

  function testFuzz_BatchSendTokens(uint72 amount, uint72 amount2) public {
    uint totalAmount = uint(amount) + amount2;

    transferSummary.push(
      UmbraBatchSend.TransferSummary(totalAmount, address(token))
    );
    sendToken.push(
      UmbraBatchSend.SendToken(alice, address(token), amount, pkx, ciphertext)
    );
    sendToken.push(
      UmbraBatchSend.SendToken(bob, address(token), amount2, pkx, ciphertext)
    );
    uint totalToll = toll * sendToken.length;
    token.approve(address(router), totalAmount);

    vm.expectCall(
      address(router),
      abi.encodeWithSelector(
        router.batchSendTokens.selector, toll, sendToken, transferSummary
      )
    );
    vm.expectCall(
      umbra, abi.encodeWithSelector(IUmbra(umbra).sendToken.selector)
    );
    router.batchSendTokens{value: totalToll}(toll, sendToken, transferSummary);

    assertEq(token.balanceOf(umbra), totalAmount);
  }

  function testFuzz_BatchSend2Tokens(
    uint72 amount,
    uint72 amount2,
    uint72 amount3,
    uint72 amount4
  ) public {
    uint totalAmount = uint(amount) + amount2;
    uint totalAmount2 = uint(amount3) + amount4;

    transferSummary.push(
      UmbraBatchSend.TransferSummary(totalAmount, address(token))
    );
    transferSummary.push(
      UmbraBatchSend.TransferSummary(totalAmount2, address(token2))
    );

    sendToken.push(
      UmbraBatchSend.SendToken(alice, address(token), amount, pkx, ciphertext)
    );
    sendToken.push(
      UmbraBatchSend.SendToken(bob, address(token), amount2, pkx, ciphertext)
    );
    sendToken.push(
      UmbraBatchSend.SendToken(alice, address(token2), amount3, pkx, ciphertext)
    );
    sendToken.push(
      UmbraBatchSend.SendToken(bob, address(token2), amount4, pkx, ciphertext)
    );

    uint totalToll = toll * sendToken.length;
    token.approve(address(router), totalAmount);
    token2.approve(address(router), totalAmount2);

    vm.expectCall(
      address(router),
      abi.encodeWithSelector(
        router.batchSendTokens.selector, toll, sendToken, transferSummary
      )
    );
    vm.expectCall(
      umbra, abi.encodeWithSelector(IUmbra(umbra).sendToken.selector)
    );
    router.batchSendTokens{value: totalToll}(toll, sendToken, transferSummary);

    assertEq(token.balanceOf(umbra), totalAmount);
    assertEq(token2.balanceOf(umbra), totalAmount2);
  }

  function testExpectRevert_BatchSendTokens() public {
    transferSummary.push(
      UmbraBatchSend.TransferSummary(2.5 ether, address(token))
    );
    sendToken.push(
      UmbraBatchSend.SendToken(alice, address(token), 1 ether, pkx, ciphertext)
    );
    sendToken.push(
      UmbraBatchSend.SendToken(bob, address(token), 1 ether, pkx, ciphertext)
    );

    token.approve(address(router), 2 ether);
    vm.expectRevert(abi.encodeWithSelector(TransferAmountMismatch.selector));
    router.batchSendTokens{value: toll * sendToken.length}(
      toll, sendToken, transferSummary
    );
  }

  function testFuzz_BatchSend(
    uint amount,
    uint amount2,
    uint72 amount3,
    uint72 amount4
  ) public {
    amount = bound(amount, toll + 1, 10e20);
    amount2 = bound(amount, toll + 1, 10e20);
    uint totalAmount = uint(amount) + amount2;
    uint totalTokenAmount = uint(amount3) + amount4;

    sendEth.push(
      UmbraBatchSend.SendEth(payable(alice), amount, pkx, ciphertext)
    );
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), amount2, pkx, ciphertext));

    transferSummary.push(
      UmbraBatchSend.TransferSummary(totalTokenAmount, address(token))
    );
    sendToken.push(
      UmbraBatchSend.SendToken(alice, address(token), amount3, pkx, ciphertext)
    );
    sendToken.push(
      UmbraBatchSend.SendToken(bob, address(token), amount4, pkx, ciphertext)
    );
    token.approve(address(router), totalTokenAmount);

    vm.expectCall(
      address(router),
      abi.encodeWithSelector(
        router.batchSend.selector, toll, sendEth, sendToken, transferSummary
      )
    );
    vm.expectCall(umbra, abi.encodeWithSelector(IUmbra(umbra).sendEth.selector));
    vm.expectCall(
      umbra, abi.encodeWithSelector(IUmbra(umbra).sendToken.selector)
    );

    uint totalToll = toll * sendEth.length + toll * sendToken.length;

    router.batchSend{value: totalAmount + totalToll}(
      toll, sendEth, sendToken, transferSummary
    );

    assertEq(alice.balance, amount);
    assertEq(bob.balance, amount2);
    assertEq(token.balanceOf(umbra), totalTokenAmount);
  }

  function testExpectRevert_BatchSend() public {
    sendEth.push(UmbraBatchSend.SendEth(payable(alice), 1e16, pkx, ciphertext));
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), 1e16, pkx, ciphertext));

    transferSummary.push(
      UmbraBatchSend.TransferSummary(1e17 * 2, address(token))
    );
    sendToken.push(
      UmbraBatchSend.SendToken(alice, address(token), 1e17, pkx, ciphertext)
    );
    sendToken.push(
      UmbraBatchSend.SendToken(bob, address(token), 1e17, pkx, ciphertext)
    );
    token.approve(address(router), 1e17 * 2);

    // uint totalToll = toll * sendEth.length + toll * sendToken.length;
    vm.expectRevert(abi.encodeWithSelector(ValueMismatch.selector));
    router.batchSend{value: 0}(toll, sendEth, sendToken, transferSummary);
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
