// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {StdChains} from "forge-std/StdChains.sol";
import {BaseScript} from "./BaseScript.sol";

contract Deploy is BaseScript {
  string[] public networks = ["mainnet", "optimism", "arbitrum_one", "polygon", "goerli", "sepolia"];

  function run(address expectedContractAddress) public {
    setFallbackToDefaultRpcUrls(false);
    for (uint256 i; i < networks.length; i++) {
      vm.createSelectFork(getChain(networks[i]).rpcUrl);
      bool isDeployed = address(expectedContractAddress).code.length > 0;
      if (!isDeployed) deploy();
    }
  }
}
