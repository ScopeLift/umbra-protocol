// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.13;

import {IUniswapV3SwapCallback} from "src/interface/IUniswapV3SwapCallback.sol";

/// @title Router token swapping functionality
/// @notice Functions for swapping tokens via Uniswap V3
interface ISwapRouter is IUniswapV3SwapCallback {
  struct ExactInputParams {
    bytes path;
    address recipient;
    uint256 amountIn;
    uint256 amountOutMinimum;
  }

  function exactInput(ExactInputParams calldata params)
    external
    payable
    returns (uint256 amountOut);

  function multicall(bytes[] calldata data) external payable returns (bytes[] memory results);

  function unwrapWETH9WithFee(
    uint256 amountMinimum,
    address recipient,
    uint256 feeBips,
    address feeRecipient
  ) external payable;
}
