# START-PROMPT RETROSPECTIVE — Architecture Page

**Project:** INITIATE Hackathon (HACK0016) Submission
**Stage:** Architecture Design (Page 2 of 4)
**Previous Stage:** Idea Exploration & Selection (Page 1) — COMPLETE
**Time at start:** _[fill in when you paste this in]_
**Deadline:** 26 April 2026, 01:00 UTC (treat as soft — quality over rush)

---

## What is settled going into this page

### The selected idea
**[ INSERT YOUR PICK FROM THE FIVE — e.g. Provenance / Quorum.init / Resonance / Lighthouse / Aegis ]**

If undecided, the customer-buyer ranking from the previous page was:
1. Provenance — Move-enforced art / digital-media royalty marketplace
2. Quorum.init — Governance & voting infrastructure
3. Resonance — Per-second music streaming royalties
4. Lighthouse — Civic emergency / mutual-aid network
5. Aegis — Compliant B2B cross-border payments

### What was researched and confirmed
- **The 60 BUIDLs already submitted** have been mapped and assessed. Saturation map is documented.
- **The 20 Ideaism suggestions** have been cross-referenced against the BUIDLs. Whitespace lanes are documented.
- **Initia's full stack** has been studied layer by layer (Celestia DA → Initia L1 → OPinit Stack → InterwovenKit → App layer → User-facing products).
- **Hackathon mandatory requirements** are known:
  - Deployed as own Initia appchain / rollup (chain ID, txn link, or deployment link required)
  - InterwovenKit (`@initia/interwovenkit-react`) for wallet connection / tx handling
  - At least ONE Initia-native feature: Auto-signing / Interwoven Bridge / `.init` Usernames
  - Repo must contain `.initia/submission.json`, `README.md`, demo video
  - Public Git repo (GitHub/GitLab/Bitbucket)
- **Scoring weights** are known: Originality 20% / Technical & Initia Integration 30% / Product UX 20% / Working Demo 20% / Market Understanding 10%.

### Operating rules established
1. Customer-first mindset at every page — evaluate as a buyer, not a cheerleader
2. Enterprise grade throughout — no exceptions, no half-built
3. No scope shrinking once committed
4. Remote-first Git workflow (when build starts)
5. Brutal honesty after — if it's not enterprise-grade, say so plainly

---

## What this page must produce (the contract)

By the end of the Architecture page, the following deliverables MUST exist as downloadable files:

1. `ARCHITECTURE.md` — Full system architecture document
2. `TECH_STACK.md` — Concrete technology choices with rationale per layer
3. `DATA_MODEL.md` — Schema / resource definitions / state design
4. `API_CONTRACT.md` — All interfaces between layers (frontend ↔ chain ↔ off-chain services)
5. `INITIA_INTEGRATION.md` — Exactly how InterwovenKit, auto-signing, `.init` usernames, and Interwoven Bridge are used (load-bearing, not bolt-on)
6. `SECURITY_THREAT_MODEL.md` — Adversarial review (sybil, MEV, key compromise, DoS, business-logic abuse)
7. `DEPLOYMENT_TOPOLOGY.md` — How the appchain, sequencer, executor bot, challenger bot, IBC relayer, frontend, and any backend services connect in dev / staging / prod
8. `BUILD_PLAN.md` — Hour-by-hour build sequence for the Build page
9. `RISK_REGISTER.md` — Every known risk, likelihood, impact, mitigation, owner
10. `CUSTOMER_BUYER_REVIEW.md` — Brutal review of the architecture from a paying-customer perspective

All ten are required. The page is not done until every file exists, has been customer-buyer reviewed, and is ready for download.

---

## What was right about the previous page (carry forward)

- The customer-buyer lens caught weak revenue stories early
- Mapping all 60 BUIDLs before idea generation prevented copycat suggestions
- Ranking ideas with explicit "promote if / demote if" conditions kept the decision auditable
- Refusing to flatter saturated lanes (yield optimisers, prediction markets) kept focus on whitespace

## What to watch on this page

- **Architecture inflation:** the temptation to over-design. Enterprise-grade ≠ over-engineered. Every component must justify its existence against the 17-hour build window mentally, even if we later expand timelines.
- **Initia-integration as decoration:** if a primitive (auto-signing, `.init`, bridge) is in the diagram but not load-bearing, the customer-buyer call must flag it. Judges score 30% on Initia integration depth.
- **Hand-waving on hard problems:** sybil, key revocation, sequencer liveness, dispute mechanics. These get explicit answers, not "we'll figure it out."
- **Demo path discipline:** the architecture must support a 5-7 minute demo where every claim shown is real, not mocked.

## Mode for this page

- Generate the prompt FIRST, then execute against it
- Each artefact gets customer-buyer reviewed before moving to the next
- If a section can't pass customer-buyer review, the architecture changes — not the review
- No formatting fluff. Diagrams via Mermaid or ASCII. Tables for comparisons. Prose for reasoning.

---

## Hand-off to next prompt

The next prompt to run is `02_ARCHITECTURE_DESIGN_PROMPT.md` — paste it into a fresh Claude conversation (or this one) to begin the Architecture page work.

When the Architecture page completes, run `03_DONE_PROMPT_Architecture.md` for the closeout retrospective.
