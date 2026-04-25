# 05_START_PROMPT_RETRO_Build.md

**Project:** INITIATE Hackathon (HACK0016) — Provenance
**Page:** 3 of 4 (Build)
**Authored:** 2026-04-25 ~20:15 UTC, in the web-Claude session that produced the scaffold
**Audience:** Desktop Claude opening this folder for the first time

---

## What this folder is

You are looking at a Move-based marketplace project called **Provenance**. The
product's headline is non-circumventable royalty enforcement — Move's resource
model + `friend` visibility makes the only paid-transfer path of an `Artwork`
go through `provenance::royalty::settle`, by construction. The customer brief
came from `docs/CUSTOMER_BUYER_REVIEW.md`, the architecture came out of Page 2
in `docs/ARCHITECTURE.md` and the nine companion docs in `docs/`.

**This is Page 3 of 4** in a four-page hackathon delivery cadence:

- Page 1 — Retrospective / brief (where the customer pain came from).
- Page 2 — Architecture (locked-in, in `docs/`). Closed with `03_DONE_PROMPT_Architecture.md`.
- **Page 3 — Build (this page).** Opened with `04_BUILD_PROMPT.md`.
- Page 4 — Submission closeout (after Phase 8 ships).

Each page has three prompts at the project root:

1. `*_START_PROMPT_RETRO_*.md` — context handoff (you are reading 05).
2. `*_DESIGN_PROMPT_*.md` — the operational rules for the page (you will read 06 next).
3. `*_DONE_PROMPT_*.md` — written at the end of the page summarising what was actually shipped.

---

## What was done in the prior session (web Claude, 2026-04-25 17:00–20:00 UTC)

The web session was, per `04_BUILD_PROMPT.md` §"READ THIS FIRST", **not the
correct environment** to execute the build. It cannot `git push`, `aptos move
publish`, `terraform apply`, or run `pnpm install`. The user pushed it anyway
to "create all the files" so that Desktop would have a real starting point
rather than a blank checkout.

**What the web session produced — and what's broken about it:**

- Phase 0 root config — Justfile, mise.toml, package.json, pnpm-workspace.yaml, .gitignore, .gitleaks.toml, husky pre-commit, prettier, MIT/CC-BY-SA licenses. **Not yet committed to a remote — no GitHub repo exists.**
- All 10 architecture docs + 4 new docs (`PHASE_REVIEWS.md`, `JUDGE_FAQ.md`, `SECRETS.md`, `SETUP-WINDOWS.md`) plus 4 extra context docs from the architecture session (`ARCHITECTURE_ACCOUNTABILITY.md`, `CUSTOMER_BUYER_REVIEW_v2_BRUTAL.md`, `EXTRA_THOUGHTS.md`, `MARKET_CONTEXT.md`).
- Move package — 6 modules (`royalty`, `artwork`, `collection`, `market`, `auction`, `counters`) and 54 tests across 6 test files. **Not compiled, not run.** Likely fixes needed: `acquires` annotations the borrow checker insists on, exact tuple shape of `aptos_coin::initialize_for_test`, possible Initia framework version drift on stdlib types.
- Web app skeleton — Next.js 15 + Tailwind + Vitest + Playwright. Layout, providers, ConnectButton, BidPanel, BuyPanel, AddFundsButton/BridgeToBuyButton, SequencerBanner, Header, Footer, ArtistHeader, ArtworkCard/Grid, AuctionDetail, CollectionGrid/Header, ListingDetail, EmptyState, LiveDropsGrid. Pages: home, status, settings/sessions, create/collection, create/artwork, portfolio, transfer. 4 API routes (presign, finalize, health, graphql proxy). Typed wallet shim at `apps/web/lib/wallet/kit.ts`. **`pnpm install` has never run.** The Vitest 100% coverage gate is *configured* in `vitest.config.ts` but unproven.
- Indexer — schema, sync poller, event decoder, Postgres writer, GraphQL type defs, 3 test files. **`Buffer.from(...)` is used in `decode.ts` without `import { Buffer } from 'node:buffer'`** — likely test failure on first run. **No GraphQL server is actually started**; `src/index.ts` only spawns the polling loop. **No DB migrations exist** — the schema is declared but nothing CREATEs the tables.
- Infra — Hetzner Terraform main.tf, Cloudflare DNS, full cloud-init bootstrap with systemd units for minitiad/executor/challenger/Caddy/Vector. **No `secrets.tfvars`** (only the `.example`). **No snapshot-restore drill runbook.**
- `.initia/submission.json` with placeholder values for repo URL, demo video URL, package address.
- 5 Playwright journey specs + smoke spec. Some specs target **routes that don't exist yet** — `/listing/[id]`, `/auction/[id]`, `/collection/[id]`, `/artwork/[addr]`, `/artwork/[addr]/list`, `/discover`, `/about`. These were deleted mid-build to fix import errors and never restored.

