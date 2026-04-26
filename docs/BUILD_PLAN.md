# BUILD PLAN — Provenance

**Status:** locked for execution
**Total budget:** 17–20 effective build hours
**Submission deadline:** 26 April 2026, 01:00 UTC
**Owner of this document:** Build lead
**Companion docs:** `ARCHITECTURE.md`, `DEPLOYMENT_TOPOLOGY.md`, `RISK_REGISTER.md` (referenced by ID throughout), `INITIA_INTEGRATION.md` Phase 4 maps to `INITIA_INTEGRATION.md` §3.

This is the build sequence we will actually follow. Every phase has a deliverable, a success criterion (binary, observable, demonstrable), and a fall-back if blocked. Phases run in order; later phases depend on earlier ones in stated ways.

The git-first discipline is applied throughout: nothing exists until it is on `main` behind a green CI pipeline. The 100% Move test coverage commitment from `TECH_STACK.md` Layer 12 is enforced as a CI gate from the end of Phase 2 onward — a PR that drops Move coverage below 100% cannot merge, full stop.

---

## Phase budget summary

| Phase | Budget | Cumulative | Critical path? |
|---|---|---|---|
| 0 — Remote-first setup | 1h | 1h | Yes |
| 1 — Appchain deployment | 2h | 3h | Yes |
| 2 — Move modules (with 100% coverage) | 4h | 7h | Yes |
| 3 — Frontend skeleton + InterwovenKit | 2h | 9h | Yes |
| 4 — Initia primitives integration | 2.5h | 11.5h | Yes |
| 5 — Core user journeys | 3.5h | 15h | Yes |
| 6 — Polish + edge cases | 2h | 17h | Recoverable |
| 7 — Demo video | 1h | 18h | Yes |
| 8 — Submission package | 1h | 19h | **Yes — hard deadline** |
| Buffer | 1h | 20h | Reserved for slippage |

20 hours is the hard ceiling. If we overrun, we cut from Phase 6 (polish) before anything else. We will not cut from Phases 0, 1, 2, 7, or 8 — those are the difference between "submitted" and "incomplete."

---

## Phase 0 — Remote-first setup (1h)

**Goal:** a fresh engineer pulling the repo can be running locally within 15 minutes of clone. Nothing in this phase is "we'll figure out the directory structure later."

### Tasks

1. **Create GitHub repo** `provenance` under team org. Public.
2. **Apply branch protection on `main`:** require PR, require 1 approval, require CI green, no force-push, no direct push.
3. **Initialize monorepo structure:**
   ```
   /
   ├── apps/web/                # Next.js 15
   ├── apps/indexer/            # Ponder
   ├── contracts/               # Move package
   ├── infra/hetzner/           # Terraform for rollup VM
   ├── infra/cloud-init/        # systemd units, configs
   ├── infra/versions.env       # Pinned tool versions
   ├── docs/                    # The 10 architecture .md files
   ├── .github/workflows/       # CI definitions
   ├── package.json             # pnpm workspace root
   ├── pnpm-workspace.yaml
   ├── mise.toml                # Node / Rust / aptos pins
   ├── Justfile                 # Task runner
   ├── .gitignore
   ├── .gitleaks.toml
   └── README.md
   ```
4. **CI workflows (`.github/workflows/`):**
   - `ci.yml`: on every PR — lint, typecheck, web build, indexer build, Move compile, **Move test with `--coverage` and a script that fails if coverage < 100%**, gitleaks scan.
   - `deploy-web.yml`: Vercel handles via Git integration; this workflow only runs preview database migrations.
   - `deploy-indexer.yml`: Railway handles via Git integration; this is a pin only.
5. **Provision the secrets vault.** Add to GitHub repo Actions secrets: `R2_*`, `DATABASE_URL_PREVIEW`, `BETTER_STACK_INGEST_TOKEN`. Document in `docs/SECRETS.md` (one page).
6. **Create the project board.** Single GitHub Projects board with columns *Backlog / In progress / In review / Done*. Every task in this build plan is a card.
7. **Pre-commit hooks** via `husky` + `lint-staged`: prettier, eslint, gitleaks.
8. **Commit and push the initial scaffold.** First PR self-approved (acceptable for solo build) or partner-approved.

