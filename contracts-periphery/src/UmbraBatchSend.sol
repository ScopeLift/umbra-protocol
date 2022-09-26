// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "openzeppelin-contracts/access/Ownable.sol";
import "openzeppelin-contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import "src/interface/IUmbra.sol";

contract UmbraBatchSend is Ownable {
  using SafeERC20 for IERC20;
  IUmbra internal immutable umbra;

  /// @param amount Amount of ETH to send per address excluding the toll
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

  mapping(address => uint256) internal totalTransferAmountPerToken;
  struct TransferSummary {
    uint256 amount;
    address tokenAddr;
  }

  error ValueMismatch();
  error TransferAmountMismatch();
  event BatchSendExecuted(address indexed sender);

  constructor(IUmbra _umbra) {
    umbra = _umbra;
  }

  function batchSendEth(uint256 _tollCommitment, SendEth[] calldata _params) external payable {
    _checkValueFromSends(msg.value, _tollCommitment, _params, new SendToken[](0));
    _batchSendEth(_tollCommitment, _params);
  }

  function batchSendTokens(
    uint256 _tollCommitment,
    SendToken[] calldata _params,
    TransferSummary[] calldata _transferSummary
  ) external payable {
    _checkValueFromSends(msg.value, _tollCommitment, new SendEth[](0), _params);
    _batchSendTokens(_tollCommitment, _params, _transferSummary);
  }

  function batchSend(
    uint256 _tollCommitment,
    SendEth[] calldata _ethParams,
    SendToken[] calldata _tokenParams,
    TransferSummary[] calldata _transferSummary
  ) external payable {
    _checkValueFromSends(msg.value, _tollCommitment, _ethParams, _tokenParams);
    _batchSendEth(_tollCommitment, _ethParams);
    _batchSendTokens(_tollCommitment, _tokenParams, _transferSummary);
    emit BatchSendExecuted(msg.sender);
  }

  function _batchSendEth(uint256 _tollCommitment, SendEth[] calldata _params) internal {
    uint256 _length = _params.length;
    for (uint256 i = 0; i < _length; i = _uncheckedIncrement(i)) {
      umbra.sendEth{value: _params[i].amount + _tollCommitment}(
        _params[i].receiver,
        _tollCommitment,
        _params[i].pkx,
        _params[i].ciphertext
      );
    }
    emit BatchSendExecuted(msg.sender);
  }

  function _batchSendTokens(
    uint256 _tollCommitment,
    SendToken[] calldata _params,
    TransferSummary[] calldata _transferSummary
  ) internal {

    uint256 _length = _params.length;
    for (uint256 i = 0; i < _length; i = _uncheckedIncrement(i)) {
      // Used later to validate total amounts are correctly provided
      totalTransferAmountPerToken[_params[i].tokenAddr] += _params[i].amount;
    }

    uint256 _summaryLength = _transferSummary.length;
    for (uint256 i = 0; i < _summaryLength; i = _uncheckedIncrement(i)) {
      IERC20 _token = IERC20(address(_transferSummary[i].tokenAddr));

      if (totalTransferAmountPerToken[_transferSummary[i].tokenAddr] != _transferSummary[i].amount) {
        revert TransferAmountMismatch();
      }

      IERC20(_token).safeTransferFrom(msg.sender, address(this), _transferSummary[i].amount);
    }

    for (uint256 i = 0; i < _length; i = _uncheckedIncrement(i)) {
      umbra.sendToken{value: _tollCommitment}(
        _params[i].receiver,
        _params[i].tokenAddr,
        _params[i].amount,
        _params[i].pkx,
        _params[i].ciphertext
      );
    }

    for (uint256 i = 0; i < _summaryLength; i = _uncheckedIncrement(i)) {
      totalTransferAmountPerToken[_transferSummary[i].tokenAddr] = 0;
    }
    emit BatchSendExecuted(msg.sender);
  }

  function _checkValueFromSends(uint256 _value, uint256 _tollCommitment, SendEth[] memory _ethParams, SendToken[] memory _tokenParams)
    internal
    pure
  {
    uint256 _valueSentAccumulator;
    uint256 _length = _ethParams.length;
    for (uint256 i = 0; i < _length; i = _uncheckedIncrement(i)) {
      //amount to be sent per receiver
      _valueSentAccumulator = _valueSentAccumulator + _ethParams[i].amount + _tollCommitment;
    }
    _valueSentAccumulator += _tollCommitment * _tokenParams.length;
    if(_value < _valueSentAccumulator) revert ValueMismatch();
  }

  /// @notice Whenever a new token is added to Umbra, this method must be called by the owner to support
  /// that token in this contract.
  function approveToken(IERC20 _token) external onlyOwner {
    _token.safeApprove(address(umbra), type(uint256).max);
  }

  function _uncheckedIncrement(uint256 i) internal pure returns (uint256) {
    unchecked { return i + 1; }
  }
}
