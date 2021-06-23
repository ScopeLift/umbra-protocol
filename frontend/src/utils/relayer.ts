/**
 * @notice Class for managing relayed withdrawal transactions
 */

import { JsonRpcProvider } from 'src/utils/ethers';
import {
  ConfirmedITXStatusResponse,
  FeeEstimateResponse,
  ITXStatusResponse,
  Provider,
  TokenInfo,
  RelayResponse,
  TokenListResponse,
  WithdrawalInputs,
} from 'components/models';

export class ITXRelayer {
  constructor(readonly baseUrl: string, readonly tokens: TokenInfo[]) {}

  static async create(provider: Provider | JsonRpcProvider) {
    // Get API URL based on chain ID
    const chainId = (await provider.getNetwork()).chainId;
    const baseUrl = chainId === 1 ? 'https://mainnet.api.umbra.cash' : 'https://rinkeby.api.umbra.cash';

    // Get list of tokens supported on this network
    const response = await fetch(`${baseUrl}/tokens`);
    const data = (await response.json()) as TokenListResponse;
    if ('error' in data) throw new Error(`Could not fetch tokens: ${data.error}`);

    // Return instance
    return new ITXRelayer(baseUrl, data.tokens);
  }

  async getFeeEstimate(tokenAddress: string) {
    const response = await fetch(`${this.baseUrl}/tokens/${tokenAddress}/estimate`);
    const data = (await response.json()) as FeeEstimateResponse;
    if ('error' in data) throw new Error(`Could not estimate fee: ${data.error}`);
    return data;
  }

  async relayWithdraw(tokenAddress: string, withdrawalInputs: WithdrawalInputs) {
    const body = JSON.stringify(withdrawalInputs);
    const headers = { 'Content-Type': 'application/json' };
    const response = await fetch(`${this.baseUrl}/tokens/${tokenAddress}/relay`, { method: 'POST', body, headers });
    const data = (await response.json()) as RelayResponse;
    if ('error' in data) throw new Error(`Could not relay withdraw: ${data.error}`);
    return data;
  }

  // Returns the status of the provided ITX transaction ID
  async getRelayStatus(itxId: string) {
    const response = await fetch(`${this.baseUrl}/status/${itxId}`);
    const data = (await response.json()) as ITXStatusResponse;
    if ('error' in data) throw new Error(`Could not get relay status: ${data.error}`);
    return data;
  }

  // Returns a promise that resolves once the specified ITX transaction has mined
  async waitForId(itxId: string) {
    let result;
    while (!result) {
      try {
        // Return response if it contains a receipt (i.e. it was mined)
        const response = await this.getRelayStatus(itxId);
        if ('receipt' in response && response.receipt) {
          result = response as ConfirmedITXStatusResponse;
        }
      } catch (err) {
        // If there was an error, log it, but keep trying
        console.warn(`Received the below error when fetching status for ITX ID ${itxId}`);
        console.warn(err);
      } finally {
        // Wait 4 seconds and try again
        await sleep(4000);
      }
    }
    return result;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
