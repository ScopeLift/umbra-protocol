/**
 * @notice Helpers for managing and displaying addresses
 */

import { Provider } from 'components/models';
import { utils } from '@umbracash/umbra-js';
import {
  getAddress,
  Web3Provider,
  isHexString,
  namehash,
  Interface,
  Contract,
  StaticJsonRpcProvider,
} from 'src/utils/ethers';
import { getChainById, jsonFetch } from 'src/utils/utils';
import { tc } from '../boot/i18n';
import Resolution from '@unstoppabledomains/resolution';
import {
  MAINNET_PROVIDER,
  POLYGON_PROVIDER,
  MULTICALL_ABI,
  MULTICALL_ADDRESS,
  MAINNET_RPC_URL,
  POLYGON_RPC_URL,
} from 'src/utils/constants';
import { AddressZero, defaultAbiCoder } from 'src/utils/ethers';
import { UmbraApi } from 'src/utils/umbra-api';

// ================================================== Address Helpers ==================================================

// Returns an address with the following format: 0x1234...abcd
export const formatNameOrAddress = (nameOrAddress: string) => {
  return isHexString(nameOrAddress) ? `${nameOrAddress.slice(0, 6)}...${nameOrAddress.slice(38)}` : nameOrAddress;
};

// Returns an ENS or CNS name if found, otherwise returns the address
export const lookupAddress = async (address: string, provider: Provider | StaticJsonRpcProvider) => {
  const domainName = await lookupEnsOrCns(address, provider);
  return domainName ? domainName : address;
};

