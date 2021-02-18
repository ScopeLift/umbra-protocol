/**
 * @dev Functions for interacting with the Ethereum Name Service (ENS)
 */

import { EthersProvider, EnsNamehash } from '../types';
import { BigNumber } from '@ethersproject/bignumber';
import { SigningKey } from '@ethersproject/signing-key';
import { KeyPair } from '../classes/KeyPair';
import * as publicResolverAbi from '../abi/PublicResolver.json';
import { createContract } from '../inner/contract';
const ensNamehash: EnsNamehash = require('eth-ens-namehash'); // doesn't include TypeScript definitions

type StealthKeys = {
  spendingPubKeyPrefix: BigNumber;
  spendingPubKey: BigNumber;
  viewingPubKeyPrefix: BigNumber;
  viewingPubKey: BigNumber;
};

const getEnsResolverAddress = async (provider: EthersProvider) => {
  const chainId = (await provider.getNetwork()).chainId;
  if (chainId === 4 || chainId === 1337) {
    return '0x50ad87E547D5Dfbd6b62bfb6E5C3b9b4fb3c17cC';
  }
  throw new Error('Unsupported chain ID');
};

/**
 * @notice Computes ENS namehash of the input ENS domain, normalized to ENS compatibility
 * @param name ENS domain, e.g. myname.eth
 */
export function namehash(name: string) {
  return ensNamehash.hash(ensNamehash.normalize(name));
}

/**
 * @notice For a given ENS domain, returns the public keys, or undefined if they don't exist
 * @param name ENS domain, e.g. myname.eth
 * @param provider Ethers provider
 */
export async function getPublicKeys(name: string, provider: EthersProvider) {
  const ensResolverAddress = await getEnsResolverAddress(provider);
  const publicResolver = createContract(ensResolverAddress, publicResolverAbi, provider);
  const keys = (await publicResolver.stealthKeys(namehash(name))) as StealthKeys;

  const spendingPublicKey = KeyPair.getUncompressedFromX(
    keys.spendingPubKey,
    keys.spendingPubKeyPrefix.toNumber()
  );
  const viewingPublicKey = KeyPair.getUncompressedFromX(
    keys.viewingPubKey,
    keys.viewingPubKeyPrefix.toNumber()
  );

  return { spendingPublicKey, viewingPublicKey };
}

/**
 * @notice For a given ENS domain, sets the associated umbra public keys
 * @param name ENS domain, e.g. myname.eth
 * @param spendingPrivateKey The public key for generating a stealth address as BigNumber
 * @param viewingPrivateKey The public key to use for encryption as BigNumber
 * @param provider Ethers provider
 * @returns Transaction hash
 */
export async function setPublicKeys(
  name: string,
  spendingPrivateKey: string,
  viewingPrivateKey: string,
  provider: EthersProvider
) {
  // Break public keys into the required components
  const spendingSigningKey = new SigningKey(spendingPrivateKey);
  const viewingSigningKey = new SigningKey(viewingPrivateKey);
  const spendingPubKeyCompressed = spendingSigningKey.compressedPublicKey;
  const viewingPubKeyCompressed = viewingSigningKey.compressedPublicKey;

  const spendingPublicKeyPrefix = spendingPubKeyCompressed.slice(2, 4);
  const spendingPublicKey = BigNumber.from(`0x${spendingPubKeyCompressed.slice(4)}`).toString();
  const viewingPublicKeyPrefix = viewingPubKeyCompressed.slice(2, 4);
  const viewingPublicKey = BigNumber.from(`0x${viewingPubKeyCompressed.slice(4)}`).toString();

  const ensResolverAddress = await getEnsResolverAddress(provider);
  const publicResolver = createContract(ensResolverAddress, publicResolverAbi, provider);
  const tx = await publicResolver.setStealthKeys(
    namehash(name),
    spendingPublicKeyPrefix,
    spendingPublicKey,
    viewingPublicKeyPrefix,
    viewingPublicKey
  );
  return tx.hash as string;
}
