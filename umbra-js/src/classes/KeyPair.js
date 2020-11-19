/**
 * @notice Class for managing keys on secp256k1 curve
 */
const EC = require('elliptic').ec;
const { keccak256 } = require('js-sha3');
const ethers = require('ethers');
const { padHex, recoverPublicKeyFromTransaction } = require('../utils/utils');

const ec = new EC('secp256k1');
const { utils, BigNumber } = ethers;
const { hexZeroPad } = utils;

class KeyPair {
  /**
   * @notice Creates new instance from a public key or private key
   * @param {String} key Can be either (1) hex public key with 0x04 prefix, (2) hex private
   * key with 0x prefix
   */
  constructor(key) {
    // Input checks
    if (!utils.isHexString(key)) throw new Error('Key must be in hex format with 0x prefix');

    // Handle input
    if (key.length === 66) {
      // PRIVATE KEY
      // Save off various forms of the private key
      this.privateKeyHex = key;
      this.privateKeyHexSlim = key.slice(2);
      this.privateKeyEC = ec.keyFromPrivate(this.privateKeyHexSlim);
      this.privateKeyBN = BigNumber.from(this.privateKeyHex);

      // Multiply curve's generator point by private key to get public key
      const publicKey = ec.g.mul(this.privateKeyHexSlim);

      // Save off public key as hex, other forms computed as getters
      const publicKeyHexCoordsSlim = {
        x: padHex(publicKey.getX().toString('hex')),
        y: padHex(publicKey.getY().toString('hex')),
      };
      this.publicKeyHex = `0x04${publicKeyHexCoordsSlim.x}${publicKeyHexCoordsSlim.y}`;
    } else if (key.length === 132) {
      // PUBLIC KEY
      // Save off public key as hex, other forms computed as getters
      this.publicKeyHex = key;
    } else {
      throw new Error(
        'Key must be a 66 character private key, a 132 character public key, or a transaction hash with isTxHash set to true'
      );
    }
  }

  // GETTERS =======================================================================================
  /**
   * @notice Returns the x,y public key coordinates as hex with 0x prefix
   */
  get publicKeyHexCoords() {
    return {
      x: `0x${padHex(this.publicKeyHexSlim.slice(0, 64))}`,
      y: `0x${padHex(this.publicKeyHexSlim.slice(64))}`,
    };
  }

  /**
   * @notice Returns the x,y public key coordinates as hex without 0x prefix
   */
  get publicKeyHexCoordsSlim() {
    return {
      x: padHex(this.publicKeyHexSlim.slice(0, 64)),
      y: padHex(this.publicKeyHexSlim.slice(64)),
    };
  }

  /**
   * @notice Returns the public key without the 0x prefix
   */
  get publicKeyHexSlim() {
    return this.publicKeyHex.slice(4);
  }

  /**
   * @notice Returns an elliptic instance generated from the public key
   */
  get publicKeyEC() {
    return ec.keyFromPublic({
      x: this.publicKeyHexCoordsSlim.x,
      y: this.publicKeyHexCoordsSlim.y,
    });
  }

  /**
   * @notice Returns the public key as a BigNumber
   */
  get publicKeyBN() {
    return BigNumber.from(this.publicKeyHex);
  }

  /**
   * @notice Returns the public key as bytes array
   */
  get publicKeyBytes() {
    return utils.arrayify(this.publicKeyHex);
  }

  /**
   * @notice Returns checksum address derived from this key
   */
  get address() {
    const hash = keccak256(Buffer.from(this.publicKeyHexSlim, 'hex'));
    const addressBuffer = Buffer.from(hash, 'hex');
    const address = `0x${addressBuffer.slice(-20).toString('hex')}`;
    return utils.getAddress(address);
  }

  // ENCRYPTION / DECRYPTION =======================================================================
  /**
   * @notice Encrypt a random number with the instance's public key
   * @param {RandomNumber} randomNumber Random number as instance of RandomNumber class
   * @returns {Object} Hex strings of uncompressed 65 byte public key and 32 byte ciphertext
   */
  async encrypt(randomNumber) {
    // Get shared secret to use as encryption key
    const ephemeralWallet = ethers.Wallet.createRandom();
    const privateKey = new ethers.utils.SigningKey(ephemeralWallet.privateKey);
    const sharedSecret = privateKey.computeSharedSecret(this.publicKeyHex);

    // XOR random number with shared secret to get encrypted value
    const ciphertext = randomNumber.value.xor(sharedSecret);
    const result = {
      // Both outputs are hex strings
      ephemeralPublicKey: ephemeralWallet.publicKey,
      ciphertext: hexZeroPad(ciphertext.toHexString(), 32),
    };
    return result;
  }

  /**
   * @notice Decrypt a random number with the instance's private key and return the plaintext
   * @param {String} output Output from the encrypt method
   * @returns {String} Hex string of the unencrypted value
   */
  async decrypt(output) {
    const { ephemeralPublicKey, ciphertext } = output;

    // Get shared secret to use as decryption key
    const privateKey = new ethers.utils.SigningKey(this.privateKeyHex);
    const sharedSecret = privateKey.computeSharedSecret(ephemeralPublicKey);

    // Decrypt
    const plaintext = BigNumber.from(ciphertext).xor(sharedSecret);
    return hexZeroPad(plaintext.toHexString(), 32);
  }

  // ELLIPTIC CURVE MATH ===========================================================================
  /**
   * @notice Returns new KeyPair instance after multiplying this public key by some value
   * @param {RandomNumber, String} value number to multiply by, as class RandomNumber or hex
   * string with 0x prefix
   */
  mulPublicKey(value) {
    // Perform multiplication
    const number = utils.isHexString(value) ? value.slice(2) : value.asHexSlim;
    const publicKey = this.publicKeyEC.getPublic().mul(number);
    // Get x,y hex strings
    const x = padHex(publicKey.getX().toString('hex'));
    const y = padHex(publicKey.getY().toString('hex'));
    // Instantiate and return new instance
    return new KeyPair(`0x04${x}${y}`);
  }

  /**
   * @notice Returns new KeyPair instance after multiplying this private key by some value
   * @param {RandomNumber, String} value number to multiply by, as class RandomNumber or hex
   * string with 0x prefix
   */
  mulPrivateKey(value) {
    // Get new private key. This gives us an arbitrarily large number that is not
    // necessarily in the domain of the secp256k1 elliptic curve
    const number = utils.isHexString(value) ? value : value.asHex;
    const privateKeyFull = this.privateKeyBN.mul(number);
    // Modulo operation to get private key to be in correct range, where ec.n gives the
    // order of our curve. We add the 0x prefix as it's required by ethers.js
    const privateKeyMod = privateKeyFull.mod(`0x${ec.n.toString('hex')}`);
    // Remove 0x prefix to pad hex value, then add back 0x prefix
    const privateKey = `0x${padHex(privateKeyMod.toHexString().slice(2))}`;
    // Instantiate and return new instance
    return new KeyPair(privateKey);
  }

  // STATIC METHODS ================================================================================
  /**
   * @notice Generate KeyPair instance asynchronously from a transaction hash
   * @param {String} txHash Transaction hash to recover public key from
   * @param {*} provider raw web3 provider to use (not an ethers instance)
   */
  static async instanceFromTransaction(txHash, provider) {
    const publicKeyHex = await recoverPublicKeyFromTransaction(txHash, provider);
    return new KeyPair(publicKeyHex);
  }
}

module.exports = KeyPair;
