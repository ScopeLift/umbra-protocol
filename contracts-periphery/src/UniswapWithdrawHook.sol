// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "src/interface/ISwapRouter.sol";

contract UniswapWithdrawHook is Ownable {
  using SafeERC20 for IERC20;

  ISwapRouter internal immutable swapRouter;

  uint256 public feeBips;
  address public feeCollector;
  address payable public feeReceiver;

  constructor(ISwapRouter _swapRouter, uint256 _feeBips, address payable _feeReceiver) {
    swapRouter = _swapRouter;
    feeBips = _feeBips;
    feeReceiver = _feeReceiver;
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

    (bool _singleTrade, , ) = abi.decode(_data, (bool, address, ISwapRouter.ExactInputParams[]));
    if(_singleTrade) {
      _swapPartForEth(_amount, _stealthAddr, _acceptor, _tokenAddr, _sponsor, _sponsorFee, _data);
    } else {
      _swapPartForTokenPartForEth(_amount, _stealthAddr, _acceptor, _tokenAddr, _sponsor, _sponsorFee, _data);
    }

  }

  function _swapPartForEth(
    uint256 _amount,
    address _stealthAddr,
    address _acceptor,
    address _tokenAddr,
    address _sponsor,
    uint256 _sponsorFee,
    bytes memory _data) internal {
    uint256 senderBalance = _amount;
    ( , address _recipient, ISwapRouter.ExactInputParams[] memory params) = abi.decode(_data, (bool, address, ISwapRouter.ExactInputParams[]));
    senderBalance -= params[0].amountIn;

    bytes[] memory data = new bytes[](2);
    data[0] = abi.encodeWithSelector(swapRouter.exactInput.selector, params[0]);
    // Need to rethink usage of params[0].amountOutMinimum below
    data[1] = abi.encodeWithSelector(swapRouter.unwrapWETH9WithFee.selector, params[0].amountOutMinimum, _recipient, feeBips, feeReceiver);

    swapRouter.multicall(data);
    if(senderBalance > 0) {
      IERC20(_tokenAddr).safeTransferFrom(address(this), _recipient, senderBalance);
    }
  }

  function _swapPartForTokenPartForEth(
    uint256 _amount,
    address _stealthAddr,
    address _acceptor,
    address _tokenAddr,
    address _sponsor,
    uint256 _sponsorFee,
    bytes memory _data) internal {
    uint256 senderBalance = _amount;
    (, address _recipient, ISwapRouter.ExactInputParams[] memory swapParams) = abi.decode(_data, (bool, address, ISwapRouter.ExactInputParams[]));

    bytes[] memory data = new bytes[](swapParams.length);

    for(uint i = 0; i < swapParams.length; i++) {

      // Recipient address is pointed to the swapRouter when the user wants to unwrap WETH
      if(swapParams[i].recipient == address(swapRouter)) {

        senderBalance -= swapParams[i].amountIn;
        ISwapRouter.ExactInputParams[] memory swapPartForEthParams = new ISwapRouter.ExactInputParams[](1);
        swapPartForEthParams[0] = swapParams[i];
        bytes memory newData = abi.encode(true, _recipient, swapPartForEthParams);

        _swapPartForEth(swapParams[i].amountIn, _stealthAddr, _acceptor, _tokenAddr, _sponsor, _sponsorFee, newData);

      } else {
        senderBalance -= swapParams[i].amountIn;
        data[i] = abi.encodeWithSelector(swapRouter.exactInput.selector, swapParams[i]);
      }
    }

    swapRouter.multicall(data);
    if(senderBalance > 0) {
      IERC20(_tokenAddr).safeTransferFrom(address(this), _recipient, senderBalance);
    }
  }

  function approveToken(IERC20 _token) external {
    _token.safeApprove(address(swapRouter), type(uint256).max);
  }

  function setFee(uint256 _newFeeBips) external onlyOwner {
    feeBips = _newFeeBips;
  }

  function setFeeReceiver(address payable _newTollReceiver) external onlyOwner {
    feeReceiver = _newTollReceiver;
  }

}