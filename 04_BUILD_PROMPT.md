# START-PROMPT — Build Page (Page 3 of 4)

**Project:** INITIATE Hackathon (HACK0016) Submission — Provenance
**Stage:** Build & Run-on-Desktop
**Predecessor:** `03_DONE_PROMPT_Architecture.md` (Architecture page closed at 18:14 UTC, 25 April 2026)
**Successor:** `05_DONE_PROMPT_Build.md` (will be authored at end of this stage)
**Hackathon submission deadline:** Sunday 26 April 2026, 01:00 UTC
**Time when this prompt was authored:** 18:15 UTC, 25 April 2026
**Effective build window remaining at start:** ~6h 45min total; ~2h reserved for Phases 7–8 (video + submission); **~4h 45min effective code-and-test window**

---

## ⚠️ READ THIS FIRST — Where this prompt is meant to run

**This prompt is designed for Desktop Claude with local filesystem write access and shell execution.** It is NOT meant to run in the web/mobile chat interface that produced the architecture documents.

The web Claude Code Execution sandbox is ephemeral and isolated. Desktop Claude has access to the user's actual local working directory, can `git clone`, `git push` to GitHub, run `aptos move test`, run `pnpm test`, run `pnpm playwright test`, SSH to Hetzner, and execute every other command this prompt instructs. **Do not attempt to run this prompt in the web chat.** If you find yourself reading this in a web chat, stop and re-open the conversation in Desktop Claude.

When Desktop Claude opens this prompt, the user will provide a working directory path (e.g. `~/code/provenance`). All file operations are relative to that working directory. All ten architecture files must be present at `<working-dir>/docs/` or available to copy in.

---

## Architecture Locked-In Summary (carried forward from Architecture page)

1. **Product:** Provenance — a Move-based MiniMove appchain on Initia where digital artworks are first-class `Object<Artwork>` resources and royalties are protocol-enforced (cannot be bypassed via outside-marketplace transfers).
2. **VM choice:** **MiniMove**, because Move resources + friend visibility make royalty circumvention structurally impossible at the type level — vs MiniEVM (whitelist game) or MiniWasm (royalty primitive reimplementation overhead).
3. **Initia primitives used (load-bearing):** InterwovenKit wallet + auto-sign drawer (scoped to `provenance::auction::place_bid`), `.init` usernames (forward + reverse resolution), Interwoven Bridge via Skip Go, MiniMove (the chain itself), OPinit Stack.
4. **Top 3 architectural risks identified:** (R-BLD-02) Move 100% coverage tight in budget; (R-DEM-01) Initia testnet flakiness during demo recording; (R-PROD-02) R2-only image storage is a production blocker, v1.1 IPFS mirror committed.
5. **Demo path:** Fresh wallet → bridge in → see `lina.init` artist page → enable 1h place-bid auto-sign → 3 bids in 5 seconds without popups → win → attempt royalty-bypass (Move reverts visibly) → legitimate resale pays original artist royalty automatically.

---

## Operating Rules (binding for every commit on this page)

These are not advisory. They are the contract.

### Rule 1 — Architecture documents are read-only inputs

All ten architecture files at `<working-dir>/docs/`:
- `ARCHITECTURE.md`, `TECH_STACK.md`, `DATA_MODEL.md`, `API_CONTRACT.md`, `INITIA_INTEGRATION.md`
- `SECURITY_THREAT_MODEL.md`, `DEPLOYMENT_TOPOLOGY.md`, `BUILD_PLAN.md`, `RISK_REGISTER.md`, `CUSTOMER_BUYER_REVIEW.md`

If the build needs to deviate (e.g. InterwovenKit v2.5.0 ships and is preferable to v2.4.0), update the relevant doc in the same PR as the deviation. Silent drift is forbidden.

### Rule 2 — Git-first, remote before local code

The repo is created on GitHub **before** any code is written locally. Branch protection on `main` is set **before** the first commit on a feature branch. CI is configured **before** the first PR is opened. Without these in place, no code is written.

### Rule 3 — The build/test/commit/push cycle

Every change follows this cycle, in this order, no exceptions:

