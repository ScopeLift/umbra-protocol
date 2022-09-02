import { supportedChains, TokenInfo } from 'src/components/models';
import { BigNumber, BigNumberish, hexValue, parseUnits, formatUnits, isHexString } from './ethers';
/**
 * @notice Generates the Etherscan URL based on the given `txHash` or `address and `chainId`
 */
export const getEtherscanUrl = (txHashOrAddress: string, chainId: number) => {
  const group = isHexString(txHashOrAddress) ? (txHashOrAddress.length === 42 ? 'address' : 'tx') : 'ens';
  const chain = getChainById(chainId);
  const networkPrefix = chain?.blockExplorerUrls?.length ? chain?.blockExplorerUrls[0] : 'https://etherscan.io';
  if (group === 'ens') {
    return `${networkPrefix}/enslookup-search?search=${txHashOrAddress}`;
  } else {
    return `${networkPrefix}/${group}/${txHashOrAddress}`;
  }
};

/**
 * @notice Gets `Chain` based on the given `chainId`
 */
export const getChainById = (chainId: BigNumberish) => {
  return supportedChains.find((chain) => chain.chainId === hexValue(chainId));
};

/**
 * @notice Rounds the minSend amount so that it is the appropriate level of precision for
 * UX. This number is shown to the user *and* used in validation.
 * @param minSend the amount to be rounded
 * @returns number the number used to validate the user is sending enough
 */
export const humanizeMinSendAmount = (minSend: number): number => {
  let precision = 2;
  if (minSend < 10 && minSend > 1) precision = 1;
  return Number(minSend.toPrecision(precision));
};

/**
 * @notice Rounds to appropriate human readable decimals for the token
 * @param amount the amount to be formatted
 * @param token the token unit of the amount
 * @returns string
 */
export const humanizeTokenAmount = (amount: BigNumberish, token: TokenInfo): string => {
  const formattedAmount = parseFloat(formatUnits(amount, token.decimals));
  if (formattedAmount > 1) {
    return formattedAmount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }
  if (amount == 0) return formattedAmount.toPrecision(2);
  if (formattedAmount < 0.000001) {
    // avoid scientific notation
    return formatUnits(amount, token.decimals).replace(/0+$/, '');
  }
  return formattedAmount.toPrecision(2).replace(/0+$/, '');
};

/**
 * @notice Humanizes the result of an arithmetic equation based on the operands produced
 * it. All operands are expected to be humanized strings (i.e. what the user sees) and
 * denominated in the same decimals as `token` (i.e. `parseUnits(operand, token.decimals)`
 * would be in the same units as `total`).  This function is for display/UI purposes only
 * -- it doesn't affect the actual total, e.g. when doing withdraws.
 * @param total the amount to be formatted
 * @param operands an array of humanized strings that were added/subtracted to produce total
 * @param token TokenInfo
 * @returns string the humanized total
 */
export const humanizeArithmeticResult = (total: BigNumberish, operands: string[], token: TokenInfo): string => {
  const minDisplayDigits = 0;
  const requiredDisplayDigits = operands.reduce((currentMaxDigits: number, humanString: string) => {
    // Remove insignificant trailing zeros from human-formatted strings, e.g. "0.001400"
    // would become "0.0014". We take this approach instead of something like
    // `Number(humanString).toString()` as it avoids Javascript's overflow bugs with
    // Numbers.
    const zeroTrimmedString = humanString.replace(/0+$/, '');
    const significantDigits = zeroTrimmedString.split('.')[1]?.length || 0;
    return Math.max(significantDigits, currentMaxDigits);
  }, minDisplayDigits);

  const formattedTotal = parseFloat(formatUnits(total, token.decimals));
  return formattedTotal.toLocaleString(undefined, {
    minimumFractionDigits: requiredDisplayDigits,
    maximumFractionDigits: requiredDisplayDigits,
  });
};

/**
 * @notice GETs JSON from the provided `url`
 */
export const jsonFetch = (url: string) => fetch(url).then((res) => res.json());

// Shape of data returned from the TxPrice API
type TxPriceResponse = {
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
type TxPriceConfidence = 99 | 95 | 90 | 80 | 70;

/**
 * @notice Gets the current gas price via TxPrice API
 * @param gasPriceConfidence probability of transaction being confirmed
 */
export const getGasPrice = async (gasPriceConfidence: TxPriceConfidence = 99): Promise<BigNumber> => {
  try {
    const response: TxPriceResponse = await jsonFetch('https://api.TxPrice.com/');
    const estimatedPrice = response.blockPrices[0]?.estimatedPrices?.find(
      (price) => price.confidence === gasPriceConfidence
    );
    const gasPriceInGwei = estimatedPrice?.price;
    if (!gasPriceInGwei) throw new Error('API did not return a valid gas price');

    const gasPriceInWei = parseUnits(String(gasPriceInGwei), 'gwei');
    return BigNumber.from(gasPriceInWei);
  } catch (e) {
    const message = (e as { message: string }).message;
    throw new Error(`Error fetching gas price from TxPrice API: ${message}`);
  }
};
