// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {IERC20, SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {ISwapRouter} from "src/interface/ISwapRouter.sol";

contract UniswapWithdrawHook is Ownable {
  using SafeERC20 for IERC20;

  ISwapRouter internal immutable SWAP_ROUTER;

  constructor(ISwapRouter _swapRouter) {
    SWAP_ROUTER = _swapRouter;
  }

  /**
   * @notice _acceptor should be the address of this contract where withdrawn funds are sent
   * @param _data The encoded bytes of recipient address and calldata for Uniswap SwapRouter02's
   * multicall.
   * @dev The SwapRouter02 source code can be found here:
   * https://github.com/Uniswap/swap-router-contracts/blob/main/contracts/SwapRouter02.sol
   */
  function tokensWithdrawn(
    uint256, /* _amount */
    address, /* _stealthAddr */
    address, /* _acceptor */
    address _tokenAddr,
    address, /* _sponsor */
    uint256, /* _sponsorFee */
    bytes memory _data
  ) external {
    (address _recipient, bytes[] memory _multicallData) = abi.decode(_data, (address, bytes[]));

    SWAP_ROUTER.multicall(_multicallData);

    uint256 _balance = IERC20(_tokenAddr).balanceOf(address(this));
    if (_balance > 0) IERC20(_tokenAddr).safeTransfer(_recipient, _balance);
  }

  /// @notice Whenever a new token is added to Umbra, this method must be called by the owner to
  /// support that token in this contract.
  function approveToken(IERC20 _token) external onlyOwner {
    _token.safeApprove(address(SWAP_ROUTER), type(uint256).max);
  }
}
