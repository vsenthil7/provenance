/**
 * Postgres writer for decoded Move events. Idempotency keyed on
 * (tx_hash, event_index) via UNIQUE indices in the schema; this means
 * re-processing a block (e.g. after a crash) is safe.
 *
 * In production this hooks into Ponder's `db` API. For unit testing we
 * accept an injectable `db` interface and provide an in-memory implementation
 * in test/fakes.ts.
 */

import { Pool } from 'pg';
import type { DbWriter, BlockContext } from './sync';
import type { MoveEvent } from './decode';

export interface SqlClient {
  exec(query: string, params?: unknown[]): Promise<void>;
  query<T = unknown>(query: string, params?: unknown[]): Promise<T[]>;
}

export class PgWriter implements DbWriter {
  constructor(private sql: SqlClient) {}

  async getLastHeight(): Promise<bigint> {
    const rows = await this.sql.query<{ last_height: string }>(
      `SELECT last_height FROM indexer_state WHERE id = 1`,
    );
    if (rows.length === 0) {
      await this.sql.exec(`INSERT INTO indexer_state (id, last_height) VALUES (1, 0)`);
      return 0n;
    }
    return BigInt(rows[0].last_height);
  }

  async setLastHeight(h: bigint): Promise<void> {
    await this.sql.exec(`UPDATE indexer_state SET last_height = $1 WHERE id = 1`, [h.toString()]);
  }

