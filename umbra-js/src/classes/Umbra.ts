/**
 * @dev Simplifies interaction with the Umbra contracts
 */

import { KeyPair } from './KeyPair';
import { Contract } from 'ethers';
import { Umbra as UmbraContract } from '../../types/contracts';
import { getAddress } from '@ethersproject/address';
import { JsonRpcProvider, JsonRpcSigner, Web3Provider } from '@ethersproject/providers';
import type { ExternalProvider, UmbraOverrides } from '../types';

// Umbra.sol ABI
const abi = require('../../../contracts/build/contracts/Umbra.json').abi;

// Mapping from chainId to contract information
const contractInfo: Record<number, Record<string, string>> = {
  // Ropsten
  3: {
    umbraAddress: '0x3bB03be8dAB8969b16684D360eD2C7Aa47dC36f0',
    umbraPaymasterAddress: '0xCaA925B2A71933E9C4e3FE145019961A691Bdaf3',
    startBlock: '7938811', // block Umbra contract was deployed at
  },
  // Local
  1337: {
    umbraAddress: '0x3bB03be8dAB8969b16684D360eD2C7Aa47dC36f0',
    umbraPaymasterAddress: '0xCaA925B2A71933E9C4e3FE145019961A691Bdaf3',
    startBlock: '0',
  },
};

// Determines if the provided address is a token or ETH
const isETH = (token: string) => {
  if (token === 'ETH') return true;
  const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  return getAddress(token) === ETH_ADDRESS; // throws if not a valid address
};

export class Umbra {
  readonly ethersProvider: Web3Provider | JsonRpcProvider;
  readonly signer: JsonRpcSigner;
  readonly umbra: UmbraContract;
  readonly chainId: number;

  // ======================================== CONSTRUCTORS =========================================
  /**
   * @notice Create Umbra instance to interact with the Umbra contracts
   * @dev WARNING: It is recommended that you do not call the constructor directly, and instead use
   * the static methods to generate an Umbra instance. If you do call the constructor directly, be
   * certain that the provided chain ID matches the provider's chain ID
   * @param provider ethers provider to use
   * @param chainId The Chain ID of the network
   */
  constructor(readonly provider: Web3Provider | JsonRpcProvider, chainId: number) {
    const supportedChainIds = Object.keys(contractInfo);
    if (!supportedChainIds.includes(String(chainId))) {
      throw new Error('Unsupported chainId');
    }

    this.chainId = chainId;
    this.ethersProvider = provider;
    this.signer = this.ethersProvider.getSigner();
    this.umbra = new Contract(
      contractInfo[chainId].umbraAddress,
      abi,
      this.signer || this.ethersProvider
    ) as UmbraContract;
  }

  /**
   * @notice Generates Umbra instance from a web3 provider to read from and write to the Umbra contracts
   * @param provider web3 provider to use (not an ethers provider)
   */
  static async create(provider: ExternalProvider) {
    const ethersProvider = new Web3Provider(provider);
    const network = await ethersProvider.getNetwork();
    const chainId = network.chainId;
    return new Umbra(ethersProvider, chainId);
  }

  /**
   * @notice Generates Umbra instance from a JSON-RPC API to read from the Umbra contracts
   * @param provider web3 provider to use (not an ethers provider)
   */
  static async createReadonly(url: string) {
    const ethersProvider = new JsonRpcProvider(url);
    const network = await ethersProvider.getNetwork();
    const chainId = network.chainId;
    return new Umbra(ethersProvider, chainId);
  }

  // ==================================== CONTRACT INTERACTION =====================================

  /**
   * @notice Send funds to a recipient via Umbra
   * @dev If sending tokens, make sure to handle the approvals before calling this method
   * @param token Address of token to send. Use 'ETH' or '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
   * to send Ether
   * @param recipientId Identifier of recipient, e.g. their ENS name
   * @param overrides Override the payload extension, gas limit, gas price, or nonce
   */
  async send(token: string, recipientId: string, overrides: UmbraOverrides = {}) {
    // Check that sender has sufficient balance
    // TODO

    // Generate random number and encrypt with recipient's public key
    // TODO

    // Get x,y coordinates of ephemeral private key
    // TODO

    // Compute stealth address

    // Send funds
    if (isETH(token)) {
      // await this.umbra.sendEth(...);
    } else {
      // await this.umbra.sendToken(...);
    }
  }

  /**
   * @notice Withdraw funds for a recipient
   * @param recipient Recipient address
   * @param overrides Override the payload extension, gas limit, gas price, or nonce
   */
  async withdraw(token: string, recipient: string, overrides: UmbraOverrides = {}) {
    // Determine if recipient caller is withdrawing token or ETH by reading contract
    // TODO

    // Withdraw funds
    if (isETH(token)) {
      // Based on gas price, compute how much ETH to transfer to avoid dust
      // TODO
    } else {
      // this.umbra.withdrawToken(...);
    }
  }

  /**
   * @notice Scans Umbra event logs for funds sent to the specified address
   * @param keyPair KeyPair of user to scan for, must have associated private key
   */
  async scan(keyPair: KeyPair) {
    // Get start and end blocks to scan events for
    const startBlock = contractInfo[this.chainId].startBlock;
    const endBlock = await this.ethersProvider.getBlockNumber();

    // Get list of all Announcement events
    const announcementFilter = this.umbra.filters.Announcement(null, null, null, null, null); // gets all  announcements
    const announcementEvents = await this.umbra.queryFilter(
      announcementFilter,
      startBlock,
      endBlock
    );

    // Get list of all TokenWithdrawal events
    const withdrawalFilter = this.umbra.filters.TokenWithdrawal(null, null, null, null); // gets all  announcements
    const withdrawalEvents = await this.umbra.queryFilter(withdrawalFilter, startBlock, endBlock);

    // Determine which announcements are for the user
    const userAnnouncementEvents = [];
    for (let i = 0; i < announcementEvents.length; i += 1) {
      const event = announcementEvents[i];

      // Extract out event parameters
      const { receiver, amount, token, pkx, ciphertext } = event.args;

      // Get y-coordinate of public key from the x-coordinate
      // TODO

      // Decrypt to get random number
      const payload = {
        ephemeralPublicKey: `0x04${pkx.slice(2)}${pky.slice(2)}`,
        ciphertext,
      };
      const randomNumber = await keyPair.decrypt(payload); // eslint-disable-line

      // Get what our receiving address would be with this random number
      const computedReceivingAddress = keyPair.mulPublicKey(randomNumber).address;

      // If our receiving address matches the event's recipient, the transfer was for us
      if (computedReceivingAddress === receiver) {
        // Get block number, timestamp, and sender of this event
        // TODO

        // Save off data
        userAnnouncementEvents.push({
          ...event,
          randomNumber,
          receiver,
          amount,
          token,
          blockNumber,
          timestamp,
          sender,
        });
      }
    }

    // For each of the user's announcement events, determine if the funds were withdrawn
    // TODO

    return { userAnnouncementEvents, userWithdrawalEvents, userEvents };
  }
}
