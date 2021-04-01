/**
 * @dev Class for managing secp256k1 keys and performing operations with them
 */

import * as secp from 'noble-secp256k1';
import { Wallet } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import { hexZeroPad, isHexString } from '@ethersproject/bytes';
import { sha256 } from '@ethersproject/sha2';
import { computeAddress } from '@ethersproject/transactions';
import { RandomNumber } from './RandomNumber';
import { lengths, padHex, recoverPublicKeyFromTransaction } from '../utils/utils';
import { CompressedPublicKey, EncryptedPayload, EthersProvider } from '../types';

export class KeyPair {
  readonly publicKeyHex: string; // Public key as hex string with 0x04 prefix
  readonly privateKeyHex: string | null = null; // Private key as hex string with 0x prefix, or null if not provided

  /**
   * @notice Creates new instance from a public key or private key
   * @param key Can be either (1) hex public key with 0x04 prefix, or (2) hex private key with 0x prefix
   */
  constructor(key: string) {
    // Input checks
    if (typeof key !== 'string' || !isHexString(key)) {
      throw new Error('Key must be a string in hex format with 0x prefix');
    }

    // Handle input
    if (key.length === lengths.privateKey) {
      // Private key provided
      this.privateKeyHex = key;
      const publicKey = secp.getPublicKey(this.privateKeyHexSlim as string); // hex without 0x prefix but with 04 prefix
      this.publicKeyHex = `0x${publicKey}`; // Save off version with 0x prefix, other forms computed as getters
    } else if (key.length === lengths.publicKey) {
      // Public key provided
      this.publicKeyHex = key; // Save off public key, other forms computed as getters
    } else {
      throw new Error('Key must be a 66 character hex private key or a 132 character hex public key');
    }
  }

  // ===================================================== GETTERS =====================================================

  /**
   * @notice Returns the private key as an ethers BigNumber
   */
  get privateKeyBN() {
    return this.privateKeyHex ? BigNumber.from(this.privateKeyHex) : null;
  }

  /**
   * @notice Returns the private key as a hex string without the 0x prefix
   */
  get privateKeyHexSlim() {
    return this.privateKeyHex ? this.privateKeyHex.slice(2) : null;
  }

  /**
   * @notice Returns checksum address derived from this key
   */
  get address() {
    return computeAddress(this.publicKeyHex);
  }

  // ============================================= ENCRYPTION / DECRYPTION =============================================

  /**
   * @notice Encrypt a random number with the instance's public key
   * @param randomNumber Random number as instance of RandomNumber class
   * @returns Hex strings of uncompressed 65 byte public key and 32 byte ciphertext
   */
  encrypt(randomNumber: RandomNumber): EncryptedPayload {
    if (!(randomNumber instanceof RandomNumber)) {
      throw new Error('Must provide instance of RandomNumber');
    }
    // Get shared secret to use as encryption key
    const ephemeralWallet = Wallet.createRandom();
    const sharedSecret = KeyPair.getSharedSecret(ephemeralWallet.privateKey, this.publicKeyHex);

    // XOR random number with shared secret to get encrypted value
    const ciphertext = randomNumber.value.xor(sharedSecret);
    const result = {
      ephemeralPublicKey: ephemeralWallet.publicKey, // hex string with 0x04 prefix
      ciphertext: hexZeroPad(ciphertext.toHexString(), 32), // hex string with 0x prefix
    };
    return result;
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

    // Get shared secret to use as decryption key, then decrypt with XOR
    const sharedSecret = KeyPair.getSharedSecret(this.privateKeyHex, ephemeralPublicKey);
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

    const number = isHexString(value)
      ? BigInt(value as string) // provided a valid hex string
      : BigInt((value as RandomNumber).asHex); // provided RandomNumber

    // Perform the multiplication
    const publicKey = secp.Point.fromHex(this.publicKeyHex.slice(2)).multiply(number);

    // Return new KeyPair instance
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
    if (!this.privateKeyBN) {
      throw new Error('KeyPair has no associated private key');
    }

    // Parse the number provided
    const number = isHexString(value)
      ? BigInt(value as string) // provided a valid hex string
      : BigInt((value as RandomNumber).asHex); // provided RandomNumber

    // Get new private key. Multiplication gives us an arbitrarily large number that is not necessarily in the domain
    // of the secp256k1 curve, so then we use modulus operation to get in the correct range. We save it as a BigNumber
    // for converting to hex
    const privateKeyMod = BigNumber.from((BigInt(this.privateKeyHex) * number) % secp.CURVE.n);

    // Remove 0x prefix to pad hex value, then add back 0x prefix
    const privateKey = `0x${padHex(privateKeyMod.toHexString().slice(2))}`;

    // Return new KeyPair instance
    return new KeyPair(privateKey);
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
   * @notice Returns the shared secret for a given private key and public key
   * @param privateKey Private key as hex string with 0x prefix
   * @param publicKey Uncompressed public key as hex string with 0x04 prefix
   * @returns 32-byte shared secret as 66 character hex string
   */
  static getSharedSecret(privateKey: string, publicKey: string) {
    if (privateKey.length !== lengths.privateKey || !isHexString(privateKey)) throw new Error('Invalid private key');
    if (publicKey.length !== lengths.publicKey || !isHexString(publicKey)) throw new Error('Invalid public key');

    // We use getSharedSecret(pk,Pk,true).slice() to ensure the shared secret is not dependent on the prefix, which
    // enables us to uncompress ephemeralPublicKey from Umbra.sol logs as explained in comments of getUncompressedFromX
    const sharedSecretRaw = secp.getSharedSecret(privateKey.slice(2), publicKey.slice(2), true).slice(2);
    return sha256(`0x${sharedSecretRaw}`);
  }

  /**
   * @notice Takes an uncompressed public key and returns the compressed public key
   * @param publicKey Uncompressed public key, as hex string starting with 0x
   * @returns Object containing the prefix as an integer and compressed public key as hex, as separate parameters
   */
  static compressPublicKey(publicKey: string): CompressedPublicKey {
    if (typeof publicKey !== 'string' || !isHexString(publicKey) || publicKey.length !== lengths.publicKey) {
      throw new Error('Must provide uncompressed public key as hex string');
    }
    const compressedPublicKey = secp.Point.fromHex(publicKey.slice(2)).toHex(true);
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
  static getUncompressedFromX(pkx: BigNumber | string, prefix: number | string | undefined = undefined) {
    if (!(pkx instanceof BigNumber) && typeof pkx !== 'string') {
      throw new Error('Compressed public key must be a BigNumber or string');
    }
    const hexWithoutPrefix = padHex(BigNumber.from(pkx).toHexString().slice(2));
    if (!prefix) {
      // Only safe to use this branch when uncompressed key is using for scanning your funds
      return `0x${secp.Point.fromHex(`02${hexWithoutPrefix}`).toHex()}`;
    }
    const hexWithPrefix = `0${Number(prefix)}${hexWithoutPrefix}`;
    return `0x${secp.Point.fromHex(hexWithPrefix).toHex()}`;
  }
}
