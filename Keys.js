/**
 * @notice Class for managing keys on secp256k1
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

class PublicKey {
  /**
   * @notice Creates new instance using full public key with 0x04 prefix
   * @param {String} publicKey public key to initialize instance with
   */
  constructor(publicKey) {
    if (publicKey.slice(0, 4) !== '0x04') throw new Error('Key must start with 0x04 prefix');
    if (publicKey.length !== 132) throw new Error('Key must be 132 characters');
    if (!utils.isHexString(publicKey)) throw new Error('Key must be in hex format');
    this.publicKey = publicKey;
  }

  /**
   * @notice Returns public key without 0x04 prefix
   */
  get publicKeyWithoutPrefix() {
    return this.publicKey.slice(4);
  }

  /**
   * @notice Returns the key's x,y coordinates as a hex string
   * @dev This requires us to remove the 0x04 prefix for compatibility with what elliptic expects.
   * For more information on this prefix see https://github.com/ethereumbook/ethereumbook/blob/develop/04keys-addresses.asciidoc#generating-a-public-key
   */
  get coordinatesAsHexString() {
    const keyWithoutPrefix = this.publicKey.slice(4);
    return {
      x: keyWithoutPrefix.slice(0, 64),
      y: keyWithoutPrefix.slice(64),
    };
  }

  /**
   * @notice Creates elliptic instance from the public key
   */
  get asEc() {
    const { x, y } = this.coordinatesAsHexString;
    return ec.keyFromPublic({ x, y });
  }

  /**
   * @notice Returns address derived from this public key
   */
  get address() {
    const hash = keccak256(Buffer.from(this.publicKeyWithoutPrefix, 'hex'));
    const addressBuffer = Buffer.from(hash, 'hex');
    return `0x${addressBuffer.slice(-20).toString('hex')}`;
  }

  /**
   * @notice Returns new PublicKey instance after multiplying this one by random value
   * @value Hex string to multiply by, without 0x prefix
   */
  mul(value) {
    if (value.slice(0, 2) === '0x') throw new Error('Value must not start with 0x');
    // Perform multiplication
    const publicKey = this.asEc.getPublic().mul(value);
    // Get x,y hex strings
    const x = pad32ByteHex(publicKey.getX().toString('hex'));
    const y = pad32ByteHex(publicKey.getY().toString('hex'));
    // Instantiate and return new instance
    return new PublicKey(`0x04${x}${y}`);
  }
}

module.exports = PublicKey;
