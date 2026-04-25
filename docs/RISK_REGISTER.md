# RISK REGISTER — Provenance

**Status:** locked for hackathon submission, expected to evolve during build
**Owner of this document:** Build lead
**Cadence:** reviewed at end of each `BUILD_PLAN.md` phase; high-impact items reviewed daily during build
**Companion docs:** `BUILD_PLAN.md` (phase fall-backs), `DEPLOYMENT_TOPOLOGY.md` (operational risks), `SECURITY_THREAT_MODEL.md` (security-class risks).

This document tracks every named risk to the Provenance hackathon submission and to the notional production roadmap. Each risk has an ID, a description, a likelihood (L/M/H), an impact (L/M/H), a named mitigation, a contingency if mitigation fails, and an owner.

The categories are: **TEC** technical, **BLD** build-process, **DEM** demo, **SUB** submission, **COM** competitive, **POST** post-submission, **OPS** operations, **PROD** production-readiness (notional, but documented because customer-buyer review demanded it).

Likelihood/impact scoring is based on the build lead's calibrated judgment, anchored to base rates from past hackathon submissions in similar ecosystems. We are not trying to eliminate every risk — we are trying to know which ones matter and have a plan when they hit.

---

## Risk register table

### Technical risks

| ID | Description | L | I | Mitigation | Contingency | Owner |
|---|---|---|---|---|---|---|
| **R-TEC-01** | InterwovenKit version regression breaks `useInterwovenKit` hook (e.g. autoSign API rename, `openConnect` deprecation) | M | H | Pin to exact version `2.4.0` in `package.json` (no caret), verify in Phase 0, document the version in `INITIA_INTEGRATION.md` | Lock to last-known-good version commit; if upstream is broken at our pin, fork and patch in `apps/web/lib/interwovenkit-shim.ts` | Frontend lead |
| **R-TEC-02** | Weave CLI bug during `weave init` or `weave opinit init` blocks rollup launch | M | H | Test the full Phase 1 flow on a throwaway Hetzner VM before main provisioning. Pinned tool versions in `infra/versions.env`. | Fall back to manual minitiad/opinitd init flow (pre-Weave era; documented in Initia docs). Adds ~30 min, no scope cut. | Build lead |
| **R-TEC-03** | Initia testnet `initiation-2` RPC outage during demo or build | M | M | Use Initia's primary public RPC plus a fallback RPC; switch via env var. Multiple-endpoint client config in `apps/web/lib/rpc.ts`. | If both RPCs down, demo from local recording only and explicitly call this out as testnet flakiness; it does not invalidate our chain. | Frontend lead |
| **R-TEC-04** | Celestia mocha-4 DA outage during demo (degraded settlement) | L | M | OPinit batch posting retries automatically. Local rollup state remains valid. | Switch DA flag to `--da local` for demo; submission language acknowledges Celestia upgrade pending. Loses purity points; remains submitted. | Build lead |
| **R-TEC-05** | Hetzner VM hardware failure during demo window | L | H | Daily snapshots; restore-from-snapshot tested in Phase 1 (~10 min restore time). | Snapshot restore. If snapshot corrupt, Vultr fallback Terraform module pre-staged (~30 min total). | Build lead |
| **R-TEC-06** | Move test coverage gate cannot reach 100% due to a Move stdlib path that's structurally untestable (e.g. native function fallback) | L | M | Validate during Phase 2 first hour with a coverage dry-run; if a path is structurally exempt, document it in `contracts/COVERAGE.md` and adjust the gate to "100% on our modules; native paths excluded with rationale." | Documented exception list in CI config; gate remains at the strictest achievable bar. | Build lead |
| **R-TEC-07** | Cloudflare R2 outage during demo or upload | L | M | R2 has 99.9% historic uptime; uploads have client-side retry (3 attempts, exponential backoff). | If R2 down during demo, demo a previously-uploaded artwork; mint flow can be skipped from the live demo and shown via screenshot. | Frontend lead |
| **R-TEC-08** | Skip Go bridge route fails for the demo source chain (e.g. Solana → Initia route degraded) | M | M | Demo with Ethereum-USDC route as primary; Solana as backup. Both tested 24h before demo. | If both fail, demo only the post-bridge buy flow with a pre-funded wallet, narrate the bridge step. | Frontend lead |
| **R-TEC-09** | Indexer (Ponder) lags behind chain head during demo, frontend shows stale data | L | M | Health check renders "indexer X blocks behind" banner at >20 block delta. Phase 5 includes Playwright check that head delta < 5 in CI smoke test. | Manual indexer restart from Railway dashboard during demo (visible to viewer; recoverable). | Backend lead |
| **R-TEC-10** | Move package publish fails on first attempt (gas, signature, build artifact mismatch) | M | L | Test publish to a throwaway account first. Bumped gas limit by 2× from estimate. | Republish from clean account with fresh BCS payload. Never blocks for more than 15 min. | Build lead |

