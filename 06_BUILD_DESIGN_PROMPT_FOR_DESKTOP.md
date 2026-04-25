# 06_BUILD_DESIGN_PROMPT_FOR_DESKTOP.md

**Authored:** 2026-04-25, end of web Claude session
**Audience:** Desktop Claude with local filesystem write, shell execution, and
network access
**Status:** Binding. Re-read at every phase boundary. Do not paraphrase from memory.

---

## 0. Read this and accept it before doing anything

You have access to a working directory containing a partially-built scaffold
of the Provenance project (Page 3 of 4 — Build). The web Claude session that
produced the scaffold could not run `pnpm install`, `aptos move test`,
`terraform apply`, or `git push`. **You can.** Your job is to take the scaffold
through to a green CI, a live deployment, a working demo, and a hackathon
submission, while obeying the operational rules below.

The scope target is **100%** — every page route, every API route, every Move
test, every Vitest test, every Playwright journey from `04_BUILD_PROMPT.md`
must work. The coverage target is **100%** — the gate is configured and the
gate is real. **You do not lower the gate to make CI green.** You do not skip
tests. You do not delete tests that fail. You make the production code right.

If at any point you find yourself thinking "I'll just disable this check for
now", stop and re-read this section.

---

## 1. The Loop — the only acceptable rhythm

This is the contract. Every change goes through this loop. Every change. No
exceptions for "small" changes, no exceptions for "obvious" changes, no
exceptions for "I'll batch them later".

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                 │
  │   1.  build / write production code                             │
  │                                                                 │
  │   2.  build / write or update tests                             │
  │                                                                 │
  │   3.  run tests locally — full relevant suite                   │
  │       (Move: aptos move test --coverage)                        │
  │       (Web:  pnpm --filter web test:coverage)                   │
  │       (Indx: pnpm --filter indexer test:coverage)               │
  │       (E2E:  pnpm --filter web exec playwright test)            │
  │                                                                 │
  │   4.  IF any test red →  fix PRODUCTION code (not the test).    │
  │       go back to step 1.                                        │
  │                                                                 │
  │   5.  git add -p   (selective; never `git add .`)               │
  │       git commit -m "<conventional commit>"                     │
  │       git push                                                  │
  │                                                                 │
  │   6.  watch CI on the PR                                        │
  │                                                                 │
  │   7.  IF CI red → diagnose, fix, go back to step 1.             │
  │       Do NOT merge red CI under any circumstance.               │
  │                                                                 │
  │   8.  IF CI green → squash-merge to main, branch deleted        │
  │                                                                 │
  │   9.  IF more work to do → go back to step 1                    │
  │                                                                 │
  │   When the phase's success criterion (binary, defined in        │
  │   04_BUILD_PROMPT.md) is met:                                   │
  │   → write the customer-buyer review row in PHASE_REVIEWS.md     │
  │   → move to next phase                                          │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

**This loop has no exceptions.** It is binding for every commit, including
documentation commits, including config tweaks, including renaming a file. The
discipline is the product.

---

## 2. The forbidden moves

Any of these is a stop-and-explain situation. If you catch yourself doing one,
revert and try again.

- **Disabling a test** to unblock CI. (`xit`, `it.skip`, `#[test_only]` on a
  failing test, commenting out an `assert!`, etc.)
- **Lowering a coverage threshold** in `vitest.config.ts` or
  `.github/workflows/ci.yml` to make a gate green.
- **Adding `// @ts-ignore`, `eslint-disable`, `# noqa`, `as any`** to silence a
  real warning. The typed shim at `apps/web/lib/wallet/kit.ts` is the *only*
  approved place for an InterwovenKit `as unknown as` cast.
- **Catching an exception and swallowing it** to make a test pass.
- **Mocking a dependency to hide a real integration failure.** Mocks are for
  isolation, not for hiding bugs.
- **Committing red tests** with `TODO`, `xit`, `it.skip`, `#[test_only]` on
  failing tests, `#[ignore]`, etc. — unless the skip is documented in
  `contracts/COVERAGE.md` or `apps/web/COVERAGE.md` (Rule 3 below).
