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

// Shape of data returned from the Txprice API
type TxpriceResponse = {
  system: string;
  network: string;
  unit: string;
  maxPrice: number;
  currentBlockNumber: number;
  msSinceLastBlock: number;
  blockPrices: BlockPrice[];
};

type BlockPrice = {
  blockNumber: number;
  baseFeePerGas: number;
  estimatedTransactionCount: number;
  estimatedPrices: EstimatedPrice[];
};

type EstimatedPrice = {
  confidence: number;
  price: number;
  maxPriorityFeePerGas: number;
  maxFeePerGas: number;
};

// Valid confidence values
type TxpriceConfidence = 99 | 95 | 90 | 80 | 70;

/**
 * @notice Gets the current gas price via Txprice API
 * @param gasPriceConfidence probability of transaction being confirmed
 */
export const getGasPrice = async (gasPriceConfidence: TxpriceConfidence = 99): Promise<BigNumber> => {
  try {
    const response: TxpriceResponse = await jsonFetch('https://api.txprice.com/');
    const estimatedPrice = response.blockPrices[0]?.estimatedPrices?.find(
      (price) => price.confidence === gasPriceConfidence
    );
    const gasPriceInGwei = estimatedPrice?.price ?? 0;
    const gasPriceInWei = gasPriceInGwei * 10 ** 9;

    return BigNumber.from(gasPriceInWei);
  } catch (e) {
    const message = (e as { message: string }).message;
    throw new Error(`Error fetching gas price from Txprice API: ${message}`);
  }
};
