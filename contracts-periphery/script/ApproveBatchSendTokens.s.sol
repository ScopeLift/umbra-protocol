// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {Script} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {UmbraBatchSend} from "src/UmbraBatchSend.sol";

contract ApproveBatchSendTokens is Script {
  function run(
    address _umbraContractAddress,
    address _batchSendContractAddress,
    address[] calldata _tokenAddressesToApprove
  ) public {
    vm.startBroadcast();
    for (uint256 _i = 0; _i < _tokenAddressesToApprove.length; _i++) {
      uint256 _currentAllowance = IERC20(_tokenAddressesToApprove[_i]).allowance(
        _batchSendContractAddress, _umbraContractAddress
      );
      if (_currentAllowance == 0) {
        UmbraBatchSend(_batchSendContractAddress).approveToken(IERC20(_tokenAddressesToApprove[_i]));
      }
    }
    vm.stopBroadcast();
  }
}
