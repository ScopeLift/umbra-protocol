# Umbra contracts

On-chain components of the [Umbra protocol](../README.md).

## Development

This dev toolchain is based on @PaulRBerg's [hardhat-template](https://github.com/PaulRBerg/hardhat-template) repo and includes:

- [Hardhat](https://github.com/NomicFoundation/hardhat): compile and run the smart contracts on a local development network
- [TypeChain](https://github.com/dethcrypto/TypeChain): generate TypeScript types for smart contracts
- [Ethers](https://github.com/ethers-io/ethers.js/): renowned Ethereum library and wallet implementation
- [Waffle](https://github.com/TrueFiEng/Waffle): tooling for writing comprehensive smart contract tests
- [Solhint](https://github.com/protofire/solhint): linter
- [Prettier Plugin Solidity](https://github.com/prettier-solidity/prettier-plugin-solidity): code formatter

## Usage

### Prerequisites

Before running any command, make sure to install dependencies:

```sh
$ yarn install
```

### Build

Compile the smart contracts with Hardhat and generate the TypeChain bindings in `typechain/`:

```sh
$ yarn build
```

### Lint

Run Solhint, ESLint, and the Prettier check:

```sh
$ yarn lint
```

Apply available fixes and formatting, then rerun the checks:

```sh
$ yarn lint:fix
```

To run a single linter, use `yarn lint:sol` for Solhint or `yarn lint:ts` for ESLint.

### Format

Format the code with Prettier:

```sh
$ yarn prettier
```

### Test

Run the Mocha tests:

```sh
$ yarn test
```

Run the tests with a gas report:

```sh
$ yarn test:gas
```

### Deploy

Deploy the Umbra and StealthKeyRegistry contracts to a network defined in `hardhat.config.ts`, using the account derived from `MNEMONIC` in `.env`. Deployment records are saved to `deploy-history/`:

```sh
$ yarn deploy --network <network>
```

To deploy only the StealthKeyRegistry:

```sh
$ yarn deploy:registry --network <network>
```

### Clean

Delete the smart contract artifacts, the TypeChain bindings and the Hardhat cache:

```sh
$ yarn clean
```
