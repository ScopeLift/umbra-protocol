import { BigNumber, BigNumberish, EtherscanProvider } from '../ethers';

let _isCommunityResource = false;

export class TxHistoryProvider extends EtherscanProvider {
  constructor(chainId: BigNumberish, apiKey?: string) {
    const _chainId = BigNumber.from(chainId).toNumber();
    if (!apiKey) _isCommunityResource = true;

    let defaultApiKey: string;
    switch (_chainId) {
      case 1: // mainnet
        defaultApiKey = <string>process.env.ETHERSCAN_API_KEY;
        break;
      case 10: // optimism
        defaultApiKey = <string>process.env.OPTIMISTIC_ETHERSCAN_API_KEY;
        break;
      case 137: // polygon
        defaultApiKey = <string>process.env.POLYGONSCAN_API_KEY;
        break;
      case 42161: // arbitrum
        defaultApiKey = <string>process.env.ARBISCAN_API_KEY;
        break;
      case 11155111: // sepolia
        defaultApiKey = <string>process.env.ETHERSCAN_API_KEY;
        break;
      default:
        throw new Error(`Unsupported chain ID ${_chainId}`);
    }

    super(_chainId, apiKey || defaultApiKey);
  }

  getBaseUrl(): string {
    // Etherscan API v2 uses a single base URL and selects network via the `chainid` query param.
    return 'https://api.etherscan.io';
  }

  getUrl(module: string, params: Record<string, string>): string {
    const query = Object.keys(params).reduce((accum, key) => {
      const value = params[key];
      if (value != null) {
        accum += `&${key}=${value}`;
      }
      return accum;
    }, '');
    const apiKey = this.apiKey ? `&apikey=${this.apiKey}` : '';
    const chainId = BigNumber.from(this.network.chainId).toNumber();
    return `${this.baseUrl}/v2/api?chainid=${chainId}&module=${module}${query}${apiKey}`;
  }

  isCommunityResource(): boolean {
    return _isCommunityResource;
  }
}
