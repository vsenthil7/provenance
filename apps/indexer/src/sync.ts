/**
 * Custom Move event poller.
 *
 * Polls the provenance-1 RPC's `/cosmos/tx/v1beta1/txs/block/{height}`
 * endpoint, extracts events emitted by `provenance::*` modules, and writes
 * them to the indexer Postgres via the schema in ponder.schema.ts.
 *
 * The cursor lives in `indexer_state.last_height`. Block ordering is
 * guaranteed by Tendermint, so we process sequentially with no out-of-order
 * handling.
 */

import { decodeMoveEvent } from './decode';
import type { MoveEvent } from './decode';

const PROVENANCE_PACKAGE = process.env.PROVENANCE_PACKAGE_ADDRESS ?? '';
const RPC = process.env.PROVENANCE_RPC ?? 'https://rpc.provenance-1.initia.xyz';
const POLL_INTERVAL_MS = 1500;

export interface DbWriter {
  writeEvent(ev: MoveEvent, ctx: BlockContext): Promise<void>;
  getLastHeight(): Promise<bigint>;
  setLastHeight(h: bigint): Promise<void>;
}

export interface BlockContext {
  blockHeight: bigint;
  blockTimeUnix: bigint;
  txHash: string;
  eventIndex: number;
}

export async function fetchLatestHeight(): Promise<bigint> {
  const r = await fetch(`${RPC}/status`);
  if (!r.ok) throw new Error(`status ${r.status}`);
  const j = (await r.json()) as {
    result?: { sync_info?: { latest_block_height?: string } };
  };
  return BigInt(j.result?.sync_info?.latest_block_height ?? '0');
}

export async function fetchBlockEvents(height: bigint): Promise<{ ctx: BlockContext; events: MoveEvent[] }[]> {
  const r = await fetch(`${RPC}/cosmos/tx/v1beta1/txs/block/${height}`);
  if (!r.ok) {
    if (r.status === 404) return []; // block not yet present
    throw new Error(`block ${height}: ${r.status}`);
  }
  const j = (await r.json()) as {
    txs?: { hash: string }[];
    tx_responses?: { txhash?: string; events?: { type: string; attributes: { key: string; value: string }[] }[]; timestamp?: string }[];
  };

  const out: { ctx: BlockContext; events: MoveEvent[] }[] = [];
  const txs = j.tx_responses ?? [];
  for (const tx of txs) {
    const txHash = tx.txhash ?? '';
    const blockTimeUnix = tx.timestamp ? BigInt(Math.floor(new Date(tx.timestamp).getTime() / 1000)) : 0n;
    const events = (tx.events ?? [])
      .map((e, i) => ({ raw: e, eventIndex: i }))
      .filter(({ raw }) => raw.type.startsWith(`${PROVENANCE_PACKAGE}::`))
      .map(({ raw, eventIndex }) => ({
        ctx: { blockHeight: height, blockTimeUnix, txHash, eventIndex } as BlockContext,
        ev: decodeMoveEvent(raw),
      }))
      .filter((x): x is { ctx: BlockContext; ev: MoveEvent } => x.ev !== null);
    for (const { ctx, ev } of events) {
      out.push({ ctx, events: [ev] });
    }
  }
  return out;
}

export async function syncOnce(db: DbWriter): Promise<{ blocksProcessed: number; lagBlocks: bigint }> {
  const last = await db.getLastHeight();
  const tip = await fetchLatestHeight();
  if (tip <= last) return { blocksProcessed: 0, lagBlocks: 0n };
  let processed = 0;
  // Process up to 50 blocks per tick to bound work and keep latency low.
  const cap = last + 50n;
  const target = tip < cap ? tip : cap;
  for (let h = last + 1n; h <= target; h++) {
    const items = await fetchBlockEvents(h);
    for (const { ctx, events } of items) {
      for (const ev of events) {
        await db.writeEvent(ev, ctx);
      }
    }
    await db.setLastHeight(h);
    processed++;
  }
  return { blocksProcessed: processed, lagBlocks: tip - target };
}

export async function startPolling(db: DbWriter, signal?: AbortSignal): Promise<void> {
  while (!signal?.aborted) {
    try {
      const { blocksProcessed, lagBlocks } = await syncOnce(db);
      if (blocksProcessed > 0 || lagBlocks > 0n) {
        console.log(`[sync] processed=${blocksProcessed} lag=${lagBlocks}`);
      }
    } catch (e) {
      console.error('[sync] error', (e as Error).message);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}
