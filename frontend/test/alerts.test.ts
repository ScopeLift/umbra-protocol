import { handleError } from '../src/utils/alerts';

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
jest.mock('../src/boot/i18n', () => ({ tc: jest.fn() }));

const shownMessage = () => (mockNotification.mock.calls[0][0] as { message: string }).message;

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
    const reason = { code: 4001, message: 'User rejected the request.' };
    handleError(reason);
    expect(console.error).toHaveBeenCalledWith(reason);
  });
});
