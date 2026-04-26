import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgWriter, makeDbWriter, type SqlClient } from '../src/writer';
import type { BlockContext } from '../src/sync';
import type { MoveEvent } from '../src/decode';

class InMemorySql implements SqlClient {
  exec_calls: { q: string; params: unknown[] }[] = [];
  rows: Record<string, unknown[]> = { last_height: [] };

  async exec(query: string, params: unknown[] = []): Promise<void> {
    this.exec_calls.push({ q: query, params });
  }
  async query<T>(query: string): Promise<T[]> {
    if (query.includes('FROM indexer_state')) {
      return this.rows.last_height as T[];
    }
    return [];
  }
}

const ctx: BlockContext = {
  blockHeight: 100n,
  blockTimeUnix: 1700000000n,
  txHash: 'TXABC',
  eventIndex: 0,
};

describe('PgWriter', () => {
  let sql: InMemorySql;
  let w: PgWriter;
  beforeEach(() => { sql = new InMemorySql(); w = new PgWriter(sql); });

  it('initialises last_height to 0 on first read', async () => {
    expect(await w.getLastHeight()).toBe(0n);
    expect(sql.exec_calls.some((c) => c.q.includes('INSERT INTO indexer_state'))).toBe(true);
  });

  it('reads existing last_height', async () => {
    sql.rows.last_height = [{ last_height: '42' }];
    expect(await w.getLastHeight()).toBe(42n);
  });

  it('updates last_height', async () => {
    await w.setLastHeight(123n);
    const c = sql.exec_calls[sql.exec_calls.length - 1];
    expect(c.q).toContain('UPDATE indexer_state');
    expect(c.params).toEqual(['123']);
  });

  it.each<[string, MoveEvent]>([
    ['CollectionCreated', { kind: 'CollectionCreated', id: 1n, artistAddr: 'init1a', name: 'X', symbol: 'X', defaultRoyaltyBps: 500, supplyCap: 10n }],
    ['CollectionCreated (no cap)', { kind: 'CollectionCreated', id: 2n, artistAddr: 'init1a', name: 'X', symbol: 'X', defaultRoyaltyBps: 0, supplyCap: null }],
    ['ArtworkMinted', { kind: 'ArtworkMinted', id: 1n, collectionId: 1n, editionNo: 1n, creator: 'init1a', contentHashHex: 'aa', title: 't' }],
    ['Gift', { kind: 'Gift', artworkId: 1n, from: 'init1a', to: 'init1b' }],
    ['ListingCreated', { kind: 'ListingCreated', id: 1n, artworkId: 1n, seller: 'init1a', priceUinit: 1n, expiresAt: 0n }],
    ['ListingCancelled', { kind: 'ListingCancelled', id: 1n }],
    ['BuyExecuted', { kind: 'BuyExecuted', listingId: 1n, buyer: 'init1c' }],
    ['OfferCreated', { kind: 'OfferCreated', id: 1n, artworkId: 1n, bidder: 'init1c', priceUinit: 1n, expiresAt: 0n }],
    ['OfferAccepted', { kind: 'OfferAccepted', id: 1n }],
    ['OfferCancelled', { kind: 'OfferCancelled', id: 1n }],
    ['AuctionCreated', { kind: 'AuctionCreated', id: 1n, artworkId: 1n, seller: 'init1a', reserveUinit: 1n, endsAt: 1n, minIncrementBps: 200, extensionSecs: 120 }],
    ['BidPlaced', { kind: 'BidPlaced', auctionId: 1n, bidder: 'init1c', amountUinit: 2n, newEndsAt: 1n }],
    ['AuctionFinalized (winner)', { kind: 'AuctionFinalized', auctionId: 1n, winner: 'init1c', finalPriceUinit: 2n }],
    ['AuctionFinalized (no_bids)', { kind: 'AuctionFinalized', auctionId: 1n, winner: null, finalPriceUinit: 0n }],
    ['Settlement (listing)', { kind: 'Settlement', artworkId: 1n, source: 'listing', sourceId: 1n, buyer: 'init1c', seller: 'init1a', artistAddr: 'init1a', grossUinit: 100n, royaltyUinit: 5n, protocolFeeUinit: 1n, sellerNetUinit: 94n }],
    ['Settlement (auction)', { kind: 'Settlement', artworkId: 1n, source: 'auction', sourceId: 1n, buyer: 'init1c', seller: 'init1a', artistAddr: 'init1a', grossUinit: 100n, royaltyUinit: 5n, protocolFeeUinit: 1n, sellerNetUinit: 94n }],
    ['Settlement (offer)', { kind: 'Settlement', artworkId: 1n, source: 'offer', sourceId: 1n, buyer: 'init1c', seller: 'init1a', artistAddr: 'init1a', grossUinit: 100n, royaltyUinit: 5n, protocolFeeUinit: 1n, sellerNetUinit: 94n }],
  ])('writes %s', async (_label, ev) => {
    sql.exec_calls = [];
    await w.writeEvent(ev, ctx);
    expect(sql.exec_calls.length).toBeGreaterThan(0);
  });
});

describe('makeDbWriter', () => {
  it('throws when DATABASE_URL is not set', async () => {
    const orig = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    await expect(makeDbWriter()).rejects.toThrow(/DATABASE_URL/);
    if (orig !== undefined) process.env.DATABASE_URL = orig;
  });

  it('constructs a writer when DATABASE_URL is set', async () => {
    vi.doMock('pg', () => {
      class Pool {
        constructor(_opts: unknown) {}
        async query() { return { rows: [] }; }
      }
      return { default: { Pool }, Pool };
    });
    process.env.DATABASE_URL = 'postgres://test';
    const writer = await makeDbWriter();
    expect(writer).toBeDefined();
    expect(typeof writer.getLastHeight).toBe('function');
    vi.doUnmock('pg');
  });

  // Cover the SqlClient.exec and SqlClient.query closures that makeDbWriter
  // constructs around the pg Pool. The previous test constructs the writer
  // but never invokes the Sql adapter; this one drives a full round-trip.
  it('returned writer.getLastHeight invokes the pg-backed SqlClient query', async () => {
    let queryCalls = 0;
    vi.resetModules();
    vi.doMock('pg', () => {
      class Pool {
        constructor(_opts: unknown) {}
        async query(_q: string, _p?: unknown[]) {
          queryCalls++;
          // First call is getLastHeight → rows length 0 → the writer should
          // INSERT and return 0n. The INSERT is a second pool.query call.
          return { rows: [] };
        }
        async end() {}
      }
      return { default: { Pool }, Pool };
    });
    process.env.DATABASE_URL = 'postgres://test';
    const { makeDbWriter: makeDbWriter2 } = await import('../src/writer');
    const writer = await makeDbWriter2();
    const h = await writer.getLastHeight();
    expect(h).toBe(0n);
    expect(queryCalls).toBeGreaterThanOrEqual(2);
    vi.doUnmock('pg');
    vi.resetModules();
  });
});
