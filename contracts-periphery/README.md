# Umbra periphery contracts

On chain components of the [Umbra protocol](../README.md).

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