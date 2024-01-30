import { copyToClipboard } from 'quasar';
import { TokenInfoExtended } from 'components/models';
import { utils as umbraUtils } from '@umbracash/umbra-js';
import { providerExport as provider, relayerExport as relayer, tokensExport as tokens } from 'src/store/wallet';
import { notifyUser } from 'src/utils/alerts';
import { BigNumber, StaticJsonRpcProvider } from 'src/utils/ethers';
import { UmbraApi } from 'src/utils/umbra-api';
import { MAINNET_RPC_URL } from 'src/utils/constants';

/**
 * @notice Returns a provider, falling back to a mainnet provider if user's wallet is not connected
 */
function getProvider() {
  return provider || new StaticJsonRpcProvider(MAINNET_RPC_URL);
}

/**
 * @notice Returns a list of supported tokens, falling back to the mainnet token list
 */
async function getTokens(nativeToken: TokenInfoExtended) {
  // If we have a valid relayer instance and associated token list, return it
  if (relayer && tokens) return tokens;

  // Otherwise, get the default list
  const provider = getProvider();
  const relayerInstance = await UmbraApi.create(provider);

  // Make sure the native token is on the list
  // It's ok if it's there twice because we use the first found instance when parsing links
  return [nativeToken, ...relayerInstance.tokens];
}

/**
 * @notice Generates a link that pre-fills the Send form. At least one field is required
 * @dev Falls back to a mainnet provider if user's wallet is not connected
 * @param to Recipient identifer, such as an ENS name
 * @param token Token details
 * @param amount Amount to send, as a human-readable number
 */
export async function generatePaymentLink({
  to = undefined,
  token = undefined,
  amount = undefined,
  chainId = undefined,
}: {
  to: string | undefined;
  token: TokenInfoExtended | undefined;
  amount: string | undefined;
  chainId: number | undefined;
}) {
  // Ensure at least one form field was provided
  if (!to && !token && !amount) throw new Error('Please complete at least one field to generate a payment link');

  // Verify the recipient ID is valid if provided (this throws if public keys could not be found)
  if (to) await umbraUtils.lookupRecipient(to, getProvider());

  // Generate payment link and copy to clipboard
  const url = new URL(`${window.location.href}`);
  if (to) url.searchParams.set('to', to);
  if (token) url.searchParams.set('token', token.symbol);
  if (amount) url.searchParams.set('amount', amount);
  if (chainId) url.searchParams.set('chainId', BigNumber.from(chainId).toString());

  await copyToClipboard(url.toString());
  notifyUser('success', 'Payment link copied to clipboard');
}

/**
 * @notice Parses a payment link based on the query parameters of the current page
 */
export async function parsePaymentLink(nativeToken: TokenInfoExtended) {
  // Setup output object
  const paymentData: {
    to: string | null;
    token: TokenInfoExtended | null;
    amount: string | null;
    chainId: string | null;
  } = {
    to: null,
    token: null,
    amount: null,
    chainId: null,
  };

  // First we assign the `to` and `amount` fields.
  const params = new URLSearchParams(window.location.search);
  paymentData['to'] = params.get('to');
  paymentData['amount'] = params.get('amount');
  paymentData['chainId'] = params.get('chainId');

  // If no `token` symbol was given, we can return with the payment data.
  let tokenSymbol = params.get('token')?.toLowerCase();
  if (!tokenSymbol) return paymentData;

  // Parsing the `token` symbol has some additional logic.
  const tokens = await getTokens(nativeToken); // Get list of supported tokens.
  const chainId = BigNumber.from(nativeToken.chainId || 1).toNumber();

  if (tokenSymbol === 'eth' && chainId === 137) {
    // If the token is ETH, and we're on Polygon, use WETH, since the native token is MATIC.
    tokenSymbol = 'weth';
    paymentData['token'] = tokens.filter((token) => token.symbol.toLowerCase() === tokenSymbol)[0];
  } else if (tokenSymbol === 'matic' && chainId !== 137) {
    // If the token is MATIC, and we're not on polygon, clear token and amount.
    paymentData['token'] = null;
    paymentData['amount'] = null;
  } else {
    // Otherwise, find the matching `TokenInfoExtended` object
    paymentData['token'] = tokens.filter((token) => token.symbol.toLowerCase() === tokenSymbol)[0];
  }

  return paymentData;
}