- **Reverting a test "because the test was wrong"** without first writing a
  *different* test that demonstrates the correct behaviour.
- **Force-pushing to `main`** for any reason. (Force-push to your own feature
  branch is fine; `main` is locked.)
- **`git add .`** — always `git add -p` so you see exactly what is being
  committed.
- **Squashing multiple unrelated changes into one commit.** One concern per
  commit, conventional commits format.

---

## 3. Coverage exemptions — written, named, capped

Hard cap: **5 exemptions across the entire codebase.** Distributed:
- 3 for Move (`contracts/COVERAGE.md`)
- 2 for web (`apps/web/COVERAGE.md`)

Each exemption is a row with: file:line, reason it cannot reasonably be
tested, who signed off, and a `RISK_REGISTER.md` reference. **No 6th
exemption is permitted.** If you hit a 6th, pause: refactor to make the path
testable, or cut the feature.

The `apps/indexer/vitest.config.ts` excludes `src/index.ts` (entrypoint with
top-level await) and `src/schema.graphql.ts` (string constant) — these are
configuration choices, not exemptions, and do not count against the budget.

---

## 4. What "100% scope" means concretely

Every item in this list must be present, working, and tested before Phase 8
ships. The list is closed; nothing else can be removed without a
`BUILD_PLAN.md` "what we are NOT building" same-PR update.

### Move package (contracts/)
- `royalty.move`, `artwork.move`, `collection.move`, `market.move`, `auction.move`, `counters.move` — all present.
- `aptos move test --coverage` reports **100.00%** with no exemptions used (or with named exemptions in `contracts/COVERAGE.md`, ≤3).
- ≥54 tests across royalty (12), artwork (10), collection (6), listing (8), offer (6), auction (12).
- Package published to `provenance-1` testnet; package address recorded in `.initia/submission.json` and `apps/web/.env.production`.

### Web app (apps/web/)
- Page routes: `/`, `/status`, `/settings/sessions`, `/portfolio`, `/transfer`, `/create/collection`, `/create/artwork`, `/listing/[id]`, `/auction/[id]`, `/collection/[id]`, `/artist/[username]`, `/artwork/[addr]`, **`/artwork/[addr]/list` (the headline 5C resale flow)**, `/discover`, `/about`. Pages currently *missing* are listed in `05_START_PROMPT_RETRO_Build.md` §"Honest gaps".
- API routes: `/api/health`, `/api/graphql`, `/api/presign`, `/api/finalize`.
- All 5 user journeys from `ARCHITECTURE.md` §4 work end-to-end on `provenance-1`:
  1. Mint
  2. Auction (with auto-sign 1-tap bidding)
  3. Royalty enforcement (resale + bypass-attempt revert) ← THE HEADLINE
  4. Cross-chain bridge-to-buy
  5. Sequencer-down banner
- `pnpm --filter web test:coverage` reports **100%** lines/branches/functions/statements.
- `pnpm --filter web exec playwright test` — all 6 specs green
  (wallet-connect, mint, auction, royalty, bridge-buy, sequencer-down).
- Mobile viewport check at iPhone SE (375×667) — Playwright spec exists and is green.
- `provenance.app` (or whatever production domain) loads from a non-team device, no console errors during a 2-minute click-through.

### Indexer (apps/indexer/)
- Move event poller working against the live `provenance-1` RPC.
- Postgres schema bootstrapped (write `migrations/0001_init.sql`).
- GraphQL server actually running and serving the documented queries
  (`liveDrops`, `portfolio`, `auction`, `listing`, `collection`, `artwork`, `health`).
- `pnpm --filter indexer test:coverage` reports **100%**.
- Indexer lag <30s observed against the live chain.

### Infra (infra/)
- Hetzner CX22 in `nbg1` provisioned via `terraform apply`.
- Caddy serving `https://rpc.provenance-1.initia.xyz` with a real LE cert.
- `minitiad`, `opinit-executor`, `opinit-challenger`, `caddy`, `vector`
  systemd units active and restart-on-crash verified.
