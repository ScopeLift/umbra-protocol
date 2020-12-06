/**
 * @dev Assortment of helper methods
 */

import { arrayify, Bytes, Hexable, isHexString, joinSignature } from '@ethersproject/bytes';
import { hashMessage } from '@ethersproject/hash';
import { keccak256 } from '@ethersproject/keccak256';
import { resolveProperties } from '@ethersproject/properties';
import { Web3Provider } from '@ethersproject/providers';
import { recoverPublicKey } from '@ethersproject/signing-key';
import { serialize as serializeTransaction } from '@ethersproject/transactions';
import { ExternalProvider, SignatureLike } from '../types';
import * as constants from '../constants.json';

/**
 * @notice Adds leading zeroes to ensure hex strings are the expected length.
 * @dev We always expect a hex value to have the full number of characters for its size,
 * so we use this tool to ensure no errors occur due to wrong hex character lengths.
 * Specifically, we need to pad hex values during the following cases:
 *   1. It seems elliptic strips unnecessary leading zeros when pulling out x and y
 *      coordinates from public keys.
 *   2. When computing a new private key from a random number, the new number (i.e. the new
 *      private key) may not necessarily require all 32-bytes as ethers.js also seems to
 *      strip leading zeroes.
 *   3. When generating random numbers and returning them as hex strings, the leading
 *      zero bytes get stripped
 * @param hex String to pad, without leading 0x
 * @param bytes Number of bytes string should have
 */
export function padHex(hex: string, bytes = 32) {
  if (!isHexString) throw new Error('Input is not a valid hex string');
  if (hex.slice(0, 2) === '0x') throw new Error('Input must not contain 0x prefix');
  return hex.padStart(bytes * 2, '0');
}

/**
 * @notice Convert hex string with 0x prefix into Buffer
 * @param value Hex string to convert
 */
export function hexStringToBuffer(value: string | number | Bytes | Hexable) {
  return Buffer.from(arrayify(value));
}

/**
 * @notice Given a transaction hash, return the public key of the transaction's sender
 * @dev See https://github.com/ethers-io/ethers.js/issues/700 for an example of
 * recovering public key from a transaction with ethers
 * @param {String} txHash Transaction hash to recover public key from
 * @param {*} provider web3 provider to use (not an ethers provider)
 */
export async function recoverPublicKeyFromTransaction(txHash: string, provider: ExternalProvider) {
  // Get transaction data
  const ethersProvider = new Web3Provider(provider);
  const tx = await ethersProvider.getTransaction(txHash);

  // Get original signature
  const splitSignature: SignatureLike = {
    r: tx.r as string,
    s: tx.s,
    v: tx.v,
  };
  const signature = joinSignature(splitSignature);

  // Reconstruct transaction data that was originally signed
  const txData = {
    chainId: tx.chainId,
    data: tx.data,
    gasLimit: tx.gasLimit,
    gasPrice: tx.gasPrice,
    nonce: tx.nonce,
    to: tx.to, // this works for both regular and contract transactions
    value: tx.value,
  };

  // Properly format it to get the correct message
  const resolvedTx = await resolveProperties(txData);
  const rawTx = serializeTransaction(resolvedTx);
  const msgHash = keccak256(rawTx);
  const msgBytes = arrayify(msgHash);

  // Recover sender's public key and address
  const publicKey = recoverPublicKey(msgBytes, signature);
  return publicKey;
}

/**
 * @notice Returns the public key recovered from the signature
 */
export function getPublicKeyFromSignature(signature: SignatureLike) {
  const msgHash = hashMessage(constants.UMBRA_MESSAGE);
  const msgHashBytes = arrayify(msgHash);
  const publicKey = recoverPublicKey(msgHashBytes, signature);
  return publicKey;
}
