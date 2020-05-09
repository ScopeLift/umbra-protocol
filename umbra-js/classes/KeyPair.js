/**
 * @notice Class for managing keys on secp256k1 curve
 */
const EC = require('elliptic').ec;
const eccrypto = require('eccrypto');
// const { Buffer } = require('buffer/'); // TODO make sure this works in browser and node
const { keccak256 } = require('js-sha3');
const ethers = require('ethers');
const {
  hexStringToBuffer,
  pad32ByteHex,
  recoverPublicKeyFromTransaction,
} = require('../utils/utils');

const ec = new EC('secp256k1');
const { utils } = ethers;


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
      this.privateKeyBN = ethers.BigNumber.from(this.privateKeyHex);

      // Multiply curve's generator point by private key to get public key
      const publicKey = ec.g.mul(this.privateKeyHexSlim);

      // Save off public key as hex, other forms computed as getters
      const publicKeyHexCoords = {
        x: pad32ByteHex(publicKey.getX().toString('hex')),
        y: pad32ByteHex(publicKey.getY().toString('hex')),
      };
      this.publicKeyHex = `0x04${publicKeyHexCoords.x}${publicKeyHexCoords.y}`;
    } else if (key.length === 132) {
      // PUBLIC KEY
      // Save off public key as hex, other forms computed as getters
      this.publicKeyHex = key;
    } else {
      throw new Error('Key must be a 66 character private key, a 132 character public key, or a transaction hash with isTxHash set to true');
    }
  }

  // GETTERS =======================================================================================
  /**
   * @notice Returns the x,y public key coordinates as hex
   */
  get publicKeyHexCoords() {
    return {
      x: pad32ByteHex(this.publicKeyHexSlim.slice(0, 64)),
      y: pad32ByteHex(this.publicKeyHexSlim.slice(64)),
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
      x: this.publicKeyHexCoords.x,
      y: this.publicKeyHexCoords.y,
    });
  }

  /**
   * @notice Returns the public key as a BigNumber
   */
  get publicKeyBN() {
    return ethers.BigNumber.from(this.publicKeyHex);
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
   * @param {RandomNumber} number Random number as instance of RandomNumber class
   * @returns {Object} With fields: 16 byte iv, 65 byte ephemeralPublicKey, 96-byte
   * ciphertext (assuming 32 byte random number), and 32 byte mac
   */
  async encrypt(number) {
    // Generate message to encrypt
    const prefix = 'umbra-protocol-v0';
    const message = `${prefix}${number.asHex}`;
    // Encrypt it
    const key = hexStringToBuffer(this.publicKeyHex);
    const output = await eccrypto.encrypt(key, Buffer.from(message));
    // Return ciphertext and public key (include MAC?)
    const result = {
      iv: utils.hexlify(output.iv),
      ephemeralPublicKey: utils.hexlify(output.ephemPublicKey),
      ciphertext: utils.hexlify(output.ciphertext),
      mac: utils.hexlify(output.mac),
    };
    return result;
  }

  /**
   * @notice Decrypt a random number with the instance's private key and return the plaintext
   * @param {String} output Output from the encrypt method
   */
  async decrypt(output) {
    // Format output into buffers for eccrypto
    const formattedOutput = {
      iv: hexStringToBuffer(output.iv),
      ephemPublicKey: hexStringToBuffer(output.ephemeralPublicKey),
      ciphertext: hexStringToBuffer(output.ciphertext),
      mac: hexStringToBuffer(output.mac),
    };
    // Decrypt data
    const key = hexStringToBuffer(this.privateKeyHex);
    const plaintext = await eccrypto.decrypt(key, formattedOutput);
    // Return value as string
    return plaintext.toString();
  }

  // ELLIPTIC CURVE MATH ===========================================================================
  /**
   * @notice Returns new KeyPair instance after multiplying this public key by some value
   * @param {RandomNumber} value number to multiply by, as class RandomNumber
   */
  mulPublicKey(value) {
    // Perform multiplication
    const publicKey = this.publicKeyEC.getPublic().mul(value.asHexSlim);
    // Get x,y hex strings
    const x = pad32ByteHex(publicKey.getX().toString('hex'));
    const y = pad32ByteHex(publicKey.getY().toString('hex'));
    // Instantiate and return new instance
    return new KeyPair(`0x04${x}${y}`);
  }

  /**
   * @notice Returns new KeyPair instance after multiplying this private key by some value
   * @param {RandomNumber} value number to multiply by, as class RandomNumber
   */
  mulPrivateKey(value) {
    // Get new private key. This gives us an arbitrarily large number that is not
    // necessarily in the domain of the secp256k1 elliptic curve
    const privateKeyFull = this.privateKeyBN.mul(value.asHex);
    // Modulo operation to get private key to be in correct range, where ec.n gives the
    // order of our curve. We add the 0x prefix as it's required by ethers.js
    const privateKeyMod = privateKeyFull.mod(`0x${ec.n.toString('hex')}`);
    // Remove 0x prefix to pad hex value, then add back 0x prefix
    const privateKey = `0x${pad32ByteHex(privateKeyMod.toHexString().slice(2))}`;
    // Instantiate and return new instance
    return new KeyPair(privateKey);
  }

  // STATIC METHODS ================================================================================
  /**
   * @notice Generate KeyPair instance asynchronously from a transaction hash
   * @param {String} txHash Transaction hash to recover public key from
   */
  static async instanceFromTransaction(txHash) {
    const publicKeyHex = await recoverPublicKeyFromTransaction(txHash);
    return new KeyPair(publicKeyHex);
  }
}

module.exports = KeyPair;