- Snapshot-restore drill done once at end of Phase 1, once again at end of
  Phase 5. Timing recorded in `docs/SNAPSHOT_RESTORE_DRILL.md` (you write
  this).
- Better Stack alerts wired and a test alert fired through Discord.

### Submission (.initia/)
- `submission.json` filled with **real values** (no `REPLACE`).
- v0.1.0-hackathon git tag on the exact submission commit.
- Fresh-clone smoke test: clone into a `mktemp -d`, `mise install && just bootstrap && just test` — green.
- dorahacks.io submission confirmed via incognito.

### Docs (docs/)
- All architecture docs untouched **unless** a same-PR deviation requires an
  update (Rule 7 below).
- `PHASE_REVIEWS.md` filled in for all 8 phases × 5 personas (Lina, Marek,
  Carla, Tomas, Sponsor).
- `SNAPSHOT_RESTORE_DRILL.md` written.
- `.env.example` written (you do this).

---

## 5. Phase boundaries — the 8 phases

Follow `04_BUILD_PROMPT.md` §"Phase Sequence" exactly. The phases, with
hard time caps, are:

| Phase | Goal | Cap |
|---|---|---|
| 0 | Remote-first setup, CI green on initial scaffold | 30 min |
| 1 | Live appchain `provenance-1` reachable from external network | 60 min |
| 2 | Move modules deployed to `provenance-1` with **100%** coverage | 90 min hard / 120 min absolute |
| 3 | Frontend skeleton + InterwovenKit on Vercel | 75 min |
| 4 | All 3 load-bearing Initia primitives wired (`.init`, auto-sign, bridge) | 90 min |
| 5 | All 5 user journeys end-to-end | 90 min |
| 6 | Polish — error boundaries, loading states, empty states, /status | 30 min |
| 7 | Demo video — 5–7 min, YouTube unlisted | 60 min |
| 8 | Submission package — dorahacks.io confirmed | 60 min |

At every phase boundary write the customer-buyer review (Rule 7 below) into
`docs/PHASE_REVIEWS.md`. **The phase is not closed until the review is
written.** Even if it's just one persona for that phase (e.g. Phase 0 is
Marek-only). You do not skip the review to "save time".

---

## 6. Phase 0 — the first thing you do

Before any other code is written:

```sh
# 1. Initialise git locally
cd <working-dir>
git init -b main

# 2. Create the GitHub repo (you must be `gh auth login`'d)
gh repo create <org>/provenance --public --source=. --description \
  "Move-based marketplace with protocol-enforced royalties — INITIATE HACK0016"

# 3. Push the initial tree (Page 3 will start here)
git add -p          # stage selectively, review every hunk
git commit -m "chore(scaffold): import Page 2 architecture + Page 3 web/indexer/Move scaffold"
git push -u origin main

# 4. Branch protection — require PR, 1 approval, CI green, no force-push.
#    Self-approve OK for solo build. This MUST be in place before any
#    feature branch is opened.
gh api -X PUT repos/<org>/provenance/branches/main/protection \
  -f required_status_checks.strict=true \
  -F required_status_checks.contexts[]=CI \
  -F enforce_admins=true \
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -F restrictions= \
  -F allow_force_pushes=false

# 5. Verify CI runs and is green on main
gh run list --limit 1
# → wait until "CI" workflow is green. If red, fix on a feature branch
#   before any other work.

# 6. Add the Phase 0 secrets per docs/SECRETS.md to GitHub Actions:
gh secret set R2_ACCESS_KEY_ID < /tmp/r2_key
gh secret set R2_SECRET_ACCESS_KEY < /tmp/r2_secret
# ... (full list in docs/SECRETS.md)

# 7. The fresh-clone smoke test — proves Phase 0 actually works
TMPDIR=$(mktemp -d)
gh repo clone <org>/provenance "$TMPDIR/fresh"
cd "$TMPDIR/fresh"
mise install
just bootstrap        # must succeed in <15 min from cold
echo "Phase 0 done."
```

If any step fails, **fix the underlying tool/config**, do not document the
workaround. Phase 0's whole point is reproducibility.

---

## 7. Architecture documents are read-only inputs

