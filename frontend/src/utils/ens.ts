/**
 * @notice Methods for viewing properties of and managing ENS names
 */

import { getAddress } from '@ethersproject/address';
import { Contract } from '@ethersproject/contracts';
import { namehash } from '@ethersproject/hash';
import { ens } from '@umbra/umbra-js';
import ENSRegistry from 'src/contracts/ENSRegistry.json';
import ENSPublicResolver from 'src/contracts/ENSPublicResolver.json';
import { Provider } from 'components/models';

type ChainId = keyof typeof ENSPublicResolver.addresses;

// Returns contract instance of the ENS registry
const getRegistry = (provider: Provider) => {
  const chainId = String(provider.network.chainId) as ChainId;
  return new Contract(ENSRegistry.addresses[chainId], ENSRegistry.abi, provider);
};

// Checks if user is the owner of the ENS domain `name`
export const isNameOwner = async (user: string, name: string, provider: Provider) => {
  const registry = getRegistry(provider);
  const owner = await registry.owner(namehash(name));
  return getAddress(user) === getAddress(owner);
};

// Checks if `name` is using the public resolver
export const isUsingPublicResolver = async (name: string, provider: Provider) => {
  const registry = getRegistry(provider);
  const resolver = await registry.resolver(namehash(name));
  const chainId = String(provider.network.chainId) as ChainId;
  return getAddress(resolver) === getAddress(ENSPublicResolver.addresses[chainId]);
};

// Wrapper around umbra-js's getPublicKeys that returns true if user has set Umbra public keys and false otherwise
export const hasPublicKeys = async (name: string, provider: Provider) => {
  try {
    await ens.getPublicKeys(name, provider); // throws if no keys found
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};