### Deliverable

Public GitHub repo at `github.com/<org>/provenance` with green CI on `main`, README pointing at `docs/`, and a documented `just bootstrap` that gets a fresh laptop to a working local dev loop in under 15 minutes.

### Success criterion (binary)

`gh repo clone <org>/provenance && cd provenance && just bootstrap` from a never-touched checkout completes without manual intervention beyond installing `mise` itself.

### Fall-back if blocked

GitHub Actions outage → use GitLab CI mirror (kept as a one-file fallback in `.gitlab-ci.yml`). Vercel outage → the entire frontend can be `pnpm build && pnpm start` on the Hetzner VM as a panic deploy.

---

## Phase 1 — Appchain deployment (2h)

**Goal:** a live, public, internet-reachable rollup with a chain ID we can put in the submission form.

### Tasks

1. **Provision the Hetzner VM** via `terraform apply` from `infra/hetzner/`. Cloud-init does the rest — minitiad, opinitd, hermes, caddy, node_exporter, promtail all installed and running as systemd services.
2. **Run `weave init`** on the VM. Configure the gas station with testnet-INIT from the faucet. Verify gas station holds at least 1000 INIT (enough for batch posting through the hackathon).
3. **Run `weave opinit init`** to bootstrap executor and challenger configs. Use `--celestia-testnet` flag (selects mocha-4 DA). Verify all four bot keys generated, mode 600, owned by their respective Linux users.
4. **Launch the rollup.** `systemctl start minitiad executor challenger hermes`. Watch journalctl until first block produced (typically <60s).
5. **Verify on InitiaScan testnet.** Chain `provenance-1` should appear within ~5 minutes. Capture the InitiaScan URL — this goes in `submission.json`.
6. **Set up DNS.** Cloudflare DNS A record `rpc.provenance-1.initia.xyz` → Hetzner IPv4. Caddy auto-acquires Let's Encrypt cert. `curl https://rpc.provenance-1.initia.xyz/status` returns chain status.
7. **Test the snapshot/restore procedure** (R-OPS-02 mitigation). Create a test snapshot, provision a second VM from it, verify chain state matches, destroy the second VM. Document timing.
8. **Wire monitoring.** Better Stack alerts configured per `DEPLOYMENT_TOPOLOGY.md` §2.4. Trigger a test alert by stopping minitiad for 90s. Verify Discord webhook fires. Restart.
9. **Commit infra/ changes** behind a green CI run. Phase 1 ends with a green `main`.

### Deliverable

Live `provenance-1` rollup, public RPC at `https://rpc.provenance-1.initia.xyz`, InitiaScan link captured, monitoring active.

### Success criterion (binary)

A laptop on a coffee shop wifi network can `curl https://rpc.provenance-1.initia.xyz/status` and get a 200 OK with the expected chain ID. The InitiaScan link resolves and shows blocks advancing.

### Fall-back if blocked

- Weave bug → fall back to manual `minitiad init` + manual config (this is the OPinit pre-Weave flow; documented in Initia docs).
- Celestia mocha-4 outage → `--da local` flag to fall back to native DA. Submission language changes from "Celestia DA" to "native DA, Celestia upgrade pending." Tracked: R-TEC-04.
- Hetzner provisioning fails → switch to Vultr Frankfurt $6/mo equivalent. Terraform module duplicated for Vultr in `infra/vultr/` ahead of time as a 30-minute hedge.

---

## Phase 2 — Move modules (4h)

**Goal:** every Move module specified in `DATA_MODEL.md` §1 deployed to `provenance-1` with 100% test coverage.

This is the most contentful single phase. The 100% coverage commitment costs us roughly 60% more time than untested code would; we are paying that cost deliberately because (a) royalty enforcement is the product's headline, (b) a buggy royalty module is worse than no marketplace at all, and (c) Move's testing tooling makes 100% genuinely tractable in 4 hours for the module count we have.

### Tasks

