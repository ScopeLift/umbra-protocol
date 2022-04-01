// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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
  IUmbra internal constant umbra = IUmbra(0xFb2dc580Eed955B528407b4d36FfaFe3da685401);

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

  function batchSendEth(uint256 _tollCommitment, SendEth[] calldata _params) public payable {
    uint256 valAccumulator;

    for (uint256 i = 0; i < _params.length; i++) {
      //amount to be sent per receiver
      uint256 _amount = _params[i].amount;
      valAccumulator += _amount;

      umbra.sendEth{value: _amount}(_params[i].receiver, _tollCommitment, _params[i].pkx, _params[i].ciphertext);
    }

    require(msg.value == valAccumulator, "value mismatch");
  }

  function batchSendTokens(uint256 _tollCommitment, SendToken[] calldata _params) public payable {

    for (uint256 i = 0; i < _params.length; i++) {
      uint256 _amount = _params[i].amount;
      address _tokenAddr = _params[i].tokenAddr;
      IERC20 token = IERC20(address(_tokenAddr));

      token.transferFrom(msg.sender, address(this), _amount);

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

  function batchSend(
    uint256 _tollCommitment,
    SendEth[] calldata _ethParams,
    SendToken[] calldata _tokenParams
  ) external payable {
    batchSendEth(_tollCommitment, _ethParams);
    batchSendTokens(_tollCommitment, _tokenParams);
  }
}
