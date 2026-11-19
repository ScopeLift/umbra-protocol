/**
 * @jest-environment jsdom
 */
import { Notify, QNotifyCreateOptions } from 'quasar';
import { Provider } from 'components/models';
import { handleError, notifyUser, txNotify } from 'src/utils/alerts';
import { Logger } from 'src/utils/ethers';

jest.mock('quasar', () => ({
  Notify: { create: jest.fn(), registerType: jest.fn() },
}));

jest.mock('src/boot/i18n', () => ({
  tc: (key: string) => key,
}));

jest.mock('src/utils/utils', () => ({
  getEtherscanUrl: (txHash: string, chainId: number) => `https://explorer.example/${chainId}/tx/${txHash}`,
}));

const createNotification = Notify.create as jest.Mock;
const txHash = `0x${'ab'.repeat(32)}`;

// Returns the options passed to the most recent `Notify.create` call
const lastCreateOptions = () =>
  createNotification.mock.calls[createNotification.mock.calls.length - 1][0] as QNotifyCreateOptions;
const shownMessage = () => lastCreateOptions().message;

function mockProvider(status: number) {
  return {
    getNetwork: jest.fn().mockResolvedValue({ chainId: 10 }),
    waitForTransaction: jest.fn().mockResolvedValue({ status }),
  } as unknown as Provider;
}

