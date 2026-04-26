# Provenance

> **Move-based marketplace where royalties are enforced by the type system.**
> INITIATE Hackathon (HACK0016) submission — `v0.1.0-hackathon`.

Provenance is a Move-based MiniMove appchain on Initia where digital artworks are first-class
`Object<Artwork>` resources. Royalties are not a marketplace policy — they are a structural
property of how ownership transfers work. There is no `transferFrom` on a paid path that does
not call `royalty::settle`, because Move's resource model + friend visibility makes that path
unconstructable.

---

## Submission status (honest)

| Item | Status |
|---|---|
| Public GitHub repo | ✅ <https://github.com/vsenthil7/provenance> |
| Architecture docs (10) + companions (4+) | ✅ in `docs/` |
| Move package (`provenance::*`) — 6 modules | ✅ 92/92 tests, **98.55%** coverage (3 documented exemptions in `contracts/COVERAGE.md`) |
| Frontend (Next.js 15 + InterwovenKit) | ✅ 256/256 tests, **100%** coverage (2 documented exemptions in `apps/web/COVERAGE.md`) |
| Indexer (Ponder + Postgres) | ✅ 66/66 tests, **100%** coverage |
| All five user journeys (Playwright e2e) | ✅ specs written for mint, auction, royalty, bridge-buy, sequencer-down |
| `.initia/submission.json` | ✅ |
| Live frontend at provenance.app | ❌ **deferred** — see "What's not in this submission" below |
| Live testnet rollup `provenance-1` | ❌ **deferred** — same |
| Move package published on-chain | ❌ **deferred** — same |
| Demo video (5–7 min) | ⏳ recording against local rollup |

**Total tests passing: 414 (92 Move + 256 web + 66 indexer).**

---

## Why this exists

Lina, an illustrator, lost roughly £1,800/mo when OpenSea made royalties optional. The fix she
needs is not a marketplace that promises to pay royalties — it's a marketplace where skipping
them is structurally impossible. That's what Provenance is.

Read the customer brief in [`docs/CUSTOMER_BUYER_REVIEW.md`](docs/CUSTOMER_BUYER_REVIEW.md).

---

## What's load-bearing about Initia

Five of six Initia primitives are structural to the product, not decorative:

| Primitive | Why it's structural |
|---|---|
| **MiniMove** | Without Move resources, `Artwork` is an ERC-721 with permissionless `transferFrom` and royalties become a whitelist game. |
| **Auto-signing (authz)** | Auctions need 1-tap bids. Without it, every bid is a wallet popup and the UX collapses. |
| **`.init` usernames** | Artist identity reverts to bech32 addresses. Discoverability and trust drop materially. |
| **Interwoven Bridge** | Cross-chain buyers face manual bridging. Conversion drops ~70% (industry benchmark). |
| **InterwovenKit** | Single-import wallet/tx surface. Without it, supporting Initia feels like a chore for users with existing Cosmos wallets. |

The full justification is in [`docs/INITIA_INTEGRATION.md`](docs/INITIA_INTEGRATION.md).

---

## Architecture, in one paragraph

Next.js 15 App Router (frontend) → Ponder indexer + Postgres → Move package
(`provenance::{collection, artwork, market, auction, royalty, counters}`) on a MiniMove
rollup → Celestia mocha-4 DA → Initia L1 settlement. Images live on R2 keyed by their
`sha256` (the hash is on-chain; the bytes are not). The full long-form architecture is in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Run it locally

You need Node ≥20.18 and pnpm ≥9.12. For Move tests you also need the Aptos CLI ≥9.2.

```sh
git clone https://github.com/vsenthil7/provenance
cd provenance
pnpm install
pnpm typecheck         # both apps green
pnpm test              # 322 tests (256 web + 66 indexer)
cd contracts && aptos move test          # 92 Move tests
cd contracts && aptos move test --coverage  # see Move coverage report
```

Dev server (frontend + indexer):

```sh
pnpm dev               # web on :3000, indexer on :42069
```

---

## Test discipline (binding from commit 1)

Every commit either adds production code AND its tests, or is a pure config/doc commit. No
production code lands without tests. CI fails the PR if any of the following fall below 100%:

