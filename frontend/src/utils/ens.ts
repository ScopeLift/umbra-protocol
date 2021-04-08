/**
 * @notice Methods for viewing properties of and managing ENS names
 */

import { getAddress } from '@ethersproject/address';
import { Contract } from '@ethersproject/contracts';
import { namehash } from '@ethersproject/hash';
import { ens } from '@umbra/umbra-js';
import { Provider } from 'components/models';

// Contract imports
import ENSRegistry from 'src/contracts/ENSRegistry.json';
import ENSPublicResolver from 'src/contracts/ENSPublicResolver.json';
import ForwardingStealthKeyResolver from 'src/contracts/ForwardingStealthKeyResolver.json';
import PublicStealthKeyResolver from 'src/contracts/PublicStealthKeyResolver.json';
import StealthKeyFIFSRegistrar from 'src/contracts/StealthKeyFIFSRegistrar.json';

// Refactor into addresses and ABI variables so we can access contracts by name
const address = {
  ENSRegistry: ENSRegistry.addresses,
  ENSPublicResolver: ENSPublicResolver.addresses,
  ForwardingStealthKeyResolver: ForwardingStealthKeyResolver.addresses,
  PublicStealthKeyResolver: PublicStealthKeyResolver.addresses,
  StealthKeyFIFSRegistrar: StealthKeyFIFSRegistrar.addresses,
};

const abi = {
  ENSRegistry: ENSRegistry.abi,
  ENSPublicResolver: ENSPublicResolver.abi,
  ForwardingStealthKeyResolver: ForwardingStealthKeyResolver.abi,
  PublicStealthKeyResolver: PublicStealthKeyResolver.abi,
  StealthKeyFIFSRegistrar: StealthKeyFIFSRegistrar.abi,
};

// Define some helper types
// We can defined the ChainId type as the keys of any imported contract, but we use a contract that's defined
// on the fewest number of networks to ensure type compatibility
type ChainId = keyof typeof ForwardingStealthKeyResolver.addresses;
type ENSContract = keyof typeof address;

// Returns an instance of the specified ENS contract
export const getContract = (name: ENSContract, provider: Provider) => {
  const chainId = String(provider.network.chainId) as ChainId;
  return new Contract(address[name][chainId], abi[name], provider);
};

// Checks if user is the owner of the ENS domain `name`
export const isNameOwner = async (user: string, name: string, provider: Provider) => {
  const registry = getContract('ENSRegistry', provider);
  const owner = await registry.owner(namehash(name));
  return getAddress(user) === getAddress(owner);
};

// Returns the address of the user's resolver contract
export const getResolverAddress = async (name: string, provider: Provider) => {
  const registry = getContract('ENSRegistry', provider);
  return (await registry.resolver(namehash(name))) as string;
};

// Checks if `name` is using the Public Resolver
export const isUsingPublicResolver = (name: string, provider: Provider) => {
  const chainId = String(provider.network.chainId) as ChainId;
  return getAddress(name) === getAddress(ENSPublicResolver.addresses[chainId]);
};

// Checks if `name` is using one of the two Umbra-compatible StealthKey Resolvers
export const isUsingUmbraResolver = (name: string, provider: Provider) => {
  const chainId = String(provider.network.chainId) as ChainId;
  const forwardingStealthResolverAddr = ForwardingStealthKeyResolver.addresses[chainId];
  const publicStealthResolverAddr = PublicStealthKeyResolver.addresses[chainId];
  return (
    getAddress(name) === getAddress(forwardingStealthResolverAddr) ||
    getAddress(name) === getAddress(publicStealthResolverAddr)
  );
};

// Wrapper around umbra-js's getPublicKeys that returns true if user has set Umbra public keys and false otherwise
export const hasPublicKeys = async (name: string, provider: Provider) => {
  try {
    await ens.getPublicKeys(name, provider); // throws if no keys found
    return true;
  } catch (err) {
    console.warn(err);
    return false;
  }
};