### Build-process risks

| ID | Description | L | I | Mitigation | Contingency | Owner |
|---|---|---|---|---|---|---|
| **R-BLD-01** | Scope creep — adding a "small extra feature" that bleeds 2 hours from polish | H | M | Scope-frozen list in `BUILD_PLAN.md` §"What we are NOT building". Any new feature requires explicit cut from existing scope. | Cut at Phase 6 (polish) without adding the new feature. Defer to v1.1. | Build lead |
| **R-BLD-02** | Time slippage in Phase 2 (Move + 100% coverage) — p90 estimate is 5.5h vs 4h budget | M | M | Buffer Phase 6 polish. R-BLD-03 covers the worst case. | Trim Phase 6 polish proportionally; if Phase 2 hits 6h, drop one nice-to-have edge case test (R-BLD-03). | Build lead |
| **R-BLD-03** | A Move test edge case takes >30 min to nail and threatens the Phase 2 budget | M | L | Pre-authorized exemption in `BUILD_PLAN.md` Phase 2 fall-back: skip with `// TODO(R-BLD-03)` comment, log in this register, close in Phase 6. Royalty/auction core paths NOT eligible for exemption. | Phase 6 closes the gap; if Phase 6 runs short, the gap ships and is documented in `README.md`. | Build lead |
| **R-BLD-04** | Integration friction between Phase 4 primitives — e.g. auto-sign drawer steals focus from bridge modal | M | M | Each primitive has a standalone settings page where it can be tested without contention. Integration into bid panel is the last step in Phase 4. | If integration breaks, ship the standalone pages; bid panel falls back to per-tx prompt. Loses elegance, retains scoring. | Frontend lead |
| **R-BLD-05** | Engineer fatigue / decision quality drops at hour 14+ | H | M | Fixed sleep window scheduled in `BUILD_PLAN.md` (after Phase 5, before Phase 6 — 4h sleep minimum). | Cut Phase 6 polish ahead of cutting sleep. Tired demo recording is worse than rough polish. | Build lead |
| **R-BLD-06** | Two team members editing the same file produce a merge conflict that takes 30 min to resolve | L | L | Phase ownership is single-engineer per phase per `BUILD_PLAN.md`. Cross-cutting concerns (env vars, types) are touched in dedicated PRs. | Standard merge workflow; if conflict drags, one engineer pauses and helps unblock. | Build lead |
| **R-BLD-07** | A pinned dependency has a CVE published mid-build, GitHub Dependabot fires red alerts | L | L | Acknowledge but do not act on Dependabot alerts during build window unless the CVE is exploitable in our code path. Post-submission triage. | Defer to Phase 6 polish window. | Build lead |

### Demo risks