1. Write code (production code, test code, config — one concern per commit).
2. Run all relevant tests **locally**. Move tests, frontend unit, integration, Playwright on the affected journey.
3. If any test is red → go to step 7 of *this list*, not "skip and continue."
4. `git add -p` (selective; no blanket `git add .`), `git commit` (Conventional Commits format), `git push` to feature branch.
5. Watch CI on the PR. CI runs the full matrix.
6. If CI is green → merge to `main` (squash merge, branch deleted on merge).
7. If a test is red (locally OR in CI) → **read the failure**, **understand why it failed**, **fix the production code** (not the test), then return to step 2.

**Forbidden moves** (any of these is a stop-and-explain situation):

- Disabling a test to unblock CI
- Lowering a coverage threshold to make CI green
- Adding `// @ts-ignore`, `eslint-disable`, `# noqa`, or equivalent to silence a real warning
- Catching an exception and swallowing it to make a test pass
- Mocking a dependency to hide a real integration failure
- Committing red tests with `TODO`, `xit`, `it.skip`, `#[ignore]`, `#[test_only]` (Move) — unless the skip is documented in `contracts/COVERAGE.md` or `apps/web/COVERAGE.md` per Rule 5
- Reverting a test because "the test was wrong" without first proving it by writing a different test that demonstrates correct behaviour

A failing test is a gift. The fix is to find which of (a) production code, (b) test code, (c) requirements is wrong — in that order of probability. The fix is **never** to silence the messenger.

### Rule 4 — Coverage gates (binding from Phase 2 commit 1)

| Layer | Tool | Target | CI behaviour |
|---|---|---|---|
| Move modules | `aptos move test --coverage` | **100% line + branch** | PR fails if < 100% |
| Frontend unit | Vitest + RTL | **100% line + branch + function** | PR fails if < 100% |
| Indexer unit | Vitest | **100% line + branch + function** | PR fails if < 100% |
| Frontend integration (api routes, presign/finalize, indexer GraphQL stubs) | Vitest + msw + supertest | **100% of declared journeys** | PR fails if any journey untested |
| Playwright e2e | Playwright | **All 5 user journeys from `ARCHITECTURE.md` §4** | PR fails if any test red |
| Post-deploy smoke | Playwright vs live URL | **All 5 journeys green** | Deploy reverted if smoke red |

The CI workflow `.github/workflows/ci.yml` enforces every line of this table. No PR merges past a red gate.

### Rule 5 — Coverage exemptions are written, named, and capped

Up to **5** total coverage exemptions across the entire codebase, distributed:
- 3 for Move native-stdlib unreachable paths (in `contracts/COVERAGE.md`)
- 2 for React error-boundary panic paths (in `apps/web/COVERAGE.md`)

Each exemption is a row with: file:line, reason it cannot be tested, who signed off, and a `RISK_REGISTER.md` row extending R-BLD-03.

**No 6th exemption is permitted.** If the build hits a 6th, pause, decide between (a) refactor to make the path testable, or (b) cut the feature.

### Rule 6 — No scope shrinking on tests or features

The "what we are NOT building" list in `BUILD_PLAN.md` is the *only* authority for removed scope. Adding to it requires updating `BUILD_PLAN.md` and `CUSTOMER_BUYER_REVIEW.md` in the same commit. The list never grows to include test scope. Coverage is not a feature.

### Rule 7 — Customer-buyer review at every phase boundary

End of every phase, write a 5-paragraph customer-buyer review against the personas:
- **Lina** (artist): does this serve the customer brief?
- **Marek** (notional dev hire): is this maintainable?
- **Carla** (collector): does the UX work for buyers?
- **Tomas** (auditor): is this safe to operate?
- **Sponsor**: is this credible to back?

If any of the five voices says "no" or "conditional," the phase is not done until the condition is met or explicitly waived in writing in `docs/PHASE_REVIEWS.md`.

### Rule 8 — Brutal honesty in product copy

The /status page, the README, and the demo video must tell the truth about: single-VM topology, R2-only storage, single-team challenger, no Move audit, six conditions for production. The submission's credibility comes from honesty, not gloss.

---

## Phase Sequence (compressed budget — ~4h 45min code-and-test, then 2h video+submission)

This is the executable plan. Each phase has a goal, tasks, success criterion, fall-back, and a customer-buyer review checkpoint.

