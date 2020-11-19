/**
 * @dev Helper methods for interacting with contracts
 */

import { ethers } from 'ethers';
import { ExternalProvider } from '../types';

/**
 * @notice Creates and returns a contract instance
 * @param address Contract address
 * @param abi Contract ABI
 * @param provider web3 provider to use (not an ethers provider)
 */
export function createContract(
  address: string,
  abi: ethers.ContractInterface,
  provider: ExternalProvider
) {
  const ethersProvider = new ethers.providers.Web3Provider(provider);
  // Use signer if available, otherwise use provider
  const signer = ethersProvider.getSigner();
  return new ethers.Contract(address, abi, signer || ethersProvider);
}
