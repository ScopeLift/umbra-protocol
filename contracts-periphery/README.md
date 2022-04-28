# Umbra periphery contracts

Smart contracts that integrate with [Umbra](../README.md), but are not part of the [core protocol contracts](../contracts-core/).

## Contracts
```UmbraBatchSend.sol```: Aggregate multiple ```Umbra.sol``` send transactions into one.

## Development

This dev toolchain includes:
- [Foundry](https://github.com/gakonst/foundry): Compile and test smart contracts 

## Usage

### Pre Requisites

Before running any command, make sure to install dependencies

```sh
$ make install
```

### Compile

Compile the smart contracts with Foundry:

```sh
$ make build
```

### Test

Run Foundry tests:

```sh
$ make test
```
