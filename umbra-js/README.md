# umbra-js

JavaScipt library for interacting with the Umbra Protocol

## Usage

Install the package with `npm install umbra-js` or `yarn add umbra-js`.

```javascript
const ethers = require("ethers");
const umbra = require("umbra-js");

// utils and ens are not used below, but their APIs can be found in utils.js and ens.js
const { RandomNumber, KeyPair, utils, ens } = umbra;

// Setup ----------------------------------------------------------------------
// Generate a random wallet to simulate the recipient
wallet = ethers.Wallet.createRandom();

// Sender ---------------------------------------------------------------------
// Get a random 32-byte number
const randomNumber = new RandomNumber();

// Generate a KeyPair instance from recipient's public key
const recipientFromPublic = new KeyPair(wallet.publicKey);

// Multiply public key by the random number to get a new KeyPair instance
const stealthFromPublic = recipientFromPublic.mulPublicKey(randomNumber);

// Send fund's to the recipient's stealth receiving address
console.log("Stealth recipient address: ", stealthFromPublic.address);

// Recipient ------------------------------------------------------------------
// Generate a KeyPair instance based on their own private key
const recipientFromPrivate = new KeyPair(wallet.privateKey);

// Multiply their private key by the random number to get a new KeyPair instance
const stealthFromPrivate = recipientFromPrivate.mulPrivateKey(randomNumber);

// Access funds and confirm addresses match
console.log(stealthFromPublic.address === stealthFromPrivate.address); // true
console.log(
  "Private key to access received funds: ",
  stealthFromPrivate.privateKeyHex
);
```

Note that a `KeyPair` instance can be created from a public key, private key, or
transaction hash.

- For private keys, enter the full 66 character key as shown above.
- For public keys, enter the full 132 character key as shown above.
- For transaction hashes, instead of using the `new` keyword we call a static
  asynchronous method on the `KeyPair` class, which is necessary because
  we must first recover the public key from the transaction data. Use the syntax
  below to create a `KeyPair` instances from a transaction hash.

```javascript
// Create KeyPair instance from tx hash
const txHash = "0x123.....";
const recipientFromTxHash = await KeyPair.instanceFromTransaction(
  txHash,
  provider
);
```

## Development

1. Create a file in this directory called `.env` that looks like the one below.
   ```bash
   INFURA_ID=yourInfuraId
   TEST_ADDRESS=0x60A5dcB2fC804874883b797f37CbF1b0582ac2dD
   ```
2. Run `yarn` to install packages
3. Run `yarn test` to run all tests.

## How it Works

For an introduction and background on elliptic curve cryptography, see the references below:

- [A (Relatively Easy To Understand) Primer on Elliptic Curve Cryptography](https://blog.cloudflare.com/a-relatively-easy-to-understand-primer-on-elliptic-curve-cryptography/)
- [Elliptic Curve Cryptography: a gentle introduction - Andrea Corbellini](https://andrea.corbellini.name/2015/05/17/elliptic-curve-cryptography-a-gentle-introduction/) (This is part one of four part series. All four parts are recommended)
