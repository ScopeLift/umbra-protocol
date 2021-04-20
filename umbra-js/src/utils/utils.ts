/**
 * @dev Assortment of helper methods
 */

import {
  AddressZero,
  Contract,
  ContractInterface,
  EtherscanProvider,
  isHexString,
  keccak256,
  resolveProperties,
  serialize as serializeTransaction,
  splitSignature,
} from '../ethers';
import { Signature, recoverPublicKey } from 'noble-secp256k1';
import { ens, cns } from '..';
import { DomainService } from '../classes/DomainService';
import { EthersProvider } from '../types';

// Lengths of various properties when represented as full hex strings
export const lengths = {
  address: 42, // 20 bytes + 0x prefix
  txHash: 66, // 32 bytes + 0x prefix
  privateKey: 66, // 32 bytes + 0x prefix
  publicKey: 132, // 64 bytes + 0x04 prefix
};

// Define addresses that should never be used as the stealth address. If you're sending to these a mistake was
// made somewhere and the funds will not be accessible. Ensure any addresses added to this list are checksum addresses
export const blockedStealthAddresses = [
  AddressZero,
  '0xdcc703c0E500B653Ca82273B7BFAd8045D85a470', // generated from hashing an empty public key, e.g. keccak256('0x')
  '0x59274E3aE531285c24e3cf57C11771ecBf72d9bf', // generated from hashing the zero public key, e.g. keccak256('0x000...000')
];

/**
 * @notice Given a transaction hash, return the public key of the transaction's sender
 * @dev See https://github.com/ethers-io/ethers.js/issues/700 for an example of
 * recovering public key from a transaction with ethers
 * @param txHash Transaction hash to recover public key from
 * @param provider ethers provider instance
 */
export async function recoverPublicKeyFromTransaction(txHash: string, provider: EthersProvider) {
  // Get transaction data
  if (typeof txHash !== 'string' || txHash.length !== lengths.txHash) {
    throw new Error('Invalid transaction hash provided');
  }
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    throw new Error('Transaction not found. Are the provider and transaction hash on the same network?');
  }

  // Reconstruct transaction payload that was originally signed
  const txData = {
    chainId: tx.chainId,
    data: tx.data,
    gasLimit: tx.gasLimit,
    gasPrice: tx.gasPrice,
    nonce: tx.nonce,
    to: tx.to, // this works for both regular and contract transactions
    value: tx.value,
  };

  // Properly format transaction payload to get the correct message
  const resolvedTx = await resolveProperties(txData);
  const rawTx = serializeTransaction(resolvedTx);
  const msgHash = keccak256(rawTx);

  // Recover sender's public key
  const signature = new Signature(BigInt(tx.r), BigInt(tx.s));
  const recoveryParam = splitSignature({ r: tx.r as string, s: tx.s, v: tx.v }).recoveryParam;
  const publicKey = recoverPublicKey(msgHash.slice(2), signature.toHex(), recoveryParam); // without 0x prefix
  if (!publicKey) throw new Error('Could not recover public key');
  return `0x${publicKey}`;
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
 * @param provider ethers provider to use
 */
export async function lookupRecipient(id: string, provider: EthersProvider) {
  // Check if identifier is a public key. If so we just return that directly
  const isPublicKey = id.length === 132 && isHexString(id);
  if (isPublicKey) {
    return { spendingPublicKey: id, viewingPublicKey: id };
  }

  // Check if identifier is a transaction hash
  const isTxHash = id.length === 66 && isHexString(id);
  if (isTxHash) {
    const publicKey = await recoverPublicKeyFromTransaction(id, provider);
    return { spendingPublicKey: publicKey, viewingPublicKey: publicKey };
  }

  // Check if this is a valid address
  const isValidAddress = id.length === 42 && isHexString(id);
  if (isValidAddress) {
    // Get last transaction hash sent by that address
    const txHash = await getSentTransaction(id, provider);
    if (!txHash) {
      throw new Error('Could not get public key because the provided address has not sent any transactions');
    }

    // Get public key from that transaction
    const publicKey = await recoverPublicKeyFromTransaction(txHash, provider);
    return { spendingPublicKey: publicKey, viewingPublicKey: publicKey };
  }

  // Check if this is a valid ENS or CNS name
  const isDomainService = ens.isEnsDomain(id) || cns.isCnsDomain(id);
  if (isDomainService) {
    const domainService = new DomainService(provider);
    return domainService.getPublicKeys(id);
  }

  // Invalid identifier provided
  throw new Error(`Invalid identifier of ${id} provided`);
}

/**
 * @notice Creates and returns a contract instance
 * @param address Contract address
 * @param abi Contract ABI
 * @param provider ethers provider instance
 */
export function createContract(address: string, abi: ContractInterface, provider: EthersProvider) {
  // Use signer if available, otherwise use provider
  const signer = provider.getSigner();
  return new Contract(address, abi, signer || provider);
}
