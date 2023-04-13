/**
 * @dev Functions for interacting with the Unstoppable Domains Crypto Name Service (CNS)
 */
import { Point } from '@noble/secp256k1';
import { default as Resolution, NamingServiceName } from '@unstoppabledomains/resolution';
import type { EthersProvider } from '../types';
import { CNS_RESOLVER_ABI } from './constants';
import { Contract } from '../ethers';

export const cnsKeyPathSpending = 'crypto.ETH.umbra.spending_public_key';
export const cnsKeyPathViewing = 'crypto.ETH.umbra.viewing_public_key';

/**
 * @notice Computes CNS namehash of the input CNS domain, normalized to CNS compatibility
 * @param name CNS domain, e.g. myname.crypto
 * @param resolution Resolution instance of @unstoppabledomains/resolution
 */
export function namehash(name: string, resolution: Resolution) {
  if (typeof name !== 'string') {
    throw new Error('Name must be a string');
  }
  return resolution.namehash(name, NamingServiceName.UNS);
}

/**
 * @notice For a given CNS domain, returns the public keys, or throws if they don't exist
 * @param name CNS domain, e.g. myname.crypto
 * @param provider ethers provider to use
 * @param resolution Resolution instance of @unstoppabledomains/resolution
 */
export async function getPublicKeys(name: string, provider: EthersProvider, resolution: Resolution) {
  // Read compressed public keys
  const domainNamehash = resolution.namehash(name, NamingServiceName.UNS);
  const resolverAddress = await resolution.resolver(name);
  const cnsResolver = new Contract(resolverAddress, CNS_RESOLVER_ABI, provider);
  const [compressedSpendingPublicKey, compressedViewingPublicKey] = await cnsResolver.getMany(
    [cnsKeyPathSpending, cnsKeyPathViewing],
    domainNamehash
  );
  if (!compressedSpendingPublicKey || !compressedViewingPublicKey) {
    throw new Error(`Public keys not found for ${name}. User must setup their Umbra account`);
  }
  // Return uncompressed public keys
  const spendingPublicKey = `0x${Point.fromHex(<string>compressedSpendingPublicKey.slice(2)).toHex()}`;
  const viewingPublicKey = `0x${Point.fromHex(<string>compressedViewingPublicKey.slice(2)).toHex()}`;
  return { spendingPublicKey, viewingPublicKey };
}
