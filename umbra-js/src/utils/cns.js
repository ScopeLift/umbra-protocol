const ethers = require('ethers');
const constants = require('../constants.json');
const cnsRegistryAbi = require('../abi/CnsRegistry.json');
const cnsResolverAbi = require('../abi/CnsResolver.json');
const { createContract } = require('../inner/contract');
const { getPublicKeyFromSignature } = require('./utils');

const { CNS_REGISTRY } = constants;

const umbraKeySignature = 'crypto.ETH.signature-v0';

/**
 * @notice Computes CNS namehash of the input CNS domain, normalized to CNS compatibility
 * @param {String} name CNS domain, e.g. myname.crypto
 * @param {*} resolution Resolution instance of @unstoppabledomains/resolution
 */
function namehash(name, resolution) {
  return resolution.namehash(name);
}

/**
 * @notice For a given CNS domain, return the associated umbra signature or return
 * undefined if none exists
 * @param {String} name CNS domain, e.g. myname.crypto
 * @param {*} resolution Resolution instance of @unstoppabledomains/resolution
 */
async function getSignature(name, resolution) {
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
 * @param {String} name CNS domain, e.g. myname.crypto
 * @param {*} resolution Resolution instance of @unstoppabledomains/resolution
 */
async function getPublicKey(name, resolution) {
  const signature = await getSignature(name, resolution);
  if (!signature) return undefined;
  return await getPublicKeyFromSignature(signature);
}

/**
 * @notice For a given CNS domain, sets the associated umbra signature
 * @param {String} name CNS domain, e.g. myname.crypto
 * @param {*} provider raw web3 provider to use (not an ethers instance)
 * @param {*} resolution Resolution instance of @unstoppabledomains/resolution
 * @param {String} signature user's signature of the Umbra protocol message
 * @returns {String} Transaction hash
 */
async function setSignature(name, provider, resolution, signature) {
  // TODO: we can git of resolution parameter here, if we don't use its namehash function
  const domainNamehash = resolution.namehash(name);
  const cnsRegistry = createContract(CNS_REGISTRY, cnsRegistryAbi, provider);
  const resolverAddress = await cnsRegistry.resolverOf(
    ethers.BigNumber.from(domainNamehash).toString()
  );
  const cnsResolver = createContract(resolverAddress, cnsResolverAbi, provider);
  const tx = await cnsResolver.set(umbraKeySignature, signature, domainNamehash);
  await tx.wait();
  return tx.hash;
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
