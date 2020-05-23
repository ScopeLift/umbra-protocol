# Umbra Contracts

On chain components of the [Umbra protocol](../README.md).

## Development

### Requirements

Contract development uses the OpenZeppelin tools and test framework. All are installed and exercised via `npm`. Development has been tested with:

* node.js v12.16.1 or later
* npm 6.13.4 or later

### Usage

From the current working directory, run `npm install`. Afterwards run:

* `npm run compile` — To compile all contracts
* `npm run test` — To run all tests

To deploy to Ropsten, you'll need to create a `.env` file with the following:

```
INFURA_ID="Your Infura API Key"
ROPSTEN_MNEMONIC="Your Ropsten address mnemonic"
```

Then run `npx oz deploy` and follow the prompts.