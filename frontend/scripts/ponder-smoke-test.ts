/**
 * Smoke test for a deployed (preview or prod) frontend bundle.
 *
 * 1. Fetches the deployment's index.html and reads the Ponder subgraph URL that the build
 *    stamps into the `umbra:ponder-subgraph-url` meta tag (see quasar.conf.js). If
 *    PONDER_SUBGRAPH_URL is set in the environment, the stamped URL must match it exactly.
 * 2. Verifies the URL is also inlined into one of the JS bundles the page loads.
 * 3. Resolves the stamped path against the deployment URL, then runs a basic Ponder
 *    announcements scan and verifies it succeeds.
 *
 * Usage:
 *   yarn smoke-test:ponder <deployment-url>
 *   PONDER_SUBGRAPH_URL=/api/ponder yarn smoke-test:ponder https://deploy-preview.example.com
 *
 * Exits non-zero on any failure so it can gate CI on preview/prod deploys.
 */

const META_NAME = 'umbra:ponder-subgraph-url';

const SCAN_QUERY = `{
  announcements(
    where: { network: "mainnet" }
    orderBy: "blockNumber"
    orderDirection: "desc"
    limit: 5
  ) {
    items {
      id
      receiver
      blockNumber
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

type GraphQlError = {
  message: string;
};

type PonderScanPayload = {
  data?: {
    announcements?: {
      items?: unknown;
    };
  };
  errors?: GraphQlError[];
};

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'user-agent': 'umbra-ponder-smoke-test' } });
  if (!response.ok) throw new Error(`GET ${url} returned ${response.status}`);
  return response.text();
}

// The production HTML minifier strips attribute quotes, so match quoted and unquoted values.
const attrValue = (tag: string, name: string): string | undefined => {
  const match = tag.match(new RegExp(`${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]*))`));
  return match ? match[1] ?? match[2] ?? match[3] : undefined;
};

function getStampedPonderUrl(html: string): string | undefined {
  for (const [tag] of html.matchAll(/<meta[^>]*>/g)) {
    if (attrValue(tag, 'name') === META_NAME) return (attrValue(tag, 'content') || '').trim();
  }
  return undefined;
}

async function main(): Promise<void> {
  const deploymentUrl = process.argv[2];
  if (!deploymentUrl) {
    fail('Usage: yarn smoke-test:ponder <deployment-url>');
  }

  const html = await fetchText(deploymentUrl);

  const ponderUrl = getStampedPonderUrl(html);
  if (ponderUrl === undefined) {
    throw new Error(
      `No <meta name="${META_NAME}"> tag found in ${deploymentUrl}. ` +
        'The deployment predates the smoke-test stamp in src/index.template.html.'
    );
  }
  if (!ponderUrl) {
    throw new Error('The deployed build was produced without PONDER_SUBGRAPH_URL (its meta tag is empty).');
  }
  const expected = (process.env.PONDER_SUBGRAPH_URL || '').trim();
  if (expected && expected !== ponderUrl) {
    throw new Error(`Deployed Ponder URL (${ponderUrl}) does not match expected PONDER_SUBGRAPH_URL (${expected}).`);
  }
  console.log(`Deployed build is stamped with Ponder URL ${ponderUrl}`);

  const ponderEndpoint = new URL(ponderUrl, deploymentUrl).href;

  const scriptSrcs = [...html.matchAll(/<script[^>]*>/g)]
    .map(([tag]) => attrValue(tag, 'src'))
    .filter((src): src is string => src !== undefined);
  if (scriptSrcs.length === 0) throw new Error(`No <script src> tags found in ${deploymentUrl}`);
  let foundInBundle = false;
  for (const src of scriptSrcs) {
    const bundleUrl = new URL(src, deploymentUrl).href;
    if ((await fetchText(bundleUrl)).includes(ponderUrl)) {
      console.log(`Found Ponder URL inlined in bundle ${bundleUrl}`);
      foundInBundle = true;
      break;
    }
  }
  if (!foundInBundle) {
    throw new Error(`Ponder URL ${ponderUrl} is not inlined in any of the ${scriptSrcs.length} JS bundle(s).`);
  }

  const response = await fetch(ponderEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: SCAN_QUERY }),
  });
  if (!response.ok) throw new Error(`Ponder scan POST ${ponderEndpoint} returned ${response.status}`);
  const payload = (await response.json()) as PonderScanPayload;
  if (payload.errors && payload.errors.length) {
    throw new Error(`Ponder scan returned errors: ${payload.errors.map((e) => e.message).join('; ')}`);
  }
  const items = payload.data && payload.data.announcements && payload.data.announcements.items;
  if (!Array.isArray(items)) {
    throw new Error(`Ponder scan response missing announcements.items: ${JSON.stringify(payload).slice(0, 500)}`);
  }
  console.log(`Ponder scan succeeded: received ${items.length} mainnet announcement(s).`);
  if (items.length === 0) {
    console.warn('WARN: scan returned zero announcements; the Ponder instance may still be indexing.');
  }

  console.log('PASS: deployed bundle has a Ponder URL and a basic Ponder scan succeeds.');
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
