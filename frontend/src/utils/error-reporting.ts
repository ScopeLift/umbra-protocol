import { LocalStorage } from 'quasar';
import { getErrorMessage, isIgnoredMessage, isRecord, isUserRejection } from './errors';

// Reports the errors users hit to the `client-error` Netlify function, which writes them to the function's logs.
// Reports never include addresses, names, keys or amounts: see the scrubbing rules below. The function scrubs each
// report again with the same rules, so keep `netlify/functions/client-error.mjs` in sync with this file. Both are
// tested against the examples in `test/error-scrubbing-examples.json`.

/**
 * @notice Where an error was caught: Vue's error handler, the window's `error` event, an unhandled promise rejection,
 * or a catch block that reports the error itself
 */
export type ErrorSource = 'vue' | 'error-event' | 'rejection' | 'handled';

/**
 * @notice An error report, as sent to the `client-error` Netlify function
 */
export interface ErrorReport {
  v: 1;
  source: ErrorSource;
  name: string;
  code: string | number | null;
  message: string;
  stack: string | null;
  vueInfo: string | null;
  caughtIn: string | null;
  release: string;
  route: string | null;
  chainId: number | null;
  wallet: string | null;
  locale: string | null;
}

/**
 * @notice Local storage key of the setting that turns error reporting on or off
 */
export const errorReportingSetting = 'error-reporting';

const reportUrl = '/api/client-error';
const maxReportsPerPage = 10;
const locales = ['en-US', 'zh-CN', 'es-ES'];
const limits = { name: 100, code: 50, message: 500, stack: 4000, vueInfo: 100, caughtIn: 50, route: 50, wallet: 50 };

// Details that the code reporting an error adds
interface ReportExtra {
  vueInfo?: string;
  caughtIn?: string;
}

// In production builds, Vue's error handler receives a link to Vue's error reference instead of a description
const vueErrorReference = /^https:\/\/vuejs\.org\/error-reference\/#/;

// Lines of a stack that are frames: `    at …` in Chromium, and `…@url:line:column` in Firefox and Safari
const stackFrame = /^\s*at |@.*:\d+(?::\d+)?$|@\[native code\]$/;
const urlInText = /\b[a-z][a-z0-9+.-]{0,30}:\/\//i;

// ======================================== Report context =========================================

// Getters for app state that this module can't import without loading most of the app
interface ErrorReportingContext {
  routeName: () => unknown;
  chainId: () => unknown;
  walletName: () => unknown;
  locale: () => unknown;
}

const context: ErrorReportingContext = {
  routeName: () => null,
  chainId: () => null,
  walletName: () => null,
  locale: () => null,
};

/**
 * @notice Sets the getters that error reports read the current route, network, wallet and locale from
 * @param getters Getters to set. Getters that aren't passed are left unchanged
 */
export function setErrorReportingContext(getters: Partial<ErrorReportingContext>) {
  Object.assign(context, getters);
}

// ============================================ Reporting ============================================

const sentFingerprints = new Set<string>();

/**
 * @notice Returns true unless the user turned error reporting off in Settings
 * @dev Reads local storage each time, since the settings store loads its values after the boot files run
 */
export function isErrorReportingEnabled(): boolean {
  return LocalStorage.getItem(errorReportingSetting) !== false;
}

/**
 * @notice Reports an error to the `client-error` Netlify function, unless reporting is off or the error is noise
 * @dev Never throws, and never calls `handleError`, since a failure here would then loop
 * @param error Value that was thrown, or the reason a promise was rejected
 * @param source Where the error was caught
 * @param extra.vueInfo Information from Vue's error handler about where the error happened
 * @param extra.caughtIn For an error a catch block reports, a fixed label for that block, such as
 * `wallet.getPrivateKeys`. Production stacks are minified, so this is what tells reports from different blocks apart
 */
