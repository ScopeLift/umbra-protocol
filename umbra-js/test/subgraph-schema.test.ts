import { expect } from 'chai';
import { Umbra } from '../src/classes/Umbra';
import { getMostRecentSubgraphStealthKeyChangedEventFromAddress } from '../src/utils/utils';
import type { ChainConfig, SubgraphAnnouncement } from '../src/types';

type MockGraphQlPayload = {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string }>;
};

const umbraAddress = '0xFb2dc580Eed955B528407b4d36FfaFe3da685401';

const makeChainConfig = (subgraphUrl: string, chainId = 1): ChainConfig => ({
  chainId,
  umbraAddress,
  batchSendAddress: null,
  startBlock: 1,
  subgraphUrl,
});

const makeResponse = (payload: MockGraphQlPayload) =>
  ({
    ok: true,
    json: async () => payload,
  } as Response);

async function collectPages<T>(generator: AsyncGenerator<T[]>): Promise<T[][]> {
  const pages: T[][] = [];
  for await (const page of generator) {
    pages.push(page);
  }
  return pages;
}

describe('Subgraph schema compatibility', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches announcement pages from a Ponder endpoint', async () => {
    const url = 'https://ponder-announcements.local/graphql';
    const calls: string[] = [];

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query: string };
      calls.push(body.query);

      if (calls.length === 1) {
        return makeResponse({
          data: {
            announcements: {
              items: [
                {
                  id: 'announcement-2',
                  amount: '10',
                  blockNumber: '200',
                  ciphertext: '0x02',
                  from: '0xfrom2',
                  pkx: '0xpkx2',
                  receiver: '0xreceiver2',
                  timestamp: '2000',
                  token: '0xtoken2',
                  txHash: '0xtx2',
                },
              ],
              pageInfo: {
                hasNextPage: true,
                endCursor: 'cursor-1',
              },
            },
          },
        });
      }

      return makeResponse({
        data: {
          announcements: {
            items: [
              {
                id: 'announcement-1',
                amount: '5',
                blockNumber: '150',
                ciphertext: '0x01',
                from: '0xfrom1',
                pkx: '0xpkx1',
                receiver: '0xreceiver1',
                timestamp: '1500',
                token: '0xtoken1',
                txHash: '0xtx1',
              },
            ],
            pageInfo: {
              hasNextPage: false,
              endCursor: null,
            },
          },
        },
      });
    }) as typeof fetch;

    const fetchAnnouncements = Umbra.prototype.fetchAllAnnouncementsFromSubgraph as (
      this: { chainConfig: ChainConfig },
      startBlock: string | number,
      endBlock: string | number
    ) => AsyncGenerator<SubgraphAnnouncement[]>;

    const pages = await collectPages(fetchAnnouncements.call({ chainConfig: makeChainConfig(url) }, 100, 200));

    expect(calls).to.have.lengthOf(2);
    expect(calls[0]).to.include('announcements(');
    expect(calls[0]).to.include('network: "mainnet"');
    expect(calls[0]).to.include('blockNumber_gte: "100"');
    expect(calls[0]).to.include('blockNumber_lte: "200"');
    expect(calls[0]).to.include('orderBy: "blockNumber"');
    expect(calls[0]).to.include('orderDirection: "desc"');
    expect(calls[0]).to.include('limit: 1000');
    expect(calls[1]).to.include('after: "cursor-1"');
    expect(pages).to.deep.equal([
      [
        {
          id: 'announcement-2',
          amount: '10',
          block: '200',
          ciphertext: '0x02',
          from: '0xfrom2',
          pkx: '0xpkx2',
          receiver: '0xreceiver2',
          timestamp: '2000',
          token: '0xtoken2',
          txHash: '0xtx2',
        },
      ],
      [
        {
          id: 'announcement-1',
          amount: '5',
          block: '150',
          ciphertext: '0x01',
          from: '0xfrom1',
          pkx: '0xpkx1',
          receiver: '0xreceiver1',
          timestamp: '1500',
          token: '0xtoken1',
          txHash: '0xtx1',
        },
      ],
    ]);
  });

  it('falls back to the legacy subgraph schema and caches that choice', async () => {
    const url = 'https://legacy-announcements.local/graphql';
    const fetchAnnouncements = Umbra.prototype.fetchAllAnnouncementsFromSubgraph as (
      this: { chainConfig: ChainConfig },
      startBlock: string | number,
      endBlock: string | number
    ) => AsyncGenerator<SubgraphAnnouncement[]>;

    const firstCallQueries: string[] = [];
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query: string };
      firstCallQueries.push(body.query);

      if (firstCallQueries.length === 1) {
        return makeResponse({
          errors: [{ message: 'Cannot query field "announcements" on type "Query".' }],
        });
      }

      if (body.query.includes('id_lt:')) {
        return makeResponse({
          data: {
            announcementEntities: [],
          },
        });
      }

      return makeResponse({
        data: {
          announcementEntities: [
            {
              id: 'legacy-announcement',
              amount: '1',
              block: '99',
              ciphertext: '0xlegacy',
              from: '0xlegacyfrom',
              pkx: '0xlegacypkx',
              receiver: '0xlegacyreceiver',
              timestamp: '999',
              token: '0xlegacytoken',
              txHash: '0xlegacytx',
            },
          ],
        },
      });
    }) as typeof fetch;

    const firstPages = await collectPages(fetchAnnouncements.call({ chainConfig: makeChainConfig(url) }, 10, 99));

    expect(firstCallQueries).to.have.lengthOf(3);
    expect(firstCallQueries[0]).to.include('announcements(');
    expect(firstCallQueries[1]).to.include('announcementEntities(');
    expect(firstCallQueries[2]).to.include('announcementEntities(');
    expect(firstCallQueries[2]).to.include('id_lt:');
    expect(firstPages).to.deep.equal([
      [
        {
          id: 'legacy-announcement',
          amount: '1',
          block: '99',
          ciphertext: '0xlegacy',
          from: '0xlegacyfrom',
          pkx: '0xlegacypkx',
          receiver: '0xlegacyreceiver',
          timestamp: '999',
          token: '0xlegacytoken',
          txHash: '0xlegacytx',
        },
      ],
    ]);

    const cachedQueries: string[] = [];
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query: string };
      cachedQueries.push(body.query);

      return makeResponse({
        data: {
          announcementEntities: [],
        },
      });
    }) as typeof fetch;

    await collectPages(fetchAnnouncements.call({ chainConfig: makeChainConfig(url) }, 10, 99));

    expect(cachedQueries).to.have.lengthOf(1);
    expect(cachedQueries[0]).to.include('announcementEntities(');
    expect(cachedQueries[0]).to.not.include('announcements(');
  });

  it('fetches the most recent stealth key event from a Ponder endpoint', async () => {
    const url = 'https://ponder-stealth.local/graphql';
    const address = '0xAbCd000000000000000000000000000000000000';
    const queries: string[] = [];

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query: string };
      queries.push(body.query);

      return makeResponse({
        data: {
          stealthKeyChanges: {
            items: [
              {
                id: 'stealth-2',
                blockNumber: '200',
                from: '0xfrom2',
                registrant: address.toLowerCase(),
                spendingPubKey: '11',
                spendingPubKeyPrefix: '2',
                timestamp: '2000',
                txHash: '0xtx2',
                viewingPubKey: '22',
                viewingPubKeyPrefix: '3',
              },
              {
                id: 'stealth-1',
                blockNumber: '150',
                from: '0xfrom1',
                registrant: address.toLowerCase(),
                spendingPubKey: '10',
                spendingPubKeyPrefix: '2',
                timestamp: '1500',
                txHash: '0xtx1',
                viewingPubKey: '20',
                viewingPubKeyPrefix: '3',
              },
            ],
            pageInfo: {
              hasNextPage: false,
              endCursor: null,
            },
          },
        },
      });
    }) as typeof fetch;

    const event = await getMostRecentSubgraphStealthKeyChangedEventFromAddress(address, makeChainConfig(url, 11155111));

    expect(queries).to.have.lengthOf(1);
    expect(queries[0]).to.include('stealthKeyChanges(');
    expect(queries[0]).to.include('network: "sepolia"');
    expect(queries[0]).to.include(`registrant: "${address.toLowerCase()}"`);
    expect(event.block).to.equal('200');
    expect(event.spendingPubKey.toString()).to.equal('11');
    expect(event.spendingPubKeyPrefix.toString()).to.equal('2');
    expect(event.viewingPubKey.toString()).to.equal('22');
    expect(event.viewingPubKeyPrefix.toString()).to.equal('3');
  });
});
