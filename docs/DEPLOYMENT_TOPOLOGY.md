# DEPLOYMENT TOPOLOGY — Provenance

**Status:** locked for hackathon submission
**Project:** Provenance (HACK0016, INITIATE Hackathon)
**Owner of this document:** Build lead
**Companion docs:** `ARCHITECTURE.md` §4.5 (sequencer down), `TECH_STACK.md` Layer 10–11, `SECURITY_THREAT_MODEL.md` (key compromise, sequencer liveness), `BUILD_PLAN.md` Phase 1.

This document specifies *every running process, every host, every secret, and every cost line* for Provenance across four environments. The hackathon environment is the one we will demo from. The notional staging and production environments are designed but not provisioned for this submission — they exist in this document so that the architecture is honest about what mainnet would actually require, and so a fresh engineer pulling this repo could provision them without asking questions.

---

## 0. Environments at a glance

| Env | Purpose | Chain | Frontend | Indexer | DB | Storage | DA | Status |
|---|---|---|---|---|---|---|---|---|
| `local` | Dev loop on engineer's laptop | `provenance-local` (minitiad in --dev mode) | `localhost:3000` | local Ponder against local node | Postgres in Docker | local FS | mocked | Required for every commit |
| `hackathon-testnet` | **The demo environment.** Submitted to judges. | `provenance-1` on Initia testnet `initiation-2` | Vercel preview pinned to `main` | Ponder on Railway | Neon free tier | Cloudflare R2 | Celestia `mocha-4` | **Live for 26 Apr 2026 01:00 UTC submission** |
| `staging` (notional) | Mirror of prod for upgrades | `provenance-staging-1` | Vercel preview env | Ponder on Railway | Neon paid | R2 | Celestia mainnet | Designed only |
| `production` (notional) | Real money. Real artists. | `provenance-1` (mainnet) | Vercel prod | Ponder on Railway prod | Neon paid w/ PITR | R2 + IPFS mirror | Celestia mainnet | Designed only |

The hackathon environment must be reachable, demonstrable, and reproducible from the public repo by the time submission closes. Everything else is paper.

---

## 1. `local` — engineer's laptop

```
┌─────────────────────────────────────────────────────────────┐
│  Engineer's laptop (macOS / Linux)                          │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │ minitiad     │◄──┤ Ponder       │   │ Next.js dev  │    │
│  │ --dev        │   │ (pnpm dev)   │◄──┤ server       │    │
│  │ localhost:   │   │ localhost:   │   │ localhost:   │    │
│  │ 26657 (RPC)  │   │ 42069        │   │ 3000         │    │
│  │ 1317 (LCD)   │   │ /graphql     │   │              │    │
│  │ 9090 (gRPC)  │   └──────┬───────┘   └──────────────┘    │
│  └──────┬───────┘          │                                │
│         │                  ▼                                │
│         │           ┌──────────────┐                        │
│         │           │ Postgres 16  │                        │
│         │           │ (Docker)     │                        │
│         │           │ :5432        │                        │
│         │           └──────────────┘                        │
│         ▼                                                   │
│   ./Move/ source ──► aptos move publish ──► local rollup    │
└─────────────────────────────────────────────────────────────┘
```

**Required tooling (pinned in `Justfile` and `mise.toml`):**

- `weave` CLI (latest from `github.com/initia-labs/weave`)
- `minitiad` v0.6.x (pinned in repo via `weave init` selection)
- `aptos` CLI v3.x for Move compile/publish
- Node 20 LTS (via `mise`)
- pnpm 9.x
- Docker Desktop (for Postgres only — chain runs natively for speed)
- `just` (task runner)

**Setup procedure:** `just bootstrap` runs:
1. `mise install` — pins Node, Rust toolchain.
2. `pnpm install` — workspace deps.
3. `docker compose up -d postgres` — Postgres for indexer.
4. `weave init` then `minitiad start --dev` — local single-node chain with prefunded test accounts.
5. `cd contracts && aptos move compile && aptos move publish --profile local` — deploys Move modules to local chain.
6. `pnpm --filter indexer dev` — Ponder against local node.
7. `pnpm --filter web dev` — Next.js with `NEXT_PUBLIC_RPC=http://localhost:26657`.

