# Judge FAQ

Questions we expect from judges, with honest, source-linked answers.

---

### "Is the royalty enforcement actually structural, or is this just a marketplace policy?"

It's structural. The enforcement comes from three Move properties applied
together:

1. `Artwork` is an `Object<T>` resource. Resources cannot be duplicated,
   dropped, or moved without explicit `move_to` / `move_from` calls.
2. The helper that transfers `Artwork` ownership in exchange for `Coin<INIT>`
   is `provenance::artwork::transfer_via_settle` and has `friend` visibility,
   restricted to `provenance::royalty`.
3. `provenance::royalty::settle` is the only function that calls
   `transfer_via_settle`, and it always pays the royalty before doing so.

The free-transfer path (`gift`) emits `GiftEvent` and takes no payment. There
is no third path. Read `contracts/sources/royalty.move` for the implementation
and `docs/DATA_MODEL.md` §1.2 for the impossibility argument in prose.

**Demo proof:** the `/transfer` page in the live app lets you click "Attempt
royalty bypass" — the Move call reverts and the UI shows the revert reason.

---

### "Why MiniMove and not MiniEVM?"

The product's headline differentiation is non-circumventable royalties. On
EVM, you ship either a transfer-hook whitelist game (ERC-721C) or a wrapped-
token vault that destroys composability. Neither is a real solution; both
collapse the moment a new royalty-skipping marketplace appears. Move's
resource model + friend visibility makes circumvention unconstructable at
the type level. That changes the value proposition for artists from "we
promise" to "we can't betray you."

Full justification: `docs/TECH_STACK.md` Layer 2.

---

### "What Initia primitives are load-bearing vs decorative?"

Four of six are load-bearing:

- **MiniMove** — without it, the royalty story collapses. _Structural._
- **Auto-sign authz** — without it, every bid is a wallet popup. _Structural for UX._
- **`.init` usernames** — without it, identity reverts to bech32 strings. _Significantly load-bearing for trust._
- **Interwoven Bridge** — without it, cross-chain conversion drops ~70%. _Load-bearing for go-to-market._
- **OPinit Stack** — operationally load-bearing; less so for product.
- **VIP** — not used in v0.1.0; deferred.

The honest test ("if we removed Initia and rebuilt on Ethereum + IPFS + ENS +
LayerZero, what would break") is laid out in `docs/INITIA_INTEGRATION.md` §0.

---

### "Show me where each primitive is actually used in code."

| Primitive | Files |
|---|---|
| InterwovenKit + custom chain | `apps/web/app/providers.tsx`, `apps/web/lib/chain/customChain.ts` |
| Auto-sign authz scope | `apps/web/lib/authz/index.ts`, `apps/web/app/settings/sessions/page.tsx` |
| `.init` resolution + fallback | `apps/web/lib/usernames/index.ts` |
| Bridge | `apps/web/components/bridge/AddFundsButton.tsx` |
| Move package | `contracts/sources/*.move` |
| OPinit executor + challenger | `infra/cloud-init/bootstrap.yml` |

---

### "What's the test discipline?"

- Move: 100% line + branch via `aptos move test --coverage`
- Frontend unit + integration: 100% line + branch + function via Vitest
- Indexer: 100% via Vitest
- Five Playwright e2e journeys (mint, auction, royalty, bridge-buy, sequencer-down)
- Post-deploy smoke against the live URL on every Vercel deploy

CI fails the PR if any gate is below 100%. The exemption budget is 5 across
the whole codebase, signed off in `contracts/COVERAGE.md` and
`apps/web/COVERAGE.md`. **No 6th exemption permitted.**

---

### "What are the production blockers you have not solved?"

Six conditions, all visible at `/status`:

1. Independent Move audit (no findings ≥ medium severity, all "high"+ remediated)
2. IPFS mirror for image bytes (currently R2-only)
3. Decentralised sequencer or signed roadmap to one
4. Wash-trade detection or honest "we do not detect this" disclosure on every artwork page
5. Off-Initia mainnet RPC SLA + multi-region failover
6. Multi-team challenger setup

We tell the truth about these on the live app. The submission's credibility
comes from honesty, not gloss.

---

### "What if Provenance shuts down? Do collectors still own their art?"

Yes. Each `Artwork` is a Move resource on the `provenance-1` rollup. The
website is a viewer; if it dies, anyone can run a viewer against the rollup's
public RPC. The README ships with instructions for running a "sovereign
frontend." Image bytes are content-addressable (sha256 on-chain), so any party
with a copy can rehost; the chain proves authenticity.

This is the answer to Carla's "does the art survive me losing my account, the
website, the company?" — yes to all three.

---

### "What's the honest weakness?"

Single team, no audit, R2-only storage, single sequencer, no wash-trade
detection. We have not papered over any of these. The customer-buyer review
in `docs/CUSTOMER_BUYER_REVIEW.md` names them with specific personas and
specific cost estimates.

---

### "How do I run it locally?"

```sh
git clone https://github.com/REPLACE/provenance
cd provenance
mise install            # pinned Node 20, pnpm 9, just, aptos CLI
just bootstrap          # installs deps, runs the test suite
just dev                # web on :3000, indexer on :42069
```

Fresh-clone smoke test is part of the Phase 8 success criterion, so `just
bootstrap` from any cold checkout has to work.