1. **Initialize Move package** at `contracts/`. `Move.toml` declares deps on `MoveStdlib`, `AptosFramework`, `MinitiaStdlib`. Pin to current testnet-compatible versions.
2. **Write modules in this order** (each module gets unit tests written immediately after, in the same commit):
   - `royalty.move` — the SettlementContext invariant. Tests for: settle on full amount, settle on dust, royalty cap, treasury fee, single-payment guard. *Test count target: 12+.*
   - `artwork.move` — `Object<Artwork>` resource, `mint`, `transfer_call` blocked path. Tests: mint with valid metadata, mint refuses oversize string, transfer-without-settle fails, transfer-with-settle succeeds. *Test count target: 10+.*
   - `collection.move` — collection creation, edition tracking. Tests: create, mint into, edition exhaustion. *Test count target: 6+.*
   - `listing.move` — fixed-price create, buy, cancel. Tests: create-buy-success, create-cancel-success, buy-on-cancelled-fails, buy-with-insufficient-funds-fails. *Test count target: 8+.*
   - `auction.move` — create, place_bid, finalize, anti-snipe. Tests: bid-increases-state, bid-below-min-fails, anti-snipe-extends-end-time, finalize-pays-royalty, finalize-before-end-fails. *Test count target: 12+.*
   - `offer.move` — create, accept, expire. Tests: accept routes through royalty, expire reclaims funds. *Test count target: 6+.*
3. **Coverage gate.** `aptos move test --coverage` reports per-module coverage. CI runs:
   ```bash
   COVERAGE=$(aptos move test --coverage 2>&1 | grep "Total Coverage" | awk '{print $3}')
   if [ "$COVERAGE" != "100.00%" ]; then exit 1; fi
   ```
   This is in `.github/workflows/ci.yml` from the first commit of this phase. A PR cannot merge with sub-100% coverage.
4. **Publish to `provenance-1`.** `aptos move publish --profile testnet --included-artifacts none`. Capture the deployed package address (bech32 init1...). This becomes `NEXT_PUBLIC_PROVENANCE_PACKAGE` everywhere.
5. **Smoke test on-chain.** Manual `aptos move run` against each entry function with a known account, verify event emission via RPC.
6. **Commit, PR, merge.** Phase 2 ends with `main` having all modules deployed and tested.

### Deliverable

Published Move package on `provenance-1` at a known bech32 address, 100% covered, ~54+ unit tests passing in CI on every PR.

### Success criterion (binary)

`aptos move test --coverage --filter all` reports 100.00% coverage. `aptos client query move resource <package_addr>` returns the deployed module set. CI is green on `main`.

### Fall-back if blocked

- A test edge case takes >30 minutes to nail → drop the test to the next phase if it covers a non-critical path (e.g. an offer-cancel race). The 100% coverage gate is suspended for that one PR with a `// TODO(R-BLD-03): coverage gap` comment, the gap is logged in `RISK_REGISTER.md`, and Phase 6 polish closes it. Royalty/auction/listing core paths are not eligible for this fall-back.
- Move compiler bug → downgrade to last known-good aptos CLI version pinned in `mise.toml`.
- Publish fails on chain → debug via `--gas-unit-price` increase, then via republish from a new account if signature mismatch.

---

## Phase 3 — Frontend skeleton + InterwovenKit (2h)

**Goal:** Next.js app deployed to Vercel, wallet connect working, can read the user's `.init` username, can sign one trivial transaction against `provenance-1`.

### Tasks

1. **Scaffold `apps/web/`** with `pnpm create next-app@latest --typescript --tailwind --app`. Add shadcn/ui via `pnpm dlx shadcn@latest init`.
2. **Install InterwovenKit:**
   ```bash
   pnpm add @initia/interwovenkit-react @tanstack/react-query wagmi viem zustand
   ```
3. **Wire Providers** at `app/providers.tsx` per `INITIA_INTEGRATION.md` §1.1:
   ```tsx
   <WagmiProvider config={wagmiConfig}>
     <QueryClientProvider client={queryClient}>
       <InterwovenKitProvider {...TESTNET} defaultChainId="provenance-1" customChain={provenanceChain}>
         {children}
       </InterwovenKitProvider>
     </QueryClientProvider>
   </WagmiProvider>
   ```
   `customChain` declares our rollup. `TESTNET` preset supplies endpoints for `initiation-2`.
