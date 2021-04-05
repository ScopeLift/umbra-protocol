/**
 * @dev Functions for interacting with the Ethereum Name Service (ENS)
 */

import { EthersProvider, TransactionResponse } from '../types';
import { BigNumber } from '@ethersproject/bignumber';
import { Zero } from '@ethersproject/constants';
import { namehash as ensNamehash } from '@ethersproject/hash';
import { KeyPair } from '../classes/KeyPair';
import * as UmbraForwardingResolverAbi from '../abi/PublicResolver.json';
import { createContract } from './utils';

type StealthKeys = {
  spendingPubKeyPrefix: BigNumber;
  spendingPubKey: BigNumber;
  viewingPubKeyPrefix: BigNumber;
  viewingPubKey: BigNumber;
};

/**
 * @notice Returns the chain ID of the provider
 * @param provider Provider to get chain ID for
 */
const getChainId = async (provider: EthersProvider) => (await provider.getNetwork()).chainId;

/**
 * @notice Returns the address of the ENS stealth key resolver to use based on the provider's network
 * @param chainId Chain ID to get Umbra Resolver address for
 */
export const getUmbraResolverAddress = (chainId: number) => {
  if (chainId === 4 || chainId === 1337) {
    return '0x291e2dfe31CE1a65DbEDD84eA38a12a4D5e01D39';
  }
  throw new Error('Unsupported chain ID');
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
    throw new Error('Name must be a string with a supported suffix');
  }
  if (!isEnsDomain(name)) {
    throw new Error(`Name does not end with supported suffix: ${supportedEnsDomains.join(', ')}`);
  }
  return ensNamehash(name);
}

/**
 * @notice For a given ENS domain, returns the public keys, or throws if they don't exist
 * @param name ENS domain, e.g. myname.eth
 * @param provider Ethers provider
 */
export async function getPublicKeys(name: string, provider: EthersProvider) {
  const chainId = await getChainId(provider);
  const ensResolverAddress = await getUmbraResolverAddress(chainId);
  const publicResolver = createContract(ensResolverAddress, UmbraForwardingResolverAbi, provider);
  const keys = (await publicResolver.stealthKeys(namehash(name))) as StealthKeys;
  if (keys.spendingPubKey.eq(Zero) || keys.viewingPubKey.eq(Zero)) {
    throw new Error(`Public keys not found for ${name}. User must setup their Umbra account`);
  }

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
  const chainId = await getChainId(provider);
  const ensResolverAddress = await getUmbraResolverAddress(chainId);
  const publicResolver = createContract(ensResolverAddress, UmbraForwardingResolverAbi, provider);
  const tx = await publicResolver.setStealthKeys(
    namehash(name),
    spendingPublicKeyPrefix,
    spendingPublicKeyX,
    viewingPublicKeyPrefix,
    viewingPublicKeyX
  );
  return tx as TransactionResponse;
}
