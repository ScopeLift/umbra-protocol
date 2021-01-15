/**
 * @dev Simplifies interaction with the Umbra contracts
 */

import { Contract } from 'ethers';
import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { ContractTransaction } from '@ethersproject/contracts';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { computePublicKey } from '@ethersproject/signing-key';

import { KeyPair } from './KeyPair';
import { RandomNumber } from './RandomNumber';
import { lookupRecipient } from '../utils/utils';
import { Umbra as UmbraContract, ERC20 } from '../../types/contracts';
import * as erc20Abi from '../abi/ERC20.json';
import type {
  EthersProvider,
  UmbraOverrides,
  // Announcement,
  // UserAnnouncementEvent,
} from '../types';

// Additional type definitions
interface ContactInfo {
  umbraAddress: string;
  umbraPaymasterAddress: string;
  startBlock: number;
}

interface AnnouncementEvent {
  receiver: string;
  amount: BigNumber;
  token: string;
  pkx: string;
  ciphertext: string;
}

// Umbra.sol ABI
const abi = require('../../../contracts/build/contracts/Umbra.json').abi;

// Mapping from chainId to contract information
const contractInfo: Record<number, ContactInfo> = {
  // Ropsten
  3: {
    umbraAddress: '0x3bB03be8dAB8969b16684D360eD2C7Aa47dC36f0',
    umbraPaymasterAddress: '0xCaA925B2A71933E9C4e3FE145019961A691Bdaf3',
    startBlock: 9473583, // block Umbra contract was deployed at
  },
  // Local
  1337: {
    umbraAddress: '0x3bB03be8dAB8969b16684D360eD2C7Aa47dC36f0',
    umbraPaymasterAddress: '0xCaA925B2A71933E9C4e3FE145019961A691Bdaf3',
    startBlock: 9473583,
  },
};

// Determines if the provided address is a token or ETH
const isETH = (token: string) => {
  if (token === 'ETH') return true;
  const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  return getAddress(token) === ETH_ADDRESS; // throws if not a valid address
};

// Error message to throw if a valid signer is required but not present
const missingSignerMessage =
  'This method requires a valid signer, but Umbra instance has a readonly provider';

export class Umbra {
  readonly signer: JsonRpcSigner | null; // null if connected with a readonly provider
  readonly umbraContract: UmbraContract;
  readonly chainId: number;

  // ======================================== CONSTRUCTORS =========================================
  /**
   * @notice Create Umbra instance to interact with the Umbra contracts
   * @dev WARNING: It is recommended that you do not call the constructor directly, and instead use
   * the static methods to generate an Umbra instance. If you do call the constructor directly, be
   * certain that the provided chain ID matches the provider's chain ID
   * @param provider ethers provider to use
   * @param chainId The Chain ID of the network
   * @param signer The associated signer, or null if no signer is available
   */
  constructor(readonly provider: EthersProvider, chainId: number, signer: JsonRpcSigner | null) {
    const supportedChainIds = Object.keys(contractInfo);
    if (!supportedChainIds.includes(String(chainId))) {
      throw new Error('Unsupported chainId');
    }

    this.signer = signer;
    this.chainId = chainId;
    this.umbraContract = new Contract(
      contractInfo[chainId].umbraAddress,
      abi,
      this.signer || this.provider
    ) as UmbraContract;
  }

  /**
   * @notice Generates Umbra instance from a web3 provider to read from and write to the Umbra contracts
   * @param signer Signer to use
   */
  static async create(signer: JsonRpcSigner) {
    const chainId = await signer.getChainId();
    return new Umbra(signer.provider, chainId, signer);
  }

  /**
   * @notice Generates Umbra instance from a JSON-RPC API to read from the Umbra contracts
   * @param url URL of the JSON-RPC provider to connect to
   */
  static async createReadonly(url: string) {
    const provider = new JsonRpcProvider(url);
    const network = await provider.getNetwork();
    return new Umbra(provider, network.chainId, null);
  }

  // ==================================== CONTRACT INTERACTION =====================================