### Phase 0 — Remote-first setup (target 30 min)

**Goal:** GitHub repo public, branch protection on `main`, CI green on the initial scaffold, working `just bootstrap` in under 15 minutes from clone.

**Tasks:**
1. `gh repo create <org>/provenance --public --description "Move-based marketplace with protocol-enforced royalties — INITIATE HACK0016"`.
2. Initial commit: README stub, LICENSE files (MIT for code, CC-BY-SA 4.0 for docs), `.gitignore`, `.gitleaks.toml`, `mise.toml` (pin Node 20 LTS, pnpm 9, aptos CLI 3.x, just), `pnpm-workspace.yaml`, `package.json` workspace root, `Justfile` with `bootstrap` task.
3. Apply branch protection on `main` via `gh api`: require PR, require 1 approval (self-approve OK for solo build), require all status checks green, no force push, no direct push.
4. `mkdir -p apps/web apps/indexer contracts infra/hetzner infra/cloud-init docs .github/workflows`.
5. Copy all ten architecture files from prior session output into `docs/`.
6. Write `.github/workflows/ci.yml` with stub steps for: lint, typecheck, web build, indexer build, Move compile, Move coverage gate, frontend coverage gate, indexer coverage gate, Playwright smoke, gitleaks. Stubs are real — they fail loudly, not silently — but they have nothing to run yet so they short-circuit on "no source files yet."
7. `husky install` + lint-staged + gitleaks pre-commit hook.
8. Commit, push, PR, observe CI green, merge.
9. Add GitHub Actions secrets per `DEPLOYMENT_TOPOLOGY.md` §5 (R2 keys, DATABASE_URL, BETTER_STACK_INGEST_TOKEN). Stubs accepted for any secret that is not yet provisioned, with TODO in code.

**Success criterion (binary):** Fresh clone of repo + `mise install && just bootstrap` from a cold checkout completes without manual intervention. CI is green on `main`. Branch protection is on (verify with `gh api repos/<org>/provenance/branches/main/protection`).

**Fall-back if blocked:** GitHub outage → use GitLab as a temporary mirror; document the swap. Vercel outage during preview setup → defer Vercel hookup to Phase 3, do Phase 0 with CI only.

**Customer-buyer review:** Marek alone for this phase. He cares whether `just bootstrap` actually works. Run it from a *different* directory than where it was written. If it fails, fix the bootstrap, do not document workarounds.

---

### Phase 1 — Appchain deployment (target 60 min)

**Goal:** Live, public, internet-reachable rollup `provenance-1`, RPC behind TLS, monitoring active, snapshot-restore drilled once.

**Tasks:**
1. `cd infra/hetzner && terraform init && terraform apply` to provision Hetzner CX22 in `nbg1` with cloud-init bootstrap.
2. SSH to VM. `weave init` (gas station with 1000 testnet INIT from faucet), `weave opinit init` (executor + challenger configs, mocha-4 DA), launch via systemd: `systemctl start minitiad executor challenger hermes`.
3. Verify chain producing blocks: `journalctl -u minitiad -f` shows block height advancing.
4. Verify on InitiaScan testnet within ~5 minutes. Capture URL.
5. Cloudflare DNS A record `rpc.provenance-1.initia.xyz` → VM IPv4. Caddy auto-acquires Let's Encrypt cert. Verify `curl https://rpc.provenance-1.initia.xyz/status` returns 200.
6. Snapshot-restore drill (R-OPS-02): create Hetzner snapshot, provision second VM from snapshot, verify chain state matches at the same height, destroy second VM, document timing.
7. Better Stack alerts wired per `DEPLOYMENT_TOPOLOGY.md` §2.4. Trigger test alert by stopping minitiad for 90s. Verify Discord webhook fires. Restart.
8. Commit `infra/` changes, PR, merge.

**Success criterion (binary):** External laptop on different network can `curl https://rpc.provenance-1.initia.xyz/status` → 200, chain ID `provenance-1`. InitiaScan link resolves and shows blocks advancing. Snapshot drill completed and timing recorded.

**Fall-back if blocked:**
- Weave bug → fall back to manual `minitiad init` + manual config (pre-Weave flow, documented in Initia docs).
- Celestia mocha-4 outage → `--da local` flag; submission language acknowledges Celestia upgrade pending. Track R-TEC-04.
- Hetzner provisioning fails → swap to pre-staged Vultr Frankfurt module in `infra/vultr/`. ~30min total.

