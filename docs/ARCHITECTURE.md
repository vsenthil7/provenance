# ARCHITECTURE.md — Provenance

**Project:** Provenance — protocol-enforced royalty marketplace for digital art
**Hackathon:** INITIATE (HACK0016), Initia ecosystem
**Document version:** 1.0 (Architecture page, 25 April 2026)
**Status:** Customer-buyer reviewed — see closing section

---

## 0. Selected idea (locked)

**Provenance** is a Move-based Initia rollup where every digital artwork is a first-class on-chain `Object<Artwork>` resource and every transfer routes through a single protocol-level settlement function that pays the artist's royalty before the seller receives a cent. The marketplace supports primary mints (artist → collector), English auctions, fixed-price listings, and offers. Artists are identified by their `.init` username, not an `init1…` bech32 string. Buyers fund purchases from any chain Skip Go supports through the Interwoven Bridge widget. Active bidders pre-grant an authz session key (auto-sign) so they can place bids in an auction without confirming every transaction in their wallet.

The customer is the **mid-tier digital artist** earning a meaningful (but not lottery-grade) income from secondary sales — the artist for whom OpenSea's optional 2024 royalty model meant a real pay-cut. They pay nothing to mint; they pay the protocol a 0.5% fee on settlement; they keep their 5–10% royalty enforced by the chain itself.

Initia is load-bearing because every primitive in the stack maps to a non-cosmetic problem: Move resources prevent the "skip the royalty by transferring outside the marketplace" attack that sank the EVM royalty model; the rollup gives us the deterministic ordering we need for fair auction settlement; auto-signing makes auctions feel like eBay; `.init` usernames make artist identity portable across the ecosystem; and the Interwoven Bridge means a buyer with USDC on Ethereum can buy a piece priced in INIT in one click.

---

## 1. System context diagram (C4 level 1)

```
                          ┌─────────────────────────────────────────┐
                          │            EXTERNAL ECOSYSTEM           │
                          ├─────────────────────────────────────────┤
                          │ Initia L1 (initiation-2)                │
                          │   └─ OPHost module (bridge anchor)      │
                          │ Celestia (DA)                           │
                          │ Skip Go API (bridge router)             │
                          │ R2 / S3 (image storage, signed URLs)    │
                          │ Initia Username service (.init)         │
                          │ InitiaScan (block explorer)             │
                          └─────────────────────────────────────────┘
                                      ▲          ▲          ▲
                                      │          │          │
                                      │ output   │ DA blobs │ bridge
                                      │ roots    │          │ flows
                                      │          │          │
                          ┌───────────┴──────────┴──────────┴───────┐
                          │            PROVENANCE SYSTEM            │
                          ├─────────────────────────────────────────┤
                          │  Provenance Rollup (MiniMove appchain)  │
                          │    ├─ provenance::collection module     │
                          │    ├─ provenance::artwork    module     │
                          │    ├─ provenance::market     module     │
                          │    ├─ provenance::auction    module     │
                          │    └─ provenance::royalty    module     │
                          │  OPinit Executor bot                    │
                          │  OPinit Challenger bot                  │
                          │  IBC Relayer                            │
                          │  Indexer (Ponder, Postgres-backed)      │
                          │  Frontend (Next.js, Vercel)             │
                          │  Image pipeline (Cloudflare Worker)     │
                          └─────────────────────────────────────────┘
                                          ▲          ▲
                                          │          │
                                  ┌───────┴───┐  ┌───┴────────┐
                                  │  Artist   │  │  Collector │
                                  │ (web app, │  │ (web app,  │
                                  │  Initia   │  │  Initia    │
                                  │  Wallet)  │  │   Wallet)  │
                                  └───────────┘  └────────────┘
```

**Trust boundaries.** The dashed line is between code we control (frontend, contracts, indexer, bots) and code we don't (Initia L1, Celestia, Skip Go, R2). We assume Initia L1 is honest-majority; we assume Celestia is live; we assume Skip Go's routing is best-effort and degrade gracefully on failure.

---

