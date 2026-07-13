const MAX_REQUEST_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;

const jsonError = (status, message, headers = {}) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const readGraphQlRequest = async (request) => {
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

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { error: jsonError(400, 'Request body must be valid JSON.') };
  }

  if (!isObject(payload) || typeof payload.query !== 'string' || payload.query.trim() === '') {
    return { error: jsonError(400, 'A non-empty GraphQL query is required.') };
  }
  if ('variables' in payload && payload.variables !== null && !isObject(payload.variables)) {
    return { error: jsonError(400, 'GraphQL variables must be an object.') };
  }
  if ('operationName' in payload && payload.operationName !== null && typeof payload.operationName !== 'string') {
    return { error: jsonError(400, 'GraphQL operationName must be a string.') };
  }

  return { body: JSON.stringify(payload) };
};

export default async (request) => {
  if (request.method !== 'POST') {
    return jsonError(405, 'Method not allowed.', { allow: 'POST' });
  }

  const upstreamUrl = (process.env.PONDER_UPSTREAM_URL || '').trim();
  const apiToken = process.env.PONDER_API_TOKEN;
  if (!upstreamUrl || !apiToken) {
    return jsonError(503, 'Ponder proxy is not configured.');
  }

  let parsedUpstreamUrl;
  try {
    parsedUpstreamUrl = new URL(upstreamUrl);
  } catch {
    return jsonError(503, 'Ponder proxy is not configured.');
  }
  if (parsedUpstreamUrl.protocol !== 'https:') {
    return jsonError(503, 'Ponder proxy is not configured.');
  }

  const parsedRequest = await readGraphQlRequest(request);
  if (parsedRequest.error) return parsedRequest.error;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  timeout.unref?.();

  try {
    const upstreamResponse = await fetch(parsedUpstreamUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${apiToken}`,
        'content-type': 'application/json',
      },
      body: parsedRequest.body,
      signal: controller.signal,
    });
    const responseBody = await upstreamResponse.arrayBuffer();
    const contentType = upstreamResponse.headers.get('content-type');

    return new Response(responseBody.byteLength === 0 ? null : responseBody, {
      status: upstreamResponse.status,
      headers: contentType ? { 'content-type': contentType } : undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return jsonError(504, 'Ponder request timed out.');
    }
    return jsonError(502, 'Ponder request failed.');
  } finally {
    clearTimeout(timeout);
  }
};

export const config = {
  path: '/api/ponder',
  rateLimit: {
    action: 'rate_limit',
    windowLimit: 300,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
