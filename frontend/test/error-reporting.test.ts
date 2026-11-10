import { spawnSync } from 'child_process';
import { join } from 'path';
import { ErrorReport, scrubMessage, scrubStack } from '../src/utils/error-reporting';
import { Logger } from '../src/utils/ethers';
import examples from './error-scrubbing-examples.json';

const mockStorage: Record<string, unknown> = {};
jest.mock('quasar', () => ({
  LocalStorage: { getItem: (key: string) => (key in mockStorage ? mockStorage[key] : null) },
}));

const { appOrigin } = examples;
const appFrame = `    at Proxy.send (${appOrigin}/js/app.d5e6f7a8.js:1:2345)`;
const extensionFrame = '    at r (chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/inpage.js:1:12345)';

// Returns an Error with the given stack frames, after a header line like the one V8 adds
function errorWithFrames(message: string, frames: string[], name = 'Error') {
  const error = new Error(message);
  error.name = name;
  error.stack = [`${name}: ${message}`, ...frames].join('\n');
  return error;
}

describe('scrubMessage', () => {
  it.each(examples.messages)('scrubs $description', ({ input, output }) => {
    expect(scrubMessage(input)).toBe(output);
  });

  it.each(examples.messages)('leaves a scrubbed $description unchanged', ({ output }) => {
    expect(scrubMessage(output)).toBe(output);
  });
});

describe('scrubStack', () => {
  it.each(examples.stacks)('scrubs $description', ({ input, output }) => {
    expect(scrubStack(input, appOrigin)).toBe(output);
  });

  it.each(examples.stacks)('leaves a scrubbed $description unchanged', ({ output }) => {
    expect(scrubStack(output, appOrigin)).toBe(output);
  });
});