// Returns ENS name that address resolves to, or null if not found
export const lookupEnsName = async (address: string, provider: Provider | StaticJsonRpcProvider) => {
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

    const resolution = new Resolution({
      sourceConfig: {
        uns: {
          locations: {
            Layer1: {
              url: MAINNET_RPC_URL,
              network: 'mainnet',
            },
            Layer2: {
              url: POLYGON_RPC_URL,
              network: 'polygon-mainnet',
            },
          },
        },
      },
    });
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
const lookupEnsOrCns = async (address: string, provider: Provider | StaticJsonRpcProvider) => {
  const ensName = await lookupEnsName(address, provider);
  if (ensName) return ensName;

  const cnsName = await lookupCnsName(address);
  if (cnsName) return cnsName;

  return null;
};

// Takes an ENS, CNS, or address, and returns the checksummed address
export const toAddress = utils.toAddress;

// =============================================== Bulk Address Helpers ================================================
// Duplicates of the above methods for operating on multiple addresses in parallel

export const formatAddresses = (addresses: string[]) => addresses.map(formatNameOrAddress);

export const lookupEnsNameBatch = async (addresses: string[], provider: Provider | StaticJsonRpcProvider) => {
  // Based on https://github.com/ethers-io/ethers.js/blob/0802b70a724321f56d4c170e4c8a46b7804dfb48/src.ts/providers/abstract-provider.ts#L976
  const multicall = new Contract(MULTICALL_ADDRESS, MULTICALL_ABI, provider);
  const ensRegistryAddr = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
  const ensRegistryInterface = new Interface(['function resolver(bytes32) view returns (address)']);
  const resolverInterface = new Interface([
    'function name(bytes32) view returns (string)',
    'function addr(bytes32) view returns (address)',
  ]);

  // REVERSE LOOKUP.
  const reverseNodes = addresses.map((addr) => namehash(addr.substring(2).toLowerCase() + '.addr.reverse'));
  const reverseResolverCalls = reverseNodes.map((node) => ({
    target: ensRegistryAddr,
    allowFailure: true,
    callData: ensRegistryInterface.encodeFunctionData('resolver', [node]),
  }));
  type Response = { success: boolean; returnData: string };
  const reverseResolverResults: Response[] = await multicall.callStatic.aggregate3(reverseResolverCalls);

  const reverseResolverAddrs = reverseResolverResults.map(({ returnData }) => getAddress(`0x${returnData.slice(26)}`));
  const nameCalls = reverseResolverAddrs.map((resolverAddr, i) => ({
    target: resolverAddr,
    allowFailure: true,
    callData: resolverInterface.encodeFunctionData('name', [reverseNodes[i]]),
  }));
  const nameResponses: Response[] = await multicall.callStatic.aggregate3(nameCalls);
  const names = nameResponses.map(({ success, returnData }, i) => {
    if (!success || returnData === '0x') return addresses[i];
    return <string>resolverInterface.decodeFunctionResult('name', returnData)[0];
  });

  // FORWARD LOOKUP.
  // Some ENS names have invalid characters that error when computing their namehash. For example,
  // codepoint U+200C Zero Width Non-Joiner is a common one used by scammers, because it is
  // invisible: https://codepoints.net/U+200C?lang=en
  // To handle these names, we set the node value to 32 bytes of zeroes and continue onwards. We'll
  // have to account for this again later, but it's simpler than the alternative approach of
  // removing these values from the array and keeping track of the indices. This approach works
  // because no one can register a name that has a namehash of 32 bytes of zeroes.
  const forwardNodes = names.map((name) => {
    try {
      return namehash(name);
    } catch (err) {
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
  });
  const forwardResolverCalls = forwardNodes.map((node) => {
    return {
      target: ensRegistryAddr,
      allowFailure: true,
      callData: ensRegistryInterface.encodeFunctionData('resolver', [node]),
    };
  });

  // For namehashes that were invalid and replaced with zeroes, we'll get the zero address as the resolver.
  const forwardResolverResults: Response[] = await multicall.callStatic.aggregate3(forwardResolverCalls);

  const addrCalls = forwardResolverResults.map(({ returnData }, i) => {
    const resolverAddr = ensRegistryInterface.decodeFunctionResult('resolver', returnData)[0];
    return {
      target: resolverAddr,
      allowFailure: true,
      callData: resolverInterface.encodeFunctionData('addr', [forwardNodes[i]]),
    };
  });

  // For cases where the resolver is the zero address, the call will be successful but the return
  // data will be empty, i.e. `0x`.
  const addrResponses: Response[] = await multicall.callStatic.aggregate3(addrCalls);
  const forwardAddrs = addrResponses.map(({ success, returnData }, i) => {
    if (!success || returnData === '0x') return names[i]; // This is an address in these cases.
    return <string>resolverInterface.decodeFunctionResult('addr', returnData)[0];
  });
  return { names, forwardAddrs };
};

const lookupCNSNameBatch = async (
  addresses: string[],
  registryAddr: string,
  provider: Provider | StaticJsonRpcProvider
) => {
  const multicall = new Contract(MULTICALL_ADDRESS, MULTICALL_ABI, provider);
  const ensRegistryInterface = new Interface(['function reverseNameOf(address) view returns (string)']);
  const reverseResolverCalls = addresses.map((addr) => ({
    target: registryAddr,
    allowFailure: true,
    callData: ensRegistryInterface.encodeFunctionData('reverseNameOf', [addr]),
  }));

  type Response = { success: boolean; returnData: string };
  const reverseResolverResults: Response[] = await multicall.callStatic.aggregate3(reverseResolverCalls);
  const results = reverseResolverResults.map((resp) => {
    if (resp?.returnData !== AddressZero) {
      const addr = defaultAbiCoder.decode(['string'], resp.returnData) as string[];
      return addr[0];
    }
    return '';
  });
  return results;
};

const lookupCNSNameBatchMainnet = async (addresses: string[]) => {
  return await lookupCNSNameBatch(addresses, '0xCd451149ffa9d059030528917842bcE14327DfD6', MAINNET_PROVIDER);
};

const lookupCNSNameBatchPolygon = async (addresses: string[]) => {
  return await lookupCNSNameBatch(addresses, '0xa9a6A3626993D487d2Dbda3173cf58cA1a9D9e9f', POLYGON_PROVIDER);
};

const lookupCnsNameBatch = async (addresses: string[]) => {
  try {
    const [resultL1, resultL2] = await Promise.all([
      lookupCNSNameBatchMainnet(addresses),
      lookupCNSNameBatchPolygon(addresses),
    ]);

    return resultL1.map((val, idx) => val || resultL2[idx]);
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const lookupOrReturnAddresses = async (addresses: string[], provider: Provider | StaticJsonRpcProvider) => {
  const { names, forwardAddrs } = await lookupEnsNameBatch(addresses, provider);
  const cnsNames = await lookupCnsNameBatch(addresses);

  // VERIFY THAT THEY MATCH.
  return names.map((name, i) => {
    if (!isHexString(forwardAddrs[i])) return addresses[i]; // Safety check.
    if (getAddress(addresses[i]) === getAddress(forwardAddrs[i])) return name;
    if (cnsNames[i]) return cnsNames[i];
    return addresses[i];
  });
};

// ================================================== Privacy Checks ===================================================

// Checks for any potential risks of withdrawing to the provided name or address, returns object containing
// a true/false judgement about risk, and HTML strings with details about the warnings
export const isAddressSafe = async (
  name: string,
  userAddress: string,
  stealthAddress: string,
  senderAddress: string,
  provider: Provider
) => {
  const reasons: string[] = [];
  userAddress = getAddress(userAddress);
  stealthAddress = getAddress(stealthAddress);
  const promises = [];

  // Check if we're withdrawing to an ENS or CNS name
  const isDomain = utils.isDomain(name);
  if (isDomain) reasons.push(tc('Utils.Address.name-publicly-viewable'));

  // Get the address the provided name/address resolves to
  const destinationAddress = isDomain ? await utils.toAddress(name, provider) : getAddress(name);

  // If input was an address, check if address resolves to an ENS or CNS name
  if (!isDomain) {
    const ensCheck = async () => {
      const ensName = await lookupEnsName(destinationAddress, MAINNET_PROVIDER as Web3Provider);
      if (ensName) reasons.push(`${tc('Utils.Address.name-resolves-to-ens')} ${ensName}`);
    };
    const cnsCheck = async () => {
      const cnsName = await lookupCnsName(destinationAddress);
      if (cnsName) reasons.push(`${tc('Utils.Address.name-resolves-to-cns')} ${cnsName}`);
    };
    promises.push(ensCheck());
    promises.push(cnsCheck());
  }

  // Check if address is the wallet user is logged in with
  if (destinationAddress.toLowerCase() === userAddress.toLowerCase()) reasons.push(`${tc('Utils.Address.it')} ${isDomain ? tc('Utils.Address.resolves-to') : tc('Utils.Address.is')} ${tc('Utils.Address.same-addr-as-wallet')}`); // prettier-ignore

  // Check if the address is the stealth address that was sent funds
  if (destinationAddress.toLowerCase() === stealthAddress.toLowerCase()) reasons.push(`${tc('Utils.Address.it')} ${isDomain ? tc('Utils.Address.resolves-to') : tc('Utils.Address.is')} ${tc('Utils.Address.same-addr-as-stealth')}`); // prettier-ignore

  // Check if address is initial sender of funds
  if (destinationAddress.toLowerCase() === senderAddress.toLowerCase()) reasons.push(`${tc('Utils.Address.it')} ${isDomain ? tc('Utils.Address.resolves-to') : tc('Utils.Address.is')} ${tc('Utils.Address.same-addr-as-sender')}`); // prettier-ignore

  // Check if the address has registered stealth keys
  const hasRegisteredStealthKeys = async () => {
    try {
      const stealthPubKeys = await utils.lookupRecipient(destinationAddress, provider); // throws if no keys found
      if (stealthPubKeys) reasons.push(`${tc('Utils.Address.it')} ${isDomain ? tc('Utils.Address.resolves-to') : tc('Utils.Address.is')} ${tc('Utils.Address.addr-is-registered')}`); // prettier-ignore
      return null;
    } catch (err) {
      return null;
    }
  };
  promises.push(hasRegisteredStealthKeys());

  // Check if address owns any POAPs
  const hasPOAPsCheck = async () => {
    const has = await hasPOAPs(destinationAddress);
    if (has) reasons.push(`${isDomain ? tc('Utils.Address.address-it-resolves-to') : tc('Utils.Address.it')} ${tc('Utils.Address.has-poap-tokens')}`); // prettier-ignore
  };

  const isGitcoinContributor = async (address: string) => {
    let resp;
    try {
      resp = await UmbraApi.isGitcoinContributor(address);
    } catch (err) {
      window.logger.warn('Error fetching is gitcoin contributor');
      window.logger.warn(err);
    }
    if (resp && resp.isContributor) {
      reasons.push(`${tc('Utils.Address.address-it-resolves-to')} ${tc('Utils.Address.gitcoin-contributor')}.`);
    }
  };
  promises.push(hasPOAPsCheck());
  promises.push(isGitcoinContributor(destinationAddress));

  // Check if address has contributed to Gitcoin Grants
  // TODO

  // If we're withdrawing to an ENS name, and if we're not on L1, and if the L1 address it resolves to is a contract,
  // warn that the contract may not exist or may not be the same contract on
  const contractENSCheck = async () => {
    const { chainId } = await provider.getNetwork();
    if (isDomain && chainId !== 1) {
      const code = await MAINNET_PROVIDER.getCode(destinationAddress);
      if (code !== '0x') {
        const networkName = getChainById(chainId)?.chainName as string;
        reasons.push(`It resolves to address <span class="code">${destinationAddress}</span>. This resolution is done via mainnet, but you are withdrawing on ${networkName}. This address contains a contract on mainnet, and <span class="text-bold">that same contract may not exist on ${networkName}</span>`); // prettier-ignore
      }
    }
  };
  promises.push(contractENSCheck());

  const results = await Promise.allSettled(promises);
  results.forEach((res) => {
    if (res.status === 'rejected') {
      console.error(res?.reason);
    }
  });

  return { safe: reasons.length === 0, reasons };
};

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
