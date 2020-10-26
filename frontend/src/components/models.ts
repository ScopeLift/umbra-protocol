import { ethers } from 'ethers';
import { KeyPair } from '@umbra/umbra-js';

export type Signer = ethers.providers.JsonRpcSigner;
export type Provider = ethers.providers.Web3Provider;
export type Network = ethers.providers.Network;
export type BigNumber = ethers.BigNumber;
export type TransactionResponse = ethers.providers.TransactionResponse;
export type KeyPair = typeof KeyPair;
