import * as chai from 'chai';
import { provider } from '@openzeppelin/test-environment';
import { Wallet } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import { hexZeroPad } from '@ethersproject/bytes';
import { Web3Provider } from '@ethersproject/providers';
import { randomBytes } from '@ethersproject/random';
import type { ExternalProvider } from '../src/types';

import { RandomNumber } from '../src/classes/RandomNumber';
import { KeyPair } from '../src/classes/KeyPair';
import * as utils from '../src/utils/utils';

const { expect } = chai;
const web3Provider = (provider as unknown) as ExternalProvider;
const ethersProvider = new Web3Provider(web3Provider);
const numberOfRuns = 100; // number of runs for tests that execute in a loop
const zeroPrefix = '0x00000000000000000000000000000000'; // 16 bytes of zeros

// Address, public key (not used), and private key from first deterministic ganache account
const address = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1';
// const publicKey = '0x04e68acfc0253a10620dff706b0a1b1f1f5833ea3beb3bde2250d5f271f3563606672ebc45e0b7ea2e816ecb70ca03137b1c9476eec63d4632e990020b7b6fba39';
const privateKey = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';

// Generates a random number with a random payload extension if one is not provided
const generateRandomNumber = (payloadExtension: string | undefined = undefined) => {
  // If a payload extension was provided, use that
  if (payloadExtension) {
    return new RandomNumber(payloadExtension);
  }
  // Otherwise, generate a random one to use
  const randomPayloadExtension = hexZeroPad(BigNumber.from(randomBytes(16)).toHexString(), 16);
  return new RandomNumber(randomPayloadExtension);
};

