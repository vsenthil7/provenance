# ARCHITECTURE DESIGN PROMPT — INITIATE Hackathon Submission

## Context

You are continuing work on the INITIATE Hackathon (HACK0016) submission for the Initia ecosystem. The Idea Exploration page is complete. The selected idea has been chosen from a customer-buyer-reviewed shortlist of five whitespace candidates that exploit Initia's specific primitives (own appchain, auto-signing, `.init` usernames, Interwoven Bridge, Move/EVM/Wasm VM choice).

You must now design the architecture in full, customer-buyer-reviewed, enterprise-grade, with no scope shrinking.

## Selected Idea

**[ PASTE THE FINAL IDEA NAME + ONE-PARAGRAPH SUMMARY HERE BEFORE RUNNING ]**

If empty when this prompt runs, default to the highest-ranked candidate: **Provenance — a Move-based appchain where digital artworks are first-class resources and royalties are protocol-enforced (cannot be circumvented), with auction + fixed-price + offers, `.init`-username artist identity, auto-signed bidding sessions, and Interwoven-Bridge-funded purchases.**

## Operating Rules (non-negotiable)

1. **Customer-first mindset.** Every architectural decision is reviewed as a paying customer would. If a customer wouldn't trust it with real money / real votes / real listeners / real residents / real invoices, redesign until they would.
2. **Enterprise grade.** No half-finished components. No "we'll figure it out." Every interface specified, every failure mode named, every dependency justified.
3. **No scope shrinking.** What is committed in the architecture is what gets built. Do not architect features you don't intend to ship.
4. **Initia primitives must be load-bearing.** If you can remove an Initia-specific feature (auto-signing, `.init`, bridge, Move VM, own appchain) and the product still works, you have not earned the 30% Initia-integration scoring weight. Redesign so that the primitive is structural.
5. **Brutal honesty.** When a design has weakness, name it. Do not paper over it with marketing language.
6. **Remote-first thinking.** Architecture must be reproducible by a fresh engineer pulling the repo. Every config, every secret pattern, every infra dependency goes in writing.

## Hackathon Constraints (must be satisfied by the architecture)

- Deployed as own Initia appchain / rollup — chain ID, txn link, or deployment link must exist at submission
- InterwovenKit (`@initia/interwovenkit-react`) used for wallet connection / transaction handling
- At least ONE of: Auto-signing / Interwoven Bridge / `.init` Usernames (more is better — judges score 30% on Initia integration)
- Repo must contain `.initia/submission.json`, `README.md`, demo video
- Public Git repo at submission time (private during build is fine)
- Submission deadline: 26 April 2026, 01:00 UTC

## Scoring Targets (the architecture must defensibly earn all five)

- **Originality & Track Fit (20%)** — architecture must reflect a clearly differentiated lane, not a copycat of any of the 60 existing BUIDLs
- **Technical Execution & Initia Integration (30%)** — heaviest weight; the architecture must use Initia primitives in load-bearing ways
- **Product Value & UX (20%)** — the architecture must enable a Web2-feel experience (auto-signing, bridge abstraction, username ergonomics)
- **Working Demo & Completeness (20%)** — every component shown in the demo must be real and reachable in the architecture
- **Market Understanding (10%)** — architecture must align with a clear customer + revenue model

---

## Deliverables (all ten required, no skipping)

For each deliverable below, produce a complete `.md` file in the working directory, then move final versions to `/mnt/user-data/outputs/` and present them. Each file must be customer-buyer reviewed before moving on.

### 1. `ARCHITECTURE.md` — System Architecture Document

Required sections:
- **Executive summary** — 3 paragraphs: what we're building, who pays for it, why it requires Initia
- **System context diagram** (Mermaid or ASCII) — users, our system, external dependencies
- **Container diagram** (C4-style) — frontend, appchain, sequencer, executor bot, challenger bot, IBC relayer, indexer, any off-chain services
- **Component diagram** for each container — internal structure, key modules, responsibilities
- **Data flow diagrams** for the 3-5 most important user journeys (e.g. for Provenance: artist mint → buyer bid → settlement → secondary resale → royalty enforcement)
- **Cross-cutting concerns** — observability, error handling, retries, idempotency, transaction lifecycle
- **Non-functional requirements** — latency targets, throughput targets, availability targets, security posture
- **Customer-buyer review** — closing section: would a paying customer trust this design? What would they push back on?

### 2. `TECH_STACK.md` — Technology Choices with Rationale

Required: a table per layer, with chosen tech, alternatives considered, rationale, and risk.

