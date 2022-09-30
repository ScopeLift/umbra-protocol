// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {IUmbra} from "src/interface/IUmbra.sol";

contract UmbraBatchSend is Ownable {
  using SafeERC20 for IERC20;

  IUmbra internal immutable umbra;

  /// @param amount Amount of ETH to send per address excluding the toll
  struct SendEth {
    address payable receiver;
    uint amount;
    bytes32 pkx;
    bytes32 ciphertext;
  }

  struct SendToken {
    address receiver;
    address tokenAddr;
    uint amount;
    bytes32 pkx;
    bytes32 ciphertext;
  }

  mapping(address => uint) internal totalTransferAmountPerToken;

  struct TransferSummary {
    uint amount;
    address tokenAddr;
  }

  error ValueMismatch();
  error TransferAmountMismatch();

  event BatchSendExecuted(address indexed sender);

  constructor(IUmbra _umbra) {
    umbra = _umbra;
  }

  function batchSendEth(uint _tollCommitment, SendEth[] calldata _params)
    external
    payable
  {
    _validateMsgValue(_tollCommitment, _params, new SendToken[](0));
    _batchSendEth(_tollCommitment, _params);
  }

  function batchSendTokens(
    uint _tollCommitment,
    SendToken[] calldata _params,
    TransferSummary[] calldata _transferSummary
  ) external payable {
    _validateMsgValue(_tollCommitment, new SendEth[](0), _params);
    _batchSendTokens(_tollCommitment, _params, _transferSummary);
  }

  function batchSend(
    uint _tollCommitment,
    SendEth[] calldata _ethParams,
    SendToken[] calldata _tokenParams,
    TransferSummary[] calldata _transferSummary
  ) external payable {
    _validateMsgValue(_tollCommitment, _ethParams, _tokenParams);
    _batchSendEth(_tollCommitment, _ethParams);
    _batchSendTokens(_tollCommitment, _tokenParams, _transferSummary);
    emit BatchSendExecuted(msg.sender);
  }

  function _batchSendEth(uint _tollCommitment, SendEth[] calldata _params)
    internal
  {
    uint _length = _params.length;
    for (uint i = 0; i < _length; i = _uncheckedIncrement(i)) {
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
    uint _tollCommitment,
    SendToken[] calldata _params,
    TransferSummary[] calldata _transferSummary
  ) internal {
    uint _length = _params.length;
    for (uint i = 0; i < _length; i = _uncheckedIncrement(i)) {
      // Used later to validate total amounts are correctly provided
      totalTransferAmountPerToken[_params[i].tokenAddr] += _params[i].amount;
    }

    uint _summaryLength = _transferSummary.length;
    for (uint i = 0; i < _summaryLength; i = _uncheckedIncrement(i)) {
      address _token = _transferSummary[i].tokenAddr;
      uint _amt = _transferSummary[i].amount;
      if (totalTransferAmountPerToken[_token] != _amt) {
        revert TransferAmountMismatch();
      }

      IERC20(_token).safeTransferFrom(msg.sender, address(this), _amt);
    }

    for (uint i = 0; i < _length; i = _uncheckedIncrement(i)) {
      umbra.sendToken{value: _tollCommitment}(
        _params[i].receiver,
        _params[i].tokenAddr,
        _params[i].amount,
        _params[i].pkx,
        _params[i].ciphertext
      );
    }

    for (uint i = 0; i < _summaryLength; i = _uncheckedIncrement(i)) {
      totalTransferAmountPerToken[_transferSummary[i].tokenAddr] = 0;
    }
    emit BatchSendExecuted(msg.sender);
  }

  function _validateMsgValue(
    uint _tollCommitment,
    SendEth[] memory _ethParams,
    SendToken[] memory _tokenParams
  ) internal view {
    uint _valueSentAccumulator;
    uint _length = _ethParams.length;
    for (uint i = 0; i < _length; i = _uncheckedIncrement(i)) {
      // Amount to be sent per receiver.
      _valueSentAccumulator += _ethParams[i].amount + _tollCommitment;
    }
    _valueSentAccumulator += _tollCommitment * _tokenParams.length;
    if (msg.value < _valueSentAccumulator) revert ValueMismatch();
  }

  /// @notice Whenever a new token is added to Umbra, this method must be called by the owner to support
  /// that token in this contract.
  function approveToken(IERC20 _token) external onlyOwner {
    _token.safeApprove(address(umbra), type(uint).max);
  }

  function _uncheckedIncrement(uint i) internal pure returns (uint) {
    unchecked {
      return i + 1;
    }
  }
}
