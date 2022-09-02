import { BigNumber } from 'src/utils/ethers';
import { TransactionReceipt, JsonRpcSigner, Web3Provider } from 'src/utils/ethers';
import type { TokenList, TokenInfo } from '@uniswap/token-lists/dist/types';
import { UmbraLogger } from 'components/logger';
import { ETH_NETWORK_LOGO } from 'src/utils/constants';

export type { TokenList, TokenInfo } from '@uniswap/token-lists/dist/types';
export { BigNumber, Network, TransactionResponse } from 'src/utils/ethers';
export type Signer = JsonRpcSigner;
export type Provider = Web3Provider;

export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export interface MulticallResponse {
  blockNumber: BigNumber;
  returnData: string[];
}

// Spec: https://eips.ethereum.org/EIPS/eip-3085#specification
export type Chain = {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    // The address and logoURI fields are not part of the EIP-3085 spec but are added to make this field
    // compatible with type TokenInfo
    address: typeof NATIVE_TOKEN_ADDRESS;
    name: string;
    symbol: string;
    decimals: 18;
    logoURI: string;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  iconUrls?: string[];
  // logoURI is not part of EIP-3085, but is added for convenience because that is what our BaseSelect component
  // uses to display images form the chain objects it recevies. It's not required because we always want a chain
  // logo to be showin in the network selector dropdown
  logoURI: string;
};

export const supportedChains: Array<Chain> = [
  {
    chainId: '0x1',
    chainName: 'Mainnet',
    nativeCurrency: {
      address: NATIVE_TOKEN_ADDRESS,
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      logoURI: ETH_NETWORK_LOGO,
    },
    rpcUrls: [`https://mainnet.infura.io/v3/${String(process.env.INFURA_ID)}`],
    blockExplorerUrls: ['https://etherscan.io'],
    iconUrls: [ETH_NETWORK_LOGO],
    logoURI: ETH_NETWORK_LOGO,
  },
  {
    chainId: '0x4',
    chainName: 'Rinkeby',
    nativeCurrency: {
      address: NATIVE_TOKEN_ADDRESS,
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      logoURI: ETH_NETWORK_LOGO,
    },
    rpcUrls: [`https://rinkeby.infura.io/v3/${String(process.env.INFURA_ID)}`],
    blockExplorerUrls: ['https://rinkeby.etherscan.io'],
    iconUrls: [ETH_NETWORK_LOGO],
    logoURI: ETH_NETWORK_LOGO,
  },
  {
    chainId: '0xa', // 10 as hex
    chainName: 'Optimism',
    nativeCurrency: {
      address: NATIVE_TOKEN_ADDRESS,
      name: 'Ether',
      symbol: 'OETH',
      decimals: 18,
      logoURI: ETH_NETWORK_LOGO,
    },
    rpcUrls: ['https://mainnet.optimism.io', `https://optimism-mainnet.infura.io/v3/${String(process.env.INFURA_ID)}`],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    iconUrls: ['/networks/optimism.svg'],
    logoURI: '/networks/optimism.svg',
  },
  {
    chainId: '0x89', // 137 as hex
    chainName: 'Polygon',
    nativeCurrency: {
      address: NATIVE_TOKEN_ADDRESS,
      name: 'Matic',
      symbol: 'MATIC',
      decimals: 18,
      logoURI: '/tokens/polygon.png',
    },
    rpcUrls: ['https://polygon-rpc.com/', `https://polygon-mainnet.infura.io/v3/${String(process.env.INFURA_ID)}`],
    blockExplorerUrls: ['https://polygonscan.com'],
    iconUrls: ['/networks/polygon.svg'],
    logoURI: '/networks/polygon.svg',
  },
  {
    chainId: '0xa4b1', // 42161 as hex
    chainName: 'Arbitrum One',
    nativeCurrency: {
      address: NATIVE_TOKEN_ADDRESS,
      name: 'Ether',
      symbol: 'AETH',
      decimals: 18,
      logoURI: ETH_NETWORK_LOGO,
    },
    rpcUrls: ['https://arb1.arbitrum.io/rpc', `https://arbitrum-mainnet.infura.io/v3/${String(process.env.INFURA_ID)}`],
    blockExplorerUrls: ['https://arbiscan.io'],
    iconUrls: ['/networks/arbitrum.svg'],
    logoURI: '/networks/arbitrum.svg',
  },
];

// Set comprised of intersection of Chain IDs present for all contracts in src/contracts, supported by umbra-js, and by relayer
export type SupportedChainId = '1' | '4' | '10' | '137' | '42161'; // strings for indexing into JSON files
export const supportedChainIds = supportedChains.map((chain) => Number(chain.chainId)); // numbers for verifying the chainId user is connected to

// CNS names owned by wallet are queried from The Graph, so these types help parse the response
type CnsName = { name: string };
export interface CnsQueryResponse {
  data: {
    domains: CnsName[];
  };
}

// Relayer types
export type ApiError = { error: string };
export interface TokenInfoExtended extends TokenInfo {
  minSendAmount: string;
}
// Omit the TokenList.tokens type so we can override it with our own.
export interface TokenListSuccessResponse extends Omit<TokenList, 'tokens'> {
  nativeTokenMinSendAmount: string;
  tokens: TokenInfoExtended[];
}
export type TokenListResponse = TokenListSuccessResponse | ApiError;
export type FeeEstimate = { fee: string; token: TokenInfo };
export type FeeEstimateResponse = FeeEstimate | ApiError;
export type WithdrawalInputs = {
  stealthAddr: string;
  acceptor: string;
  signature: string;
  sponsorFee: string;
};
export type RelayResponse = { relayTransactionHash: string } | ApiError;
export type RelayerStatusResponse =
  | { receivedTime: string; broadcasts?: any[]; receipt?: TransactionReceipt }
  | ApiError;

// Logger type added to window
declare global {
  interface Window {
    logger: UmbraLogger;
  }
}
