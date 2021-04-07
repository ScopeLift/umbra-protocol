/**
 * @dev Functions for interacting with the Unstoppable Domains Crypto Name Service (CNS)
 */
import { Point } from 'noble-secp256k1';
import { default as Resolution } from '@unstoppabledomains/resolution';
import type { EthersProvider, TransactionResponse } from '../types';
import * as cnsResolverAbi from '../abi/CNSResolver.json';
import { createContract } from './utils';

export const cnsKeyPathSpending = 'crypto.ETH.umbra.spending_public_key';
export const cnsKeyPathViewing = 'crypto.ETH.umbra.viewing_public_key';

/**
 * @notice Returns supported CNS domain endings
 */
export const supportedCnsDomains = ['.crypto', '.zil'];

/**
 * @notice Returns true if the provided name is an CNS domain, false otherwise
 * @param domainName Name to check
 */
export function isCnsDomain(domainName: string) {
  for (const suffix of supportedCnsDomains) {
    if (domainName.endsWith(suffix)) {
      return true;
    }
  }
  return false;
}

/**
 * @notice Computes CNS namehash of the input CNS domain, normalized to CNS compatibility
 * @param name CNS domain, e.g. myname.crypto
 * @param resolution Resolution instance of @unstoppabledomains/resolution
 */
export function namehash(name: string, resolution: Resolution) {
  if (typeof name !== 'string') {
    throw new Error('Name must be a string with a supported suffix');
  }
  if (!isCnsDomain(name)) {
    throw new Error(`Name does not end with supported suffix: ${supportedCnsDomains.join(', ')}`);
  }
  return resolution.namehash(name);
}

/**
 * @notice For a given CNS domain, returns the public keys, or throws if they don't exist
 * @param name CNS domain, e.g. myname.crypto
 * @param provider ethers provider to use
 * @param resolution Resolution instance of @unstoppabledomains/resolution
 */
export async function getPublicKeys(name: string, provider: EthersProvider, resolution: Resolution) {
  // Read compressed public keys
  const domainNamehash = resolution.namehash(name);
  const resolverAddress = await resolution.resolver(name);
  const cnsResolver = createContract(resolverAddress, cnsResolverAbi, provider);
  const [compressedSpendingPublicKey, compressedViewingPublicKey] = await cnsResolver.getMany(
    [cnsKeyPathSpending, cnsKeyPathViewing],
    domainNamehash
  );
  if (!compressedSpendingPublicKey || !compressedViewingPublicKey) {
    throw new Error(`Public keys not found for ${name}. User must setup their Umbra account`);
  }
  // Return uncompressed public keys
  const spendingPublicKey = `0x${Point.fromHex(compressedSpendingPublicKey.slice(2)).toHex()}`;
  const viewingPublicKey = `0x${Point.fromHex(compressedViewingPublicKey.slice(2)).toHex()}`;
  return { spendingPublicKey, viewingPublicKey };
}

/**
 * @notice For a given CNS domain, sets the associated umbra public keys
 * @param name CNS domain, e.g. myname.crypto
 * @param spendingPublicKey The public key for generating a stealth address as hex string
 * @param viewingPublicKey The public key to use for encryption as hex string
 * @param provider ethers provider to use
 * @param resolution Resolution instance of @unstoppabledomains/resolution
 * @returns Transaction hash
 */
export async function setPublicKeys(
  name: string,
  spendingPublicKey: string,
  viewingPublicKey: string,
  provider: EthersProvider,
  resolution: Resolution
) {
  // Compress public keys
  const compressedSpendingPublicKey = `0x${Point.fromHex(spendingPublicKey.slice(2)).toHex(true)}`;
  const compressedViewingPublicKey = `0x${Point.fromHex(viewingPublicKey.slice(2)).toHex(true)}`;

  // Send transaction to set the keys
  const domainNamehash = resolution.namehash(name);
  const resolverAddress = await resolution.resolver(name);
  const cnsResolver = createContract(resolverAddress, cnsResolverAbi, provider);
  const tx = await cnsResolver.setMany(
    [cnsKeyPathSpending, cnsKeyPathViewing],
    [compressedSpendingPublicKey, compressedViewingPublicKey],
    domainNamehash
  );
  return tx as TransactionResponse;
}
