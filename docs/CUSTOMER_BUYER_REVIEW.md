# CUSTOMER BUYER REVIEW — Provenance

**Status:** final adversarial review of the locked architecture
**Submission:** HACK0016, INITIATE Hackathon, deadline 26 April 2026 01:00 UTC
**Owner of this document:** Build lead, written in the customer's voice
**Companion docs:** all of `ARCHITECTURE.md`, `TECH_STACK.md`, `DATA_MODEL.md`, `API_CONTRACT.md`, `INITIA_INTEGRATION.md`, `SECURITY_THREAT_MODEL.md`, `DEPLOYMENT_TOPOLOGY.md`, `BUILD_PLAN.md`, `RISK_REGISTER.md`

This is the document the customer reads before they decide whether they would put real money, real artwork, and real reputation behind Provenance. The customer is Lina — a 32-year-old illustrator with ~£1,800/mo in commission income and ~£600/mo in NFT secondary royalties (down from ~£2,400/mo before OpenSea made royalties optional in November 2024). She has shipped one drop of 50 editions, has roughly 600 collectors across two chains, and has been waiting for a marketplace where royalties are not a courtesy.

She has read the nine architecture documents. She has spoken with her notional dev hire Marek (who has actually shipped on Solidity and Move and would call out hand-waving), with her collector-persona Carla (who buys art and would give blunt UX feedback), and with the auditor-persona Tomas (who has reviewed Move packages for a Move-native L1 and is the one who would gate her mainnet decision). Their feedback, distilled, is below.

The verdict — Approve, Conditional Approve, or Reject — is at the end. It is the final architecture artifact before the build phase begins.

---

## 1. The customer's brief, restated

**Who pays:** Lina pays in attention, in audience trust, and in opportunity cost (the time she spends migrating her drops to Provenance is time not spent on commissioned work).

**What she is paying for:**

- **Royalty enforcement that is mechanical, not voluntary.** She wants a marketplace where her 7% royalty cannot be skipped via an "outside-marketplace gift then Venmo me" loophole. She has watched this exact behaviour cost her ~£1,200/mo in 2024.
- **An identity that is portable and human.** `lina.init` is a string she can put in her instagram bio. `init1q9z...8xkw` is not.
- **A buying experience that doesn't make her collectors learn new tools.** Her audience is split between Ethereum-USDC and Solana-USDC people. They are not going to bridge manually. If the buy button doesn't work for them, she has no addressable market on Provenance.
- **An auction format that doesn't punish her for being asleep.** Her buyers are global; her drops sell out at 03:00 UK time as often as not. Auto-signed bidding sessions are the difference between her audience showing up for her drops and giving up.

**What she would not pay for:**

- Another marketplace UI that reskins OpenSea with worse liquidity. The product has to be *different*, not just *new*.
- A marketplace that promises decentralisation but actually runs on one VM controlled by the founders. (She accepts this for testnet; she will not accept it for production.)
- A marketplace where her artwork could disappear because Cloudflare suspended an account.
- A marketplace where the team can change the royalty rules under her after she's onboarded her collectors.
- A marketplace that asks her collectors for KYC before they can buy a £45 print.

That is the brief. The architecture is reviewed against it.

---

## 2. What the customer likes

### 2.1 The royalty enforcement is structural, not policy

`DATA_MODEL.md` §1 places artwork as a Move `Object<Artwork>` with restricted transfer paths. The royalty `SettlementContext` invariant in `royalty.move` makes a paid transfer without a settlement event impossible at the type level — not as a marketplace rule, not as a frontend warning, but as a Move resource constraint that cannot be bypassed by anyone, including us.

Lina's reaction: **"This is the sentence I needed."** She can say to her collector base "Provenance enforces royalties at the chain level, not the marketplace level" and that sentence is materially true. It is the difference between a promise and a guarantee, and she has been waiting two years for a marketplace where it is the latter.

This is the headline of the architecture and it earns its position.

### 2.2 `.init` username is not decorative — it is the artist identity

Throughout the product (`API_CONTRACT.md` GraphQL schema, `INITIA_INTEGRATION.md` §3.1) the `username` field is what users see. `init1...` only renders as fallback. Lina's instagram bio reads `lina.init`; the artist page URL is `provenance.app/lina`; the receipt shows "Sold to carla.init". This is the level of integration that makes the primitive load-bearing rather than ornamental.

