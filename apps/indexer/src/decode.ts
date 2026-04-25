/**
 * Decode raw Tendermint events from a Move tx into typed records.
 *
 * Initia surfaces Move events as Tendermint events with `type` set to the
 * fully-qualified Move struct name (e.g. `init1xyz::auction::BidPlacedEvent`)
 * and `attributes` holding the field values as base64-encoded strings.
 */

import { Buffer } from 'node:buffer';

export type MoveEvent =
  | CollectionCreated
  | ArtworkMinted
  | GiftEvent
  | ListingCreated
  | ListingCancelled
  | BuyExecuted
  | OfferCreated
  | OfferAccepted
  | OfferCancelled
  | AuctionCreated
  | BidPlaced
  | AuctionFinalized
  | SettlementEvent;

export interface CollectionCreated {
  kind: 'CollectionCreated';
  id: bigint;
  artistAddr: string;
  name: string;
  symbol: string;
  defaultRoyaltyBps: number;
  supplyCap: bigint | null;
}

export interface ArtworkMinted {
  kind: 'ArtworkMinted';
  id: bigint;
  collectionId: bigint;
  editionNo: bigint;
  creator: string;
  contentHashHex: string;
  title: string;
}

export interface GiftEvent {
  kind: 'Gift';
  artworkId: bigint;
  from: string;
  to: string;
}

export interface ListingCreated {
  kind: 'ListingCreated';
  id: bigint;
  artworkId: bigint;
  seller: string;
  priceUinit: bigint;
  expiresAt: bigint;
}

export interface ListingCancelled { kind: 'ListingCancelled'; id: bigint }
export interface BuyExecuted { kind: 'BuyExecuted'; listingId: bigint; buyer: string }

export interface OfferCreated {
  kind: 'OfferCreated';
  id: bigint;
  artworkId: bigint;
  bidder: string;
  priceUinit: bigint;
  expiresAt: bigint;
}
export interface OfferAccepted { kind: 'OfferAccepted'; id: bigint }
export interface OfferCancelled { kind: 'OfferCancelled'; id: bigint }

export interface AuctionCreated {
  kind: 'AuctionCreated';
  id: bigint;
  artworkId: bigint;
  seller: string;
  reserveUinit: bigint;
  endsAt: bigint;
  minIncrementBps: number;
  extensionSecs: number;
}

export interface BidPlaced {
  kind: 'BidPlaced';
  auctionId: bigint;
  bidder: string;
  amountUinit: bigint;
  newEndsAt: bigint;
}

export interface AuctionFinalized {
  kind: 'AuctionFinalized';
  auctionId: bigint;
  winner: string | null;
  finalPriceUinit: bigint;
}

export interface SettlementEvent {
  kind: 'Settlement';
  artworkId: bigint;
  source: 'listing' | 'auction' | 'offer';
  sourceId: bigint;
  buyer: string;
  seller: string;
  artistAddr: string;
  grossUinit: bigint;
  royaltyUinit: bigint;
  protocolFeeUinit: bigint;
  sellerNetUinit: bigint;
}

interface RawEvent {
  type: string;
  attributes: { key: string; value: string }[];
}

function attrs(e: RawEvent): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of e.attributes) {
    // Tendermint events: keys/values may already be UTF-8 in newer cosmos-sdk;
    // older versions emit base64. Try to decode but fall through if it's plain.
    out[decode(a.key)] = decode(a.value);
  }
  return out;
}

function decode(s: string): string {
  // Plain numeric strings are never base64-encoded payloads — they are uint
  // attribute values emitted by Move events. Short-circuiting here prevents
  // strings like '5000' (length divisible by 4, all base64-alphabet chars)
  // from being garbled into binary by Buffer.from(s, 'base64').
  if (/^\d+$/.test(s)) return s;
  // Heuristic for base64: A-Z, a-z, 0-9, +, /, optional '=' padding, length % 4 === 0,
  // and the round-tripped decode→encode reproduces the input exactly. This rejects
  // strings that happen to use base64 alphabet but aren't valid base64 payloads.
  if (s.length > 0 && s.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(s)) {
    try {
      const buf = Buffer.from(s, 'base64');
      const reencoded = buf.toString('base64');
      // strict round-trip check: only accept if encode(decode(s)) === s exactly
      if (reencoded === s) {
        const utf8 = buf.toString('utf8');
        // additionally require the decoded UTF-8 to not contain replacement chars
        // (U+FFFD) which Node emits when encountering invalid UTF-8 sequences.
        if (!utf8.includes('\uFFFD')) {
          return utf8;
        }
      }
    } catch { /* fall through */ }
  }
  return s;
}

function bigOrNull(x: string | undefined): bigint | null {
  if (x === undefined || x === '' || x === '0') return null;
  return BigInt(x);
}

