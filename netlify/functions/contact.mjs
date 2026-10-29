const MAX_REQUEST_BYTES = 32 * 1024;
const UPSTREAM_TIMEOUT_MS = 10_000;

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

const SENDER = 'Umbra Contact Form <contact-form@umbra.cash>';
const RECIPIENT = 'support@umbra.cash';
const SUBJECT_PREFIX = '[Umbra Support]';
const NOT_PROVIDED = '(not provided)';

// Keep the request types, field limits, and email pattern in sync with frontend/src/pages/Contact.vue.
const REQUEST_TYPE_LABELS = {
  'bug-report': 'Bug Report',
  'support-request': 'Support Request',
  'feature-request': 'Feature Request',
  other: 'Other',
};
const FIELD_LIMITS = {
  name: 100,
  email: 254,
  subject: 200,
  pageUrl: 2000,
  message: 5000,
  commitHash: 40, // sent by the frontend rather than entered by the user, so Contact.vue has no limit for it
};
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// Multiline fields keep their line breaks. Single-line fields have all whitespace, including line breaks, collapsed
// to single spaces so a submitter can't add lines that look like other fields in the email.
const readTextField = (payload, field, { required = false, multiline = false } = {}) => {
  const rawValue = payload[field] ?? '';
  if (typeof rawValue !== 'string') {
    return { error: `${field} must be a string.` };
  }

  const value = multiline ? rawValue.trim() : rawValue.replace(/\s+/g, ' ').trim();
  if (required && value === '') {
    return { error: `${field} is required.` };
  }
  if (value.length > FIELD_LIMITS[field]) {
    return { error: `${field} must be at most ${FIELD_LIMITS[field]} characters.` };
  }
  return { value };
};

const readSubmission = (payload) => {
  if (!isObject(payload)) {
    return { error: jsonError(400, 'Request body must be a JSON object.') };
  }

  const { requestType, turnstileToken } = payload;
  if (typeof requestType !== 'string' || !Object.hasOwn(REQUEST_TYPE_LABELS, requestType)) {
    return { error: jsonError(400, 'A valid requestType is required.') };
  }
  if (
    typeof turnstileToken !== 'string' ||
    turnstileToken === '' ||
    turnstileToken.length > MAX_TURNSTILE_TOKEN_LENGTH
  ) {
    return { error: jsonError(400, 'A valid turnstileToken is required.') };
  }

  const fields = {
    name: readTextField(payload, 'name'),
    email: readTextField(payload, 'email', { required: true }),
    subject: readTextField(payload, 'subject', { required: true }),
    pageUrl: readTextField(payload, 'pageUrl'),
    message: readTextField(payload, 'message', { required: true, multiline: true }),
    commitHash: readTextField(payload, 'commitHash'),
  };
  const fieldError = Object.values(fields).find((field) => field.error);
  if (fieldError) {
    return { error: jsonError(400, fieldError.error) };
  }
  if (!EMAIL_PATTERN.test(fields.email.value)) {
    return { error: jsonError(400, 'email must be a valid email address.') };
  }

  return {
    submission: {
      requestType,
      turnstileToken,
      name: fields.name.value,
      email: fields.email.value,
      subject: fields.subject.value,
      pageUrl: fields.pageUrl.value,
      message: fields.message.value,
      commitHash: fields.commitHash.value,
    },
  };
};

const verifyTurnstileToken = async (secret, token) => {
  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ secret, response: token }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Turnstile verification returned status ${response.status}.`);
  }
  return response.json();
};

const formatEmailText = (submission) =>
  [
    REQUEST_TYPE_LABELS[submission.requestType],
    '',
    `Name: ${submission.name || NOT_PROVIDED}`,
    `Email: ${submission.email}`,
    `URL: ${submission.pageUrl || NOT_PROVIDED}`,
    `Commit: ${submission.commitHash || NOT_PROVIDED}`,
    'Message:',
    '',
    submission.message,
  ].join('\n');

const sendEmail = (apiKey, submission) =>
  fetch(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: SENDER,
      to: [RECIPIENT],
      reply_to: submission.email,
      subject: `${SUBJECT_PREFIX} ${submission.subject}`,
      text: formatEmailText(submission),
    }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

export default async (request) => {
  if (request.method !== 'POST') {
    return jsonError(405, 'Method not allowed.', { allow: 'POST' });
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!turnstileSecret || !resendApiKey) {
    return jsonError(503, 'Contact form is not configured.');
  }

  const parsedRequest = await readJsonRequest(request);
  if (parsedRequest.error) return parsedRequest.error;

  const { submission, error } = readSubmission(parsedRequest.payload);
  if (error) return error;

  try {
    const verification = await verifyTurnstileToken(turnstileSecret, submission.turnstileToken);
    if (verification.success !== true) {
      console.warn('Turnstile verification failed:', verification['error-codes']);
      return jsonError(403, 'Human verification failed.');
    }

    const emailResponse = await sendEmail(resendApiKey, submission);
    if (!emailResponse.ok) {
      const emailError = await emailResponse.json().catch(() => ({}));
      console.error('Resend request failed:', emailResponse.status, emailError.name, emailError.message);
      return jsonError(502, 'Message could not be sent.');
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return jsonError(504, 'Contact request timed out.');
    }
    console.error('Contact request failed:', error);
    return jsonError(502, 'Message could not be sent.');
  }
};

export const config = {
  path: '/api/contact',
  rateLimit: {
    action: 'rate_limit',
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