describe('alerts', () => {
  beforeEach(() => {
    createNotification.mockReset();
  });

  describe('notifyUser', () => {
    it('shows a success alert as a positive notification for 5 seconds', () => {
      notifyUser('success', 'Address copied');

      expect(createNotification).toHaveBeenCalledTimes(1);
      expect(lastCreateOptions()).toMatchObject({
        type: 'positive',
        message: 'Address copied',
        timeout: 5000,
        position: 'top-right',
      });
    });

    it('shows an error alert as a negative notification for 10 seconds', () => {
      notifyUser('error', 'Something went wrong');

      expect(lastCreateOptions()).toMatchObject({ type: 'negative', message: 'Something went wrong', timeout: 10000 });
    });

    it('shows a hint as an info notification for 5 seconds', () => {
      notifyUser('hint', 'Request canceled');

      expect(lastCreateOptions()).toMatchObject({ type: 'info', message: 'Request canceled', timeout: 5000 });
    });

    it('includes a button that dismisses the notification', () => {
      notifyUser('success', 'Address copied');

      expect(lastCreateOptions().actions).toEqual([
        expect.objectContaining({ icon: 'fas fa-xmark', 'aria-label': 'Utils.Alerts.dismiss' }),
      ]);
    });

    it('does not show messages the app ignores', () => {
      notifyUser('error', 'Error: Navigating to current location ("/") is not allowed');

      expect(createNotification).not.toHaveBeenCalled();
    });
  });

  describe('handleError', () => {
    let consoleError: jest.SpyInstance;

    beforeEach(() => {
      consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
      consoleError.mockRestore();
    });

    it('shows the message of an Error as an error alert', () => {
      handleError(new Error('Something failed'));
      expect(lastCreateOptions()).toMatchObject({ type: 'negative', message: 'Something failed' });
    });

    it('shows a thrown string', () => {
      handleError('Something failed');
      expect(shownMessage()).toBe('Something failed');
    });

    it('shows the message of a JSON-RPC error object', () => {
      handleError({ code: -32603, message: 'Internal JSON-RPC error.' });
      expect(shownMessage()).toBe('Internal JSON-RPC error.');
    });

    it('shows the short message of an ethers error', () => {
      const logger = new Logger('providers/5.8.0');
      handleError(
        logger.makeError('insufficient funds for intrinsic transaction cost', Logger.errors.INSUFFICIENT_FUNDS, {
          method: 'estimateGas',
          transaction: { data: '0xb9fbafe1' },
        })
      );
      expect(shownMessage()).toBe('insufficient funds for intrinsic transaction cost');
    });

    it('shows the fallback message when there is no message', () => {
      for (const value of [undefined, null, {}, new Error()]) {
        createNotification.mockClear();
        handleError(value);
        expect(shownMessage()).toBe('An unknown error occurred');
      }
    });

    it('shows a custom fallback message', () => {
      handleError(undefined, 'Could not load');
      expect(shownMessage()).toBe('Could not load');
    });

    it('logs the original value', () => {
      const reason = { code: -32603, message: 'Internal JSON-RPC error.' };
      handleError(reason);
      expect(console.error).toHaveBeenCalledWith(reason);
    });

    describe('when the user rejects a request in their wallet', () => {
      const logger = new Logger('providers/5.8.0');

      it('shows a notice that the transaction was canceled', () => {
        const transaction = { data: '0xb9fbafe1', value: { type: 'BigNumber', hex: '0x00' } };
        handleError(
          logger.makeError('user rejected transaction', Logger.errors.ACTION_REJECTED, {
            action: 'sendTransaction',
            transaction,
          })
        );
        expect(lastCreateOptions()).toMatchObject({ type: 'info', message: 'Utils.Alerts.transaction-canceled' });
      });

      it('shows a notice that the signature request was canceled', () => {
        handleError(
          logger.makeError('user rejected signing', Logger.errors.ACTION_REJECTED, { action: 'signMessage' })
        );
        expect(lastCreateOptions()).toMatchObject({ type: 'info', message: 'Utils.Alerts.signature-canceled' });
      });

      it('shows a notice that the request was canceled when the action is unknown', () => {
        handleError({ code: 4001, message: 'User rejected the request.' });
        expect(lastCreateOptions()).toMatchObject({ type: 'info', message: 'Utils.Alerts.request-canceled' });
      });

      it('does not log the rejection as an error', () => {
        handleError({ code: 4001, message: 'User rejected the request.' });
        expect(console.error).not.toHaveBeenCalled();
      });
    });
  });

  describe('txNotify', () => {
    it("registers a pending notification type in Umbra's primary color", () => {
      expect(Notify.registerType).toHaveBeenCalledWith(
        'pending',
        expect.objectContaining({ color: 'primary', textColor: 'dark', spinner: true, timeout: 0 })
      );
    });

    it('shows a pending notification, then updates it when the transaction succeeds', async () => {
      const update = jest.fn();
      createNotification.mockReturnValue(update);

      await txNotify(txHash, mockProvider(1));

      expect(lastCreateOptions()).toMatchObject({ type: 'pending', message: 'Utils.Alerts.transaction-pending' });
      expect(update).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Utils.Alerts.transaction-succeeded',
        timeout: 5000,
      });
    });

    it('updates the pending notification when the transaction fails', async () => {
      const update = jest.fn();
      createNotification.mockReturnValue(update);

      await txNotify(txHash, mockProvider(0));

      expect(update).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Utils.Alerts.transaction-failed',
        timeout: 5000,
      });
    });

    it('links to the transaction in a block explorer and includes only a dismiss button', async () => {
      createNotification.mockReturnValue(jest.fn());

      await txNotify(txHash, mockProvider(1));

      const options = lastCreateOptions();
      expect(options.html).toBe(true);
      expect(options.actions).toEqual([expect.objectContaining({ icon: 'fas fa-xmark' })]);
      const caption = document.createElement('div');
      caption.innerHTML = options.caption || '';
      const link = caption.querySelector('a');
      expect(link?.getAttribute('href')).toBe(`https://explorer.example/10/tx/${txHash}`);
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link?.textContent).toBe('Utils.Alerts.view-transaction');
    });

    it('omits the block explorer link if the transaction hash is not valid', async () => {
      createNotification.mockReturnValue(jest.fn());

      await txNotify('<img src=x onerror=alert(1)>', mockProvider(1));

      expect(lastCreateOptions().caption).toBeUndefined();
    });
  });
});
