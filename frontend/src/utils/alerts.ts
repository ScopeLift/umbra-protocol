import { Dark } from 'quasar';
import BNotify, { InitOptions, NotificationType } from 'bnc-notify';
import { Provider } from 'components/models';
import { getEtherscanUrl } from './utils';
import { tc } from '../boot/i18n';

// Instantiate Blocknative's notify.js. We don't pass a dappId so we can use in UI only mode for any
// notifications we need, i.e. not just Blocknative transaction notifications
const bNotifyOptions = { darkMode: Dark.isActive, desktopPosition: 'topRight', networkId: 1 } as InitOptions;
const bNotify = BNotify(bNotifyOptions);
const defaultTimeout = 5000; // 4 seconds

// Some error messages we don't want to show to the user, so return in these cases
const messagesToIgnore = [
  'walletSelect must be called before walletCheck', // user decided not to connect wallet
  'Navigating to current location', // e.g. user clicks "Home" in nav bar when already on home page
  "Cannot read property 'validate' of null", // user navigates off Send page too quickly after sending, so "resetValidation()" fails
  'Document is not focused', // happens when user unfocuses DOM while app was trying to copy something to clipboard
  'unknown account #0', // happens when we try to connect to a locked wallet
];

/**
 * @notice Present notification alert to the user
 * @param color Alert color, choose positive, negative, warning, info, or others
 * @param message Message to display on notification
 */
export function notifyUser(alertType: NotificationType, message: string) {
  // Reset config in case user changed their dark mode setting
  bNotify.config({ ...bNotifyOptions, darkMode: Dark.isActive });

  // If message matches any of the substrings in messagesToIgnore, we return and don't show the alert
  if (new RegExp(messagesToIgnore.join('|')).test(message)) return;

  bNotify.notification({
    autoDismiss: alertType === 'error' ? 10000 : defaultTimeout,
    eventCode: 'userNotify',
    message,
    type: alertType,
  });
}

/**
 * @notice Show error message to user
 * @param err Error object thrown
 * @param msg Optional, fallback error message if one is not provided by the err object
 */
export function handleError(err: Error, msg = 'An unknown error occurred') {
  console.error(err);
  if (!err) notifyUser('error', msg);
  else if ('message' in err) notifyUser('error', err.message);
  else if (typeof err === 'string') notifyUser('error', err);
  else notifyUser('error', msg);
}

/**
 * @notice Transaction notification status
 * @param txHash Transaction hash to monitor
 */
export async function txNotify(txHash: string, provider: Provider) {
  // Instantiate pending transaction notification
  const { chainId } = await provider.getNetwork();
  const onclick = () => window.open(getEtherscanUrl(txHash, chainId), '_blank');
  const { update } = bNotify.notification({
    autoDismiss: 0,
    eventCode: 'txPending',
    message: tc('Utils.Alerts.transaction-pending'),
    onclick,
    type: 'pending',
  });

  // Update notification based on transaction status
  const { status } = await provider.waitForTransaction(txHash);
  update({
    autoDismiss: defaultTimeout,
    eventCode: status ? 'txSuccess' : 'txFail',
    message: status ? tc('Utils.Alerts.transaction-succeeded') : tc('Utils.Alerts.transaction-failed'),
    onclick,
    type: status ? 'success' : 'error',
  });
}
