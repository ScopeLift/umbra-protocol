// Receives error reports from the frontend and writes each one to the function's logs as a single line that starts
// with `client_error `. Reports are scrubbed again here with the same rules the frontend uses, since anyone can call
// this endpoint. Keep the scrubbing rules in sync with frontend/src/utils/error-reporting.ts. Both are tested against
// the examples in frontend/test/error-scrubbing-examples.json.

const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_USER_AGENT_LENGTH = 512;

// Keep the payload's fields and limits in sync with frontend/src/utils/error-reporting.ts.
const SCHEMA_VERSION = 1;
const SOURCES = ['vue', 'error-event', 'rejection', 'handled'];
const LOCALES = ['en-US', 'zh-CN', 'es-ES'];
const LIMITS = {
  name: 100,
  code: 50,
  message: 500,
  stack: 4000,
  vueInfo: 100,
  caughtIn: 50,
  release: 50,
  route: 50,
  wallet: 50,
};
const TOKEN_PATTERN = /^[A-Za-z0-9._-]+$/;

const jsonError = (status, message, headers = {}) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const readJsonRequest = async (request) => {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return { error: jsonError(415, 'Content-Type must be application/json.') };
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return { error: jsonError(413, 'Request body is too large.') };
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0) {
    return { error: jsonError(400, 'Request body is required.') };
  }
  if (bytes.byteLength > MAX_REQUEST_BYTES) {
    return { error: jsonError(413, 'Request body is too large.') };
  }

  try {
    return { payload: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { error: jsonError(400, 'Request body must be valid JSON.') };
  }
};

// ============================================ Scrubbing ============================================

// A string is scrubbed in segments, so that text a rule has replaced isn't changed again by a later rule. Placeholders
// the rules produce, such as `<url:HOST>`, are recognized when scrubbing again, so scrubbing a scrubbed string doesn't
// change it.
const open = (text) => ({ text, done: false });
const done = (text) => ({ text, done: true });

const replaceInSegments = (segments, pattern, replace) =>
  segments.flatMap((segment) => {
    if (segment.done) return [segment];
    const result = [];
    let lastIndex = 0;
    for (const match of segment.text.matchAll(pattern)) {
      result.push(open(segment.text.slice(lastIndex, match.index)), ...replace(match));
      lastIndex = match.index + match[0].length;
    }
    result.push(open(segment.text.slice(lastIndex)));
    return result;
  });

const joinSegments = (segments) => segments.map((segment) => segment.text).join('');

const HEX_WITH_PREFIX = /0x([0-9a-f]{10,})/gi;
const HEX_WITHOUT_PREFIX = /[0-9a-f]{32,}/gi;
const SENSITIVE_HEX = /0x[0-9a-f]{10,}|[0-9a-f]{32,}/i;

// Rules 3 and 4: hex strings long enough to be addresses, hashes, keys, signatures, calldata or amounts
const replaceHex = (segments) => {
  const withPrefix = replaceInSegments(segments, HEX_WITH_PREFIX, (match) => [done(`<hex:${match[1].length}>`)]);
  return replaceInSegments(withPrefix, HEX_WITHOUT_PREFIX, (match) => [done(`<hex:${match[0].length}>`)]);
};

// Returns the host to show in a placeholder. IP addresses and hosts that contain long hex strings are hidden
const sanitizeHost = (host) => {
  const name = host.toLowerCase();
  if (/^[\d.]+$/.test(name) || name.includes(':') || name.startsWith('[')) return 'ip';
  if (!/^[a-z0-9.-]{1,253}$/.test(name)) return 'invalid';
  return SENSITIVE_HEX.test(name) ? 'redacted' : name;
};

const parseUrl = (text) => {
  try {
    return new URL(text);
  } catch {
    return null;
  }
};

const isExtensionUrl = (url) => url.protocol.endsWith('-extension:');

