/**
 * @dev Class for managing secp256k1 keys and performing operations with them
 */

import * as BN from 'bn.js';
import { ec as EC } from 'elliptic';
import { Wallet } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import { hexZeroPad, isHexString } from '@ethersproject/bytes';
import { computePublicKey, SigningKey } from '@ethersproject/signing-key';
import { computeAddress } from '@ethersproject/transactions';
import { RandomNumber } from './RandomNumber';
import { lengths, padHex, recoverPublicKeyFromTransaction } from '../utils/utils';
import { CompressedPublicKey, EncryptedPayload, EthersProvider } from '../types';

const ec = new EC('secp256k1');

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
      const publicKey = ec.g.mul(this.privateKeyHexSlim); // Multiply secp256k1 generator point by private key to get public key
      this.publicKeyHex = `0x${publicKey.encode('hex') as string}`; // Save off public key, other forms computed as getters
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
   * @notice Returns an elliptic instance generated from the public key
   */
  get publicKeyEC() {
    return ec.keyFromPublic(this.publicKeyHex.slice(2), 'hex');
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
    const privateKey = new SigningKey(ephemeralWallet.privateKey);
    const sharedSecret = privateKey.computeSharedSecret(this.publicKeyHex);

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
    if (!output.ephemeralPublicKey || !output.ciphertext) {
      throw new Error('Input must be of type EncryptedPayload to decrypt');
    }
    if (!this.privateKeyHex) {
      throw new Error('KeyPair has no associated private key to decrypt with');
    }

    // Get shared secret to use as decryption key
    const { ephemeralPublicKey, ciphertext } = output;
    const privateKey = new SigningKey(this.privateKeyHex);
    const sharedSecret = privateKey.computeSharedSecret(ephemeralPublicKey);

    // Decrypt
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
      ? (value as string).slice(2) // provided a valid hex string
      : (value as RandomNumber).asHexSlim; // provided RandomNumber

    // Perform the multiplication
    const publicKey = this.publicKeyEC.getPublic().mul(new BN(number, 16));

    // Get x,y hex strings and pad each to 32 bytes
    const x = padHex(publicKey.getX().toString('hex'));
    const y = padHex(publicKey.getY().toString('hex'));

    // Instantiate and return new instance
    return new KeyPair(`0x04${x}${y}`);
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
      ? (value as string) // provided a valid hex string
      : (value as RandomNumber).asHex; // provided RandomNumber

    // Get new private key. This gives us an arbitrarily large number that is not
    // necessarily in the domain of the secp256k1 elliptic curve
    const privateKeyFull = this.privateKeyBN.mul(number);

    // Modulo operation to get private key to be in correct range, where ec.n gives the
    // order of our curve. We add the 0x prefix as it's required by ethers.js
    const privateKeyMod = privateKeyFull.mod(`0x${(ec.n as BN).toString('hex')}`);

    // Remove 0x prefix to pad hex value, then add back 0x prefix
    const privateKey = `0x${padHex(privateKeyMod.toHexString().slice(2))}`;

    // Instantiate and return new instance
    return new KeyPair(privateKey);
  }

  // ================================================= STATIC METHODS ==================================================
  /**
   * @notice Generate KeyPair instance asynchronously from a transaction hash
   * @param txHash Transaction hash to recover public key from
   * @param provider web3 provider to use (not an ethers provider)
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
    if (typeof publicKey !== 'string' || !isHexString(publicKey) || publicKey.length !== lengths.publicKey) {
      throw new Error('Must provide uncompressed public key as hex string');
    }
    const compressedPublicKey = computePublicKey(publicKey, true);
    return {
      prefix: Number(compressedPublicKey[3]), // prefix bit is the 4th character in the string (e.g. 0x03)
      pubKeyXCoordinate: `0x${compressedPublicKey.slice(4)}`,
    };
  }

  /**
   * @notice Given the x-coordinate of a public key, without the identifying prefix bit, returns
   * the uncompressed public key assuming the identifying bit is 02
   * @dev We don't know if the identifying bit is 02 or 03 when uncompressing for the scanning use
   * case, but it doesn't actually matter since we are not deriving an address from the public key.
   * We use the public key to compute the shared secret to decrypt the random number, and since that
   * involves multiplying this public key by a private key, the result is the same shared secret
   * regardless of whether we assume the 02 or 03 prefix. Therefore if no prefix is provided, we
   * can assume 02, and it's up to the user to make sure they are using this method safely.I
   * @param pkx x-coordinate of compressed public key, as BigNumber or hex string
   * @param prefix Prefix bit, must be 2 or 3
   */
  static getUncompressedFromX(pkx: BigNumber | string, prefix: number | string | undefined = undefined) {
    if (!(pkx instanceof BigNumber) && typeof pkx !== 'string') {
      throw new Error('Compressed public key must be a BigNumber or string');
    }
    if (!prefix) {
      // Only safe to use this branch when uncompressed key is using for scanning your funds
      const hexWithoutPrefix = BigNumber.from(pkx).toHexString().slice(2);
      return computePublicKey(BigNumber.from(`0x02${hexWithoutPrefix}`).toHexString());
    }
    const hexWithoutPrefix = padHex(BigNumber.from(pkx).toHexString().slice(2));
    const hexWithPrefix = `0x0${Number(prefix)}${hexWithoutPrefix}`;
    return computePublicKey(BigNumber.from(hexWithPrefix).toHexString());
  }
}
