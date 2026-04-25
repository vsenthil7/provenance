# PHASE_REVIEWS.md

Customer-buyer reviews captured at every phase boundary, per Operating Rule 7.

The five personas (defined in `CUSTOMER_BUYER_REVIEW.md`):
- **Lina** — illustrator, the artist customer.
- **Marek** — notional next dev hire, judges maintainability.
- **Carla** — collector who lost £400 to skipped royalties on EVM.
- **Tomas** — notional auditor, checks safety and operability.
- **Sponsor** — the hackathon judge, asks "is this credible to back?"

A phase is not closed until each voice is either green or has a written
condition that is met or explicitly waived in the row.

---

## Phase 0 — Remote-first setup

| Persona | Verdict | Notes |
|---|---|---|
| Marek | _pending_ | `just bootstrap` run from a fresh checkout in a separate directory; if it fails, fix bootstrap. |
| _other personas not applicable for this phase per the build prompt_ | | |

## Phase 1 — Appchain deployment

| Persona | Verdict | Notes |
|---|---|---|
| Marek | _pending_ | Infra reproducible from `terraform apply`; no manual snowflake steps. |
| Tomas | _pending_ | systemd hardening verified (`ProtectSystem=strict`, no password SSH, ufw active). Snapshot-restore drill timing recorded. |

## Phase 2 — Move modules with 100% coverage

| Persona | Verdict | Notes |
|---|---|---|
| Tomas | _pending_ | Royalty cannot be bypassed (verified by inspection of test names + bodies); integer overflow handled; reentrancy impossible by Move resource model. |
| Lina | _pending_ | Artist sees royalty in receipts; royalty cap (10%) enforced at module level. |

## Phase 3 — Frontend skeleton + InterwovenKit

| Persona | Verdict | Notes |
|---|---|---|
| Carla | _pending_ | Connect flow works on her wallet of choice. No "huh?" moments. |

## Phase 4 — Initia primitives

| Persona | Verdict | Notes |
|---|---|---|
| Lina | _pending_ | `.init` rendering correct on artist pages (incl. fallback to short address). |
| Carla | _pending_ | Auto-sign UX feels safe — 1h default visible, scope shown, easy to disable. Bridge UX clear. |

## Phase 5 — Core user journeys

| Persona | Verdict | Notes |
|---|---|---|
| Lina | _pending_ | Mint + royalty journeys work; royalty payment confirmed in tx history. |
| Carla | _pending_ | Buy + bid + bridge journeys work on a fresh wallet. |
| Marek | _pending_ | Code paths are readable; no shortcuts that invite future bugs. |
| Tomas | _pending_ | Royalty enforcement on resale verified by reading on-chain tx, not just UI receipt. |
| Sponsor | _pending_ | Watches the full demo path end-to-end; credibility intact. |

## Phase 6 — Polish

| Persona | Verdict | Notes |
|---|---|---|
| Carla | _pending_ | One-pass UX gut check; no console errors during 2-min click-through; mobile renders correctly on iPhone SE viewport. |

## Phase 7 — Demo video

| Persona | Verdict | Notes |
|---|---|---|
| Sponsor | _pending_ | Credibility judgement on the 5–7 min cut. |
| Lina | _pending_ | Customer story comes through clearly. |

## Phase 8 — Submission

| Persona | Verdict | Notes |
|---|---|---|
| Sponsor | _pending_ | Final go/no-go on dorahacks.io submission. |

---

## Waivers (formal record)

_None recorded._ Adding a waiver requires explicit written justification on
the relevant row above and a same-PR update to `RISK_REGISTER.md`.
