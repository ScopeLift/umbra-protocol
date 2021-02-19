import { ethers } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import { Event, Overrides } from '@ethersproject/contracts';
import {
  Block,
  TransactionReceipt,
  TransactionResponse,
  JsonRpcProvider,
  Web3Provider,
} from '@ethersproject/providers';

// ========================================= Ethers types ==========================================
export { SignatureLike } from '@ethersproject/bytes';
export { TransactionResponse } from '@ethersproject/providers';

export type ExternalProvider =
  | ethers.providers.ExternalProvider
  | ethers.providers.JsonRpcFetchFunc;

export type EthersProvider = Web3Provider | JsonRpcProvider;

// ======================================= Umbra class types =======================================
// Settings when instantiating an instance of the Umbra class
export interface ChainConfig {
  umbraAddress: string; // address of Umbra contract
  startBlock: number; // block Umbra contract was deployed at
}

// Type for storing compressed public keys
export interface CompressedPublicKey {
  prefix: number;
  pubKeyXCoordinate: string; // has 0x prefix
}

// Overrides when sending funds
export interface SendOverrides extends Overrides {
  payloadExtension?: string;
}

// Overrides for the start and end block numbers to use when scanning for events
export interface ScanOverrides {
  startBlock?: number | string;
  endBlock?: number | string;
}

// Type definition for Announcement events emitted from the contract
export interface Announcement {
  receiver: string;
  amount: BigNumber;
  token: string;
  pkx: string;
  ciphertext: string;
}

// A UserAnnouncement is an Announcement event from Umbra where the recipient is the specified user
export interface UserAnnouncement {
  event: Event;
  randomNumber: string;
  receiver: string;
  amount: BigNumber;
  token: string;
  block: Block;
  tx: TransactionResponse;
  receipt: TransactionReceipt;
}

// ======================================= ENS-related types =======================================
export type EnsNamehash = {
  hash: (name: string) => string;
  normalize: (name: string) => string;
};
