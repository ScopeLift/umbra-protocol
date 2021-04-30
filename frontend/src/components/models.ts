import { ethers } from 'ethers';
import { TransactionReceipt, JsonRpcSigner, Web3Provider } from 'src/utils/ethers';
import { TokenList, TokenInfo } from '@uniswap/token-lists/dist/types';

export { TokenList, TokenInfo } from '@uniswap/token-lists/dist/types';
export { BigNumber, Network, TransactionResponse } from 'src/utils/ethers';
export type Signer = JsonRpcSigner;
export type Provider = Web3Provider;

export interface MulticallResponse {
  blockNumber: ethers.BigNumber;
  returnData: string[];
}

// Set comprised of intersection of Chain IDs present for all contracts in src/contracts and supported by umbra-js
export type SupportedChainIds = '4';

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
export type FeeEstimateResponse = { fee: string; token: TokenInfo } | ApiError;
export type WithdrawalInputs = {
  stealthAddr: string;
  acceptor: string;
  signature: string;
  sponsorFee: string;
};
export type RelayResponse = { itxId: string } | ApiError;
export type ITXStatusResponse = { receivedTime: string; broadcasts?: any[]; receipt?: TransactionReceipt } | ApiError;
