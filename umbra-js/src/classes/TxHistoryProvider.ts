import { BigNumber, BigNumberish, EtherscanProvider } from '../ethers';

let _isCommunityResource = false;

export class TxHistoryProvider extends EtherscanProvider {
  constructor(chainId: BigNumberish, apiKey?: string) {
    const _chainId = BigNumber.from(chainId).toNumber();
    if (!apiKey) _isCommunityResource = true;

    const sharedApiKey = <string>process.env.ETHERSCAN_API_KEY;
    let defaultApiKey: string;
    switch (_chainId) {
      case 1: // mainnet
        defaultApiKey = sharedApiKey;
        break;
      case 10: // optimism
        defaultApiKey = <string>process.env.OPTIMISTIC_ETHERSCAN_API_KEY || sharedApiKey;
        break;
      case 137: // polygon
        defaultApiKey = <string>process.env.POLYGONSCAN_API_KEY || sharedApiKey;
        break;
      case 42161: // arbitrum
        defaultApiKey = <string>process.env.ARBISCAN_API_KEY || sharedApiKey;
        break;
      case 11155111: // sepolia
        defaultApiKey = sharedApiKey;
        break;
      default:
        throw new Error(`Unsupported chain ID ${_chainId}`);
    }

    super(_chainId, apiKey || defaultApiKey);
  }

  getBaseUrl(): string {
    // Etherscan API v2 is served from a single host, with network selection done via `chainid`.
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
