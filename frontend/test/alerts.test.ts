/**
 * @jest-environment jsdom
 */
import { Notify, QNotifyCreateOptions } from 'quasar';
import { Provider } from 'components/models';
import { handleError, notifyUser, txNotify } from 'src/utils/alerts';

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
    it("shows the error's message as an error alert", () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);

      handleError(new Error('User rejected the request.'));

      expect(lastCreateOptions()).toMatchObject({ type: 'negative', message: 'User rejected the request.' });
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
