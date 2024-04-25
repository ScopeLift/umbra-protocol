/**
 * @notice Class for managing relayed withdrawal transactions
 */

import { StaticJsonRpcProvider } from './ethers';
import {
  FeeEstimateResponse,
  Provider,
  TokenInfoExtended,
  RelayResponse,
  TokenListResponse,
  WithdrawalInputs,
  UmbraApiVersion,
} from 'components/models';
import { jsonFetch } from 'src/utils/utils';

import useSettingsStore from 'src/store/settings';

const { getUmbraApiVersion, setUmbraApiVersion, clearUmbraApiVersion } = useSettingsStore();

export class UmbraApi {
  // use 'http://localhost:3000' for baseUrl value for testing with a local Umbra API
  static baseUrl = 'https://mainnet.api.umbra.cash'; // works for all networks
  constructor(
    readonly tokens: TokenInfoExtended[],
    readonly chainId: number,
    readonly nativeTokenMinSendAmount: string | undefined
  ) {}

  static checkUmbraApiVersion(version: UmbraApiVersion) {
    const apiVersionFromSettings = getUmbraApiVersion();
    if (!apiVersionFromSettings) {
      console.log(`UmbraAPI: no saved version setting, using backend value: ${version.major}.${version.minor}`);
      setUmbraApiVersion(version);
    } else {
      console.log(`UmbraAPI: major.minor version fetched from backend: ${version.major}.${version.minor}`);
      console.log(
        `UmbraAPI: major.minor version fetched from setting: ${apiVersionFromSettings.major}.${apiVersionFromSettings.minor}`
      );
      if (apiVersionFromSettings.major != version.major || apiVersionFromSettings.minor != version.minor) {
        console.log('UmbraAPI: version mismatch, clearing settings and going to force a page reload');
        clearUmbraApiVersion();
        alert('UmbraAPI: version outdated, please reload the page');
        window.location.reload();
      }
    }
  }

  static async create(provider: Provider | StaticJsonRpcProvider) {
    // Get API URL based on chain ID
    const chainId = (await provider.getNetwork()).chainId;
    const baseUrl = this.baseUrl; // works for all networks

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
      UmbraApi.checkUmbraApiVersion(data.umbraApiVersion);
    }

    // Return instance, using an empty array of tokens if we could not fetch them from
    // backend (i.e. only native token will be available to send)
    return new UmbraApi(tokens, chainId, nativeMinSend);
  }

  async getFeeEstimate(tokenAddress: string) {
    const response = await fetch(`${UmbraApi.baseUrl}/tokens/${tokenAddress}/estimate?chainId=${this.chainId}`);
    const data = (await response.json()) as FeeEstimateResponse;
    if ('error' in data) throw new Error(`Could not estimate fee: ${data.error}`);
    UmbraApi.checkUmbraApiVersion(data.umbraApiVersion);
    return data;
  }

  async relayWithdraw(tokenAddress: string, withdrawalInputs: WithdrawalInputs) {
    const body = JSON.stringify(withdrawalInputs);
    const headers = { 'Content-Type': 'application/json' };
    const url = `${UmbraApi.baseUrl}/tokens/${tokenAddress}/relay?chainId=${this.chainId}`;
    const response = await fetch(url, { method: 'POST', body, headers });
    const data = (await response.json()) as RelayResponse;
    if ('error' in data) throw new Error(`Could not relay withdraw: ${data.error}`);
    UmbraApi.checkUmbraApiVersion(data.umbraApiVersion);
    return data;
  }

  static async isGitcoinContributor(address: string) {
    const response = (await jsonFetch(`${this.baseUrl}/addresses/${address}/is-gitcoin-contributor`)) as {
      umbraApiVersion: UmbraApiVersion;
      isContributor: boolean;
    };
    UmbraApi.checkUmbraApiVersion(response.umbraApiVersion);
    return response;
  }
}
