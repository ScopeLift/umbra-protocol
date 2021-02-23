import { ethers } from 'ethers';

export { TokenList, TokenInfo } from '@uniswap/token-lists/dist/types';

export type Signer = ethers.providers.JsonRpcSigner;
export type Provider = ethers.providers.Web3Provider;
export type Network = ethers.providers.Network;
export type BigNumber = ethers.BigNumber;
export type TransactionResponse = ethers.providers.TransactionResponse;

export interface MulticallResponse {
  blockNumber: ethers.BigNumber;
  returnData: string[];
}

// Set comprised of intersection of Chain IDs present for all contracts in src/contracts and supported by umbra-js
export type SupportedChainIds = '4';