`docs/ARCHITECTURE.md`, `docs/TECH_STACK.md`, `docs/DATA_MODEL.md`,
`docs/API_CONTRACT.md`, `docs/INITIA_INTEGRATION.md`,
`docs/SECURITY_THREAT_MODEL.md`, `docs/DEPLOYMENT_TOPOLOGY.md`,
`docs/BUILD_PLAN.md`, `docs/RISK_REGISTER.md`, `docs/CUSTOMER_BUYER_REVIEW.md`
— these were locked in at end of Page 2.

If the build *needs* to deviate (e.g. `@initia/interwovenkit-react` v2.5.0
ships and is preferable to v2.4.0), update the relevant doc **in the same PR
as the deviation**. Silent drift is forbidden. The architecture is the
contract; deviations are journaled, not negotiated.

---

## 8. Customer-buyer review at every phase boundary

End of every phase, write a 5-paragraph review against the personas
(Lina/Marek/Carla/Tomas/Sponsor) into `docs/PHASE_REVIEWS.md`. Verbatim, in
their voice, brutal where needed.

If any persona says "no" or "conditional", the phase is not done until the
condition is met or explicitly waived in the same row.

For phases where only one persona is relevant (Phase 0 = Marek alone, Phase 6
= Carla alone), record that — and only that.

---

## 9. Brutal honesty in product copy

The `/status` page, the README, and the demo video must tell the truth about:
- single-VM topology
- R2-only image storage (no IPFS mirror in v0.1.0)
- single-team challenger
- no Move audit
- six conditions for production (already enumerated on `/status`)

The submission's credibility comes from honesty, not gloss. Do not soften any
of these in copy.

---

## 10. When to ask the user a question

Ask only when there is **genuine ambiguity** that the architecture documents
do not resolve and where guessing wrong would waste >15 minutes.

**Ask:**
- "Dorahacks's submission.json schema example field `chain_id_l2` differs
  from our `rollup_chain_id` — which?"
- "Which Initia testnet RPC endpoint is currently most reliable — the one in
  the chain registry, or the alternate at `…`?"

**Don't ask:**
- "Should I use Vercel or Netlify?" — `TECH_STACK.md` says Vercel.
- "Is it OK to skip a test to save time?" — Forbidden by Rule 2.
- "Should I update the architecture docs to reflect this change?" — Yes,
  always, same PR.

Default: act.

---

## 11. End-of-Build closeout

When Phase 8's success criterion is met (dorahacks confirmed + fresh-clone
smoke green + live deploy reachable from non-team device), write
`07_DONE_PROMPT_Build.md` covering:

- All 8 phases ticked off with timestamps
- Coverage on each layer (actual % achieved — be brutal if not 100%)
- Live URLs (frontend, RPC, InitiaScan, video)
- Aggregated 5-persona review (Lina/Marek/Carla/Tomas/Sponsor verdicts)
- Lessons captured — what worked, what didn't, what to carry into Page 4
- Hand-off summary for Page 4 (Submission Closeout)

Page 4 is a 30-min retrospective + post-submission monitoring + judge Q&A.
It runs *after* Phase 8 ships.

---

## 12. The unspoken rule

If you ever find yourself writing a comment like "this is a placeholder, fix
later" or "TODO: replace with real value" or "// FIXME after demo", you have
already lost. The prior session shipped a scaffold riddled with those
markers and they are exactly why this prompt is so long. **There are no
placeholders in production code.** Replace with the real value, or do not
ship the file.

The only exception: a coverage exemption row in `*/COVERAGE.md`, which is a
written, named, capped agreement to not test a specific line.

---

## 13. Final word before you start

The scaffold from web Claude is roughly 80% done by file count. The remaining
20% is the work that actually makes the demo function — the resale flow, the
GraphQL server, the missing routes, the abort-code corrections, the cloud
provisioning. That's the work. Plus running every test, watching every fail,
fixing every fail, until everything is green.

You have ~10 hours of build window if you start now. The hackathon submission
deadline is **Sunday 26 April 2026 01:00 UTC**.

The Loop in §1 is binding. Begin.
