/**
 * @dev Functions for interacting with the Unstoppable Domains Crypto Name Service (CNS)
 */

import { default as Resolution } from '@unstoppabledomains/resolution';
import type { EthersProvider, TransactionResponse } from '../types';
import * as cnsResolverAbi from '../abi/CnsResolver.json';
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
 * @notice For a given ENS domain, returns the public keys, or throws if they don't exist
 * @param name CNS domain, e.g. myname.crypto
 * @param resolution Resolution instance of @unstoppabledomains/resolution
 */
export async function getPublicKeys(name: string, resolution: Resolution) {
  const spendingPublicKey = await resolution.record(name, cnsKeyPathSpending).catch((_err) => {
    throw new Error(`Public keys not found for ${name}. User must setup their Umbra account`);
  });
  const viewingPublicKey = await resolution.record(name, cnsKeyPathViewing).catch((_err) => {
    throw new Error(`Public keys not found for ${name}. User must setup their Umbra account`);
  });
  return { spendingPublicKey, viewingPublicKey };
}

/**
 * @notice For a given CNS domain, sets the associated umbra signature
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
  console.log('spendingPublicKey: ', spendingPublicKey);
  console.log('viewingPublicKey: ', viewingPublicKey);
  const domainNamehash = resolution.namehash(name);
  console.log('domainNamehash: ', domainNamehash);
  const resolverAddress = await resolution.resolver(domainNamehash);
  console.log('resolverAddress: ', resolverAddress);
  const cnsResolver = createContract(resolverAddress, cnsResolverAbi, provider);
  const txSpending = await cnsResolver.set(cnsKeyPathSpending, spendingPublicKey, domainNamehash);
  const txViewing = await cnsResolver.set(cnsKeyPathViewing, viewingPublicKey, domainNamehash);
  return { txSpending: txSpending as TransactionResponse, txViewing: txViewing as TransactionResponse };
}
