const chai = require('chai');
const ethers = require('ethers');

// umbra-js components
const KeyPair = require('../classes/KeyPair');
const RandomNumber = require('../classes/RandomNumber');
const utils = require('../utils/utils');

const { expect } = chai;

// Address and private key from first deterministic ganache account
const address = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1';
const privateKey = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';

describe('KeyPair class', () => {
  let wallet;

  beforeEach(() => {
    wallet = ethers.Wallet.createRandom();
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
    // Specify mainnet transaction hash and its sender
    const txHash = '0x397d8e85b0e78ed48676fdc4cd7c2f5ce55b4844eb087fde532428b0db0bd2cf';
    const from = '0x1f973B233f5Ebb1E5D7CFe51B9aE4A32415A3A08';
    // Create instance and check result
    const keyPair = await KeyPair.instanceFromTransaction(txHash);
    expect(keyPair.address).to.equal(from);
  });

  it('initializes an instance from a contract interaction transaction', async () => {
    // Specify mainnet transaction hash and its sender
    const txHash = '0xed8df05af867112b6ce09df9388632605c42e5af765e61f3b808e9f7662390ee';
    const from = '0xdc693f2e2192DB72fd92d9F589C904c4f4e6ef56';
    // Create instance and check result
    const keyPair = await KeyPair.instanceFromTransaction(txHash);
    expect(keyPair.address).to.equal(from);
  });

  it('initializes an instance from a contract creation transaction', async () => {
    // Specify mainnet transaction hash and its sender
    const txHash = '0x282a980bf2d7500233e4f2c55981e64826938cfe871060bfad9b22842adcb2c8';
    const from = '0x9862D074e33003726fA05c74F0142995f33A3250';
    // Create instance and check result
    const keyPair = await KeyPair.instanceFromTransaction(txHash);
    expect(keyPair.address).to.equal(from);
  });

  it('will recover the private key from an arbitrary transaction', async () => {
    // Specify mainnet transaction hash and its sender
    const txHash = '0x282a980bf2d7500233e4f2c55981e64826938cfe871060bfad9b22842adcb2c8';
    const sendersPublicKey = '0x04ef3718f57c441836d3adf7920b041c30b1394e00fd9be3eae0a3b5ff71709d6b93cc818a889a5ea1b9742d577b603e0d7a87feb9da4d49f0260d73f72af91dd9';
    // Create instance and check result
    const recoveredPublicKey = await utils.recoverPublicKeyFromTransaction(txHash);
    expect(recoveredPublicKey).to.equal(sendersPublicKey);
  });

  it('should not initialize an instance without the 0x prefix', () => {
    expect(() => new KeyPair(privateKey.slice(2)))
      .to.throw('Key must be in hex format with 0x prefix');
    expect(() => new KeyPair(wallet.publicKey.slice(4)))
      .to.throw('Key must be in hex format with 0x prefix');
  });

  it('properly derives public key parameters with both key-based constructor methods', () => {
    const keyPair1 = new KeyPair(wallet.privateKey);
    const keyPair2 = new KeyPair(wallet.publicKey);

    expect(keyPair1.publicKeyHex).to.equal(keyPair2.publicKeyHex);
    expect(keyPair1.publicKeyHexSlim).to.equal(keyPair2.publicKeyHexSlim);
    expect(keyPair1.publicKeyHeCoords).to.equal(keyPair2.publicKeyHeCoords);
    expect(keyPair1.publicKeyHeCoords).to.equal(keyPair2.publicKeyHeCoords);
    expect(keyPair1.publicKeyBN.toHexString()).to.equal(keyPair2.publicKeyBN.toHexString());
    expect(JSON.stringify(keyPair1.publicKeyEC)).to.equal(JSON.stringify(keyPair2.publicKeyEC));
  });

  it('lets sender generate stealth receiving address that recipient can access', () => {
    // Generate random number
    const randomNumber = new RandomNumber();
    // Sender computes receiving address from random number and recipient's public key
    const recipientFromPublic = new KeyPair(wallet.publicKey);
    const stealthFromPublic = recipientFromPublic.mulPublicKey(randomNumber);
    // Recipient computes new private key from random number and derives receiving address
    const recipientFromPrivate = new KeyPair(wallet.privateKey);
    const stealthFromPrivate = recipientFromPrivate.mulPrivateKey(randomNumber);
    // Confirm outputs match
    expect(stealthFromPrivate.address).to.equal(stealthFromPublic.address);
    expect(stealthFromPrivate.publicKeyHex).to.equal(stealthFromPublic.publicKeyHex);
  });

  it('works for any randomly generated number and wallet', () => {
    /* eslint-disable no-console */
    let numFailures = 0;
    const numRuns = 1000;
    console.log(`Testing ${numRuns} random numbers and wallets to ensure all pass...`);
    for (let i = 0; i < numRuns; i += 1) {
      if ((i + 1) % 100 === 0) console.log(`Executing run ${i + 1} of ${numRuns}...`);
      // Generate random number and wallet
      const randomNumber = new RandomNumber();
      const randomWallet = ethers.Wallet.createRandom();
      // Sender computes receiving address from random number and recipient's public key
      const recipientFromPublic = new KeyPair(randomWallet.publicKey);
      const stealthFromPublic = recipientFromPublic.mulPublicKey(randomNumber);
      // Recipient computes new private key from random number and derives receiving address
      const recipientFromPrivate = new KeyPair(randomWallet.privateKey);
      const stealthFromPrivate = recipientFromPrivate.mulPrivateKey(randomNumber);
      // Confirm outputs match
      if (
        stealthFromPrivate.address !== stealthFromPublic.address
      || stealthFromPrivate.publicKeyHex !== stealthFromPublic.publicKeyHex
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
    /* eslint-disable no-console */
  });
});
