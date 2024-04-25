import { BigNumber } from 'src/utils/ethers';
import { JsonRpcSigner, Web3Provider } from 'src/utils/ethers';
import type { TokenList, TokenInfo } from '@uniswap/token-lists/dist/types';
import { UmbraLogger } from 'components/logger';
import {
  ETH_NETWORK_LOGO,
  MAINNET_RPC_URL,
  POLYGON_RPC_URL,
  OPTIMISM_RPC_URL,
  SEPOLIA_RPC_URL,
  ARBITRUM_ONE_RPC_URL,
  GNOSIS_CHAIN_RPC_URL,
  BASE_RPC_URL,
} from 'src/utils/constants';

export type { TokenList, TokenInfo } from '@uniswap/token-lists/dist/types';
export { BigNumber } from 'src/utils/ethers';
export type { Network, TransactionResponse } from 'src/utils/ethers';
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
  logoURI?: string; // Must be optional so it can be deleted before calling `wallet_addEthereumChain`.
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
    rpcUrls: [MAINNET_RPC_URL],
    blockExplorerUrls: ['https://etherscan.io'],
    iconUrls: [ETH_NETWORK_LOGO],
    logoURI: ETH_NETWORK_LOGO,
  },
  {
    chainId: '0xaa36a7', // 11155111 as hex
    chainName: 'Sepolia',
    nativeCurrency: {
      address: NATIVE_TOKEN_ADDRESS,
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      logoURI: ETH_NETWORK_LOGO,
    },
    rpcUrls: [SEPOLIA_RPC_URL],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    iconUrls: [ETH_NETWORK_LOGO],
    logoURI: ETH_NETWORK_LOGO,
  },
  {
    chainId: '0xa', // 10 as hex
    chainName: 'Optimism',
    nativeCurrency: {
      address: NATIVE_TOKEN_ADDRESS,
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      logoURI: ETH_NETWORK_LOGO,
    },
    rpcUrls: ['https://mainnet.optimism.io', OPTIMISM_RPC_URL],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    iconUrls: ['/networks/optimism.svg'],
    logoURI: '/networks/optimism.svg',
  },
  {
    chainId: '0x64', // 100 as hex
    chainName: 'Gnosis Chain',
    nativeCurrency: {
      address: NATIVE_TOKEN_ADDRESS,
      name: 'xDAI',
      symbol: 'xDAI',
      decimals: 18,
      logoURI: 'https://docs.gnosischain.com/img/tokens/xdai.png',
    },
    rpcUrls: ['https://rpc.ankr.com/gnosis', GNOSIS_CHAIN_RPC_URL],
    blockExplorerUrls: ['https://gnosisscan.io'],
    iconUrls: ['/networks/gnosis.svg'],
    logoURI: '/networks/gnosis.svg',
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
    rpcUrls: ['https://polygon-rpc.com/', POLYGON_RPC_URL],
    blockExplorerUrls: ['https://polygonscan.com'],
    iconUrls: ['/networks/polygon.svg'],
    logoURI: '/networks/polygon.svg',
  },
  {
    chainId: '0x2105', // 8453 as hex
    chainName: 'Base',
    nativeCurrency: {
      address: NATIVE_TOKEN_ADDRESS,
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      logoURI: ETH_NETWORK_LOGO,
    },
    rpcUrls: ['https://mainnet.base.org', BASE_RPC_URL],
    blockExplorerUrls: ['https://basescan.org'],
    iconUrls: ['/networks/base.svg'],
    logoURI: '/networks/base.svg',
  },
  {
    chainId: '0xa4b1', // 42161 as hex
    chainName: 'Arbitrum One',
    nativeCurrency: {
      address: NATIVE_TOKEN_ADDRESS,
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      logoURI: ETH_NETWORK_LOGO,
    },
    rpcUrls: ['https://arb1.arbitrum.io/rpc', ARBITRUM_ONE_RPC_URL],
    blockExplorerUrls: ['https://arbiscan.io'],
    iconUrls: ['/networks/arbitrum.svg'],
    logoURI: '/networks/arbitrum.svg',
  },
];

// Set comprised of intersection of Chain IDs present for all contracts in src/contracts, supported by umbra-js, and by relayer
export type SupportedChainId = '1' | '10' | '100' | '137' | '8453' | '42161' | '11155111'; // strings for indexing into JSON files
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
export interface UmbraApiVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface TokenInfoExtended extends TokenInfo {
  minSendAmount: string;
}
// Omit the TokenList.tokens type so we can override it with our own.
export interface TokenListSuccessResponse extends Omit<TokenList, 'tokens'> {
  umbraApiVersion: UmbraApiVersion;
  nativeTokenMinSendAmount: string;
  tokens: TokenInfoExtended[];
}
export type TokenListResponse = TokenListSuccessResponse | ApiError;
export type FeeEstimate = { umbraApiVersion: UmbraApiVersion; fee: string; token: TokenInfo };
export type FeeEstimateResponse = FeeEstimate | ApiError;
export type WithdrawalInputs = {
  stealthAddr: string;
  acceptor: string;
  signature: string;
  sponsorFee: string;
};
export type RelayResponse = { umbraApiVersion: UmbraApiVersion; relayTransactionHash: string } | ApiError;

export type SendTableMetadataRow = {
  dateSent: string;
  dateSentUnix: number;
  dateSentTime: string;
  amount: string;
  address: string;
  recipientId: string;
  txHash: string;
  tokenLogo?: string;
  tokenAddress: string;
  tokenSymbol: string;
  advancedMode: boolean;
  usePublicKeyChecked: boolean;
};

// Logger type added to window
declare global {
  interface Window {
    logger: UmbraLogger;
  }
}

export type Language = { label: string; value: string };
