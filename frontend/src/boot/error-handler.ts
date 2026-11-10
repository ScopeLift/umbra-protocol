import { boot } from 'quasar/wrappers';
import { handleError } from 'src/utils/alerts';
import { isRecord } from 'src/utils/errors';
import { ErrorSource, errorFromEvent, reportError, setErrorReportingContext } from 'src/utils/error-reporting';
import { i18n } from './i18n';

/**
 * @notice Reports an error caught by one of the global handlers, then shows it to the user unless `notify` is false
 * @param error Value that was thrown, or the reason a promise was rejected
 * @param source Handler that caught the error
 * @param options.notify Whether to show the error to the user
 * @param options.vueInfo Information from Vue's error handler about where the error happened
 */
function captureError(error: unknown, source: ErrorSource, options: { notify?: boolean; vueInfo?: string } = {}) {
  const { notify = true, vueInfo } = options;
  reportError(error, source, { vueInfo });
  if (notify) handleError(error);
}

export default boot(({ app, router }) => {
  setErrorReportingContext({
    routeName: () => router.currentRoute.value.name,
    locale: () => i18n.global.locale,
  });

  // Source: https://stackoverflow.com/questions/52071212/how-to-implement-global-error-handling-in-vue

  // `info` is a Vue-specific error info, e.g. which lifecycle hook
  // the error was found in. Only available in 2.2.0+
  app.config.errorHandler = function (err, _vm, info) {
    console.log('Error info:', info);
    captureError(err, 'vue', { vueInfo: info });
  };

  // General JS (non-Vue) error handler. A listener is used rather than `window.onerror` so that other scripts, such as
  // wallet SDKs, can't replace it. Events without an Error object, such as cross-origin "Script error." events and
  // ResizeObserver loop notices, have nothing useful to show the user, and the browser already logs them, so they're
  // only reported
  window.addEventListener('error', function (event) {
    if (event.error) {
      console.log('Error params:', event.message, event.filename, event.lineno, event.colno);
      captureError(event.error, 'error-event');
    } else {
      captureError(errorFromEvent(event), 'error-event', { notify: false });
    }
  });

  // Handle promise rejections
  window.addEventListener('unhandledrejection', function (event) {
    // event.promise contains the promise object
    // event.reason contains the reason for the rejection, which can be any value, including null or undefined
    const reason: unknown = event.reason;

    // For some reason when using GSN, it works, but throws with the error below. So if that's the error we just ignore it
    //   MetaMask - RPC Error: already known {code: -32000, message: "already known"}
    if (isRecord(reason) && reason.code === -32000 && reason.message === 'already known') {
      return;
    }
    captureError(reason, 'rejection');
  });
});
