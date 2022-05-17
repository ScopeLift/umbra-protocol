// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
pragma abicoder v2;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "src/utils/ISwapRouter.sol";

contract WithdrawHook {

  ISwapRouter internal immutable swapRouter;
  address internal constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

  constructor(ISwapRouter _swapRouter) {
  swapRouter = _swapRouter;
  }

  function tokensWithdrawn(
    uint256 _amount,
    address _stealthAddr,
    address _acceptor,
    address _tokenAddr,
    address _sponsor,
    uint256 _sponsorFee,
    bytes memory _data
  ) external{
    // Plz recommend checks that should happen here
    _swapForEth(_amount, _stealthAddr, _acceptor, _tokenAddr, _sponsor, _sponsorFee, _data);
  }

  function _swapForEth(
    uint256 _amount,
    address _stealthAddr,
    address _acceptor,
    address _tokenAddr,
    address _sponsor,
    uint256 _sponsorFee,
    bytes memory _data) internal {
    uint256 senderBalance = _amount;
    if(_sponsorFee > 0) {
      SafeERC20.safeTransferFrom(IERC20(_tokenAddr), address(this), _sponsor, _sponsorFee);
      senderBalance -= _sponsorFee;
    }

    (address _dest, uint256 _swapAmount, uint256 _amountOutMinimum, uint24 _poolFee) = abi.decode(_data, (address, uint256, uint256, uint24));
    senderBalance -= _swapAmount;

    SafeERC20.safeApprove(IERC20(_tokenAddr), address(swapRouter), _swapAmount);

    ISwapRouter.ExactInputSingleParams memory params =
      ISwapRouter.ExactInputSingleParams({
        tokenIn: _tokenAddr,
        tokenOut: WETH9,
        fee: _poolFee,
        recipient: address(swapRouter),
        amountIn: _swapAmount,
        amountOutMinimum: _amountOutMinimum,
        sqrtPriceLimitX96: 0
      });
    bytes[] memory data = new bytes[](2);
    data[0] = abi.encodeWithSelector(swapRouter.exactInputSingle.selector, params);
    data[1] = abi.encodeWithSelector(swapRouter.unwrapWETH9.selector, _amountOutMinimum, _dest);

    swapRouter.multicall(data);
    SafeERC20.safeTransferFrom(IERC20(_tokenAddr), address(this), _dest, senderBalance);
  }

  receive() external payable {}
  fallback() external payable {}
}