## 2. Container diagram (C4 level 2)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROVENANCE — RUNTIME CONTAINERS                    │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────┐     wagmi+InterwovenKit      ┌──────────────────────┐
  │ Frontend             │ ───────────────────────────▶ │ Provenance Rollup    │
  │ Next.js 15 / RSC     │   read: useQuery via         │ (MiniMove, single    │
  │ Tailwind + shadcn    │     RESTClient + indexer     │  sequencer)          │
  │ Zustand + TanStack   │   write: requestTxBlock      │  chain-id:           │
  │ Vercel-hosted        │     authz: autoSign.enable   │   provenance-1       │
  └──────────┬───────────┘                              └──────────┬───────────┘
             │                                                     │
             │  GraphQL                                             │  events
             ▼                                                     ▼
  ┌──────────────────────┐                              ┌──────────────────────┐
  │ Indexer (Ponder)     │ ◀── tendermint websocket ────│ Sequencer            │
  │ Postgres on Neon     │     subscribes to NewBlock,  │ minitiad daemon      │
  │ GraphQL on Railway   │     decodes Move events      │ Hetzner CX22         │
  └──────────────────────┘                              └──────────┬───────────┘
                                                                   │
             ┌─────────────────────────────────────────────────────┤
             │                                                     │
             ▼                                                     ▼
  ┌──────────────────────┐                              ┌──────────────────────┐
  │ Executor bot         │                              │ Challenger bot       │
  │ opinit-bots, Hetzner │ ───── output roots ────▶     │ opinit-bots          │
  │ deposits L1→L2,      │                              │ separate Hetzner host│
  │ withdrawals L2→L1    │                              │ challenges if dispute│
  └──────────────────────┘                              └──────────────────────┘

  ┌──────────────────────┐                              ┌──────────────────────┐
  │ IBC Relayer          │                              │ Image pipeline       │
  │ hermes / weave       │                              │ Cloudflare Worker +  │
  │ relays transfer +    │                              │ R2 (signed PUT URLs, │
  │ nft-transfer + oracle│                              │ public GET URLs)     │
  └──────────────────────┘                              └──────────────────────┘
```

**Why a separate indexer.** The Move VM emits events every block, but parsing those at the wallet/RSC level is too slow for a marketplace UI (sub-second listing pages, "what's hot now" feeds). Ponder gives us a typed, replayable, in-process event indexer with first-class TypeScript and a GraphQL surface. We could write a custom Go indexer; we choose not to because Ponder's ergonomics save 4–6 build hours and the cost of being wrong is "slow page loads," not "lost funds."

**Why a separate image pipeline.** On-chain we store an `image_uri` only. We do not store image bytes on-chain (gas) and we do not store them on IPFS (latency, pinning fragility). We use R2 because Cloudflare's egress is free, the signed-PUT pattern means artists upload directly without our backend touching the bytes, and content addressing (sha256 of the bytes appended to the path) gives us pseudo-immutability without the IPFS pinning headache.

---

## 3. Component diagrams

### 3.1 Provenance Rollup — Move modules

```
provenance::
├── collection.move
│   ├── struct Collection has key { name, symbol, artist_addr, default_royalty_bps, metadata_uri, mutable_metadata, supply_cap, minted, frozen }
│   ├── public entry create_collection(creator, ...)
│   ├── public entry freeze_collection(creator, collection_obj)
│   └── public(friend) increment_supply(collection_obj, by)
│
├── artwork.move
│   ├── struct Artwork has key { collection, edition_no, title, content_hash, image_uri, metadata_uri, royalty_override_bps: Option<u64>, created_at }
│   ├── public entry mint(artist, collection_obj, title, content_hash, image_uri, metadata_uri, royalty_override_bps)
│   └── public(friend) view_royalty_bps(artwork_obj): u64
│
├── market.move
│   ├── struct Listing has key { artwork, seller, price_uinit, expires_at, active }
│   ├── struct Offer   has key { artwork, bidder, price_uinit, expires_at }
│   ├── public entry list_fixed(seller, artwork_obj, price, expires_at)
│   ├── public entry buy_now(buyer, listing_obj)
│   ├── public entry make_offer(bidder, artwork_obj, price, expires_at)
│   ├── public entry accept_offer(seller, offer_obj)
│   └── public entry cancel_listing(seller, listing_obj)
│
├── auction.move
│   ├── struct Auction has key { artwork, seller, reserve_price, current_bid, current_bidder, ends_at, finalized }
│   ├── public entry create_auction(seller, artwork_obj, reserve, duration_secs)
│   ├── public entry place_bid(bidder, auction_obj, amount)        // <-- target of autosign
│   └── public entry finalize_auction(any, auction_obj)            // anyone can call after ends_at
│
└── royalty.move
    ├── const PROTOCOL_FEE_BPS: u64 = 50    // 0.5%
    ├── const PROTOCOL_TREASURY: address = @provenance_treasury
    └── public(friend) settle(artwork_obj, gross_amount, seller, buyer)
        // splits gross_amount into (artist_royalty, protocol_fee, seller_proceeds)
        // transfers Coin<INIT> to each recipient atomically
        // emits SettlementEvent(artwork, gross, royalty, fee, proceeds, ts)
        // all transfer paths in market & auction call this — no other path exists
