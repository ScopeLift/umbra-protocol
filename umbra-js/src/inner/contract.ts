/**
 * @dev Helper methods for interacting with contracts
 */

import { Contract, ContractInterface } from 'ethers';
import { EthersProvider } from '../types';

/**
 * @notice Creates and returns a contract instance
 * @param address Contract address
 * @param abi Contract ABI
 * @param provider ethers provider instance
 */
export function createContract(address: string, abi: ContractInterface, provider: EthersProvider) {
  // Use signer if available, otherwise use provider
  const signer = provider.getSigner();
  return new Contract(address, abi, signer || provider);
}
