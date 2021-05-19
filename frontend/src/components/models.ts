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

// Set comprised of intersection of Chain IDs present for all contracts in src/contracts, supported by umbra-js, and by relayer
export type SupportedChainIds = '1' | '4'; // strings for indexing into JSON files
export const supportedChainIds = [1, 4]; // numbers for verifying the chainId user is connected to

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
