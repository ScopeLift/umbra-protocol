/**
 * @notice Helpers for managing and displaying addresses
 */

import { CnsQueryResponse, Provider } from 'components/models';
import { DomainService, cns, ens } from '@umbra/umbra-js';
import { getAddress } from '@ethersproject/address';

// ================================================== Address Helpers ==================================================

// Returns an address with the following format: 0x1234...abcd
export const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(38)}`;

// Returns an ENS or CNS name if found, otherwise returns the address
export const lookupAddress = async (address: string, provider: Provider) => {
  const domainName = await lookupEnsOrCns(address, provider);
  return domainName ? domainName : address;
};

// Returns an ENS or CNS name if found, otherwise returns a formatted version of the address
export const lookupOrFormatAddress = async (address: string, provider: Provider) => {
  const domainName = await lookupAddress(address, provider);
  return domainName ? domainName : formatAddress(address);
};

// Returns ENS name that address resolves to, or null if not found
export const lookupEnsName = async (address: string, provider: Provider) => provider.lookupAddress(address);

// Fetches all CNS names owned by an address and returns the first one
export const lookupCnsName = async (address: string, provider: Provider) => {
  // Assume mainnet unless we're given the Rinkeby chainId
  const baseUrl = 'https://api.thegraph.com/subgraphs/name/unstoppable-domains-integrations';
  const chainId = provider.network.chainId;
  const url = chainId === 4 ? `${baseUrl}/dot-crypto-rinkeby-registry` : `${baseUrl}/dot-crypto-registry`;

  // Send request to get names
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      variables: { owner: address.toLowerCase() },
      query: 'query domainsOfOwner($owner: String!) { domains(where: {owner: $owner}) { name } }',
    }),
  });

  // Return the first name in the array, or undefined if user has no CNS names
  const json = (await res.json()) as CnsQueryResponse;
  const names = json.data.domains;
  return names.length > 0 ? names[0].name : undefined;
};

// Returns an ENS or CNS name if found, otherwise returns undefined
const lookupEnsOrCns = async (address: string, provider: Provider) => {
  const ensName = await lookupEnsName(address, provider);
  if (ensName) return ensName;

  const cnsName = await lookupCnsName(address, provider);
  if (cnsName) return cnsName;

  return undefined;
};

// Takes an ENS, CNS, or address, and returns the checksummed address
export const toAddress = async (name: string, domainService: DomainService) => {
  if (cns.isCnsDomain(name)) {
    return domainService.udResolution.addr(name, 'ETH'); // throws error if it does not resolve to an address
  }
  if (ens.isEnsDomain(name)) {
    const address = await domainService.provider.resolveName(name); // returns null if it does not resolve to an address
    if (!address) throw new Error(`Name ${name} does not resolve to an address`);
    return address;
  }
  return getAddress(name);
};

// =============================================== Bulk Address Helpers ================================================
// Duplicates of the above methods for operating on multiple addresses in parallel

export const formatAddresses = (addresses: string[]) => addresses.map(formatAddress);

export const lookupAddresses = async (addresses: string[], provider: Provider) => {
  const promises = addresses.map((address) => lookupAddress(address, provider));
  return Promise.all(promises);
};

export const lookupOrFormatAddresses = async (addresses: string[], provider: Provider) => {
  const promises = addresses.map((address) => lookupOrFormatAddress(address, provider));
  return Promise.all(promises);
};
