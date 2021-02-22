/**
 * @dev Functions for interacting with the Unstoppable Domains Crypto Name Service (CNS)
 */

import { BigNumber } from '@ethersproject/bignumber';
import { default as Resolution } from '@unstoppabledomains/resolution';
import type { EthersProvider } from '../types';
import * as constants from '../constants.json';
import * as cnsRegistryAbi from '../abi/CnsRegistry.json';
import * as cnsResolverAbi from '../abi/CnsResolver.json';
import { createContract } from '../inner/contract';

const { CNS_REGISTRY } = constants;

export const umbraKeySignature = 'crypto.ETH.signature-v0';

/**
 * @notice Computes CNS namehash of the input CNS domain, normalized to CNS compatibility
 * @param name CNS domain, e.g. myname.crypto
 * @param resolution Resolution instance of @unstoppabledomains/resolution
 */
export function namehash(name: string, resolution: Resolution) {
  return resolution.namehash(name);
}

/**
 * @notice For a given CNS domain, recovers and returns the public key from its signature
 * @param name CNS domain, e.g. myname.crypto
 * @param resolution Resolution instance of @unstoppabledomains/resolution
 */
export function getPublicKeys(name: string, resolution: Resolution) {
  name; // silence errors
  resolution; // silence errors
  const spendingPublicKey = '';
  const viewingPublicKey = '';

  return { spendingPublicKey, viewingPublicKey };
}

/**
 * @notice For a given CNS domain, sets the associated umbra signature
 * @param name CNS domain, e.g. myname.crypto
 * @param provider web3 provider to use (not an ethers provider)
 * @param resolution Resolution instance of @unstoppabledomains/resolution
 * @param signature user's signature of the Umbra protocol message, as hex string
 * @returns Transaction hash
 */
export async function setPublicKeys(name: string, provider: EthersProvider, resolution: Resolution, signature: string) {
  // TODO: we can git of resolution parameter here, if we don't use its namehash function
  const domainNamehash = resolution.namehash(name);
  const cnsRegistry = createContract(CNS_REGISTRY, cnsRegistryAbi, provider);
  const resolverAddress = await cnsRegistry.resolverOf(BigNumber.from(domainNamehash).toString());
  const cnsResolver = createContract(resolverAddress, cnsResolverAbi, provider);
  const tx = await cnsResolver.set(umbraKeySignature, signature, domainNamehash);
  await tx.wait();
  return tx.hash as string;
}
