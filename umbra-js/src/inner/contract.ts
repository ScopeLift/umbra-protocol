/**
 * @dev Helper methods for interacting with contracts
 */

import { Contract, ContractInterface } from 'ethers';
import { Web3Provider } from '@ethersproject/providers';
import { ExternalProvider } from '../types';

/**
 * @notice Creates and returns a contract instance
 * @param address Contract address
 * @param abi Contract ABI
 * @param provider web3 provider to use (not an ethers provider)
 */
export function createContract(
  address: string,
  abi: ContractInterface,
  provider: ExternalProvider
) {
  const ethersProvider = new Web3Provider(provider);
  // Use signer if available, otherwise use provider
  const signer = ethersProvider.getSigner();
  return new Contract(address, abi, signer || ethersProvider);
}