```

**Royalty enforcement model.** The `Artwork` resource cannot be moved by an arbitrary `0x1::object::transfer_call` because we use `Object<Artwork>` with the `provenance::artwork` module as the only holder of the friend capability that can change ownership in a sale context. Free transfers (gifts, wallet-to-wallet) ARE allowed but emit `GiftEvent` and bypass royalty by design — gifting was never the attack vector. The attack vector ("trade the NFT outside the marketplace at a fake $1 price to dodge royalties") is closed because there is no permissionless transfer path that simultaneously moves money — the only way to swap ownership for INIT is through `royalty::settle`.

### 3.2 Frontend — module layout

```
apps/web/
├── app/                           # Next.js 15 App Router
│   ├── layout.tsx                 # InterwovenKitProvider wraps tree
│   ├── (public)/
│   │   ├── page.tsx               # Discover / hot now
│   │   ├── artwork/[id]/page.tsx
│   │   ├── auction/[id]/page.tsx
│   │   └── artist/[username]/page.tsx
│   ├── (authed)/
│   │   ├── studio/page.tsx        # Artist mint flow
│   │   ├── studio/collections/    # CRUD collections
│   │   └── settings/page.tsx      # Manage autosign session, see grants
│   └── api/
│       ├── upload/route.ts        # Issues signed-PUT URL for R2
│       └── og/[id]/route.ts       # OG-image generator for socials
├── lib/
│   ├── chain/
│   │   ├── client.ts              # RESTClient instance, REST_URL, RPC_URL
│   │   ├── tx/                    # builders for each MsgExecute
│   │   │   ├── mint.ts
│   │   │   ├── list.ts
│   │   │   ├── buy.ts
│   │   │   ├── bid.ts
│   │   │   └── createAuction.ts
│   │   └── decode.ts              # event → typed object
│   ├── indexer/
│   │   ├── client.ts              # GraphQL client (urql)
│   │   └── queries.ts             # hot, by_artist, by_id, my_bids, ...
│   ├── upload/
│   │   ├── presign.ts             # client→/api/upload
│   │   └── hash.ts                # sha256 of file bytes
│   └── stores/
│       └── ui.ts                  # Zustand: drawers, modals, transient UI
└── components/
    ├── wallet/
    │   ├── ConnectButton.tsx      # uses openConnect from useInterwovenKit
    │   ├── BridgeButton.tsx       # uses openBridge
    │   └── AutoSignToggle.tsx     # uses autoSign.enable / disable
    ├── art/
    │   ├── ArtworkCard.tsx
    │   └── BidPanel.tsx
    └── shell/
        └── Header.tsx             # shows username || shortenAddress(initiaAddress)
