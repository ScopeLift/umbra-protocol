# umbra-js

JavaScipt library for interacting with the Umbra Protocol

## Usage

Install the package with `npm install umbra-protocol`. The example shown below
uses [ethers v5](https://docs-beta.ethers.io/), which is in beta and can be
installed with `npm install ethers@next`.

```javascript
const ethers = require('ethers')
const umbra = require('umbra-protocol');

const { RandomNumber, KeyPair } = umbra

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
console.log('Stealth recipient address: ', stealthFromPublic.address);

// Recipient ------------------------------------------------------------------
// Generate a KeyPair instance based on their own private key
const recipientFromPrivate = new KeyPair(wallet.privateKey);

// Multiply their private key by the random number to get a new KeyPair instance
const stealthFromPrivate = recipientFromPrivate.mulPrivateKey(randomNumber);

// Access funds and confirm addresses match
console.log(stealthFromPublic.address === stealthFromPrivate.address); // true
console.log('Private key to access received funds: ', stealthFromPrivate.privateKeyHex);
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
const txHash = '0x123.....';
const recipientFromTxHash = await KeyPair.instanceFromTransaction(txHash);
```

## Development

1. Run `npm install`
2. Run `npm test` to run all tests.
3. Optionally, run `node test/poc.js` to run the proof-of-concept file. If successful, you should see logs similar to the ones below in your console. Note that the two checks under step 6 are the most important, and both should be `true` if the script ran successfully

```text
Step 1: Public key successfully recovered from recipient signature
Step 2: N/A
Step 3: 32-byte random number successfully generated
Step 4: N/A
Step 5: Sender computed receiving address of  0x898dc9f96835df5c8190e6de390694f79c79dd5a
Step 6: Checking that receiver computed same receiving address:
  Check 1:  true
  Check 2:  true

Complete! Outputs are below
  Stealth address:       0x898dc9f96835df5c8190e6de390694f79c79dd5a
  Stealth public key:    311a17971fedf86325e057590ae1c8adc7219f8889fe49e1e9e8ca13b41daeba9ab0f9ad59ce19c23c24d86186eecc187f24422ba1d9bb897228ceac76fafef7
  Stealth private key:   0xa792d048656686422d22462e0fc76e74f7d24a014368270ddfdb972830aaa271
```

## How it Works

For an introduction and background on elliptic curve cryptography, see the references below:

- [A (Relatively Easy To Understand) Primer on Elliptic Curve Cryptography](https://blog.cloudflare.com/a-relatively-easy-to-understand-primer-on-elliptic-curve-cryptography/)
- [Elliptic Curve Cryptography: a gentle introduction - Andrea Corbellini](https://andrea.corbellini.name/2015/05/17/elliptic-curve-cryptography-a-gentle-introduction/) (This is part one of four part series. All four parts are recommended)
