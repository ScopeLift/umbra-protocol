// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20, SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {DeployUmbraTest} from "test/utils/DeployUmbraTest.sol";
import {IQuoter} from "src/interface/IQuoter.sol";
import {ISwapRouter} from "src/interface/ISwapRouter.sol";
import {IUmbra} from "src/interface/IUmbra.sol";
import {IUmbraHookReceiver} from "src/interface/IUmbraHookReceiver.sol";
import {UniswapWithdrawHook} from "src/UniswapWithdrawHook.sol";

contract UniswapWithdrawHookTest is DeployUmbraTest {
  using SafeERC20 for IERC20;

  uint256 mainnetForkId;

  UniswapWithdrawHook withdrawHook;
  IUmbra umbraContract;
  ISwapRouter swapRouter;
  IQuoter quoterContract;
  IERC20 daiToken;

  uint256 toll;
  address recipient;
  address feeRecipient = address(0x20220613);
  uint256 numOfAddrs = 10;
  address sponsor;
  uint256 quote;
  uint256 feeAmount;

  // Mainnet Addresses
  address public dai = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address public weth = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
  address public router = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
  address public quoter = 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6;

  // 0.3% pool fee is unique to this DAI-WETH pool
  uint24 poolFee = 3000;

  // Umbra functions that we'll be calling
  enum UmbraFns {
    withdrawTokenAndCall,
    withdrawTokenAndCallOnBehalf
  }

  function setUp() public override {
    super.setUp();
    uint256 mainnetForkBlock = 15_181_633;
    mainnetForkId = vm.createSelectFork(vm.rpcUrl("mainnet"), mainnetForkBlock);

    umbraContract = IUmbra(umbra);
    swapRouter = ISwapRouter(router);
    quoterContract = IQuoter(quoter);
    withdrawHook = new UniswapWithdrawHook(ISwapRouter(swapRouter));
    daiToken = IERC20(dai);
    // Alice's address is derived from the private key of 1.
    alice = vm.addr(1);
    // Owner approves tokens
    withdrawHook.approveToken(daiToken);
    deal(dai, address(this), 10e29);
  }

  function testFuzz_HookTest_withdrawTokenAndCall(
    uint256 amount,
    uint256 swapAmount,
    uint256 feeBips,
    uint256 sponsorFee
  ) public {
    // Using for loop here to generate deterministic addresses instead of fetching random address
    // state from network RPC node every time a fuzz test is run.
    vm.expectCall(
      address(withdrawHook),
      abi.encodeWithSelector(withdrawHook.tokensWithdrawn.selector),
      uint64(numOfAddrs)
    );

    for (uint256 i = 0; i < numOfAddrs; i++) {
      feeRecipient = address(uint160(uint256(keccak256(abi.encode(i)))));
      recipient = address(uint160(uint256(keccak256(abi.encode(feeRecipient)))));

      hookTest(
        recipient,
        amount,
        swapAmount,
        feeBips,
        feeRecipient,
        sponsorFee,
        UmbraFns.withdrawTokenAndCall
      );
    }
  }

  function testFuzz_HookTest_withdrawTokenAndCallOnBehalf(
    uint256 amount,
    uint256 swapAmount,
    uint256 feeBips,
    uint256 sponsorFee
  ) public {
    // Using for loop here to generate deterministic addresses instead of fetching random address
    // state from network RPC node every time a fuzz test is run.
    vm.expectCall(
      address(withdrawHook),
      abi.encodeWithSelector(withdrawHook.tokensWithdrawn.selector),
      uint64(numOfAddrs)
    );

    for (uint256 i = 0; i < numOfAddrs; i++) {
      feeRecipient = address(uint160(uint256(keccak256(abi.encode(i)))));
      recipient = address(uint160(uint256(keccak256(abi.encode(feeRecipient)))));
      hookTest(
        recipient,
        amount,
        swapAmount,
        feeBips,
        feeRecipient,
        sponsorFee,
        UmbraFns.withdrawTokenAndCallOnBehalf
      );
    }
  }

  function hookTest(
    address destinationAddr,
    uint256 amount,
    uint256 swapAmount,
    uint256 feeBips,
    address feeReceiver,
    uint256 sponsorFee,
    UmbraFns fn
  ) internal {
    amount = bound(amount, 10e10, 100_000 ether);
    swapAmount = bound(swapAmount, 10e8, amount);
    feeBips = bound(feeBips, 1, 100);
    sponsorFee = bound(sponsorFee, 0, amount - swapAmount);

    daiToken.approve(address(umbraContract), amount);
    umbraContract.sendToken{value: toll}(alice, dai, amount, pkx, ciphertext);

    bytes memory _path = abi.encodePacked(dai, poolFee, weth);
    // Get quotes based on the _path and swapAmount
    quote = quoterContract.quoteExactInput(_path, swapAmount);
    feeAmount = (quote * feeBips) / 10_000;
    uint256 recipientAmountReceived = quote - feeAmount;

    ISwapRouter.ExactInputParams memory params;
    params = ISwapRouter.ExactInputParams({
      path: _path,
      recipient: address(swapRouter),
      amountIn: swapAmount,
      amountOutMinimum: recipientAmountReceived
    });

    bytes[] memory multicallData = new bytes[](2);
    multicallData[0] = abi.encodeCall(swapRouter.exactInput, params);
    multicallData[1] = abi.encodeCall(
      swapRouter.unwrapWETH9WithFee,
      (params.amountOutMinimum, destinationAddr, feeBips, feeReceiver)
    );
    bytes memory data = abi.encode(destinationAddr, multicallData);

    IUmbraHookReceiver receiver = IUmbraHookReceiver(address(withdrawHook));

    vm.prank(alice); // Withdraw as Alice

    if (fn == UmbraFns.withdrawTokenAndCall) {
      umbraContract.withdrawTokenAndCall(address(withdrawHook), dai, receiver, data);
      assertEq(daiToken.balanceOf(destinationAddr), amount - swapAmount);
    } else {
      umbraContract_withdrawTokenAndCallOnBehalf(receiver, data, sponsorFee);
      assertEq(daiToken.balanceOf(destinationAddr), amount - swapAmount - sponsorFee);
    }
    assertGe(destinationAddr.balance, recipientAmountReceived);
    assertEq(feeReceiver.balance, feeAmount);
  }

  function umbraContract_withdrawTokenAndCallOnBehalf(
    IUmbraHookReceiver receiver,
    bytes memory data,
    uint256 sponsorFee
  ) internal {
    (uint8 v, bytes32 r, bytes32 s) =
      createDigestAndSign(address(withdrawHook), dai, sponsor, sponsorFee, receiver, data, 1);

    umbraContract.withdrawTokenAndCallOnBehalf(
      alice, address(withdrawHook), dai, sponsor, sponsorFee, receiver, data, v, r, s
    );
  }
}
