// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

/// @title Deploy a contract to multiple networks.
/// @notice Run the script with `forge script Deploy --private-key <privateKey>`
/// and add `--broadcast` to broadcast the tx.
/// @dev The contract that's being deployed is specified in `BaseScript.sol`.

import {StdChains} from "forge-std/StdChains.sol";
import {BaseScript} from "script/BaseScript.sol";

contract Deploy is BaseScript {
  /// The list of networks to deploy to.
  string[] public networks = ["mainnet", "optimism", "arbitrum_one", "polygon", "goerli", "sepolia"];

  /// @notice Deploy the contract to the list of networks,
  /// Will run by default when executing the script.
  function run() public {
    /// Compute the address the contract will be deployed to
    address expectedContractAddress = computeCreateAddress(msg.sender, vm.getNonce(msg.sender));

    /// Turn off fallback to default RPC URLs since they can be flaky.
    setFallbackToDefaultRpcUrls(false);

    /// Check if the contract is already deployed on the network, if not, deploy it.
    for (uint256 i; i < networks.length; i++) {
      vm.createSelectFork(getChain(networks[i]).rpcUrl);
      bool isDeployed = address(expectedContractAddress).code.length > 0;
      if (!isDeployed) deploy();
    }
  }
}
