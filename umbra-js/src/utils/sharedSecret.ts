/**
 * Shared secp256k1 helpers for encryption/decryption paths.
 * Scanning can pass compressed announcement pubkeys here directly, which avoids expanding `pkx`
 * into a full uncompressed key inside the hot loop.
 */

import { getSharedSecret as nobleGetSharedSecret, Point, utils as nobleUtils } from '@noble/secp256k1';
import { BigNumber, BigNumberish, hexZeroPad, isHexString, sha256 } from '../ethers';

const compressedPublicKeyLength = 66;
const uncompressedPublicKeyLength = 130;
const privateKeyLength = 64;

/**
 * @notice Validates a compressed or uncompressed public key and strips its 0x prefix for noble helpers
 * @param publicKey Public key as hex string with 0x prefix
 * @returns Public key hex without the 0x prefix
 */
function normalizePublicKey(publicKey: string) {
  if (typeof publicKey !== 'string' || !isHexString(publicKey)) {
    throw new Error('Invalid public key');
  }

  const normalizedPublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
  const isCompressed = normalizedPublicKey.length === compressedPublicKeyLength;
  const isUncompressed = normalizedPublicKey.length === uncompressedPublicKeyLength;
  if (!isCompressed && !isUncompressed) {
    throw new Error('Invalid public key');
  }

  const point = Point.fromHex(normalizedPublicKey);
  point.assertValidity();
  return normalizedPublicKey;
}

/**
 * @notice Validates a secp256k1 private key and strips its 0x prefix for noble helpers
 * @param privateKey Private key as hex string with 0x prefix
 * @returns Private key hex without the 0x prefix
 */
function normalizePrivateKey(privateKey: string) {
  if (typeof privateKey !== 'string' || !isHexString(privateKey) || privateKey.length !== privateKeyLength + 2) {
    throw new Error('Invalid private key');
  }

  const normalizedPrivateKey = privateKey.slice(2);
  if (!nobleUtils.isValidPrivateKey(normalizedPrivateKey)) {
    throw new Error('Invalid private key');
  }

  return normalizedPrivateKey;
}

/**
 * @notice Rebuilds a compressed secp256k1 public key from its x-coordinate and prefix bit
 * @param pkx x-coordinate of the compressed public key
 * @param prefix Prefix byte, must be 2 or 3
 * @returns Compressed public key as a 0x-prefixed hex string
 */
export function compressedPublicKeyFromX(pkx: BigNumberish, prefix: number | string = 2) {
  const normalizedPrefix = Number(prefix);
  if (normalizedPrefix !== 2 && normalizedPrefix !== 3) {
    throw new Error('Invalid public key prefix');
  }

  const publicKeyXCoordinate = hexZeroPad(BigNumber.from(pkx).toHexString(), 32).slice(2);
  return `0x0${normalizedPrefix}${publicKeyXCoordinate}`;
}

/**
 * @notice Computes the Umbra shared-secret hash for a private/public key pair
 * @dev The first byte is discarded so compressed keys with different prefix parity still derive the same secret
 * @param privateKey Private key as hex string with 0x prefix
 * @param publicKey Compressed or uncompressed public key as hex string with 0x prefix
 * @returns 32-byte sha256 hash of the ECDH shared secret
 */
export function getSharedSecretHash(privateKey: string, publicKey: string) {
  const normalizedPrivateKey = normalizePrivateKey(privateKey);
  const normalizedPublicKey = normalizePublicKey(publicKey);

  // We ignore the first byte so the shared secret does not depend on the compressed key prefix.
  const sharedSecret = nobleGetSharedSecret(normalizedPrivateKey, normalizedPublicKey, true);
  const sharedSecretHex = nobleUtils.bytesToHex(sharedSecret);
  return sha256(`0x${sharedSecretHex.slice(2)}`);
}
