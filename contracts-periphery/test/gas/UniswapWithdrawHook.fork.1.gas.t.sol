// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "test/UniswapWithdrawHook.fork.1.t.sol";

contract UniswapWithdrawHookGasTest is UniswapWithdrawHookTest {
  function test_SwapHalfForEth_withdrawTokenAndCall() public {
    _testFuzz_HookTest(bob, 10 ether, 5 ether, 1, feeRecipient, 0, UmbraFns.withdrawTokenAndCall);
  }

  function test_SwapAllForEth_withdrawTokenAndCall() public {
    _testFuzz_HookTest(bob, 10 ether, 10 ether, 1, feeRecipient, 0, UmbraFns.withdrawTokenAndCall);
  }

  function test_SwapHalfForEth_withdrawTokenAndCallOnBehalf() public {
    _testFuzz_HookTest(bob, 10 ether, 5 ether, 1, feeRecipient, 1, UmbraFns.withdrawTokenAndCallOnBehalf);
  }

  function test_SwapAllForEth_withdrawTokenAndCallOnBehalf() public {
    _testFuzz_HookTest(bob, 10 ether, 10 ether, 1, feeRecipient, 1, UmbraFns.withdrawTokenAndCallOnBehalf);
  }
}