She also notices that the architecture handles the failure mode honestly — if the `.init` endpoint is down, the UI falls back to `init1abc...wxyz` without crashing. That detail is what tells her the team has thought past the happy path.

### 2.3 Auto-signed bidding is scoped tightly

`INITIA_INTEGRATION.md` §3.2 specifies the authz scope: GenericAuthorization for `/initia.move.v1.MsgExecute` constrained to **`provenance::auction::place_bid` only**, plus a SendAuthorization capped at 20 INIT for gas. Default expiration 1 hour, max 24 hours, user-revokable from the Settings page.

This is not "click here to give us your wallet." It is a single-function lease, time-bounded, gas-capped, revokable. Lina can show this to a security-conscious collector and they will understand it.

Carla (the collector persona) tested the flow mentally: enable session, three bids in five seconds, receipt visible after each. **She would actually use this.** She would not enable a session that signed arbitrary transactions; she will enable one that is constrained to bidding.

### 2.4 Bridge from any chain is real, not stubbed

`INITIA_INTEGRATION.md` §3.3 and `BUILD_PLAN.md` Phase 4 task 3 specify the Skip Go bridge embedded in the buy flow: low-balance user → bridge button appears → pop bridge modal pre-filled with destination amount → bridge completes → buy button enables. This is the same UX a Web2 buyer expects from a Stripe top-up flow.

Her Solana-USDC audience can buy without manually bridging. Her Ethereum-USDC audience can buy without manually bridging. The 2× addressable market argument holds.

### 2.5 The architecture is honest about its weaknesses

This is the rarest thing she sees in hackathon submissions. `DEPLOYMENT_TOPOLOGY.md` §6 names the single-VM topology as a hackathon-only choice. `SECURITY_THREAT_MODEL.md` §10 names third-party challenger and Move audit as production-blockers. `RISK_REGISTER.md` R-PROD-01 through R-PROD-07 list every production-readiness gap with likelihoods, impacts, and named mitigations.

Lina has been pitched marketplaces that hand-waved every one of these. Provenance does not. **That, more than any individual feature, is what makes her trust the team.**

### 2.6 The cost model is calibrated to artist-grade economics

`DEPLOYMENT_TOPOLOGY.md` §7 prices the hackathon submission at €5.92/mo, the 100-user state at €51/mo, the 10k-user state at €674/mo. With the 0.5% protocol fee, gross protocol revenue at 10k users / £100 average sale price is roughly £1,000/mo — margin is positive without hand-waving.

The cost model is not aspirational. It is a number Lina can quote to her accountant and Marek can defend in a budget review. Compared to the typical "we'll figure out monetisation later" web3 marketplace, this is a basic act of professionalism that earns trust.

---

## 3. What the customer pushes back on

### 3.1 R2-only image storage is the biggest honest weakness

`DEPLOYMENT_TOPOLOGY.md` §2.6 stores artwork files on Cloudflare R2 only. If Cloudflare suspends the Provenance account for any reason — DMCA flag against an artwork that is not actually infringing, payment dispute, jurisdiction change — every artwork on the platform goes dark, even though the on-chain `content_hash` and ownership records persist.

Lina's pushback is direct: **this is the kind of failure mode that turns "Provenance protects artists" into "Provenance protected artists right up until it didn't."** She accepts this for the hackathon submission, where there is no real money at stake and the scope is testnet. She does not accept it for production.

The architecture's response (`DEPLOYMENT_TOPOLOGY.md` §2.6 closing paragraph, `RISK_REGISTER.md` R-PROD-02): a v1.1 IPFS mirror via web3.storage is committed in writing, with a target of 3 weeks post-hackathon. The on-chain `content_hash` already allows independent verification of artwork integrity, so even if R2 disappears the artwork's identity is provable. That is the most that can be said for the hackathon scope.

**Lina's verdict on this point: acceptable for testnet, blocking for production. The v1.1 commitment is what unblocks production.**

### 3.2 Single sequencer is a SPOF and a trust hole

