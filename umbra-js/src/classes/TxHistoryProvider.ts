import { BigNumber, BigNumberish, EtherscanProvider } from '../ethers';

let _isCommunityResource = false;

/**
 * Etherscan API V2 uses a single base URL and chainid parameter for all chains.
 * @see https://docs.etherscan.io/v2-migration
 * @see https://docs.etherscan.io/supported-chains
 */
const ETHERSCAN_V2_BASE_URL = 'https://api.etherscan.io/v2';

export class TxHistoryProvider extends EtherscanProvider {
  constructor(chainId: BigNumberish, apiKey?: string) {
    const _chainId = BigNumber.from(chainId).toNumber();
    if (!apiKey) _isCommunityResource = true;

    // V2: single Etherscan API key for all supported chains
    const defaultApiKey = <string>process.env.ETHERSCAN_API_KEY;
    const supportedChainIds = [1, 10, 100, 137, 42161, 11155111];
    if (!supportedChainIds.includes(_chainId)) {
      throw new Error(`Unsupported chain ID ${_chainId} for TxHistoryProvider`);
    }

    super(_chainId, apiKey || defaultApiKey);
  }

  getBaseUrl(): string {
    return ETHERSCAN_V2_BASE_URL;
  }

  getUrl(module: string, params: Record<string, string>): string {
    const chainId = BigNumber.from(this.network.chainId).toNumber();
    return super.getUrl(module, { ...params, chainid: String(chainId) });
  }

  getPostData(module: string, params: Record<string, unknown>): Record<string, unknown> {
    const data = super.getPostData(module, params) as Record<string, unknown>;
    data.chainid = BigNumber.from(this.network.chainId).toNumber();
    return data;
  }

  isCommunityResource(): boolean {
    return _isCommunityResource;
  }
}