| ID | Description | L | I | Mitigation | Contingency | Owner |
|---|---|---|---|---|---|---|
| **R-DEM-01** | Initia testnet `initiation-2` flakiness during demo recording (RPC slow, batch posting stalled, blocks delayed) | M | M | Record demo in a low-traffic window (early UK morning); rehearse end-to-end an hour before record to confirm chain health. Both RPC endpoints monitored. | Re-record after waiting 15 min. If chain health does not recover, narrate over screenshots of a pre-recorded happy-path session. | Build lead |
| **R-DEM-02** | Recording software (OBS) crashes mid-take | L | M | OBS configured with auto-save every 60s. Screen recording also captured by macOS QuickTime as belt-and-braces redundancy. | Restart OBS, retake. Edit the two halves together if needed. | Build lead |
| **R-DEM-03** | Wallet UX bug appears live (tx popup malformed, signing fails) only during recording | M | M | Phase 4 success criterion explicitly requires fresh-wallet end-to-end test. Demo wallet is reset to fresh state before each rehearsal. | Cut to a different segment of the script; record the failed segment separately and edit. Accepted: visible cuts are better than visible failures. | Build lead |
| **R-DEM-04** | Demo audio quality is poor — wind, neighbour, microphone gain | L | L | Close-mic'd USB mic (already owned). Quiet room. Test record before take. | Re-record audio over silent video in DaVinci Resolve. | Build lead |
| **R-DEM-05** | Demo runs over 7 minutes after first edit pass | M | L | Script is timed in rehearsal; first edit pass aims for 5:30 to leave headroom. | Cut bridge segment first (most replaceable), then status page. Royalty enforcement segment is sacred. | Build lead |
| **R-DEM-06** | YouTube upload fails or takes > 30 min to process | L | M | Upload immediately on Phase 7 completion, ~3h before deadline. Local MP4 always available. | If YouTube unavailable, fall back to Streamable, then to Drive shareable link. Submission allows any public video URL. | Build lead |

### Submission risks

| ID | Description | L | I | Mitigation | Contingency | Owner |
|---|---|---|---|---|---|---|
| **R-SUB-01** | `.initia/submission.json` schema mismatch (missing fields, wrong field names) | M | H | Validate against any HACK0016 example submissions referenced in the hackathon docs. Pull schema from organiser examples in Phase 8 first 10 minutes. | Fix and re-tag the release; resubmit on dorahacks. | Build lead |
| **R-SUB-02** | Repo accidentally private at submission time (forgot to flip after build window) | L | H | Phase 8 task: explicit "verify repo public via private incognito window" step. | Flip to public, comment on dorahacks submission with "repo now public, link unchanged." | Build lead |
| **R-SUB-03** | Demo video URL not accessible to judges (unlisted YouTube link with regional block, expired link, etc.) | L | H | Test URL in incognito, on a non-team device, on mobile, before submission. Backup MP4 in repo (Git LFS). | Replace URL on dorahacks; if dorahacks edit window closed, email organisers. | Build lead |
| **R-SUB-04** | Wrong chain ID in submission form (typo, off-by-one) | L | H | Copy/paste from a single source-of-truth env var. Verify by clicking the InitiaScan URL in form preview. | Edit submission; if past deadline, Discord post + email organisers. | Build lead |
| **R-SUB-05** | Dorahacks form requires a field we haven't anticipated (team SSO, org wallet address, KYC) | L | M | Open the form in Phase 0 to scan for fields. Don't wait until Phase 8. | Fill on Phase 8 with best available answer; flag in Discord. | Build lead |
| **R-SUB-06** | Submission window closes 5 minutes earlier than expected (timezone confusion) | L | H | Treat 26 April 01:00 UTC as 26 April 00:30 UTC for ourselves. Builds 30 min implicit margin. | Submit early, edit if necessary. | Build lead |
| **R-SUB-07** | License conflict between MIT (code) and CC-BY-SA 4.0 (docs) flagged by judges | L | L | Single `LICENSE-CODE` file (MIT) and `LICENSE-DOCS` file (CC-BY-SA 4.0); README is explicit about which applies where. | Restate in submission form. Not blocking. | Build lead |

### Competitive risks

