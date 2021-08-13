import { copyToClipboard } from 'quasar';
import { notifyUser } from 'src/utils/alerts';
import { JsonRpcProvider } from 'src/utils/ethers';
import useWalletStore from 'src/store/wallet';
import { TokenInfo } from 'components/models';
import { utils as umbraUtils } from '@umbra/umbra-js';
import { ITXRelayer } from 'src/utils/relayer';

/**
 * @notice Returns a provider, falling back to a mainnet provider if user's wallet is not connected
 */
function getProvider() {
  const { provider } = useWalletStore();
  return provider.value || new JsonRpcProvider(`https://mainnet.infura.io/v3/${String(process.env.INFURA_ID)}`);
}

/**
 * @notice Returns a list of supported tokens, falling back to the mainnet token list
 */
async function getTokens() {
  // If we have a valid relayer instance and associated token list, return it
  const { relayer, tokens } = useWalletStore();
  if (relayer.value && tokens.value) return tokens.value;

  // Otherwise, get the default list
  const provider = getProvider();
  const relayerInstance = await ITXRelayer.create(provider);

  // Make sure ETH is on the list. It's ok if it's there twice because we use the first found instance when parsing links
  const ethToken = { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', name: 'Ether', decimals: 18, symbol: 'ETH', logoURI: '/tokens/eth.svg', chainId: 1 }; // prettier-ignore
  return [...relayerInstance.tokens, ethToken];
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
  token: TokenInfo | undefined;
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
export async function parsePaymentLink() {
  // Setup output object
  const paymentData: { to: string | null; token: TokenInfo | null; amount: string | null } = {
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

    // Otherwise, parse the token symbol into it's TokenInfo object
    const tokens = await getTokens(); // get list of supported tokens
    paymentData['token'] = tokens.filter((token) => token.symbol.toLowerCase() === value.toLowerCase())[0];
  }

  return paymentData;
}
