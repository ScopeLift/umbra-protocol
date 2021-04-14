/**
 * @dev Functions for interacting with the Ethereum Name Service (ENS)
 */

import { EthersProvider, TransactionResponse } from '../types';
import { BigNumber } from '@ethersproject/bignumber';
import { AddressZero, Zero } from '@ethersproject/constants';
import { namehash as ensNamehash } from '@ethersproject/hash';
import { KeyPair } from '../classes/KeyPair';
import * as ForwardingStealthKeyResolverAbi from '../abi/ForwardingStealthKeyResolver.json';
import * as ENSRegistryAbi from '../abi/ENSRegistry.json';
import { createContract } from './utils';

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
  const registry = createContract(ENSRegistryAddress, ENSRegistryAbi, provider);
  const resolverAddress = (await registry.resolver(ensNamehash(name))) as string;
  // When using this method we expect the user will have an Umbra-compatible StealthKey resolver. There are two types:
  //   1. ForwardingStealthKeyResolver
  //   2. PublicStealthKeyResolver
  // Both can be found in this repo: https://github.com/ScopeLift/ens-resolvers
  //
  // Regardless of which type the user has, the ABI for getting and setting stealth keys is the same. Therefore
  // it's ok that we use always use the same ABI here)
  return createContract(resolverAddress, ForwardingStealthKeyResolverAbi, provider);
};

/**
 * @notice Returns supported ENS domain endings
 */
export const supportedEnsDomains = ['.eth', '.xyz', '.kred', '.luxe', '.club', '.art'];

/**
 * @notice Returns true if the provided name is an ENS domain, false otherwise
 * @param domainName Name to check
 */
export function isEnsDomain(domainName: string) {
  if (!domainName) return false;
  for (const suffix of supportedEnsDomains) {
    if (domainName.endsWith(suffix)) {
      return true;
    }
  }
  return false;
}

/**
 * @notice Computes ENS namehash of the input ENS domain, normalized to ENS compatibility
 * @param name ENS domain, e.g. myname.eth
 */
export function namehash(name: string) {
  if (typeof name !== 'string') {
    throw new Error('Name must be a string');
  }
  if (!isEnsDomain(name)) {
    throw new Error(`Name ${name} does not end with supported suffix: ${supportedEnsDomains.join(', ')}`);
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
    throw new Error(`The configured resolver for ${name} does not support stealth keys`);
  }

  // Make sure the found keys are not zero
  if (keys.spendingPubKey.eq(Zero) || keys.viewingPubKey.eq(Zero)) {
    throw new Error(`Public keys not found for ${name}. User must setup their Umbra account`);
  }

  // Uncompress keys and return them
  const spendingPublicKey = KeyPair.getUncompressedFromX(keys.spendingPubKey, keys.spendingPubKeyPrefix.toNumber());
  const viewingPublicKey = KeyPair.getUncompressedFromX(keys.viewingPubKey, keys.viewingPubKeyPrefix.toNumber());
  return { spendingPublicKey, viewingPublicKey };
}

/**
 * @notice For a given ENS domain, sets the associated umbra public keys
 * @param name ENS domain, e.g. myname.eth
 * @param spendingPublicKey The public key for generating a stealth address as hex string
 * @param viewingPublicKey The public key to use for encryption as hex string
 * @param provider Ethers provider
 * @returns Transaction
 */
export async function setPublicKeys(
  name: string,
  spendingPublicKey: string,
  viewingPublicKey: string,
  provider: EthersProvider
) {
  // Break public keys into the required components to store compressed public keys
  const { prefix: spendingPublicKeyPrefix, pubKeyXCoordinate: spendingPublicKeyX } = KeyPair.compressPublicKey(
    spendingPublicKey
  );
  const { prefix: viewingPublicKeyPrefix, pubKeyXCoordinate: viewingPublicKeyX } = KeyPair.compressPublicKey(
    viewingPublicKey
  );

  // Send transaction to set the keys
  const resolver = await getResolverContract(name, provider);
  const tx = await resolver.setStealthKeys(
    namehash(name),
    spendingPublicKeyPrefix,
    spendingPublicKeyX,
    viewingPublicKeyPrefix,
    viewingPublicKeyX
  );
  return tx as TransactionResponse;
}
