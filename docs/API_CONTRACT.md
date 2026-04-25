# API_CONTRACT.md — Provenance

**Doc version:** 1.0
**Surfaces covered:**
1. Frontend ↔ Chain (Move entry functions / RPC reads)
2. Frontend ↔ Indexer (GraphQL)
3. Frontend ↔ Off-chain backend (presign / OG image)
4. Webhook / event-driven contracts (chain → indexer)
5. Versioning strategy
6. Customer-buyer review

The contract is binding once the architecture is approved. The Build page implements exactly this; deviations require a doc revision before code.

---

## 1. Frontend ↔ Chain

### 1.1 Read RPCs (via `RESTClient` from `@initia/initia.js`)

| Function | Method | Path / view function | Returns | Errors surfaced |
|---|---|---|---|---|
| Get account balance | REST | `GET /cosmos/bank/v1beta1/balances/{address}` | `Coin[]` | `404` if address unknown (treated as 0 balance) |
| Get NFT collection by object addr | REST | `GET /indexer/nft/v1/collections/{object_addr}` | Collection JSON | `404` |
| List collections owned by address | REST | `GET /indexer/nft/v1/collections/by_account/{address}` | `Collection[]` | `404` (treat as empty) |
| List NFTs owned by address | REST | `GET /indexer/nft/v1/tokens/by_account/{address}` | `Token[]` | `404` (treat as empty) |
| Move view fn: collection details | REST | `POST /move/v1/view` body `{module:"provenance", function:"get_collection", ...}` | typed JSON | `400` arg mismatch, `500` chain error |
| Tx by hash | REST | `GET /cosmos/tx/v1beta1/txs/{hash}` | tx + result | `404` for unindexed/pending |

The frontend uses these for the "is the seller really the owner right now?" pre-check before submitting a `buy_now`. Authoritative reads for marketplace browsing go via the **indexer** (§2), not the chain — the chain is too slow for grid pages.

### 1.2 Write transactions (via `requestTxBlock` from `useInterwovenKit`)

Every write is a `MsgExecute` against `provenance` package. Fields use **camelCase** when sent through `initia.js` (per the InterwovenKit convention), `moduleAddress` is the **bech32** form (`init1...`), not hex.

