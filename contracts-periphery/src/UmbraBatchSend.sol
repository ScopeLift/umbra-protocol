// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {IUmbra} from "src/interface/IUmbra.sol";

contract UmbraBatchSend is Ownable {
  using SafeERC20 for IERC20;

  address internal constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
  IUmbra internal immutable UMBRA;

  struct SendData {
    address receiver; // Stealth address.
    address tokenAddr; // Use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for chain's native asset.
    uint256 amount; // Amount of the token to send, excluding the toll.
    bytes32 pkx; // Ephemeral public key x coordinate.
    bytes32 ciphertext; // Encrypted entropy.
  }

  mapping(address => uint256) internal totalTransferAmountPerToken;

  struct TransferSummary {
    uint256 amount;
    address tokenAddr;
  }

  error NotSorted();
  error TooMuchEthSent();

  event BatchSendExecuted(address indexed sender);

  constructor(IUmbra _umbra) {
    UMBRA = _umbra;
  }

  /// @notice Batch send ETH and tokens via Umbra.
  /// @param _tollCommitment The toll commitment to use for all payments.
  /// @param _data Array of SendData structs, each containing the data for a single payment.
  /// Must be sorted by token address, with 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE used as
  /// the token address for the chain's native asset.
  function batchSend(uint256 _tollCommitment, SendData[] calldata _data) external payable {
    uint256 _initEthBalance = address(this).balance; // Includes ETH from msg.value.

    // First we pull the required token amounts into this contract.
    uint256 _len = _data.length;
    uint256 _index;
    address _currentToken;

    while (_index < _len) {
      uint256 _amount;

      if (_data[_index].tokenAddr < _currentToken) revert NotSorted();
      _currentToken = _data[_index].tokenAddr;

      do {
        _amount += _data[_index].amount;
        _index = _uncheckedIncrement(_index);
      } while (_index < _len && _data[_index].tokenAddr == _currentToken);

      _pullToken(_currentToken, _amount);
    }

    // Next we send the payments.
    for (uint256 i = 0; i < _len; i = _uncheckedIncrement(i)) {
      if (_data[i].tokenAddr == ETH) {
        UMBRA.sendEth{value: _data[i].amount + _tollCommitment}(
          payable(_data[i].receiver), _tollCommitment, _data[i].pkx, _data[i].ciphertext
        );
      } else {
        UMBRA.sendToken{value: _tollCommitment}(
          _data[i].receiver, _data[i].tokenAddr, _data[i].amount, _data[i].pkx, _data[i].ciphertext
        );
      }
    }

    // If excess ETH was sent, revert.
    if (address(this).balance != _initEthBalance - msg.value) revert TooMuchEthSent();
  }

  function _pullToken(address _tokenAddr, uint256 _amount) internal {
    if (_tokenAddr != ETH) IERC20(_tokenAddr).safeTransferFrom(msg.sender, address(this), _amount);
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
