// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@opengsn/gsn/contracts/BasePaymaster.sol";
import "@opengsn/gsn/contracts/interfaces/GsnTypes.sol";

contract UmbraPaymaster is BasePaymaster {
  address public umbraAddr;

  constructor(address _umbraAddr) public {
    umbraAddr = _umbraAddr;
  }

  function versionPaymaster() external view override returns (string memory) {
    return "2.0.0";
  }

  function preRelayedCall(
    GsnTypes.RelayRequest calldata relayRequest,
    bytes calldata signature,
    bytes calldata approvalData,
    uint256 maxPossibleGas
  ) external override returns (bytes memory context, bool rejectOnRecipientRevert) {
    (signature, approvalData, maxPossibleGas); // to silence compiler warnings

    require(relayRequest.request.to == umbraAddr, "UmbraPaymaster: Not Target");
    return ("", true);
  }

  function postRelayedCall(
    bytes calldata context,
    bool success,
    uint256 gasUseWithoutPost,
    GsnTypes.RelayData calldata relayData
  ) external override relayHubOnly {
    (context, success, gasUseWithoutPost, relayData); // to silence compiler warnings
  }
}