export function decodeMoveEvent(raw: RawEvent): MoveEvent | null {
  const a = attrs(raw);
  const t = raw.type;

  // Match by trailing struct name; the prefix is the package address which
  // varies between testnet and mainnet.
  if (t.endsWith('::collection::CollectionCreatedEvent')) {
    return {
      kind: 'CollectionCreated',
      id: BigInt(a.id ?? '0'),
      artistAddr: a.artist_addr ?? '',
      name: a.name ?? '',
      symbol: a.symbol ?? '',
      defaultRoyaltyBps: Number(a.default_royalty_bps ?? '0'),
      supplyCap: bigOrNull(a.supply_cap),
    };
  }
  if (t.endsWith('::artwork::ArtworkMintedEvent')) {
    return {
      kind: 'ArtworkMinted',
      id: BigInt(a.id ?? '0'),
      collectionId: BigInt(a.collection_id ?? '0'),
      editionNo: BigInt(a.edition_no ?? '0'),
      creator: a.creator ?? '',
      contentHashHex: a.content_hash ?? '',
      title: a.title ?? '',
    };
  }
  if (t.endsWith('::artwork::GiftEvent')) {
    return {
      kind: 'Gift',
      artworkId: BigInt(a.artwork_id ?? '0'),
      from: a.from ?? '',
      to: a.to ?? '',
    };
  }
  if (t.endsWith('::market::ListingCreatedEvent')) {
    return {
      kind: 'ListingCreated',
      id: BigInt(a.id ?? '0'),
      artworkId: BigInt(a.artwork_id ?? '0'),
      seller: a.seller ?? '',
      priceUinit: BigInt(a.price_uinit ?? '0'),
      expiresAt: BigInt(a.expires_at ?? '0'),
    };
  }
  if (t.endsWith('::market::ListingCancelledEvent')) {
    return { kind: 'ListingCancelled', id: BigInt(a.id ?? '0') };
  }
  if (t.endsWith('::market::BuyExecutedEvent')) {
    return { kind: 'BuyExecuted', listingId: BigInt(a.listing_id ?? '0'), buyer: a.buyer ?? '' };
  }
  if (t.endsWith('::market::OfferCreatedEvent')) {
    return {
      kind: 'OfferCreated',
      id: BigInt(a.id ?? '0'),
      artworkId: BigInt(a.artwork_id ?? '0'),
      bidder: a.bidder ?? '',
      priceUinit: BigInt(a.price_uinit ?? '0'),
      expiresAt: BigInt(a.expires_at ?? '0'),
    };
  }
  if (t.endsWith('::market::OfferAcceptedEvent')) {
    return { kind: 'OfferAccepted', id: BigInt(a.id ?? '0') };
  }
  if (t.endsWith('::market::OfferCancelledEvent')) {
    return { kind: 'OfferCancelled', id: BigInt(a.id ?? '0') };
  }
  if (t.endsWith('::auction::AuctionCreatedEvent')) {
    return {
      kind: 'AuctionCreated',
      id: BigInt(a.id ?? '0'),
      artworkId: BigInt(a.artwork_id ?? '0'),
      seller: a.seller ?? '',
      reserveUinit: BigInt(a.reserve_uinit ?? '0'),
      endsAt: BigInt(a.ends_at ?? '0'),
      minIncrementBps: Number(a.min_increment_bps ?? '0'),
      extensionSecs: Number(a.extension_secs ?? '0'),
    };
  }
  if (t.endsWith('::auction::BidPlacedEvent')) {
    return {
      kind: 'BidPlaced',
      auctionId: BigInt(a.auction_id ?? '0'),
      bidder: a.bidder ?? '',
      amountUinit: BigInt(a.amount_uinit ?? '0'),
      newEndsAt: BigInt(a.new_ends_at ?? '0'),
    };
  }
  if (t.endsWith('::auction::AuctionFinalizedEvent')) {
    const winnerSome = a.winner_some === 'true' || a.winner_some === '1';
    return {
      kind: 'AuctionFinalized',
      auctionId: BigInt(a.auction_id ?? '0'),
      winner: winnerSome ? (a.winner ?? null) : null,
      finalPriceUinit: BigInt(a.final_price_uinit ?? '0'),
    };
  }
  if (t.endsWith('::royalty::SettlementEvent')) {
    const sourceCode = Number(a.source ?? '0');
    const source: SettlementEvent['source'] =
      sourceCode === 1 ? 'listing' : sourceCode === 2 ? 'auction' : 'offer';
    return {
      kind: 'Settlement',
      artworkId: BigInt(a.artwork_id ?? '0'),
      source,
      sourceId: BigInt(a.source_id ?? '0'),
      buyer: a.buyer ?? '',
      seller: a.seller ?? '',
      artistAddr: a.artist_addr ?? '',
      grossUinit: BigInt(a.gross_uinit ?? '0'),
      royaltyUinit: BigInt(a.royalty_uinit ?? '0'),
      protocolFeeUinit: BigInt(a.protocol_fee_uinit ?? '0'),
      sellerNetUinit: BigInt(a.seller_net_uinit ?? '0'),
    };
  }
  return null;
}