| Action | Module:function | Args | Auto-sign-eligible | Pre-checks (frontend) | Chain errors |
|---|---|---|---|---|---|
| Create collection | `provenance::collection::create_collection` | `name: String, symbol: String, default_royalty_bps: u64, supply_cap: Option<u64>, metadata_uri: String, mutable_metadata: bool` | No | royalty ≤ 10%, name 1–80 chars, symbol matches `/^[A-Z0-9]{1,8}$/` | `E_ROYALTY_TOO_HIGH`, `E_NAME_INVALID`, `E_SYMBOL_INVALID` |
| Mint artwork | `provenance::artwork::mint` | `collection_obj: address, title: String, content_hash: vector<u8>, image_uri: String, metadata_uri: String, royalty_override_bps: Option<u64>` | No | image uploaded & hashed, sender owns collection, supply available | `E_NOT_COLLECTION_OWNER`, `E_SUPPLY_EXHAUSTED`, `E_FROZEN`, `E_HASH_LENGTH` |
| Freeze collection | `provenance::collection::freeze_collection` | `collection_obj: address` | No | sender is artist | `E_NOT_COLLECTION_OWNER` |
| Update metadata uri | `provenance::collection::set_metadata_uri` | `collection_obj: address, new_uri: String` | No | mutable, sender is artist | `E_IMMUTABLE`, `E_NOT_COLLECTION_OWNER` |
| Gift artwork | `provenance::artwork::gift` | `artwork_obj: address, recipient: address` | No | sender owns, recipient is valid | `E_NOT_OWNER`, `E_INVALID_RECIPIENT` |
| List for sale | `provenance::market::list_fixed` | `artwork_obj: address, price_uinit: u64, expires_at: u64` | No | sender owns, price > 0 | `E_NOT_OWNER`, `E_PRICE_ZERO`, `E_EXPIRY_PAST` |
| Cancel listing | `provenance::market::cancel_listing` | `listing_obj: address` | No | sender is seller | `E_NOT_SELLER`, `E_LISTING_INACTIVE` |
| Buy now | `provenance::market::buy_now` | `listing_obj: address` | No (high value, must confirm) | balance ≥ price, listing active, not own listing | `E_LISTING_STALE`, `E_INSUFFICIENT_BALANCE`, `E_LISTING_EXPIRED`, `E_SELF_BUY` |
| Make offer | `provenance::market::make_offer` | `artwork_obj: address, price_uinit: u64, expires_at: u64` | No (escrow lockup) | balance ≥ price | `E_INSUFFICIENT_BALANCE`, `E_PRICE_ZERO` |
| Accept offer | `provenance::market::accept_offer` | `offer_obj: address` | No | sender owns artwork, offer open | `E_NOT_OWNER`, `E_OFFER_CLOSED` |
| Cancel offer | `provenance::market::cancel_offer` | `offer_obj: address` | No (refund) | sender is bidder | `E_NOT_BIDDER` |
| Create auction | `provenance::auction::create_auction` | `artwork_obj: address, reserve_uinit: u64, duration_secs: u64, min_increment_bps: u64, extension_secs: u64` | No | sender owns, reserve > 0, duration ≥ 5min | `E_NOT_OWNER`, `E_RESERVE_ZERO`, `E_DURATION_TOO_SHORT` |
| **Place bid** | `provenance::auction::place_bid` | `auction_obj: address, amount_uinit: u64` | **YES — sole authz scope** | balance ≥ amount, auction live, amount ≥ next-min | `E_AUCTION_ENDED`, `E_BID_TOO_LOW`, `E_INSUFFICIENT_BALANCE` |
| Finalize auction | `provenance::auction::finalize_auction` | `auction_obj: address` | No | `now > ends_at`, not yet finalized | `E_AUCTION_LIVE`, `E_ALREADY_FINALIZED` |

**`requestTxBlock` semantics.** Returns `{ transactionHash, height, code, log, ... }`. `code === 0` is success; non-zero is a chain-level rejection with the corresponding error string in `log`. The frontend maps known error codes to UX copy via `lib/chain/errors.ts`.

**Optimistic UI rule.** After a successful `requestTxBlock` we DO NOT consider the action "done" until the indexer has it. Pending state shows a subdued banner; cancellable for ~10s, then auto-clears.

### 1.3 Auto-sign authz scope (the only Initia-grant the app requests)

Granted via `autoSign.enable()` triggered by `<AutoSignToggle />`. The drawer specifies:

- **Granter:** the user's `initiaAddress`.
- **Grantee:** the InterwovenKit-managed session key (rotated per session, derived inside the kit).
- **Authorization type:** `cosmos.authz.v1beta1.GenericAuthorization` for message type `/initia.move.v1.MsgExecute` with the constraint expressed at the kit level: only calls to `provenance::auction::place_bid`. Other entry functions ARE NOT in scope; if a user attempts to sign-off-bid for `buy_now`, the wallet popup appears as normal.
- **Default expiry:** 1 hour. Drawer offers 1h / 4h / 8h / 24h. We do not allow custom > 24h.
- **Spending limit:** the kit's drawer also lets the user set a `SendAuthorization` with a per-tx spending cap. We default this to **20 INIT per bid** with a free text field for power users.
- **Revocation UX:** `<AutoSignToggle />` shows current state (`autoSign.isEnabled`); clicking when enabled calls `autoSign.disable()` which submits `MsgRevoke`; we surface the tx hash in a toast.

Failure to grant: user is bounced back to "manual bidding" — every bid pops the wallet, slower but functional.

---

## 2. Frontend ↔ Indexer (GraphQL)

The indexer exposes a single GraphQL endpoint at `https://indexer.provenance.app/graphql` (Railway). Schema is auto-generated from Ponder's schema.

