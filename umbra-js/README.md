# umbra-js

JavaScipt library for interacting with the Umbra Protocol

## Usage

Install the package with `npm install @umbra/umbra-js` or `yarn add @umbra/umbra-js`.
The sample code below demonstrates how to use the package.

```javascript
import { ethers } from "ethers";
import { DomainService, KeyPair, Umbra } from "@umbra/umbra-js";

// Recipient Setup ------------------------------------------------------------
// Get user's account information
const provider = new ethers.providers.Web3Provider(walletProvider);
const signer = provider.getSigner();
const userAddress = await signer.getAddress();
const userEns = await provider.lookupAddress(userAddress); // resolves to e.g. yourname.eth

// Create Umbra instance
const chainId = provider.network.chainId;
umbra = new Umbra(provider, chainId);

// Ask user to sign a message to get their Umbra-specific private keys
const keyPairs = await umbra.generatePrivateKeys(signer);
const { spendingKeyPair, viewingKeyPair } = keyPairs;

// Associate Public Keys to ENS records
const domainService = new DomainService(provider);
const tx1 = await domainService.setPublicKeys(
  userEns,
  spendingKeyPair.publicKeyHex,
  viewingKeyPair.publicKeyHex
);
await tx1.wait();

// Send funds -----------------------------------------------------------------
// If sending a token, make sure to give allowance to the Umbra contract first
const tokenAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"; // for ETH, but any token address can be specified here
const amount = ethers.utils.parseUnits(amount, 18); // update decimals based on your token
const recipientId = "yourname.eth";
const { tx: tx2 } = await umbra.send(signer, tokenAddress, amount, recipientId);
await tx2.wait();

// Receive and withdraw funds -------------------------------------------------
// Notice that we must have hte user's private keys from the Recipient Setup
// steps above to withdraw funds

// Scan for received funds. Returns array of Announcement events for the user.
const { userAnnouncements } = await umbra.value.scan(
  spendingKeyPair.publicKeyHex,
  viewingKeyPair.privateKeyHex
);

// Withdraw the ETH sent about, say this is this the first announcement
const announcement = userAnnouncements[0];
const stealthPrivateKey = Umbra.computeStealthPrivateKey(
  spendingKeyPair.privateKeyHex,
  announcement.randomNumber
);
const tx3 = await umbra.withdraw(
  stealthPrivateKey,
  announcement.token,
  announcement.receiver,
  destinationAddress // address ETH will be withdrawn to
);
await tx3.wait();

// See the withdraw(), withdrawOnBehalf(), and relayWithdrawOnBehalf() methods
// for more withdrawal options. The signWithdraw() method is used for obtaining
// the signature needed when withdrawing via meta-transaction
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