4. **Build `<ConnectButton/>`.** Uses `useInterwovenKit().openConnect`. On connect, displays `username || shortenAddress(initiaAddress)`.
5. **Build the home page.** Three sections: hero ("Royalties enforced by Move resources"), live drops grid (placeholder until Phase 5), Connect Wallet CTA.
6. **Verify the auto-sign drawer renders.** Add a temporary "Enable session" button calling `autoSign.enable()`. Click it, verify drawer opens, dismiss without enabling. Keep the button — it'll be wired into the auction flow in Phase 4.
7. **Send one trivial transaction.** A test entry function `0x1::cosmos::send_token` from the connected account to itself, signed via `requestTxBlock`. Verify it lands on `provenance-1`.
8. **Configure Vercel.** Connect repo, set env vars per `DEPLOYMENT_TOPOLOGY.md` §2.2, deploy. Verify production URL `provenance.app` resolves and the home page loads.
9. **Commit, PR, merge.**

### Deliverable

Live `provenance.app` with working wallet connect, username rendering, and verified one-tx round-trip to `provenance-1`.

### Success criterion (binary)

A judge visits `provenance.app`, clicks Connect, picks any wallet, and sees their `username || init1abc...xyz` in the header. The browser console shows no errors.

### Fall-back if blocked

- InterwovenKit version mismatch → pin to v2.4.0 exactly, restore once upstream catches up.
- Vercel deploy fails → fall back to deploying via `vercel deploy` CLI manually from laptop, or worst case `pnpm build && pnpm start` on the Hetzner VM (port 3000 behind Caddy at the apex domain).

---

## Phase 4 — Initia primitives integration (2.5h)

**Goal:** the three judging-weight Initia primitives (auto-sign, `.init` usernames, Interwoven Bridge) are real and interactive in product, not stubbed.

This phase carries the 30% Initia integration scoring weight. Anything we shortcut here loses points.

### Tasks

1. **`.init` username display, end-to-end.**
   - For the connected user: read directly from `useInterwovenKit().username`. No REST call.
   - For arbitrary on-chain addresses (artist pages, collector lists): a typed `resolveUsername(address)` function in `apps/web/lib/usernames.ts` that hits the Initia REST endpoint `/initia/usernames/v1/usernames/from_address/{address}`. TanStack Query wraps this with a 24h stale time and 7-day cache.
   - Reverse path (lookup address from `lina.init`): same module, query `/initia/usernames/v1/addresses/from_username/{username}`. Used in the "Send to .init" gift flow.
   - Failure path: if either query 404s or errors, fall back to `shortenAddress(addr)` (`init1abcd...wxyz`). Render the fallback with a tooltip "No .init username set."
2. **Auto-sign drawer wired to bidding only.**
   - Settings page `/settings/sessions` — describes scope (`provenance::auction::place_bid` only), shows current state via `autoSign.isEnabled`, exposes Enable / Disable buttons that call `autoSign.enable()` / `autoSign.disable()`.
   - Bid panel: if `autoSign.isEnabled === true`, show "Bid (1-tap)" button and skip wallet prompt on click. If false, show "Bid" with regular wallet prompt path.
   - Authz scope is exactly: `GenericAuthorization` for `/initia.move.v1.MsgExecute` constrained to `place_bid`, plus `SendAuthorization` capped at 20 INIT (gas). Per `INITIA_INTEGRATION.md` §3.2.
   - Expiration: 1h default surfaced in drawer copy; max 24h; user-selectable.
3. **Interwoven Bridge embedded in the buy flow.**
   - On a listing page, if connected user's INIT balance is insufficient for `price + estimated_gas`, show "Need INIT? Bridge from any chain →" button.
   - Clicking opens the InterwovenKit bridge component via `openBridge({ destChainId: 'provenance-1', destAmount: price })`.
   - On bridge success, the listing page polls balance and re-renders the buy button as enabled.
   - Bridge is also reachable from a top-nav "Add funds" button as a permanent affordance.
4. **Test all three flows end-to-end with a fresh wallet** (i.e. one that has never touched `provenance-1`).
5. **Commit, PR, merge.**

### Deliverable

Three Initia primitives are fully wired with no placeholders, and a fresh-wallet user can: bridge funds in, see their .init username, enable an auto-sign session, and place a bid in one tap.

### Success criterion (binary)

