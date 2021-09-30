/**
 * @notice Helpers for managing and displaying addresses
 */

import { CnsQueryResponse, Provider } from 'components/models';
import { utils } from '@umbra/umbra-js';
import { getAddress } from 'src/utils/ethers';

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
  return domainName !== address ? domainName : formatAddress(address);
};

// Returns ENS name that address resolves to, or null if not found
export const lookupEnsName = async (address: string, provider: Provider) => {
  try {
    const name = await provider.lookupAddress(address);
    return name;
  } catch (err) {
    console.warn('Error in lookupEnsName');
    console.warn(err);
    return undefined;
  }
};

// Fetches all CNS names owned by an address and returns the first one
export const lookupCnsName = async (address: string, provider: Provider) => {
  // Assume mainnet unless we're given the Rinkeby chainId
  const baseUrl = 'https://api.thegraph.com/subgraphs/name/unstoppable-domains-integrations';
  const chainId = provider.network.chainId;
  const url = chainId === 4 ? `${baseUrl}/dot-crypto-rinkeby-registry` : `${baseUrl}/dot-crypto-registry`;

  // Send request to get names
  try {
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
  } catch (err) {
    // Scenario that prompted this try/catch was that The Graph API threw with a CORS error on localhost, blocking login
    console.warn('Error in lookupCnsName');
    console.warn(err);
    return undefined;
  }
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
export const toAddress = utils.toAddress;

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

// ================================================== Privacy Checks ===================================================

// Checks for any potential risks of withdrawing to the provided name or address, returns object containing
// a true/false judgement about risk, and a short description string
export const isAddressSafe = async (name: string, userAddress: string, provider: Provider) => {
  userAddress = getAddress(userAddress);

  // Check if we're withdrawing to an ENS or CNS name
  if (utils.isDomain(name)) return { safe: false, reason: `${name}, which is a publicly viewable name` };

  // We aren't withdrawing to a domain, so let's get the checksummed address.
  const destinationAddress = getAddress(name);

  // Check if address resolves to an ENS name
  const ensName = await lookupEnsName(destinationAddress, provider);
  if (ensName) return { safe: false, reason: `an address that resolves to the publicly viewable ENS name ${ensName}` };

  // Check if address owns a CNS name
  const cnsName = await lookupCnsName(destinationAddress, provider);
  if (cnsName) return { safe: false, reason: `an address that resolves to the publicly viewable CNS name ${cnsName}` };

  // Check if address is the wallet user is logged in with
  if (destinationAddress === userAddress) return { safe: false, reason: 'the same address as the connected wallet' };

  // Check if address owns any POAPs
  if (await hasPOAPs(destinationAddress)) return { safe: false, reason: 'an address that has POAP tokens' };

  // Check if address has contributed to Gitcoin Grants
  // TODO

  return { safe: true, reason: '' };
};

const jsonFetch = (url: string) => fetch(url).then((res) => res.json());

// Returns true if the address owns any POAP tokens
const hasPOAPs = async (address: string) => {
  const poaps = await jsonFetch(`https://api.poap.xyz/actions/scan/${address}`);
  return poaps.length > 0 ? true : false;
};