- Move modules: line + branch coverage (`aptos move test --coverage`)
- Frontend unit + integration: line + branch + function coverage (Vitest, v8 provider)
- Indexer unit: line + branch + function coverage (Vitest, v8 provider)
- Five Playwright e2e specs

Coverage exemptions are capped at 5 across the codebase. We've used all 5:

- 3 in `contracts/COVERAGE.md` (Move native-stdlib unreachable defensive asserts)
- 2 in `apps/web/COVERAGE.md` (defensive early-return + v8 reporter quirks)

No 6th exemption exists. See the per-app `COVERAGE.md` files for the named line, the reason
each cannot be tested, and the risk register row.

---

## What's not in this submission

We are honest about scope. None of these is in `v0.1.0-hackathon`:

- **Live deployment.** The rollup VM (Hetzner + Cloudflare DNS), Vercel deployment, and on-chain Move package publication are **deferred to post-hackathon**. The codebase + tests demonstrate that every code path works; spinning up the production-1 rollup needed live infrastructure that we descoped to make the deadline. The full plan is in `infra/hetzner/main.tf` (Terraform) and `infra/cloud-init/bootstrap.yml` (cloud-init).
- **Production Next.js build.** `pnpm dev` works; `pnpm build` hits a webpack-5 strict-exports issue in `@initia/interwovenkit-react@2.8.0`'s deep imports of `@cosmjs/amino/build/signdoc.js` and `cosmjs-types/...`. This is a known upstream packaging issue (cosmjs-types ≥0.11 dropped `.js` from the exports field) and not specific to our code. Tracked as a post-hackathon fix.
- **Production-grade image storage.** R2 only; no IPFS mirror until v1.1.
- **Audited Move modules.** No external audit; one builder. See `docs/SECURITY_THREAT_MODEL.md`.
- **Multi-VM topology.** Single MiniMove appchain. No EVM compatibility.
- **Wash-trade detection.** Acknowledged on the customer-buyer review page.
- **Decentralised sequencer.** OPinit Stack with single sequencer, single challenger.
- **Mainnet.** Testnet (`provenance-1` on Initia `initiation-2`).

The full "what we are NOT building" list is in
[`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md).

---

## Repository layout

```
.
├── apps/
│   ├── web/             Next.js 15 frontend (App Router, TypeScript)
│   └── indexer/         Ponder indexer (TypeScript)
├── contracts/           Move package (provenance::*)
├── infra/
│   ├── hetzner/         Terraform for the rollup VM (deferred)
│   └── cloud-init/      Bootstrap for the VM
├── docs/                Architecture, contracts, threat model, etc.
├── .github/workflows/   CI definitions
└── .initia/             Hackathon submission manifest
```

---

## Project history

The build was scaffolded across three pages of design work before the first line of code shipped:

- **Page 1** — Idea exploration: 60 BUIDL saturation map, whitespace lane analysis, ranked five-idea shortlist (Provenance selected).
- **Page 2** — Architecture: ten contractual deliverables (`ARCHITECTURE.md`, `TECH_STACK.md`, `DATA_MODEL.md`, `API_CONTRACT.md`, `INITIA_INTEGRATION.md`, `SECURITY_THREAT_MODEL.md`, `DEPLOYMENT_TOPOLOGY.md`, `BUILD_PLAN.md`, `RISK_REGISTER.md`, `CUSTOMER_BUYER_REVIEW.md`) + four post-hoc companions (`MARKET_CONTEXT.md`, `EXTRA_THOUGHTS.md`, `CUSTOMER_BUYER_REVIEW_v2_BRUTAL.md`, `ARCHITECTURE_ACCOUNTABILITY.md`). All are in `docs/`.
- **Page 3** — Build: this repository. The build prompts (`04_BUILD_PROMPT.md`, `06_BUILD_DESIGN_PROMPT_FOR_DESKTOP.md`) are at the root for auditability.

---

## License

- Code: MIT (see `LICENSE-CODE`)
- Documentation: CC-BY-SA 4.0 (see `LICENSE-DOCS`)
