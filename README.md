# Provenance

> **Move-based marketplace where royalties are enforced by the type system.**
> INITIATE Hackathon (HACK0016) submission.

Provenance is a Move-based MiniMove appchain on Initia where digital artworks are first-class
`Object<Artwork>` resources. Royalties are not a marketplace policy — they are a structural
property of how ownership transfers work. There is no `transferFrom` on a paid path that does
not call `royalty::settle`, because Move's resource model + friend visibility makes that path
unconstructable.

**Live (testnet):**

- App: <https://provenance.app>
- RPC: <https://rpc.provenance-1.initia.xyz>
- InitiaScan: _populated by Phase 1_
- Demo video: _populated by Phase 7_

---

## Why this exists

Lina, an illustrator, lost roughly £1,800/mo when OpenSea made royalties optional. The fix she
needs is not a marketplace that promises to pay royalties — it's a marketplace where skipping
them is structurally impossible. That's what Provenance is.

Read the customer brief in [`docs/CUSTOMER_BUYER_REVIEW.md`](docs/CUSTOMER_BUYER_REVIEW.md).

---

## What's load-bearing about Initia

Four of six Initia primitives are structural to the product, not decorative:

| Primitive | Why it's structural |
|---|---|
| **MiniMove** | Without Move resources, `Artwork` is an ERC-721 with permissionless `transferFrom` and royalties become a whitelist game. |
| **Auto-signing (authz)** | Auctions need 1-tap bids. Without it, every bid is a wallet popup and the UX collapses. |
| **`.init` usernames** | Artist identity reverts to bech32 addresses. Discoverability and trust drop materially. |
| **Interwoven Bridge** | Cross-chain buyers face manual bridging. Conversion drops ~70% (industry benchmark). |

The full justification is in [`docs/INITIA_INTEGRATION.md`](docs/INITIA_INTEGRATION.md).

---

## Architecture, in one paragraph

Next.js 15 App Router on Vercel → Ponder indexer + Postgres on Neon → Move package
(`provenance::{collection, artwork, market, auction, royalty}`) on the `provenance-1` MiniMove
rollup → Celestia mocha-4 DA → Initia L1 settlement. Images live on R2 keyed by their
`sha256` (the hash is on-chain; the bytes are not). Read the long version in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Run it locally

You need:

- [mise](https://mise.jdx.dev/) — pins Node 20, pnpm 9, just, aptos CLI 3.x
- Docker (for local Postgres during indexer development; Neon in CI)

```sh
git clone https://github.com/<org>/provenance
cd provenance
mise install            # installs pinned toolchain
just bootstrap          # installs deps, checks env, runs initial test suite
just dev                # web on :3000, indexer on :42069
```

A working `just bootstrap` from a cold checkout in under 15 minutes is a hard success
criterion for Phase 0. If it fails, that's a bug, not a documentation gap — open an
issue rather than work around it.

---

## Test discipline

- Move modules: 100% line + branch (`aptos move test --coverage`)
- Frontend unit + integration: 100% line + branch + function (Vitest)
- Indexer unit: 100% line + branch + function (Vitest)
- Five user journeys: end-to-end Playwright (mint, auction, royalty, bridge-buy, sequencer-down)
- Post-deploy smoke: Playwright against the live URL on every deploy

CI fails the PR if any gate is below 100%. Up to 5 named coverage exemptions exist in
`contracts/COVERAGE.md` and `apps/web/COVERAGE.md`. No 6th. See
[`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) §Operating Rules for the full discipline.

---

## What this is *not*

We are honest about scope. None of this is in v0.1.0:

- **Production-grade image storage.** R2 only; no IPFS mirror until v1.1.
- **Audited Move modules.** No external audit; one builder. See `docs/SECURITY_THREAT_MODEL.md`.
- **Multi-VM topology.** Single MiniMove appchain. No EVM compatibility.
- **Wash-trade detection.** Acknowledged on the customer-buyer review page.
- **Decentralised sequencer.** OPinit Stack with single sequencer, single challenger.
- **Mainnet.** Testnet (`provenance-1` on Initia `initiation-2`).

The full "what we are NOT building" list is in
[`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md#what-we-are-not-building).

---

## Repository layout

```
.
├── apps/
│   ├── web/             Next.js 15 frontend
│   └── indexer/         Ponder indexer
├── contracts/           Move package (provenance::*)
├── infra/
│   ├── hetzner/         Terraform for the rollup VM
│   └── cloud-init/      Bootstrap for the VM
├── docs/                Architecture, contracts, threat model, etc.
├── .github/workflows/   CI definitions
└── .initia/             Hackathon submission manifest
```

---

## License

- Code: MIT (see `LICENSE-CODE`)
- Documentation: CC-BY-SA 4.0 (see `LICENSE-DOCS`)

---

## Status

This is hackathon software. Six conditions stand between `v0.1.0-hackathon` and a production
release; they are enumerated on the `/status` page and in
[`docs/CUSTOMER_BUYER_REVIEW.md`](docs/CUSTOMER_BUYER_REVIEW.md).