export function reportError(error: unknown, source: ErrorSource, extra: ReportExtra = {}): void {
  try {
    if (!process.env.PROD || !isErrorReportingEnabled()) return;

    const appOrigin = window.location.origin;
    const message = getErrorMessage(error);
    const frames = getStackFrames(error);
    if (isNoise(error, message, frames, appOrigin)) return;

    const report = buildReport(error, source, extra, message, frames, appOrigin);
    const firstAppFrame = report.stack?.split('\n').find((frame) => frame.includes(`${appOrigin}/`)) ?? '';
    const fingerprint = [report.name, report.message, firstAppFrame].join('\n');
    if (sentFingerprints.has(fingerprint) || sentFingerprints.size >= maxReportsPerPage) return;
    sentFingerprints.add(fingerprint);

    void fetch(reportUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true,
      credentials: 'omit',
    }).catch(() => undefined);
  } catch {
    // Reporting is best effort, so failures are ignored
  }
}

/**
 * @notice Converts an `error` event that has no Error object, such as a cross-origin "Script error.", to an Error
 * that can be reported
 * @param event The `error` event
 */
export function errorFromEvent(event: Pick<ErrorEvent, 'message' | 'filename' | 'lineno' | 'colno'>): Error {
  const error = new Error(event.message);
  error.name = 'ErrorEvent';
  error.stack = event.filename ? `    at ${event.filename}:${event.lineno}:${event.colno}` : '';
  return error;
}

function getStackFrames(error: unknown): string[] {
  // A stack is only read from the error itself. An Error created here would have a stack that points at the reporter
  if (!isRecord(error) || typeof error.stack !== 'string') return [];
  return error.stack.split('\n').filter((line) => stackFrame.test(line));
}

function isNoise(error: unknown, message: string, frames: string[], appOrigin: string): boolean {
  if (isUserRejection(error) || isIgnoredMessage(message)) return true;
  if (message.startsWith('Script error') || message.startsWith('ResizeObserver loop')) return true;

  // Errors whose frames all come from other origins come from browser extensions and injected wallet scripts
  const framesWithUrls = frames.filter((frame) => urlInText.test(frame));
  return framesWithUrls.length > 0 && !framesWithUrls.some((frame) => frame.includes(`${appOrigin}/`));
}

function buildReport(
  error: unknown,
  source: ErrorSource,
  extra: ReportExtra,
  message: string,
  frames: string[],
  appOrigin: string
): ErrorReport {
  const route = context.routeName();
  const chainId = context.chainId();
  const walletName = context.walletName();
  const locale = context.locale();

  return {
    v: 1,
    source,
    name: truncate(scrubMessage(getErrorName(error)), limits.name),
    code: getErrorCode(error),
    message: truncate(scrubMessage(message), limits.message),
    stack: frames.length > 0 ? truncate(scrubStack(frames.join('\n'), appOrigin), limits.stack) : null,
    vueInfo: extra.vueInfo
      ? truncate(scrubMessage(extra.vueInfo.replace(vueErrorReference, '')), limits.vueInfo)
      : null,
    caughtIn: extra.caughtIn ? truncate(extra.caughtIn, limits.caughtIn) : null,
    release: (process.env.COMMIT_HASH || 'unknown').slice(0, 7),
    route: typeof route === 'string' ? truncate(route, limits.route) : null,
    chainId: Number.isSafeInteger(chainId) ? (chainId as number) : null,
    // Wallets name themselves, so the name is scrubbed like any other text
    wallet: typeof walletName === 'string' && walletName ? truncate(scrubMessage(walletName), limits.wallet) : null,
    locale: typeof locale === 'string' && locales.includes(locale) ? locale : null,
  };
}

function getErrorName(error: unknown): string {
  if (error instanceof Error) return error.name || 'Error';
  if (isRecord(error)) return typeof error.name === 'string' && error.name ? error.name : 'Object';
  return error === null ? 'null' : typeof error;
}

// Returns the EIP-1193, JSON-RPC or ethers error code, if there is one
function getErrorCode(error: unknown): string | number | null {
  const code = isRecord(error) ? error.code : undefined;
  if (typeof code === 'string') return truncate(scrubMessage(code), limits.code);
  return Number.isSafeInteger(code) ? (code as number) : null;
}

