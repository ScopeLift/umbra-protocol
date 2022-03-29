// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

contract UmbraRouter {
  address internal constant umbra = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;

  /**
   * @notice Batch send ETH and token payments to a stealth address
   * @param _receivers Stealth addresses receiving the payment
   * @param _tokenAddrs Addresses of the ERC20 tokens being sent
   * @param _tollCommitments Exact toll the sender is paying; should equal contract toll;
   * the committment is used to prevent frontrunning attacks by the owner;
   * see https://github.com/ScopeLift/umbra-protocol/issues/54 for more information
   * @param _pkxes X-coordinate of the ephemeral public key used to encrypt the payload
   * @param _ciphertexts Encrypted entropy (used to generated the stealth address) and payload extension
   */
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

        (bool success, bytes memory data) = umbra.delegatecall(payload);
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FAILED");
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
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FAILED");
      }
    }
  }
}
