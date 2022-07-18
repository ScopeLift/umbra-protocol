// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "test/utils/DeployUmbraTest.sol";
import "src/UmbraBatchSend.sol";

abstract contract UmbraBatchSendTest is DeployUmbraTest {
  UmbraBatchSend router;

  uint256 toll;
  uint256 internal constant WAD = 1e18;


  UmbraBatchSend.SendEth[] sendEth;
  UmbraBatchSend.SendToken[] sendToken;
  UmbraBatchSend.NewSendToken[] newSendToken;
  UmbraBatchSend.SwapSummary[] swapSum;

  error ValueMismatch();

  function setUp() virtual override public {
    super.setUp();
    router = new UmbraBatchSend(IUmbra(address(umbra)));
    router.approveToken(IERC20(address(token)));
    router.approveToken(IERC20(address(token2)));
  }

  function testPostSetupState() public {
    uint256 currentToll = IUmbra(umbra).toll();
    assertEq(toll, currentToll);
  }

  function testFuzz_BatchSendEth(uint256 amount, uint256 amount2) public {
    amount=bound(amount, toll+1, 10e20);
    amount2=bound(amount, toll+1, 10e20);

    sendEth.push(UmbraBatchSend.SendEth(payable(alice), amount, pkx, ciphertext));
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), amount2, pkx, ciphertext));

    uint256 totalAmount = amount + amount2 + (toll * sendEth.length);

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


  function test_BatchSendTokens() public {
    uint256 amount = 100 ether;
    uint256 amount2 = 120 ether;
    uint256 totalAmount = uint256(amount) + amount2;

    swapSum.push(UmbraBatchSend.SwapSummary(totalAmount, address(token)));
    // swapSum.push(UmbraBatchSend.SwapSummary(totalAmount, address(token2)));

    newSendToken.push(UmbraBatchSend.NewSendToken(alice, address(token), amount, (divWadUp(WAD * amount, totalAmount)), pkx, ciphertext));
    newSendToken.push(UmbraBatchSend.NewSendToken(bob, address(token), amount2, (divWadUp(WAD * amount2, totalAmount)), pkx, ciphertext));
    // newSendToken.push(UmbraBatchSend.NewSendToken(alice, address(token2), amount, (WAD * amount / totalAmount), pkx, ciphertext));
    // newSendToken.push(UmbraBatchSend.NewSendToken(bob, address(token2), amount2, (WAD * amount2 / totalAmount), pkx, ciphertext));
    uint256 totalToll = toll *  newSendToken.length;
    token.approve(address(router), totalAmount);
    token2.approve(address(router), totalAmount);

    vm.expectCall(address(router), abi.encodeWithSelector(router.newBatchSendTokens.selector, toll, newSendToken, swapSum));
    vm.expectCall(umbra, abi.encodeWithSelector(IUmbra(umbra).sendToken.selector));
    router.newBatchSendTokens{value: totalToll}(toll, newSendToken, swapSum);

    assertEq(token.balanceOf(umbra), totalAmount);
    // assertEq(token2.balanceOf(umbra), totalAmount);

  }

function mulWadDown(uint256 x, uint256 y) internal pure returns (uint256) {
        return mulDivDown(x, y, WAD); // Equivalent to (x * y) / WAD rounded down.
    }

    function mulWadUp(uint256 x, uint256 y) internal pure returns (uint256) {
        return mulDivUp(x, y, WAD); // Equivalent to (x * y) / WAD rounded up.
    }

    function divWadDown(uint256 x, uint256 y) internal pure returns (uint256) {
        return mulDivDown(x, WAD, y); // Equivalent to (x * WAD) / y rounded down.
    }

    function divWadUp(uint256 x, uint256 y) internal pure returns (uint256) {
        return mulDivUp(x, WAD, y); // Equivalent to (x * WAD) / y rounded up.
    }

    /*//////////////////////////////////////////////////////////////
                    LOW LEVEL FIXED POINT OPERATIONS
    //////////////////////////////////////////////////////////////*/

    function mulDivDown(
        uint256 x,
        uint256 y,
        uint256 denominator
    ) internal pure returns (uint256 z) {
        assembly {
            // Store x * y in z for now.
            z := mul(x, y)

            // Equivalent to require(denominator != 0 && (x == 0 || (x * y) / x == y))
            if iszero(and(iszero(iszero(denominator)), or(iszero(x), eq(div(z, x), y)))) {
                revert(0, 0)
            }

            // Divide z by the denominator.
            z := div(z, denominator)
        }
    }

    function mulDivUp(
        uint256 x,
        uint256 y,
        uint256 denominator
    ) internal pure returns (uint256 z) {
        assembly {
            // Store x * y in z for now.
            z := mul(x, y)

            // Equivalent to require(denominator != 0 && (x == 0 || (x * y) / x == y))
            if iszero(and(iszero(iszero(denominator)), or(iszero(x), eq(div(z, x), y)))) {
                revert(0, 0)
            }

            // First, divide z - 1 by the denominator and add 1.
            // We allow z - 1 to underflow if z is 0, because we multiply the
            // end result by 0 if z is zero, ensuring we return 0 if z is zero.
            z := mul(iszero(iszero(z)), add(div(sub(z, 1), denominator), 1))
        }
    }



  function testExpectRevert_BatchSendTokens() public {
    sendToken.push(UmbraBatchSend.SendToken(alice, address(token), 1 ether, pkx, ciphertext));
    sendToken.push(UmbraBatchSend.SendToken(bob, address(token), 1 ether, pkx, ciphertext));

    token.approve(address(router), 2 ether);
    vm.expectRevert(abi.encodeWithSelector(ValueMismatch.selector));
    router.batchSendTokens{value: toll * 2 + 42}(toll, sendToken);
  }

  function testFuzz_BatchSend(uint256 amount, uint256 amount2, uint72 amount3, uint72 amount4) public {
    amount=bound(amount, toll+1, 10e20);
    amount2=bound(amount, toll+1, 10e20);
    uint256 totalAmount = uint256(amount) + amount2;
    uint256 totalTokenAmount = uint256(amount3) + amount4;

    sendEth.push(UmbraBatchSend.SendEth(payable(alice), amount, pkx, ciphertext));
    sendEth.push(UmbraBatchSend.SendEth(payable(bob), amount2, pkx, ciphertext));

    sendToken.push(UmbraBatchSend.SendToken(alice, address(token), amount3, pkx, ciphertext));
    sendToken.push(UmbraBatchSend.SendToken(bob, address(token), amount4, pkx, ciphertext));
    token.approve(address(router), totalTokenAmount);

    vm.expectCall(address(router), abi.encodeWithSelector(router.batchSend.selector, toll, sendEth, sendToken));
    vm.expectCall(umbra, abi.encodeWithSelector(IUmbra(umbra).sendEth.selector));
    vm.expectCall(umbra, abi.encodeWithSelector(IUmbra(umbra).sendToken.selector));

    uint256 totalToll = toll * sendEth.length + toll * sendToken.length;

    router.batchSend{value: totalAmount + totalToll}(toll, sendEth, sendToken);

    assertEq(alice.balance, amount);
    assertEq(bob.balance, amount2);
    assertEq(token.balanceOf(umbra), totalTokenAmount);
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
