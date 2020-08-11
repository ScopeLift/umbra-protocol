// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@opengsn/gsn/contracts/BasePaymaster.sol";


contract UmbraPaymaster is BasePaymaster {
  address public umbraAddr;

  constructor(address _umbraAddr) public {
    umbraAddr = _umbraAddr;
  }

  function versionPaymaster() external override view returns (string memory) {
    return "1.0.0";
  }

  function acceptRelayedCall(
    GSNTypes.RelayRequest calldata relayRequest,
    bytes calldata, // signature
    bytes calldata approvalData,
    uint256 maxPossibleGas
  ) external override view returns (bytes memory context) {
    (approvalData, maxPossibleGas); // avoid a warning

    require(relayRequest.target == umbraAddr, "UmbraPaymaster: Not Target");

    return abi.encode(0x0);
  }

  function preRelayedCall(bytes calldata /* context */) external override relayHubOnly returns (bytes32) {
    return bytes32(0);
  }

  function postRelayedCall(
    bytes calldata, // context
    bool success,
    bytes32 preRetVal,
    uint256 gasUse,
    GSNTypes.GasData calldata gasData
  ) external override relayHubOnly {
    (success, preRetVal, gasUse, gasData);
  }
}