| ID | Description | L | I | Mitigation | Contingency | Owner |
|---|---|---|---|---|---|---|
| **R-COM-01** | A similar Move-based NFT marketplace BUIDL appears in the last 24h and overlaps our differentiation | M | M | Originality lane is "protocol-enforced royalties via Move resources"; explicitly distinct from "another marketplace UI." Differentiation in `ARCHITECTURE.md` §0 and demo opening. | Lean harder into the customer story (Lina's £1,800/mo loss) and the structural Move-resource argument; let UI similarity be irrelevant. | Build lead |
| **R-COM-02** | Judges find a stronger BUIDL with more polish in the same lane | M | M | Polish is hard to overcome in 24h. Our edge is honesty (named weaknesses, named production conditions, audit-ready threat model) which competing teams typically don't ship. | Accept the score; we still earn 30% Initia integration weight on its own merits. | Build lead |

### Post-submission risks

| ID | Description | L | I | Mitigation | Contingency | Owner |
|---|---|---|---|---|---|---|
| **R-POST-01** | Judge asks a question we cannot answer (e.g. "what's the gas cost of `place_bid` at 99th percentile chain congestion?") | M | L | Prepared FAQ in `docs/JUDGE_FAQ.md` covering: gas costs, royalty bypass attempts, sequencer trust, .init resolution failure mode, R2 centralisation, third-party challenger plan, mainnet checklist. | Respond with the honest "we have not measured this; the architecture supports measurement via Prometheus." Honesty > guessing. | Build lead |
| **R-POST-02** | Repo not reproducible from a fresh clone after submission (hidden env var, missing file, broken Justfile) | M | H | Phase 8 success criterion: smoke-test fresh-clone. Done before video record (so the README is known good before the demo claims it). | Patch and force-push to the `v0.1.0-hackathon` tag if discovered post-submission. Acknowledged in Discord. | Build lead |
| **R-POST-03** | Move package upgrade is needed post-submission and breaks indexed history (event schema change) | L | M | Event schema in `DATA_MODEL.md` is locked for v0.1.0; any change is v0.2.0 and reindexes from start_block. | Reindex; communicate downtime in /status banner. | Backend lead |
| **R-POST-04** | A judge attempts to use the live deployment and triggers an unfunded gas station, halting batch posting | L | M | Gas station funded with 1000 INIT (testnet) — sufficient for >10k user txs at current gas. Better Stack alert when gas station < 100 INIT. | Top up from testnet faucet; resume in <10 min. | Build lead |
| **R-POST-05** | Reproducibility: a judge on Windows cannot run `just bootstrap` (Justfile, mise paths, Docker permissions) | M | L | README documents Mac and Linux; provides a dockerised dev environment for Windows users (`docker compose -f docker-compose.dev.yml up`). | Manual setup instructions for Windows in `docs/SETUP-WINDOWS.md`. | Frontend lead |

### Operational risks (post-submission, while live)

| ID | Description | L | I | Mitigation | Contingency | Owner |
|---|---|---|---|---|---|---|
| **R-OPS-01** | Hetzner VM compromised via SSH brute force | L | H | SSH password auth disabled; key-only; fail2ban; ufw firewall; ssh on default port (deliberate — fail2ban is the actual defence and changing the port adds nothing). | Snapshot now (preserve forensics), do not shut down, rotate keys, redeploy from Terraform with new keys. ~30 min recovery. | Build lead |
| **R-OPS-02** | Snapshot restore not actually tested at the documented timing — discovered to take 30 min, not 10, when needed in production | M | M | Phase 1 task includes a real snapshot restore drill. | Re-run drill monthly post-launch (added to ops backlog). For hackathon: documented expected timing is "tested once during build at ~10 min." | Build lead |
| **R-OPS-03** | Better Stack free tier exhausted mid-week (3GB log ingest cap) | L | L | Log volume estimated at ~500MB/week at hackathon traffic; well under cap. | Promtail rate-limits when approaching cap; non-critical logs dropped. | Build lead |
| **R-OPS-04** | Vercel Hobby concurrency limit hit during a viral moment (e.g. HN front page) | L | M | Hobby tier handles ~100k req/day cleanly. | Upgrade to Pro on the same day if needed; deployment is config-only. | Build lead |
| **R-OPS-05** | Domain `provenance.app` accidentally expires or registrar disappears | L | H | Auto-renew enabled at Cloudflare Registrar. Two-year prepaid. | Move DNS to fallback registrar; testnet operates fine on raw Vercel domain `<project>.vercel.app` as a stopgap. | Build lead |

### Production-readiness risks (notional, named for honesty)

| ID | Description | L | I | Mitigation | Contingency | Owner |
|---|---|---|---|---|---|---|
| **R-PROD-01** | Single-VM rollup topology is a structural SPOF for production traffic | H | H | Documented in `DEPLOYMENT_TOPOLOGY.md` §6 and §4 (production design). Migration to multi-VM is a named pre-mainnet condition. | Production launch is gated on multi-VM topology. The hackathon submission is testnet-only. | Build lead (post-hackathon) |
| **R-PROD-02** | R2-only image storage means Cloudflare account termination = artwork loss | H | H | Documented in `DEPLOYMENT_TOPOLOGY.md` §2.6 and `CUSTOMER_BUYER_REVIEW.md`. v1.1 IPFS mirror is committed in writing. `content_hash` already on-chain so artwork integrity is verifiable independently. | Mirror to web3.storage in v1.1 (~3 weeks post-hackathon). For hackathon: acknowledged, no real money at stake. | Build lead (post-hackathon) |
| **R-PROD-03** | Move package not audited; royalty enforcement bug-class would harm artists | H | H | 100% test coverage is the strongest in-band mitigation. `SECURITY_THREAT_MODEL.md` §10.1.3 names third-party audit as production-blocker. | No mainnet launch without audit. | Build lead (post-hackathon) |
| **R-PROD-04** | Sequencer key compromise means total chain compromise within dispute window | H | H | Single-VM model means sequencer + challenger = same root account = no real challenger. Production splits across operators. | Mainnet launch gated on third-party challenger and split-key topology. | Build lead (post-hackathon) |
| **R-PROD-05** | Sequencer halt (single-operator outage > 7-day dispute window) blocks user withdrawals via L1 escape hatch | M | H | Documented in `SECURITY_THREAT_MODEL.md`; UI banner explains the escape hatch when sequencer is down. | Mainnet launch communicates the 7-day worst-case to users; production multi-VM reduces likelihood. | Build lead (post-hackathon) |
| **R-PROD-06** | Off-site backup gap — Hetzner snapshots live on Hetzner; region-level outage destroys both prod and backup | M | H | Production design includes weekly `pg_dump | aws s3 cp` to a different cloud. Hetzner snapshots remain primary. | Restore from off-site in worst case (RTO ~4h). | Build lead (post-hackathon) |
| **R-PROD-07** | If Provenance team dissolves, artwork royalties stop being enforced (no operator) | M | H | Move package is open-source; chain state is reproducible from the published Move package and L1 batch history. Anyone can stand up a new sequencer with the same package address and continue royalty enforcement. | Documented community sequencer hand-off plan in v2.0 roadmap. Honest answer to a customer-buyer question. | Build lead (long-term roadmap) |

---

## Heatmap (top of register only)

| | L: Low | L: Medium | L: High |
|---|---|---|---|
| **I: High** | R-TEC-05, R-DEM-06 (low/high), R-SUB-02, R-SUB-03, R-SUB-04, R-SUB-06, R-OPS-01, R-OPS-05 | R-TEC-01, R-TEC-02, R-SUB-01, R-DEM-01 (impact medium), R-POST-02, R-PROD-05 | R-PROD-01, R-PROD-02, R-PROD-03, R-PROD-04 |
| **I: Medium** | R-TEC-04, R-TEC-07, R-DEM-02, R-OPS-04 | R-TEC-03, R-TEC-08, R-TEC-09, R-BLD-01, R-BLD-02, R-BLD-04, R-BLD-05, R-DEM-01, R-DEM-03, R-DEM-05, R-COM-01, R-COM-02, R-POST-01 (low), R-POST-03, R-POST-04, R-POST-05, R-OPS-02, R-PROD-06, R-PROD-07 | R-BLD-05 |
| **I: Low** | R-BLD-06, R-BLD-07, R-DEM-04, R-OPS-03, R-SUB-07 | R-TEC-10, R-BLD-03, R-SUB-05 | R-BLD-01 |

The high/high quadrant is dominated by production-readiness items (R-PROD-01 through R-PROD-04) which we have explicitly marked as **out of scope for the hackathon submission**. The actual in-scope risks at high/high are the production items, all named, all gated on post-hackathon work, and all communicated honestly to the user via the live /status page and the README.

For the build window itself, the highest items are:
- **R-BLD-01** scope creep — controlled by a frozen scope list
- **R-BLD-05** engineer fatigue — controlled by scheduled sleep window
- **R-DEM-01** testnet flakiness during demo — primary mitigation is rehearsal timing

These are the three risks the build lead checks at the start of every BUILD_PLAN phase boundary.

---

## What we are explicitly NOT mitigating (and why)

Some risks we've decided to accept rather than spend time on:

1. **A judge's wallet has zero balance and they don't want to bridge** — we do not pay user gas (no relayer subsidy). Acceptable: we expect the judges to be familiar with hackathon norms.
2. **A user's browser blocks third-party cookies and breaks WalletConnect** — we don't control this; recovery is "use a different browser." Acceptable.
3. **Vercel free tier rate-limits during a peak — 100 req/10s/IP** — sufficient for any individual user; not sufficient for a synthetic load test. Acceptable.
4. **The auction extension logic has an edge case at exactly the second the auction ends + a bid arrives** — Move's atomicity makes this deterministic, but we have not formally proven the edge case. Tested with three race-condition unit tests; full formal proof is post-hackathon.
5. **Indexer reorg handling on a single-sequencer rollup** — single-sequencer rollups don't reorg; if they did, we'd reindex. Acceptable for the hackathon trust model.

Each of these has been considered and is named here so that no buyer can claim they were unaware.

---

## Customer-buyer review

> *Reviewing as Sponsor, the notional project sponsor whose £40k seed cheque depends on this risk profile being credible.*

### What the sponsor likes

1. **The high-impact production risks are named and gated on specific pre-mainnet conditions.** R-PROD-03 (no audit) is not hidden; it's flagged as a blocker. That's the kind of honesty that gets a follow-on cheque.
2. **The build risks have phase-level fall-backs.** R-BLD-02 (Move coverage time slippage) doesn't say "we'll just work harder" — it says "Phase 6 polish is what we cut." Mitigation by trade-off, not by hope.
3. **The demo risks include rehearsal timing, redundancy of recording software, and a script with a sacred segment.** This is what hackathon-ready demos look like.
4. **The post-submission risks include a JUDGE_FAQ and reproducibility smoke test.** Most teams forget this.
5. **The "what we're NOT mitigating" list is short and reasoned.** A blank list would mean the team hasn't thought hard enough; a long list would mean the team is hand-waving. This is calibrated.

### What the sponsor pushes back on

1. **R-COM-01 and R-COM-02 (competitive risks) feel under-mitigated.** The mitigation is "lean into honesty"; the contingency is "accept the score." A more aggressive sponsor would want pre-staged comms (twitter thread the moment submission opens, customer testimonial from Lina, etc.). True. Added to post-submission backlog as an explicit promotion plan, not a hackathon-window task. We are choosing to put zero hours into promotion before submission and instead let the artifact speak.
2. **R-OPS-02 (snapshot restore tested once, not monthly).** Sponsor wants monthly. Agreed in principle; not in hackathon scope; added to ops backlog with a target of "monthly drills starting week 2 post-submission."
3. **R-PROD-07 (team dissolution scenario).** Sponsor likes that we acknowledged it. Wants to see a written community-handoff doc before the £40k cheque clears for production. Agreed; this is a v2.0 deliverable, not v1.0.

### Verdict

Risk profile is credible, complete, and free of self-deception. The unmitigated risks are real but small, and the high-impact risks are either bounded by trade-off (build risks) or correctly flagged as production-blockers (PROD risks).

**Approve.**