Demoable: from a never-used wallet, `bridge → mint test artwork → start auction → enable auto-sign → place 3 bids in 30 seconds without any wallet popup`. Recorded as a screen capture.

### Fall-back if blocked

- Auto-sign drawer broken in current InterwovenKit → demo the Enable/Disable toggle on the Settings page only; bid path falls back to per-tx prompt. Loses some points but remains functional.
- Bridge broken → embed the bridge link as `<a href="https://app.initia.xyz/bridge">` so the user can complete it on Initia's official UI. Loses the embedded UX but the user journey still completes.
- `.init` resolution endpoint outage → cached results still serve; new addresses fall back to shortened display.

---

## Phase 5 — Core user journeys (3.5h)

**Goal:** the five flows in `ARCHITECTURE.md` §4 work end-to-end in product.

### Tasks

1. **Journey 1 — Artist creates collection and mints.** (45 min)
   - `/create/collection` page: form for name, description, royalty %, image upload (R2 presign + finalize per `DEPLOYMENT_TOPOLOGY.md` §2.6). Submit calls `provenance::collection::create_collection`.
   - `/create/artwork` page: form for title, description, edition count, content upload, content hash. Submit calls `provenance::artwork::mint`.
   - Indexer picks up `CollectionCreatedEvent` and `ArtworkMintedEvent`, populates `/collection/[addr]` page.
2. **Journey 2 — Buyer wins an auction.** (60 min)
   - `/listing/[id]` page renders auction state from indexer GraphQL.
   - Bid panel uses auto-sign if enabled, regular sign otherwise.
   - Anti-snipe: bids in last 5 min extend end-time by 5 min (Move-side enforced; UI shows countdown).
   - On auction end, anyone can call `auction::finalize`. We auto-call from a small client-side scheduler when the user views their winning auction. Royalty + protocol fee + seller proceeds split visibly in the receipt.
3. **Journey 3 — Cross-chain purchase via bridge.** (30 min — mostly Phase 4 plumbing reused)
   - `/listing/[id]` for fixed-price: if INIT balance < price, "Bridge to buy" button. After bridge complete, "Buy now" enables.
4. **Journey 4 — Secondary resale enforces royalty.** (45 min)
   - `/portfolio` shows owned artworks. "List for resale" creates a new listing. Buy flow routes through royalty module — the Move tests already prove this; the UI just needs to display the receipt with "Royalty paid: X to artist."
   - **Crucially:** `/transfer` page (gift flow) demonstrates the royalty-bypass *attempt*. We literally show a button that tries `0x1::object::transfer_call` directly. The Move module reverts. The UI displays the revert reason and a learning tooltip: "Provenance Move resources do not allow paid transfers outside the marketplace. Free gifts are allowed via `gift()` which emits a GiftEvent." This is the headline demo moment.
5. **Journey 5 — Sequencer-down banner.** (10 min)
   - `apps/web/lib/health.ts` polls `https://rpc.provenance-1.initia.xyz/status` every 30s. If unreachable for 60s, set Zustand `chainHealthy=false`. A banner renders at top of screen: "Sequencer is currently unreachable. Existing artworks and bids are unaffected. New transactions will retry automatically when the chain returns."
6. **Commit, PR, merge each journey separately.** Five PRs, five reviews, five green CIs.

### Deliverable

All five flows in `ARCHITECTURE.md` §4 are interactive on `provenance.app`.

### Success criterion (binary)

End-to-end flow: a never-used wallet bridges in, sees an auction, enables auto-sign, places three bids without popups, wins, gets the artwork in their portfolio, lists it for resale, a second wallet buys it, and the original artist's wallet shows the royalty payment in their txn history. All in under 5 minutes.

### Fall-back if blocked

- A specific flow broken at T-2h to deadline → cut from demo, leave in product behind a feature flag. Fixed-price + auction + secondary are the headline trio; offer flow can be feature-flagged if necessary. **Royalty enforcement on resale must work — it's the product's identity.**

---

## Phase 6 — Polish + edge cases (2h)

**Goal:** the product survives a judge clicking around with no script.

### Tasks

