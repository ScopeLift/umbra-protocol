/**
 * @dev Simplifies interaction with the Umbra contracts
 */

import { KeyPair } from './KeyPair';
import { Contract } from 'ethers';
import { Umbra as UmbraContract, ERC20 } from '../../types/contracts';
import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { JsonRpcProvider, JsonRpcSigner, Web3Provider } from '@ethersproject/providers';
import * as erc20Abi from '../abi/ERC20.json';
import type {
  // ExternalProvider,
  UmbraOverrides,
  // Announcement,
  // UserAnnouncementEvent,
} from '../types';

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

// Error message to throw if a valid signer is required but not present
const missingSignerMessage =
  'This method requires a valid signer, but Umbra instance has a readonly provider';

export class Umbra {
  readonly signer: JsonRpcSigner | null; // null if connected with a readonly provider
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
   * @param signer The associated signer, or null if no signer is available
   */
  constructor(
    readonly provider: Web3Provider | JsonRpcProvider,
    chainId: number,
    signer: JsonRpcSigner | null
  ) {
    const supportedChainIds = Object.keys(contractInfo);
    if (!supportedChainIds.includes(String(chainId))) {
      throw new Error('Unsupported chainId');
    }

    this.signer = signer;
    this.chainId = chainId;
    this.umbra = new Contract(
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

    // Check that sender has sufficient balance
    const tokenContract = new Contract(token, erc20Abi, this.signer) as ERC20;
    console.log('await this.signer.getAddress(): ', await this.signer.getAddress());
    const tokenBalance = await tokenContract.balanceOf(await this.signer.getAddress());
    console.log('tokenBalance: ', tokenBalance);
    if (tokenBalance.lt(amount)) {
      const providedAmount = BigNumber.from(amount).toString();
      const details = `Has ${tokenBalance.toString()} tokens, tried to send ${providedAmount} tokens.`;
      throw new Error(`Insufficient balance to complete transfer. ${details}`);
    }

    console.log(token, amount, recipientId, overrides);
    console.log('isETH(token): ', isETH(token));

    // //
    // if (isETH(token)) {
    //   // Generate random number and encrypt with recipient's public key
    //   // TODO
    //   // Get x,y coordinates of ephemeral private key
    //   // TODO
    //   // Compute stealth address
    //   // Send funds
    //   // await this.umbra.sendEth(...);
    // } else {
    //   // await this.umbra.sendToken(...);
    // }

    return 0;
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
    console.log('keyPair: ', keyPair);
    const startBlock = contractInfo[this.chainId].startBlock;
    const endBlock = await this.provider.getBlockNumber();

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
    console.log('withdrawalEvents: ', withdrawalEvents);

    // Determine which announcements are for the user
    const userAnnouncementEvents = [] as Event[];
    for (let i = 0; i < announcementEvents.length; i += 1) {
      const event = announcementEvents[i];
      console.log('event.args: ', event.args);

      // Extract out event parameters
      // const { receiver, amount, token, pkx, ciphertext } = (event.args as unknown) as Announcement;

      // Get y-coordinate of public key from the x-coordinate
      // TODO

      // Decrypt to get random number
      // const payload = {
      //   ephemeralPublicKey: `0x04${pkx.slice(2)}${pky.slice(2)}`,
      //   ciphertext,
      // };
      // const randomNumber = await keyPair.decrypt(payload); // eslint-disable-line

      // // Get what our receiving address would be with this random number
      // const computedReceivingAddress = keyPair.mulPublicKey(randomNumber).address;

      // If our receiving address matches the event's recipient, the transfer was for us
      // if (computedReceivingAddress === receiver) {
      //   // Get block number, timestamp, and sender of this event
      //   // TODO

      //   // Save off data
      //   userAnnouncementEvents.push({
      //     event,
      //     randomNumber,
      //     receiver,
      //     amount,
      //     token,
      //     blockNumber,
      //     timestamp,
      //     sender,
      //   });
      // }
    }

    // For each of the user's announcement events, determine if the funds were withdrawn
    // TODO

    return { userAnnouncementEvents /* userWithdrawalEvents, userEvents */ };
  }
}
