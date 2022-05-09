# Umbra periphery contracts

Smart contracts that integrate with [Umbra](../README.md), but are not part of the [core protocol contracts](../contracts-core/).

## Development

This dev toolchain includes:
- [Foundry](https://github.com/gakonst/foundry): compile and test smart contracts 

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

### Clean

Delete the smart contract artifacts:

```sh
$ make clean
```

### Gas-snapshot

Create gas snapshot:

```sh
$ make snapshot
```