**Acceptable for local, NOT for any other env:** mocked DA, mocked Skip Go bridge (returns hardcoded happy-path), unsigned indexer reads. These are flagged with `// LOCAL_ONLY` comments and a CI check fails the PR if any reach `main` un-gated.

---

## 2. `hackathon-testnet` — the submission environment

This is the environment judges will actually touch. Everything else in this document supports the integrity of *this* deployment.

### 2.1 Topology diagram

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  Public internet                                                                    │
│                                                                                     │
│   user-browser ──https──► provenance.app (Vercel edge)                              │
│        │                          │                                                 │
│        │                          ├─► /api/* serverless fns ──► Neon (TLS)          │
│        │                          │                                                 │
│        │                          └─► static + RSC ──► R2 (signed URLs for images)  │
│        │                                                                            │
│        ├──https──► api.indexer.provenance.app (Railway) ──► Neon                    │
│        │                                                                            │
│        ├──https──► rpc.provenance-1.initia.xyz (Hetzner CX22) ──► sequencer         │
│        │                                                                            │
│        └──https──► InterwovenKit RPC (Initia-hosted, not us)                        │
│                                                                                     │
├────────────────────────────────────────────────────────────────────────────────────┤
│  Hetzner CX22 — €4.59/mo — ams-1 (Amsterdam) — single VM                            │
│  hostname: prov-rollup-01                                                           │
│                                                                                     │
│   ┌─────────────────────────┐   ┌─────────────────────────┐                         │
│   │ minitiad (sequencer)    │   │ opinitd executor        │                         │
│   │ systemd: minitiad.svc   │   │ systemd: executor.svc   │                         │
│   │ ports: 26657, 1317,     │   │ logs: journalctl        │                         │
│   │        9090, 26656      │   │ talks to L1 initiation-2│                         │
│   └─────────────────────────┘   └─────────────────────────┘                         │
│   ┌─────────────────────────┐   ┌─────────────────────────┐                         │
│   │ opinitd challenger      │   │ hermes IBC relayer      │                         │
│   │ systemd: challenger.svc │   │ systemd: hermes.svc     │                         │
│   │ same VM (acknowledged   │   │ initiation-2 ↔          │                         │
│   │ collusion risk: §6)     │   │ provenance-1            │                         │
│   └─────────────────────────┘   └─────────────────────────┘                         │
│   ┌─────────────────────────┐   ┌─────────────────────────┐                         │
│   │ caddy (TLS + reverse    │   │ node_exporter +         │                         │
│   │ proxy + rate limit)     │   │ promtail (Better Stack) │                         │
│   └─────────────────────────┘   └─────────────────────────┘                         │
│                                                                                     │
│  Snapshot policy: Hetzner daily snapshot at 03:00 UTC, keep 7. €0.0119/GB/mo.       │
└────────────────────────────────────────────────────────────────────────────────────┘
        │
        │ submits batches to
        ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│  Initia testnet (initiation-2) — not us, free                                       │
│  OPHost module receives batches; OPChild on rollup side anchors                     │
└────────────────────────────────────────────────────────────────────────────────────┘
        │
        │ DA blobs to
        ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│  Celestia mocha-4 (testnet) — not us, free                                          │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Frontend — Vercel

- **Project:** `provenance-web` in our Vercel team.
- **Domain:** `provenance.app` (apex), `www.provenance.app` redirects.
- **Build:** GitHub `main` → Vercel production deploy. Every PR gets a preview URL pinned to that branch.
- **Edge regions:** Vercel's default global edge — no opt-in restriction needed at hackathon scale.
- **Env vars (Vercel project settings, all `production` scope unless marked):**
  - `NEXT_PUBLIC_CHAIN_ID=provenance-1`
  - `NEXT_PUBLIC_RPC=https://rpc.provenance-1.initia.xyz`
  - `NEXT_PUBLIC_INDEXER=https://api.indexer.provenance.app/graphql`
  - `NEXT_PUBLIC_PROVENANCE_PACKAGE=init1...` (bech32 address of deployed Move package)
  - `NEXT_PUBLIC_PROTOCOL_TREASURY=init1...`
  - `R2_ACCESS_KEY_ID` (server-only)
  - `R2_SECRET_ACCESS_KEY` (server-only)
  - `R2_ACCOUNT_ID` (server-only)
  - `R2_BUCKET=provenance-artworks`
  - `R2_PUBLIC_URL=https://media.provenance.app`
  - `DATABASE_URL` (Neon pooled connection string, server-only)
- **Justification (vs Netlify / Cloudflare Pages):** Next.js 15 RSC support is best on Vercel; the App Router's streaming + `revalidateTag` after a mint event work without configuration; the free Hobby tier is sufficient for hackathon traffic and the Pro tier would be the natural notional-prod upgrade path.

### 2.3 Indexer — Railway

- **Service:** `provenance-indexer`, single container running Ponder.
- **Region:** `eu-west` (matches Hetzner ams-1 → Neon eu-central-1, keeps RPC→indexer→DB latency under 50ms).
- **Resources:** 0.5 vCPU / 512MB. Scale to 1 vCPU / 1GB if indexer falls behind.
- **Env vars:**
  - `RPC_URL=https://rpc.provenance-1.initia.xyz`
  - `START_BLOCK=<block at which provenance package was published>`
  - `DATABASE_URL` (Neon pooled, separate user from web)
  - `PORT=42069`
- **Health check:** Railway pings `/health` every 30s. If 3 consecutive fail, Railway restarts. Discord webhook fires on restart.
- **Justification (vs Fly / self-host):** Railway's eu-west region keeps the indexer co-located with the chain VM; the ~$5/mo nano dyno is cheaper than Fly for one always-on service; deploy-from-git keeps the workflow homogeneous with Vercel.

### 2.4 Rollup VM — Hetzner CX22

**Single VM is a deliberate choice for the hackathon, with eyes open.** We are running sequencer + executor + challenger + relayer on one box because (a) the OPinit reference deployment shows this configuration as supported, (b) the alternative (multi-VM with private VPC) costs ~3× and adds zero demo-relevant capability for a 5-minute video, and (c) we own the trust assumption and document it in `SECURITY_THREAT_MODEL.md`. Running challenger and sequencer on the same host is a *known weakness* — see §6 below.

- **Instance:** Hetzner Cloud CX22 — 2 vCPU AMD, 4GB RAM, 40GB NVMe SSD, 20TB egress, **€4.59/mo**. Region `nbg1` (Nuremberg) for low latency to Initia's eu-hosted L1 RPCs.
- **OS:** Ubuntu 24.04 LTS, fully patched at provision time, `unattended-upgrades` enabled.
- **Provisioning:** Terraform module `infra/hetzner/` — one `main.tf` file, server resource, firewall, SSH key, cloud-init script. `terraform apply` is idempotent.
- **Cloud-init does:**
  1. Disable root SSH, password auth.
  2. Install minitiad, opinitd, hermes from pinned releases (versions in `infra/versions.env`).
  3. Create systemd units: `minitiad.service`, `executor.service`, `challenger.service`, `hermes.service`, all with `Restart=on-failure`, `RestartSec=10s`.
  4. Install Caddy, configure reverse proxy with TLS via Let's Encrypt for `rpc.provenance-1.initia.xyz`.
  5. Install `node_exporter` and `promtail`, point at Better Stack ingest URL.
  6. Apply `ufw` firewall: only 22 (SSH from team IPs), 80, 443, 26656 (p2p) open to internet.
- **Backup policy:** Hetzner snapshot every day at 03:00 UTC, retain 7. Restore-from-snapshot procedure tested once during build (Phase 1 success criterion). Cost: ~€0.50/mo at our disk size.
- **Monitoring alerts (Better Stack):**
  - Sequencer block-time > 10s for 60s → page on-call (Discord webhook).
  - Executor lag > 60 blocks → warning.
  - Disk > 85% → warning.
  - VM unreachable for 2 consecutive 30s pings → page.
- **Restart policy:** systemd `Restart=on-failure` covers process death. VM-level death is human-in-the-loop (snapshot restore). Documented in `RUNBOOK.md`.

**Justification (vs DigitalOcean / Fly / Akash):** Hetzner CX22 is the cheapest production-grade VM in EU at €4.59/mo (DO's equivalent is $6, Fly's is ~$10 for similar specs). Past-decade reliability record. SSD performance is sufficient for minitiad's append-only pebble DB workload at hackathon volume.

### 2.5 Database — Neon

- **Plan:** Free tier for hackathon. 0.5GB storage, 1 compute-hour/day, 7-day PITR.
- **Region:** `eu-central-1` (Frankfurt) — co-located with Railway and Hetzner.
- **Branches:** `main` (used by indexer + web), `dev` (auto-created from PR previews).
- **Schema:** managed by `pnpm --filter indexer migrate` (drizzle-kit). Migrations are checked into the repo and applied in CI before deploy.
- **Pooling:** Neon's PgBouncer pooler endpoint used by serverless functions; direct endpoint used by indexer (which holds connections persistently).
- **Backup:** Neon's point-in-time-recovery (7 days on free tier). Manual `pg_dump` to R2 weekly via GitHub Actions cron — single line of defence beyond Neon.
- **Justification (vs Supabase / RDS):** Neon's branching maps cleanly to PR previews; cold start under 1s on free tier is acceptable for indexer reads; the free tier survives the hackathon without a credit card.

### 2.6 Image storage — Cloudflare R2

- **Bucket:** `provenance-artworks` in Cloudflare account.
- **Domain:** `media.provenance.app` (custom domain bound to bucket, free).
- **Access pattern:** Vercel server route signs PUT URLs (15 min expiry, max 25MB per object) at `POST /api/uploads/presign`. Client uploads directly. After upload, client calls `POST /api/uploads/finalize` which (a) reads the object, (b) computes SHA-256, (c) verifies it matches the `content_hash` the user is about to mint on-chain, (d) writes a row to Postgres tagging `artwork_id ↔ r2_key`. `content_hash` is what gets stored in the Move resource — see `DATA_MODEL.md` §1.2.
- **Egress:** R2 has zero egress fees, which is structurally why we chose it over S3 — image-heavy marketplace traffic on S3 would dominate cost at any meaningful scale.
- **Caching:** Cloudflare's CDN serves objects globally at no extra charge. Cache key includes content hash for permanent caching.
- **Honest weakness — flagged in `CUSTOMER_BUYER_REVIEW.md`:** R2 is centralised. If Cloudflare blocks our account, every artwork goes dark even though the on-chain record persists. Mitigation for v1.1 (post-hackathon, ~3 weeks after submission): mirror every finalized object to IPFS via web3.storage and store both URIs in the Move resource. This is *named, dated, and tracked* in `RISK_REGISTER.md` (R-PROD-02).

### 2.7 DA — Celestia mocha-4

- **What we use:** OPinit's Celestia DA provider posts batch blobs to `mocha-4` via a Celestia light node. We do not run our own.
- **What we configure:** namespace ID, Celestia node endpoint (Initia provides one for `mocha-4`), gas budget for blob posting (paid in TIA testnet tokens, faucet-fundable).
- **Failure mode:** if Celestia is degraded, batch posting stalls, executor lag grows, eventually frontend shows "settlement delayed" banner. We do not lose data — we lose timely settlement. This is in `ARCHITECTURE.md` §4.5 and `RISK_REGISTER.md` (R-TEC-04).

---

## 3. `staging` (notional)

Designed but not provisioned. Documented so a future engineer doesn't ask.

- Mirror of hackathon-testnet but on Initia mainnet `interwoven-1` and Celestia mainnet.
- Vercel preview environment pinned to `staging` branch.
- Hetzner CX32 (4 vCPU / 8GB) — sequencer load on mainnet warrants the upgrade.
- Neon Launch tier ($19/mo) for unlimited compute and 30-day PITR.
- Skip Go bridge points at mainnet endpoints.
- Used for upgrade rehearsals (Move package upgrade, sequencer migration) before production cuts.

---

## 4. `production` (notional)

Designed but not provisioned. The hackathon submission is explicit that production-grade Provenance requires the items below before launch — they are the conditions in `CUSTOMER_BUYER_REVIEW.md` and `SECURITY_THREAT_MODEL.md` §10.

- **Multi-VM rollup:** sequencer on Hetzner ams-1, executor on Hetzner fsn-1, challenger run by an *independent third party* (the auditor "Tomas" condition — `SECURITY_THREAT_MODEL.md` §10.1.4), IBC relayer split into a second hermes process.
- **Sequencer high availability:** OPinit single-sequencer is structurally a SPOF; production mitigation is hot-standby with manual failover, plus a documented 7-day "withdraw via L1" escape hatch communicated in product UI.
- **Frontend:** Vercel Pro plan ($20/user/mo) for guaranteed concurrency and analytics retention.
- **Backend:** Railway Pro for autoscaling and 99.9% SLA.
- **Database:** Neon Scale tier with 7-day PITR plus weekly `pg_dump` to R2 retained 90 days.
- **Image storage:** R2 primary + IPFS mirror via web3.storage. Mint flow blocks until both are confirmed.
- **DA:** Celestia mainnet, paid in TIA from a treasury wallet topped up monthly via Skip Go.
- **Move package:** audited by an independent firm before any artist with > £500/mo revenue is onboarded. Tracked in `SECURITY_THREAT_MODEL.md` §10.1.3.

---

## 5. Secrets management

| Secret | Where it lives | Who can read | Rotation |
|---|---|---|---|
| Sequencer key (`~/.minitia/config/priv_validator_key.json`) | Hetzner VM, mode 600, owner `minitiad` user | Build lead only via SSH | Manual rotation requires chain halt — not in scope for hackathon. Documented as production-blocker. |
| Executor bot key | Hetzner VM, mode 600, owner `opinitd` user | Build lead only | Rotation procedure documented; no scheduled rotation in hackathon. |
| Challenger bot key | Same VM, separate Linux user | Build lead only | Same as above. *Acknowledged collusion risk — `SECURITY_THREAT_MODEL.md` §6.* |
| Hermes relayer key | Same VM, separate Linux user | Build lead only | Funded with small amount; rotation by re-funding new key. |
| GitHub Actions secrets | GitHub repo Settings → Secrets and variables → Actions | Repo admins | Per-secret rotation when team membership changes. |
| Vercel env vars | Vercel project settings | Vercel team admins | On team membership change. |
| Railway env vars | Railway project settings | Railway team admins | On team membership change. |
| Cloudflare API tokens | 1Password shared vault | Build lead only | Quarterly. Hackathon: one-time provisioning, no rotation in 24h window. |
| Neon database URL | Vercel + Railway env vars | Vercel/Railway team admins | On role rotation; passwords reset via Neon UI. |
| Better Stack ingest tokens | systemd unit env on Hetzner VM | Build lead only | On compromise. |

**Hackathon shortcut, named:** all keys are provisioned once, manually, by the build lead, before Phase 1 ends. There is no automated rotation. This is acceptable for a 24-hour testnet demo; it is not acceptable for production and is named as such in `SECURITY_THREAT_MODEL.md` §10.

**No secret is committed to git.** A pre-commit hook runs `gitleaks` to enforce. A GitHub Action on every push runs `gitleaks detect --source=.` and fails the build on any hit.

---

## 6. Acknowledged trust failures (single-VM topology)

We are running sequencer + executor + challenger + relayer on **one Hetzner VM**. This is a deliberate hackathon-only choice with the following named failure modes:

1. **Challenger collusion is structurally impossible to detect.** The challenger's job is to dispute fraudulent batches submitted by the executor. If both run on the same VM under the same operator, the trust model collapses to "trust the operator." For the hackathon, the operator is the build team and there is no real money at stake. For production, the challenger MUST move to a third-party operator. Tracked: `SECURITY_THREAT_MODEL.md` §10.1.4.
2. **VM compromise is total compromise.** Single-machine root → all four bot keys → ability to halt the chain, censor txs, and (within the dispute window) front-run withdrawals. Mitigations: SSH key auth only, no password, ufw firewall, fail2ban, systemd hardening (`ProtectSystem=strict`, `ProtectHome=true`, `NoNewPrivileges=true`), unattended-upgrades, Wazuh agent reporting to Better Stack. **None of this changes the fact that the VM is one root-exploit away from full compromise.** Production splits the keys across three operators.
3. **VM hardware failure halts the chain.** Single Hetzner VM has ~99.9% uptime SLA at best. If the VM dies, the chain halts. Restore-from-snapshot is ~10 minutes manual. Production runs hot-standby.

We name these in product. The /status page on the marketplace shows: "Provenance is currently a single-sequencer rollup operated by the founding team. Royalty enforcement is enforced on-chain by Move resources and is not affected by sequencer trust. Sequencer downtime affects new transactions only; existing artworks and royalties are unaffected." That sentence is the contract with users for the testnet phase.

---

## 7. Cost model

### 7.1 At 0 users (hackathon submission state — what we actually pay)

| Line | Provider | Monthly | Note |
|---|---|---|---|
| Rollup VM | Hetzner CX22 | €4.59 | The only paid line |
| Hetzner snapshots | Hetzner | ~€0.50 | 7-day retention, 40GB disk |
| Frontend | Vercel Hobby | €0 | Free tier ample |
| Indexer | Railway free trial | €0 (€5 credit) | Trial credit covers hackathon |
| Database | Neon Free | €0 | 0.5GB plenty for hackathon data |
| R2 storage | Cloudflare | €0 | Under 10GB free tier |
| DA | Celestia mocha-4 | €0 | Testnet TIA from faucet |
| Domain | Cloudflare Registrar | €0.83 | provenance.app at-cost ~£10/yr |
| L1 gas | Initia testnet `initiation-2` | €0 | Faucet-funded |
| Better Stack | Free tier | €0 | 3GB/mo log ingest free |
| **Total** | | **~€5.92/mo** | |

A working, judgable, public-internet-reachable rollup-backed marketplace for under €6/mo. This is the headline. We can afford to leave it running for the entire judging period without thinking about it.

### 7.2 At 100 users (notional, for honesty)

Assume 100 monthly active artists, ~500 collectors, ~5k page views/day, ~50 mints/day, ~20 sales/day.

| Line | Provider | Monthly | Note |
|---|---|---|---|
| Rollup VM | Hetzner CX22 | €4.59 | Still ample at 50 mints/day |
| Frontend | Vercel Hobby → Pro at ~50k req/day | €0–20 | Hobby covers 100k req/day cleanly |
| Indexer | Railway nano | €5 | Always-on |
| Database | Neon Launch | €19 | 100 users → ~1GB data trivially |
| R2 storage | Cloudflare | ~€2 | ~200GB images |
| Domain | | €0.83 | |
| L1 gas | Initia mainnet | ~€20 | Batch posting + ack txs |
| **Total** | | **~€51/mo** | |

### 7.3 At 10k users (notional, design exercise)

| Line | Monthly | Note |
|---|---|---|
| Rollup: hot-standby pair on Hetzner CX42 | €30 | Production sequencer + standby |
| Independent challenger (paid third party, separate VM) | €25 | The auditor condition |
| Frontend Vercel Pro | €20 | Per-seat |
| Indexer Railway Pro w/ replicas | €40 | Burst protection |
| Database Neon Scale | €69 | Real PITR, real concurrency |
| R2 + IPFS mirror | €60 | ~3TB images, ~1TB IPFS |
| L1 gas | ~€400 | 10k users, ~5000 txs/day, batch posting |
| Better Stack paid | €30 | Useful retention |
| Skip Go fees (passed to user) | €0 | User-paid |
| **Total** | **~€674/mo** | |

At 10k users we expect (with our 0.5% protocol fee on a £100 average sale price and 20% take rate of GMV from listings sold) gross protocol revenue of roughly £1,000/mo. Margin is positive. The cost model is honest about why we'd raise prices or seek VIP allocations before scaling beyond 10k.

---

## 8. Operational runbook (hackathon scope)

A separate `RUNBOOK.md` lives in the repo. It covers four scenarios:

1. **Sequencer is unreachable.** SSH to Hetzner, `systemctl status minitiad`, restart if dead, capture last 200 log lines, post in `#hackathon-incidents` Discord.
2. **Indexer is behind.** Check Railway logs, check RPC health on Hetzner, restart Ponder service via Railway dashboard.
3. **Image upload failing.** Check R2 status page, check API key validity, manually upload one test object via wrangler.
4. **VM compromised / suspected.** Snapshot now, do NOT shut down (preserves forensics), rotate all keys, redeploy from terraform with new keys.

The runbook is one page. The VM has 7 days of system logs retained locally and ships to Better Stack for 3 days of free retention. This is enough for hackathon. For production, the runbook expands to ~12 scenarios and Better Stack retention extends to 30 days.

---

## 9. Customer-buyer review

> *Reviewing as Lina (artist) and as Marek (her notional dev hire who would have to maintain this if Provenance grew into her main income source).*

### What Lina notices

- The €5.92/mo total is a number she can quote to her accountant. She doesn't need to be an engineer to understand it.
- The R2-only image storage is named honestly and there is a dated v1.1 mirror plan. That's acceptable for the hackathon — she would not accept it for the production deployment.
- She likes that the staging environment exists on paper. It tells her the team has thought past Saturday.

### What Marek (the dev) pushes back on

- **"Single VM" is a hackathon-only sentence.** He wants to see, before he'd take the job, the migration plan to multi-VM and the calendar week we'd execute it. The production section is sufficient *as a design*; the timeline to get there is the open question. (This is parked for the post-hackathon retrospective.)
- **Snapshot restore is "tested once."** He wants it tested monthly with a written checklist, not just the once-during-Phase-1 attempt. He's right — added to `RISK_REGISTER.md` R-OPS-02.
- **No off-site backup of the chain state.** Hetzner snapshots live on Hetzner. If Hetzner has a region failure, both production and snapshot are gone simultaneously. Production design needs `tar | aws s3 cp` to a different cloud once a week. Acknowledged; not in hackathon scope.

### What Lina wants answered before signing for production

1. If Hetzner terminates our account for any reason, what's the recovery path? — *Answer for hackathon: lose the rollup, redeploy with same Move package on a new VM, lose the testnet history. For production: hot-standby on different provider.*
2. Where does the rollup state live in 3 years if the team dissolves? — *Answer: an honest one. Move package is open source, sequencer config is in the repo, anyone can stand it up. But the historical state lives on Hetzner. For real durability we'd need community sequencer hand-off, which is a v2.0 conversation.*
3. What's the mainnet launch checklist? — *In `SECURITY_THREAT_MODEL.md` §10. Three named conditions: third-party challenger, Move audit, IR runbook signed.*

### Verdict

Approve for hackathon submission. Conditional approve for production, with the conditions already named in `CUSTOMER_BUYER_REVIEW.md` §5 (R2-only mirror, single-sequencer migration, third-party challenger). No surprises in this document — that is the bar a buyer-grade deployment doc has to clear.
