import { ethers } from 'ethers';

export { TokenList, TokenInfo } from '@uniswap/token-lists';

export type Signer = ethers.providers.JsonRpcSigner;
export type Provider = ethers.providers.Web3Provider;
export type Network = ethers.providers.Network;
export type BigNumber = ethers.BigNumber;
export type TransactionResponse = ethers.providers.TransactionResponse;

export interface MulticallResponse {
  blockNumber: ethers.BigNumber;
  returnData: string[];
}
