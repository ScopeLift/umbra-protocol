/**
 * @notice Class for managing relayed withdrawal transactions
 */

import { JsonRpcProvider } from 'src/utils/ethers';
import {
  ConfirmedRelayerStatusResponse,
  FeeEstimateResponse,
  RelayerStatusResponse,
  Provider,
  TokenInfoExtended,
  RelayResponse,
  TokenListResponse,
  WithdrawalInputs,
} from 'components/models';

export class UmbraApi {
  constructor(
    readonly baseUrl: string,
    readonly tokens: TokenInfoExtended[],
    readonly chainId: number,
    readonly nativeTokenMinSendAmount: string | undefined
  ) {}

  static async create(provider: Provider | JsonRpcProvider) {
    // Get API URL based on chain ID
    const chainId = (await provider.getNetwork()).chainId;
    const baseUrl = 'https://mainnet.api.umbra.cash'; // works for all networks

    // Get list of tokens supported on this network
    const response = await fetch(`${baseUrl}/tokens?chainId=${chainId}`);
    const data = (await response.json()) as TokenListResponse;
    let nativeMinSend: string | undefined;
    let tokens: TokenInfoExtended[];
    if ('error' in data) {
      tokens = [];
      console.warn(`Could not fetch tokens from backend: ${data.error}`);
    } else {
      tokens = data.tokens;
      nativeMinSend = data.nativeTokenMinSendAmount;
    }

    // Return instance, using an empty array of tokens if we could not fetch them from
    // backend (i.e. only native token will be available to send)
    return new UmbraApi(baseUrl, tokens, chainId, nativeMinSend);
  }

  async getFeeEstimate(tokenAddress: string) {
    const response = await fetch(`${this.baseUrl}/tokens/${tokenAddress}/estimate?chainId=${this.chainId}`);
    const data = (await response.json()) as FeeEstimateResponse;
    if ('error' in data) throw new Error(`Could not estimate fee: ${data.error}`);
    return data;
  }

  async relayWithdraw(tokenAddress: string, withdrawalInputs: WithdrawalInputs) {
    const body = JSON.stringify(withdrawalInputs);
    const headers = { 'Content-Type': 'application/json' };
    const url = `${this.baseUrl}/tokens/${tokenAddress}/relay?chainId=${this.chainId}`;
    const response = await fetch(url, { method: 'POST', body, headers });
    const data = (await response.json()) as RelayResponse;
    if ('error' in data) throw new Error(`Could not relay withdraw: ${data.error}`);
    return data;
  }

  // Returns the status of the provided relayer transaction ID
  async getRelayStatus(itxId: string) {
    // If ChainID is 1 or 4, relaying is supported so fetch the status from the relayer. Otherwise, relaying is
    // not supported on this chain so we throw an error
    if (this.chainId !== 1 && this.chainId !== 4) throw new Error(`Unsupported relayer chain ID ${this.chainId}`);
    const response = await fetch(`${this.baseUrl}/status/${itxId}?chainId=${this.chainId}`);
    const data = (await response.json()) as RelayerStatusResponse;
    if ('error' in data) throw new Error(`Could not get relay status: ${data.error}`);
    return data;
  }

  // Returns a promise that resolves once the specified relayer transaction has mined
  async waitForId(itxId: string) {
    let result;
    while (!result) {
      try {
        // Return response if it contains a receipt (i.e. it was mined)
        const response = await this.getRelayStatus(itxId);
        if ('receipt' in response && response.receipt) {
          result = response as ConfirmedRelayerStatusResponse;
        }
      } catch (err) {
        // If there was an error, log it, but keep trying
        console.warn(`Received the below error when fetching status for relayer ID ${itxId}`);
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
