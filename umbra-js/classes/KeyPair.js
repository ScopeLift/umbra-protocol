/**
 * @notice Class for managing keys on secp256k1 curve
 */
const EC = require('elliptic').ec;
const { Buffer } = require('buffer/');
const { keccak256 } = require('js-sha3');
const ethers = require('ethers');

const ec = new EC('secp256k1');
const { utils } = ethers;

/**
 * @notice Adds leading zeroes to ensure 32-byte hex strings are the expected length.
 * @dev We always expect a hex value to have the full number of characters for its size,
 * so we use this tool to ensure no errors occur due to wrong hex character lengths.
 * Specifically, we need to pad hex values during the following cases:
 *   1. It seems elliptic strips unnecessary leading zeros when pulling out x and y
 *      coordinates from public keys.
 *   2. When computing a new private key from a random number, the new number (i.e. the new
 *      private key) may not necessarily require all 32-bytes as ethers.js also seems to
 *      strip leading zeroes.
 * @param {String} hex String to pad, without leading 0x
 */
function pad32ByteHex(hex) {
  if (!utils.isHexString) throw new Error('Input is not a valid hex string');
  if (hex.slice(0, 2) === '0x') { throw new Error('Input must not contain 0x prefix'); }
  return hex.padStart(64, 0);
}

class KeyPair {
  /**
   * @notice Creates new instance from a public or private key
   * @param {String} key public or private key to initialize instance with, as hex with prefix
   */
  constructor(key) {
    // Input checks
    if (!utils.isHexString(key)) throw new Error('Key must be in hex format with 0x prefix');

    // Handle input
    if (key.length === 66) {
      // Save off various forms of the private key
      this.privateKeyHex = key;
      this.privateKeyHexSlim = key.slice(2);
      this.privateKeyEC = ec.keyFromPrivate(this.privateKeyHexSlim);
      this.privateKeyBN = ethers.BigNumber.from(this.privateKeyHex);

      // Multiply curve's generator point by private key to get public key
      const publicKey = ec.g.mul(this.privateKeyHexSlim);

      // Save various forms of public key
      this.publicKeyHexCoords = {
        x: pad32ByteHex(publicKey.getX().toString('hex')),
        y: pad32ByteHex(publicKey.getY().toString('hex')),
      };
      this.publicKeyHex = `0x04${this.publicKeyHexCoords.x}${this.publicKeyHexCoords.y}`;
    } else if (key.length === 132) {
      // Save various forms of public key
      this.publicKeyHex = key;
      this.publicKeyHexCoords = {
        x: pad32ByteHex(this.publicKeyHexSlim.slice(0, 64)),
        y: pad32ByteHex(this.publicKeyHexSlim.slice(64)),
      };
    } else {
      throw new Error('Key must be a 66 character private key or a 132 character public key');
    }
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
   * @notice Returns checksum address derived from this key
   */
  get address() {
    const hash = keccak256(Buffer.from(this.publicKeyHexSlim, 'hex'));
    const addressBuffer = Buffer.from(hash, 'hex');
    const address = `0x${addressBuffer.slice(-20).toString('hex')}`;
    return utils.getAddress(address);
  }

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
}

module.exports = KeyPair;