### 2.1 Schema (excerpt — full schema in `indexer/ponder.schema.ts`)

```graphql
type Collection {
  id: BigInt!
  objectAddr: String!
  artistAddr: String!
  artistUsername: String                    # nullable, refreshed daily
  name: String!
  symbol: String!
  defaultRoyaltyBps: Int!
  supplyCap: BigInt
  minted: BigInt!
  metadataUri: String!
  frozen: Boolean!
  createdAt: DateTime!
  artworks(first: Int = 24, after: String, orderBy: ArtworkOrderBy): ArtworkConnection!
}

type Artwork {
  id: BigInt!
  objectAddr: String!
  collection: Collection!
  editionNo: BigInt!
  title: String!
  contentHash: String!                      # hex
  imageUri: String!
  metadataUri: String
  royaltyBps: Int!
  creatorAddr: String!
  currentOwner: String!
  mintedAt: DateTime!
  activeListing: Listing
  liveAuction: Auction
  openOffers: [Offer!]!
  giftHistory: [GiftTransfer!]!
  settlements: [Settlement!]!
}

type Listing { id: BigInt! artwork: Artwork! sellerAddr: String! priceUinit: BigInt! expiresAt: DateTime status: ListingStatus! createdAt: DateTime! closedAt: DateTime }
type Auction { id: BigInt! artwork: Artwork! sellerAddr: String! reserveUinit: BigInt! currentBidUinit: BigInt! currentBidder: String minIncrementBps: Int! endsAt: DateTime! extensionSecs: Int! status: AuctionStatus! createdAt: DateTime! finalizedAt: DateTime bids(first: Int = 50): [Bid!]! }
type Bid { id: ID! auction: Auction! bidderAddr: String! bidderUsername: String amountUinit: BigInt! placedAt: DateTime! }
type Offer { id: BigInt! artwork: Artwork! bidderAddr: String! priceUinit: BigInt! expiresAt: DateTime status: OfferStatus! }
type Settlement { id: ID! artwork: Artwork! source: SettlementSource! buyerAddr: String! sellerAddr: String! grossUinit: BigInt! royaltyUinit: BigInt! protocolFeeUinit: BigInt! sellerNetUinit: BigInt! artistAddr: String! settledAt: DateTime! }
type GiftTransfer { id: ID! artwork: Artwork! fromAddr: String! toAddr: String! occurredAt: DateTime! }

enum ListingStatus { active sold cancelled expired }
enum AuctionStatus { live finalized no_bids }
enum OfferStatus { open accepted cancelled expired }
enum SettlementSource { buy_now accept_offer auction }
enum ArtworkOrderBy { mintedAt_desc mintedAt_asc title_asc }

type Query {
  # Discovery
  hotArtworks(first: Int = 24, after: String): ArtworkConnection!
  recentMints(first: Int = 24, after: String): ArtworkConnection!
  liveAuctions(first: Int = 24, endingSoonFirst: Boolean = true): AuctionConnection!

  # Detail
  artwork(id: BigInt, objectAddr: String): Artwork
  collection(id: BigInt, objectAddr: String): Collection
  artist(addressOrUsername: String!): Artist!

  # Personal
  myArtworks(address: String!): [Artwork!]!
  myActiveBids(address: String!): [Bid!]!
  myOpenOffers(address: String!): [Offer!]!
  myEarnings(address: String!, since: DateTime): EarningsSummary!

  # Search (in v1, prefix on title/symbol/username; full text in v1.1)
  search(q: String!, first: Int = 20): SearchResult!
}

type Artist {
  addr: String!
  username: String
  collections: [Collection!]!
  artworks: [Artwork!]!
  totalRoyaltiesUinit: BigInt!
  totalSalesCount: Int!
}

type EarningsSummary {
  totalGrossUinit: BigInt!
  totalRoyaltiesUinit: BigInt!
  saleCount: Int!
  byMonth: [MonthlyBucket!]!
}

type MonthlyBucket { month: String! grossUinit: BigInt! royaltyUinit: BigInt! }

type SearchResult { artworks: [Artwork!]! artists: [Artist!]! collections: [Collection!]! }
```

