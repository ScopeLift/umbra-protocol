import { Notify, QNotifyCreateOptions } from 'quasar';
import { Provider } from 'components/models';
import { isHexString } from './ethers';
import { getEtherscanUrl } from './utils';
import { tc } from '../boot/i18n';

type AlertType = 'success' | 'error';

const defaultTimeout = 5000; // 5 seconds
const errorTimeout = 10000; // 10 seconds

// Some error messages we don't want to show to the user, so return in these cases
const messagesToIgnore = [
  'walletSelect must be called before walletCheck', // user decided not to connect wallet
  'Navigating to current location', // e.g. user clicks "Home" in nav bar when already on home page
  "Cannot read property 'validate' of null", // user navigates off Send page too quickly after sending, so "resetValidation()" fails
  'Document is not focused', // happens when user unfocuses DOM while app was trying to copy something to clipboard
  'unknown account #0', // happens when we try to connect to a locked wallet
];

// Notification type for a pending transaction, shown in Umbra's primary color with a spinner. The
// color comes from the type, so updating the notification to another type replaces it.
Notify.registerType('pending', { group: false, timeout: 0, spinner: true, color: 'primary', textColor: 'dark' });

// Options shared by every notification, including a small button to dismiss it, which the
// `app-notification` class places in the top right corner in the notification's text color
function baseOptions(): QNotifyCreateOptions {
  return {
    position: 'top-right',
    classes: 'app-notification',
    actions: [
      {
        icon: 'fas fa-xmark',
        round: true,
        dense: true,
        size: 'xs',
        'aria-label': tc('Utils.Alerts.dismiss'),
      },
    ],
  };
}

/**
 * @notice Present notification alert to the user
 * @param alertType Type of alert, which sets its color and icon
 * @param message Message to display on notification
 */
export function notifyUser(alertType: AlertType, message: string) {
  // If message matches any of the substrings in messagesToIgnore, we return and don't show the alert
  if (new RegExp(messagesToIgnore.join('|')).test(message)) return;

  Notify.create({
    ...baseOptions(),
    type: alertType === 'success' ? 'positive' : 'negative',
    message,
    timeout: alertType === 'error' ? errorTimeout : defaultTimeout,
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

// Returns an HTML link to a transaction in a block explorer. The link is rendered as HTML, so it's
// only returned for a valid transaction hash.
function explorerLink(txHash: string, chainId: number) {
  if (!isHexString(txHash, 32)) return undefined;
  const url = getEtherscanUrl(txHash, chainId);
  const label = tc('Utils.Alerts.view-transaction');
  const icon = '<i class="fas fa-up-right-from-square q-ml-xs" aria-hidden="true"></i>';
  return `<a class="notification-link" href="${url}" target="_blank" rel="noopener noreferrer">${label}${icon}</a>`;
}

/**
 * @notice Transaction notification status
 * @param txHash Transaction hash to monitor
 */
export async function txNotify(txHash: string, provider: Provider) {
  // Show a pending transaction notification, with a link to the transaction in a block explorer
  const { chainId } = await provider.getNetwork();
  const update = Notify.create({
    ...baseOptions(),
    type: 'pending',
    message: tc('Utils.Alerts.transaction-pending'),
    caption: explorerLink(txHash, chainId),
    html: true,
  });

  // Update notification based on transaction status
  const { status } = await provider.waitForTransaction(txHash);
  update({
    type: status ? 'positive' : 'negative',
    message: status ? tc('Utils.Alerts.transaction-succeeded') : tc('Utils.Alerts.transaction-failed'),
    timeout: defaultTimeout,
  });
}
