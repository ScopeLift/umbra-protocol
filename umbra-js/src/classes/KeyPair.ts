/**
 * @dev Class for managing secp256k1 keys and performing operations with them
 */

import {
  getSharedSecret as nobleGetSharedSecret,
  utils as nobleUtils,
  getPublicKey,
  Point,
  CURVE,
} from '@noble/secp256k1';
import { BigNumberish, computeAddress, hexZeroPad, isHexString, sha256, BigNumber } from '../ethers';
import { RandomNumber } from './RandomNumber';
import { assertValidPoint, assertValidPrivateKey, lengths, recoverPublicKeyFromTransaction } from '../utils/utils';
import { CompressedPublicKey, EncryptedPayload, EthersProvider } from '../types';

// List of private or public keys that we disallow initializing a KeyPair instance with, since they will lead to
// unrecoverable funds.
const blockedKeys = [
  '0x0000000000000000000000000000000000000000000000000000000000000000', // private key of all zeros
  '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', // public key of all zeroes
];

/**
 * @notice Private helper method to return the shared secret for a given private key and public key
 * @param privateKey Private key as hex string with 0x prefix
 * @param publicKey Uncompressed public key as hex string with 0x04 prefix
 * @returns 32-byte shared secret as 66 character hex string
 */
function getSharedSecret(privateKey: string, publicKey: string) {
  if (privateKey.length !== lengths.privateKey || !isHexString(privateKey)) throw new Error('Invalid private key');
  if (publicKey.length !== lengths.publicKey || !isHexString(publicKey)) throw new Error('Invalid public key');
  assertValidPoint(publicKey);
  assertValidPrivateKey(privateKey);

  // We use sharedSecret.slice(2) to ensure the shared secret is not dependent on the prefix, which enables
  // us to uncompress ephemeralPublicKey from Umbra.sol logs as explained in comments of getUncompressedFromX.
  // Note that a shared secret is really just a point on the curve, so it's an uncompressed public key
  const sharedSecret = nobleGetSharedSecret(privateKey.slice(2), publicKey.slice(2), true);
  const sharedSecretHex = nobleUtils.bytesToHex(sharedSecret); // Has 04 prefix but not 0x.
  return sha256(`0x${sharedSecretHex.slice(2)}`); // TODO Update to use noble-hashes?
}

export class KeyPair {
  readonly publicKeyHex: string; // Public key as hex string with 0x04 prefix
  readonly privateKeyHex: string | null = null; // Private key as hex string with 0x prefix, or null if not provided

  /**
   * @notice Creates new instance from a public key or private key
   * @param key Can be either (1) hex public key with 0x04 prefix, or (2) hex private key with 0x prefix
   */
  constructor(key: string) {
    if (typeof key !== 'string' || !isHexString(key)) {
      throw new Error('Key must be a string in hex format with 0x prefix');
    }
    if (blockedKeys.includes(key)) {
      throw new Error('Cannot initialize KeyPair with the provided key');
    }

    if (key.length === lengths.privateKey) {
      // Private key provided
      assertValidPrivateKey(key);
      this.privateKeyHex = key;
      const publicKey: Uint8Array = getPublicKey(this.privateKeyHexSlim as string);
      this.publicKeyHex = `0x${nobleUtils.bytesToHex(publicKey)}`; // Has 0x04 prefix, other forms computed as getters.
    } else if (key.length === lengths.publicKey) {
      // Public key provided
      assertValidPoint(key); // throw if point is not on curve
      this.publicKeyHex = key; // Save off public key, other forms computed as getters
    } else {
      throw new Error('Key must be a 66 character hex private key or a 132 character hex public key');
    }
  }

  // ===================================================== GETTERS =====================================================

  /**
   * @notice Returns the private key as a hex string without the 0x prefix
   */
  get privateKeyHexSlim() {
    return this.privateKeyHex ? this.privateKeyHex.slice(2) : null;
  }

