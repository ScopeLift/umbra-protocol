import { Dark, Notify } from 'quasar';
import BNotify from 'bnc-notify';

// Instantiate Blocknative's notify.js
const bNotify = BNotify({
  dappId: process.env.BLOCKNATIVE_API_KEY,
  networkId: 4,
  darkMode: Dark.isActive,
});

// Some error messages we don't want to show to the user, so return in these cases
const messagesToIgnore = [
  'walletSelect must be called before walletCheck', // user decided not to connect wallet
];

export default function useAlerts() {
  /**
   * @notice Present notification alert to the user
   * @param color Alert color, choose positive, negative, warning, info, or others
   * @param message Message to display on notification
   */
  function notifyUser(color: string, message: string) {
    if (message.startsWith(messagesToIgnore[0])) return;
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
  function handleError(err: Error, msg = 'An unknown error occurred') {
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
  function txNotify(txHash: string) {
    bNotify.hash(txHash);
  }

  return { notifyUser, handleError, txNotify };
}
