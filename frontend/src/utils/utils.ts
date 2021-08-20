import { supportedChains } from 'src/components/models';
import { BigNumber, BigNumberish, hexValue } from './ethers';

/**
 * @notice Generates the Etherscan URL based on the given `txHash` and `chainId`
 */
export const getEtherscanUrl = (txHash: string, chainId: number) => {
  const chain = getChainById(chainId);
  const networkPrefix = chain?.blockExplorerUrls?.length ? chain?.blockExplorerUrls[0] : '';
  return `https://${networkPrefix}/tx/${txHash}`;
};

/**
 * @notice Gets `Chain` based on the given `chainId`
 */
export const getChainById = (chainId: BigNumberish) => {
  return supportedChains.find((chain) => chain.chainId === hexValue(chainId));
};

/**
 * @notice Rounds `value` to the specified number of `decimals` and returns a string
 */
export const round = (value: number | string, decimals = 2) => {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

/**
 * @notice GETs JSON from the provided `url`
 */
export const jsonFetch = (url: string) => fetch(url).then((res) => res.json());

// Shape of data returned from the GasNow API
type GasNowResponse = {
  code: number; // status code, 200 for success
  // Prices by speed are given in wei
  data: {
    rapid: number;
    fast: number;
    standard: number;
    slow: number;
    timestamp: number; // request timestamp
  };
};

// Valid types for specifying speed
type GasNowSpeed = keyof Omit<GasNowResponse['data'], 'timestamp'>;

/**
 * @notice Gets the current gas price via GasNow API
 * @param gasPriceSpeed string of gas price speed from GasNow (e.g. 'rapid')
 */
export const getGasPrice = async (gasPriceSpeed: GasNowSpeed = 'rapid'): Promise<BigNumber> => {
  try {
    const response: GasNowResponse = await jsonFetch('https://www.gasnow.org/api/v3/gas/price');
    const gasPriceInWei = response.data[gasPriceSpeed];
    return BigNumber.from(gasPriceInWei);
  } catch (e) {
    throw new Error(`Error fetching gas price from GasNow API: ${e.message as string}`);
  }
};
