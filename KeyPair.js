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
 * @notice If value is not 64 characters long, leading zeros were stripped and we should add
 * them back. It seems elliptic sometimes strips leading zeros when pulling out x and y
 * coordinates from public keys which can cause errors when checking that keys match
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
    if (!utils.isHexString(key)) throw new Error('Key must be in hex format');

    // Handle input
    if (key.length === 66) {
      // Save off various forms of the private key
      this.privateKeyHex = key;
      this.privateKeyHexSlim = key.slice(2);
      this.privateKeyEC = ec.keyFromPrivate(this.privateKeyHexSlim);
      this.privateKeyBN = ethers.BigNumber.from(this.privateKeyHex);

      // Multiply curve's generator point by private key to get public key
      this.publicKeyEC = ec.g.mul(this.privateKeyHexSlim);

      // Save various forms of public key
      this.publicKeyHexCoords = {
        x: pad32ByteHex(this.publicKeyEC.getX().toString('hex')),
        y: pad32ByteHex(this.publicKeyEC.getY().toString('hex')),
      };
      this.publicKeyHex = `0x04${this.publicKeyHexCoords.x}${this.publicKeyHexCoords.y}`;
      this.publicKeyHexSlim = `${this.publicKeyHexCoords.x}${this.publicKeyHexCoords.y}`;
    } else if (key.length === 132) {
      // Save various forms of public key
      this.publicKeyHex = key;
      this.publicKeyHexSlim = this.publicKeyHex.slice(4);
      this.publicKeyHexCoords = {
        x: pad32ByteHex(this.publicKeyHexSlim.slice(0, 64)),
        y: pad32ByteHex(this.publicKeyHexSlim.slice(64)),
      };
      this.publicKeyEC = ec.keyFromPublic({
        x: this.publicKeyHexCoords.x,
        y: this.publicKeyHexCoords.y,
      });
    } else {
      throw new Error('Key must be a 66 character private key or a 132 character public key');
    }
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
    // order of our curve
    const privateKey = privateKeyFull.mod(`0x${ec.n.toString('hex')}`);
    // Instantiate and return new instance
    return new KeyPair(privateKey.toHexString());
  }
}

module.exports = KeyPair;
