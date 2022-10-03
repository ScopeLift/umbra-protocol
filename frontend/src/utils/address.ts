/**
 * @notice Helpers for managing and displaying addresses
 */

import { Provider } from 'components/models';
import { utils } from '@umbra/umbra-js';
import { MAINNET_PROVIDER } from 'src/utils/constants';
import { getAddress, Web3Provider, isHexString } from 'src/utils/ethers';
import { getChainById, isERC20, isERC721 } from 'src/utils/utils';
import { i18n } from '../boot/i18n';
import Resolution from '@unstoppabledomains/resolution';
// ================================================== Address Helpers ==================================================

// Returns an address with the following format: 0x1234...abcd
export const formatNameOrAddress = (nameOrAddress: string) => {
  return isHexString(nameOrAddress) ? `${nameOrAddress.slice(0, 6)}...${nameOrAddress.slice(38)}` : nameOrAddress;
};

// Returns an ENS or CNS name if found, otherwise returns the address
export const lookupAddress = async (address: string, provider: Provider) => {
  const domainName = await lookupEnsOrCns(address, provider);
  return domainName ? domainName : address;
};

// Returns an ENS or CNS name if found, otherwise returns the address
export const lookupOrReturnAddress = async (address: string, provider: Provider) => {
  const domainName = await lookupAddress(address, provider);
  return domainName !== address ? domainName : address;
};

// Returns ENS name that address resolves to, or null if not found
export const lookupEnsName = async (address: string, provider: Provider) => {
  try {
    const name = await provider.lookupAddress(address);
    return name;
  } catch (err) {
    console.warn('Error in lookupEnsName');
    console.warn(err);
    return null;
  }
};

// Fetches all mainnet CNS names owned by an address and returns the first one
export const lookupCnsName = async (address: string) => {
  try {
    // Send request to get names
    const resolution = Resolution.infura(String(process.env.INFURA_ID));
    const domain = await resolution.reverse(address);
    return domain;
  } catch (err) {
    // Scenario that prompted this try/catch was that The Graph API threw with a CORS error on localhost, blocking login
    console.warn('Error in lookupCnsName');
    console.warn(err);
    return null;
  }
};

// Returns an ENS or CNS name if found, otherwise returns null
const lookupEnsOrCns = async (address: string, provider: Provider) => {
  const cnsName = await lookupCnsName(address);
  if (cnsName) return cnsName;

  const ensName = await lookupEnsName(address, provider);
  if (ensName) return ensName;

  return null;
};

// Takes an ENS, CNS, or address, and returns the checksummed address
export const toAddress = utils.toAddress;

// =============================================== Bulk Address Helpers ================================================
// Duplicates of the above methods for operating on multiple addresses in parallel

export const formatAddresses = (addresses: string[]) => addresses.map(formatNameOrAddress);

export const lookupAddresses = async (addresses: string[], provider: Provider) => {
  const promises = addresses.map((address) => lookupAddress(address, provider));
  return Promise.all(promises);
};

export const lookupOrReturnAddresses = async (addresses: string[], provider: Provider) => {
  const promises = addresses.map((address) => lookupOrReturnAddress(address, provider));
  return Promise.all(promises);
};

// ================================================== Privacy Checks ===================================================

// Checks for any potential risks of withdrawing to the provided name or address, returns object containing
// a true/false judgement about risk, and HTML strings with details about the warnings
export const isAddressSafe = async (name: string, userAddress: string, stealthAddress: string, provider: Provider) => {
  const reasons: string[] = [];
  userAddress = getAddress(userAddress);
  stealthAddress = getAddress(stealthAddress);

  // Check if we're withdrawing to an ENS or CNS name
  const isDomain = utils.isDomain(name);
  if (isDomain) reasons.push(i18n.tc('Utils.Address.name-publicly-viewable'));

  // Get the address the provided name/address resolves to
  const destinationAddress = isDomain ? await utils.toAddress(name, provider) : getAddress(name);

  // If input was an address, check if address resolves to an ENS or CNS name
  if (!isDomain) {
    const ensName = await lookupEnsName(destinationAddress, MAINNET_PROVIDER as Web3Provider);
    if (ensName) reasons.push(`${i18n.tc('Utils.Address.name-resolves-to-ens')} ${ensName}`);

    const cnsName = await lookupCnsName(destinationAddress);
    if (cnsName) reasons.push(`${i18n.tc('Utils.Address.name-resolves-to-cns')} ${cnsName}`);
  }

  // Check if address is the wallet user is logged in with
  if (destinationAddress.toLowerCase() === userAddress.toLowerCase()) reasons.push(`${i18n.tc('Utils.Address.it')} ${isDomain ? i18n.tc('Utils.Address.resolves-to') : i18n.tc('Utils.Address.is')} ${i18n.tc('Utils.Address.same-addr-as-wallet')}`); // prettier-ignore

  // Check if the address is the stealth address that was sent funds
  if (destinationAddress.toLowerCase() === stealthAddress.toLowerCase()) reasons.push(`${i18n.tc('Utils.Address.it')} ${isDomain ? i18n.tc('Utils.Address.resolves-to') : i18n.tc('Utils.Address.is')} ${i18n.tc('Utils.Address.same-addr-as-stealth')}`); // prettier-ignore

  // Check if address owns any POAPs
  if (await hasPOAPs(destinationAddress)) reasons.push(`${isDomain ? i18n.tc('Utils.Address.address-it-resolves-to') : i18n.tc('Utils.Address.it')} ${i18n.tc('Utils.Address.has-poap-tokens')}`); // prettier-ignore

  // Check if address has contributed to Gitcoin Grants
  // TODO

  // Check if address is an ERC20
  const desIsERC20 = await isERC20(destinationAddress, provider);
  if (desIsERC20) {
    reasons.push(`${i18n.tc('Utils.Address.it')} ${i18n.tc('Utils.Address.is')} ${i18n.tc('Utils.Address.is-erc20')}`);
  }

  // Check if address is an ERC721
  const desIsERC721 = await isERC721(destinationAddress, provider);
  if (!desIsERC20 && desIsERC721) {
    reasons.push(`${i18n.tc('Utils.Address.it')} ${i18n.tc('Utils.Address.is')} ${i18n.tc('Utils.Address.is-erc721')}`);
  }

  // If we're withdrawing to an ENS name, and if we're not on L1, and if the L1 address it resolves to is a contract,
  // warn that the contract may not exist or may not be the same contract on
  const { chainId } = await provider.getNetwork();
  if (isDomain && chainId !== 1) {
    const code = await MAINNET_PROVIDER.getCode(destinationAddress);
    if (code !== '0x') {
      const networkName = getChainById(chainId)?.chainName as string;
      reasons.push(`It resolves to address <span class="code">${destinationAddress}</span>. This resolution is done via mainnet, but you are withdrawing on ${networkName}. This address contains a contract on mainnet, and <span class="text-bold">that same contract may not exist on ${networkName}</span>`); // prettier-ignore
    }
  }

  return { safe: reasons.length === 0, reasons };
};

const jsonFetch = (url: string) => fetch(url).then((res) => res.json());

// Returns true if the address owns any POAP tokens
const hasPOAPs = async (address: string) => {
  try {
    const poaps = await jsonFetch(`https://api.poap.xyz/actions/scan/${address}`);
    return poaps.length > 0 ? true : false;
  } catch (err) {
    window.logger.warn('Error in hasPOAPs');
    window.logger.warn(err);
    return false;
  }
};
