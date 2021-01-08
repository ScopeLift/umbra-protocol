import { ethers } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import { Event, Overrides } from '@ethersproject/contracts';
import { JsonRpcProvider, Web3Provider } from '@ethersproject/providers';

export { SignatureLike } from '@ethersproject/bytes';

export interface UmbraOverrides extends Overrides {
  payloadExtension?: string;
}

export type ExternalProvider =
  | ethers.providers.ExternalProvider
  | ethers.providers.JsonRpcFetchFunc;

export type EthersProvider = Web3Provider | JsonRpcProvider;

export type EnsNamehash = {
  hash: (name: string) => string;
  normalize: (name: string) => string;
};

export interface Announcement {
  receiver: string;
  amount: BigNumber;
  token: string;
  pkx: string;
  ciphertext: string;
}

// A UserAnnouncementEvent is an Announcement event from Umbra where the recipient is the specified user
export interface UserAnnouncementEvent {
  event: Event;
  randomNumber: string;
  receiver: string;
  amount: BigNumber;
  token: string;
  blockNumber: number;
  timestamp: number;
  sender: string;
}
