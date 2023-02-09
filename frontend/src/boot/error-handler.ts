import { boot } from 'quasar/wrappers';
import { handleError } from 'src/utils/alerts';

export default boot(({ app }) => {
  // Source: https://stackoverflow.com/questions/52071212/how-to-implement-global-error-handling-in-vue

  // `info` is a Vue-specific error info, e.g. which lifecycle hook
  // the error was found in. Only available in 2.2.0+
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.config.errorHandler = function (err: any, _vm: any, info: any) {
    console.log('Error info:', info);
    handleError(err); // eslint-disable-line @typescript-eslint/no-unsafe-argument
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

    // For some reason when using GSN, it works, but throws with the error below. So if that's the error we just ignore it
    //   MetaMask - RPC Error: already known {code: -32000, message: "already known"}
    //   Error params: Uncaught Error: [object Object] webpack-internal:///./src/boot/error-handler.ts 28 15
    if (event.reason.code === -32000 && event.reason.message === 'already known') {
      return;
    }
    throw new Error(<string>event.reason);
  });
});
