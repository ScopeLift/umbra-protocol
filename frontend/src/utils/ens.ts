/**
 * @notice Methods for viewing properties of and managing ENS names
 */

import { AddressZero, Contract, keccak256, namehash, toUtf8Bytes, getAddress } from 'src/utils/ethers';
import { DomainService, ens, KeyPair } from '@umbra/umbra-js';
import { Provider, Signer, TransactionResponse } from 'components/models';
import { txNotify } from 'src/utils/alerts';

// Contract imports
import ENSRegistry from 'src/contracts/ENSRegistry.json';
import ENSPublicResolver from 'src/contracts/ENSPublicResolver.json';
import ForwardingStealthKeyResolver from 'src/contracts/ForwardingStealthKeyResolver.json';
import PublicStealthKeyResolver from 'src/contracts/PublicStealthKeyResolver.json';
import StealthKeyFIFSRegistrar from 'src/contracts/StealthKeyFIFSRegistrar.json';

// Define the root domain used when managing subdomains
export const rootName = 'umbra.eth';

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

// Returns the address of the specified ENS contract
export const getContractAddress = (name: ENSContract, provider: Provider) => {
  const chainId = String(provider.network.chainId) as ChainId;
  return address[name][chainId];
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

// Returns true if the provided subdomain is available, and false if it's been claimed
export const isSubdomainAvailable = async (name: string, provider: Provider) => {
  const node = namehash(`${name}.${rootName}`);
  const owner = await getContract('ENSRegistry', provider).owner(node);
  return getAddress(owner) === AddressZero;
};

// Publish public keys for a subdomain, where name is the full ENS name, e.g. matt.umbra.eth
export const setSubdomainKeys = async (
  name: string,
  userAddress: string,
  spendingPublicKey: string,
  viewingPublicKey: string,
  signer: Signer
) => {
  // Verify subdomain has no periods
  const splitName = name.split('.');
  if (splitName.length > 3) throw new Error('Cannot not register a name with periods');

  // Verify subdomain availability
  const provider = signer.provider as Provider;
  const owner = await getContract('ENSRegistry', provider).owner(namehash(name));
  if (getAddress(owner) !== AddressZero) throw new Error(`${name} already registered`);

  // Get instance of registrar contract we use to register the subdomain
  const registrar = 'StealthKeyFIFSRegistrar';
  const stealthKeyFIFSRegistrar = getContract(registrar, provider).connect(signer);

  // Break public keys into the required components to store compressed public keys.
  // See @umbra/umbra-js/src/utils/ens.ts for the source of this logic
  const { compressPublicKey } = KeyPair;
  const { prefix: spendingPubKeyPrefix, pubKeyXCoordinate: spendingPubKeyX } = compressPublicKey(spendingPublicKey);
  const { prefix: viewingPubKeyPrefix, pubKeyXCoordinate: viewingPubKeyX } = compressPublicKey(viewingPublicKey);

  // Send transaction
  const subdomain = splitName[0];
  const tx = (await stealthKeyFIFSRegistrar.register(
    keccak256(toUtf8Bytes(subdomain)), // label, e.g. keccak256('matt')
    userAddress, // user's wallet address, which will be the owner
    getContractAddress('PublicStealthKeyResolver', provider), // PublicStealthKeyResolver address
    spendingPubKeyPrefix, // prefix of compressed spending public key
    spendingPubKeyX, // compressed spending public key without prefix
    viewingPubKeyPrefix, // prefix of compressed viewing public key
    viewingPubKeyX // compressed viewing public key without prefix
  )) as TransactionResponse;

  txNotify(tx.hash);
  return tx;
};

// Publish keys for a root ENS (or CNS) name, such as msolomon.eth, and migrate to a new resolver if required
export const setRootNameKeys = async (
  name: string,
  domainService: DomainService,
  isEnsPublicResolver: boolean, // true if the user current is using the ENS public resolver
  spendingPublicKey: string,
  viewingPublicKey: string,
  signer: Signer
) => {
  console.log('name', name);
  console.log('domainService', domainService);
  console.log('isEnsPublicResolver', isEnsPublicResolver);
  console.log('spendingPublicKey', spendingPublicKey);
  console.log('viewingPublicKey', viewingPublicKey);
  console.log('signer', signer);
  // Setup
  console.log('setRootNameKeys setup');
  const txs: TransactionResponse[] = []; // this will hold tx details from each transaction sent
  const node = namehash(name);
  console.log('node: ', node);

  // Get address of the ForwardingStealthKeyResolver. This is only used with ENS, not for CNS.
  const provider = signer.provider as Provider;
  const chainId = String((await provider.getNetwork()).chainId) as keyof typeof ForwardingStealthKeyResolver.addresses;
  console.log('chainId: ', chainId);
  const fskResolverAddress = ForwardingStealthKeyResolver.addresses[chainId];
  console.log('fskResolverAddress: ', fskResolverAddress);

  // Now we execute the transactions needed to set the keys and optionally migrate resolver. If we're executing
  // here, there's four potential resolvers the user may have
  //   1. ENS PublicResolver (the ENS default)
  //   2. ENS PublicStealthKeyResolver (typically used when registering an umbra.eth subdomain)
  //   3. ENS ForwardingStealthKeyResolver (typically used when configuring a root ENS name, e.g. msolomon.eth)
  //   4. CNS PublicResolver
  // The first and second transactions below are only needed when migrating from the PublicResolver, and the
  // third transaction below is needed in all three cases. We use isEnsPublicResolver.value, which was set
  // in checkEnsStatus(), to handle this logic

  if (isEnsPublicResolver) {
    // Step 1: Authorize the ForwardingStealthKeyResolver to set records on the PublicResolver. This is required
    // so it can properly act as a fallback resolver with permission to set records on PublicResolver as needed
    const publicResolver = getContract('ENSPublicResolver', provider).connect(signer);
    console.log('publicResolver.address: ', publicResolver.address);
    const tx = (await publicResolver.setAuthorisation(node, fskResolverAddress, true)) as TransactionResponse;
    console.log('tx1.hash: ', tx.hash);
    txNotify(tx.hash);
    txs.push(tx);

    // Step 2: Change the user's resolver to the ForwardingStealthKeyResolver
    // Execute the setResolver transaction
    const registry = getContract('ENSRegistry', provider).connect(signer);
    console.log('registry.address: ', registry.address);
    const tx2 = (await registry.setResolver(node, fskResolverAddress)) as TransactionResponse;
    console.log('tx2.hash: ', tx2.hash);
    txNotify(tx2.hash);
    txs.push(tx2);
    await tx2.wait(); // this needs to be mined before step 3, since step 3 reads your current resolver
  }

  // Step 3: Set the stealth keys on the appropriate resolver
  const tx = await domainService.setPublicKeys(name, spendingPublicKey, viewingPublicKey);
  txNotify(tx.hash);
  console.log('tx.hash: ', tx.hash);
  txs.push(tx);
  console.log('txs: ', txs);

  return txs;
};
