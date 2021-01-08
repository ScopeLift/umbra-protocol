/**
 * @dev Functions for interacting with the Ehereum Name Service (ENS)
 */

import { EthersProvider, EnsNamehash } from '../types';
import * as constants from '../constants.json';
import * as publicResolverAbi from '../abi/PublicResolver.json';
import { getPublicKeyFromSignature } from './utils';
import { createContract } from '../inner/contract';
const ensNamehash: EnsNamehash = require('eth-ens-namehash'); // doesn't include TypeScript definitions

const { ENS_PUBLIC_RESOLVER } = constants;

export const umbraKeySignature = 'vnd.umbra-v0-signature';
export const umbraKeyBytecode = 'vnd.umbra-v0-bytecode';

/**
 * @notice Computes ENS namehash of the input ENS domain, normalized to ENS compatibility
 * @param name ENS domain, e.g. myname.eth
 */
export function namehash(name: string) {
  return ensNamehash.hash(ensNamehash.normalize(name));
}

/**
 * @notice For a given ENS domain, return the associated umbra signature or return
 * undefined if none exists
 * @param name ENS domain, e.g. myname.eth
 * @param provider web3 provider to use (not an ethers provider)
 */
export async function getSignature(name: string, provider: EthersProvider) {
  const publicResolver = createContract(ENS_PUBLIC_RESOLVER, publicResolverAbi, provider);
  const signature: string = await publicResolver.text(namehash(name), umbraKeySignature);
  return signature;
}

/**
 * @notice For a given ENS domain, recovers and returns the public key from its signature
 * @param name ENS domain, e.g. myname.eth
 * @param provider web3 provider to use (not an ethers provider)
 */
export async function getPublicKey(name: string, provider: EthersProvider) {
  const signature = await getSignature(name, provider);
  if (!signature) return undefined;
  return getPublicKeyFromSignature(signature);
}

/**
 * @notice For a given ENS domain, return the associated umbra bytecode or return
 * undefined if none exists
 * @param name ENS domain, e.g. myname.eth
 * @param provider web3 provider to use (not an ethers provider)
 */
export async function getBytecode(name: string, provider: EthersProvider) {
  const publicResolver = createContract(ENS_PUBLIC_RESOLVER, publicResolverAbi, provider);
  const bytecode: string = await publicResolver.text(namehash(name), umbraKeyBytecode);
  return bytecode;
}

/**
 * @notice For a given ENS domain, sets the associated umbra signature
 * @param name ENS domain, e.g. myname.eth
 * @param provider web3 provider to use (not an ethers provider)
 * @param signature user's signature of the Umbra protocol message, as hex string
 * @returns Transaction hash
 */
export async function setSignature(name: string, provider: EthersProvider, signature: string) {
  const publicResolver = createContract(ENS_PUBLIC_RESOLVER, publicResolverAbi, provider);
  const tx = await publicResolver.setText(namehash(name), umbraKeySignature, signature);
  await tx.wait();
  return tx.hash as string;
}