```

### 3.3 Indexer — module layout

```
indexer/
├── ponder.config.ts              # network, contracts, block range
├── ponder.schema.ts              # Drizzle-style schema
├── src/
│   ├── handlers/
│   │   ├── collection.ts         # CollectionCreatedEvent → DB
│   │   ├── artwork.ts            # ArtworkMintedEvent
│   │   ├── market.ts             # ListingCreated, BuyExecuted
│   │   ├── auction.ts            # AuctionCreated, BidPlaced, AuctionFinalized
│   │   ├── royalty.ts            # SettlementEvent → analytics rollup
│   │   └── transfer.ts           # GiftEvent (provenance trail)
│   └── api/
│       └── graphql.ts            # auto-generated from schema
└── migrations/
```

Ponder doesn't natively speak the Cosmos/Move event format. The bridge: a thin adapter in `src/lib/cosmos-source.ts` subscribes to the rollup's WebSocket, decodes Move events using `@initia/initia.js`'s BCS deserializers, and feeds them into Ponder's event queue as if they were EVM logs. This is the riskiest custom code in the system; it has its own test suite (mock chain → known event stream → assert DB state).

---

## 4. Data flow diagrams (5 critical journeys)

### 4.1 Journey: Artist creates collection and mints artwork

```
Artist                Frontend                R2 (Cloudflare)         Rollup (MiniMove)
  │                      │                          │                       │
  │ "Mint" button        │                          │                       │
  ├─────────────────────▶│                          │                       │
  │                      │  POST /api/upload        │                       │
  │                      ├─────────────────────────▶│                       │
  │                      │  signed PUT URL          │                       │
  │                      │◀─────────────────────────┤                       │
  │  (browser uploads    │                          │                       │
  │   file directly)     ├─────────────────────────▶│                       │
  │                      │                          │  store at             │
  │                      │  computes sha256         │  /art/{sha256}.png    │
  │                      │  builds metadata.json    │                       │
  │                      ├─────────────────────────▶│ store metadata        │
  │  signs MsgExecute    │                          │                       │
  │  collection::create  │  requestTxBlock(...)     │                       │
  │◀─────────────────────┤─────────────────────────────────────────────────▶│
  │                      │                          │                       │ creates
  │                      │                          │                       │ Collection
  │                      │                          │                       │ resource
  │  signs MsgExecute    │                          │                       │
  │  artwork::mint       │  requestTxBlock(...)     │                       │
  │◀─────────────────────┤─────────────────────────────────────────────────▶│
  │                      │                          │                       │ creates
  │                      │                          │                       │ Artwork
  │                      │                          │                       │ resource +
  │                      │                          │                       │ ArtworkMintedEvt
  │                      │  poll indexer            │                       │
  │                      ├─────────────────────────────────────────────────▶│
  │  "Live on Provenance"│                          │                       │
  │◀─────────────────────┤                          │                       │
```

**Failure modes:**
- Upload succeeds, mint fails → orphan blob in R2. Reaper job (cron, daily) deletes blobs without an on-chain reference > 24h old.
- Mint succeeds, upload failed → impossible by ordering (we mint AFTER upload completes), but defended by storing `image_uri` only after PUT 200.
- Indexer lag → frontend polls for 10s with exponential backoff, then renders optimistically from the tx receipt.

### 4.2 Journey: Buyer wins auction (auto-signed)

```
Buyer       Frontend           InterwovenKit            Rollup
  │            │                    │                     │
  │ Connect    │                    │                     │
  ├───────────▶│ openConnect()      │                     │
  │            ├───────────────────▶│                     │
  │            │                    │ Initia Wallet popup │
  │ "Enable    │                    │                     │
  │  bidding"  │                    │                     │
  ├───────────▶│ autoSign.enable()  │                     │
  │            ├───────────────────▶│                     │
  │            │                    │ Drawer: scope =     │
  │            │                    │  provenance::auction│
  │            │                    │  ::place_bid only,  │
  │            │                    │  expires in 1h      │
  │            │                    │ User confirms ──────┼─▶ MsgGrant authz
  │ View       │                    │                     │
  │ auction    │                    │                     │
  │            │                    │                     │
  │ Slide bid  │                    │                     │
  │ to 12 INIT │                    │                     │
  ├───────────▶│ requestTxBlock(    │                     │
  │            │  place_bid(...))   │                     │
  │            │                    │ AUTHZ MATCH:        │
  │            │                    │ no popup, just      │
  │            │                    │ broadcasts ─────────┼─▶ BidPlacedEvt
  │ See "your  │                    │                     │
  │ bid is     │                    │                     │
  │ leading"   │                    │                     │
  │◀───────────┤                    │                     │
  │ Repeat 5x  │                    │                     │
  │ as bids    │                    │                     │
  │ go up      │                    │                     │
  │ ...        │                    │                     │
  │            │                    │                     │ ends_at hits
  │            │ anyone calls       │                     │
  │            │ finalize_auction   │                     │
  │            ├───────────────────────────────────────────▶ royalty::settle
  │ "Won! Art  │                    │                     │ INIT moves
  │  in your   │                    │                     │ Artwork transferred
  │  wallet"   │                    │                     │ AuctionFinalizedEvt
  │◀───────────┤                    │                     │
