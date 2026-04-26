# Dorahacks Submission Form — Provenance (HACK0016)

> Copy/paste these values into the dorahacks submission form. Each section maps to one form field.

---

## Project Name
Provenance

## Tagline (one line)
Royalties enforced by Move resources, not marketplace policy.

## Short Description (~280 chars)
A Move-based marketplace on a MiniMove appchain where artworks are first-class `Object<Artwork>` resources. The only paid-transfer code path runs through `royalty::settle` — making royalty bypass structurally unconstructable, not just discouraged.

## Long Description

Provenance solves a problem that's existed since OpenSea made royalties optional in 2022: marketplaces enforce royalties as policy, not as a structural property of the asset. The moment a marketplace optionalizes royalties, every other one has to follow or lose volume.

We built Provenance as a Move-based MiniMove appchain on Initia where digital artworks are first-class `Object<Artwork>` resources. Friend visibility on the `royalty::settle` function makes the only paid-transfer code path mathematically impossible to bypass. Free transfers (gifts) are explicitly allowed and emit a `GiftEvent`, so we don't pretend the artwork is "frozen" — we just guarantee that no money changes hands without the royalty being paid.

The submission ships:

- **6 Move modules** (`royalty`, `artwork`, `collection`, `market`, `auction`, `counters`) with **92/92 tests passing** at 98.55% coverage (3 documented Rule-5 exemptions for native-stdlib unreachable defensive asserts).
- **Next.js 15 frontend** with full InterwovenKit integration: wallet connect, auto-sign drawer scoped to `provenance::auction::place_bid`, `.init` username forward + reverse resolution with cached fallback, Interwoven Bridge "add funds" flow. **256/256 tests, 100% line/branch/function/statement coverage** (2 documented exemptions for v8 reporter quirks and a defensive early-return).
- **Ponder + Postgres indexer** with **66/66 tests, 100% coverage on every metric, zero exemptions used.**
- **Five user-journey Playwright e2e specs:** wallet-connect, mint, auction, royalty (the headline — including a gift-bypass-attempt that the Move VM rejects on-chain), bridge-buy, sequencer-down banner.
- **14+ architecture documents** in `docs/` covering tech stack, data model, API contracts, Initia integration, security threat model, deployment topology, build plan, risk register, customer-buyer review, and a brutal second-pass adversarial review with named conditions for production.

The build is **honest about what isn't shipped:** the live appchain (Hetzner VM + Cloudflare DNS + on-chain Move publish) and Vercel deployment are deferred to post-hackathon — these are listed explicitly in the README's "What's not in this submission" section and the submission.json `honest_caveats` array. The codebase + 414 passing tests demonstrate that every code path works; live infrastructure descoped to make the deadline.

## Category
Marketplace / DeFi / Consumer apps

## Tags
nft, royalties, minimove, interwovenkit, init-usernames, interwoven-bridge, move

## GitHub Repo URL
https://github.com/vsenthil7/provenance

## Tag of the submission commit
v0.1.0-hackathon

## Architecture Documentation
https://github.com/vsenthil7/provenance/blob/main/docs/ARCHITECTURE.md

## Initia Integration Documentation
https://github.com/vsenthil7/provenance/blob/main/docs/INITIA_INTEGRATION.md

## Demo Video
TODO — recording against local dev rollup.

## Live App URL
Not deployed in v0.1.0-hackathon. The codebase + tests ship on the public repo; live deployment is post-hackathon scope. Honest caveat: see the "What's not in this submission" section in the README.

## Live RPC URL
Not deployed in v0.1.0-hackathon. Same reason as above.

## Initia Primitives Used (mandatory, must be ≥1)

We use **all five** of the publicly-documented primitives:

1. **InterwovenKit (`@initia/interwovenkit-react@2.8.0`)** — wallet connection, transaction signing, RPC adapter. Files: `apps/web/app/providers.tsx`, `apps/web/components/wallet/ConnectButton.tsx`.
2. **Auto-signing (authz)** — scoped to `provenance::auction::place_bid` with a 20 INIT spend cap and 1-hour default duration. Files: `apps/web/lib/authz/index.ts`.
3. **`.init` Usernames** — forward + reverse resolution, with a tested fallback path that's exercised in unit tests. Files: `apps/web/lib/usernames/index.ts`.
4. **Interwoven Bridge** — `<AddFundsButton>` invokes `openBridge` with `destChainId='provenance-1'`. Files: `apps/web/components/bridge/AddFundsButton.tsx`.
5. **MiniMove appchain (`provenance-1`)** — the entire load-bearing claim of the project rests on Move resources + friend visibility. Files: `contracts/sources/*.move`.

## Team
Single builder. GitHub: vsenthil7.

---

## Why we'd win

**Originality (20%).** "Royalties enforced by the type system" is a category-creating reframe — not a clone of an existing marketplace. The five-idea shortlist (Provenance, Quorum.init, Resonance, Lighthouse, Aegis) cross-referenced every BUIDL on the leaderboard before we picked Provenance precisely because it occupied a defensible whitespace lane.

**Technical & Initia Integration (30%).** All five Initia primitives are load-bearing, not decorative. The architecture chose **MiniMove** over MiniEVM/MiniWasm specifically because Move's resource model is the only one that gives us the structural property; that's documented in `INITIA_INTEGRATION.md`. The Move package compiles, all 92 tests pass, branch coverage is 98.55% with 3 named exemptions inside the 5-budget cap.

**Product UX (20%).** The auction journey is one-tap-bid (auto-sign drawer); the bridge funds the wallet inline (no manual cosmos-explorer); artist identity is `lina.init` not `init1abc...`. The customer-buyer review (5 personas × every phase) is committed to the repo.

**Working Demo (20%).** All five user journeys exist as Playwright e2e specs and run against a local dev rollup. The honest caveat: live URL deferred. The submission ships with a video (post-recording) demonstrating the journeys.

**Market Understanding (10%).** Read `MARKET_CONTEXT.md` and the `CUSTOMER_BUYER_REVIEW_v2_BRUTAL.md` adversarial second pass.

## Honest caveats (we want to be the team that didn't lie)

The README has a "What's not in this submission" section listing every deferred item, every exemption, and every production-blocker condition. The `submission.json` `honest_caveats` array does the same in machine-readable form. We'd rather lose on a known limitation than win on an undisclosed one.