  /**
   * @notice Returns the uncompressed public key as a hex string without the 0x prefix
   */
  get publicKeyHexSlim() {
    return this.publicKeyHex.slice(2);
  }

  /**
   * @notice Returns checksum address derived from this key
   */
  get address() {
    return computeAddress(this.publicKeyHex);
  }

  // ============================================= ENCRYPTION / DECRYPTION =============================================

  /**
   * @notice Encrypt a number with the instance's public key
   * @param randomNumber Number as instance of RandomNumber class
   * @returns Hex strings of uncompressed 65 byte public key and 32 byte ciphertext
   */
  encrypt(number: RandomNumber): EncryptedPayload {
    if (!(number instanceof RandomNumber)) {
      throw new Error('Must provide instance of RandomNumber');
    }

    // Get shared secret to use as encryption key
    const ephemeralPrivateKey = nobleUtils.randomPrivateKey();
    const ephemeralPublicKey = Point.fromPrivateKey(ephemeralPrivateKey);
    const ephemeralPrivateKeyHex = `0x${nobleUtils.bytesToHex(ephemeralPrivateKey)}`;
    const ephemeralPublicKeyHex = `0x${ephemeralPublicKey.toHex()}`;
    const sharedSecret = getSharedSecret(ephemeralPrivateKeyHex, this.publicKeyHex);

    // XOR random number with shared secret to get encrypted value
    const ciphertextBN = number.value.xor(sharedSecret);
    const ciphertext = hexZeroPad(ciphertextBN.toHexString(), 32); // 32 byte hex string with 0x prefix
    return { ephemeralPublicKey: ephemeralPublicKeyHex, ciphertext };
  }

  /**
   * @notice Decrypt a random number with the instance's private key and return the plaintext
   * @param output Output from the encrypt method, which can be constructed from on-chain events
   * @returns Decrypted ciphertext as hex string
   */
  decrypt(output: EncryptedPayload) {
    const { ephemeralPublicKey, ciphertext } = output;
    if (!ephemeralPublicKey || !ciphertext) {
      throw new Error('Input must be of type EncryptedPayload to decrypt');
    }
    if (!this.privateKeyHex) {
      throw new Error('KeyPair has no associated private key to decrypt with');
    }
    assertValidPoint(ephemeralPublicKey); // throw if point is not on curve

    // Get shared secret to use as decryption key, then decrypt with XOR
    const sharedSecret = getSharedSecret(this.privateKeyHex, ephemeralPublicKey);
    const plaintext = BigNumber.from(ciphertext).xor(sharedSecret);
    return hexZeroPad(plaintext.toHexString(), 32);
  }

  // =============================================== ELLIPTIC CURVE MATH ===============================================
  /**
   * @notice Returns new KeyPair instance after multiplying this public key by some value
   * @param value number to multiply by, as RandomNumber or hex string with 0x prefix
   */
  mulPublicKey(value: RandomNumber | string) {
    if (!(value instanceof RandomNumber) && typeof value !== 'string') {
      throw new Error('Input must be instance of RandomNumber or string');
    }
    if (typeof value === 'string' && !value.startsWith('0x')) {
      throw new Error('Strings must be in hex form with 0x prefix');
    }

    // Parse number based on input type
    const number = isHexString(value)
      ? BigInt(value as string) // provided a valid hex string
      : BigInt((value as RandomNumber).asHex); // provided RandomNumber

    // Perform the multiplication and return new KeyPair instance
    const publicKey = Point.fromHex(this.publicKeyHexSlim).multiply(number);
    return new KeyPair(`0x${publicKey.toHex()}`);
  }

