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

  // Cover all `?? '0' / ?? '' / ?? null` fallback branches in the
  // AuctionFinalized + Settlement decoders by passing an empty attribute
  // bag. Every BigInt(...) fallback should resolve to 0n; string fallbacks
  // to ''; winner to null.
  it('AuctionFinalizedEvent: missing fields fall through to defaults', () => {
    const e = decodeMoveEvent(mk('auction::AuctionFinalizedEvent', {}));
    expect(e).toMatchObject({
      kind: 'AuctionFinalized',
      auctionId: 0n,
      winner: null,
      finalPriceUinit: 0n,
    });
  });

  // Cover the `winner_some === '1'` branch (alternate truthiness encoding
  // used by some node versions) so both `'true'` and `'1'` paths are hit.
  it('AuctionFinalizedEvent: winner_some="1" alternate truthy encoding', () => {
    const e = decodeMoveEvent(
      mk('auction::AuctionFinalizedEvent', {
        auction_id: '2',
        winner_some: '1',
        winner: 'init1d',
        final_price_uinit: '500000',
      }),
    );
    expect(e).toMatchObject({ kind: 'AuctionFinalized', winner: 'init1d' });
  });

  // Cover SettlementEvent unknown-source default (source code != 1, 2, 3)
  // which falls into the final ternary's else (mapping to 'offer' as a
  // backstop) and exercises every BigInt-fallback in that decoder branch.
  it('SettlementEvent: missing fields fall through to defaults; unknown source code maps to "offer"', () => {
    const e = decodeMoveEvent(
      mk('royalty::SettlementEvent', { source: '99' }),
    );
    expect(e).toMatchObject({
      kind: 'Settlement',
      source: 'offer',
      artworkId: 0n,
      sourceId: 0n,
      buyer: '',
      seller: '',
      artistAddr: '',
      grossUinit: 0n,
      royaltyUinit: 0n,
      protocolFeeUinit: 0n,
      sellerNetUinit: 0n,
    });
  });

  // Cover the ?? fallback branches in AuctionCreatedEvent and BidPlacedEvent
  // (every BigInt(... ?? '0'), seller ?? '', bidder ?? '', etc.) by passing
  // an empty attribute bag through each decoder.
  it('AuctionCreatedEvent: missing fields fall through to defaults', () => {
    const e = decodeMoveEvent(mk('auction::AuctionCreatedEvent', {}));
    expect(e).toMatchObject({
      kind: 'AuctionCreated',
      id: 0n,
      artworkId: 0n,
      seller: '',
      reserveUinit: 0n,
      endsAt: 0n,
      minIncrementBps: 0,
      extensionSecs: 0,
    });
  });

  it('BidPlacedEvent: missing fields fall through to defaults', () => {
    const e = decodeMoveEvent(mk('auction::BidPlacedEvent', {}));
    expect(e).toMatchObject({
      kind: 'BidPlaced',
      auctionId: 0n,
      bidder: '',
      amountUinit: 0n,
      newEndsAt: 0n,
    });
  });

  // Cover the SettlementEvent winner ?? null fallback (winnerSome=true but
  // winner field missing). Distinct from the empty-bag test above which
  // has winnerSome=false.
  it('AuctionFinalizedEvent: winnerSome=true but winner field missing falls back to null', () => {
    const e = decodeMoveEvent(
      mk('auction::AuctionFinalizedEvent', {
        auction_id: '5',
        winner_some: 'true',
        // winner deliberately omitted
        final_price_uinit: '100',
      }),
    );
    expect(e).toMatchObject({
      kind: 'AuctionFinalized',
      winner: null,
    });
  });

  // Cover ?? fallbacks for the remaining market decoders (Listing, Offer*).
  it('ListingCreatedEvent: missing fields fall through to defaults', () => {
    const e = decodeMoveEvent(mk('market::ListingCreatedEvent', {}));
    expect(e).toMatchObject({
      kind: 'ListingCreated',
      id: 0n,
      artworkId: 0n,
      seller: '',
      priceUinit: 0n,
      expiresAt: 0n,
    });
  });

  it('ListingCancelledEvent: missing id falls through to 0n', () => {
    const e = decodeMoveEvent(mk('market::ListingCancelledEvent', {}));
    expect(e).toMatchObject({ kind: 'ListingCancelled', id: 0n });
  });

  it('BuyExecutedEvent: missing fields fall through to defaults', () => {
    const e = decodeMoveEvent(mk('market::BuyExecutedEvent', {}));
    expect(e).toMatchObject({ kind: 'BuyExecuted', listingId: 0n, buyer: '' });
  });

  it('OfferCreatedEvent: missing fields fall through to defaults', () => {
    const e = decodeMoveEvent(mk('market::OfferCreatedEvent', {}));
    expect(e).toMatchObject({
      kind: 'OfferCreated',
      id: 0n,
      artworkId: 0n,
      bidder: '',
      priceUinit: 0n,
      expiresAt: 0n,
    });
  });

  it('OfferAcceptedEvent: missing id falls through to 0n', () => {
    const e = decodeMoveEvent(mk('market::OfferAcceptedEvent', {}));
    expect(e).toMatchObject({ kind: 'OfferAccepted', id: 0n });
  });

  it('OfferCancelledEvent: missing id falls through to 0n', () => {
    const e = decodeMoveEvent(mk('market::OfferCancelledEvent', {}));
    expect(e).toMatchObject({ kind: 'OfferCancelled', id: 0n });
  });

  // Cover the missing-`source` branch in SettlementEvent: when source is
  // omitted, sourceCode falls back to 0 (Number('0')) and the ternary chain
  // resolves to 'offer' via the final else.
  it('SettlementEvent: missing source field defaults to 0 -> "offer"', () => {
    const e = decodeMoveEvent(mk('royalty::SettlementEvent', {}));
    expect(e).toMatchObject({ kind: 'Settlement', source: 'offer' });
  });

  // Cover the `?? '0'` / `?? ''` fallbacks in CollectionCreatedEvent. Every
  // happy-path test passes complete attributes; this empty-bag fixture forces
  // every branch on lines 172-176.
  it('CollectionCreatedEvent: empty attribute bag falls through to defaults', () => {
    const e = decodeMoveEvent(mk('collection::CollectionCreatedEvent', {}));
    expect(e).toMatchObject({
      kind: 'CollectionCreated',
      id: 0n,
      artistAddr: '',
      name: '',
      symbol: '',
      defaultRoyaltyBps: 0,
      supplyCap: null,
    });
  });

  // Cover the `?? '0'` / `?? ''` fallbacks in ArtworkMintedEvent (lines 183-188).
  it('ArtworkMintedEvent: empty attribute bag falls through to defaults', () => {
    const e = decodeMoveEvent(mk('artwork::ArtworkMintedEvent', {}));
    expect(e).toMatchObject({
      kind: 'ArtworkMinted',
      id: 0n,
      collectionId: 0n,
      editionNo: 0n,
      creator: '',
      contentHashHex: '',
      title: '',
    });
  });

  // Cover the `?? '0'` / `?? ''` fallbacks in GiftEvent (lines 194-196).
  it('GiftEvent: empty attribute bag falls through to defaults', () => {
    const e = decodeMoveEvent(mk('artwork::GiftEvent', {}));
    expect(e).toMatchObject({
      kind: 'Gift',
      artworkId: 0n,
      from: '',
      to: '',
    });
  });

  // Cover the catch branch on line 153 of bytesToText (in decode.ts): the
  // base64-decode-and-round-trip block is wrapped in try/catch as defence
  // against pathological inputs. In real Node Buffer.from('xxxx', 'base64')
  // never throws, but we can force it by mocking Buffer.from for one call.
  it('bytesToText: catch branch fires when Buffer.from throws', () => {
    const realBufferFrom = Buffer.from;
    let called = false;
    // Replace Buffer.from with a thrower for ONE call (the first time it's
    // invoked with a base64 second argument), then restore.
    (Buffer as unknown as { from: typeof Buffer.from }).from = ((
      ...args: unknown[]
    ) => {
      if (!called && args[1] === 'base64') {
        called = true;
        throw new Error('synthetic base64 failure');
      }
      return (realBufferFrom as (...args: unknown[]) => Buffer).apply(
        Buffer,
        args,
      );
    }) as typeof Buffer.from;
    try {
      // 'AAAA' is a valid 4-char base64 string the decoder will try to decode;
      // our mocked Buffer.from throws on the first call, hitting the catch.
      const e = decodeMoveEvent(
        mk('collection::CollectionCreatedEvent', { symbol: 'AAAA' }),
      );
      // Should not throw; should fall through to returning the raw string.
      expect(e?.kind).toBe('CollectionCreated');
      expect((e as { symbol: string }).symbol).toBe('AAAA');
      expect(called).toBe(true);
    } finally {
      (Buffer as unknown as { from: typeof Buffer.from }).from = realBufferFrom;
    }
  });
});