**Honest gaps you must close** (a brutal list, no spin):

1. **Missing page routes** — `/listing/[id]`, `/auction/[id]`, `/collection/[id]`, `/artist/[username]`, `/artwork/[addr]`, `/artwork/[addr]/list`, `/discover`, `/about`. Components for the first five exist (`ListingDetail`, `AuctionDetail`, `CollectionHeader`+`ArtworkGrid`, `ArtistHeader`+`CollectionGrid`); pages just need to be wired. The list-for-resale page (5C, the headline royalty journey) is **completely absent** — without it the demo's centerpiece cannot be performed.
2. **Indexer GraphQL server is not implemented** — only the type definitions exist. The web frontend's `/api/graphql` proxy hits `http://localhost:42069/graphql` which returns nothing meaningful. Either implement a yoga/Hono server reading the Postgres tables, or replace the indexer's frontend-facing role with direct `pg` queries from the Next.js API routes.
3. **DB migrations / schema bootstrap** — write a `apps/indexer/migrations/0001_init.sql` that mirrors the schema in `ponder.schema.ts` and run it on startup.
4. **Buffer import in `apps/indexer/src/decode.ts`** — add `import { Buffer } from 'node:buffer'`.
5. **Move tests** — abort codes are *believed correct* against the canonical `std::error::*` categories (INVALID_ARGUMENT=0x1, INVALID_STATE=0x3, PERMISSION_DENIED=0x5, INTERNAL=0xA), but never verified against Initia's MinitiaStdlib fork. Run `aptos move test --coverage` first thing; expect 5–20 small fixes.
6. **`.env.example` does not exist** — `.gitignore` allows it, `SETUP-WINDOWS.md` references it, no template ever got written. New devs cannot bootstrap without one.
7. **Mobile-viewport Playwright spec** — Phase 6 task, not written.
8. **No actual repo on GitHub yet** — Phase 0 step 1 (`gh repo create`) was never executed.
9. **Kit shim runtime cast** — `apps/web/lib/wallet/kit.ts` does `useInterwovenKitRaw() as unknown as KitSurface`. If InterwovenKit v2.4's runtime shape differs from the documented surface, the cast is the single point of failure. Verify on first run.

**Coverage status:**

- **Configured at 100%** in both vitest configs and the CI workflow gate.
- **Achieved coverage on first run is unknown.** Tests reference functions that exist, but `pnpm install` has never run and `aptos move test` has never run. Real number lands somewhere between "almost 100% with a handful of fixes" and "70% with several broken tests" — only running them tells you which.

---

## Files at the project root (page-level prompts)

```
01_START_PROMPT_RETRO_Architecture.md          # Page 2 start
02_ARCHITECTURE_DESIGN_PROMPT.md               # Page 2 design (what produced the docs)
03_DONE_PROMPT_Architecture.md                 # Page 2 close
04_BUILD_PROMPT.md                             # Page 3 START (the build prompt — read this)
05_START_PROMPT_RETRO_Build.md                 # YOU ARE HERE
06_BUILD_DESIGN_PROMPT_FOR_DESKTOP.md          # Read this NEXT — operational rules for Desktop
07_DONE_PROMPT_Build.md                        # Desktop will write this at end of Phase 8
```

---

## How to begin

1. Open `06_BUILD_DESIGN_PROMPT_FOR_DESKTOP.md`. That document is binding for
   every commit you make. Re-read it at every phase boundary; do not paraphrase
   from memory.
2. Then re-open `04_BUILD_PROMPT.md` for the phase plan.
3. Then start Phase 0 — `gh repo create`, branch protection, push the initial
   tree, observe CI.

The build/test/commit/push/test loop in `06` is non-negotiable. There is no
"trust me" mode. Everything is journaled in commits.

Now go.