### 2.2 Read paths used by each frontend page

| Page | Query | Cache key (TanStack) | Refetch trigger |
|---|---|---|---|
| `/` (Discover) | `hotArtworks(first: 24)` + `liveAuctions(first: 6)` | `['hot', 'auctions:live']` | 30s interval, on focus |
| `/artwork/[id]` | `artwork(id:)` with nested listing/auction/offers | `['artwork', id]` | 5s interval while auction live, else 60s |
| `/auction/[id]` | `artwork(id:) { liveAuction { bids(first:50) } }` | `['auction', id]` | 3s interval while live |
| `/artist/[username]` | `artist(addressOrUsername:)` | `['artist', username]` | on focus |
| `/studio` | `myArtworks(address:)` + `myEarnings(address:)` | `['studio', addr]` | on tx submit |

### 2.3 GraphQL error model

Standard errors. The frontend distinguishes:
- `INTERNAL_SERVER_ERROR` → "indexer is having trouble; data might be stale" banner.
- `BAD_USER_INPUT` → developer error, surfaced to console only.
- Empty results → empty state UI per page (not an error).

### 2.4 Rate limits

Railway free tier limits inbound to 100 req/s per indexer. We add a Cloudflare Worker proxy in front in v1.1 if the demo brings traffic. For v1, the frontend uses TanStack Query's deduplication and 30s+ stale times to keep request rate per user under 1 RPS.

---

## 3. Frontend ↔ Off-chain backend (Cloudflare Workers)

### 3.1 `POST /api/upload/presign`

**Auth:** request signed by the connected wallet. Headers:
- `X-Initia-Address: init1...`
- `X-Initia-Signature: <base64 of sig over body+timestamp>`
- `X-Initia-Timestamp: <unix seconds, must be within ±300s of server clock>`

**Body:**
```json
{ "filename": "quiet-001.png", "size": 4_192_345, "content_type": "image/png" }
```

**Server validation:**
- Signature verifies against the address — otherwise `401`.
- `size <= 25_000_000` (25MB hard cap) — otherwise `413`.
- `content_type` in allow-list (`image/png`, `image/jpeg`, `image/webp`, `image/gif`) — otherwise `415`.
- Rate-limit: 10 presigns / address / hour (in-memory KV). `429` on exceed.

**Response 200:**
```json
{
  "presigned_url": "https://account.r2.cloudflarestorage.com/provenance-art/upload/abc123?...",
  "method": "PUT",
  "headers_required": { "Content-Type": "image/png" },
  "expires_in": 300,
  "upload_id": "abc123",
  "final_url_template": "https://art.provenance.app/{content_hash}.png"
}
```

**Then:** the client PUTs the bytes directly to R2; computes `sha256` locally; renames the object server-side via a follow-up `POST /api/upload/finalize { upload_id, content_hash }` which:
- Re-reads the object, recomputes sha256, asserts match — otherwise `400`.
- Renames `upload/{upload_id}` → `art/{content_hash}.png` (R2 server-side copy + delete).
- Returns `{ image_uri: "https://art.provenance.app/{content_hash}.png" }`.

**Idempotency:** finalising the same `upload_id` twice returns the same `image_uri`.

### 3.2 `GET /api/og/{artwork_id}.png`