const MESSAGE_URL = /<url:([^<>\s]{0,253})>|\b[a-z][a-z0-9+.-]{0,30}:\/\/[^\s"'`<>()[\]{}]+/gi;
const EMAIL = /[^\s@<>()[\]{}"'`,;:]{1,64}@(?:[a-z0-9-]{1,63}\.){1,10}[a-z]{2,63}/gi;
const DOMAIN_NAME = /(?:[a-z0-9|-]{1,63}\.){1,10}[a-z]{1,63}/gi;
const NUMBER = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+|\d{6,}/g;

const scrubMessage = (message) => {
  let segments = [open(message)];

  // Rule 1: URLs keep only their host, since RPC URLs can carry keys in their path and query strings can carry anything
  segments = replaceInSegments(segments, MESSAGE_URL, (match) => {
    if (match[1] !== undefined) return [done(`<url:${sanitizeHost(match[1])}>`)];
    const url = parseUrl(match[0]);
    if (!url) return [done('<url:invalid>')];
    return [done(`<url:${isExtensionUrl(url) ? 'ext' : sanitizeHost(url.hostname)}>`)];
  });

  // Rule 2: email addresses
  segments = replaceInSegments(segments, EMAIL, () => [done('<email>')]);

  // Rules 3 and 4: long hex strings, with or without a 0x prefix
  segments = replaceHex(segments);

  // Rule 5: anything `utils.isDomain` in umbra-js would accept, since any of them can be an ENS name or other recipient
  // ID. This also hides some harmless text, such as `window.ethereum`
  segments = replaceInSegments(segments, DOMAIN_NAME, () => [done('<name>')]);

  // Rule 6: decimals, numbers with thousands separators, and integers with 6 or more digits, which can be amounts.
  // Error codes such as -32603 and 4001 are kept
  segments = replaceInSegments(segments, NUMBER, () => [done('<num>')]);

  return joinSegments(segments);
};

const STACK_URL = /<origin:([^<>\s]{0,253})>|<ext>|\b[a-z][a-z0-9+.-]{0,30}:\/\/[^\s"'`<>()[\]{}]+/gi;
const LINE_POSITION = /(?::\d+){1,2}$/;

// Frames from the app's origin keep their URL without its query string, frames from other origins keep only their
// host, and frames from browser extensions keep neither. All frames keep their line and column numbers
const scrubStack = (stack, appOrigin) => {
  let segments = replaceInSegments([open(stack)], STACK_URL, (match) => {
    if (match[0] === '<ext>') return [done('<ext>')];
    if (match[1] !== undefined) return [done(`<origin:${sanitizeHost(match[1])}>`)];

    const position = LINE_POSITION.exec(match[0])?.[0] ?? '';
    const url = parseUrl(match[0].slice(0, match[0].length - position.length));
    if (!url) return [done('<origin:invalid>'), open(position)];
    if (isExtensionUrl(url)) return [done('<ext>'), open(position)];
    if (url.origin === appOrigin) return [open(`${url.origin}${url.pathname}${position}`)];
    return [done(`<origin:${sanitizeHost(url.hostname || url.protocol.slice(0, -1))}>`), open(position)];
  });

  // Rules 3 and 4 of the message rules: long hex strings, with or without a 0x prefix
  segments = replaceHex(segments);

  return joinSegments(segments);
};

// ============================================ Validation ============================================

const truncate = (value, limit) => (value.length > limit ? value.slice(0, limit) : value);

// Reads an optional string field. Returns undefined if the field has the wrong type
const readString = (payload, field) => {
  const value = payload[field] ?? null;
  if (value !== null && typeof value !== 'string') return undefined;
  return value;
};

const readReport = (payload, appOrigin) => {
  if (!isObject(payload)) {
    return { error: jsonError(400, 'Request body must be a JSON object.') };
  }
  if (payload.v !== SCHEMA_VERSION) {
    return { error: jsonError(400, `v must be ${SCHEMA_VERSION}.`) };
  }
  if (!SOURCES.includes(payload.source)) {
    return {
      error: jsonError(400, `source must be one of ${SOURCES.join(', ')}.`),
    };
  }

  const strings = {};
  for (const field of ['name', 'message', 'stack', 'vueInfo', 'caughtIn', 'release', 'route', 'wallet']) {
    const value = readString(payload, field);
    if (value === undefined) return { error: jsonError(400, `${field} must be a string.`) };
    strings[field] = value;
  }

  const code = payload.code ?? null;
  if (code !== null && typeof code !== 'string' && !Number.isSafeInteger(code)) {
    return { error: jsonError(400, 'code must be a string or an integer.') };
  }
  const chainId = payload.chainId ?? null;
  if (chainId !== null && !(Number.isSafeInteger(chainId) && chainId > 0)) {
    return { error: jsonError(400, 'chainId must be a positive integer.') };
  }
  const locale = payload.locale ?? null;
  if (locale !== null && !LOCALES.includes(locale)) {
    return {
      error: jsonError(400, `locale must be one of ${LOCALES.join(', ')}.`),
    };
  }

  // caughtIn, release and route are identifiers, so anything else is dropped rather than scrubbed
  const readToken = (field) => {
    const value = strings[field] === null ? null : truncate(strings[field], LIMITS[field]);
    return value !== null && TOKEN_PATTERN.test(value) ? value : null;
  };
  const scrubText = (field, scrub) => (strings[field] === null ? null : truncate(scrub(strings[field]), LIMITS[field]));

  return {
    report: {
      v: SCHEMA_VERSION,
      source: payload.source,
      name: scrubText('name', scrubMessage) ?? '',
      code: typeof code === 'string' ? truncate(scrubMessage(code), LIMITS.code) : code,
      message: scrubText('message', scrubMessage) ?? '',
      stack: scrubText('stack', (stack) => scrubStack(stack, appOrigin)),
      vueInfo: scrubText('vueInfo', scrubMessage),
      caughtIn: readToken('caughtIn'),
      release: readToken('release'),
      route: readToken('route'),
      chainId,
      wallet: scrubText('wallet', scrubMessage),
      locale,
    },
  };
};

// ======================================== Browser and OS =========================================

// The first match wins, so browsers whose user agents also name another browser come first
const BROWSERS = [
  ['Edge', /\bEdg(?:e|A|iOS)?\/(\d+)/],
  ['Opera', /\bOPR\/(\d+)/],
  ['Samsung Internet', /\bSamsungBrowser\/(\d+)/],
  ['Firefox', /\b(?:Firefox|FxiOS)\/(\d+)/],
  ['Chrome', /\b(?:Chrome|CriOS)\/(\d+)/],
  ['Safari', /\bVersion\/(\d+)[^ ]*(?: Mobile\/\S+)? Safari\//],
];
const OPERATING_SYSTEMS = [
  ['iOS', /\b(?:iPhone|iPad|iPod)\b/],
  ['Android', /\bAndroid\b/],
  ['ChromeOS', /\bCrOS\b/],
  ['Windows', /\bWindows\b/],
  ['macOS', /\bMacintosh\b/],
  ['Linux', /\bLinux\b/],
];

// Returns the browser family with its major version, such as `Chrome 141`, and the OS family, such as `macOS`. The
// raw user agent is never logged
const readUserAgent = (userAgent) => {
  const agent = truncate(userAgent || '', MAX_USER_AGENT_LENGTH);
  const browserMatch = BROWSERS.map(([name, pattern]) => [name, pattern.exec(agent)]).find(([, match]) => match);
  const os = OPERATING_SYSTEMS.find(([, pattern]) => pattern.test(agent));
  return {
    browser: browserMatch ? `${browserMatch[0]} ${browserMatch[1][1]}` : 'Other',
    os: os ? os[0] : 'Other',
  };
};

// ============================================ Handler ============================================

export default async (request) => {
  if (request.method !== 'POST') {
    return jsonError(405, 'Method not allowed.', { allow: 'POST' });
  }

  const parsedRequest = await readJsonRequest(request);
  if (parsedRequest.error) return parsedRequest.error;

  const { report, error } = readReport(parsedRequest.payload, new URL(request.url).origin);
  if (error) return error;

  // Only the report and the browser and OS families are logged. Never log the IP address, location, cookies,
  // referrer or raw user agent
  const { browser, os } = readUserAgent(request.headers.get('user-agent'));
  console.log(`client_error ${JSON.stringify({ ...report, browser, os })}`);

  return new Response(null, { status: 204 });
};

export const config = {
  path: '/api/client-error',
  rateLimit: {
    action: 'rate_limit',
    windowLimit: 30,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