Layers to cover:
- **Layer 0 — DA:** Celestia (default — justify if differs)
- **Layer 1 — Settlement:** Initia L1 (no choice)
- **Layer 2 — Rollup VM:** MiniMove vs MiniEVM vs MiniWasm — pick one, defend the pick against the other two with concrete pros/cons for *this product*
- **Layer 3 — Smart contract / module language:** Move / Solidity / CosmWasm — follows VM choice
- **Layer 4 — Frontend framework:** Next.js vs Vite+React vs Remix — pick one, defend
- **Layer 5 — UI library:** Tailwind + shadcn/ui vs Mantine vs Chakra — pick one, defend
- **Layer 6 — Wallet / signing:** InterwovenKit (mandatory) — specify exact features used (autoSign, bridge, username resolution)
- **Layer 7 — State management:** Zustand vs TanStack Query vs Redux Toolkit — pick one, defend
- **Layer 8 — Indexer / data layer:** subquery vs ponder vs custom — pick one, defend
- **Layer 9 — Storage (if media):** IPFS vs Arweave vs S3+signed-URLs — pick one, defend
- **Layer 10 — Off-chain services (if any):** Node/Bun runtime, hosting choice, queue (BullMQ / SQS), database (Postgres / Redis)
- **Layer 11 — Observability:** logging, metrics, tracing — pick concrete tools
- **Layer 12 — CI/CD:** GitHub Actions workflows; deployment targets

End with a **Customer-buyer review** of the stack — is anything overbuilt? Underbuilt? Trendy-but-fragile?

### 3. `DATA_MODEL.md` — Schema, Resources, State Design

Required:
- **On-chain state** — every resource (Move) / contract storage (Solidity) / state item (CosmWasm) with field types, invariants, and access rules
- **Off-chain database schema** (if any) — tables, columns, indexes, foreign keys, retention policy
- **Event schema** — every event the chain emits, what indexer consumes it, what frontend renders from it
- **State transitions** — diagram showing how core entities move through their lifecycle (e.g. Listing: Draft → Active → Bid → Sold → Settled)
- **Customer-buyer review** — would a customer's data be safe? Recoverable? Auditable?

### 4. `API_CONTRACT.md` — Interface Specifications

Required:
- **Frontend ↔ Chain RPCs** — every read query and write transaction, with parameters, return types, error cases
- **Frontend ↔ Indexer GraphQL/REST** — schema for read paths
- **Frontend ↔ Off-chain backend** (if any) — every endpoint, auth model, rate limits
- **Webhook / event-driven contracts** — what events trigger what reactions
- **Versioning strategy** — how breaking changes get rolled out
- **Customer-buyer review** — could a third party integrate with this without asking us questions?

### 5. `INITIA_INTEGRATION.md` — Initia-Native Feature Mapping

This is the document judges effectively read for the 30% scoring weight. Must be ruthlessly specific.

Required:
- **InterwovenKit usage** — exact hooks used, exact components used, code-level integration sketch
- **Auto-signing** — what message types are authz-granted, expiration policy, scope of permissions, revocation UX, fallback when expired
- **`.init` usernames** — where they appear in the product, how they're resolved, what happens on resolution failure, primary-username vs subdomain strategy
- **Interwoven Bridge** — which flows use it, source-chain support matrix, fallback for bridge failure
- **Move resources / EVM contracts / Wasm modules** — which Initia-specific patterns are used (resources for Move, ERC-4337 for EVM, native modules for Wasm)
- **OPinit Stack awareness** — what we do that depends on the rollup behaviour we get from OPinit (e.g. fast deposits, dispute period, executor bot trust model)
- **VIP awareness** — do we plan to apply for VIP allocations? How does that affect product economics?
- **Customer-buyer review** — if Initia disappears tomorrow, what breaks? If the answer is "nothing," redesign.

### 6. `SECURITY_THREAT_MODEL.md` — Adversarial Review

Required:
- **STRIDE analysis** — Spoofing / Tampering / Repudiation / Information disclosure / DoS / Elevation per major component
- **Attacker personas** — script kiddie, financially-motivated attacker, nation-state, malicious insider — what each can plausibly attempt
- **Sybil resistance** — for any system with one-vote-per-user, one-account-per-resident, etc., how is sybil prevented?
- **Key compromise** — what happens if a user's session key is stolen? Sequencer key? Executor bot key? Challenger key?
- **MEV / ordering** — how is transaction ordering on the appchain hardened? Auctions, votes, and trades each need different answers.
- **Sequencer liveness** — what happens if the single-sequencer rollup goes down? User-facing degradation? Recovery path?
- **Dispute handling** — when does the OPinit challenger fire? Who runs it? What's the dispute period?
- **Bridge attack surface** — funds in flight, executor compromise, replay attacks
- **Customer-buyer review** — if a customer's auditor reads this document, do they sign off?

