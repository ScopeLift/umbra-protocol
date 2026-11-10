// Runs the client-error Netlify function on requests read from stdin, and prints each response and the lines the
// function logged. Jest can't import ES modules, so test/error-reporting.test.ts runs this script with Node.
//
// Input: a JSON array of { url, method, headers, body }. Output: a JSON array of { status, allow, body, logs }.
import handler from '../../netlify/functions/client-error.mjs';

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

const requests = JSON.parse(await readStdin());
const results = [];
const log = console.log;

for (const { url, method, headers, body } of requests) {
  const logs = [];
  console.log = (...args) => logs.push(args.join(' '));
  try {
    const response = await handler(new Request(url, { method, headers, body }));
    results.push({
      status: response.status,
      allow: response.headers.get('allow'),
      body: await response.text(),
      logs,
    });
  } finally {
    console.log = log;
  }
}

process.stdout.write(JSON.stringify(results));
