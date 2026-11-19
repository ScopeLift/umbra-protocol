import { Notify, QNotifyCreateOptions } from 'quasar';
import { Provider } from 'components/models';
import { isHexString } from './ethers';
import { getEtherscanUrl } from './utils';
import { getErrorMessage, isIgnoredMessage, isRecord, isUserRejection } from './errors';
import { tc } from '../boot/i18n';

type AlertType = 'success' | 'error' | 'hint';

// Quasar notification type for each alert type. A hint, such as the notice that the user canceled a request in their
// wallet, is shown as a neutral notice rather than an error.
const notificationTypes: Record<AlertType, string> = { success: 'positive', error: 'negative', hint: 'info' };

const defaultTimeout = 5000; // 5 seconds
const errorTimeout = 10000; // 10 seconds

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
  // Some error messages we don't want to show to the user, so return in these cases
  if (isIgnoredMessage(message)) return;

  Notify.create({
    ...baseOptions(),
    type: notificationTypes[alertType],
    message,
    timeout: alertType === 'error' ? errorTimeout : defaultTimeout,
  });
}

/**
 * @notice Returns the message to show when the user rejects a request in their wallet
 * @param err Rejection error. ethers v5 `ACTION_REJECTED` errors say which action was rejected, but errors from other
 * wallets don't
 */
function getUserRejectionMessage(err: unknown) {
  const action = isRecord(err) ? err.action : undefined;
  if (action === 'sendTransaction') return tc('Utils.Alerts.transaction-canceled');
  if (typeof action === 'string' && action.toLowerCase().includes('sign')) return tc('Utils.Alerts.signature-canceled');
  return tc('Utils.Alerts.request-canceled');
}

/**
 * @notice Show error message to user
 * @param err Error or other value that was thrown
 * @param msg Optional, fallback error message if one is not provided by the err object
 */
export function handleError(err: unknown, msg = 'An unknown error occurred') {
  // Rejecting a request in their wallet is the user's choice, so confirm it with a neutral notice instead of an error
  if (isUserRejection(err)) {
    notifyUser('hint', getUserRejectionMessage(err));
    return;
  }

  console.error(err);
  notifyUser('error', getErrorMessage(err) || msg);
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
