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

contract UmbraRouter {
  address internal constant umbra = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;

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
    uint256 balance = msg.value;

    for (uint256 i = 0; i < _params.length; i++) {
      //amount to be sent per receiver
      uint256 _amount = _params[i].amount;
      require(balance >= _amount, "not enough msg.value");
      balance -= _amount;

      bytes memory data =
        abi.encodeWithSelector(
          IUmbra.sendEth.selector,
          _params[i].receiver,
          _tollCommitment,
          _params[i].pkx,
          _params[i].ciphertext
        );

      (bool success, ) = umbra.call{value: _amount}(data);
      require(success, "call failed");
    }
  }

  function batchSendTokens(uint256 _tollCommitment, SendToken[] calldata _params) public payable {
    for (uint256 i = 0; i < _params.length; i++) {
      uint256 _amount = _params[i].amount;
      address _tokenAddr = _params[i].tokenAddr;
      IERC20 token = IERC20(_tokenAddr);
      token.approve(address(this), type(uint256).max);

      // token.transferFrom(msg.sender, umbra, _amount);
      bytes memory data =
        abi.encodeWithSelector(
          IUmbra.sendToken.selector,
          _params[i].receiver,
          _params[i].tokenAddr,
          _amount,
          _params[i].pkx,
          _params[i].ciphertext
        );

      (bool success, ) = umbra.call{value: _tollCommitment}(data);
    }
  }

  function batchSend() external payable {}
}
