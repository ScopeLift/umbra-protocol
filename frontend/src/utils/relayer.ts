/**
 * @notice Class for managing relayed withdrawal transactions
 */

import {
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

  static async create(provider: Provider) {
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
    const response = await fetch(`${this.baseUrl}/tokens/${tokenAddress}/relay`, { method: 'POST', body });
    const data = (await response.json()) as RelayResponse;
    if ('error' in data) throw new Error(`Could not relay withdraw: ${data.error}`);
    return data;
  }

  // Returns the status of the provided ITX transaction ID
  async getRelayStatus(itxId: string) {
    const response = await fetch(`${this.baseUrl}/itxStatus/${itxId}`);
    const data = (await response.json()) as ITXStatusResponse;
    if ('error' in data) throw new Error(`Could not get relay status: ${data.error}`);
    return data;
  }
}
