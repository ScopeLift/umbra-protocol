// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {UmbraBatchSend} from "src/UmbraBatchSend.sol";
import {IUmbra} from "src/interface/IUmbra.sol";

/// @dev Deploys the UmbraBatchSend contract to all supported networks networks, skipping
/// networks that already have the contract
/// @dev Set EXPECTED_NONCE constant with the nonce of the deployer address,
/// which you can get using `cast nonce --rpc-url <url> <address>`
/// @dev Run the script with `forge script Deploy --private-key <privateKey>`
/// and add `--broadcast` to broadcast the tx. We *MUST* deploy using the `--private-key`
/// flag to ensure `msg.sender` is the deployer address, which is used to check the
/// nonce and compute the expected contract address.
/// @dev Specify additional network aliases in [rpc_endpoints] in `forge.toml`
/// before adding them to the list of networks below, and add corresponding environment
/// variables to the `.env` and `.env.template` files.
contract DeployBatchSend is Script {
  uint256 constant EXPECTED_NONCE = 0; // TODO Edit this with the nonce of the deployer address
  address constant UMBRA = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;
  // The list of networks to deploy to.
  string[] public networks = ["mainnet", "optimism", "arbitrum_one", "polygon", "goerli", "sepolia"];

  /// @notice Deploy the contract to the list of networks,
  function run() public {
    // Compute the address the contract will be deployed to
    address expectedContractAddress = computeCreateAddress(msg.sender, EXPECTED_NONCE);

    // Turn off fallback to default RPC URLs since they can be flaky.
    setFallbackToDefaultRpcUrls(false);

    // Check if the contract is already deployed on the network, if not, deploy it.
    for (uint256 i; i < networks.length; i++) {
      vm.createSelectFork(getChain(networks[i]).rpcUrl);
      bool isDeployed = address(expectedContractAddress).code.length > 0;

      if (isDeployed) {
        console2.log("Skipping '%s': contract already deployed", networks[i]);
        continue;
      }

      uint256 nonce = vm.getNonce(msg.sender);

      if (nonce > EXPECTED_NONCE) {
        console2.log(
          "Skipping '%s': current nonce %d > expected nonce %d", networks[i], nonce, EXPECTED_NONCE
        );
        continue;
      }

      if (nonce < EXPECTED_NONCE) {
        console2.log(
          "Skipping '%s': current nonce %d < expected nonce %d", networks[i], nonce, EXPECTED_NONCE
        );
        continue;
      }

      // Deploy the contract
      vm.broadcast();
      new UmbraBatchSend(IUmbra(UMBRA));
      console2.log("Deployed contract to '%s' at %s", networks[i], expectedContractAddress);
    }
  }
}
