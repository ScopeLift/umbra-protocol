// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

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

  function batchSendEth(uint256 _tollCommitment, SendEth[] calldata _params) external payable {
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

  function batchSend(
    address payable[] calldata _receivers,
    address[] calldata _tokenAddrs,
    uint256[] calldata _amounts,
    uint256[] calldata _tollCommitments,
    bytes32[] calldata _pkxes,
    bytes32[] calldata _ciphertexts
  ) external payable {
    bytes memory payload;
    uint256 ethBalance = msg.value;

    for (uint256 i = 0; i < _receivers.length; i++) {
      if (_tokenAddrs[i] == address(0x0)) {
        payload = abi.encodeWithSignature(
          "sendEth(address,uint256,bytes32,bytes32)",
          _receivers[i],
          _tollCommitments[i],
          _pkxes[i],
          _ciphertexts[i]
        );
        uint256 amount = _amounts[i];
        require(ethBalance >= amount);
        ethBalance -= amount;

        (bool success, bytes memory data) = umbra.call{value: amount}(payload);
        require(success, "umbra delegate call failed");
      } else {
        payload = abi.encodeWithSignature(
          "sendToken(address,address,uint256,bytes32,bytes32)",
          _receivers[i],
          _tokenAddrs[i],
          _amounts[i],
          _pkxes[i],
          _ciphertexts[i]
        );

        (bool success, bytes memory data) = umbra.delegatecall(payload);
        require(success && (data.length == 0 || abi.decode(data, (bool))), "DELEGATECALL_FAILED");
      }
    }
  }
}