  async writeEvent(ev: MoveEvent, ctx: BlockContext): Promise<void> {
    switch (ev.kind) {
      case 'CollectionCreated':
        await this.sql.exec(
          `INSERT INTO collections
             (id, object_addr, artist_addr, name, symbol, default_royalty_bps,
              supply_cap, minted, metadata_uri, frozen, created_at, block_height, tx_hash)
           VALUES ($1,$2,$3,$4,$5,$6,$7,0,'',false,$8,$9,$10)
           ON CONFLICT (id) DO NOTHING`,
          [
            ev.id.toString(), '', ev.artistAddr, ev.name, ev.symbol,
            ev.defaultRoyaltyBps, ev.supplyCap?.toString() ?? null,
            ctx.blockTimeUnix.toString(), ctx.blockHeight.toString(), ctx.txHash,
          ],
        );
        return;

      case 'ArtworkMinted':
        await this.sql.exec(
          `INSERT INTO artworks
             (id, object_addr, collection_id, edition_no, title, content_hash,
              image_uri, royalty_bps, creator_addr, current_owner, minted_at,
              block_height, tx_hash)
           VALUES ($1,'',$2,$3,$4,$5,'',0,$6,$6,$7,$8,$9)
           ON CONFLICT (id) DO NOTHING`,
          [
            ev.id.toString(), ev.collectionId.toString(), ev.editionNo.toString(),
            ev.title, ev.contentHashHex, ev.creator,
            ctx.blockTimeUnix.toString(), ctx.blockHeight.toString(), ctx.txHash,
          ],
        );
        return;

      case 'Gift':
        await this.sql.exec(
          `UPDATE artworks SET current_owner = $2 WHERE id = $1`,
          [ev.artworkId.toString(), ev.to],
        );
        await this.sql.exec(
          `INSERT INTO transfers (id, artwork_id, from_addr, to_addr, kind, occurred_at, block_height, tx_hash)
           VALUES ($1,$2,$3,$4,'gift',$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          [
            `${ctx.txHash}:${ctx.eventIndex}`, ev.artworkId.toString(),
            ev.from, ev.to, ctx.blockTimeUnix.toString(),
            ctx.blockHeight.toString(), ctx.txHash,
          ],
        );
        return;

      case 'ListingCreated':
        await this.sql.exec(
          `INSERT INTO listings
             (id, object_addr, artwork_id, seller_addr, price_uinit, expires_at,
              status, created_at, block_height, tx_hash)
           VALUES ($1,'',$2,$3,$4,$5,'active',$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [
            ev.id.toString(), ev.artworkId.toString(), ev.seller,
            ev.priceUinit.toString(), ev.expiresAt.toString(),
            ctx.blockTimeUnix.toString(), ctx.blockHeight.toString(), ctx.txHash,
          ],
        );
        return;

      case 'ListingCancelled':
        await this.sql.exec(
          `UPDATE listings SET status='cancelled', closed_at=$2 WHERE id=$1`,
          [ev.id.toString(), ctx.blockTimeUnix.toString()],
        );
        return;

      case 'BuyExecuted':
        await this.sql.exec(
          `UPDATE listings SET status='sold', closed_at=$2 WHERE id=$1`,
          [ev.listingId.toString(), ctx.blockTimeUnix.toString()],
        );
        return;

      case 'OfferCreated':
        await this.sql.exec(
          `INSERT INTO offers
             (id, object_addr, artwork_id, bidder_addr, price_uinit, expires_at,
              status, created_at, block_height, tx_hash)
           VALUES ($1,'',$2,$3,$4,$5,'open',$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [
            ev.id.toString(), ev.artworkId.toString(), ev.bidder,
            ev.priceUinit.toString(), ev.expiresAt.toString(),
            ctx.blockTimeUnix.toString(), ctx.blockHeight.toString(), ctx.txHash,
          ],
        );
        return;

      case 'OfferAccepted':
        await this.sql.exec(
          `UPDATE offers SET status='accepted', closed_at=$2 WHERE id=$1`,
          [ev.id.toString(), ctx.blockTimeUnix.toString()],
        );
        return;

      case 'OfferCancelled':
        await this.sql.exec(
          `UPDATE offers SET status='cancelled', closed_at=$2 WHERE id=$1`,
          [ev.id.toString(), ctx.blockTimeUnix.toString()],
        );
        return;

      case 'AuctionCreated':
        await this.sql.exec(
          `INSERT INTO auctions
             (id, object_addr, artwork_id, seller_addr, reserve_uinit,
              current_bid_uinit, min_increment_bps, ends_at, extension_secs,
              status, created_at, block_height, tx_hash)
           VALUES ($1,'',$2,$3,$4,0,$5,$6,$7,'live',$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
          [
            ev.id.toString(), ev.artworkId.toString(), ev.seller,
            ev.reserveUinit.toString(), ev.minIncrementBps,
            ev.endsAt.toString(), ev.extensionSecs,
            ctx.blockTimeUnix.toString(), ctx.blockHeight.toString(), ctx.txHash,
          ],
        );
        return;

      case 'BidPlaced':
        await this.sql.exec(
          `INSERT INTO bids (auction_id, bidder_addr, amount_uinit, placed_at, block_height, tx_hash)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            ev.auctionId.toString(), ev.bidder, ev.amountUinit.toString(),
            ctx.blockTimeUnix.toString(), ctx.blockHeight.toString(), ctx.txHash,
          ],
        );
        await this.sql.exec(
          `UPDATE auctions
              SET current_bid_uinit=$2, current_bidder=$3, ends_at=$4
            WHERE id=$1`,
          [ev.auctionId.toString(), ev.amountUinit.toString(), ev.bidder, ev.newEndsAt.toString()],
        );
        return;

      case 'AuctionFinalized':
        await this.sql.exec(
          `UPDATE auctions
              SET status=$2, finalized_at=$3
            WHERE id=$1`,
          [
            ev.auctionId.toString(),
            ev.winner === null ? 'no_bids' : 'finalized',
            ctx.blockTimeUnix.toString(),
          ],
        );
        return;

      case 'Settlement':
        await this.sql.exec(
          `INSERT INTO settlements
             (artwork_id, source, source_id, buyer_addr, seller_addr,
              artist_addr, gross_uinit, royalty_uinit, protocol_fee_uinit,
              seller_net_uinit, settled_at, block_height, tx_hash)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            ev.artworkId.toString(), ev.source, ev.sourceId.toString(),
            ev.buyer, ev.seller, ev.artistAddr,
            ev.grossUinit.toString(), ev.royaltyUinit.toString(),
            ev.protocolFeeUinit.toString(), ev.sellerNetUinit.toString(),
            ctx.blockTimeUnix.toString(), ctx.blockHeight.toString(), ctx.txHash,
          ],
        );
        await this.sql.exec(
          `UPDATE artworks SET current_owner=$2 WHERE id=$1`,
          [ev.artworkId.toString(), ev.buyer],
        );
        await this.sql.exec(
          `INSERT INTO transfers (id, artwork_id, from_addr, to_addr, kind, occurred_at, block_height, tx_hash)
           VALUES ($1,$2,$3,$4,'settle',$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          [
            `${ctx.txHash}:${ctx.eventIndex}`, ev.artworkId.toString(),
            ev.seller, ev.buyer, ctx.blockTimeUnix.toString(),
            ctx.blockHeight.toString(), ctx.txHash,
          ],
        );
        return;
    }
  }
}

export async function makeDbWriter(): Promise<DbWriter> {
  // In production this constructs a Postgres pool. For the scaffold we
  // require DATABASE_URL and let the build catch the absence at deploy time.
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const pool = new Pool({ connectionString: url });
  const sql: SqlClient = {
    exec: async (q, p) => { await pool.query(q, p ?? []); },
    query: async (q, p) => (await pool.query(q, p ?? [])).rows as never[],
  };
  return new PgWriter(sql);
}
