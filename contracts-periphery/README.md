# Umbra periphery contracts

Smart contracts that integrate with [Umbra](../README.md), but are not part of the [core protocol contracts](../contracts-core/).

## Contracts

Below is a list of contracts contained in this package:

- `UmbraBatchSend`: Aggregate multiple `Umbra` sends into a single transaction.
- `UniswapWithdrawHook`: A withdrawal hook that swaps withdrawn tokens through Uniswap's SwapRouter02 and sends any remaining tokens to the recipient.

## Development

This repo uses [Foundry](https://github.com/gakonst/foundry).

### How to use the DeployBatchSend Script

The script deploys `UmbraBatchSend` to each network in the `networks` array of `script/DeployBatchSend.s.sol`, using the RPC endpoints configured in `foundry.toml`.

1. Inside the `contracts-periphery` folder, run `cp .env.example .env` and fill out all fields.
2. Find the deployer's nonce:

   `cast nonce <DeployerAddress> --rpc-url <URL>`

3. Change `EXPECTED_NONCE` in the `DeployBatchSend` script to match that nonce.
4. Make sure the script test passes:

   `forge test --mc DeployBatchSendTest --sender <DeployerAddress>`

5. Dry run the deployment across the networks. You should see gas estimates for each network. If you don't, the deployer's nonce may not match `EXPECTED_NONCE`, or there may already be code at the expected contract address.

   `forge script DeployBatchSend --private-key <PrivateKey>`

6. Execute the deployment by broadcasting the transactions:

   `forge script DeployBatchSend --private-key <PrivateKey> --broadcast`

### How to use the ApproveBatchSendTokens Script

The script approves the Umbra contract to spend each listed token held by `UmbraBatchSend`. It must be run by the `UmbraBatchSend` owner.

1. Inside the `contracts-periphery` folder, run `cp .env.example .env` and fill out all fields.
2. Run `source .env` to load the environment variables.
3. Make sure the script test passes:

   `forge test --mc ApproveBatchSendTokensTest --sender <OwnerAddress>`

4. Dry run the script. Pass the owner's key in the `--private-key` flag and the desired network in the `--rpc-url` flag. The contract and token addresses must be the ones on that network.

   `forge script ApproveBatchSendTokens --sig "run(address,address,address,address[])" <OwnerAddress> <UmbraContractAddress> <UmbraBatchSendContractAddress> "[<TokenAddress>,<TokenAddress>]" --rpc-url $MAINNET_RPC_URL --private-key $PRIVATE_KEY`

5. Execute the script by adding the `--broadcast` flag:

   `forge script ApproveBatchSendTokens --sig "run(address,address,address,address[])" <OwnerAddress> <UmbraContractAddress> <UmbraBatchSendContractAddress> "[<TokenAddress>,<TokenAddress>]" --rpc-url $MAINNET_RPC_URL --private-key $PRIVATE_KEY --broadcast`
