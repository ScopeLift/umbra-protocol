/**
 * @dev Assortment of helper methods
 */

import { arrayify, Bytes, Hexable, isHexString, joinSignature } from '@ethersproject/bytes';
import { hashMessage } from '@ethersproject/hash';
import { keccak256 } from '@ethersproject/keccak256';
import { resolveProperties } from '@ethersproject/properties';
import { EtherscanProvider } from '@ethersproject/providers';
import { recoverPublicKey } from '@ethersproject/signing-key';
import { serialize as serializeTransaction } from '@ethersproject/transactions';

import * as constants from '../constants.json';
import { DomainService } from '../classes/DomainService';
import { EthersProvider, SignatureLike } from '../types';

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
 * @param txHash Transaction hash to recover public key from
 * @param provider ethers provider instance
 */
export async function recoverPublicKeyFromTransaction(txHash: string, provider: EthersProvider) {
  // Get transaction data
  const tx = await provider.getTransaction(txHash);

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

/**
 * @notice Returns the transaction hash of the first transaction sent by an address, or
 * undefined if none was found
 * @param address Address to lookup
 * @param provider ethers provider instance
 */
async function getSentTransaction(address: string, ethersProvider: EthersProvider) {
  const network = await ethersProvider.getNetwork();
  const etherscanProvider = new EtherscanProvider(network.chainId);
  const history = await etherscanProvider.getHistory(address);
  let txHash;
  for (let i = 0; i < history.length; i += 1) {
    const tx = history[i];
    if (tx.from === address) {
      txHash = tx.hash;
      break;
    }
  }
  return txHash;
}

/**
 * @notice Returns public keys from the recipientId
 * @param id Recipient identifier, must be an ENS name, CNS name, address, transaction hash, or public key
 * @param provider web3 provider to use (not an ethers provider)
 */
export async function lookupRecipient(id: string, provider: EthersProvider) {
  // Check if identifier is a public key. If so we just return that directly
  const isPublicKey = id.length === 132 && isHexString(id) && id.startsWith('0x04');
  if (isPublicKey) {
    return { generationPublicKey: id, encryptionPublicKey: id };
  }

  // Check if identifier is a transaction hash
  const isTxHash = id.length === 66 && isHexString(id) && id.startsWith('0x');
  if (isTxHash) {
    const publicKey = await recoverPublicKeyFromTransaction(id, provider);
    return { generationPublicKey: publicKey, encryptionPublicKey: publicKey };
  }

  // Check if this is a valid address
  const isValidAddress = id.length === 42 && isHexString(id) && id.startsWith('0x');
  if (isValidAddress) {
    // Get last transaction hash sent by that address
    const txHash = await getSentTransaction(id, provider);
    if (!txHash) {
      throw new Error('The provider address has not sent any transactions');
    }

    // Get public key from that transaction
    const publicKey = await recoverPublicKeyFromTransaction(txHash, provider);
    return { generationPublicKey: publicKey, encryptionPublicKey: publicKey };
  }

  // Check if this is a valid ENS or CNS name
  const isDomainService = id.endsWith('.eth') || id.endsWith('.crypto');
  if (isDomainService) {
    const domainService = new DomainService(provider);
    const publicKey = await domainService.getPublicKey(id);
    return { generationPublicKey: publicKey, encryptionPublicKey: publicKey };
  }

  // Invalid identifier provided
  throw new Error('Invalid id provided');
}
