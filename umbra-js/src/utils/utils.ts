/**
 * @dev Assortment of helper methods
 */

import {
  AddressZero,
  Contract,
  ContractInterface,
  EtherscanProvider,
  getAddress,
  isHexString,
  keccak256,
  resolveProperties,
  serialize as serializeTransaction,
  splitSignature,
} from '../ethers';
import { Point, Signature, recoverPublicKey } from 'noble-secp256k1';
import { ens, cns } from '..';
import { default as Resolution, Eip1993Factories } from '@unstoppabledomains/resolution';
import { StealthKeyRegistry } from '../classes/StealthKeyRegistry';
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
  signature.assertValidity();
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
  address = getAddress(address); // address input validation
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

// Takes an ENS, CNS, or address, and returns the checksummed address
export async function toAddress(name: string, provider: EthersProvider) {
  // First try ENS
  let address: string | null = null;
  address = await resolveEns(name, provider); // will never throw, but returns null on failure
  if (address) return address;

  // Then try CNS
  address = await resolveCns(name, provider); // will never throw, but returns null on failure
  if (address) return address;

  return getAddress(name);
}

/**
 * @notice Returns public keys from the recipientId
 * @dev When providing a public key, transaction hash, or address with advanced mode, the spending and viewing
 * public keys will be the same. Only keys retrieved from the StealthKeyRegistry will have different spending
 * and viewing keys
 * @param id Recipient identifier, must be an ENS name, CNS name, address, transaction hash, or public key
 * @param provider ethers provider to use
 * @param options Object containing lookup options:
 *   advanced: looks for public keys in StealthKeyRegistry when false, recovers them from on-chain transaction when true
 *   supportPubKey: default false, when true allows a public key to be provided directly
 *   supportTxHash: default false, when true allows public key to be recovered from the specified transaction hash
 */
export async function lookupRecipient(
  id: string,
  provider: EthersProvider,
  {
    advanced,
    supportPubKey,
    supportTxHash,
  }: { advanced?: boolean; supportPubKey?: boolean; supportTxHash?: boolean } = {}
) {
  // Check if identifier is a public key. If so we just return that directly
  const isPublicKey = id.length === 132 && isHexString(id);
  if (supportPubKey && isPublicKey) {
    assertValidPoint(id);
    return { spendingPublicKey: id, viewingPublicKey: id };
  }

  // Check if identifier is a transaction hash. If so, we recover the sender's public keys from the transaction
  const isTxHash = id.length === 66 && isHexString(id);
  if (supportTxHash && isTxHash) {
    const publicKey = await recoverPublicKeyFromTransaction(id, provider);
    assertValidPoint(publicKey);
    return { spendingPublicKey: publicKey, viewingPublicKey: publicKey };
  }

  // The remaining checks are dependent on the advanced mode option. The provided identifier is now either an
  // ENS name, CNS name, or address, so we resolve it to an address
  const address = await toAddress(id, provider); // throws if an invalid address is provided

  // If we're not using advanced mode, use the StealthKeyRegistry
  if (!advanced) {
    const registry = new StealthKeyRegistry(provider);
    return registry.getStealthKeys(address);
  }

  // Otherwise, get public key based on the most recent transaction sent by that address
  const txHash = await getSentTransaction(address, provider);
  if (!txHash) throw new Error('Could not get public key because the provided account has not sent any transactions');
  const publicKey = await recoverPublicKeyFromTransaction(txHash, provider);
  assertValidPoint(publicKey);
  return { spendingPublicKey: publicKey, viewingPublicKey: publicKey };
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

/**
 * @notice Throws if provided public key is not on the secp256k1 curve
 * @param point Uncompressed public key as hex string
 */
export function assertValidPoint(point: string) {
  if (typeof point !== 'string' || (point.length !== 130 && point.length !== 132)) {
    throw new Error('Must provide uncompressed public key as hex string');
  }
  if (point.length === 130) Point.fromHex(point);
  if (point.length === 132) Point.fromHex(point.slice(2)); // trim 0x prefix
}

/**
 * @notice Returns the public keys associated with the provided name, using the legacy lookup approach
 * @param name Name or domain to test
 * @param provider ethers provider instance
 */
export async function getPublicKeysLegacy(name: string, provider: EthersProvider) {
  if (!isDomain(name)) throw new Error(`Name ${name} is not a valid domain`);
  try {
    // First try ENS (throws on failure)
    return ens.getPublicKeys(name, provider);
  } catch (e) {
    // Fallback to CNS
    return cns.getPublicKeys(name, provider, getResolutionInstance(provider));
  }
}

/**
 * @notice Returns true if the provided name is a valid domain, without the protocol identifier such as https://
 * @param name Name or domain to test
 */
export function isDomain(name: string) {
  const regex = /^([a-z0-9|-]+\.)*[a-z0-9|-]+\.[a-z]+$/; // https://stackoverflow.com/questions/8959765/need-regex-to-get-domain-subdomain/8959842
  return regex.test(name);
}

// --- Private helper methods ---

/**
 * @notice Returns an instance of the UD Resolution library
 * @param provider ethers provider instance
 */
function getResolutionInstance(provider: EthersProvider) {
  // If network name is homestead, use 'mainnet' as the network name
  const networkName = provider.network.name === 'homestead' ? 'mainnet' : provider.network.name;
  return new Resolution({
    sourceConfig: {
      cns: {
        provider: Eip1993Factories.fromEthersProvider(provider),
        network: networkName as 'mainnet' | 'rinkeby',
      },
    },
  });
}

/**
 * @notice Attempt to resolve an ENS name, and return null on failure
 * @param name
 * @param provider
 * @returns
 */
async function resolveEns(name: string, provider: EthersProvider) {
  try {
    const address = await provider.resolveName(name);
    return address || null;
  } catch (e) {
    return null;
  }
}

/**
 * @notice Attempt to resolve a CNS name, and return null on failure
 * @param name
 * @param provider
 * @returns
 */
async function resolveCns(name: string, provider: EthersProvider) {
  try {
    const resolution = getResolutionInstance(provider);
    const address = await resolution.addr(name, 'ETH');
    return address || null;
  } catch (e) {
    return null;
  }
}
