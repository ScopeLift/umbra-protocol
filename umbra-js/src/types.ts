import {
  BigNumber,
  Block,
  Event,
  ExternalProvider as EthersExternalProvider,
  JsonRpcFetchFunc,
  JsonRpcProvider,
  Overrides,
  TransactionReceipt,
  TransactionResponse,
  Web3Provider,
} from './ethers';

// ========================================= Ethers types ==========================================
export { TransactionResponse } from './ethers';
export type ExternalProvider = EthersExternalProvider | JsonRpcFetchFunc;
export type EthersProvider = Web3Provider | JsonRpcProvider;

// ======================================= Umbra class types =======================================
// Settings when instantiating an instance of the Umbra class
export interface ChainConfig {
  chainId: number; // Chain ID of the deployed contract
  umbraAddress: string; // address of Umbra contract
  startBlock: number; // block Umbra contract was deployed at
}

// Used for passing around encrypted random number
export interface EncryptedPayload {
  ephemeralPublicKey: string; // hex string with 0x04 prefix
  ciphertext: string; // hex string with 0x prefix
}

// Type for storing compressed public keys
export interface CompressedPublicKey {
  prefix: number;
  pubKeyXCoordinate: string; // has 0x prefix
}

// Overrides when sending funds. See the lookupRecipient method documentation for more information
export interface SendOverrides extends Overrides {
  advanced?: boolean;
  supportPubKey?: boolean;
  supportTxHash?: boolean;
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
  token: string; // token address
  block: Block;
  tx: TransactionResponse;
  receipt: TransactionReceipt;
  isWithdrawn: boolean;
}
