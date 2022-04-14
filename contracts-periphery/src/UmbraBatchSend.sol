// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IUmbra {
  function sendEth(
    address payable receiver,
    uint256 tollCommitment,
    bytes32 pkx,
    bytes32 ciphertext
  ) external payable;

  function sendToken(
    address receiver,
    address tokenAddr,
    uint256 amount,
    bytes32 pkx,
    bytes32 ciphertext
  ) external payable;
}

contract UmbraBatchSend {
  IUmbra internal immutable umbra;

  struct SendEth {
    address payable receiver;
    uint256 amount;
    bytes32 pkx;
    bytes32 ciphertext;
  }

  struct SendToken {
    address receiver;
    address tokenAddr;
    uint256 amount;
    bytes32 pkx;
    bytes32 ciphertext;
  }
  
  error ValueMismatch();
  event BatchSendExecuted(address indexed sender);

  constructor(address umbraAddr) {
    umbra = IUmbra(umbraAddr);
  }

  function batchSendEth(uint256 _tollCommitment, SendEth[] calldata _params) external payable {
    uint256 valueSentAccumulator = _valueSentAccumulator(_tollCommitment, _params);

    if(msg.value != valueSentAccumulator) revert ValueMismatch();
    _batchSendEth(_tollCommitment, _params);
    emit BatchSendExecuted(msg.sender);
  }

  function batchSendTokens(uint256 _tollCommitment, SendToken[] calldata _params) external payable {
    if(msg.value != _tollCommitment * _params.length) revert ValueMismatch();
    _batchSendTokens(_tollCommitment, _params);
    emit BatchSendExecuted(msg.sender);
  }

  function batchSend(
    uint256 _tollCommitment,
    SendEth[] calldata _ethParams,
    SendToken[] calldata _tokenParams
  ) external payable {
    uint256 valueSentAccumulator = _valueSentAccumulator(_tollCommitment, _ethParams);
    //ethParams sum(amount + toll) + tokenParams' total toll
    uint totalAmount = valueSentAccumulator + (_tollCommitment * _tokenParams.length);
    if(msg.value != totalAmount) revert ValueMismatch();

    _batchSendEth(_tollCommitment, _ethParams);
    _batchSendTokens(_tollCommitment, _tokenParams);
    emit BatchSendExecuted(msg.sender);
  }

  function _batchSendEth(uint256 _tollCommitment, SendEth[] calldata _params) internal {
    for (uint256 i = 0; i < _params.length; i++) {
      umbra.sendEth{value: _params[i].amount + _tollCommitment}(_params[i].receiver, _tollCommitment, _params[i].pkx, _params[i].ciphertext);
    }
  }

  function _batchSendTokens(uint256 _tollCommitment, SendToken[] calldata _params) internal {
    for (uint256 i = 0; i < _params.length; i++) {
      address _tokenAddr = _params[i].tokenAddr;
      IERC20 token = IERC20(address(_tokenAddr));

      SafeERC20.safeTransferFrom(token, msg.sender, address(this), _params[i].amount);

      if (token.allowance(address(this), address(umbra)) == 0) {
        SafeERC20.safeApprove(token, address(umbra), type(uint256).max);
      }

      umbra.sendToken{value: _tollCommitment}(
        _params[i].receiver,
        _params[i].tokenAddr,
        _params[i].amount,
        _params[i].pkx,
        _params[i].ciphertext
      );
    }
  }

  function _valueSentAccumulator(uint256 _tollCommitment, SendEth[] calldata _params) internal pure returns(uint256 valueSentAccumulator) {
    for (uint256 i = 0; i < _params.length; i++) {
      //amount to be sent per receiver
      valueSentAccumulator = valueSentAccumulator + _params[i].amount + _tollCommitment;
    }
  }

}
