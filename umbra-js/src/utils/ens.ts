/**
 * @dev Functions for interacting with the Ethereum Name Service (ENS)
 */

import { EthersProvider, EnsNamehash, TransactionResponse } from '../types';
import { BigNumber } from '@ethersproject/bignumber';
import { Zero } from '@ethersproject/constants';
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
  if (keys.spendingPubKey.eq(Zero) || keys.viewingPubKey.eq(Zero)) {
    return { spendingPublicKey: undefined, viewingPublicKey: undefined };
  }

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
 * @param spendingPublicKey The public key for generating a stealth address as BigNumber
 * @param viewingPublicKey The public key to use for encryption as BigNumber
 * @param provider Ethers provider
 * @returns Transaction
 */
export async function setPublicKeys(
  name: string,
  spendingPublicKey: string,
  viewingPublicKey: string,
  provider: EthersProvider
) {
  // Break public keys into the required components
  const {
    prefix: spendingPublicKeyPrefix,
    pubKeyXCoordinate: spendingPublicKeyX,
  } = KeyPair.compressPublicKey(spendingPublicKey);
  const {
    prefix: viewingPublicKeyPrefix,
    pubKeyXCoordinate: viewingPublicKeyX,
  } = KeyPair.compressPublicKey(viewingPublicKey);

  // Send transaction to set the keys
  const ensResolverAddress = await getEnsResolverAddress(provider);
  const publicResolver = createContract(ensResolverAddress, publicResolverAbi, provider);
  const tx = await publicResolver.setStealthKeys(
    namehash(name),
    spendingPublicKeyPrefix,
    spendingPublicKeyX,
    viewingPublicKeyPrefix,
    viewingPublicKeyX
  );
  return tx as TransactionResponse;
}
