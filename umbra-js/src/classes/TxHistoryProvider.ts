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
      case 100: // gnosis
        defaultApiKey = <string>process.env.GNOSISSCAN_API_KEY;
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
    switch (BigNumber.from(this.network.chainId).toNumber()) {
      case 1:
        return 'https://api.etherscan.io';
      case 10:
        return 'https://api-optimistic.etherscan.io';
      case 100:
        return 'https://api.gnosisscan.io';
      case 137:
        return 'https://api.polygonscan.com';
      case 42161:
        return 'https://api.arbiscan.io';
      case 11155111:
        return 'https://api-sepolia.etherscan.io';
    }

    throw new Error(`Unsupported network ${JSON.stringify(this.network.chainId)}`);
  }

  isCommunityResource(): boolean {
    return _isCommunityResource;
  }
}