**Auth:** none (public).
**Behaviour:** generates a 1200×630 PNG OG image for the artwork using `@vercel/og` with the artwork title, artist username, current price, and the artwork image as the centre composition. Cached at the edge for 1 hour. Critical for shareability ("look, my piece on Provenance" links to a render that doesn't suck).
**Errors:** `404` if artwork unknown.

### 3.3 No other backend endpoints

The marketplace logic lives on-chain. No "create user," no "log in," no "save profile." Identity is `initiaAddress` (with `username` rendered when available). This is deliberate.

---

## 4. Webhook / event-driven contracts

There are no outbound webhooks in v1. All "external" notifications are polled.

The internal contract is **chain → indexer**:

```
Tendermint WebSocket (ws://rpc.provenance.app/websocket)
   │
   │ subscribe to NewBlock
   ▼
Indexer's cosmos-source adapter
   │
   │ for each block, fetch tx_results, decode events
   ▼
Ponder event queue (typed)
   │
   │ handler dispatch by event_name
   ▼
Postgres mutation
```

**Reliability contract:**
- The adapter persists `last_height` after each block batch.
- On reconnect, it resumes from `last_height + 1` via `block_results` REST.
- Events are processed exactly once (handler-level idempotency via `tx_hash UNIQUE` constraints).
- If the WebSocket disconnects mid-block, the partial work is rolled back at the Postgres transaction boundary (one tx per block, not per event).

---

## 5. Versioning strategy

### 5.1 Move modules

- The `provenance` package on the rollup is **upgradeable** at the module level (Move's standard upgrade pattern: deployer-controlled `upgrade_policy`).
- Hackathon deploy: `compatible` upgrade policy — public fns and structs may be added but not removed or changed in incompatible ways.
- Breaking changes (e.g. new field on `Artwork`) require a new module under `provenance_v2` and a migration helper. We don't expect to need this during the hackathon.

### 5.2 GraphQL schema

- **Additive changes (new fields, new types, new optional args):** ship without ceremony. No version bump needed.
- **Breaking changes (rename, remove, change non-null):** introduce parallel field with new name, mark old `@deprecated(reason: "...")`, remove after ≥ 30 days.
- No `/v1/` URL prefix needed — GraphQL handles versioning via field-level evolution.

### 5.3 REST presign endpoint

- Path is `/api/upload/presign`. Breaking changes ship at `/api/v2/upload/presign`. Old endpoint kept for 30 days minimum.

### 5.4 Frontend → wallet message types

- Auto-sign authz scope is part of the contract with the user. Adding new scopes (e.g. `accept_offer` in v1.1) is additive; the user must re-grant.

### 5.5 Compatibility commitment for the hackathon submission

What ships at submission **does not break post-submission** — the demo must be replayable in 6 months. We commit to keeping `provenance-1` rollup running for ≥ 90 days post-submission and the indexer + frontend reachable.

---

## 6. Customer-buyer review

> *Reviewing as a notional third-party developer "Frith" who wants to build a Provenance galleries app — a curated subset of Provenance artworks displayed in physical-world-like rooms. Frith should be able to integrate without DM'ing the team.*

**Frith's questions:**

1. **"Can I read all the data I need from a public endpoint?"**
   *Yes.* GraphQL is public, no API key in v1. (We add a key in v1.1 for rate-limit billing if needed.)

2. **"Can I write a transaction on a user's behalf?"**
   *No, by design.* The user signs through their own InterwovenKit instance. We don't expose any "write" backend; that would centralise control.

3. **"Can I get notified when a new artwork is minted?"**
   *In v1, you poll the GraphQL `recentMints` query.* In v1.1 we expose a webhook endpoint configurable per-API-key; documented but not required for hackathon.

4. **"What if you change the schema?"**
   *We follow GraphQL's deprecation pattern.* Old fields persist for ≥ 30 days. You'll see a deprecation warning in introspection.

5. **"Where's the Move ABI?"**
   *Published in the repo at `contracts/abi.json`* — generated by `move package abi` during CI and committed. Frith can use it with `@initia/initia.js` directly without our help.

6. **"Are there any hidden auth tokens or magic addresses I need?"**
   *No.* The `PROTOCOL_TREASURY` address is documented in `INITIA_INTEGRATION.md`. The package address is in the README. Everything else is on-chain and discoverable.

**Frith's verdict:** "Could integrate in an afternoon."

**Verdict on the API contract:** Approve. The contract is complete, the surfaces are honest about their limits, and a third party could integrate without asking us a question.
