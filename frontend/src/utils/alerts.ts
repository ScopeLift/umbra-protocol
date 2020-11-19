/**
 * @notice This file contains individual helper functions for showing alerts. All functions
 * are contained within one composition function which we export by default.
 */
import { Notify } from 'quasar';

export default function useAlerts() {
  /**
   * @notice Present notification alert to the user
   * @param {string} color alert color, choose positive, negative, warning, info, or others
   * @param {string} message message to display on notification
   */
  function notifyUser(color: string, message: string) {
    Notify.create({
      color,
      message,
      timeout: color.toLowerCase() === 'negative' ? 10000 : 5000,
      position: 'top',
      actions: [{ label: 'Dismiss', color: 'white' }],
    });
  }

  /**
   * @notice Show error message to user and display error in console
   * @param {Any} err Error object thrown
   * @param {Any} msg Optional, fallback error message if one is not provided by the err object
   */
  function handleError(err: Error, msg = 'An unknown error occurred') {
    console.error(err);
    if (!err) notifyUser('negative', msg);
    else if ('message' in err) notifyUser('negative', err.message);
    else if (typeof err === 'string') notifyUser('negative', err);
    else notifyUser('negative', msg);
  }

  return {
    notifyUser,
    handleError,
  };
}
