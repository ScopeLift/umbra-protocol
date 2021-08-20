import { ethers } from 'ethers';
import { TransactionReceipt, JsonRpcSigner, Web3Provider } from 'src/utils/ethers';
import type { TokenList, TokenInfo } from '@uniswap/token-lists/dist/types';
import { UmbraLogger } from 'components/logger';

export type { TokenList, TokenInfo } from '@uniswap/token-lists/dist/types';
export { BigNumber, Network, TransactionResponse } from 'src/utils/ethers';
export type Signer = JsonRpcSigner;
export type Provider = Web3Provider;

export interface MulticallResponse {
  blockNumber: ethers.BigNumber;
  returnData: string[];
}

// Spec: https://eips.ethereum.org/EIPS/eip-3085#specification
export type Chain = {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: 18;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  iconUrls?: string[];
};
export const supportedChains: Array<Chain> = [
  {
    chainId: '0x1',
    chainName: 'Mainnet',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [`https://mainnet.infura.io/v3/${String(process.env.INFURA_ID)}`],
    blockExplorerUrls: ['etherscan.io'],
    iconUrls: [],
  },
  /*
  {
    chainId: '0x3',
    chainName: 'Ropsten',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [`https://ropsten.infura.io/v3/${String(process.env.INFURA_ID)}`],
    blockExplorerUrls: ['ropsten.etherscan.io'],
    iconUrls: [],
  },
*/
  {
    chainId: '0x4',
    chainName: 'Rinkeby',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [`https://rinkeby.infura.io/v3/${String(process.env.INFURA_ID)}`],
    blockExplorerUrls: ['rinkeby.etherscan.io'],
    iconUrls: [],
  },
  /*
  {
    chainId: '0x5',
    chainName: 'Goerli',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [`https://goerli.infura.io/v3/${String(process.env.INFURA_ID)}`],
    blockExplorerUrls: ['goerli.etherscan.io'],
    iconUrls: [],
  },
  {
    chainId: '0x42',
    chainName: 'Kovan',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [`https://kovan.infura.io/v3/${String(process.env.INFURA_ID)}`],
    blockExplorerUrls: ['kovan.etherscan.io'],
    iconUrls: [],
  },
  {
    chainId: '0x137',
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: [`https://polygon-mainnet.infura.io/v3/${String(process.env.INFURA_ID)}`],
    blockExplorerUrls: ['polygonscan.com'],
    iconUrls: [],
  },
  {
    chainId: '0x80001',
    chainName: 'Polygon Testnet',
    nativeCurrency: {
      name: 'tMATIC',
      symbol: 'tMATIC',
      decimals: 18,
    },
    rpcUrls: [`https://polygon-mumbai.infura.io/v3/${String(process.env.INFURA_ID)}`],
    blockExplorerUrls: ['mumbai.polygonscan.com'],
    iconUrls: [],
  },
*/
];
// Set comprised of intersection of Chain IDs present for all contracts in src/contracts, supported by umbra-js, and by relayer
export type SupportedChainIds = '1' | '4'; // strings for indexing into JSON files
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
export type TokenListResponse = TokenList | ApiError;
export type FeeEstimate = { fee: string; token: TokenInfo };
export type FeeEstimateResponse = FeeEstimate | ApiError;
export type WithdrawalInputs = {
  stealthAddr: string;
  acceptor: string;
  signature: string;
  sponsorFee: string;
};
export type RelayResponse = { relayTransactionHash: string } | ApiError;
export type ITXStatusResponse = { receivedTime: string; broadcasts?: any[]; receipt?: TransactionReceipt } | ApiError;
export type ConfirmedITXStatusResponse = { receivedTime: string; broadcasts: any[]; receipt: TransactionReceipt };

// Logger type added to window
declare global {
  interface Window {
    logger: UmbraLogger;
  }
}
