/**
 * @dev Functions for interacting with the Ethereum Name Service (ENS)
 */

import { EthersProvider } from '../types';
import { AddressZero, BigNumber, Contract, namehash as ensNamehash, Zero } from '../ethers';
import { KeyPair } from '../classes/KeyPair';
import { ENS_REGISTRY_ABI, FORWARDING_STEALTH_KEY_RESOLVER_ABI } from './constants';

type StealthKeys = {
  spendingPubKeyPrefix: BigNumber;
  spendingPubKey: BigNumber;
  viewingPubKeyPrefix: BigNumber;
  viewingPubKey: BigNumber;
};

const ENSRegistryAddress = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'; // same on all networks

/**
 * @notice Returns the address of the ENS stealth key resolver to use based on the provider's network
 * @param name ENS domain, e.g. myname.eth
 * @param provider Ethers provider
 */
export const getResolverContract = async (name: string, provider: EthersProvider) => {
  const registry = new Contract(ENSRegistryAddress, ENS_REGISTRY_ABI, provider);
  const namehash = ensNamehash(name);
  const resolverAddress = (await registry.resolver(namehash)) as string;
  // When using this method we expect the user will have an Umbra-compatible StealthKey resolver. There are two types:
  //   1. ForwardingStealthKeyResolver
  //   2. PublicStealthKeyResolver
  // Both can be found in this repo: https://github.com/ScopeLift/ens-resolvers
  //
  // Regardless of which type the user has, the ABI for getting and setting stealth keys is the same. Therefore
  // it's ok that we use always use the same ABI here)
  return new Contract(resolverAddress, FORWARDING_STEALTH_KEY_RESOLVER_ABI, provider);
};

/**
 * @notice Computes ENS namehash of the input ENS domain, normalized to ENS compatibility
 * @param name ENS domain, e.g. myname.eth
 */
export function namehash(name: string) {
  if (typeof name !== 'string') {
    throw new Error('Name must be a string');
  }
  return ensNamehash(name);
}

/**
 * @notice For a given ENS domain, returns the public keys, or throws if they don't exist
 * @param name ENS domain, e.g. myname.eth
 * @param provider Ethers provider
 */
export async function getPublicKeys(name: string, provider: EthersProvider) {
  // Get the resolver used by `name`. If it's the zero address, they have no stealth keys
  const resolver = await getResolverContract(name, provider);
  if (resolver.address === AddressZero) {
    throw new Error(`Name ${name} is not registered or user has not set their resolver`);
  }

  // Attempt to read stealth keys from the resolver contract
  let keys: StealthKeys;
  try {
    keys = (await resolver.stealthKeys(namehash(name))) as StealthKeys;
  } catch (err) {
    throw new Error(`The configured resolver for ${name} does not support stealth keys. Please ask them to setup their Umbra account`); // prettier-ignore
  }

  // Make sure the found keys are not zero
  if (keys.spendingPubKey.eq(Zero) || keys.viewingPubKey.eq(Zero)) {
    throw new Error(`Public keys not found for ${name}. Please ask them to setup their Umbra account`);
  }

  // Uncompress keys and return them
  const spendingPublicKey = KeyPair.getUncompressedFromX(keys.spendingPubKey, keys.spendingPubKeyPrefix.toNumber());
  const viewingPublicKey = KeyPair.getUncompressedFromX(keys.viewingPubKey, keys.viewingPubKeyPrefix.toNumber());
  return { spendingPublicKey, viewingPublicKey };
}