function truncate(value: string, limit: number): string {
  return value.length > limit ? value.slice(0, limit) : value;
}

// ============================================ Scrubbing ============================================

// A string is scrubbed in segments, so that text a rule has replaced isn't changed again by a later rule. Placeholders
// the rules produce, such as `<url:HOST>`, are recognized when scrubbing again, so scrubbing a scrubbed string doesn't
// change it.
type Segment = { text: string; done: boolean };

const open = (text: string): Segment => ({ text, done: false });
const done = (text: string): Segment => ({ text, done: true });

// Adjacent open segments are merged, so a later rule can match text that spans them
function replaceInSegments(
  segments: Segment[],
  pattern: RegExp,
  replace: (match: RegExpMatchArray) => Segment[]
): Segment[] {
  const result: Segment[] = [];
  const push = (segment: Segment) => {
    const last = result[result.length - 1];
    if (!segment.done && last && !last.done) result[result.length - 1] = open(last.text + segment.text);
    else if (segment.done || segment.text) result.push(segment);
  };

  for (const segment of segments) {
    if (segment.done) {
      push(segment);
      continue;
    }
    let lastIndex = 0;
    for (const match of segment.text.matchAll(pattern)) {
      const index = match.index ?? 0;
      push(open(segment.text.slice(lastIndex, index)));
      replace(match).forEach(push);
      lastIndex = index + match[0].length;
    }
    push(open(segment.text.slice(lastIndex)));
  }
  return result;
}

const joinSegments = (segments: Segment[]) => segments.map((segment) => segment.text).join('');

const hexWithPrefix = /0x([0-9a-f]{10,})/gi;
const hexWithoutPrefix = /[0-9a-f]{32,}/gi;
const sensitiveHex = /0x[0-9a-f]{10,}|[0-9a-f]{32,}/i;

// Rules 3 and 4: hex strings long enough to be addresses, hashes, keys, signatures, calldata or amounts
function replaceHex(segments: Segment[]): Segment[] {
  const withPrefix = replaceInSegments(segments, hexWithPrefix, (match) => [done(`<hex:${match[1].length}>`)]);
  return replaceInSegments(withPrefix, hexWithoutPrefix, (match) => [done(`<hex:${match[0].length}>`)]);
}

// Returns the host to show in a placeholder. IP addresses and hosts that contain long hex strings are hidden
function sanitizeHost(host: string): string {
  const name = host.toLowerCase();
  if (/^[\d.]+$/.test(name) || name.includes(':') || name.startsWith('[')) return 'ip';
  if (!/^[a-z0-9.-]{1,253}$/.test(name)) return 'invalid';
  return sensitiveHex.test(name) ? 'redacted' : name;
}