```

**Failure modes:**
- Auto-sign expired mid-auction → next bid pops the wallet for re-grant. We surface a banner at 80% of TTL warning to extend.
- User outbid → frontend shows "outbid" toast within 2s of indexer pickup; previous bid escrow is automatically refunded by `place_bid` before accepting the new bid.
- Tx ordering tie → MiniMove single sequencer guarantees first-come-first-serve at gRPC; we explicitly do NOT promise fairness against an attacker co-located with the sequencer (see SECURITY_THREAT_MODEL §5).

### 4.3 Journey: Cross-chain purchase via Interwoven Bridge

```
Buyer (USDC on Ethereum)    Frontend         InterwovenKit         Skip Go        Provenance
  │                            │                  │                  │              │
  │ Click "Buy now (12 INIT)"  │                  │                  │              │
  ├───────────────────────────▶│                  │                  │              │
  │                            │ check balance    │                  │              │
  │                            │ on provenance-1  │                  │              │
  │                            │ → 0 INIT         │                  │              │
  │                            │                  │                  │              │
  │                            │ openBridge({     │                  │              │
  │                            │   target_chain,  │                  │              │
  │                            │   amount: 12i,   │                  │              │
  │                            │   on_complete    │                  │              │
  │                            │ })               │                  │              │
  │                            ├─────────────────▶│ bridge widget    │              │
  │  picks USDC@ethereum       │                  │ opens, routing   │              │
  │  signs ETH tx              │                  │ via CCTP+IBC+swap│              │
  │  approves USDC             │                  ├─────────────────▶│              │
  │                            │                  │                  │ executes     │
  │                            │                  │                  │ multi-leg    │
  │                            │                  │                  │ route        │
  │                            │                  │ INIT lands on    │              │
  │                            │                  │ provenance-1     │              │
  │                            │ on_complete fires│                  │              │
  │                            │ → buy_now(...)   │                  │              │
  │                            ├──────────────────────────────────────────────────▶│
  │                            │                  │                  │              │ settle()
  │                            │                  │                  │              │ artwork→buyer
  │                            │                  │                  │              │ INIT split
  │ "Yours."                   │                  │                  │              │
  │◀───────────────────────────┤                  │                  │              │
```

**Failure modes:**
- Bridge fails mid-route → Skip Go's recovery is "stuck on intermediate chain"; we show a "your funds are on chain X, click here to retry" surface. We do NOT claim funds are safe — we say where they are.
- Bridge succeeds but listing was bought by someone else in the interim → buy_now reverts, INIT stays in wallet, we show "this piece sold while your bridge was settling. Browse similar →".
- Bridge UX takes 2–8 minutes; during that window we lock the listing UI for THIS user only (optimistic) but the on-chain listing remains open to all (we cannot lock the chain). This is by design — the alternative (chain-level reservation) is grief-attackable.

### 4.4 Journey: Secondary resale (royalty enforcement is the headline)

```
Collector A            Rollup                   Royalty module           Artist
  │                      │                          │                       │
  │ list_fixed(art, 100i)│                          │                       │
  ├─────────────────────▶│ Listing created          │                       │
  │                      │                          │                       │
                          ─── Some time later ───
  │ (Collector B)        │                          │                       │
  │ buy_now(listing)     │                          │                       │
  ├─────────────────────▶│ market::buy_now invokes  │                       │
  │                      │ royalty::settle(art, 100)├──────────────────────▶│
  │                      │                          │ artist gets 8 INIT    │
  │                      │                          │ (royalty 8% override) │
  │                      │ treasury gets 0.5 INIT   │                       │
  │                      │ Collector A gets 91.5    │                       │
  │                      │ Artwork → Collector B    │                       │
  │                      │ SettlementEvent emitted  │                       │
```

**Why this is the 80% of the demo's emotional payoff.** OpenSea's 2024 royalty climbdown ("optional royalties") happened because EIP-2981 is a hint, not a constraint. On Move, the artwork object's only money-paid-transfer path lives inside our module, and our module always calls `settle`. The demo shows side-by-side: same secondary sale, OpenSea pays 0%, Provenance pays 8%, atomic, no marketplace can opt out because there is only one marketplace path.

### 4.5 Journey: Sequencer down → user-facing degradation → recovery

```
t=0          Sequencer healthy. Mints, bids, buys all complete.
t=5m         Sequencer process crashes (bug / OOM / etc).
t=5m+5s      Frontend's read path (RESTClient) → 502. Indexer's WebSocket disconnects.
t=5m+10s     Frontend banner: "Provenance is reconnecting. New listings paused. Reads
             served from indexer cache (last block 102932)."
t=5m+15s     Auctions ending in this window: visible as "settling" — finalize_auction
             cannot run until sequencer is back. We do NOT show a fake finalize.
