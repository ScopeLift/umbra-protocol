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

export function compressedPublicKeyFromX(pkx: BigNumberish, prefix: number | string = 2) {
  const normalizedPrefix = Number(prefix);
  if (normalizedPrefix !== 2 && normalizedPrefix !== 3) {
    throw new Error('Invalid public key prefix');
  }

  const publicKeyXCoordinate = hexZeroPad(BigNumber.from(pkx).toHexString(), 32).slice(2);
  return `0x0${normalizedPrefix}${publicKeyXCoordinate}`;
}

export function getSharedSecretHash(privateKey: string, publicKey: string) {
  const normalizedPrivateKey = normalizePrivateKey(privateKey);
  const normalizedPublicKey = normalizePublicKey(publicKey);

  // We ignore the first byte so the shared secret does not depend on the compressed key prefix.
  const sharedSecret = nobleGetSharedSecret(normalizedPrivateKey, normalizedPublicKey, true);
  const sharedSecretHex = nobleUtils.bytesToHex(sharedSecret);
  return sha256(`0x${sharedSecretHex.slice(2)}`);
}
