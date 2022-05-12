// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

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

  /// Option 3: dgrant way
  /// @dev Used for verifying transferSummary parameters
  mapping(IERC20 => uint256) internal transferOutputs;
 /// @dev Used for saving off contribution ratios for verifying input parameters
  mapping(address => uint256) internal transferTotal;
  /// @dev Scale factor on percentages when constructing `Donation` objects. One WAD represents 100%
  uint256 internal constant WAD = 1e18;

  /// Option 1: Original attempt
  mapping(address => uint256) internal totalPerToken;
  mapping(address => bool) internal tokenInArray;
  address[] internal tokenAddrs;

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

  struct TransferSummary {
    address tokenAddr;
    uint256 amount;
  }

  error ValueMismatch();
  event BatchSendExecuted(address indexed sender);

  constructor(IUmbra _umbra) {
    umbra = _umbra;
  }
  /// Option 1: Original attempt
    function receiveTokens(SendToken[] calldata _params) internal {
    for (uint256 i = 0; i < _params.length; i++) {
      address tokenAddr = _params[i].tokenAddr;

      if (tokenInArray[tokenAddr] == false) {
        tokenAddrs.push(tokenAddr);
        tokenInArray[tokenAddr] = true;
      }
      totalPerToken[tokenAddr] += _params[i].amount;
    }

    for (uint256 i = 0; i < tokenAddrs.length; i++) {
      if (tokenAddrs[i] != address(0)) {
        IERC20 token = IERC20(tokenAddrs[i]);
        //User needs to approve router address as spender first
        token.transferFrom(msg.sender, address(this), totalPerToken[tokenAddrs[i]]);

        delete tokenInArray[tokenAddrs[i]];
        delete totalPerToken[tokenAddrs[i]];
        delete tokenAddrs[i];
      }
    }
  }

  function batchSendTokensOption1(uint256 _tollCommitment, SendToken[] calldata _params) public payable {
    //Transfer msg.sender tokens to this contract before sending to Umbra.sol
    receiveTokens(_params);

    for (uint256 i = 0; i < _params.length; i++) {
      uint256 _amount = _params[i].amount;
      address _tokenAddr = _params[i].tokenAddr;
      IERC20 token = IERC20(address(_tokenAddr));

      if (token.allowance(address(this), address(umbra)) == 0) {
        token.approve(address(umbra), type(uint256).max);
      }

      umbra.sendToken{value: _tollCommitment}(
        _params[i].receiver,
        _params[i].tokenAddr,
        _amount,
        _params[i].pkx,
        _params[i].ciphertext
      );
    }
  }


  /// Option 3: dgrant way
  function newBatchSendTokens(uint256 _tollCommitment, SendToken[] calldata _params, TransferSummary[] calldata _summary) external payable {

    if(msg.value != _tollCommitment * _params.length) revert ValueMismatch();
    _sumBatchSendTokens(_params);
    _batchTransferTokens(_summary);
    _batchSendTokensToDestination(_tollCommitment, _params);

    // Clear storage
    for (uint256 i = 0; i < _params.length; i++) {
      transferTotal[_params[i].tokenAddr] = 0;
    }
    for (uint256 i = 0; i < _summary.length; i++) {
      IERC20 token = IERC20(address(_params[i].tokenAddr));
      transferOutputs[token] = 0;
    }
  }

  function _sumBatchSendTokens(SendToken[] calldata _params) internal {
    for (uint i = 0; i < _params.length; i++) {
      transferTotal[_params[i].tokenAddr] += _params[i].amount;
    }
  }

  function _batchTransferTokens(TransferSummary[] calldata _summary) internal {
    for (uint256 i = 0; i < _summary.length; i++) {
      IERC20 token = IERC20(address(_summary[i].tokenAddr));

      require(transferTotal[_summary[i].tokenAddr] == _summary[i].amount, "Amount mismatch");
      require(transferOutputs[token] == 0, "_summary parameter has duplicate input tokens");

      if (token.allowance(address(this), address(umbra)) == 0) {
      SafeERC20.safeApprove(token, address(umbra), type(uint256).max);
      }

      SafeERC20.safeTransferFrom(token, msg.sender, address(this), _summary[i].amount);
      transferOutputs[token] = _summary[i].amount;
    }
  }

  function _batchSendTokensToDestination(uint256 _tollCommitment, SendToken[] calldata _params) internal {
    for (uint256 i = 0; i < _params.length; i++) {
      umbra.sendToken{value: _tollCommitment}(
        _params[i].receiver,
        _params[i].tokenAddr,
        _params[i].amount,
        _params[i].pkx,
        _params[i].ciphertext
      );
    }
  }

  function batchSendEth(uint256 _tollCommitment, SendEth[] calldata _params) external payable {
    if(msg.value != _sumValueFromEthSends(_tollCommitment, _params)) revert ValueMismatch();
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
    uint256 _totalAmount = _sumValueFromEthSends(_tollCommitment, _ethParams) + (_tollCommitment * _tokenParams.length);
    if(msg.value != _totalAmount) revert ValueMismatch();

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
      IERC20 token = IERC20(address(_params[i].tokenAddr));

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

  function _sumValueFromEthSends(uint256 _tollCommitment, SendEth[] calldata _params) internal pure returns(uint256 valueSentAccumulator) {
    for (uint256 i = 0; i < _params.length; i++) {
      //amount to be sent per receiver
      valueSentAccumulator = valueSentAccumulator + _params[i].amount + _tollCommitment;
    }
  }

}
