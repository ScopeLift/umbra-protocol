import * as fs from 'fs';
import * as path from 'path';

/**
 * Build-time guard for subgraph configuration.
 *
 * Receive scans need a subgraph URL on Optimism, Polygon, and Base because the RPC log
 * fallback throws on those chains (see umbra-js Umbra.fetchAllAnnouncementFromLogs). A build
 * with no usable URL would ship a bundle whose L2 scans always fail, so we fail the build
 * instead: either PONDER_SUBGRAPH_URL or the legacy per-chain URL must be set for each of
 * those chains.
 *
 * Reads process.env first (CI/deploy providers), then falls back to the local .env file.
 */

const REQUIRED_LEGACY_VARS = ['OPTIMISM_SUBGRAPH_URL', 'POLYGON_SUBGRAPH_URL', 'BASE_SUBGRAPH_URL'];

type SubgraphEnvStatus =
  | {
      ok: true;
      message: string;
      missing: [];
    }
  | {
      ok: false;
      message: string;
      missing: string[];
    };

function readDotEnv(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const vars: Record<string, string> = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    vars[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return vars;
}

const dotEnv = readDotEnv(path.join(__dirname, '..', '.env'));

// Also used by quasar.conf.js, where .env may not be loaded into process.env yet.
export const getEnv = (name: string): string => (process.env[name] || dotEnv[name] || '').trim();

export function getSubgraphEnvStatus(): SubgraphEnvStatus {
  if (getEnv('PONDER_SUBGRAPH_URL')) {
    return {
      ok: true,
      message: 'Subgraph check passed: PONDER_SUBGRAPH_URL is configured.',
      missing: [],
    };
  }

  const missing = REQUIRED_LEGACY_VARS.filter((name) => !getEnv(name));
  if (missing.length === 0) {
    return {
      ok: true,
      message: 'Subgraph check passed: PONDER_SUBGRAPH_URL is not set, using legacy per-chain subgraph URLs.',
      missing: [],
    };
  }

  return {
    ok: false,
    message:
      'Subgraph check failed: no usable subgraph URL for Optimism/Polygon/Base receive scans.\n' +
      'Set PONDER_SUBGRAPH_URL, or set the legacy per-chain URLs. Missing:\n' +
      missing.map((name) => `  - ${name}`).join('\n') +
      '\nWithout one of these, L2 receive scans fall back to RPC logs and throw at runtime.',
    missing,
  };
}

export function assertSubgraphEnv(): SubgraphEnvStatus {
  const status = getSubgraphEnvStatus();
  if (!status.ok) throw new Error(status.message);
  return status;
}

if (require.main === module) {
  const status = getSubgraphEnvStatus();
  if (status.ok) {
    console.log(status.message);
    process.exit(0);
  }

  console.error(status.message);
  process.exit(1);
}
