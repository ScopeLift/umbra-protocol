import { handleError } from '../src/utils/alerts';
import { Logger } from '../src/utils/ethers';

const mockNotification = jest.fn();

jest.mock('bnc-notify', () => ({
  __esModule: true,
  default: () => ({
    config: jest.fn(),
    notification: (...args: unknown[]) => {
      mockNotification(...args);
    },
  }),
}));
jest.mock('../src/utils/utils', () => ({ getEtherscanUrl: jest.fn() }));
jest.mock('../src/boot/i18n', () => ({ tc: (key: string) => key }));

const shownNotification = () => mockNotification.mock.calls[0][0] as { message: string; type: string };
const shownMessage = () => shownNotification().message;

describe('handleError', () => {
  beforeEach(() => {
    mockNotification.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the message of an Error', () => {
    handleError(new Error('Something failed'));
    expect(shownMessage()).toBe('Something failed');
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
      mockNotification.mockClear();
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
      expect(shownNotification()).toMatchObject({ type: 'hint', message: 'Utils.Alerts.transaction-canceled' });
    });

    it('shows a notice that the signature request was canceled', () => {
      handleError(logger.makeError('user rejected signing', Logger.errors.ACTION_REJECTED, { action: 'signMessage' }));
      expect(shownNotification()).toMatchObject({ type: 'hint', message: 'Utils.Alerts.signature-canceled' });
    });

    it('shows a notice that the request was canceled when the action is unknown', () => {
      handleError({ code: 4001, message: 'User rejected the request.' });
      expect(shownNotification()).toMatchObject({ type: 'hint', message: 'Utils.Alerts.request-canceled' });
    });

    it('does not log the rejection as an error', () => {
      handleError({ code: 4001, message: 'User rejected the request.' });
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});