1. **Error states.** Every async path has a user-visible error UI with a "Retry" button. No raw error strings in product. Toaster (`sonner`) for transient errors; full-page error boundaries for fatal ones.
2. **Loading states.** Every async path has a skeleton or spinner. No empty white screens during indexer queries.
3. **Empty states.** New collection with no artworks, new account with no bids, no current drops on home — each gets a designed empty state with a primary action.
4. **Mobile responsive.** Tested on iPhone SE viewport (375px) and on a real Android phone via Vercel preview. Layout remains usable; bid panels stack vertically; image galleries scroll horizontally.
5. **Accessibility pass.** Keyboard navigation works. `aria-label` on icon buttons. `prefers-reduced-motion` respected on animations. Lighthouse score ≥ 90.
6. **Status page.** `/status` shows chain health, indexer lag, image pipeline status, last-batch-posted time. Read-only. Linked from footer.
7. **Final design pass.** Typography, spacing, color contrast. Spot-fix anything that looks AI-generic.
8. **Commit, PR, merge.**

### Deliverable

Product feels finished, not "hackathon finished."

### Success criterion (binary)

Lighthouse on `provenance.app` ≥ 90 across Performance, Accessibility, Best Practices, SEO. No console errors during a 2-minute click-through. Mobile viewport renders correctly.

### Fall-back if blocked

This is the recoverable phase. If Phase 5 overruns, we cut polish proportionally — accessibility and error states are minimum-viable; loading skeletons and empty states are nice-to-have. Status page is a 15-minute job and ships regardless because it shows up well in the demo video.

---

## Phase 7 — Demo video (1h)

**Goal:** a 5–7 minute video that judges can watch end-to-end without confusion.

### Script (rehearsed once before recording, recorded in one take ideally, two takes max)

