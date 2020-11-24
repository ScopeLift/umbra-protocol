/**
 * @dev Simplifies interaction with the Umbra contracts
 */

import { Contract } from 'ethers';
import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers';
import type { ExternalProvider } from '../types';

// Umbra.sol ABI
const abi = require('../../../contracts/build/contracts/Umbra.json').abi;

// Mapping from chainId to contract addresses
const addresses: Record<number, Record<string, string>> = {
  // Ropsten
  3: {
    umbra: '0x3bB03be8dAB8969b16684D360eD2C7Aa47dC36f0',
    umbraPaymaster: '0xCaA925B2A71933E9C4e3FE145019961A691Bdaf3',
  },
  // Local
  1337: {
    umbra: '0x3bB03be8dAB8969b16684D360eD2C7Aa47dC36f0',
    umbraPaymaster: '0xCaA925B2A71933E9C4e3FE145019961A691Bdaf3',
  },
};

export class Umbra {
  readonly ethersProvider: Web3Provider;
  readonly signer: JsonRpcSigner;
  readonly umbra: Contract;

  /**
   * @notice Create Umbra instance to interact with the Umbra contracts
   * @param provider web3 provider to use (not an ethers provider)
   * @param chainId The Chain ID of the network
   */
  constructor(readonly provider: ExternalProvider, chainId: number) {
    console.log('chainId: ', chainId);
    const supportedChainIds = Object.keys(addresses);
    if (!supportedChainIds.includes(String(chainId))) {
      throw new Error('Unsupported chainId');
    }

    this.ethersProvider = new Web3Provider(provider);
    this.signer = this.ethersProvider.getSigner();
    this.umbra = new Contract(addresses[chainId].umbra, abi, this.signer || this.ethersProvider);
  }

  /**
   * @notice Generates Umbra instance without requiring a chainId to be provided
   * @param provider web3 provider to use (not an ethers provider)
   */
  static async create(provider: ExternalProvider) {
    const ethersProvider = new Web3Provider(provider);
    const network = await ethersProvider.getNetwork();
    const chainId = network.chainId;
    return new Umbra(provider, chainId);
  }

  /**
   * @notice Send funds
   */
  send() {
    // this.umbra.
  }
}
