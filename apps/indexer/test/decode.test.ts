import { describe, it, expect } from 'vitest';
import { decodeMoveEvent } from '../src/decode';

const PKG = 'init1pkg';
const mk = (suffix: string, attrs: Record<string, string>) => ({
  type: `${PKG}::${suffix}`,
  attributes: Object.entries(attrs).map(([key, value]) => ({ key, value })),
});

describe('decodeMoveEvent', () => {
  it('returns null for unknown event types', () => {
    expect(decodeMoveEvent({ type: 'unknown::module::Event', attributes: [] })).toBeNull();
  });

  it('decodes CollectionCreatedEvent', () => {
    const e = decodeMoveEvent(
      mk('collection::CollectionCreatedEvent', {
        id: '1', artist_addr: 'init1a', name: 'Quiet', symbol: 'Q',
        default_royalty_bps: '500', supply_cap: '100',
      }),
    );
    expect(e).toEqual({
      kind: 'CollectionCreated', id: 1n, artistAddr: 'init1a',
      name: 'Quiet', symbol: 'Q', defaultRoyaltyBps: 500, supplyCap: 100n,
    });
  });

  it('decodes CollectionCreatedEvent with null supply_cap', () => {
    const e = decodeMoveEvent(
      mk('collection::CollectionCreatedEvent', {
        id: '1', artist_addr: 'init1a', name: 'X', symbol: 'X',
        default_royalty_bps: '0', supply_cap: '',
      }),
    );
    expect(e).toMatchObject({ supplyCap: null });
  });

  it('decodes ArtworkMintedEvent', () => {
    const e = decodeMoveEvent(
      mk('artwork::ArtworkMintedEvent', {
        id: '7', collection_id: '1', edition_no: '3',
        creator: 'init1a', content_hash: '00aa', title: 'Untitled',
      }),
    );
    expect(e).toMatchObject({
      kind: 'ArtworkMinted', id: 7n, collectionId: 1n, editionNo: 3n,
      creator: 'init1a', contentHashHex: '00aa', title: 'Untitled',
    });
  });

  it('decodes GiftEvent', () => {
    const e = decodeMoveEvent(
      mk('artwork::GiftEvent', { artwork_id: '7', from: 'init1a', to: 'init1b' }),
    );
    expect(e).toEqual({ kind: 'Gift', artworkId: 7n, from: 'init1a', to: 'init1b' });
  });

  it('decodes ListingCreatedEvent', () => {
    const e = decodeMoveEvent(
      mk('market::ListingCreatedEvent', {
        id: '1', artwork_id: '7', seller: 'init1a',
        price_uinit: '1000000', expires_at: '0',
      }),
    );
    expect(e).toMatchObject({
      kind: 'ListingCreated', id: 1n, artworkId: 7n, seller: 'init1a',
      priceUinit: 1_000_000n, expiresAt: 0n,
    });
  });

  it('decodes ListingCancelledEvent', () => {
    expect(decodeMoveEvent(mk('market::ListingCancelledEvent', { id: '5' }))).toEqual({
      kind: 'ListingCancelled', id: 5n,
    });
  });

  it('decodes BuyExecutedEvent', () => {
    const e = decodeMoveEvent(mk('market::BuyExecutedEvent', { listing_id: '5', buyer: 'init1c' }));
    expect(e).toEqual({ kind: 'BuyExecuted', listingId: 5n, buyer: 'init1c' });
  });

  it('decodes OfferCreatedEvent', () => {
    const e = decodeMoveEvent(
      mk('market::OfferCreatedEvent', {
        id: '2', artwork_id: '7', bidder: 'init1c',
        price_uinit: '500000', expires_at: '999',
      }),
    );
    expect(e).toMatchObject({ kind: 'OfferCreated', id: 2n, priceUinit: 500_000n });
  });

  it('decodes OfferAcceptedEvent', () => {
    expect(decodeMoveEvent(mk('market::OfferAcceptedEvent', { id: '2' }))).toEqual({
      kind: 'OfferAccepted', id: 2n,
    });
  });

  it('decodes OfferCancelledEvent', () => {
    expect(decodeMoveEvent(mk('market::OfferCancelledEvent', { id: '2' }))).toEqual({
      kind: 'OfferCancelled', id: 2n,
    });
  });

  it('decodes AuctionCreatedEvent', () => {
    const e = decodeMoveEvent(
      mk('auction::AuctionCreatedEvent', {
        id: '1', artwork_id: '7', seller: 'init1a',
        reserve_uinit: '1000000', ends_at: '99999',
        min_increment_bps: '200', extension_secs: '120',
      }),
    );
    expect(e).toMatchObject({
      kind: 'AuctionCreated', reserveUinit: 1_000_000n,
      minIncrementBps: 200, extensionSecs: 120,
    });
  });

  it('decodes BidPlacedEvent', () => {
    const e = decodeMoveEvent(
      mk('auction::BidPlacedEvent', {
        auction_id: '1', bidder: 'init1c', amount_uinit: '1100000', new_ends_at: '100099',
      }),
    );
    expect(e).toMatchObject({ kind: 'BidPlaced', amountUinit: 1_100_000n });
  });

  it('decodes AuctionFinalizedEvent with winner', () => {
    const e = decodeMoveEvent(
      mk('auction::AuctionFinalizedEvent', {
        auction_id: '1', winner_some: 'true', winner: 'init1c', final_price_uinit: '1200000',
      }),
    );
    expect(e).toMatchObject({ kind: 'AuctionFinalized', winner: 'init1c' });
  });

  it('decodes AuctionFinalizedEvent without winner (no_bids)', () => {
    const e = decodeMoveEvent(
      mk('auction::AuctionFinalizedEvent', {
        auction_id: '1', winner_some: 'false', winner: '', final_price_uinit: '0',
      }),
    );
    expect(e).toMatchObject({ kind: 'AuctionFinalized', winner: null, finalPriceUinit: 0n });
  });

  it('decodes SettlementEvent (listing source)', () => {
    const e = decodeMoveEvent(
      mk('royalty::SettlementEvent', {
        artwork_id: '7', source: '1', source_id: '5',
        buyer: 'init1c', seller: 'init1a', artist_addr: 'init1a',
        gross_uinit: '1000000', royalty_uinit: '50000',
        protocol_fee_uinit: '5000', seller_net_uinit: '945000',
      }),
    );
    expect(e).toMatchObject({
      kind: 'Settlement', source: 'listing',
      grossUinit: 1_000_000n, royaltyUinit: 50_000n,
      protocolFeeUinit: 5_000n, sellerNetUinit: 945_000n,
    });
  });

  it('decodes SettlementEvent (auction source)', () => {
    const e = decodeMoveEvent(
      mk('royalty::SettlementEvent', {
        artwork_id: '7', source: '2', source_id: '1',
        buyer: 'init1c', seller: 'init1a', artist_addr: 'init1a',
        gross_uinit: '1000000', royalty_uinit: '0',
        protocol_fee_uinit: '5000', seller_net_uinit: '995000',
      }),
    );
    expect(e).toMatchObject({ kind: 'Settlement', source: 'auction' });
  });

  it('decodes SettlementEvent (offer source = 3)', () => {
    const e = decodeMoveEvent(
      mk('royalty::SettlementEvent', {
        artwork_id: '7', source: '3', source_id: '2',
        buyer: 'init1c', seller: 'init1a', artist_addr: 'init1a',
        gross_uinit: '1', royalty_uinit: '0',
        protocol_fee_uinit: '0', seller_net_uinit: '1',
      }),
    );
    expect(e).toMatchObject({ kind: 'Settlement', source: 'offer' });
  });

  it('handles base64-encoded attribute values', () => {
    const b64 = (s: string) => Buffer.from(s).toString('base64');
    const e = decodeMoveEvent({
      type: `${PKG}::artwork::GiftEvent`,
      attributes: [
        { key: b64('artwork_id'), value: b64('99') },
        { key: b64('from'), value: b64('init1a') },
        { key: b64('to'), value: b64('init1b') },
      ],
    });
    expect(e).toEqual({ kind: 'Gift', artworkId: 99n, from: 'init1a', to: 'init1b' });
  });
});