describe('reportError', () => {
  const fetchMock = jest.fn();
  let reporter: typeof import('../src/utils/error-reporting');

  // Each test loads the module again, so the reports sent by one test don't count towards the limits in another
  beforeEach(async () => {
    jest.resetModules();
    reporter = await import('../src/utils/error-reporting');
    for (const key of Object.keys(mockStorage)) delete mockStorage[key];
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ status: 204 });
    Object.assign(globalThis, { fetch: fetchMock, window: { location: { origin: appOrigin } } });
    process.env.PROD = 'true';
  });

  afterEach(() => {
    delete process.env.PROD;
  });

  const sentReports = () =>
    fetchMock.mock.calls.map(([, init]: [string, RequestInit]) => JSON.parse(init.body as string) as ErrorReport);

  it('sends a report of an Error', () => {
    reporter.setErrorReportingContext({
      routeName: () => 'send',
      chainId: () => 10,
      walletName: () => 'MetaMask',
      locale: () => 'es-ES',
    });
    reporter.reportError(errorWithFrames('Failed to send to vitalik.eth', [appFrame], 'TypeError'), 'vue', {
      vueInfo: 'setup function',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/client-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: expect.any(String) as string,
      keepalive: true,
      credentials: 'omit',
    });
    expect(sentReports()[0]).toEqual({
      v: 1,
      source: 'vue',
      name: 'TypeError',
      code: null,
      message: 'Failed to send to <name>',
      stack: appFrame,
      vueInfo: 'setup function',
      caughtIn: null,
      release: 'unknown',
      route: 'send',
      chainId: 10,
      wallet: 'MetaMask',
      locale: 'es-ES',
    });
  });

  it('includes the short hash of the commit the app was built from', () => {
    process.env.COMMIT_HASH = '13f1ebf190b2c252c185e74f2e25159771f53137';
    try {
      reporter.reportError(new Error('Something failed'), 'handled');
    } finally {
      Reflect.deleteProperty(process.env, 'COMMIT_HASH');
    }
    expect(sentReports()[0].release).toBe('13f1ebf');
  });

  it('sends only the frames of a stack', () => {
    reporter.reportError(
      errorWithFrames('Failed\nacross two lines', [appFrame, '    at new Promise (<anonymous>)']),
      'vue'
    );
    expect(sentReports()[0].stack).toBe(`${appFrame}\n    at new Promise (<anonymous>)`);
  });

  it('reads Firefox and Safari stacks, which have no header line', () => {
    const error = new Error('Failed');
    error.stack = `send@${appOrigin}/js/app.js:1:2\nforEach@[native code]\n`;
    reporter.reportError(error, 'vue');
    expect(sentReports()[0].stack).toBe(`send@${appOrigin}/js/app.js:1:2\nforEach@[native code]`);
  });

  it('uses the short message of an ethers error', () => {
    const error = new Logger('providers/5.8.0').makeError(
      'cannot estimate gas; transaction may fail or may require manual gas limit',
      Logger.errors.UNPREDICTABLE_GAS_LIMIT,
      {
        reason: 'execution reverted: Umbra: Payment below toll of 0.001 ETH',
        transaction: { from: '0x1aD91ee08f21bE3dE0BA2ba6918E714dA6B45836', data: '0xb9fbafe1' },
      }
    );
    reporter.reportError(error, 'rejection');
    expect(sentReports()[0]).toMatchObject({
      name: 'Error',
      code: 'UNPREDICTABLE_GAS_LIMIT',
      message: 'execution reverted: Umbra: Payment below toll of <num> ETH',
    });
  });

  it('reports the code and message of a JSON-RPC error object, without a stack', () => {
    reporter.reportError({ code: -32603, message: 'Internal JSON-RPC error.' }, 'rejection');
    expect(sentReports()[0]).toMatchObject({
      source: 'rejection',
      name: 'Object',
      code: -32603,
      message: 'Internal JSON-RPC error.',
      stack: null,
    });
  });

  it('reports values that are not Errors', () => {
    reporter.reportError('Something failed for alice@example.com', 'rejection');
    reporter.reportError(null, 'rejection');
    reporter.reportError(undefined, 'rejection');
    expect(sentReports().map(({ name, message }) => ({ name, message }))).toEqual([
      { name: 'string', message: 'Something failed for <email>' },
      { name: 'null', message: '' },
      { name: 'undefined', message: '' },
    ]);
  });

  it("shortens Vue's error reference links", () => {
    reporter.reportError(new Error('Failed'), 'vue', { vueInfo: 'https://vuejs.org/error-reference/#runtime-1' });
    expect(sentReports()[0].vueInfo).toBe('runtime-1');
  });

  it('reports error events without an Error object', () => {
    const event = { message: 'Uncaught Failed', filename: `${appOrigin}/js/app.js`, lineno: 1, colno: 2 };
    reporter.reportError(reporter.errorFromEvent(event), 'error-event');
    expect(sentReports()[0]).toMatchObject({
      source: 'error-event',
      name: 'ErrorEvent',
      message: 'Uncaught Failed',
      stack: `    at ${appOrigin}/js/app.js:1:2`,
    });
  });

  it('leaves out context values it does not expect', () => {
    reporter.setErrorReportingContext({
      routeName: () => undefined,
      chainId: () => '10',
      walletName: () => 42,
      locale: () => 'fr-FR',
    });
    reporter.reportError(new Error('Something failed'), 'handled');
    expect(sentReports()[0]).toMatchObject({ route: null, chainId: null, wallet: null, locale: null });
  });

  it('leaves out an empty wallet name', () => {
    reporter.setErrorReportingContext({ walletName: () => '' });
    reporter.reportError(new Error('Something failed'), 'handled');
    expect(sentReports()[0].wallet).toBeNull();
  });

  it('scrubs the wallet name, since wallets name themselves', () => {
    reporter.setErrorReportingContext({ walletName: () => 'Wallet for vitalik.eth' });
    reporter.reportError(new Error('Something failed'), 'handled');
    expect(sentReports()[0].wallet).toBe('Wallet for <name>');
  });

  it('includes the label of the catch block that reported the error', () => {
    reporter.reportError(new Error('Something failed'), 'handled', { caughtIn: 'wallet.getPrivateKeys' });
    expect(sentReports()[0]).toMatchObject({ source: 'handled', caughtIn: 'wallet.getPrivateKeys' });
  });

  it('truncates long values', () => {
    reporter.setErrorReportingContext({ walletName: () => 'x'.repeat(60) });
    reporter.reportError(new Error('a '.repeat(400)), 'handled', { caughtIn: 'x'.repeat(60) });
    expect(sentReports()[0].message).toHaveLength(500);
    expect(sentReports()[0].wallet).toBe('x'.repeat(50));
    expect(sentReports()[0].caughtIn).toBe('x'.repeat(50));
  });

  describe('sends nothing', () => {
    it('in development builds', () => {
      delete process.env.PROD;
      reporter.reportError(new Error('Something failed'), 'handled');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('when the user turned error reporting off', () => {
      mockStorage['error-reporting'] = false;
      reporter.reportError(new Error('Something failed'), 'handled');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('when the user rejects a request in their wallet', () => {
      reporter.reportError({ code: 4001, message: 'User rejected the request.' }, 'rejection');
      reporter.reportError({ code: 'ACTION_REJECTED', message: 'user rejected transaction' }, 'rejection');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('for messages that are ignored', () => {
      reporter.reportError(new Error('Navigating to current location ("/send") is not allowed'), 'vue');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('for cross-origin script errors and ResizeObserver notices', () => {
      const scriptError = reporter.errorFromEvent({ message: 'Script error.', filename: '', lineno: 0, colno: 0 });
      reporter.reportError(scriptError, 'error-event');
      reporter.reportError(new Error('ResizeObserver loop completed with undelivered notifications.'), 'error-event');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('for errors whose frames all come from other origins', () => {
      reporter.reportError(errorWithFrames('Failed', [extensionFrame]), 'error-event');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('reports errors that have frames from the app and from other origins', () => {
    reporter.reportError(errorWithFrames('Failed', [extensionFrame, appFrame]), 'error-event');
    expect(sentReports()[0].stack).toBe(`    at r (<ext>:1:12345)\n${appFrame}`);
  });

  it('sends each error at most once per page load', () => {
    reporter.reportError(errorWithFrames('Failed', [appFrame]), 'vue');
    reporter.reportError(errorWithFrames('Failed', [appFrame]), 'vue');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends at most 10 reports per page load', () => {
    for (let i = 0; i < 12; i++) reporter.reportError(new Error(`Failure ${i}`), 'handled');
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it('does not throw when sending fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(() => reporter.reportError(new Error('First'), 'handled')).not.toThrow();
    fetchMock.mockImplementation(() => {
      throw new TypeError('fetch is not available');
    });
    expect(() => reporter.reportError(new Error('Second'), 'handled')).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0)); // lets an unhandled rejection surface, if there is one
  });

  it('does not throw when reading the context fails', () => {
    reporter.setErrorReportingContext({
      routeName: () => {
        throw new Error('No router');
      },
    });
    expect(() => reporter.reportError(new Error('Something failed'), 'handled')).not.toThrow();
  });
});

describe('the client-error Netlify function', () => {
  const url = `${appOrigin}/api/client-error`;
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

  type FunctionRequest = { method?: string; headers?: Record<string, string>; body?: string };
  type FunctionResult = { status: number; allow: string | null; body: string; logs: string[] };

  // Runs the function on each request in a separate Node process, since Jest can't import ES modules
  function runFunction(requests: FunctionRequest[]): FunctionResult[] {
    const input = requests.map(({ method = 'POST', headers = {}, body }) => ({
      url,
      method,
      headers: { 'content-type': 'application/json', 'user-agent': userAgent, ...headers },
      body,
    }));
    const result = spawnSync(process.execPath, [join(__dirname, 'run-client-error-function.mjs')], {
      input: JSON.stringify(input),
      encoding: 'utf8',
    });
    if (result.status !== 0) throw new Error(`The function runner failed: ${result.stderr}`);
    return JSON.parse(result.stdout) as FunctionResult[];
  }

  const loggedReport = (result: FunctionResult) => {
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].startsWith('client_error ')).toBe(true);
    return JSON.parse(result.logs[0].slice('client_error '.length)) as Record<string, unknown>;
  };

  const validReport = {
    v: 1,
    source: 'vue',
    name: 'TypeError',
    code: null,
    message: 'Failed',
    stack: appFrame,
    vueInfo: 'runtime-1',
    caughtIn: null,
    release: '13f1ebf',
    route: 'send',
    chainId: 1,
    wallet: 'MetaMask',
    locale: 'en-US',
  };

  it('logs a valid report with the browser and OS families, and responds with 204', () => {
    const [result] = runFunction([{ body: JSON.stringify({ ...validReport, extra: 'dropped' }) }]);
    expect(result.status).toBe(204);
    expect(result.body).toBe('');
    expect(loggedReport(result)).toEqual({ ...validReport, browser: 'Chrome 141', os: 'macOS' });
  });

  it('scrubs messages with the same rules as the frontend', () => {
    const results = runFunction(
      examples.messages.map(({ input }) => ({ body: JSON.stringify({ v: 1, source: 'handled', message: input }) }))
    );
    expect(results.map((result) => loggedReport(result).message)).toEqual(
      examples.messages.map(({ output }) => output)
    );
  });

  it('scrubs stacks with the same rules as the frontend', () => {
    const results = runFunction(
      examples.stacks.map(({ input }) => ({ body: JSON.stringify({ v: 1, source: 'handled', stack: input }) }))
    );
    expect(results.map((result) => loggedReport(result).stack)).toEqual(examples.stacks.map(({ output }) => output));
  });

  it('scrubs and truncates the other text fields', () => {
    const [result] = runFunction([
      {
        body: JSON.stringify({
          v: 1,
          source: 'handled',
          name: 'Error for vitalik.eth',
          code: 'CODE_0x1aD91ee08f21bE3dE0BA2ba6918E714dA6B45836',
          message: 'x'.repeat(600),
          vueInfo: 'alice@example.com',
          release: 'not a hash',
          route: 'x'.repeat(60),
          wallet: `Wallet for vitalik.eth ${'x'.repeat(60)}`,
        }),
      },
    ]);
    expect(loggedReport(result)).toMatchObject({
      name: 'Error for <name>',
      code: 'CODE_<hex:40>',
      message: 'x'.repeat(500),
      vueInfo: '<email>',
      release: null,
      route: 'x'.repeat(50),
      wallet: `Wallet for <name> ${'x'.repeat(32)}`,
    });
  });

  it('keeps the label of the catch block that reported the error, unless it is not an identifier', () => {
    const results = runFunction(
      ['wallet.getPrivateKeys', 'getPrivateKeys for vitalik.eth'].map((caughtIn) => ({
        body: JSON.stringify({ ...validReport, source: 'handled', vueInfo: null, caughtIn }),
      }))
    );
    expect(results.map((result) => loggedReport(result).caughtIn)).toEqual(['wallet.getPrivateKeys', null]);
  });

  it('reads the browser and OS families from common user agents', () => {
    const userAgents = [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
      'curl/8.7.1',
    ];
    const results = runFunction(
      userAgents.map((agent) => ({ headers: { 'user-agent': agent }, body: JSON.stringify(validReport) }))
    );
    expect(results.map((result) => loggedReport(result))).toMatchObject([
      { browser: 'Safari 17', os: 'iOS' },
      { browser: 'Firefox 133', os: 'Windows' },
      { browser: 'Edge 141', os: 'Windows' },
      { browser: 'Chrome 141', os: 'Android' },
      { browser: 'Other', os: 'Other' },
    ]);
  });

  it('rejects requests it cannot accept', () => {
    const results = runFunction([
      { method: 'GET' },
      { headers: { 'content-type': 'text/plain' }, body: JSON.stringify(validReport) },
      { body: JSON.stringify({ ...validReport, message: 'a'.repeat(17 * 1024) }) },
      { body: '' },
      { body: 'not json' },
      { body: JSON.stringify([validReport]) },
      { body: JSON.stringify({ ...validReport, v: 2 }) },
      { body: JSON.stringify({ ...validReport, source: 'console' }) },
      { body: JSON.stringify({ ...validReport, message: { text: 'Failed' } }) },
      { body: JSON.stringify({ ...validReport, code: 1.5 }) },
      { body: JSON.stringify({ ...validReport, chainId: '1' }) },
      { body: JSON.stringify({ ...validReport, locale: 'fr-FR' }) },
      { body: JSON.stringify({ ...validReport, wallet: 1 }) },
      { body: JSON.stringify({ ...validReport, caughtIn: 1 }) },
    ]);
    expect(results.map(({ status, allow, logs }) => ({ status, allow, logged: logs.length > 0 }))).toEqual([
      { status: 405, allow: 'POST', logged: false },
      { status: 415, allow: null, logged: false },
      { status: 413, allow: null, logged: false },
      ...Array.from({ length: 11 }, () => ({ status: 400, allow: null, logged: false })),
    ]);
  });
});
