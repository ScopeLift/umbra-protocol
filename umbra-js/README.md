# umbra-js

JavaScript library for interacting with the Umbra Protocol.

## Getting Started

Requirements for use:

- [ethers.js](https://docs.ethers.io/v5/single-page/) types are used throughout
- [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) support. See browser compatibility [here](https://caniuse.com/bigint)

Once verifying compatibility, install with `yarn add @umbracash/umbra-js`

## Overview

The umbra-js library aims to abstract away the math and cryptography required for using Umbra so it's easy to build on top of the Umbra protocol. Most documentation lives in the [FAQ](https://app.umbra.cash/faq), and the [Technical Details](https://app.umbra.cash/faq#technical-details) section provides a pretty thorough overview. Here we cover some of the documentation specific to umbra-js.

Below is an overview of the files within this library. If you like reading code to understand things, read in the order files are listed below. This will start from the full, big-picture view of how Umbra works then go into the details.

1. `src/classes/Umbra.ts`: The Umbra class is a high-level class intended for developers to directly interact with. It abstracts away the complexity of the protocol into a few main methods:
   1. `send()` is used to send funds to another user, and automatically handles the underlying cryptography required. Check out the code in this method to understand the required steps for sending funds via Umbra.
   1. `batchSend()` sends funds to multiple recipients in a single transaction using the `UmbraBatchSend` contract.
   1. `generatePrivateKeys()` prompts the user for a signature and generates their spending and viewing keys. _Note: make sure the wallet being used supports deterministic ECDSA signatures with [RFC 6979](https://tools.ietf.org/html/rfc6979)_
   1. `scan()` lets you find funds sent to the specified user, by providing just the user’s spending public key and viewing private key
   1. `withdraw()` lets a stealth address directly withdraw both tokens and ETH
   1. `withdrawOnBehalf()` uses meta-transactions to relay a withdraw transaction on behalf of another user, and the `signWithdraw()` method is used to get the required signature
2. `src/classes/KeyPair.ts`: This class is where the core cryptography logic lives. A KeyPair class is instantiated with either a private or public key, and the class methods help you perform various operations with those keys, including encryption/decryption, multiplication, and compression/decompression of public keys
3. `src/classes/RandomNumber.ts`: This simple class is used to generate our 32 byte random number
4. `src/classes/StealthKeyRegistry.ts`: This class simplifies interactions with the StealthKeyRegistry contract, where users publish their spending and viewing public keys
5. `src/classes/TxHistoryProvider.ts`: An Etherscan-backed provider used to find a transaction sent by an address, from which the address's public key can be recovered
6. `src/utils/utils.ts` contains various helper methods for a range of tasks, primarily related to getting a recipient’s public keys
7. `src/types.ts`: You’ll see a few custom types used throughout the library, which are all defined here

## Concepts

This section gives an overview of how different parts of Umbra work. When applicable, we link to the corresponding FAQ question on the Umbra website which may provide additional information.

For an introduction and background on elliptic curve cryptography, see the references below:

- [A (Relatively Easy To Understand) Primer on Elliptic Curve Cryptography](https://blog.cloudflare.com/a-relatively-easy-to-understand-primer-on-elliptic-curve-cryptography/)
- [Elliptic Curve Cryptography: a gentle introduction - Andrea Corbellini](https://andrea.corbellini.name/2015/05/17/elliptic-curve-cryptography-a-gentle-introduction/) (This is part one of four part series. All four parts are recommended)

### Sending and Receiving ETH vs. Tokens

When ETH is sent, it's transferred directly to the recipient's stealth address, but when tokens are sent they are held by the contract until the recipient withdraws them. ETH is always needed to send the transaction required to move funds, so sending ETH directly to a stealth address provides no issues and funds can easily be transferred out of the stealth address to another address.

But sending tokens directly to a stealth address would pose some difficulties. The stealth address would have no ETH to pay for the transaction to transfer the tokens, and getting ETH into the address without compromising privacy is its own challenge. The easiest and cheapest solution to this issue is to have tokens instead held by the contract, and support withdrawal of the tokens using meta-transactions that only require a signature from the stealth address. This lets the recipient pay the gas fee for the withdrawal transaction in tokens, and the relayer will pay the ETH fee

### Private Key Generation

Umbra is based on elliptic curve math, and needs access to a user's private key to perform mathematical operations on it. For security reasons, wallets of course will not provide an app with the user's private key, and asking the user to input their private key into a form is a security risk and bad UX. Similarly, randomly generating a private key on the user's first visit requires them to backup a new key, and this is also bad UX.

Instead, Umbra uses an approach similar to zkSync, Loopring, Aztec, and StarkWare to generate app-specific private keys. We ask the user to sign a message, and use the hash of the signature to generate private keys. The corresponding public keys are what users would use to send you funds. On networks other than mainnet, the signed message also includes the chain ID to prevent replay attacks across networks.

Since Umbra supports separate spending and viewing keys (see below), the `r` and `s` components of the signature are hashed separately to generate the two private keys.

### Spending and Viewing Keys

Borrowing the [nomenclature](https://electriccoin.co/blog/explaining-viewing-keys/) from Zcash, Umbra allows, but does not require, users to use different private keys for the "encrypt random number" and “compute stealth address” steps. This is the default behavior of the Umbra app, but it can be overridden by using Advanced Mode.

This allows users to give their viewing key to third party scanning services that can alert them of received funds, but without giving those services access to their funds.

The corresponding FAQ question can be found [here](https://app.umbra.cash/faq#what-are-spending-and-viewing-keys).

### Hooks

If you’re familiar with [ERC-777](https://eips.ethereum.org/EIPS/eip-777) or other similar standards, you are already familiar with the concept of hooks. Hooks let the caller perform other actions in addition to the core logic of the method being called. In the case of ERC-777, a transfer hook can be used to call a method on a contract after transferring tokens to that contract.

Umbra works similarly&mdash;when withdrawing funds from the contract, users might want to deposit them straight into a DeFi protocol or swap their DAI for ETH. Hooks let you do this. See the corresponding [FAQ question](https://app.umbra.cash/faq#what-are-hooks-and-how-do-i-use-them) and the implementation in `Umbra.sol` for more information on how to use hooks.

## Usage Example

To send funds to a recipient via Umbra, follow the steps in the code snippet below:

```typescript
import { parseUnits } from "@ethersproject/units";

import { Umbra } from "@umbracash/umbra-js";
import { signer } from "the/users/connected/wallet"; // assume user previously connected wallet and has signer

// Define the special address the Umbra contract uses to represent ETH
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// Define the send parameters
const recipientId = "msolomon.eth";
const amount = parseUnits("1", 18); // sending 1 ETH
const tokenAddress = ETH_ADDRESS; // we're sending ETH

// Get token approvals if necessary
if (tokenAddress !== ETH_ADDRESS) {
  // check allowance, and if allowance is insufficient, request approval transaction
}

// Send the transaction. An optional fifth parameter can override values such as the gas limit or gas price
const provider = signer.provider;
const umbra = new Umbra(provider, provider.network.chainId);
const { tx, stealthKeyPair } = await umbra.send(
  signer,
  tokenAddress,
  amount,
  recipientId
);
await tx.wait(); // transaction mined
// stealthKeyPair.address gives the address funds were sent to
```

To scan for received funds, follow the steps in the code snippet below:

```typescript
import { Umbra } from "@umbracash/umbra-js";
import { signer } from "the/users/connected/wallet"; // assume user previously connected wallet and has signer

// Configure Umbra class
const provider = signer.provider;
const umbra = new Umbra(provider, provider.network.chainId);

// Prompt the user for their signature to get their private keys
const { spendingKeyPair, viewingKeyPair } = await umbra.generatePrivateKeys(
  signer
);

// Define a custom range of blocks to scan. Leave this parameter out to scan all blocks
const startBlock = 18000000;
const endBlock = 18100000;
const overrides = { startBlock, endBlock };

// Scan for funds
const spendingPublicKey = spendingKeyPair.publicKeyHex;
const viewingPrivateKey = viewingKeyPair.privateKeyHex;
const { userAnnouncements } = await umbra.scan(
  spendingPublicKey,
  viewingPrivateKey,
  overrides
);
// Right now userAnnouncements is the only thing returned, but it's returned as an object to
// allow additional return values in the future without breaking existing implementations
```

To withdraw funds, follow the steps in the code snippet below:

```typescript
import { Umbra } from "@umbracash/umbra-js";
import { signer } from "the/users/connected/wallet"; // assume user previously connected wallet and has signer

// Define the special address the Umbra contract uses to represent ETH
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// Configure Umbra class
const provider = signer.provider;
const chainId = provider.network.chainId;
const umbra = new Umbra(provider, chainId);

// Prompt the user for their signature to get their private keys
const { spendingKeyPair } = await umbra.generatePrivateKeys(signer);

// Let's assume we're working with the first announcement outputs from the above snippet
const announcement = userAnnouncements[0];
const { randomNumber, token: tokenAddress } = announcement; // token gives the token address

// Define address to withdraw funds to (don't use the zero address in real life)
const destinationAddress = "0x0000000000000000000000000000000000000000";

// Get the stealth private key needed for withdrawal
const stealthKeyPair = spendingKeyPair.mulPrivateKey(randomNumber);
const stealthPrivateKey = stealthKeyPair.privateKeyHex;

// Handle withdraw based on token address
if (tokenAddress === ETH_ADDRESS) {
  // Handle ETH withdrawal
  const tx = await umbra.withdraw(
    stealthPrivateKey,
    tokenAddress,
    destinationAddress
  );
} else {
  // Define the sponsor address (who is relaying the transaction) and the fee they'll get
  const sponsor = "0xAddressOfYourRelayer";
  const sponsorFee = "123";

  // Get a users signature to relay the withdrawal
  const { v, r, s } = await Umbra.signWithdraw(
    stealthPrivateKey,
    chainId,
    umbra.chainConfig.umbraAddress,
    destinationAddress,
    tokenAddress,
    sponsor,
    sponsorFee
  );

  // Relay the transaction
  // Assume your app defines a signer called mySigner that sends the relay transaction
  const tx = await umbra.withdrawOnBehalf(
    mySigner,
    stealthKeyPair.address,
    destinationAddress,
    tokenAddress,
    sponsor,
    sponsorFee,
    v,
    r,
    s
  );
}
```

## API Reference

For a full API reference, navigate to the `umbra-js` folder in your terminal and run `yarn docs`. Open
the resulting `umbra-js/docs/index.html` file in your browser to view the documentation.

## Development

1. Copy the `.env.example` to `.env` and populate it with your own configuration parameters.

```bash
cp .env.example .env
```

2. Run `yarn` to install packages
3. Run `yarn test` to run all tests.
