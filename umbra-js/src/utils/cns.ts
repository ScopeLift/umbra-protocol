import { ethers } from 'ethers';
import type { Resolution } from '@unstoppabledomains/resolution';
import { ExternalProvider } from '../types';

const constants = require('../constants.json');
const cnsRegistryAbi = require('../abi/CnsRegistry.json');
const cnsResolverAbi = require('../abi/CnsResolver.json');
const { createContract } = require('../inner/contract');
const { getPublicKeyFromSignature } = require('./utils');

const { CNS_REGISTRY } = constants;

const umbraKeySignature = 'crypto.ETH.signature-v0';

/**
 * @notice Computes CNS namehash of the input CNS domain, normalized to CNS compatibility
 * @param name CNS domain, e.g. myname.crypto
 * @param resolution Resolution instance of @unstoppabledomains/resolution
 */
function namehash(name: string, resolution: Resolution) {
  return resolution.namehash(name);
}

/**
 * @notice For a given CNS domain, return the associated umbra signature or return
 * undefined if none exists
 * @param name CNS domain, e.g. myname.crypto
 * @param resolution Resolution instance of @unstoppabledomains/resolution
 */
async function getSignature(name: string, resolution: Resolution) {
  return await resolution.record(name, umbraKeySignature).catch((err) => {
    const recordIsMissing =
      err.message && err.message.startsWith(`No ${umbraKeySignature} record found`);
    if (recordIsMissing) {
      return undefined;
    }
    throw err;
  });
}

/**
 * @notice For a given CNS domain, recovers and returns the public key from its signature
 * @param name CNS domain, e.g. myname.crypto
 * @param resolution Resolution instance of @unstoppabledomains/resolution
 */
async function getPublicKey(name: string, resolution: Resolution) {
  const signature = await getSignature(name, resolution);
  if (!signature) return undefined;
  return await getPublicKeyFromSignature(signature);
}

/**
 * @notice For a given CNS domain, sets the associated umbra signature
 * @param name CNS domain, e.g. myname.crypto
 * @param provider web3 provider to use (not an ethers provider)
 * @param resolution Resolution instance of @unstoppabledomains/resolution
 * @param signature user's signature of the Umbra protocol message, as hex string
 * @returns Transaction hash
 */
async function setSignature(
  name: string,
  provider: ExternalProvider,
  resolution: Resolution,
  signature: string
) {
  // TODO: we can git of resolution parameter here, if we don't use its namehash function
  const domainNamehash = resolution.namehash(name);
  const cnsRegistry = createContract(CNS_REGISTRY, cnsRegistryAbi, provider);
  const resolverAddress = await cnsRegistry.resolverOf(
    ethers.BigNumber.from(domainNamehash).toString()
  );
  const cnsResolver = createContract(resolverAddress, cnsResolverAbi, provider);
  const tx = await cnsResolver.set(umbraKeySignature, signature, domainNamehash);
  await tx.wait();
  return tx.hash as string;
}

module.exports = {
  // Functions
  namehash,
  getSignature,
  getPublicKey,
  setSignature,
  // Constants
  umbraKeySignature,
};
