// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {IUmbra} from "src/interface/IUmbra.sol";

contract UmbraBatchSend is Ownable {
  using SafeERC20 for IERC20;

  IUmbra internal immutable UMBRA;

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
    UMBRA = _umbra;
  }

  function batchSendEth(uint256 _tollCommitment, SendEth[] calldata _params) external payable {
    _validateMsgValue(_tollCommitment, _params, new SendToken[](0));
    _batchSendEth(_tollCommitment, _params);
  }

  function batchSendTokens(
    uint256 _tollCommitment,
    SendToken[] calldata _params,
    TransferSummary[] calldata _transferSummary
  ) external payable {
    _validateMsgValue(_tollCommitment, new SendEth[](0), _params);
    _batchSendTokens(_tollCommitment, _params, _transferSummary);
  }

  function batchSend(
    uint256 _tollCommitment,
    SendEth[] calldata _ethParams,
    SendToken[] calldata _tokenParams,
    TransferSummary[] calldata _transferSummary
  ) external payable {
    _validateMsgValue(_tollCommitment, _ethParams, _tokenParams);
    _batchSendEth(_tollCommitment, _ethParams);
    _batchSendTokens(_tollCommitment, _tokenParams, _transferSummary);
    emit BatchSendExecuted(msg.sender);
  }

  function _batchSendEth(uint256 _tollCommitment, SendEth[] calldata _params) internal {
    uint256 _length = _params.length;
    for (uint256 i = 0; i < _length; i = _uncheckedIncrement(i)) {
      UMBRA.sendEth{value: _params[i].amount + _tollCommitment}(
        _params[i].receiver, _tollCommitment, _params[i].pkx, _params[i].ciphertext
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
      address _token = _transferSummary[i].tokenAddr;
      uint256 _amt = _transferSummary[i].amount;
      if (totalTransferAmountPerToken[_token] != _amt) revert TransferAmountMismatch();

      IERC20(_token).safeTransferFrom(msg.sender, address(this), _amt);
    }

    for (uint256 i = 0; i < _length; i = _uncheckedIncrement(i)) {
      UMBRA.sendToken{value: _tollCommitment}(
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

  function _validateMsgValue(
    uint256 _tollCommitment,
    SendEth[] memory _ethParams,
    SendToken[] memory _tokenParams
  ) internal view {
    uint256 _valueSentAccumulator;
    uint256 _length = _ethParams.length;
    for (uint256 i = 0; i < _length; i = _uncheckedIncrement(i)) {
      // Amount to be sent per receiver.
      _valueSentAccumulator += _ethParams[i].amount + _tollCommitment;
    }
    _valueSentAccumulator += _tollCommitment * _tokenParams.length;
    if (msg.value < _valueSentAccumulator) revert ValueMismatch();
  }

  /// @notice Whenever a new token is added to Umbra, this method must be called by the owner to
  /// support
  /// that token in this contract.
  function approveToken(IERC20 _token) external onlyOwner {
    _token.safeApprove(address(UMBRA), type(uint256).max);
  }

  function _uncheckedIncrement(uint256 i) internal pure returns (uint256) {
    unchecked {
      return i + 1;
    }
  }
}
