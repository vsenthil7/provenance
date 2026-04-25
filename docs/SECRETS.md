# SECRETS.md

How secrets are managed in Provenance. Read this before you push anything to
a feature branch.

---

## The non-negotiables

1. **Never commit a secret.** `.env`, `*.tfvars` (without the `.example`
   suffix), and `weave-init-payload*` are in `.gitignore`. `gitleaks` runs
   in `pre-commit` and CI.
2. **Never print a secret to a log.** This includes Better Stack and Vector;
   every log shipper config in this repo strips known-sensitive keys.
3. **Rotate after any leak, real or suspected.** No "we'll see if it was
   exploited first" — rotation is the cheap insurance.
4. **Secrets live in three places only:** Vercel project env vars, GitHub
   Actions secrets, and the Hetzner VM's encrypted home directory. Nowhere
   else.

---

## The secret inventory

### Build / deploy

| Name | Where | Rotation |
|---|---|---|
| `VERCEL_TOKEN` | GitHub Actions `secrets` (used only by post-deploy-smoke for rollback) | 90 days |
| `VERCEL_PROJECT_ID` | GitHub Actions `secrets` | n/a (not sensitive but kept private) |
| `HCLOUD_TOKEN` | Local laptop only, never committed | 90 days |
| `CLOUDFLARE_TOKEN` | Local laptop only | 90 days |

### Runtime — Vercel (frontend)

| Name | Where | Rotation |
|---|---|---|
| `R2_ENDPOINT` | Vercel env (Production + Preview) | n/a |
| `R2_ACCESS_KEY_ID` | Vercel env (Production + Preview) | 30 days |
| `R2_SECRET_ACCESS_KEY` | Vercel env (Production + Preview) | 30 days |
| `R2_BUCKET` | Vercel env | n/a |
| `NEXT_PUBLIC_R2_BASE` | Vercel env | n/a |
| `INDEXER_GRAPHQL_URL` | Vercel env | n/a |
| `NEXT_PUBLIC_PROVENANCE_RPC` | Vercel env (public — exposed to client) | n/a |
| `NEXT_PUBLIC_PROVENANCE_REST` | Vercel env | n/a |
| `NEXT_PUBLIC_PROVENANCE_INDEXER` | Vercel env | n/a |
| `NEXT_PUBLIC_PROVENANCE_PACKAGE` | Vercel env | n/a |
| `NEXT_PUBLIC_OP_BRIDGE_ID` | Vercel env | n/a |

### Runtime — Indexer (Hetzner or wherever it lands)

| Name | Where | Rotation |
|---|---|---|
| `DATABASE_URL` | indexer host env (Neon connection string) | 30 days |
| `PROVENANCE_RPC` | indexer host env | n/a |
| `PROVENANCE_PACKAGE_ADDRESS` | indexer host env | n/a |

### Runtime — Rollup VM

| Name | Where | Rotation |
|---|---|---|
| `weave_init_payload` | Encrypted in `/home/initia/weave-init-payload.b64` during cloud-init, **shredded after first boot** | n/a (single-use) |
| `BETTER_STACK_INGEST_TOKEN` | `/etc/vector/vector.yaml` (root-readable only) | 90 days |
| `DISCORD_WEBHOOK_URL` | `/etc/provenance/alert-webhook` (root-readable only) | 90 days |
| Sequencer key | `~/.minitia/config/priv_validator_key.json` (initia user only, perm 600) | rotate via Weave on operator change |
| Executor key | `~/.opinit/...` | rotate per Initia ops guide |
| Challenger key | `~/.opinit-challenger/...` | rotate per Initia ops guide |

---

## How to add a new secret

1. Add the env var name to this file's inventory table with rotation policy.
2. Add it to the `.env.example` (with a placeholder value) so other devs know
   it exists.
3. Set it in Vercel / GitHub Actions / VM as appropriate.
4. Reference it in code via `process.env.X` or in CI via
   `${{ secrets.X }}`. Never hardcode.

## How to rotate a secret

1. Generate the new value out-of-band.
2. Set the new value in the destination (Vercel, GitHub, VM).
3. Verify the deployed service uses the new value (e.g. tail logs, run
   smoke test).
4. Revoke the old value at the source (Cloudflare API token rotation, R2 key
   rotation, etc.).
5. Note the rotation in the inventory table's "last rotated" column (added on
   first rotation).

## What to do if a secret leaks

1. **Rotate immediately**, before anything else. Don't wait to assess
   exposure.
2. Investigate scope — git history, logs, screenshots in tickets.
3. If the leak is in git history, force-push to remove (history rewrites are
   fine on a hackathon repo, after coordinating with team).
4. Note the incident in `docs/RISK_REGISTER.md`.
