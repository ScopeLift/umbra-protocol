/**
 * @dev Class for managing secp256k1 keys and performing operations with them
 */

import * as BN from 'bn.js';
import { ec as EC } from 'elliptic';
import { Wallet } from 'ethers';
import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { arrayify, hexZeroPad, isHexString } from '@ethersproject/bytes';
import { computePublicKey, SigningKey } from '@ethersproject/signing-key';
import { keccak256 } from 'js-sha3';
import type { RandomNumber } from './RandomNumber';
import { padHex, recoverPublicKeyFromTransaction } from '../utils/utils';
import { CompressedPublicKey, EthersProvider } from '../types';

const ec = new EC('secp256k1');

export interface EncryptedPayload {
  ephemeralPublicKey: string;
  ciphertext: string;
}

export class KeyPair {
  // Public key as hex string with 0x prefix
  readonly publicKeyHex: string;

  // Private key is optional, so initialize to null
  readonly privateKeyHex: string | null = null;
  readonly privateKeyHexSlim: string | null = null;
  readonly privateKeyEC: EC.KeyPair | null = null;
  readonly privateKeyBN: BigNumber | null = null;

  /**
   * @notice Creates new instance from a public key or private key
   * @param key Can be either (1) hex public key with 0x04 prefix, or (2) hex private key with 0x prefix
   */
  constructor(key: string) {
    // Input checks
    if (!isHexString(key)) throw new Error('Key must be in hex format with 0x prefix');

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
      throw new Error('Key must be a 66 character hex private key or a 132 character hex public key');
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
    return arrayify(this.publicKeyHex);
  }

  /**
   * @notice Returns checksum address derived from this key
   */
  get address() {
    const hash = keccak256(Buffer.from(this.publicKeyHexSlim, 'hex'));
    const addressBuffer = Buffer.from(hash, 'hex');
    const address = `0x${addressBuffer.slice(-20).toString('hex')}`;
    return getAddress(address);
  }

  // ENCRYPTION / DECRYPTION =======================================================================
  /**
   * @notice Encrypt a random number with the instance's public key
   * @param randomNumber Random number as instance of RandomNumber class
   * @returns Hex strings of uncompressed 65 byte public key and 32 byte ciphertext
   */
  encrypt(randomNumber: RandomNumber): EncryptedPayload {
    // Get shared secret to use as encryption key
    const ephemeralWallet = Wallet.createRandom();
    const privateKey = new SigningKey(ephemeralWallet.privateKey);
    const sharedSecret = privateKey.computeSharedSecret(this.publicKeyHex);

    // XOR random number with shared secret to get encrypted value
    const ciphertext = randomNumber.value.xor(sharedSecret);
    const result = {
      ephemeralPublicKey: ephemeralWallet.publicKey, // hex string
      ciphertext: hexZeroPad(ciphertext.toHexString(), 32), // hex string
    };
    return result;
  }

  /**
   * @notice Decrypt a random number with the instance's private key and return the plaintext
   * @param output Output from the encrypt method, which can be constructed from on-chain events
   * @returns Decrypted ciphertext as hex string
   */
  decrypt(output: EncryptedPayload) {
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

  // ELLIPTIC CURVE MATH ===========================================================================
  /**
   * @notice Returns new KeyPair instance after multiplying this public key by some value
   * @param value number to multiply by, as RandomNumber or hex string with 0x prefix
   */
  mulPublicKey(value: RandomNumber | string) {
    const number = isHexString(value)
      ? (value as string).slice(2) // provided a valid hex string
      : (value as RandomNumber).asHexSlim; // provided RandomNumber

    // Perform the multiplication
    const publicKey = this.publicKeyEC.getPublic().mul(new BN(number, 16));

    // Get x,y hex strings
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
    if (!this.privateKeyBN) {
      throw new Error('KeyPair has no associated private key to multiply');
    }

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

  // STATIC METHODS ================================================================================
  /**
   * @notice Generate KeyPair instance asynchronously from a transaction hash
   * @param txHash Transaction hash to recover public key from
   * @param provider web3 provider to use (not an ethers provider)
   */
  static async instanceFromTransaction(txHash: string, provider: EthersProvider) {
    const publicKeyHex = await recoverPublicKeyFromTransaction(txHash, provider);
    return new KeyPair(publicKeyHex);
  }

  /**
   * @notice Takes an uncompressed public key and returns the compressed public key
   * @param publicKey Uncompressed public key, as hex string starting with 0x
   * @returns Object containing the prefix as an integer and compressed public key as hex, as separate parameters
   */
  static compressPublicKey(publicKey: string): CompressedPublicKey {
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
