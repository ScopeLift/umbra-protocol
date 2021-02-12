import { Notify } from 'quasar';

export default function useAlerts() {
  /**
   * Present notification alert to the user
   * @param color Alert color, choose positive, negative, warning, info, or others
   * @param message Message to display on notification
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
   * Show error message to user
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

  return { notifyUser, handleError };
}
