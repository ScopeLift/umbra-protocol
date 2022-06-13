// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "test/utils/DSTestPlus.sol";
import "test/utils/DeployUmbraTest.sol";
import "src/UniswapWithdrawHook.sol";

contract UniswapWithdrawHookGasTest is DeployUmbraTest {
  using SafeERC20 for IERC20;
  UniswapWithdrawHook withdrawHook;

  IUmbra umbraContract;
  ISwapRouter swapRouter;
  IQuoter quoter;
  IERC20 dai;

  uint256 toll;
  address public constant feeRecipient = address(0x202206);

  // Mainnet Addresses
  address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
  address public constant Router = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
  address public constant Quoter = 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6;
  uint24 poolFee = 3000;

  function setUp() override public {
    super.setUp();
    umbraContract = IUmbra(address(umbra));
    swapRouter = ISwapRouter(Router);
    quoter = IQuoter(Quoter);
    withdrawHook = new UniswapWithdrawHook(ISwapRouter(swapRouter));
    dai = IERC20(DAI);
    // Owner approves tokens
    withdrawHook.approveToken(dai);
    deal(address(DAI), address(this), 10e23);
  }

  function executeParams(address destinationAddr, uint256 amount, uint256 swapAmount, uint256 feeBips, address feeReceiver) public {
    dai.approve(address(umbraContract), amount);

    umbraContract.sendToken{value: toll}(address(alice), address(DAI), amount, pkx, ciphertext);

    vm.startPrank(alice); // Withdraw as Alice
    IUmbraHookReceiver receiver = IUmbraHookReceiver(address(withdrawHook));

    bytes memory _path = abi.encodePacked(address(DAI), poolFee, WETH9);

    uint256 feeReceiverPrevBalance = feeReceiver.balance;
    uint256 minOut = quoter.quoteExactInput(_path, swapAmount);
    uint256 feeAmount = minOut * feeBips / 10_000;
    minOut -= feeAmount;

    ISwapRouter.ExactInputParams memory params;
    params =
      ISwapRouter.ExactInputParams({
        path: _path,
        recipient : address(swapRouter),
        amountIn : swapAmount,
        amountOutMinimum: minOut
      });

    bytes[] memory multicallData = new bytes[](2);
    multicallData[0] = abi.encodeCall(swapRouter.exactInput, params);
    multicallData[1] = abi.encodeCall(swapRouter.unwrapWETH9WithFee, (params.amountOutMinimum, destinationAddr, feeBips, feeReceiver));

    bytes memory data = abi.encode(destinationAddr, multicallData);

    vm.expectCall(umbra, abi.encodeWithSelector(umbraContract.withdrawTokenAndCall.selector));
    vm.expectCall(address(withdrawHook), abi.encodeWithSelector(withdrawHook.tokensWithdrawn.selector));

    umbraContract.withdrawTokenAndCall(address(withdrawHook), address(DAI), receiver, data);

    vm.stopPrank();
    uint256 destinationAddrBalance = IERC20(DAI).balanceOf(destinationAddr);
    assertEq(destinationAddrBalance, amount-swapAmount);
    assertTrue(address(destinationAddr).balance >= minOut);
    assertEq(feeReceiver.balance - feeReceiverPrevBalance, feeAmount);
  }

  function test_SwapHalfForEth() public {
    executeParams(bob, 10 ether, 5 ether, 1, feeRecipient);
  }

  function test_SwapAllForEth() public {
    executeParams(bob, 10 ether, 10 ether, 1, feeRecipient);
  }
}