**Customer-buyer review:** Marek + Tomas. Marek checks that infra is reproducible from `terraform apply`. Tomas checks that systemd hardening is actually applied (`ProtectSystem=strict`, no password SSH, ufw active).

---

### Phase 2 — Move modules with 100% coverage (target 90 min, hard cap 120 min)

**Goal:** All Move modules from `DATA_MODEL.md` §1 deployed to `provenance-1` with **100% test coverage** enforced in CI.

**Critical:** This phase is the most likely to overrun (R-BLD-02). Hard cap 120 min. If it hits 120 min, invoke R-BLD-03 fall-back: skip ONE non-critical edge-case test on listing or offer (royalty/auction core paths NOT eligible) with `// TODO(R-BLD-03)` and a coverage exemption in `contracts/COVERAGE.md`. This consumes one of the 5 total exemptions.

**Tasks (test-first for this phase):**
1. Initialize Move package at `contracts/`. `Move.toml` declares deps on MoveStdlib, AptosFramework, MinitiaStdlib pinned to current testnet-compatible versions.
2. For each module below, the cycle is: write failing test → write impl → green → commit → next.
   - `royalty.move` — SettlementContext invariant. Tests: settle on full amount, settle on dust, royalty cap enforcement, treasury fee, single-payment guard. Target ≥12 tests.
   - `artwork.move` — `Object<Artwork>` resource, `mint`, blocked-transfer path. Tests: mint with valid metadata, refuse oversize string, transfer-without-settle fails, transfer-with-settle succeeds, gift emits event. Target ≥10 tests.
   - `collection.move` — collection creation, edition tracking. Tests: create, mint into, edition exhaustion. Target ≥6 tests.
   - `listing.move` — fixed-price create/buy/cancel. Tests: create-buy-success, cancel-success, buy-on-cancelled-fails, buy-with-insufficient-funds-fails. Target ≥8 tests.
   - `auction.move` — create, place_bid, finalize, anti-snipe. Tests: bid-increases-state, bid-below-min-fails, anti-snipe-extends-end, finalize-pays-royalty, finalize-before-end-fails. Target ≥12 tests.
   - `offer.move` — create, accept, expire. Tests: accept routes royalty, expire reclaims funds. Target ≥6 tests.
3. After each module's tests are green, run `aptos move test --coverage` to verify 100%. Commit at module boundary.
4. Once all six modules are at 100%: `aptos move publish --profile testnet --included-artifacts none`. Capture published bech32 package address. Set as repo secret `NEXT_PUBLIC_PROVENANCE_PACKAGE`.
5. Smoke test on-chain: manual `aptos move run` against each entry function with a known account, verify event emission via RPC.
6. Verify CI coverage gate: open a fake "regression" branch that comments out one test, push, verify CI rejects with "Move coverage 99.x% < 100%". Restore the test. **This validates the gate is real.**
7. Commit, PR, merge.

**Success criterion (binary):** `aptos move test --coverage` reports 100.00% on all modules. CI coverage gate proven to fail on regression. Published package address responds to `aptos query move resource <addr>`. Total ≥54 tests passing.

**Fall-back if blocked:**
- Hard cap 120 min. At T+90min if not at 80% completion, invoke R-BLD-03 — skip ONE edge case in listing or offer with documented exemption.
- Move compiler bug → downgrade `aptos` CLI to last known-good in `mise.toml`.
- Publish fails → bump gas, then republish from clean account.