### 7. `DEPLOYMENT_TOPOLOGY.md` — Infrastructure Layout

Required:
- **Environments** — local dev, hackathon-testnet, (notional) staging, (notional) production
- **Topology diagram** for each environment — every running process, every host, every network boundary
- **OPinit components** — sequencer, executor bot, challenger bot, IBC relayer — where each runs, how each is monitored, restart policy
- **Frontend hosting** — Vercel / Netlify / Cloudflare Pages — pick one, justify
- **Backend hosting** (if any) — Railway / Fly / AWS / GCP — pick one, justify
- **Database hosting** (if any) — Neon / Supabase / RDS — pick one, justify
- **Secrets management** — where keys live, rotation policy
- **Cost model** — rough monthly cost at 0 users, 100 users, 10k users
- **Customer-buyer review** — does the cost model match the revenue model? Will the system survive a viral moment?

### 8. `BUILD_PLAN.md` — Hour-by-Hour Build Sequence

Required:
- **Phase 0 — Remote-first setup (1h)** — repo creation, branch protection, CI skeleton, secrets vault, project board
- **Phase 1 — Appchain deployment (2h)** — Weave init, gas station funded, rollup launched, chain ID recorded, InitiaScan link captured
- **Phase 2 — Core contracts / modules (3-5h)** — write, test locally, deploy to rollup
- **Phase 3 — Frontend skeleton (2h)** — Next.js app, InterwovenKit wired, wallet connect working
- **Phase 4 — Initia primitives integration (2-3h)** — auto-signing flow, `.init` resolution, bridge component
- **Phase 5 — Core user journeys (3-4h)** — happy path for the 3-5 flows from `ARCHITECTURE.md`
- **Phase 6 — Polish + edge cases (2h)** — error states, loading states, empty states
- **Phase 7 — Demo video (1h)** — record, edit, upload
- **Phase 8 — Submission package (1h)** — `.initia/submission.json`, README, screenshots, dorahacks form
- **Buffer (2h)** — for the inevitable

Each phase must list: deliverable, success criteria, fall-back plan if blocked.

End with **Customer-buyer review** — is the plan honest? Where is it most likely to slip?

### 9. `RISK_REGISTER.md` — Risks Tracked Explicitly

Required: a table of every known risk with columns: ID, description, likelihood (L/M/H), impact (L/M/H), mitigation, contingency, owner.

Categories to cover:
- Technical risks (Initia tooling bugs, Weave issues, RPC outages, Celestia liveness)
- Build risks (scope creep, time slippage, integration friction)
- Demo risks (mainnet/testnet flakiness during demo, video issues)
- Submission risks (wrong format in `submission.json`, missing fields)
- Competitive risks (a similar BUIDL appearing late in the window)
- Post-submission risks (judge questions we can't answer, demo not reproducible from the repo)

End with **Customer-buyer review** — would a project sponsor approve this risk profile?

### 10. `CUSTOMER_BUYER_REVIEW.md` — Final Adversarial Review of the Architecture

This document is the customer-buyer's full sign-off (or refusal). Required structure:

- **The customer's brief** — restate who pays for this product, what they pay for, what they would not pay for
- **What the customer likes about this architecture** — be specific
- **What the customer would push back on** — be specific, no flinching
- **Open questions the customer wants answered before signing** — listed explicitly
- **Verdict** — Approve / Conditional Approve (with conditions) / Reject (with reasons)
- **If Conditional Approve:** the architecture must be revised before the Build page begins, and the revisions logged here

---

## Process Discipline

For each deliverable in order:
1. Draft it in `/home/claude` working directory
2. Review against the customer-buyer lens — would a paying customer trust it?
3. Revise if it fails the review
4. Move to `/mnt/user-data/outputs/`
5. Present via `present_files` so it can be downloaded
6. Move to the next deliverable

Do not present partial files. Do not summarise instead of producing files. The contract is ten complete `.md` files at the end.

## After Completion

When all ten files are produced and presented:
1. Confirm completion explicitly
2. Run `03_DONE_PROMPT_Architecture.md` for the closeout retrospective
3. Hand off to the Build page (Page 3)

## Known Constraints

- The architecture must support a 5-7 minute demo video
- The architecture must be buildable to MVP in approximately 17-20 effective build hours
- The architecture must not depend on services that require credit-card sign-up beyond what a hackathon participant can plausibly access (free tiers preferred)
- The architecture must produce evidence (chain ID, txn hash, deployment link) for the submission form

## Tone for this page

- Direct, not deferential
- Specific, not abstract
- Honest about weaknesses, not protective of the design
- Customer-buyer first, builder second