t=5m+30s     Operator (us) notices via Grafana alert. systemd auto-restarts. Chain
             resumes from last committed block (data dir on persistent volume).
t=6m         Sequencer healthy again. Frontend reconnects. Indexer catches up.
             finalize_auction calls fire for any auctions that crossed ends_at during
             outage; auctions that were ALREADY finalized are unaffected.
t=6m+30s     Banner clears. Mints, bids, buys resume.
```

**Brutal honesty.** Single-sequencer rollups are not censorship-resistant; if our sequencer is down, the chain is down. For a marketplace this is an availability problem, not a safety problem (no one's NFT is at risk). We document this in `SECURITY_THREAT_MODEL.md` and on the product itself — the customer-buyer signs off on it because the alternative (multi-sequencer L2) is not on the table for the OPinit Stack today.

---

## 5. Cross-cutting concerns

### 5.1 Observability

- **Logging.** Structured JSON logs via `pino` for the indexer and image worker; minitiad logs to systemd journal. Aggregated to Better Stack (free tier ≤ 1GB/mo, sufficient for the demo + 100 users).
- **Metrics.** Prometheus exporters on minitiad, executor, challenger, indexer. Grafana Cloud free tier (10k series). Dashboards for: sequencer block time, executor lag, challenger heartbeat, indexer head delta, GraphQL p95.
- **Tracing.** OpenTelemetry on the Next.js API routes only — overkill on chain itself for hackathon; we add it post-MVP.
- **Alerting.** Grafana Cloud alerts → PagerDuty free tier (5 users). Page on: sequencer block time > 10s for 1m, executor lag > 5 batches, challenger missing heartbeat > 10m, indexer head delta > 50 blocks.

### 5.2 Error handling and idempotency

- **Frontend tx writes.** Every `requestTxBlock` is wrapped in a single retry on `ECONNRESET` only. Logical-error responses (insufficient funds, sequence mismatch) bubble straight to the user with an actionable copy.
- **Indexer.** Ponder events are processed exactly once via the block-height cursor stored in Postgres. On crash, replay from cursor; handlers are idempotent (`INSERT … ON CONFLICT (event_uid) DO NOTHING`).
- **Image upload.** The signed-PUT URL is single-shot, 5-minute TTL. Client retries the whole flow (re-presign + re-upload) on failure; no resumable uploads in v1.
- **Bridge.** Skip Go's internal idempotency is trusted; we render the route ID and a "open in skipgo dashboard" link as the user's recourse.

### 5.3 Transaction lifecycle

```
Frontend              Sequencer             Indexer              UI updated
  │ build msg            │                     │                       │
  │ sign (or authz auto) │                     │                       │
  ├────POST broadcast───▶│                     │                       │
  │                      │ CheckTx OK ────────▶│ (mempool ignored,     │
  │ tx_hash returned     │                     │  we wait for block)   │
  │◀─────────────────────┤                     │                       │
  │ poll block N         │ block N committed   │                       │
  ├──poll /block_results─▶                     │                       │
  │                      │                     │ NewBlock(N) ──────────▶ handlers run
  │                      │                     │ DB updated            │
  │ poll indexer for     │                     │                       │
  │ event_uid            │                     │                       │
  ├─────────────────────────────────────────────▶                      │
  │ event found          │                     │                       │
  │◀─────────────────────────────────────────────                      │
  │ swap optimistic UI   │                     │                       │
  │ for canonical state  │                     │                       │