**Customer-buyer review:** Tomas leads. He verifies: (a) royalty cannot be bypassed by inspection of test names + test bodies; (b) integer overflow is handled; (c) reentrancy is impossible (Move's resource model gives this for free, but Tomas will confirm by reading the module). Lina confirms: the artist sees their royalty in receipts.

---

### Phase 3 — Frontend skeleton + InterwovenKit (target 75 min)

**Goal:** Next.js 15 app deployed to Vercel at `provenance.app`. Wallet connect works. `useInterwovenKit()` returns a working session. One trivial transaction signed against `provenance-1`.

**Tasks (test-after, same commit):**
1. `pnpm --filter web create next-app@latest .` (TypeScript, Tailwind, App Router) inside `apps/web/`.
2. `pnpm dlx shadcn@latest init`.
3. `pnpm add @initia/interwovenkit-react@2.4.0 @tanstack/react-query wagmi viem zustand sonner`.
4. `app/providers.tsx` — Providers stack per `INITIA_INTEGRATION.md` §1.1. `customChain` declares `provenance-1`. `defaultChainId="provenance-1"`.
5. `<ConnectButton/>` using `useInterwovenKit().openConnect`. Renders `username || shortenAddress(initiaAddress)`. Vitest test: mocks `useInterwovenKit` and verifies render in connected/disconnected states.
6. Home page with hero ("Royalties enforced by Move resources"), live drops grid (placeholder), Connect CTA.
7. Send one trivial test transaction via `requestTxBlock` to verify the round-trip works on `provenance-1`. Vitest integration test mocks `requestTxBlock` and verifies the call shape (camelCase, bech32 addr, BCS args).
8. Configure Vercel project, env vars per `DEPLOYMENT_TOPOLOGY.md` §2.2, deploy. Verify `provenance.app` resolves.
9. Add Playwright e2e test `wallet-connect.spec.ts`: visits home, opens connect modal, validates modal renders. Run locally, commit, push.
10. CI runs the full Vitest + Playwright matrix. Coverage gate on `apps/web` is now active and must report 100%. Commit, PR, merge.

**Success criterion (binary):** `provenance.app` loads, Connect button opens InterwovenKit modal, on connect renders username/address, no console errors. `pnpm --filter web test:coverage` reports 100% on `apps/web`. Playwright `wallet-connect` spec is green in CI.

**Fall-back if blocked:**
- InterwovenKit bug → pin to v2.4.0 exactly. If pin doesn't resolve, fork in `apps/web/lib/interwovenkit-shim.ts`.
- Vercel deploy fails → fall back to running Next.js on the Hetzner VM behind Caddy on the apex domain.

**Customer-buyer review:** Carla (collector). She tests connect flow on her wallet of choice. If anything makes her say "huh?", that's a UX bug to fix before Phase 4.

---

### Phase 4 — Initia primitives (target 90 min)

**Goal:** All three load-bearing Initia primitives are real, interactive, and end-to-end tested.

**Tasks (test-after, separate commits per primitive):**

**4A — `.init` username display:**
- Connected user: read from `useInterwovenKit().username` directly.
- Arbitrary on-chain addresses: `apps/web/lib/usernames.ts` — `resolveUsername(address)` hits `/initia/usernames/v1/usernames/from_address/{addr}`. TanStack Query, 24h stale, 7-day cache. Reverse: `/initia/usernames/v1/addresses/from_username/{name}`.
- Failure path: 404/error → `shortenAddress` fallback with tooltip "No .init username set."
- Tests (Vitest + msw): forward resolution (happy + 404), reverse resolution (happy + 404), TanStack cache behaviour. **Must include a test that demonstrates the fallback path so it is covered.**
- Playwright spec: visits a known artist page, sees `lina.init` (or fallback if testnet has no usernames yet — handle both).

**4B — Auto-sign drawer wired to bidding:**
- Settings page `/settings/sessions`: shows scope (`provenance::auction::place_bid` only), `autoSign.isEnabled` state, Enable / Disable buttons, expiration selector (1h default, 24h max).
- Bid panel: branches on `autoSign.isEnabled`. If true → "Bid (1-tap)" skips wallet prompt. If false → regular sign path.
- Authz scope: GenericAuthorization for `/initia.move.v1.MsgExecute` constrained to `place_bid`. SendAuthorization 20 INIT cap. Per `INITIA_INTEGRATION.md` §3.2.
- Tests: enabled-state shows tap button, disabled-state shows regular button, scope is exactly `place_bid` (verify the authz payload).
- Playwright spec: enable session, place 3 bids without popups (mock the chain for e2e — real chain integration covered in Phase 5 journey).

**4C — Bridge in buy flow:**
- On listing page, if connected user's INIT < `price + estimated_gas`, "Bridge to buy" button appears.
- Clicking calls `openBridge({ destChainId: 'provenance-1', destAmount: price })`.
- After bridge success, listing page polls balance and re-renders buy as enabled.
- Top-nav "Add funds" button always available.
- Tests: low-balance state shows bridge button, bridge open call has correct shape, post-bridge polling enables buy button.
- Playwright spec: simulate low balance, click bridge, verify modal opens (real bridge flow covered in Phase 5).

**Tasks per primitive:** code + Vitest unit + Vitest integration + Playwright spec. Each primitive is one commit, one PR (or one PR with three commits — judgment call). Coverage gate must remain at 100%.

**Success criterion (binary):** Settings page works for all three. Each primitive has its Playwright spec green in CI. Coverage gate at 100%.

**Fall-back if blocked:**
- Auto-sign drawer broken upstream → demo Settings page only; bid path falls back to per-tx prompt.
- Bridge broken upstream → embed `<a href="https://app.initia.xyz/bridge">` as a link.
- `.init` resolution endpoint outage → cached results serve; fallback rendering verified.

**Customer-buyer review:** Lina (artist) + Carla (collector). Lina verifies `.init` rendering. Carla verifies the auto-sign UX feels safe (1-hour default, scope visible, easy to disable). Both review the bridge UX.

---

### Phase 5 — Core user journeys (target 90 min)

**Goal:** All five flows from `ARCHITECTURE.md` §4 work end-to-end on the live testnet, with Playwright e2e tests for each.

**Compressed scope:** Royalty journey (#4) is non-negotiable. Auction (#2) is non-negotiable. Mint (#1) is non-negotiable. Cross-chain buy (#3) and Sequencer-down banner (#5) are time-boxed; if Phase 5 hits 75 min and these aren't done, ship feature-flagged off and document.

**Tasks:**

**5A — Mint journey (target 25 min):**
- `/create/collection` page — form, R2 presign, finalize endpoint, calls `provenance::collection::create_collection`.
- `/create/artwork` page — form, content upload, hash verification, calls `provenance::artwork::mint`.
- Indexer (Ponder) picks up `CollectionCreatedEvent` and `ArtworkMintedEvent`, populates `/collection/[addr]` page.
- Playwright e2e `mint.spec.ts`: full journey with a test account on `provenance-1`.

**5B — Auction journey (target 25 min):**
- `/listing/[id]` renders auction state from indexer GraphQL.
- Bid panel uses auto-sign branch from Phase 4B.
- Anti-snipe: bids in last 5min extend by 5min (Move-enforced; UI shows countdown).
- Auto-finalize on view if past end.
- Playwright e2e `auction.spec.ts`: enable session, place 3 bids, win, auto-finalize, see receipt with royalty.

**5C — Royalty enforcement journey — THE HEADLINE (target 25 min):**
- `/portfolio` shows owned artworks. "List for resale" → secondary listing.
- Buy flow on secondary routes through `royalty::settle`. Receipt: "Royalty paid: X to artist."
- `/transfer` (gift attempt) page literally tries `0x1::object::transfer_call` directly. Move reverts. UI shows the revert reason and tooltip "Provenance Move resources do not allow paid transfers outside the marketplace."
- Playwright e2e `royalty.spec.ts`: secondary buy → confirm artist receives royalty payment in their tx history; gift-bypass attempt → confirm Move revert is shown to user.

**5D — Cross-chain buy journey (target 10 min, time-boxed):**
- Reuse Phase 4C bridge plumbing.
- Playwright e2e `bridge-buy.spec.ts`: low-balance buyer → bridge → buy fixed-price.

**5E — Sequencer-down banner (target 5 min, time-boxed):**
- `apps/web/lib/health.ts` polls `/status` every 30s. Zustand state.
- Banner renders when `chainHealthy=false` for >60s.
- Playwright e2e `sequencer-down.spec.ts`: mock the RPC as down, verify banner appears.

**Success criterion (binary):** All 5 Playwright specs green in CI. Live `provenance.app` demonstrates all 5 journeys end-to-end with a fresh wallet. Coverage gate at 100%.

**Fall-back if blocked:**
- 5D and 5E feature-flagged off if Phase 5 runs hot. Documented in `BUILD_PLAN.md` "what we are NOT building" with a same-PR commit.
- 5A, 5B, 5C MUST ship — they are the product's identity. If one is broken at T+85min, stop other work and fix.

**Customer-buyer review:** ALL five personas. Lina runs through mint + royalty. Carla runs through buy + bid + bridge. Marek runs through the code paths. Tomas confirms the royalty enforcement on resale by reading the on-chain tx, not just the UI receipt. Sponsor watches the full demo path end-to-end.

---

### Phase 6 — Polish (compressed to 30 min)

**Goal:** Product survives a judge clicking around with no script.

**Compressed tasks (30 min total):**
1. Error boundaries on every page route, with retry buttons. Toaster (sonner) for transient errors. (10 min)
2. Loading states (skeletons) on every async path. (5 min)
3. Empty states with CTAs on portfolio, collection page, home drops grid. (5 min)
4. Mobile viewport check at 375px (iPhone SE) and on a real Android phone via Vercel preview. (5 min)
5. `/status` page — chain health, indexer lag, R2 status, last batch posted. Read-only, linked from footer. (5 min)

**Cut from scope (compared to original `BUILD_PLAN.md` Phase 6):** Lighthouse 90 audit → quick spot-check only, no formal pass. Full a11y audit → keyboard nav and aria-labels only on critical paths. Final design polish → spot-fix only.

**Success criterion (binary):** No console errors during a 2-minute click-through. Mobile renders correctly on iPhone SE viewport. /status page exists and loads.

**Fall-back if blocked:** Cut /status if pinched. Status banner from Phase 5E covers the most demo-relevant signal.

**Customer-buyer review:** Carla (UX gut check). One pass, brief, verbatim feedback into `docs/PHASE_REVIEWS.md`.

---

### Phase 7 — Demo video (target 60 min)

**Goal:** 5–7 minute video that judges watch end-to-end without confusion.

**Tasks per `BUILD_PLAN.md` Phase 7:**
1. Rehearse once with stopwatch.
2. Record with OBS, 1080p 30fps, close-mic'd.
3. Edit in DaVinci Resolve (free) — light cuts only, captions on small text.
4. Export H.264 MP4 < 100MB.
5. Upload to YouTube unlisted.
6. Local backup MP4 in `docs/demo.mp4` (Git LFS).

**Script per `BUILD_PLAN.md` Phase 7 §Script.** Sacred segment: the royalty-enforcement reveal.

**Success criterion (binary):** YouTube unlisted URL accessible from non-team device, in incognito, on mobile.

**Fall-back if blocked:**
- Recording crashes → fall back to QuickTime backup capture (started in parallel).
- Video too long → cut bridge segment first, then /status.

**Customer-buyer review:** Sponsor + Lina. Sponsor judges credibility. Lina judges whether her customer story comes through.

---

### Phase 8 — Submission package (target 60 min)

**Goal:** Submitted on dorahacks.io before 26 April 2026 01:00 UTC. Repo public. v0.1.0-hackathon tagged. Fresh-clone smoke test green.

**Tasks per `BUILD_PLAN.md` Phase 8:**
1. `.initia/submission.json` validated against organiser examples.
2. Final `README.md` with elevator pitch, architecture link, live URLs, run-it-locally, video URL, team, license.
3. Screenshots in `docs/screenshots/`.
4. `git tag v0.1.0-hackathon` on the exact submission commit. Push tag.
5. **Fresh-clone smoke test:** in a separate directory, `gh repo clone <org>/provenance fresh && cd fresh && just bootstrap && pnpm test`. Must pass. If it doesn't, fix and re-tag.
6. Submit on dorahacks.io. Verify via incognito that the form reflects everything.
7. Post in `#hackathon-submissions` Discord.

**Success criterion (binary):** Dorahacks confirms submission. Fresh-clone smoke test green. Live deployment reachable from non-team device. Public repo.

**Fall-back if blocked:**
- Dorahacks broken at T-30min → email organisers + screenshot of completed form + Discord post.
- Wrong submission.json field → fix, force-update form (most platforms allow edits before deadline).

**Customer-buyer review:** Sponsor only. Final go/no-go.

---

## Continuous safeguards

These run in parallel to every phase, not at phase boundaries.

1. **CI watch.** Every push to a feature branch triggers CI. CI status checked within 5 minutes. Red CI is fixed before any further code is written on that branch.
2. **Snapshot-restore drill.** One drill at end of Phase 1 (already in tasks). One additional drill at end of Phase 5 — total 2 drills before submission.
3. **Coverage delta on every PR.** If a PR's coverage delta is negative (relative to `main`), the PR has a clear written justification or it doesn't merge.
4. **No silent dependency upgrades.** Renovate / Dependabot PRs are reviewed manually, not auto-merged. Critical-CVE-only auto-merge is permitted, with a 6-hour observation window before push.
5. **/status page kept honest.** When sequencer is down, /status reflects it within 60s of detection.

---

## When to ask the user a question (and when not to)

Ask only when there is genuine ambiguity that the architecture documents do not resolve and where guessing wrong would waste >15 minutes. Examples:

- **Ask:** "The hackathon submission.json schema example in the organiser repo has field `chain_id_l2` not `rollup_chain_id` — which should we use?"
- **Don't ask:** "Should we use Vercel or Netlify?" — `TECH_STACK.md` says Vercel. Just do it.
- **Don't ask:** "Is it OK if I skip a test to save time?" — Operating Rule 3 forbids this. Don't ask, don't do it.
- **Don't ask:** "Should I update the architecture docs to reflect this change?" — Yes. Always. Same PR. Don't ask.

Default: act. The architecture documents are the contract; deviations are journaled, not negotiated mid-build.

---

## End-of-Build closeout

When Phase 8 success criterion is met, write the closeout DONE prompt to `<working-dir>/05_DONE_PROMPT_Build.md` covering:

- All 8 phases ticked
- Coverage on each layer (actual % achieved)
- Live URLs (frontend, RPC, InitiaScan, video)
- Five customer-buyer reviews aggregated (Lina, Marek, Carla, Tomas, Sponsor verdicts)
- Lessons captured (what worked, what didn't, what to carry into Page 4)
- Hand-off summary for the Submission Closeout page (Page 4)

Page 4 (Submission Closeout) is a 30-minute retrospective + post-submission monitoring + judge Q&A handling. It runs after Phase 8 ships.

---

## Final word before Desktop Claude begins

The architecture is honest, the testing discipline is binding, the time budget is tight but real. Every named risk has a named fall-back. Every shipped feature has 100% test coverage. Every coverage exemption is named, capped, and signed off in writing.

Build with the customer in mind: Lina is real, even though she is a persona. The £1,800/mo she lost to OpenSea making royalties optional is a real number that real artists really lost. Provenance's job is to give it back, mechanically, with a Move resource that doesn't ask permission.

Now build it.

---

**Files Desktop Claude expects to find at start:**

```
<working-dir>/docs/
├── ARCHITECTURE.md
├── TECH_STACK.md
├── DATA_MODEL.md
├── API_CONTRACT.md
├── INITIA_INTEGRATION.md
├── SECURITY_THREAT_MODEL.md
├── DEPLOYMENT_TOPOLOGY.md
├── BUILD_PLAN.md
├── RISK_REGISTER.md
└── CUSTOMER_BUYER_REVIEW.md

<working-dir>/
└── 03_DONE_PROMPT_Architecture.md   (closeout from prior session)
└── 04_BUILD_PROMPT.md                (this file)
```

**Files Desktop Claude will create by Phase 8:**

```
<working-dir>/
├── apps/web/                        (Next.js 15 app, 100% coverage)
├── apps/indexer/                    (Ponder, 100% coverage)
├── contracts/                       (Move package, 100% coverage)
├── infra/hetzner/                   (Terraform)
├── infra/cloud-init/
├── docs/screenshots/
├── docs/demo.mp4
├── docs/PHASE_REVIEWS.md            (5 personas × 8 phases)
├── docs/JUDGE_FAQ.md
├── docs/SECRETS.md
├── docs/SETUP-WINDOWS.md
├── .github/workflows/ci.yml
├── .initia/submission.json
├── README.md
├── LICENSE-CODE                     (MIT)
├── LICENSE-DOCS                     (CC-BY-SA 4.0)
├── Justfile
├── mise.toml
├── pnpm-workspace.yaml
├── package.json
├── 05_DONE_PROMPT_Build.md          (written at end)
```

**Begin Phase 0 now.**
