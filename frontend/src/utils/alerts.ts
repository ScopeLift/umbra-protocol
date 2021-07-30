import { Dark, Notify } from 'quasar';
import BNotify from 'bnc-notify';

// Instantiate Blocknative's notify.js
const bNotify = BNotify({
  dappId: process.env.BLOCKNATIVE_API_KEY,
  darkMode: Dark.isActive,
  desktopPosition: 'topRight',
  networkId: 1,
});

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
export function notifyUser(color: string, message: string) {
  // If message matches any of the substrings in messagesToIgnore, we return and don't show the alert
  if (new RegExp(messagesToIgnore.join('|')).test(message)) return;

  Notify.create({
    color,
    message,
    timeout: color.toLowerCase() === 'negative' ? 10000 : 5000,
    position: 'top',
    actions: [{ label: 'Dismiss', color: 'white' }],
  });
}

/**
 * @notice Show error message to user
 * @param err Error object thrown
 * @param msg Optional, fallback error message if one is not provided by the err object
 */
export function handleError(err: Error, msg = 'An unknown error occurred') {
  console.error(err);
  if (!err) notifyUser('negative', msg);
  else if ('message' in err) notifyUser('negative', err.message);
  else if (typeof err === 'string') notifyUser('negative', err);
  else notifyUser('negative', msg);
}

/**
 * @notice Transaction monitoring
 * @param txHash Transaction hash to monitor
 */
export function txNotify(txHash: string) {
  bNotify.hash(txHash);
}
