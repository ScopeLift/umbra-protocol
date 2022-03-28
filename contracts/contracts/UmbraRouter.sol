// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

contract BatchSend {
  address internal constant umbra = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;

  function batchSend(
    address payable[] calldata _receivers,
    address[] calldata _tokenAddrs,
    uint256[] calldata _amounts,
    uint256[] calldata _tollCommitments,
    bytes32[] calldata _pkxes,
    bytes32[] calldata _ciphertexts
  ) external payable {
    bytes memory payload;

    for (uint256 i = 0; i < _receivers.length; i++) {
      if (_tokenAddrs[i] == address(0x0)) {
        payload = abi.encodeWithSignature(
          "sendEth(address,uint256,bytes32,bytes32)",
          _receivers[i],
          _tollCommitments[i],
          _pkxes[i],
          _ciphertexts[i]
        );

        umbra.delegatecall(payload);
      } else {
        payload = abi.encodeWithSignature(
          "sendToken(address,address,uint256,bytes32, bytes32)",
          _receivers[i],
          _tokenAddrs[i],
          _amounts[i],
          _pkxes[i],
          _ciphertexts[i]
        );

        umbra.delegatecall(payload);
      }
    }
  }
}
