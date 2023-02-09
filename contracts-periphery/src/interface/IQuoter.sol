// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.13;

interface IQuoter {
  function quoteExactInput(bytes memory path, uint256 amountIn)
    external
    returns (uint256 amountOut);
}