function parseUrl(text: string): URL | null {
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

const isExtensionUrl = (url: URL) => url.protocol.endsWith('-extension:');

const messageUrl = /<url:([^<>\s]{0,253})>|\b[a-z][a-z0-9+.-]{0,30}:\/\/[^\s"'`<>()[\]{}]+/gi;
const email = /[^\s@<>()[\]{}"'`,;:]{1,64}@(?:[a-z0-9-]{1,63}\.){1,10}[a-z]{2,63}/gi;
const number = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+|\d{6,}/g;

// Some umbra-js errors quote the recipient the user entered, which might not look like a name
const quotedRecipient = /(provided name or address of ')(.*?)(' is correct)|(recipient ID )(\S+)/g;

// Runs of text between characters that can't be part of a name, such as spaces, quotes and brackets. ENS names can
// contain letters and digits in any script, emoji, symbols, `$`, `'` and `-`, so names are found by their dots
// instead of by the characters they contain
const nameCandidate = /[^\s<>()[\]{}"`,;:/\\]+/g;
const nameEdgeCharacters = new Set(['.', "'", '’']);

// Splits dots and apostrophes off the ends of a candidate, such as the quotes in `'alice.eth'`, so they're kept
function splitNameEdges(candidate: string): [string, string, string] {
  let start = 0;
  let end = candidate.length;
  while (start < end && nameEdgeCharacters.has(candidate[start])) start++;
  while (end > start && nameEdgeCharacters.has(candidate[end - 1])) end--;
  return [candidate.slice(0, start), candidate.slice(start, end), candidate.slice(end)];
}

// Text with a dot is a name, unless its last label starts with a digit, as in the decimal `1.5`
function isName(text: string): boolean {
  const labels = text.split('.');
  return labels.length > 1 && !/^\d/.test(labels[labels.length - 1]);
}

/**
 * @notice Removes addresses, keys, names, amounts and other sensitive values from an error message
 * @param message Error message
 */
export function scrubMessage(message: string): string {
  let segments = [open(message)];

  // Recipients that umbra-js quotes, before any other rule can split them
  segments = replaceInSegments(segments, quotedRecipient, (match) =>
    match[1] !== undefined ? [open(match[1]), done('<name>'), open(match[3])] : [open(match[4]), done('<name>')]
  );

  // Rule 1: URLs keep only their host, since RPC URLs can carry keys in their path and query strings can carry anything
  segments = replaceInSegments(segments, messageUrl, (match) => {
    if (match[1] !== undefined) return [done(`<url:${sanitizeHost(match[1])}>`)];
    const url = parseUrl(match[0]);
    if (!url) return [done('<url:invalid>')];
    return [done(`<url:${isExtensionUrl(url) ? 'ext' : sanitizeHost(url.hostname)}>`)];
  });

  // Rule 2: email addresses
  segments = replaceInSegments(segments, email, () => [done('<email>')]);

  // Rules 3 and 4: long hex strings, with or without a 0x prefix
  segments = replaceHex(segments);

  // Rule 5: names, in any script, since any of them can be an ENS name or other recipient ID. This also hides some
  // harmless text, such as `window.ethereum`
  segments = replaceInSegments(segments, nameCandidate, (match) => {
    const [leading, candidate, trailing] = splitNameEdges(match[0]);
    return isName(candidate) ? [open(leading), done('<name>'), open(trailing)] : [open(match[0])];
  });

  // Rule 6: decimals, numbers with thousands separators, and integers with 6 or more digits, which can be amounts.
  // Error codes such as -32603 and 4001 are kept
  segments = replaceInSegments(segments, number, () => [done('<num>')]);

  return joinSegments(segments);
}

const stackUrl = /<origin:([^<>\s]{0,253})>|<ext>|\b[a-z][a-z0-9+.-]{0,30}:\/\/[^\s"'`<>()[\]{}]+/gi;
const linePosition = /(?::\d+){1,2}$/;

/**
 * @notice Removes sensitive values from the frames of a stack. Frames from the app's origin keep their URL without its
 * query string, frames from other origins keep only their host, and frames from browser extensions keep neither. All
 * frames keep their line and column numbers
 * @param stack Frames of a stack, one per line
 * @param appOrigin Origin the app is served from, such as `https://app.umbra.cash`
 */
export function scrubStack(stack: string, appOrigin: string): string {
  let segments = replaceInSegments([open(stack)], stackUrl, (match) => {
    if (match[0] === '<ext>') return [done('<ext>')];
    if (match[1] !== undefined) return [done(`<origin:${sanitizeHost(match[1])}>`)];

    const position = linePosition.exec(match[0])?.[0] ?? '';
    const url = parseUrl(match[0].slice(0, match[0].length - position.length));
    if (!url) return [done('<origin:invalid>'), open(position)];
    if (isExtensionUrl(url)) return [done('<ext>'), open(position)];
    if (url.origin === appOrigin) return [open(`${url.origin}${url.pathname}${position}`)];
    return [done(`<origin:${sanitizeHost(url.hostname || url.protocol.slice(0, -1))}>`), open(position)];
  });

  // Rules 3 and 4 of the message rules: long hex strings, with or without a 0x prefix
  segments = replaceHex(segments);

  return joinSegments(segments);
}
