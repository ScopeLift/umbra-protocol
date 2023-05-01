// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {Script} from "forge-std/Script.sol";
import {StdChains} from "forge-std/StdChains.sol";
import {UmbraBatchSend} from "src/UmbraBatchSend.sol";
import {IUmbra} from "src/interface/IUmbra.sol";

contract Deploy is Script {
  address constant UMBRA = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;

  function deploy() internal {
    vm.broadcast();
    new UmbraBatchSend(IUmbra(UMBRA));
  }
}

contract ScriptBase is Deploy {
  string[] public networks = ["mainnet", "optimism", "arbitrum_one", "polygon", "goerli", "sepolia"];

  function run(address expectedContractAddress) public {
    for (uint256 i; i < networks.length; i++) {
      setFallbackToDefaultRpcUrls(false);
      vm.createSelectFork(getChain(networks[i]).rpcUrl);
      bool isDeployed = address(expectedContractAddress).code.length > 0;
      if (!isDeployed) deploy();
    }
  }
}
