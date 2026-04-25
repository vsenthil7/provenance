# DATA_MODEL.md — Provenance

**Doc version:** 1.0
**Conventions used:**
- Money amounts are `u64` in `uinit` (1 INIT = 10⁶ uinit), the Initia rollup gas denom convention.
- Timestamps are `u64` Unix seconds.
- All addresses are `address` (32-byte, bech32-prefixed `init1…` when serialised).
- Royalty fields are basis points (`bps`); `100 = 1%`, `10000 = 100%`. Capped at `1000` (10%) at module level.

---

## 1. On-chain state (Move resources)

### 1.1 `provenance::collection::Collection`

```move
struct Collection has key {
    id: u64,                              // monotonically increasing, friend-managed
    name: String,                         // e.g. "Lina's Quiet Series"
    symbol: String,                       // short tag, ≤ 8 chars, A-Z0-9 only
    artist_addr: address,                 // immutable; the .init username is resolved off-chain
    default_royalty_bps: u64,             // 0..=1000
    supply_cap: Option<u64>,              // None = open edition, Some(n) = capped
    minted: u64,                          // current count, < supply_cap if Some
    metadata_uri: String,                 // ipfs:// or https://, points to JSON manifest
    mutable_metadata: bool,               // if false, metadata_uri can never change
    created_at: u64,
    frozen: bool,                         // once true, no more mints in this collection
}
```

**Stored as:** `Object<Collection>` owned by the artist's address. Object handle is the public ID used in URLs.

**Invariants:**
- I-COL-1: `default_royalty_bps <= 1000`.
- I-COL-2: `minted <= supply_cap` when supply_cap is Some.
- I-COL-3: `frozen ⇒ minted` no longer increments.
- I-COL-4: Only `artist_addr` can update mutable fields.
- I-COL-5: `id` is set once at creation and never changes.

**Access rules:**
- `create_collection`: any signer.
- `set_metadata_uri(creator, collection_obj, new_uri)`: requires `creator == artist_addr` AND `mutable_metadata == true`.
- `freeze_collection(creator, collection_obj)`: requires `creator == artist_addr`. Irreversible.
- `increment_supply`: friend-only (`provenance::artwork`).

### 1.2 `provenance::artwork::Artwork`

```move
struct Artwork has key {
    id: u64,                              // unique within rollup
    collection: Object<Collection>,
    edition_no: u64,                      // 1-indexed, 0 if open edition where order doesn't matter
    title: String,
    content_hash: vector<u8>,             // sha256(image_bytes), 32 bytes; HOW WE PROVE THE IMAGE
    image_uri: String,                    // R2 URL — derived from content_hash (e.g. /art/{hex}.png)
    metadata_uri: String,                 // optional, points to JSON with attributes
    royalty_override_bps: Option<u64>,    // if Some, used; else fall back to collection default
    minted_at: u64,
    creator: address,                     // == collection.artist_addr at mint time, immutable
}
```

**Stored as:** `Object<Artwork>` owned by current holder (artist initially, then buyers).

**Invariants:**
- I-ART-1: `royalty_override_bps` if Some must be `<= 1000`.
- I-ART-2: `vector::length(&content_hash) == 32`.
- I-ART-3: `creator` is set at mint and never changes.
- I-ART-4: `Artwork` cannot exist without a corresponding `Collection`.
- I-ART-5: An `Artwork` object's ownership can only be changed by:
  - (a) `royalty::settle` — paid path, royalty enforced
  - (b) `gift` (a `public entry` we expose) — free transfer, emits `GiftEvent`
  - There is **no third path**. Friend visibility on the move helper guarantees this.

**Access rules:**
- `mint(artist, collection_obj, ...)`: requires `signer::address_of(artist) == collection.artist_addr` AND `!frozen` AND room under `supply_cap`.
- `gift(holder, artwork_obj, recipient)`: requires `signer::address_of(holder) == owner_of(artwork_obj)`.
- Internal transfer for sales: friend-only, called by `royalty::settle`.