  /**
   * @notice Returns new KeyPair instance after multiplying this private key by some value
   * @param value number to multiply by, as class RandomNumber or hex string with 0x prefix
   */
  mulPrivateKey(value: RandomNumber | string) {
    if (!(value instanceof RandomNumber) && typeof value !== 'string') {
      throw new Error('Input must be instance of RandomNumber or string');
    }
    if (typeof value === 'string' && !isHexString(value)) {
      throw new Error('Strings must be in hex form with 0x prefix');
    }
    if (!this.privateKeyHex) {
      throw new Error('KeyPair has no associated private key');
    }

    // Parse number based on input type
    const number = isHexString(value)
      ? BigInt(value as string) // provided a valid hex string
      : BigInt((value as RandomNumber).asHex); // provided RandomNumber

    // Get new private key. Multiplication gives us an arbitrarily large number that is not necessarily in the domain
    // of the secp256k1 curve, so then we use modulus operation to get in the correct range.
    const privateKeyBigInt = (BigInt(this.privateKeyHex) * number) % CURVE.n;
    const privateKey = hexZeroPad(BigNumber.from(privateKeyBigInt).toHexString(), 32); // convert to 32 byte hex
    return new KeyPair(privateKey); // return new KeyPair instance
  }

  // ================================================= STATIC METHODS ==================================================
  /**
   * @notice Generate KeyPair instance asynchronously from a transaction hash
   * @param txHash Transaction hash to recover public key from
   * @param provider ethers provider to use
   */
  static async instanceFromTransaction(txHash: string, provider: EthersProvider) {
    if (typeof txHash !== 'string' || txHash.length !== lengths.txHash) {
      throw new Error('Invalid transaction hash provided');
    }
    const publicKeyHex = await recoverPublicKeyFromTransaction(txHash, provider);
    return new KeyPair(publicKeyHex);
  }

  /**
   * @notice Takes an uncompressed public key and returns the compressed public key
   * @param publicKey Uncompressed public key, as hex string starting with 0x
   * @returns Object containing the prefix as an integer and compressed public key as hex, as separate parameters
   */
  static compressPublicKey(publicKey: string): CompressedPublicKey {
    assertValidPoint(publicKey);
    const compressedPublicKey = Point.fromHex(publicKey.slice(2)).toHex(true);
    return {
      prefix: Number(compressedPublicKey[1]), // prefix bit is the 2th character in the string (no 0x prefix)
      pubKeyXCoordinate: `0x${compressedPublicKey.slice(2)}`,
    };
  }

  /**
   * @notice Given the x-coordinate of a public key, without the identifying prefix bit, returns
   * the uncompressed public key assuming the identifying bit is 02
   * @dev We don't know if the identifying bit is 02 or 03 when uncompressing for the scanning use case, but it
   * doesn't actually matter since we are not deriving an address from the public key. We use the public key to
   * compute the shared secret to decrypt the random number, and since that involves multiplying this public key
   * by a private key, we can ensure the result is the same shared secret regardless of whether we assume the 02 or
   * 03 prefix by using the compressed form of the hex shared secret and ignoring the prefix. Therefore if no prefix
   * is provided, we can assume 02, and it's up to the user to make sure they are using this method safely. This is
   * done because it saves gas in the Umbra contract
   * @param pkx x-coordinate of compressed public key, as BigNumber or hex string
   * @param prefix Prefix bit, must be 2 or 3
   */
  static getUncompressedFromX(pkx: BigNumberish, prefix: number | string | undefined = undefined) {
    // Converting `pkx` to a BigNumber will throw if the value cannot be safely converted to a BigNumber, i.e. if the
    // value is of type Number and larger than Number.MAX_SAFE_INTEGER.
    pkx = BigNumber.from(pkx);

    // pkx was validated, now we decompress it.
    const hexWithoutPrefix = hexZeroPad(BigNumber.from(pkx).toHexString(), 32).slice(2); // pkx as hex string without 0x prefix
    if (!prefix) {
      // Only safe to use this branch when uncompressed key is using for scanning your funds
      return `0x${Point.fromHex(`02${hexWithoutPrefix}`).toHex()}`;
    }
    const hexWithPrefix = `0${Number(prefix)}${hexWithoutPrefix}`;
    return `0x${Point.fromHex(hexWithPrefix).toHex()}`;
  }
}