```

**Optimistic UI rule.** Between "tx submitted" and "indexer caught up" we render the pending state from the tx receipt only — never from local state alone. This is so a refresh during the gap doesn't show ghost data.

### 5.4 Retries

- Reads (RESTClient, indexer): TanStack Query default retry — 3 attempts, exponential backoff capped at 8s.
- Writes: at most once. We do NOT silently retry write-paths; surfacing failure to the user is correct.

---

## 6. Non-functional requirements

| NFR | Target | How measured | If we miss it |
|---|---|---|---|
| Listing page TTFB | < 800ms p95 | Vercel Analytics | Page is unusable; investigate indexer/db before ship |
| Place-bid round-trip | < 3s (signed) / < 1s (autosign) | Frontend RUM marks | Auctions feel laggy; not a deal-breaker for demo |
| Sequencer block time | ~1.5s, < 3s p99 | Prometheus | Adjust block_max_gas in app.toml |
| Executor lag | < 60s | Prometheus | Investigate L1 RPC; not user-visible |
| Indexer head delta | < 5 blocks | Prometheus | UI shows stale data; auto-banner kicks in at >20 |
| Frontend uptime | 99% (hackathon = best-effort) | Vercel + UptimeRobot | Demo risk — see RISK_REGISTER R-DEM-01 |
| Rollup uptime | 95% (single sequencer, see §4.5) | UptimeRobot ping | Documented & visible in product |
| Royalty enforcement | 100% (every paid transfer routes through `royalty::settle`) | Move tests + invariant | Bug-class showstopper — fix before ship |
| Auto-sign expiry | ≤ 1 hour default, max 24h | Configured in InterwovenKitProvider | None — hardcoded in UI |
| Bridge success rate | n/a (we don't own it) | Skip Go status page | Show "bridge unavailable" banner |

**Security posture.** Public testnet only; no real money in the hackathon submission. Every endpoint is rate-limited (Vercel 100 req/10s/IP defaults are sufficient). No user PII is collected — we render `username || initiaAddress` and that's the entire identity surface.

---

## 7. Customer-buyer review

> *Reviewing as Lina, a 32-year-old illustrator earning ~£1,800/mo on commissions and ~£600/mo on secondary NFT sales (which dropped from ~£2,400/mo when OpenSea made royalties optional in 2024). She has shipped one drop, has 600 collectors, and would consider switching marketplaces only if (a) royalties are bulletproof, (b) her collectors aren't asked to learn anything new, and (c) she can keep her existing audience.*

### What Lina likes about this architecture

1. **The royalty enforcement is mechanical, not voluntary.** "Move resources prevent permissionless paid transfers" is a sentence I can show my collector base. It is the difference between a promise and a guarantee.
2. **`.init` username on the artist page.** "lina.init" looks like a real handle. It's portable across Initia's ecosystem; my discord audience can find me without me explaining bech32.
3. **Auto-signed bidding.** I've watched my collectors lose auctions because they were AFK during the wallet popup window. Eliminating that friction is the difference between "novelty" and "I'd actually use this."
4. **Bridge from any chain.** My audience is split between Ethereum-USDC people and Solana-USDC people. If the buy button works for both without me explaining, that's a 2× addressable market.
5. **The architecture is honest about the single-sequencer limitation** (§4.5). I'd rather know now than during my first sold-out drop.

### What Lina would push back on

1. **"R2 with signed URLs" is centralized image storage.** If Cloudflare nukes the bucket, my artworks lose their image — even though the on-chain pointer survives. *Response:* the architecture mitigates this by storing the sha256 content hash on-chain (so anyone can rehost) and by publishing a signed mirror to IPFS via web3.storage in v1.1; for v1 we accept this risk and document it in product (as is now standard for most NFT projects, including Sotheby's Metaverse). **This is the architecture's biggest honest weakness.**
2. **Single sequencer is a single point of failure.** *Response:* documented in §4.5 and SECURITY_THREAT_MODEL §6. The OPinit Stack does not currently support multi-sequencer rollups; this is the same trade-off every Initia rollup makes today, and it's a chain-level limitation, not an architecture failure.
3. **Auto-sign is scoped to `place_bid` only — what if I want to also auto-accept-offers as I drive?** *Response:* the architecture supports adding more authz scopes; the v1 scope is intentionally minimal because every additional scope is an additional thing a stolen session key can do. Additional scopes ship in v1.1 once we've watched real auction sessions.
4. **No mobile app.** *Response:* the frontend is a Next.js PWA; on mobile it works but feels like a website. Native is post-MVP.
5. **What happens to my royalty if Provenance shuts down?** *Response:* the rollup is its own chain; if our team disappears, the modules continue executing. The frontend going offline would mean buyers couldn't access the marketplace, but anyone could spin up a new frontend against the same chain, and your royalties on the existing marketplace's resales continue mechanically. We commit to publishing a "sovereign frontend" guide in the README before submission.

### Verdict

**Conditional Approve.** Conditions to be addressed in subsequent docs:
- DATA_MODEL must show the content_hash field is on-chain so rehosting is possible.
- INITIA_INTEGRATION must specify the exact authz scope and expiration behaviour.
- DEPLOYMENT_TOPOLOGY must show the R2-only image story explicitly with a note about post-MVP IPFS mirror.
- SECURITY_THREAT_MODEL must address sequencer collusion with bidders (front-running auctions).

These conditions roll forward and will be ticked off as each subsequent file is delivered.