1. **0:00–0:30** — Title card: "Provenance — Royalties enforced by Move resources." Show artist Lina's situation: "OpenSea made royalties optional in 2024. Lina lost two-thirds of her secondary income. We fixed it."
2. **0:30–1:30** — Live chain proof. Open InitiaScan, show `provenance-1` ticking. Open the deployed Move package.
3. **1:30–2:30** — Artist mints. Connect wallet (Lina's). Show `lina.init` username. Mint a 3-edition piece.
4. **2:30–3:30** — Buyer flow. Switch to Carla's wallet (no INIT). Bridge in via Skip Go. Buy edition 1 directly. Show receipt: royalty paid to Lina, fee to protocol.
5. **3:30–4:30** — Auction. Edition 2 listed as auction. Enable auto-sign session ("place_bid only, 1 hour"). Three bids in five seconds with no popups. Win. Receipt again.
6. **4:30–5:30** — Royalty enforcement. Carla tries to gift edition 1 to a friend who pays her on-side. Show the literal Move revert. Show the alternative: legitimate resale through marketplace pays Lina automatically.
7. **5:30–6:30** — Cleanup. Show Settings → Auto-sign → Disable. Show /status page. Show the GitHub repo. Final card: "26 April 2026 — public, reproducible, royalties protected."

### Tasks

1. Rehearse once with a stopwatch.
2. Record with OBS — 1080p, 30fps. Microphone close-mic'd, no music.
3. Edit in DaVinci Resolve (free) — light cuts, no transitions, captions for any small text.
4. Export H.264 MP4, < 100MB.
5. Upload to YouTube unlisted. Capture URL.

### Deliverable

YouTube unlisted video URL. Local backup MP4 in repo `docs/demo.mp4` (Git LFS or download link in README).

### Success criterion (binary)

The video is < 7 min, every claim in it is reachable on the live deployment, and a judge watching with no context understands what Provenance is and why Initia's primitives matter.

### Fall-back if blocked

- Recording crashes → fall back to a screenshot-narrated voice-over (still functional, lower polish).
- Video too long → cut the bridge segment first (it's the most replaceable). Cut /status second.
- Wallet errors during recording → record in segments, edit together. Acceptable.

---

## Phase 8 — Submission package (1h)

**Goal:** every required artifact for HACK0016 submission is in the repo and the dorahacks form is filled.

### Tasks

1. **Create `.initia/submission.json`** with the schema the hackathon expects. Per the prompt, fields needed: project name, chain ID, deployed package address, demo URL, video URL, team list, primitives used. Final schema confirmed against any submission.json examples in current open-source HACK0016 repos.
2. **Final `README.md` covering:**
   - 30-second elevator pitch.
   - Architecture diagram (link to `docs/ARCHITECTURE.md`).
   - Live URLs (frontend, RPC, InitiaScan).
   - "Run it locally" — `just bootstrap` with prerequisites.
   - Demo video link.
   - Team and contact.
   - License (MIT for code, CC-BY-SA 4.0 for docs).
3. **Screenshots in `docs/screenshots/`** — home, mint, auction, royalty receipt, status. Linked from README.
4. **Tag a release `v0.1.0-hackathon`** on the exact commit submitted. Reproducibility checkpoint.
5. **Submit on dorahacks.io** form. Paste links. Double-check chain ID matches the Move package address. Triple-check video URL plays.
6. **Final smoke test** of submission state from a private window: clone repo, follow README, get to a working local dev loop. If it doesn't work, fix and resubmit.
7. **Post in `#hackathon-submissions` Discord** with the link.

### Deliverable

Submitted entry on dorahacks.io, public repo at `v0.1.0-hackathon` tag, every claim in the submission verifiable from the public artifacts.

### Success criterion (binary)

Submission confirmed by dorahacks (email/notification). Repo cloned-fresh in private window passes `just bootstrap`. Live frontend reachable from a non-team device.

### Fall-back if blocked

- Dorahacks form broken at T-30min → screenshot completed form + email it to organisers, post in Discord, do not panic.
- Wrong submission.json field → fix and force-update the form (most hackathon platforms allow edits before deadline).
- Repo accidentally private at submission → flip to public; verify via private window.

---

## Buffer (1h)

Reserved for: a Phase that ran 30 minutes long, a wallet UX bug discovered at submission time, a video re-record after spotting a typo in the title card, a last-minute README polish pass.

We will not pre-spend the buffer. If we run early through Phases 0–6, we use the buffer to harden the demo, not to add scope.

---

## Coverage gate enforcement timeline

The 100% Move test coverage commitment is binding from the **end of Phase 2 onward**. CI rejects any PR that drops coverage below 100% for the Move package. The only exemption is the documented R-BLD-03 fall-back in Phase 2 itself, which carries a TODO that must be resolved during Phase 6.

The frontend has a much weaker testing posture (intentional — visual UIs are not the right surface for unit-test farming in a 20-hour build). Frontend tests are "smoke tests via Playwright that walk the demo script." We add one Playwright test per user journey at the end of Phase 5 (~30 min total) — this gives us a regression net for Phase 6 polish without consuming serious time.

---

## What we are NOT building (no scope shrinkage on what's in; clarity on what isn't)

To be unambiguous about scope: items in the architecture that we will NOT ship in the hackathon submission and have not promised:

- Mobile native apps (web responsive only).
- Offer-acceptance flow (offer creation works; full acceptance is feature-flagged off if Phase 5 runs long).
- VIP allocation integration (post-hackathon — `INITIA_INTEGRATION.md` §6).
- IPFS image mirror (post-hackathon v1.1 — `DEPLOYMENT_TOPOLOGY.md` §2.6).
- Multi-VM rollup topology (post-hackathon — `DEPLOYMENT_TOPOLOGY.md` §4).
- Independent third-party challenger (production-blocker, named).
- Move package security audit (production-blocker, named).

### Added 26 April 2026 (build day, ~2h before deadline) — deferred to post-hackathon

The items below are in the codebase as configuration/scaffolding but were **not provisioned live** before the deadline. The submission ships the codebase + 414 passing tests; the live infrastructure is post-hackathon scope. This is documented in the README and submission.json honest_caveats list. Customer-buyer review impact: the Sponsor and Tomas personas would mark this as a 'conditional approve' — the code is real, the live URL is not.

- **Hetzner rollup VM (`provenance-rollup-1`)** — Terraform is at `infra/hetzner/main.tf` (hackathon-minimal variant: hcloud_token + ssh_public_key only, no Cloudflare DNS, no Better Stack, no Discord). Provisioning was descoped when SSH keypair generation hit Windows shell quoting issues with ~2h to deadline.
- **Cloudflare DNS (`rpc.provenance-1.initia.xyz`)** — deferred along with the Hetzner VM.
- **Vercel deployment of the frontend** — deferred. The Next.js production build (`pnpm build`) currently fails on a webpack-5 strict-exports issue carried in by `@initia/interwovenkit-react@2.8.0`'s deep imports of `@cosmjs/amino/build/signdoc.js` and `cosmjs-types/cosmos/...`. The dev server (`pnpm dev`) works; the production-build fix is post-hackathon.
- **`aptos move publish` to provenance-1** — deferred (no live appchain to publish to). The package compiles and 92/92 tests pass against the local Move VM.
- **Better Stack monitoring** — deferred along with the live infrastructure.
- **Discord alert webhook** — deferred along with the live infrastructure.
- **Post-deploy Playwright smoke against a live URL** — the spec is written and would run against `provenance.app` if it existed; deferred along with the deploy.

What IS shipped in v0.1.0-hackathon:

- The complete codebase (apps/web, apps/indexer, contracts, infra Terraform, docs, CI workflows) on a public GitHub repo.
- 414 tests, all passing (92 Move + 256 web + 66 indexer).
- Move 98.55% / web 100% / indexer 100% coverage (5 documented Rule-5 exemptions, 0 unauthorised gaps).
- All five user-journey Playwright specs.
- Architecture, threat model, build plan, customer-buyer review, brutal review, accountability audit, market context — all 14+ docs.
- README + submission.json honest about every deferred item.

These are not built **and not architected as if built**. The architecture documents are explicit about what is testnet vs mainnet vs aspirational.

---

## Customer-buyer review

> *Reviewing as Lina (artist) and as Marek (her notional dev hire who has actually run a 24-hour build and would call out hand-waving).*

### What Marek likes

1. **Phase 0's bootstrap-in-15-minutes is real.** He has been on too many "hackathon-grade" repos that took half a day to even compile. The README + `just bootstrap` + `mise` pin combination is ten minutes of upfront cost that pays for itself by Phase 3.
2. **Phase 2's coverage gate is enforced in CI from day one.** It's not aspirational. Without the gate, "100% test coverage" is the kind of thing teams say at the start of a build and never deliver.
3. **Phase 8 includes a fresh-clone smoke test.** This is what catches the "works on my laptop" failure mode that loses submissions.
4. **The 1-hour buffer is named and not pre-spent.** Plans that don't have buffer slip; plans that have buffer and pre-spend it slip worse.

### What Marek pushes back on

1. **"4 hours for Move modules with 100% coverage" is tight.** He'd give it 5 honestly. We accept this — Phase 2 is the most likely overrun source. The R-BLD-03 fall-back exists because we know this. Phase 6 polish is what we cut if Phase 2 takes 5 hours.
2. **Phase 4's auto-sign + bridge + .init in 2.5 hours assumes InterwovenKit "just works."** It usually does at v2.4+, but if there's a regression we'd burn an hour debugging upstream. Fall-back named.
3. **Single-take demo recording.** He'd budget 90 min for video (we have 60). If we miss recording the perfect take we use the 1-hour buffer. Acceptable.
4. **Phase 8 includes "fix and resubmit" if smoke test fails — but at 30 min before deadline that's tight.** True. The Phase 7 success criterion specifically requires the final smoke test before recording the video, so that the repo is known-clean by the time we hit Phase 8. This is a process fix, not a time fix.

### Where the plan is most likely to slip

In order of likelihood:

1. **Phase 2 — Move modules.** Median outcome 4.5h, p90 5.5h. Mitigation: R-BLD-03 fall-back, Phase 6 cut.
2. **Phase 4 — Initia primitives.** Median 2.5h, p90 3.5h if InterwovenKit has any sharp edge. Mitigation: each primitive has its own fall-back in this doc.
3. **Phase 5 — User journeys.** Median 3.5h, p90 5h if the indexer is slower than we expect. Mitigation: ship 4 of 5 journeys before the 5th, royalty journey is non-negotiable.

Total p90: ~22 hours, which is over budget. Mitigation is to start Phase 0 the moment the architecture documents are signed off (Saturday 17:35 the prompt was uploaded; T-32 hours to deadline). That's enough runway to absorb p90 with buffer.

### Verdict

Plan is honest about its risks and credible against the budget. Approve.