  /**
   * @notice Send funds to a recipient via Umbra
   * @dev If sending tokens, make sure to handle the approvals before calling this method
   * @param token Address of token to send. Use 'ETH' or '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
   * to send Ether
   * @param amount Amount to send, in units of that token (e.g. use 1e6 to send 1 USDC)
   * @param recipientId Identifier of recipient, e.g. their ENS name
   * @param overrides Override the payload extension, gas limit, gas price, or nonce
   */
  async send(
    token: string,
    amount: BigNumber | string,
    recipientId: string,
    overrides: UmbraOverrides = {}
  ) {
    // Check for valid signer
    if (!this.signer) throw new Error(missingSignerMessage);

    // If applicable, check that sender has sufficient token balance. ETH balance is checked on send
    if (!isETH(token)) {
      const tokenContract = new Contract(token, erc20Abi, this.signer) as ERC20;
      const tokenBalance = await tokenContract.balanceOf(await this.signer.getAddress());
      if (tokenBalance.lt(amount)) {
        const providedAmount = BigNumber.from(amount).toString();
        const details = `Has ${tokenBalance.toString()} tokens, tried to send ${providedAmount} tokens.`;
        throw new Error(`Insufficient balance to complete transfer. ${details}`);
      }
    }

    // Get toll amount from contract
    const toll = await this.umbraContract.toll();

    // Lookup recipient's public key
    const recipientPubKey = await lookupRecipient(recipientId, this.provider);
    if (!recipientPubKey) throw new Error('No public key found for provided recipient ID');
    const recipientKeyPair = new KeyPair(recipientPubKey);

    // Generate random number
    const randomNumber = overrides.payloadExtension
      ? new RandomNumber(overrides.payloadExtension)
      : new RandomNumber();

    // Encrypt random number with recipient's public key
    const encrypted = recipientKeyPair.encrypt(randomNumber);

    // Get x,y coordinates of ephemeral private key
    const ephemeralKeyPair = new KeyPair(encrypted.ephemeralPublicKey);
    const ephemeralKeyPairX = computePublicKey(ephemeralKeyPair.publicKeyHex, true);
    const compressedXCoordinate = `0x${ephemeralKeyPairX.slice(4)}`;

    // Compute stealth address
    const stealthKeyPair = recipientKeyPair.mulPublicKey(randomNumber);

    // Get overrides object that removes the payload extension, for use with ethers
    const filteredOverrides = { ...overrides };
    delete filteredOverrides.payloadExtension;

    // Send transaction
    let tx: ContractTransaction;
    if (isETH(token)) {
      const txOverrides = { ...filteredOverrides, value: toll.add(amount) };
      tx = await this.umbraContract.sendEth(
        stealthKeyPair.address,
        compressedXCoordinate,
        encrypted.ciphertext,
        txOverrides
      );
    } else {
      const txOverrides = { ...filteredOverrides, value: toll };
      tx = await this.umbraContract.sendToken(
        stealthKeyPair.address,
        token,
        amount,
        compressedXCoordinate,
        encrypted.ciphertext,
        txOverrides
      );
    }

    // We do not wait for the transaction to be mined before returning it
    return { tx, stealthKeyPair };
  }

  /**
   * @notice Withdraw funds for a recipient
   * @param recipient Recipient address
   * @param overrides Override the payload extension, gas limit, gas price, or nonce
   */
  withdraw(token: string, recipient: string, overrides: UmbraOverrides = {}) {
    console.log(token, recipient, overrides);

    // Determine if recipient caller is withdrawing token or ETH by reading contract
    // TODO

    // // Withdraw funds
    // if (isETH(token)) {
    //   // Based on gas price, compute how much ETH to transfer to avoid dust
    //   // TODO
    // } else {
    //   // this.umbra.withdrawToken(...);
    // }
  }

  /**
   * @notice Scans Umbra event logs for funds sent to the specified address
   * @param keyPair KeyPair of user to scan for, must have associated private key
   */
  async scan(keyPair: KeyPair) {
    // Get start and end blocks to scan events for
    const startBlock = contractInfo[this.chainId].startBlock;
    const endBlock = 'latest';

    // Get list of all Announcement events
    const announcementFilter = this.umbraContract.filters.Announcement(
      null,
      null,
      null,
      null,
      null
    );
    const announcementEvents = await this.umbraContract.queryFilter(
      announcementFilter,
      startBlock,
      endBlock
    );

    // Get list of all TokenWithdrawal events
    const withdrawalFilter = this.umbraContract.filters.TokenWithdrawal(null, null, null, null);
    const withdrawalEvents = await this.umbraContract.queryFilter(
      withdrawalFilter,
      startBlock,
      endBlock
    );
    console.log('withdrawalEvents: ', withdrawalEvents);

    // Determine which announcements are for the user
    const userAnnouncementEvents = [];
    for (let i = 0; i < announcementEvents.length; i += 1) {
      const event = announcementEvents[i];

      // Extract out event parameters
      const {
        receiver,
        amount,
        token,
        pkx,
        ciphertext,
      } = (event.args as unknown) as AnnouncementEvent;

      // Get y-coordinate of public key from the x-coordinate by solving secp256k1 equation
      const uncompressedPubKey = KeyPair.getUncompressedFromX(pkx);

      // Decrypt to get random number
      const payload = { ephemeralPublicKey: uncompressedPubKey, ciphertext };
      const randomNumber = keyPair.decrypt(payload);

      // Get what our receiving address would be with this random number
      const computedReceivingAddress = keyPair.mulPublicKey(randomNumber).address;

      // If our receiving address matches the event's recipient, the transfer was for us
      if (computedReceivingAddress === receiver) {
        userAnnouncementEvents.push({ event, randomNumber, receiver, amount, token });
      }
    }

    // For each of the user's announcement events, determine if the funds were withdrawn
    // TODO

    return { userAnnouncementEvents /* userWithdrawalEvents, userEvents */ };
  }
}
