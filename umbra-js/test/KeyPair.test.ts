import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Wallet } from 'ethers';
import { RandomNumber } from '../src/classes/RandomNumber';
import { KeyPair } from '../src/classes/KeyPair';
import { Umbra } from '../src/classes/Umbra';
import * as utils from '../src/utils/utils';
import { expectRejection } from './utils';

const ethersProvider = ethers.provider;
const numberOfRuns = 100; // number of runs for tests that execute in a loop

// Define public key that is not on the curve. This point was generated from a valid public key ending in
// `83b3` and we took this off the curve by changing the final digits to `83b4`
const badPublicKey =
  '0x04059f2fa86c55b95a8db142a6a5490c43e242d03ed8c0bd58437a98709dc9e18b3bddafce903ea49a44b78d57626448c83f8649d3ec4e7c72d8777823f49583b4';

// Address, public key (not used), and private key from first deterministic ganache account
const address = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1';
// const publicKey = '0x04e68acfc0253a10620dff706b0a1b1f1f5833ea3beb3bde2250d5f271f3563606672ebc45e0b7ea2e816ecb70ca03137b1c9476eec63d4632e990020b7b6fba39';
const privateKey = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';

describe('KeyPair class', () => {
  let wallet: Wallet;

  beforeEach(() => {
    wallet = Wallet.createRandom();
  });

  describe('Initialization', () => {
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
  });

  describe('Functionality', () => {
    it('will recover the public key from an arbitrary transaction', async () => {
      // Specify rinkeby transaction hash and its sender
      const txHash = '0x0f18ca5d71b4ad595a7a9a649c940aeec068ef6f1a4fe71f210578a8ea483e0f';
      const sendersPublicKey =
        '0x041e2f66297fe2f58c9a9e4b7895bd4e5107581ed533ea9ff311631ea15692a6e6eb8d38f1bddf2e6e9f00dc5120e313671c93570b4997dcd9cd9388ae35ffd4b8';
      // Create instance and check result
      const recoveredPublicKey = await utils.recoverPublicKeyFromTransaction(txHash, ethersProvider);
      expect(recoveredPublicKey).to.equal(sendersPublicKey);
    });

    it('properly compresses and uncompresses public keys', async () => {
      // Known set of private keys that fail if compressed public key is not padded to 32 bytes (in
      // other words, these private keys generate public keys that start with a zero-byte)
      // prettier-ignore
      const privateKeys = [ '0x7a79b9a28a51ff8704238959a7b19dd43149698b32065559948419e650636f68', '0xa1275d22f814d1e766d76eeea4f97584a322bec236176d291c3a46856b8d8770', '0xa5e4845e9d1bd6e546ee6655519a4400a9b591afc1fc09c74016a6e17c27c47b', '0x2a618897e58ef3a09a1c3f8b32931bc08fc671e00545b9e919fb418367eec49d', '0xa01d066e7f01d664296fbab225d86590555e762f021f73a6837ab69a4b20fb32', '0xdbe0800f84f57e58f16b346fe8b6c264700a5adbb70bb522bd3ee4b75f3d59c7', '0xed8dee728fb529b9fa1a78e205685e632609c0b43600048323fde68353990be7', ];
      for (let i = 0; i < privateKeys.length; i += 1) {
        wallet = new Wallet(privateKeys[i]);
        const compressedPublicKey = KeyPair.compressPublicKey(wallet.publicKey);
        const uncompressedPublicKey = KeyPair.getUncompressedFromX(
          compressedPublicKey.pubKeyXCoordinate,
          compressedPublicKey.prefix
        );
        expect(uncompressedPublicKey).to.equal(wallet.publicKey);
      }

      // Repeat again but with random private keys
      for (let i = 0; i < numberOfRuns; i += 1) {
        wallet = Wallet.createRandom();
        const compressedPublicKey = KeyPair.compressPublicKey(wallet.publicKey);
        const uncompressedPublicKey = KeyPair.getUncompressedFromX(
          compressedPublicKey.pubKeyXCoordinate,
          compressedPublicKey.prefix
        );
        expect(uncompressedPublicKey).to.equal(wallet.publicKey);
      }
    });

    it('successfully decrypts random number regardless of ephemeral public key prefix', async () => {
      for (let i = 0; i < numberOfRuns; i += 1) {
        // Recipient account setup
        const recipient = Wallet.createRandom();
        const umbra = new Umbra(ethersProvider, 4);
        const { viewingKeyPair } = await umbra.generatePrivateKeys(recipient);

        // Simulate sender encrypting the random number
        const randomNumber = new RandomNumber();
        const encrypted = viewingKeyPair.encrypt(randomNumber);

        // Pull out the data that is published to chain and emitted as an event
        const { ciphertext } = encrypted;
        const { pubKeyXCoordinate } = KeyPair.compressPublicKey(encrypted.ephemeralPublicKey);

        // Assume 02 prefix and decrypt
        const uncompressedPubKey1 = KeyPair.getUncompressedFromX(pubKeyXCoordinate, 2);
        const payload1 = { ephemeralPublicKey: uncompressedPubKey1, ciphertext };
        const randomNumber1 = viewingKeyPair.decrypt(payload1);
        expect(randomNumber1).to.equal(randomNumber.asHex);

        // Assume 03 prefix and decrypt
        const uncompressedPubKey2 = KeyPair.getUncompressedFromX(pubKeyXCoordinate, 3);
        const payload2 = { ephemeralPublicKey: uncompressedPubKey2, ciphertext };
        const randomNumber2 = viewingKeyPair.decrypt(payload2);
        expect(randomNumber2).to.equal(randomNumber.asHex);
        expect(uncompressedPubKey1).to.not.equal(uncompressedPubKey2); // confirm we took different paths to same result
      }
    });

    it('properly derives public key parameters with both key-based constructor methods', () => {
      const keyPair1 = new KeyPair(wallet.privateKey);
      const keyPair2 = new KeyPair(wallet.publicKey);

      expect(keyPair1.publicKeyHex).to.equal(keyPair2.publicKeyHex);
      // expect(JSON.stringify(keyPair1.publicKeyEC)).to.equal(JSON.stringify(keyPair2.publicKeyEC));
    });

    it('supports encryption and decryption of the random number', async () => {
      // Do a bunch of tests with random wallets and numbers
      for (let i = 0; i < numberOfRuns; i += 1) {
        // Every 100th run print status update
        if ((i + 1) % 100 === 0) console.log(`Executing run ${i + 1} of ${numberOfRuns}...`);

        // Generate random wallet and encrypt payload
        const randomNumber = new RandomNumber();
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
        // Every 100th run print status update
        if ((i + 1) % 100 === 0) console.log(`Executing run ${i + 1} of ${numberOfRuns}...`);

        // Sender computes receiving address from random number and recipient's public key
        const randomNumber = new RandomNumber();
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
        if ((i + 1) % 100 === 0) console.log(`Executing run ${i + 1} of ${numberOfRuns}...`);

        // Generate random number and wallet
        const randomNumber = new RandomNumber();
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
        if ((i + 1) % 100 === 0) console.log(`Executing run ${i + 1} of ${numberOfRuns}...`);

        // Generate random number and wallet
        const randomNumber = new RandomNumber();
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

  describe('Input validation', () => {
    // ts-expect-error statements needed throughout this section to bypass TypeScript checks that would stop this file
    // from being compiled/ran

    it('returns null for private key parameters when created with a public key', () => {
      const keyPair = new KeyPair(wallet.publicKey);
      expect(keyPair.privateKeyHex).to.equal(null);
      expect(keyPair.privateKeyHexSlim).to.equal(null);
    });

    it('throws when initializing with an invalid key', () => {
      const errorMsg1 = 'Key must be a string in hex format with 0x prefix';
      const errorMsg2 = 'Key must be a 66 character hex private key or a 132 character hex public key';
      const errorMsg3 = 'Cannot initialize KeyPair with the provided key';
      const zeroPrivateKey = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const zeroPublicKey =
        '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

      // @ts-expect-error
      expect(() => new KeyPair(1)).to.throw(errorMsg1);
      expect(() => new KeyPair(privateKey.slice(2))).to.throw(errorMsg1);
      expect(() => new KeyPair(wallet.publicKey.slice(4))).to.throw(errorMsg1);
      expect(() => new KeyPair('0x1234')).to.throw(errorMsg2);
      expect(() => new KeyPair(zeroPrivateKey)).to.throw(errorMsg3);
      expect(() => new KeyPair(zeroPublicKey)).to.throw(errorMsg3);
    });

    it('throws when initializing with a public key not on the curve', () => {
      expect(() => new KeyPair(badPublicKey)).to.throw('Point is not on elliptic curve');
    });

    it('throws when trying to encrypt with a bad input', async () => {
      const keyPairFromPublic = new KeyPair(wallet.publicKey);
      const errorMsg = 'Must provide instance of RandomNumber';
      // @ts-expect-error
      expect(() => keyPairFromPublic.encrypt('1')).to.throw(errorMsg);
      // @ts-expect-error
      expect(() => keyPairFromPublic.encrypt(1)).to.throw(errorMsg);
    });

    it('throws when trying to decrypt with a bad input', async () => {
      const keyPairFromPrivate = new KeyPair(wallet.privateKey);
      const errorMsg = 'Input must be of type EncryptedPayload to decrypt';
      // @ts-expect-error
      expect(() => keyPairFromPrivate.decrypt({ ephemeralPublicKey: '1' })).to.throw(errorMsg);
      // @ts-expect-error
      expect(() => keyPairFromPrivate.decrypt({ ciphertext: '1' })).to.throw(errorMsg);
      // @ts-expect-error
      expect(() => keyPairFromPrivate.decrypt('1')).to.throw(errorMsg);
      // @ts-expect-error
      expect(() => keyPairFromPrivate.decrypt(1)).to.throw(errorMsg);
    });

    it('throws when trying to decrypt with a KeyPair that only has a public key', () => {
      const keyPairFromPublic = new KeyPair(wallet.publicKey);

      const dummyWallet = Wallet.createRandom();
      const dummyEncryptedData = { ephemeralPublicKey: dummyWallet.publicKey, ciphertext: dummyWallet.privateKey };

      const errorMsg = 'KeyPair has no associated private key to decrypt with';
      expect(() => keyPairFromPublic.decrypt(dummyEncryptedData)).to.throw(errorMsg);
    });

    it('throws when trying to decrypt with a public key not on the curve', () => {
      const keyPairFromPrivate = new KeyPair(wallet.privateKey);
      const dummyWallet = Wallet.createRandom();
      const dummyEncryptedData = { ephemeralPublicKey: badPublicKey, ciphertext: dummyWallet.privateKey };
      const dummyEncryptedData2 = { ephemeralPublicKey: badPublicKey.slice(2), ciphertext: dummyWallet.privateKey };
      expect(() => keyPairFromPrivate.decrypt(dummyEncryptedData)).to.throw('Point is not on elliptic curve');
      expect(() => keyPairFromPrivate.decrypt(dummyEncryptedData2)).to.throw('Point is not on elliptic curve');
    });

    it('throws when mulPublicKey is provided a bad input', async () => {
      const wallet = Wallet.createRandom();
      const keyPairFromPublic = new KeyPair(wallet.publicKey);
      // @ts-expect-error
      expect(() => keyPairFromPublic.mulPublicKey(1)).to.throw('Input must be instance of RandomNumber or string');
      expect(() => keyPairFromPublic.mulPublicKey('1234')).to.throw('Strings must be in hex form with 0x prefix');
    });

    it('throws when mulPrivateKey is provided a bad input', async () => {
      const keyPairFromPrivate = new KeyPair(wallet.privateKey);
      const keyPairFromPublic = new KeyPair(wallet.publicKey);
      // @ts-expect-error
      expect(() => keyPairFromPrivate.mulPrivateKey(1)).to.throw('Input must be instance of RandomNumber or string');
      expect(() => keyPairFromPrivate.mulPrivateKey('1234')).to.throw('Strings must be in hex form with 0x prefix');
      expect(() => keyPairFromPublic.mulPrivateKey('0x1')).to.throw('KeyPair has no associated private key');
    });

    it('throws when instanceFromTransaction is provided an invalid transaction hash', async () => {
      const errorMsg = 'Invalid transaction hash provided';
      // @ts-expect-error
      expectRejection(KeyPair.instanceFromTransaction(1, ethersProvider), errorMsg);
      expectRejection(KeyPair.instanceFromTransaction('0x1', ethersProvider), errorMsg);
    });

    it('throws when compressPublicKey is provided bad inputs', async () => {
      const errorMsg = 'Must provide uncompressed public key as hex string';
      // @ts-expect-error
      expect(() => KeyPair.compressPublicKey(1)).to.throw(errorMsg);
      expect(() => KeyPair.compressPublicKey('1')).to.throw(errorMsg);
      expect(() => KeyPair.compressPublicKey('0x1')).to.throw(errorMsg);
    });

    it('throws when compressPublicKey is provided a public key not on the curve', () => {
      expect(() => KeyPair.compressPublicKey(badPublicKey)).to.throw('Point is not on elliptic curve');
      expect(() => KeyPair.compressPublicKey(badPublicKey.slice(2))).to.throw('Point is not on elliptic curve');
    });

    it('throws when getUncompressedFromX is provided bad inputs', async () => {
      // @ts-expect-error
      expect(() => KeyPair.getUncompressedFromX(1)).to.throw('Compressed public key must be a BigNumber or string');
    });
  });
});
