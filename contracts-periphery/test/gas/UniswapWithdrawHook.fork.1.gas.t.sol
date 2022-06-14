// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "test/UniswapWithdrawHook.fork.1.t.sol";

contract UniswapWithdrawHookGasTest is UniswapWithdrawHookTest {
  address feeRecipient = address(0x20220613);

  function test_SwapHalfForEth() public {
    _testFuzz_HookTest(bob, 10 ether, 5 ether, 1, feeRecipient);
  }

  function test_SwapAllForEth() public {
    _testFuzz_HookTest(bob, 10 ether, 10 ether, 1, feeRecipient);
  }
}