describe('KeyPair class', () => {
  let wallet: Wallet;

  beforeEach(() => {
    wallet = Wallet.createRandom();
  });

  it('initializes an instance with valid private key', () => {
    // Check against ganache account
    const keyPair = new KeyPair(privateKey);
    expect(keyPair.address).to.equal(address);
    // Check against random wallet
    const keyPair2 = new KeyPair(wallet.privateKey);
    expect(keyPair2.address).to.equal(wallet.address);
  });

  it('initializes an instance with valid public key', () => {
    const keyPair = new KeyPair(wallet.publicKey);
    expect(keyPair.address).to.equal(wallet.address);
  });

  it('initializes an instance from a regular transaction', async () => {
    // Specify rinkeby transaction hash and its sender
    const txHash = '0x0f18ca5d71b4ad595a7a9a649c940aeec068ef6f1a4fe71f210578a8ea483e0f';
    const from = '0x40f3F89639bFFc7B23cA5D9FCB9eD9a9C579664B';
    // Create instance and check result
    const keyPair = await KeyPair.instanceFromTransaction(txHash, ethersProvider);
    expect(keyPair.address).to.equal(from);
  });

  it('initializes an instance from a contract interaction transaction', async () => {
    // Specify rinkeby transaction hash and its sender
    const txHash = '0xfc84305e8aea7c735bd89e01e0fe66b50ce8ed8c940291fa8f3e1a1070f029c5';
    const from = '0x72378CbC246C17fe856d7678d944a0C51227eD59';
    // Create instance and check result
    const keyPair = await KeyPair.instanceFromTransaction(txHash, ethersProvider);
    expect(keyPair.address).to.equal(from);
  });

  it('initializes an instance from a contract creation transaction', async () => {
    // Specify rinkeby transaction hash and its sender
    const txHash = '0xa84eae9a81444a02d10916627c282fe16fd78eb8ed3e2bd36ec257f7272ddcd0';
    const from = '0x627306090abaB3A6e1400e9345bC60c78a8BEf57';
    // Create instance and check result
    const keyPair = await KeyPair.instanceFromTransaction(txHash, ethersProvider);
    expect(keyPair.address).to.equal(from);
  });

  it('will recover the public key from an arbitrary transaction', async () => {
    // Specify rinkeby transaction hash and its sender
    const txHash = '0x0f18ca5d71b4ad595a7a9a649c940aeec068ef6f1a4fe71f210578a8ea483e0f';
    const sendersPublicKey =
      '0x041e2f66297fe2f58c9a9e4b7895bd4e5107581ed533ea9ff311631ea15692a6e6eb8d38f1bddf2e6e9f00dc5120e313671c93570b4997dcd9cd9388ae35ffd4b8';
    // Create instance and check result
    const recoveredPublicKey = await utils.recoverPublicKeyFromTransaction(txHash, ethersProvider);
    expect(recoveredPublicKey).to.equal(sendersPublicKey);
  });

  it('should not initialize an instance without the 0x prefix', () => {
    expect(() => new KeyPair(privateKey.slice(2))).to.throw(
      'Key must be in hex format with 0x prefix'
    );
    expect(() => new KeyPair(wallet.publicKey.slice(4))).to.throw(
      'Key must be in hex format with 0x prefix'
    );
  });

  it('properly derives public key parameters with both key-based constructor methods', () => {
    const keyPair1 = new KeyPair(wallet.privateKey);
    const keyPair2 = new KeyPair(wallet.publicKey);

    expect(keyPair1.publicKeyHex).to.equal(keyPair2.publicKeyHex);
    expect(keyPair1.publicKeyHexSlim).to.equal(keyPair2.publicKeyHexSlim);
    expect(keyPair1.publicKeyHexCoords.x).to.equal(keyPair2.publicKeyHexCoords.x);
    expect(keyPair1.publicKeyHexCoords.y).to.equal(keyPair2.publicKeyHexCoords.y);
    expect(keyPair1.publicKeyBN.toHexString()).to.equal(keyPair2.publicKeyBN.toHexString());
    expect(JSON.stringify(keyPair1.publicKeyEC)).to.equal(JSON.stringify(keyPair2.publicKeyEC));
  });

  it('supports encryption and decryption of the random number', async () => {
    // Do a bunch of tests with random wallets and numbers
    for (let i = 0; i < numberOfRuns; i += 1) {
      // Every 100th run, print status update and use the zero payload extension
      let randomNumber: RandomNumber;
      if ((i + 1) % 100 === 0) {
        console.log(`Executing run ${i + 1} of ${numberOfRuns}...`);
        randomNumber = generateRandomNumber(zeroPrefix);
      } else {
        randomNumber = generateRandomNumber();
      }

      // Generate random wallet and encrypt payload
      const wallet = Wallet.createRandom();
      const keyPairFromPublic = new KeyPair(wallet.publicKey);
      const output = await keyPairFromPublic.encrypt(randomNumber); // eslint-disable-line no-await-in-loop

      // Decrypt payload
      const keyPairFromPrivate = new KeyPair(wallet.privateKey);
      const plaintext = await keyPairFromPrivate.decrypt(output); // eslint-disable-line no-await-in-loop
      expect(plaintext).to.equal(randomNumber.asHex);
    }
  });

  it('lets sender generate stealth receiving address that recipient can access', () => {
    for (let i = 0; i < numberOfRuns; i += 1) {
      // Every 100th run, print status update and use the zero payload extension
      let randomNumber: RandomNumber;
      if ((i + 1) % 100 === 0) {
        console.log(`Executing run ${i + 1} of ${numberOfRuns}...`);
        randomNumber = generateRandomNumber(zeroPrefix);
      } else {
        randomNumber = generateRandomNumber();
      }

      // Sender computes receiving address from random number and recipient's public key
      const recipientFromPublic = new KeyPair(wallet.publicKey);
      const stealthFromPublic = recipientFromPublic.mulPublicKey(randomNumber);

      // Recipient computes new private key from random number and derives receiving address
      const recipientFromPrivate = new KeyPair(wallet.privateKey);
      const stealthFromPrivate = recipientFromPrivate.mulPrivateKey(randomNumber);

      // Confirm outputs match
      expect(stealthFromPrivate.address).to.equal(stealthFromPublic.address);
      expect(stealthFromPrivate.publicKeyHex).to.equal(stealthFromPublic.publicKeyHex);
    }
  });

  it('lets multiplication be performed with RandomNumber class or hex string', () => {
    for (let i = 0; i < numberOfRuns; i += 1) {
      // Every 100th run, print status update and use the zero payload extension
      let randomNumber: RandomNumber;
      if ((i + 1) % 100 === 0) {
        randomNumber = generateRandomNumber(zeroPrefix);
        console.log(`Executing run ${i + 1} of ${numberOfRuns}...`);
      } else {
        randomNumber = generateRandomNumber();
      }

      // Generate random wallet
      const randomWallet = Wallet.createRandom();
      const randomFromPublic = new KeyPair(randomWallet.publicKey);
      const randomFromPrivate = new KeyPair(randomWallet.privateKey);

      // Compare public key multiplication
      const stealthFromClassPublic = randomFromPublic.mulPublicKey(randomNumber);
      const stealthFromStringPublic = randomFromPublic.mulPublicKey(randomNumber.asHex);
      expect(stealthFromClassPublic.address).to.equal(stealthFromStringPublic.address);

      // Compare private key multiplication
      const stealthFromClassPrivate = randomFromPrivate.mulPrivateKey(randomNumber);
      const stealthFromStringPrivate = randomFromPrivate.mulPrivateKey(randomNumber.asHex);
      expect(stealthFromClassPrivate.address).to.equal(stealthFromStringPrivate.address);

      const stealthFromClassPrivate2 = randomFromPrivate.mulPublicKey(randomNumber);
      const stealthFromStringPrivate2 = randomFromPrivate.mulPublicKey(randomNumber.asHex);
      expect(stealthFromClassPrivate2.address).to.equal(stealthFromStringPrivate2.address);
    }
  });

  it('works for any randomly generated number and wallet', () => {
    let numFailures = 0;
    for (let i = 0; i < numberOfRuns; i += 1) {
      // Every 100th run, print status update and use the zero payload extension
      let randomNumber: RandomNumber;
      if ((i + 1) % 100 === 0) {
        console.log(`Executing run ${i + 1} of ${numberOfRuns}...`);
        randomNumber = generateRandomNumber(zeroPrefix);
      } else {
        randomNumber = generateRandomNumber();
      }

      // Generate random wallet
      const randomWallet = Wallet.createRandom();

      // Sender computes receiving address from random number and recipient's public key
      const recipientFromPublic = new KeyPair(randomWallet.publicKey);
      const stealthFromPublic = recipientFromPublic.mulPublicKey(randomNumber);

      // Recipient computes new private key from random number and derives receiving address
      const recipientFromPrivate = new KeyPair(randomWallet.privateKey);
      const stealthFromPrivate = recipientFromPrivate.mulPrivateKey(randomNumber);

      // Confirm outputs match
      if (
        stealthFromPrivate.address !== stealthFromPublic.address ||
        stealthFromPrivate.publicKeyHex !== stealthFromPublic.publicKeyHex
      ) {
        numFailures += 1;
        console.log();
        console.log(`FAILURE #${numFailures} ========================================`);
        console.log('Inputs');
        console.log('  Wallet Private Key:  ', wallet.privateKey);
        console.log('  Wallet Public Key:   ', wallet.publicKey);
        console.log('  Wallet Address:      ', wallet.address);
        console.log('  Random Number:       ', randomNumber.asHex);
        console.log('Outputs');
        console.log('  Stealth from Public,  Address:     ', stealthFromPublic.address);
        console.log('  Stealth from Private, Address:     ', stealthFromPrivate.address);
        console.log('  Stealth from Public,  Public Key:  ', stealthFromPublic.publicKeyHex);
        console.log('  Stealth from Private, Public Key:  ', stealthFromPrivate.publicKeyHex);
      }
    }
    expect(numFailures).to.equal(0);
  });
});