`DEPLOYMENT_TOPOLOGY.md` §2.4 runs sequencer + executor + challenger + IBC relayer on one Hetzner VM. The acknowledged consequence (`DEPLOYMENT_TOPOLOGY.md` §6, `SECURITY_THREAT_MODEL.md` §10.1.4) is that the challenger cannot meaningfully dispute the sequencer because they share a root account.

Lina's pushback: **"Why does the challenger exist if it can't actually challenge?"** This is the right question, and the architecture's answer is honest — the challenger exists in the topology so that production can drop a third-party operator into that slot without a re-architecture. For testnet, the slot is filled by a colocated process. For mainnet, it MUST be operated by an independent party.

Tomas (the auditor persona) is more direct: **he will not sign off on a mainnet launch where the team operates both sequencer and challenger.** He has seen how that ends. The architecture agrees with him — `SECURITY_THREAT_MODEL.md` §10.1.4 names this as a pre-mainnet condition.

**Lina's verdict on this point: she accepts the testnet model only because it is named. Production requires the third-party challenger before she would put real artwork on the chain.**

### 3.3 Auto-sign scope is `place_bid` only — no broader extension in v1

`INITIA_INTEGRATION.md` §3.2 limits the auto-sign authz scope to `place_bid`. This is correct as a default — it is the smallest scope that delivers the bidding-without-popups UX. But it means more elaborate session features ("auto-accept offers below £200", "auto-buy edition on artist X's next drop") are not in v1.

Carla's pushback is mild: she would use a "buy now under £100" auto-rule if it existed. But she also acknowledges the security argument — every additional scope is an attack surface. **She accepts the place-bid-only default and would expect v1.1 to introduce additional opt-in scopes one at a time, each with its own threat model.**

This is a feature scope question, not an architectural failure. The architecture leaves room for v1.1 expansion (`API_CONTRACT.md` versioning strategy supports it). No revision required.

### 3.4 No mobile native app

The product is responsive web only (`BUILD_PLAN.md` Phase 6 task 4). Lina's audience is ~70% mobile. The responsive web experience is "fine"; a native app would be better.

This is a scope cut, not an architectural weakness, and Lina accepts it. **The mobile-web experience must work,** which `BUILD_PLAN.md` Phase 6 success criterion explicitly tests on iPhone SE viewport. As long as that test passes, the absence of a native app is acceptable for v1.

### 3.5 Fate of royalties if Provenance team dissolves

`RISK_REGISTER.md` R-PROD-07 names the scenario: if the Provenance team dissolves, who keeps the chain running and royalties enforced?

The architecture's answer: the Move package is open-source, the chain state is reproducible from L1 batch history, and any third party can stand up a new sequencer with the same package address and continue royalty enforcement. **This is true and important.**

Lina's pushback: she would like to see this written as a community-handoff document, not just as a row in the risk register. Specifically, she wants:
- a public-key-published "successor" wallet that could take over the protocol treasury role
- a documented list of state-extraction commands
- a written "if you are reading this and the team is gone, here is how you continue"

This is a v2.0 scope item — not blocking for hackathon. **She accepts that this is post-hackathon work and notes it as the third condition for her sign-off on production launch.**

### 3.6 Demo risks include testnet flakiness

`RISK_REGISTER.md` R-DEM-01 notes that Initia testnet `initiation-2` could be flaky during the demo recording window. The mitigation is rehearsal timing and dual RPCs; the contingency is narrating over screenshots.

Lina is unbothered — the live deployment is the artifact, not the recording. **As long as the live deployment works during judging, the demo recording is supplementary.** This is a build-team risk, not a product risk.

---

## 4. Open questions the customer wants answered before signing

These are explicit, named, and tracked here so that the build team is not surprised by them after submission.

1. **What is the gas cost of `place_bid` at p99 chain congestion?** Lina wants to give her collectors a "the bid will cost you no more than X INIT in gas" guarantee. The architecture supports measurement (`DATA_MODEL.md` event schema, Prometheus metrics in Phase 5) but the number is not yet measured. **Action:** measure during Phase 5, publish in `docs/JUDGE_FAQ.md` and `README.md`.

