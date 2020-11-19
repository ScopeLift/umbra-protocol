import { ExternalProvider } from '../types';
const ensNamehash = require('eth-ens-namehash');
const constants = require('../constants.json');
const publicResolverAbi = require('../abi/PublicResolver.json');
const { getPublicKeyFromSignature } = require('./utils');
const { createContract } = require('../inner/contract');

const { ENS_PUBLIC_RESOLVER } = constants;

const umbraKeySignature = 'vnd.umbra-v0-signature';
const umbraKeyBytecode = 'vnd.umbra-v0-bytecode';

// Turn of ethers warnings since it warns about overloaded functions in PublicResolver ABI
// ethers.utils.Logger.setLogLevel('error');

/**
 * @notice Computes ENS namehash of the input ENS domain, normalized to ENS compatibility
 * @param name ENS domain, e.g. myname.eth
 */
function namehash(name: string) {
  return ensNamehash.hash(ensNamehash.normalize(name));
}

/**
 * @notice For a given ENS domain, return the associated umbra signature or return
 * undefined if none exists
 * @param name ENS domain, e.g. myname.eth
 * @param provider web3 provider to use (not an ethers provider)
 */
async function getSignature(name: string, provider: ExternalProvider) {
  const publicResolver = createContract(ENS_PUBLIC_RESOLVER, publicResolverAbi, provider);
  const signature = await publicResolver.text(namehash(name), umbraKeySignature);
  return signature;
}

/**
 * @notice For a given ENS domain, recovers and returns the public key from its signature
 * @param name ENS domain, e.g. myname.eth
 * @param provider web3 provider to use (not an ethers provider)
 */
async function getPublicKey(name: string, provider: ExternalProvider) {
  const signature = await getSignature(name, provider);
  if (!signature) return undefined;
  return await getPublicKeyFromSignature(signature);
}

/**
 * @notice For a given ENS domain, return the associated umbra bytecode or return
 * undefined if none exists
 * @param name ENS domain, e.g. myname.eth
 * @param provider web3 provider to use (not an ethers provider)
 */
async function getBytecode(name: string, provider: ExternalProvider) {
  const publicResolver = createContract(ENS_PUBLIC_RESOLVER, publicResolverAbi, provider);
  const bytecode = await publicResolver.text(namehash(name), umbraKeyBytecode);
  return bytecode;
}

/**
 * @notice For a given ENS domain, sets the associated umbra signature
 * @param name ENS domain, e.g. myname.eth
 * @param provider web3 provider to use (not an ethers provider)
 * @param signature user's signature of the Umbra protocol message, as hex string
 * @returns Transaction hash
 */
async function setSignature(name: string, provider: ExternalProvider, signature: string) {
  const publicResolver = createContract(ENS_PUBLIC_RESOLVER, publicResolverAbi, provider);
  const tx = await publicResolver.setText(namehash(name), umbraKeySignature, signature);
  await tx.wait();
  return tx.hash as string;
}
module.exports = {
  // Functions
  namehash,
  getSignature,
  getPublicKey,
  getBytecode,
  setSignature,
  // Constants
  umbraKeySignature,
  umbraKeyBytecode,
};
