// SPDX-License-Identifier:MIT
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@opengsn/gsn/contracts/forwarder/IForwarder.sol";

/**
 * @title Umbra's dummy GSN Forwarder
 * @author ScopeLift
 * @dev This class stubs the the GSN forwarder interface, but does not actually carry out
 * any of the checks typically associated with a Trusted Forwarder in the GSN system.
 * Because the Umbra contract itself validates the signature, there is no value in doing
 * that check here. No other GSN enabled app should ever trust this forwarder.
 */
contract UmbraForwarder is IForwarder {
  using ECDSA for bytes32;

  // solhint-disable-next-line no-empty-blocks
  receive() external payable {}

  function getNonce(address from) public view override returns (uint256) {
    (from); // silence compiler warning
    return 0;
  }

  function verify(
    ForwardRequest memory req,
    bytes32 domainSeparator,
    bytes32 requestTypeHash,
    bytes calldata suffixData,
    bytes calldata sig
  ) external view override {
    // silence compiler warning
    (req, domainSeparator, requestTypeHash, suffixData, sig);
  }

  function execute(
    ForwardRequest memory req,
    bytes32 domainSeparator,
    bytes32 requestTypeHash,
    bytes calldata suffixData,
    bytes calldata sig
  ) external payable override returns (bool success, bytes memory ret) {
    // silence compiler warning
    (domainSeparator, requestTypeHash, suffixData, sig);

    // solhint-disable-next-line avoid-low-level-calls
    (success, ret) = req.to.call{gas: req.gas, value: req.value}(abi.encodePacked(req.data, req.from));
    if (address(this).balance > 0) {
      //can't fail: req.from signed (off-chain) the request, so it must be an EOA...
      payable(req.from).transfer(address(this).balance);
    }
    return (success, ret);
  }

  function registerRequestType(string calldata typeName, string calldata typeSuffix) external override {
    // silence compiler warning
    (typeName, typeSuffix);
  }

  function registerDomainSeparator(string calldata name, string calldata version) external override {
    // silence compiler warning
    (name, version);
  }
}