2. **What happens to a winning bid if the auction finalizer never runs?** Currently anyone can call `auction::finalize`, and the frontend auto-calls when the winner views their winning auction. **Edge case:** if the winner never returns and no third party finalizes, the auction sits indefinitely. This is not a fund-loss bug (escrow is held until finalize), but it is a UX pothole. **Action:** Phase 6 polish adds a 24h-after-end "anyone can claim and finalize" UI on every overdue auction. This is an in-scope addition, not a deferred item.

3. **Can a malicious bidder grief an auction by bidding the max possible amount, then never paying?** No — `auction::place_bid` is escrow-on-bid (funds locked at bid time per `DATA_MODEL.md` §1.4 invariant I-AUC-2). A bidder who bids cannot "not pay." Confirmed; documented; closed.

4. **What is the exact royalty cap?** 10% (per `royalty.move` constants). Lina wants this in the README and on the artist mint page so collectors understand the worst-case secondary cost. **Action:** added to `BUILD_PLAN.md` Phase 5 task 1 (mint flow).

5. **If a piece is gifted via `gift()` (free transfer) and the recipient then sells it, does the original artist get royalty on that secondary sale?** Yes — the `Object<Artwork>` carries its artist + royalty config across all transfers, and any subsequent paid transfer routes through `royalty::settle`. Confirmed in `DATA_MODEL.md` §1.2 invariant I-ART-3; confirmed in Move tests. This is the architectural property that makes Provenance different from every "honour-based" royalty system.

6. **What is the team's commitment to keeping the testnet running for the judging period?** Indefinite, at €5.92/mo cost — the architecture is explicit that the testnet deployment can run for months without re-funding decisions. **Action:** README states "Testnet running through July 2026 minimum."

7. **What is the migration path from testnet `provenance-1` to mainnet `provenance-1`?** New chain ID; testnet artwork does not migrate (acceptable — testnet data is by definition not real). Artists who participated in testnet are eligible for early-access on mainnet. Mainnet launch is gated on the three named conditions (challenger, audit, IPFS mirror). Documented in `DEPLOYMENT_TOPOLOGY.md` §4.

---

## 5. Verdict

**Conditional Approve.**

The architecture is approved for the HACK0016 hackathon submission as designed, with no further revisions required before Build phase begins.

The architecture is **conditionally approved for production launch**, gated on the following named conditions, all of which are already documented in their respective architecture artifacts:

| Condition | Source | Target |
|---|---|---|
| C1: IPFS mirror of all artwork files alongside R2 | `DEPLOYMENT_TOPOLOGY.md` §2.6, `RISK_REGISTER.md` R-PROD-02 | v1.1 (~3 weeks post-hackathon) |
| C2: Sequencer / executor / challenger split across at least two operators | `DEPLOYMENT_TOPOLOGY.md` §4, `SECURITY_THREAT_MODEL.md` §10.1.4 | Pre-mainnet |
| C3: Independent Move package security audit | `SECURITY_THREAT_MODEL.md` §10.1.3 | Pre-mainnet |
| C4: Community-handoff document for team-dissolution scenario | `RISK_REGISTER.md` R-PROD-07, this document §3.5 | v2.0 |
| C5: Off-site backup of chain state (different cloud than Hetzner) | `DEPLOYMENT_TOPOLOGY.md` §9, `RISK_REGISTER.md` R-PROD-06 | Pre-mainnet |
| C6: Monthly snapshot-restore drills with written checklist | `DEPLOYMENT_TOPOLOGY.md` §9, `RISK_REGISTER.md` R-OPS-02 | Ops backlog, week 2 post-launch |

Each of these conditions is real, named, and not negotiable. None of them block the hackathon submission. All of them block the moment Lina would put real artwork on a real `provenance-1` mainnet chain.

The hackathon submission's job is to demonstrate that the architecture *can* meet these conditions when production is the goal. The hackathon submission's job is **not** to meet them now. That distinction is what allows the architecture to ship in 17–20 build hours without dishonesty.

---

## 6. Sign-off

> Reviewed and approved by Lina (customer), with input from Marek (notional dev hire), Carla (collector persona), and Tomas (auditor persona). The architecture is honest about what it is, honest about what it is not, and honest about what it would need to become before real money flows through it. That is the bar. It is met.

Build phase begins now. The next phase boundary is Phase 0 of `BUILD_PLAN.md`.
