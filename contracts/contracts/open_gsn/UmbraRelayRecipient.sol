// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import "@opengsn/gsn/contracts/BaseRelayRecipient.sol";
import "@opengsn/gsn/contracts/interfaces/IKnowForwarderAddress.sol";
import "@opengsn/gsn/contracts/interfaces/IRelayHub.sol";

interface IUmbra {
  function withdrawMeta(
    address _stealthAddr,
    address _sponsor,
    address _acceptor,
    uint256 _sponsorFee,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external;
}

contract UmbraRelayRecipient is BaseRelayRecipient, IKnowForwarderAddress {
  IUmbra public umbra;

  constructor(address _umbraAddr, address _forwarder) public {
    umbra = IUmbra(_umbraAddr);
    trustedForwarder = _forwarder;
  }

  function withdrawMeta(
    address _stealthAddr,
    address _sponsor,
    address _acceptor,
    uint256 _sponsorFee,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external {
    umbra.withdrawMeta(_stealthAddr, _sponsor, _acceptor, _sponsorFee, _v, _r, _s);
  }

  function getTrustedForwarder() external view override returns (address) {
    return trustedForwarder;
  }

  function versionRecipient() external view override returns (string memory) {
    return "1.0.0";
  }

  function _msgSender() internal view override(BaseRelayRecipient) returns (address payable) {
    return BaseRelayRecipient._msgSender();
  }
}
