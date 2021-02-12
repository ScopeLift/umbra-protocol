import { boot } from 'quasar/wrappers';
import useAlerts from 'src/utils/alerts';
const { handleError } = useAlerts();

export default boot(({ Vue }) => {
  // Source: https://stackoverflow.com/questions/52071212/how-to-implement-global-error-handling-in-vue

  // `info` is a Vue-specific error info, e.g. which lifecycle hook
  // the error was found in. Only available in 2.2.0+
  Vue.config.errorHandler = function (err, _vm, info) {
    console.log('Error info:', info);
    handleError(err);
  };

  // General JS (non-Vue) error handler
  window.onerror = function (msg, url, line, col, err) {
    if (err) {
      console.log('Error params:', msg, url, line, col);
      handleError(err);
    }
  };

  // Handle promise rejections
  window.addEventListener('unhandledrejection', function (event) {
    // event.promise contains the promise object
    // event.reason contains the reason for the rejection
    throw new Error(event.reason);
  });
});
