import { BigNumber } from './ethers';

/**
 * @notice Generates the Etherscan URL based on the given `txHash` and `chainId`
 */
export const getEtherscanUrl = (txHash: string, chainId: number) => {
  let networkPrefix = '';
  if (chainId === 1) networkPrefix = 'etherscan.io';
  if (chainId === 3) networkPrefix = 'ropsten.etherscan.io';
  if (chainId === 4) networkPrefix = 'rinkeby.etherscan.io';
  if (chainId === 5) networkPrefix = 'goerli.etherscan.io';
  if (chainId === 42) networkPrefix = 'kovan.etherscan.io';
  if (chainId === 137) networkPrefix = 'polygonscan.com';
  if (chainId === 80001) networkPrefix = 'mumbai.polygonscan.com';
  return `https://${networkPrefix}/tx/${txHash}`;
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
