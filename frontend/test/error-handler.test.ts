import { handleError } from '../src/utils/alerts';
import { reportError, setErrorReportingContext } from '../src/utils/error-reporting';
import registerErrorHandlers from '../src/boot/error-handler';

jest.mock('../src/utils/alerts', () => ({ handleError: jest.fn() }));
jest.mock('../src/utils/error-reporting', () => ({
  ...jest.requireActual<typeof import('../src/utils/error-reporting')>('../src/utils/error-reporting'),
  reportError: jest.fn(),
  setErrorReportingContext: jest.fn(),
}));
jest.mock('../src/boot/i18n', () => ({ i18n: { global: { locale: 'zh-CN' } } }));

type Listener = (event: Record<string, unknown>) => void;
type VueErrorHandler = (err: unknown, vm: unknown, info: string) => void;

describe('global error handlers', () => {
  const listeners: Record<string, Listener> = {};
  const app = { config: {} as { errorHandler?: VueErrorHandler } };
  const router = { currentRoute: { value: { name: 'receive' } } };

  beforeAll(() => {
    Object.assign(globalThis, {
      window: { addEventListener: (type: string, listener: Listener) => (listeners[type] = listener) },
    });
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    // The boot function only reads `app` and `router`
    (registerErrorHandlers as unknown as (context: { app: typeof app; router: typeof router }) => void)({
      app,
      router,
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.mocked(handleError).mockClear();
    jest.mocked(reportError).mockClear();
  });

  it('reads the route and locale for error reports', () => {
    const [[getters]] = jest.mocked(setErrorReportingContext).mock.calls;
    expect(getters.routeName?.()).toBe('receive');
    expect(getters.locale?.()).toBe('zh-CN');
  });

  it('reports and shows Vue errors', () => {
    const error = new Error('Failed');
    app.config.errorHandler?.(error, null, 'setup function');
    expect(reportError).toHaveBeenCalledWith(error, 'vue', { vueInfo: 'setup function' });
    expect(handleError).toHaveBeenCalledWith(error);
  });

  it('reports and shows error events that have an Error object', () => {
    const error = new Error('Failed');
    listeners.error({ error, message: 'Uncaught Error: Failed', filename: 'app.js', lineno: 1, colno: 2 });
    expect(reportError).toHaveBeenCalledWith(error, 'error-event', { vueInfo: undefined });
    expect(handleError).toHaveBeenCalledWith(error);
  });

  it('reports error events without an Error object, without showing them', () => {
    listeners.error({ error: null, message: 'Script error.', filename: '', lineno: 0, colno: 0 });
    expect(reportError).toHaveBeenCalledTimes(1);
    const [[reported, source]] = jest.mocked(reportError).mock.calls;
    expect(reported).toMatchObject({ name: 'ErrorEvent', message: 'Script error.' });
    expect(source).toBe('error-event');
    expect(handleError).not.toHaveBeenCalled();
  });

  it('reports and shows unhandled rejections', () => {
    const reason = { code: -32603, message: 'Internal JSON-RPC error.' };
    listeners.unhandledrejection({ reason });
    expect(reportError).toHaveBeenCalledWith(reason, 'rejection', { vueInfo: undefined });
    expect(handleError).toHaveBeenCalledWith(reason);
  });

  it("neither reports nor shows MetaMask's already known rejection", () => {
    listeners.unhandledrejection({ reason: { code: -32000, message: 'already known' } });
    expect(reportError).not.toHaveBeenCalled();
    expect(handleError).not.toHaveBeenCalled();
  });
});
