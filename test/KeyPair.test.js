const chai = require('chai');
const ethers = require('ethers');
const KeyPair = require('../classes/KeyPair');
const RandomNumber = require('../classes/RandomNumber');

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
    const keyPair = new KeyPair(privateKey);
    expect(keyPair.address).to.equal(address);
    const keyPair2 = new KeyPair(wallet.privateKey);
    expect(keyPair2.address).to.equal(wallet.address);
  });

  it('initializes an instance with valid public key', () => {
    const keyPair = new KeyPair(wallet.publicKey);
    expect(keyPair.address).to.equal(wallet.address);
  });

  it('should not initialize an instance without the 0x prefix', () => {
    expect(() => new KeyPair(privateKey.slice(2)))
      .to.throw('Key must be in hex format with 0x prefix');
    expect(() => new KeyPair(wallet.publicKey.slice(4)))
      .to.throw('Key must be in hex format with 0x prefix');
  });

  it('properly derives public key parameters with both constructor methods', () => {
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
});
