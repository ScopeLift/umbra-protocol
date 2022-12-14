import { copyToClipboard } from 'quasar';
import { TokenInfoExtended } from 'components/models';
import { utils as umbraUtils } from '@umbra/umbra-js';
import { providerExport as provider, relayerExport as relayer, tokensExport as tokens } from 'src/store/wallet';
import { notifyUser } from 'src/utils/alerts';
import { StaticJsonRpcProvider } from 'src/utils/ethers';
import { UmbraApi } from 'src/utils/umbra-api';

/**
 * @notice Returns a provider, falling back to a mainnet provider if user's wallet is not connected
 */
function getProvider() {
  return provider || new StaticJsonRpcProvider(`https://mainnet.infura.io/v3/${String(process.env.INFURA_ID)}`);
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
}: {
  to: string | undefined;
  token: TokenInfoExtended | undefined;
  amount: string | undefined;
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

  await copyToClipboard(url.toString());
  notifyUser('success', 'Payment link copied to clipboard');
}

/**
 * @notice Parses a payment link based on the query parameters of the current page
 */
export async function parsePaymentLink(nativeToken: TokenInfoExtended) {
  // Setup output object
  const paymentData: { to: string | null; token: TokenInfoExtended | null; amount: string | null } = {
    to: null,
    token: null,
    amount: null,
  };

  // Parse query parameters
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of params) {
    // For `to` and `amount`, assign them directly
    if (key === 'to' || key === 'amount') {
      paymentData[key] = value;
      continue;
    }

    // Otherwise, parse the token symbol into it's TokenInfoExtended object
    const tokens = await getTokens(nativeToken); // get list of supported tokens
    paymentData['token'] = tokens.filter((token) => token.symbol.toLowerCase() === value.toLowerCase())[0];
  }

  return paymentData;
}