**The royalty-circumvention impossibility, in one paragraph.** Move's borrow checker plus the `friend` keyword plus `Object<T>` ownership semantics together mean: if you want to change an `Artwork` object's owner AND receive INIT in the same transaction, you must call code in our `provenance` package; our `provenance::market` and `provenance::auction` modules are the only callers of the friend helper that does this; both call `provenance::royalty::settle` before completing; therefore every paid transfer of an `Artwork` pays the royalty. There is no "approve operator" pattern (Move doesn't need one), and the public `gift` path emits an event without moving money — a buyer who tries to bribe a seller off-chain via a "gift + Venmo" workflow can do so, but at that point we are no different from any other marketplace and the buyer has lost the cryptographic guarantee they came for.

### 1.3 `provenance::market::Listing`

```move
struct Listing has key {
    id: u64,
    artwork: Object<Artwork>,
    seller: address,
    price_uinit: u64,
    expires_at: u64,                      // 0 = no expiry
    active: bool,                         // false after buy_now or cancel
    created_at: u64,
}
```

**Stored as:** `Object<Listing>` co-located with the seller's address.

**Invariants:**
- I-LST-1: `price_uinit > 0`.
- I-LST-2: `seller == owner_of(artwork)` at the moment of listing (re-checked at buy time).
- I-LST-3: When `active == false`, no further state transitions.

**Access rules:**
- `list_fixed(seller, artwork, price, expires_at)`: requires the seller owns the artwork.
- `cancel_listing(seller, listing)`: requires `signer == listing.seller`.
- `buy_now(buyer, listing)`: requires `active && now < expires_at` (or expires_at == 0). Re-checks ownership; if seller transferred via `gift` after listing, the buy fails cleanly with `E_LISTING_STALE`.

### 1.4 `provenance::market::Offer`

```move
struct Offer has key {
    id: u64,
    artwork: Object<Artwork>,
    bidder: address,
    price_uinit: u64,
    expires_at: u64,
    escrow: Coin<INIT>,                   // funds locked until accept or cancel
}
```

**Stored as:** `Object<Offer>`. Multiple offers per artwork allowed — this is intentional. The seller picks which to accept.

**Invariants:**
- I-OFR-1: `price_uinit > 0` and `coin::value(&escrow) >= price_uinit`.
- I-OFR-2: An expired offer's escrow can be reclaimed by the bidder via `cancel_offer`.

**Access rules:**
- `make_offer(bidder, artwork, price, expires_at)`: bidder must have ≥ price in their wallet; funds are moved into escrow at this point.
- `accept_offer(seller, offer)`: requires seller owns the artwork; calls `royalty::settle`.
- `cancel_offer(bidder, offer)`: requires `signer == offer.bidder`. Returns escrow to bidder.

### 1.5 `provenance::auction::Auction`

```move
struct Auction has key {
    id: u64,
    artwork: Object<Artwork>,
    seller: address,
    reserve_uinit: u64,
    current_bid_uinit: u64,                // 0 if no bids yet
    current_bidder: Option<address>,
    current_escrow: Coin<INIT>,            // held until outbid or finalized
    min_increment_bps: u64,                // e.g. 200 = next bid must be at least 2% higher
    ends_at: u64,
    extension_secs: u64,                   // anti-snipe; e.g. 120 means a bid in last 120s extends ends_at by 120s
    finalized: bool,
}
```

**Stored as:** `Object<Auction>`. Holds the artwork in escrow during the auction (transferred to auction object on creation, transferred to winner on finalize).

**Invariants:**
- I-AUC-1: `reserve_uinit > 0`.
- I-AUC-2: `min_increment_bps >= 100` (1%) and `<= 5000` (50%).
- I-AUC-3: While `!finalized`, the artwork is owned by the auction object, not the seller.
- I-AUC-4: When a new bid arrives, the previous escrow is refunded atomically before the new one is locked.

**Access rules:**
- `create_auction(seller, artwork, reserve, duration_secs, min_increment_bps, extension_secs)`: seller must own the artwork; the artwork moves to escrow.
- `place_bid(bidder, auction, amount)`: must satisfy `amount >= reserve` (first bid) or `amount >= current_bid + (current_bid * min_increment_bps / 10000)`; must be `now < ends_at`. **This is the only function granted to the autosign authz scope.**
- `finalize_auction(any_signer, auction)`: callable by anyone after `ends_at`. Calls `royalty::settle` if there's a winning bid; otherwise returns artwork to seller and is a no-op for funds.

### 1.6 `provenance::royalty::SettlementContext`

Not a stored resource — a transient struct passed during settlement, but defined here for completeness:

```move
struct SettlementContext {
    artwork: Object<Artwork>,
    gross_uinit: u64,
    seller: address,
    buyer: address,
    royalty_bps: u64,                     // resolved from artwork override or collection default
}
```

The `settle` function:
1. Computes `royalty = gross * royalty_bps / 10000`.
2. Computes `protocol_fee = gross * 50 / 10000` (0.5%).
3. Computes `seller_net = gross - royalty - protocol_fee`.
4. Asserts `royalty + protocol_fee + seller_net == gross` (no rounding loss).
5. Transfers `Coin<INIT>` to: artist_addr, PROTOCOL_TREASURY, seller.
6. Transfers `Object<Artwork>` ownership to buyer.
7. Emits `SettlementEvent`.

All six steps execute atomically — Move transactions are all-or-nothing, so a failure at any step reverts the entire sale.

---

## 2. Off-chain database schema (Postgres on Neon)

The indexer is the only writer. Frontend reads via GraphQL. No off-chain user accounts exist — identity is on-chain only.

### 2.1 Tables

```sql
CREATE TABLE collections (
  id              BIGINT PRIMARY KEY,                    -- chain-side collection.id
  object_addr     TEXT NOT NULL UNIQUE,                  -- Move object address
  artist_addr     TEXT NOT NULL,
  artist_username TEXT,                                  -- cached from .init resolver, refreshed daily
  name            TEXT NOT NULL,
  symbol          TEXT NOT NULL,
  default_royalty_bps INTEGER NOT NULL CHECK (default_royalty_bps BETWEEN 0 AND 1000),
  supply_cap      BIGINT,
  minted          BIGINT NOT NULL DEFAULT 0,
  metadata_uri    TEXT NOT NULL,
  frozen          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL,
  block_height    BIGINT NOT NULL,
  tx_hash         TEXT NOT NULL
);
CREATE INDEX collections_artist_addr_idx ON collections (artist_addr);
CREATE INDEX collections_artist_username_idx ON collections (artist_username) WHERE artist_username IS NOT NULL;
CREATE INDEX collections_created_at_idx ON collections (created_at DESC);

CREATE TABLE artworks (
  id               BIGINT PRIMARY KEY,
  object_addr      TEXT NOT NULL UNIQUE,
  collection_id    BIGINT NOT NULL REFERENCES collections(id),
  edition_no       BIGINT NOT NULL,
  title            TEXT NOT NULL,
  content_hash     BYTEA NOT NULL,                       -- 32 bytes
  image_uri        TEXT NOT NULL,
  metadata_uri     TEXT,
  royalty_bps      INTEGER NOT NULL,                     -- resolved (override or collection default)
  creator_addr     TEXT NOT NULL,
  current_owner    TEXT NOT NULL,                        -- updated on every transfer
  minted_at        TIMESTAMPTZ NOT NULL,
  block_height     BIGINT NOT NULL,
  tx_hash          TEXT NOT NULL
);
CREATE INDEX artworks_collection_id_idx ON artworks (collection_id);
CREATE INDEX artworks_creator_addr_idx ON artworks (creator_addr);
CREATE INDEX artworks_current_owner_idx ON artworks (current_owner);
CREATE INDEX artworks_minted_at_idx ON artworks (minted_at DESC);

CREATE TABLE listings (
  id            BIGINT PRIMARY KEY,
  object_addr   TEXT NOT NULL UNIQUE,
  artwork_id    BIGINT NOT NULL REFERENCES artworks(id),
  seller_addr   TEXT NOT NULL,
  price_uinit   BIGINT NOT NULL,
  expires_at    TIMESTAMPTZ,
  status        TEXT NOT NULL CHECK (status IN ('active','sold','cancelled','expired')),
  created_at    TIMESTAMPTZ NOT NULL,
  closed_at     TIMESTAMPTZ,
  block_height  BIGINT NOT NULL,
  tx_hash       TEXT NOT NULL
);
CREATE INDEX listings_artwork_active_idx ON listings (artwork_id) WHERE status = 'active';
CREATE INDEX listings_status_created_idx ON listings (status, created_at DESC);

CREATE TABLE auctions (
  id                  BIGINT PRIMARY KEY,
  object_addr         TEXT NOT NULL UNIQUE,
  artwork_id          BIGINT NOT NULL REFERENCES artworks(id),
  seller_addr         TEXT NOT NULL,
  reserve_uinit       BIGINT NOT NULL,
  current_bid_uinit   BIGINT NOT NULL DEFAULT 0,
  current_bidder      TEXT,
  min_increment_bps   INTEGER NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL,
  extension_secs      INTEGER NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('live','finalized','no_bids')),
  created_at          TIMESTAMPTZ NOT NULL,
  finalized_at        TIMESTAMPTZ,
  block_height        BIGINT NOT NULL,
  tx_hash             TEXT NOT NULL
);
CREATE INDEX auctions_status_ends_idx ON auctions (status, ends_at);

CREATE TABLE bids (
  id              BIGSERIAL PRIMARY KEY,
  auction_id      BIGINT NOT NULL REFERENCES auctions(id),
  bidder_addr     TEXT NOT NULL,
  bidder_username TEXT,
  amount_uinit    BIGINT NOT NULL,
  placed_at       TIMESTAMPTZ NOT NULL,
  block_height    BIGINT NOT NULL,
  tx_hash         TEXT NOT NULL UNIQUE                   -- idempotency
);
CREATE INDEX bids_auction_id_placed_idx ON bids (auction_id, placed_at DESC);
CREATE INDEX bids_bidder_addr_idx ON bids (bidder_addr);

CREATE TABLE offers (
  id            BIGINT PRIMARY KEY,
  object_addr   TEXT NOT NULL UNIQUE,
  artwork_id    BIGINT NOT NULL REFERENCES artworks(id),
  bidder_addr   TEXT NOT NULL,
  price_uinit   BIGINT NOT NULL,
  expires_at    TIMESTAMPTZ,
  status        TEXT NOT NULL CHECK (status IN ('open','accepted','cancelled','expired')),
  created_at    TIMESTAMPTZ NOT NULL,
  closed_at     TIMESTAMPTZ,
  block_height  BIGINT NOT NULL,
  tx_hash       TEXT NOT NULL
);
CREATE INDEX offers_artwork_status_idx ON offers (artwork_id, status);

CREATE TABLE settlements (
  id                 BIGSERIAL PRIMARY KEY,
  artwork_id         BIGINT NOT NULL REFERENCES artworks(id),
  source             TEXT NOT NULL CHECK (source IN ('buy_now','accept_offer','auction')),
  source_id          BIGINT NOT NULL,                     -- listing/offer/auction id
  buyer_addr         TEXT NOT NULL,
  seller_addr        TEXT NOT NULL,
  gross_uinit        BIGINT NOT NULL,
  royalty_uinit      BIGINT NOT NULL,
  protocol_fee_uinit BIGINT NOT NULL,
  seller_net_uinit   BIGINT NOT NULL,
  artist_addr        TEXT NOT NULL,                       -- royalty recipient
  block_height       BIGINT NOT NULL,
  tx_hash            TEXT NOT NULL UNIQUE,
  settled_at         TIMESTAMPTZ NOT NULL
);
CREATE INDEX settlements_artwork_settled_idx ON settlements (artwork_id, settled_at DESC);
CREATE INDEX settlements_artist_settled_idx ON settlements (artist_addr, settled_at DESC);

CREATE TABLE transfers_gift (
  id            BIGSERIAL PRIMARY KEY,
  artwork_id    BIGINT NOT NULL REFERENCES artworks(id),
  from_addr     TEXT NOT NULL,
  to_addr       TEXT NOT NULL,
  block_height  BIGINT NOT NULL,
  tx_hash       TEXT NOT NULL UNIQUE,
  occurred_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX transfers_gift_artwork_idx ON transfers_gift (artwork_id, occurred_at DESC);

-- Indexer cursor (Ponder keeps its own; this is a sanity/debugging mirror)
CREATE TABLE indexer_state (
  id            INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- single row
  last_height   BIGINT NOT NULL,
  last_block_at TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL
);

-- Username cache (refreshed daily by a worker)
CREATE TABLE usernames (
  addr        TEXT PRIMARY KEY,
  username    TEXT NOT NULL,                            -- e.g. "lina.init"
  last_seen   TIMESTAMPTZ NOT NULL
);
CREATE INDEX usernames_username_idx ON usernames (username);
```

### 2.2 Retention policy

- All on-chain-mirrored tables: retained indefinitely (the chain is the source of truth; Postgres is a cache, but a useful long-lived cache).
- `usernames`: refreshed daily; rows older than 90 days without a refresh are deleted (will be re-created on next demand).
- `indexer_state`: single-row, never deleted.
- Backups: Neon free-tier 7-day point-in-time recovery is enabled in DEPLOYMENT_TOPOLOGY.

### 2.3 Foreign keys

All reference relationships are FK-enforced. ON DELETE behaviour is `RESTRICT` everywhere except `transfers_gift` and `bids` (which can cascade if their parent artwork/auction is somehow purged, which should never happen — defensive default).

---

## 3. Event schema (chain-emitted, indexer-consumed, frontend-rendered)

| Event name | Emitted by module | Indexer handler | Frontend usage |
|---|---|---|---|
| `CollectionCreatedEvent { id, object_addr, artist_addr, name, symbol, default_royalty_bps, supply_cap, metadata_uri, ts }` | `collection` | upserts `collections` | "New artist on Provenance" feed; artist studio page |
| `CollectionFrozenEvent { id, ts }` | `collection` | sets `collections.frozen = true` | "Edition closed" badge |
| `CollectionMetadataUpdatedEvent { id, new_uri, ts }` | `collection` | updates `collections.metadata_uri` | Refreshes collection cover |
| `ArtworkMintedEvent { id, object_addr, collection_id, edition_no, title, content_hash, image_uri, metadata_uri, royalty_bps, creator_addr, ts }` | `artwork` | inserts `artworks` | Artist's drop page; "fresh mints" feed |
| `GiftEvent { artwork_id, from, to, ts }` | `artwork` | inserts `transfers_gift`, updates `artworks.current_owner` | Provenance trail on artwork detail page |
| `ListingCreatedEvent { id, artwork_id, seller, price_uinit, expires_at, ts }` | `market` | inserts `listings` | Marketplace grid |
| `ListingCancelledEvent { id, ts }` | `market` | sets `listings.status = 'cancelled'`, `closed_at = ts` | Removes from grid |
| `BuyExecutedEvent { listing_id, buyer, ts }` | `market` | sets `listings.status = 'sold'`; FOLLOWED BY `SettlementEvent` | "Sold" badge |
| `OfferCreatedEvent { id, artwork_id, bidder, price_uinit, expires_at, ts }` | `market` | inserts `offers` | Offer count on artwork page |
| `OfferAcceptedEvent { id, ts }` | `market` | sets `offers.status = 'accepted'`; FOLLOWED BY `SettlementEvent` | Notifies bidder |
| `OfferCancelledEvent { id, ts }` | `market` | sets `offers.status = 'cancelled'` | Removes from offer list |
| `AuctionCreatedEvent { id, object_addr, artwork_id, seller, reserve_uinit, ends_at, min_increment_bps, extension_secs, ts }` | `auction` | inserts `auctions` | Live auctions page |
| `BidPlacedEvent { auction_id, bidder, amount_uinit, new_ends_at, ts }` | `auction` | inserts `bids`, updates `auctions.current_bid/_bidder/ends_at` | Live bid feed (real-time poll, not WS in v1) |
| `AuctionFinalizedEvent { auction_id, winner: Option<addr>, final_price_uinit, ts }` | `auction` | sets `auctions.status` to 'finalized' or 'no_bids'; if winner, FOLLOWED BY `SettlementEvent` | "Won by lina.init for 12 INIT" line |
| `SettlementEvent { artwork_id, source: enum, source_id, buyer, seller, gross_uinit, royalty_uinit, protocol_fee_uinit, seller_net_uinit, artist_addr, ts }` | `royalty` | inserts `settlements`, updates `artworks.current_owner = buyer` | Royalty earnings dashboard for artists |

**Idempotency.** Every event handler keys off `tx_hash` (and where multiple events fire in one tx, also `event_index_in_tx`). The `tx_hash UNIQUE` constraints enforce this.

**Event ordering guarantee.** Within a block, events fire in the order the transactions are committed. Across blocks, Tendermint guarantees order. The indexer processes blocks sequentially with the cursor in `indexer_state.last_height` — no out-of-order processing.

---

## 4. State transitions

### 4.1 Listing lifecycle

```
                      list_fixed
                         │
                         ▼
                    ┌────────┐         buy_now      ┌──────┐
                    │ active │ ──────────────────▶ │ sold │
                    └────────┘                      └──────┘
                       │  │
              cancel   │  │  expires_at < now
                       ▼  ▼
                  ┌──────────┐  ┌──────────┐
                  │cancelled │  │ expired  │  ← status updated by
                  └──────────┘  └──────────┘    indexer's tick
```

### 4.2 Auction lifecycle (with anti-snipe extension)

```
              create_auction
                    │
                    ▼
              ┌──────────┐    place_bid (≥ reserve)        ┌──────────────┐
              │   live   │ ────────────────────────────▶  │ live_with_bid│
              │ no_bids  │                                  └──────────────┘
              └──────────┘                                    │   ▲
                    │                                         │   │
                    │ ends_at < now,  no bids                 │   │ outbid: refund prev,
                    ▼                                         │   │ lock new, maybe
              ┌──────────┐    finalize_auction (after end)    │   │ extend ends_at
              │ no_bids  │ ──────────────────────────▶  done  │   │
              └──────────┘                                    │   │
                                                              │   │
                                                    ends_at < now
                                                              │
                                                              ▼
                                                     ┌─────────────┐
                                                     │ awaiting_   │
                                                     │ finalize    │
                                                     └─────────────┘
                                                              │
                                                    finalize_auction
                                                              │
                                                              ▼
                                                     ┌─────────────┐
                                                     │ finalized   │
                                                     └─────────────┘
```

### 4.3 Offer lifecycle

```
       make_offer              accept_offer
            │                        │
            ▼                        ▼
       ┌──────┐                ┌──────────┐
       │ open │ ─────────────▶ │ accepted │
       └──────┘                └──────────┘
        │   │
 cancel │   │ expires_at < now
        ▼   ▼
   ┌─────────┐  ┌─────────┐
   │cancelled│  │ expired │
   └─────────┘  └─────────┘
```

### 4.4 Artwork ownership lifecycle

```
                    mint
                     │
                     ▼
                ┌────────┐
                │ artist │
                └────────┘
                  │   │   │
        list_fixed│   │   │ accept_offer
                  │   │   │
                  ▼   ▼   ▼
              ┌──────┐ ┌──────┐ ┌──────────┐
              │listed│ │auction│ │ owner_   │
              │      │ │      │ │ holding  │  ← also reachable via gift
              └──────┘ └──────┘ └──────────┘
                  │       │           │
                  │       │           │  list_fixed / create_auction / make_offer accepted
                  │       ▼           │  (any of these, repeated forever)
                  ▼   royalty::settle ▼
                  └─────────┴─────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ new owner    │  ← royalty paid every transition through settle
                     └──────────────┘
```

---

## 5. Customer-buyer review

> *Reviewing as Lina (artist), now joined by Carla (a collector who's lost £400 to skipped royalties on EVM marketplaces).*

**Lina's questions:**

1. **"If R2 nukes my image, can someone restore it?"**
   *Answer:* Yes. `content_hash` is on-chain (sha256 of the bytes). Anyone with a copy of the bytes can rehost and the URL can be updated by you (via `set_metadata_uri` on the collection, or by updating the `image_uri` indirectly through a planned v1.1 module). If literally no one has a copy, the image is lost — but the collection record, your earnings, and the chain of ownership all survive. **Acceptable.**

2. **"Can someone forge a 'lina.init' username on a fake collection?"**
   *Answer:* No. The collection stores `artist_addr`, not the username. The `.init` username on the artist page is resolved from the address at view time. If someone makes a collection from a different address but tries to display "lina.init" — the resolver returns whatever username is bound to *their* address, which won't be yours. **Robust.**

3. **"Can a buyer and I collude to fake a high secondary sale to inflate my floor?"**
   *Answer:* Yes — the same way you can on any marketplace. The royalty still gets paid (to you, in this case), the protocol fee still gets paid, so it's expensive collusion. We don't currently do anything to detect wash trading. **Honest weakness; documented.**

**Carla's questions:**

4. **"Where's my purchase history? Can I see all the artworks I own and the artists who get my royalties on resales?"**
   *Answer:* `artworks.current_owner` indexed; "my collection" page shows owned pieces. Royalty trail is in `settlements`. **Yes.**

5. **"If Provenance's website goes down, do I still own the art?"**
   *Answer:* Yes. The `Artwork` is a Move resource on the Provenance rollup. The website is a viewer; if it dies, anyone can run a viewer against the rollup's public RPC. The README ships with instructions for running a "sovereign frontend." **Reassuring.**

6. **"What if the artist deletes the metadata_uri?"**
   *Answer:* `mutable_metadata` is set at collection-creation time. If false, the artist cannot delete or change it — ever. We default the create-collection UI to `mutable_metadata = false` and only let it be true with a warning. **Appropriately defaulted.**

**Verdict on the data model:** Approve. Invariants are explicit, the royalty-circumvention impossibility argument holds up to inspection, and customer-meaningful failures (image hosting, wash trading) are named honestly rather than hand-waved.
