# ARCHITECTURE ACCOUNTABILITY — what was missed, and why

**Status:** post-hoc accountability document
**Written:** 19:09 UTC, 25 April 2026
**Owner:** Build lead (writing about my own work)
**Mode:** brutal honesty about gaps in the original architecture deliverables
**Companion docs:** the ten architecture documents (the work being audited), `CUSTOMER_BUYER_REVIEW_v2_BRUTAL.md` (the document that surfaced these gaps), `MARKET_CONTEXT.md`, `EXTRA_THOUGHTS.md`

> The user asked for **enterprise grade, no scope shrinking**. I delivered ten documents, the user pushed harder, and a brutal customer role-play surfaced ~20 things the original architecture should have covered but didn't. This document is the honest accounting of why each gap existed despite the enterprise-grade brief. Some are defensible (genuinely out of scope for hackathon submission). Some are not (genuine failures of the brief). I name which is which.

---

## How to read this document

Each gap is rated with one of three labels:

- 🟢 **Defensible omission.** Genuinely out of scope for a hackathon Architecture page. Belongs in v1.1+ documentation, not in submission docs. Acknowledging it now is sufficient.
- 🟡 **Should have been flagged.** The architecture didn't *implement* this, which is correct — but it should have *named* it as deferred. Failing to name it is a documentation gap, not an architecture gap.
- 🔴 **Real miss against the enterprise-grade brief.** Should have been in the architecture documents. The hackathon time pressure is an explanation, not an excuse. This is where the brief was not met.

The point of this document is to fail the right grade where I failed, pass the right grade where I passed, and not blur the two.

---

## 1. Reserve prices on auctions — 🔴 Real miss

### What was missed
The original `DATA_MODEL.md` and Move auction module specified bid mechanics, anti-snipe, and finalization, but no `reserve` field. Lina and Marcus both said "must-have" within minutes of testing.

### Why it wasn't in the architecture
I anchored the auction design on "minimum-viable auction that demonstrates royalty enforcement on finalization." Reserve was treated as a secondary auction feature. **That was wrong.** Reserve is universal in real auction houses (Sotheby's, Christie's both have it on every lot); it is not a "nice-to-have," it is table stakes for anyone who has run a real auction.

### Why this is enterprise-grade-failing
"Enterprise grade" means I should have asked: "What does Sotheby's auction software have that mine doesn't?" Reserve would have been on that list within 30 seconds. I did not do that exercise; I designed the auction module from a chain-mechanics perspective, not from a real-auction-business perspective. **That gap is the gap between "hackathon grade" and "enterprise grade," and the user's brief asked for the latter.**

### What would have changed if I'd caught it
Phase 2 of `BUILD_PLAN.md` would have +1.5h budget. `DATA_MODEL.md` `Auction` resource would have an `Option<u64> reserve` field. `auction.move` `finalize` would have one extra branch returning escrowed bids if `highest_bid < reserve`. `royalty.move` would not be touched. Total impact: small. **Cost of catching it later: same as catching it now, plus the embarrassment of having shipped without it.**

### Status
Adding to `BUILD_PLAN.md` Phase 2 task list when build begins. 1.5h additional, no scope cut to other features.

---

## 2. Wallet recovery / loss path — 🔴 Real miss

### What was missed
The architecture has no answer to "what happens if Lina loses her seed phrase?" Move resources are anchored to wallet addresses. A lost wallet means lost access, lost royalty stream, and a brand identity (`lina.init`) that cannot follow her to a new wallet.

### Why it wasn't in the architecture
Crypto-native bias. I treated "users protect their own keys" as the universal Web3 norm. **That is the norm, and it is wrong.** Mid-career artists (Lina) lose seed phrases. They have done it before. They will do it again. A platform that promises "your art forever, royalties forever" without an answer to wallet loss is making a promise it cannot keep.

### Why this is enterprise-grade-failing
Enterprise software has account recovery. Banks have account recovery. Even Web3 has account abstraction (ERC-4337) and social recovery wallets (Argent, Safe). **The architecture's silence on this is silence on a question every real customer asks within 5 minutes of testing.** That is the kind of silence the brutal review surfaced and the original review would have caught if I had role-played a panicked customer rather than an approving one.

### What would have changed
`SECURITY_THREAT_MODEL.md` should have had a §11 "User Key Compromise / Loss" with three named mitigation options (multi-sig, recovery delegate, `.init` re-pointing as anchor). `EXTRA_THOUGHTS.md` §1.2 has this content; it should have been in the threat model originally, not in a companion document.

### Status
Cannot add to v1 build (8h Move + 4h UI = 12h, doesn't fit compressed window). **Must** add to v1.1 backlog and to `CUSTOMER_BUYER_REVIEW.md` as condition C7 (alongside C1-C6). Updating `RISK_REGISTER.md` with R-OPS-06 retroactively.

---

## 3. Fiat on-ramp (Stripe → INIT) — 🟡 Should have been flagged

### What was missed
The architecture leaned on Skip Go for cross-chain crypto bridging but never addressed the GBP/USD → crypto entry point. Carla and Hannah both said it's the single biggest gap.

### Why it wasn't in the architecture
I treated this as out-of-scope for a "Web3 marketplace on Initia" — bridging is the Initia primitive, fiat is somebody else's problem. **For the hackathon submission scope, this is defensible.** Adding Stripe + KYC + compliance is 24h+ of work and dilutes focus on the Initia integrations the hackathon scores on.

### Why I'm flagging it 🟡 not 🟢
"Enterprise grade" software does not assume the customer has crypto already. The architecture documents should have *named* this gap — said explicitly: "v1 is crypto-native only; fiat on-ramp via Stripe is v1.1." Instead, the documents are silent on it, which reads as either (a) we forgot about it, or (b) we don't think it matters. Neither is true. **Failure to name it is the documentation failure.**

### What would have changed
`CUSTOMER_BUYER_REVIEW.md` should have had this in §3 (pushbacks): "Carla cannot easily put GBP into the platform. Stripe → INIT is v1.1." `MARKET_CONTEXT.md` § now has it; it should have been in the original review.

### Status
Document gap, not architecture gap. v1.1 backlog item. 24h build estimate.

---

## 4. Mobile native app — 🟢 Defensible omission

### What was missed
No iOS or Android native app. Carla browses art on her phone 60% of the time.

### Why it wasn't in the architecture
Building a native mobile app in a 24-hour hackathon window is impossible at quality. Responsive web is the right answer for v1. The architecture is correct here.

### Why this is defensible
`BUILD_PLAN.md` Phase 6 explicitly tests on iPhone SE viewport and a real Android via Vercel preview. The product *works* on mobile, just not natively. That's the right v1 trade-off. Native apps belong in v2.0 with a proper 80h iOS + 80h Android budget (or 60h React Native if the team accepts the trade-offs).

### Why I'm flagging it 🟢 not 🔴
The architecture *named this trade-off* in `BUILD_PLAN.md` "What we are NOT building" §. It was a conscious choice with a documented v2.0 path. That is what enterprise-grade documentation looks like — not "we have everything," but "we have these things, we don't have these things, here's why and when."

### Status
Confirmed as v2.0. No change to architecture.

---

## 5. Subscription tiers (Pro Artist £45/mo, Plus Collector £18/mo) — 🔴 Real miss

### What was missed
The architecture's only revenue line is the 0.5% protocol fee. The brutal review surfaced that this revenue alone is structurally undersized to fund the team — Year-1 protocol fee at plausible scale is ~£200/mo, which doesn't pay one engineer.

### Why it wasn't in the architecture
I designed Provenance's pricing as a "marketplace fee" model, mirroring OpenSea's economic structure. **That is the wrong model for a platform whose customer is a small number of high-value artists.** The right model is more like Substack (artist subscriptions) or Patreon (collector subscriptions) plus a small protocol fee — multi-revenue-line, not single.

### Why this is enterprise-grade-failing
Real enterprise software has multiple revenue lines: subscription tiers, transaction fees, premium features, enterprise contracts. I designed a single revenue line at a price point too small to fund the team. The brief was "enterprise grade" and I delivered a hackathon-grade revenue model.

The architecture documents at no point asked "what does this platform need to charge to fund itself for 3 years at the modeled scale?" That is the question every enterprise architecture should answer. I did not answer it. The brutal review answered it: ~£21,600/mo run-rate is required by year 3, current architecture delivers £3,000/mo at the same scale. **An order-of-magnitude pricing miss.**

### What would have changed
`DEPLOYMENT_TOPOLOGY.md` §7 cost model should have had a corresponding §8 revenue model with multiple lanes. `CUSTOMER_BUYER_REVIEW.md` should have included WTP per persona. `TECH_STACK.md` should have included a "revenue infrastructure" layer (Stripe billing, subscription DB tables, paywall enforcement). None of these existed.

### Status
The hackathon submission ships with the 0.5% protocol fee only. **The post-submission v1.1 plan must add the subscription tier infrastructure as the highest-priority work item** — not a feature, but a survival requirement. Without it, the team has no runway path beyond sponsor cheque.

This is the most important honest observation in this whole accountability document. The architecture I delivered is technically sound and economically unviable as a standalone business. The brief said "enterprise grade." I delivered "technically enterprise grade, economically pre-revenue."

---

## 6. Royalty splits as `Object<RoyaltyStream>` — 🟡 Should have been flagged

### What was missed
The architecture hard-codes the royalty recipient as `original_artist`. There's no way for Lina to split royalties 50/50 with a collaborator, and no path to royalty financialisation (selling future royalties for upfront cash).

### Why it wasn't in the architecture
Simplicity bias. I designed the smallest royalty module that demonstrated chain-level enforcement. Splits felt like a v2.0 feature.

### Why I'm flagging it 🟡 not 🟢
The 15-minute design change to make `royalty_recipient: Object<RoyaltyStream>` instead of `royalty_recipient: address` is the kind of foresight enterprise architecture is meant to provide. The cost of catching it now (15 min of Phase 2) vs catching it later (a Move package upgrade with potential breaking changes) is asymmetric.

I should have asked: "What is the minimal Move design that does not preclude obvious v2.0 features?" That's an enterprise-architecture question. I asked the easier question: "What is the simplest Move design that demonstrates royalty enforcement?"

### What would have changed
`DATA_MODEL.md` §1.3 royalty resource should have been an `Object<RoyaltyStream>` from day one. Cost: 15 minutes of design time. Benefit: unlocks splits, transferability, inheritance, financialisation in v1.1 with no breaking change.

### Status
Adding to `BUILD_PLAN.md` Phase 2 design — `royalty_recipient` field is `Object<RoyaltyStream>` even though v1 always points it at the artist. 15 minutes of additional work, no scope cut elsewhere.

---

## 7. DMCA / takedown handling — 🟡 Should have been flagged

### What was missed
No published policy for what happens when a copyright holder sends a DMCA notice for an R2-hosted artwork file. The on-chain `content_hash` doesn't help if the file is contested.

### Why it wasn't in the architecture
Legal-policy work felt outside the technical-architecture scope.

### Why I'm flagging it 🟡 not 🟢
`SECURITY_THREAT_MODEL.md` covers technical attackers but not legal attackers. A DMCA notice is a real attack surface — a single takedown can dark every artwork that uses the same R2 bucket. **The architecture should have at least named the policy gap**, even if implementation is post-hackathon.

### What would have changed
A 1-paragraph addition to `SECURITY_THREAT_MODEL.md`: "Legal takedowns are out of v1 scope; the team will publish a DMCA policy before public mainnet onboarding. Until then, takedown handling is ad-hoc per the build lead's discretion." That's enterprise-grade *naming*, even if the implementation is deferred.

### Status
Adding 1-paragraph stub to `SECURITY_THREAT_MODEL.md` post-submission. R-LEGAL-01 added to risk register.

---

## 8. Treasury governance model — 🟡 Should have been flagged

### What was missed
The architecture says protocol fees go to "the treasury" but doesn't define: who controls the treasury wallet, how funds are spent, how policy is changed.

### Why it wasn't in the architecture
For the hackathon, the treasury is "a single-sig wallet held by the build lead, used to pay the Hetzner bill." That's correct for v1. **But the architecture should have said that out loud**, named the post-mainnet governance options (team multisig / foundation / DAO), and committed to picking one before treasury holds material funds (>£10k).

### Why I'm flagging it 🟡 not 🟢
This is exactly the kind of "we have a plan for what comes next" detail that separates enterprise architecture from hackathon architecture. The architecture is correct on what to do *now*; it's silent on what to do *later*. Silence reads as "we haven't thought about it." For a customer evaluating whether to put real money on the platform, that silence is alarming.

### What would have changed
`DEPLOYMENT_TOPOLOGY.md` should have had a §10 "Governance" with the named options and the trigger for picking one. 100 words; high signal-to-noise ratio.

### Status
Add to v1.1 documentation update. R-PROD-08 added to risk register.

---

## 9. Bug bounty program — 🔴 Real miss

### What was missed
No bug bounty before mainnet. Daniel (the dangerous critic persona) will find vulnerabilities. Whether he discloses responsibly or tweets a screenshot depends entirely on whether there's a published bounty.

### Why it wasn't in the architecture
I treated security as "100% Move test coverage + threat model + audit pre-mainnet" — which is the technical security plan. **A bug bounty is not technical security; it is operational security.** The architecture covered the former and missed the latter.

### Why this is enterprise-grade-failing
Every real Web3 protocol with users has a bug bounty. Aave, Uniswap, OpenSea — all have published bounty programs from their Immunefi pages. The bounty is the cheap insurance policy: £100-£5000 per vuln vs the alternative cost of a public exploit. **Provenance's threat model named third-party audit as a mainnet condition, but did not name a bug bounty as a mainnet condition.** That's a gap.

### What would have changed
`SECURITY_THREAT_MODEL.md` §10 (mainnet conditions) should have had C4 "Published bug bounty program (Immunefi or equivalent) with funded escrow before any artist with > £500/mo revenue is onboarded." 1 line of architecture, real consequence.

### Status
Adding to the v1.1 backlog as a *blocker* on mainnet (not a v2.0 nice-to-have). Conditions list in `CUSTOMER_BUYER_REVIEW.md` extending to C7 + C8 (wallet recovery + bug bounty).

---

## 10. Email notifications, push notifications, discovery tab, verification badge — 🟢 Defensible omissions

### What was missed
None of these features are in v1.

### Why they're defensible
These are all v1.1 product features that the architecture correctly identified as out-of-scope for a 24-hour hackathon. `BUILD_PLAN.md` Phase 6 is explicitly compressed; adding any of these would steal from polish or testing time, both of which are higher priority for the submission demo.

### Why no flag color
The architecture *did* implicitly handle these by leaving the v1.1 lane open — `API_CONTRACT.md` versioning supports adding endpoints, `DATA_MODEL.md` schema is extensible, the indexer can add new event handlers. The architecture is correct to defer these; the brutal review correctly surfaces them as v1.1 priorities. No conflict.

### Status
v1.1 backlog. ~50h total build cost. Pays back via Lina + Carla subscriptions.

---

## 11. On-chain generative script storage — 🟢 Defensible omission

### What was missed
No `Object<GenerativeScript>` resource. Marcus (generative-art veteran) does not buy v1 because of this.

### Why it's defensible
Marcus is explicitly a v2.0 customer, not a v1 customer. The architecture's customer is Lina (mid-tier illustrator), not Marcus (Art Blocks-tier veteran). Designing v1 for v1's customer is correct. Adding generative-script primitives to v1 would mean shipping a feature that Lina doesn't need and Marcus won't use yet. Wrong order.

### Status
v2.0 if-and-only-if 5+ Marcus-tier customers express interest post-launch. Conditional v2.0 backlog.

---

## 12. Curator network / partnership — 🟢 Defensible omission

### What was missed
No curator network. Marcus would pay £200/mo for one. Lina doesn't need one in v1.

### Why it's defensible
A curator network is BD work, not engineering work. It is correctly out of architecture scope. The architecture didn't need to specify a curator partnership; it needs to not preclude one. It doesn't. ✓

### Status
Post-launch BD activity, not architecture work. No document change.

---

## 13. Hannah-tier (brand enterprise) lane — 🟢 Defensible NOT-PURSUED

### What was missed
No SOC 2, no GDPR DPA, no SLA, no dedicated AM, no fiat on-ramp invisible to end customers, no white-label storefronts. Hannah doesn't buy ever, by design.

### Why it's defensible
The architecture is *deliberately* artist-first. Pursuing Hannah-tier would mean a different team, different compliance posture, different sales cycle, different product. The brutal review (`CUSTOMER_BUYER_REVIEW_v2_BRUTAL.md` §4) names this trade-off explicitly: Hannah pays £40k/yr but pursuing her splits team focus and changes the company.

### Why no flag color
The architecture correctly excluded this customer. The brutal review correctly surfaced that this customer exists and pays well. No conflict — both documents agree the choice is conscious. **The only failure mode would be drifting into Hannah-tier work without realising.** The accountability is to revisit this decision at month 6 with real data.

### Status
Conscious not-pursued. Decision-revisit trigger: month 6 post-launch.

---

## 14. Customer-touch operational cost — 🔴 Real miss

### What was missed
The architecture's cost model (`DEPLOYMENT_TOPOLOGY.md` §7) covered infrastructure cost (Hetzner, Neon, R2, Vercel) but did not include customer-management labour cost.

### Why it wasn't in the architecture
I framed cost as "operating cost of the product" rather than "operating cost of the business." That is a hackathon-scope mistake.

### Why this is enterprise-grade-failing
At year 1 plausible scale, customer-touch cost is ~£3,400/mo of build-lead time, which is greater than infrastructure cost (£674/mo). The architecture's cost model thus understates total operating cost by ~5×. **For an enterprise architecture document, that's a significant analytical miss.**

### What would have changed
`DEPLOYMENT_TOPOLOGY.md` §7 cost tables should have had a "labour" row — even if rough — alongside the infrastructure rows. The brutal review's customer-touch table should have been part of the architecture cost model from the start.

### Status
Add labour row to `DEPLOYMENT_TOPOLOGY.md` §7 in v1.1 documentation update. The numbers don't change v1 architecture; they change v1 *expectations* of when the team needs to hire.

---

## 15. Year-3 margin honesty — 🔴 Real miss

### What was missed
At year 3 modeled scale (£21,600/mo revenue, £20,000/mo costs), Provenance's margin is ~£1,600/mo — slim. The architecture didn't model this and didn't flag the slim margin as a strategic concern.

### Why it wasn't in the architecture
The architecture stopped at "the cost model is positive at 10k users" without asking "is positive enough?" A £1,600/mo margin at 10k users is not enough to fund growth, hire engineering, or weather a quarter of low volume. **It's positive in name only.**

### Why this is enterprise-grade-failing
Real enterprise architecture asks: "What is the unit economics curve, and where does it become a real business?" The honest answer for Provenance is "either at 50k+ users or with subscription tiers added." The architecture should have named that. Instead, it named "10k users is profitable" without the asterisk.

### What would have changed
A 2-paragraph addition to `DEPLOYMENT_TOPOLOGY.md` §7.3 framing the 10k-user margin as "barely sustainable, not investable." Honesty paragraph. Belongs in the architecture.

### Status
Add to v1.1 documentation. The recommendation in the brutal review (subscription tiers) is the architectural fix; the documentation fix is naming the year-3 margin honestly in `DEPLOYMENT_TOPOLOGY.md`.

---

## 16. Pivot decision tree (month 6) — 🔴 Real miss

### What was missed
The architecture has no documented "decision point" — at month 6, if Lina-tier subscriptions are below 20 paying artists, what does the team do? Pivot to Hannah-tier? Continue? Shut down honestly?

### Why it wasn't in the architecture
"Architecture documents don't usually contain pivot decision trees." That is the wrong framing for this specific brief — the user said enterprise grade, no scope shrinking, brutal honesty. **A team that ships software without a documented "how do we know it's working?" checkpoint is a team that drifts.**

### Why this is enterprise-grade-failing
Real enterprise software has roadmaps with success criteria. "We will know this is working if X" is a sentence every product roadmap has. Provenance's architecture has no such sentence. The brutal review has it. The original architecture should have.

### What would have changed
A new document — `ROADMAP_DECISIONS.md` — with the month-6 review trigger, the metrics that signal pivot vs continue vs shut-down, and the specific actions for each case. Probably a 1-page document. **High signal, low effort.**

### Status
v1.1 documentation. Adding `ROADMAP_DECISIONS.md` to the post-submission docs.

---

## SUMMARY — what passes the brief, what doesn't

| Gap | Flag | Was the brief met? |
|---|---|---|
| 1. Reserve prices on auctions | 🔴 | No — should have been in v1 |
| 2. Wallet recovery / loss path | 🔴 | No — should have been in threat model |
| 3. Fiat on-ramp | 🟡 | Partially — correctly out of scope, but should have been *named* |
| 4. Mobile native app | 🟢 | Yes — correctly named as out of v1 scope |
| 5. Subscription tiers | 🔴 | **No — biggest miss against the brief** |
| 6. RoyaltyStream object | 🟡 | Partially — design oversight, fixable in 15 min |
| 7. DMCA / takedown policy | 🟡 | Partially — needed naming, not implementation |
| 8. Treasury governance | 🟡 | Partially — needed naming, not implementation |
| 9. Bug bounty program | 🔴 | No — should have been in mainnet conditions |
| 10. Email/push/discovery/verification | 🟢 | Yes — correctly out of v1 scope |
| 11. Generative script storage | 🟢 | Yes — correctly out of v1 (different customer) |
| 12. Curator network | 🟢 | Yes — BD not architecture |
| 13. Hannah-tier (brand) | 🟢 | Yes — conscious not-pursued |
| 14. Customer-touch operational cost | 🔴 | No — should have been in cost model |
| 15. Year-3 margin honesty | 🔴 | No — should have been in cost model |
| 16. Pivot decision tree (month 6) | 🔴 | No — should have been a roadmap document |

**Tally: 7 real misses, 4 should-have-been-flagged, 5 defensible omissions.**

The architecture is technically sound. The brief was "enterprise grade, no scope shrinking." Against that brief, **I delivered hackathon grade with enterprise-grade documentation discipline, not enterprise grade with hackathon-grade time pressure.** Those are different things and the difference matters.

---

## Why this happened

I want to name three patterns honestly:

### Pattern 1 — Designing for the demo, not for the business

I optimised the architecture for the 5-minute hackathon demo: chain-level royalty enforcement, .init usernames, auto-sign, bridge — all the things a judge would see in 5 minutes. **I did not optimise for the questions a real customer would ask in their first 30 minutes:** wallet recovery, reserve prices, email notifications, fiat on-ramp, subscription pricing.

**The fix:** at every architecture document boundary, ask not "does this look good in the demo?" but "does this survive a real customer's first 30 minutes?" The brutal customer review is the tool for that question. **It should be part of the architecture process, not a post-hoc audit.**

### Pattern 2 — Single-revenue-line bias

I came in assuming the right pricing model for an NFT marketplace is "0.5% protocol fee, that's it." I did not model alternative pricing structures (subscriptions, premium features, enterprise contracts) until the brutal review forced me to. **Single-revenue-line is hackathon thinking; multi-revenue-line is enterprise thinking.** I delivered the former.

**The fix:** every architecture document that mentions pricing should have at least one section explicitly examining "what if our pricing assumption is wrong?" 5 minutes per document, big payoff.

### Pattern 3 — Customer-buyer review with friendly personas

The original `CUSTOMER_BUYER_REVIEW.md` had Lina, Marek, Carla, Tomas, Sponsor — all sympathetic. None of them said "I won't pay." None of them said "this isn't a business." The verdict was "Conditional Approve" with six conditions, all of which the team could feasibly satisfy.

**That review was not brutal enough.** Brutal would have included Marcus saying "your storage layer is centralised, you don't understand generative art" and Hannah saying "I can't use this, I run a real brand." **The brutal review forced those voices in.**

**The fix:** every customer-buyer review should include at least one "this customer doesn't buy and is right not to" persona. Otherwise the review is theatre.

---

## What changes in the build window now

Based on this accountability, the immediate Build phase changes are:

1. **Phase 2 (Move modules) gets +1.5h budget for reserve prices on auctions.** Still inside the compressed window. (Item 1 above.)
2. **Phase 2 royalty.move design uses `Object<RoyaltyStream>` not raw address.** 15 min additional. (Item 6.)
3. **Phase 0 (setup) adds a stub `BUG_BOUNTY.md` document committing to publish a real program before mainnet.** 5 min. (Item 9.)
4. **Phase 8 (submission) includes `ARCHITECTURE_ACCOUNTABILITY.md` (this document) in the submitted repo.** Demonstrates honesty about gaps. (All items.)

Total additional build-window cost: ~1h 50min. Comes out of buffer, not core phases.

---

## What changes post-submission

The v1.1 plan must include:

1. **Subscription tier infrastructure** — Stripe billing, paywall enforcement, subscription DB tables. ~40h. (Item 5.)
2. **Wallet recovery via .init re-pointing** — Move + UI. ~12h. (Item 2.)
3. **Bug bounty program published** — Immunefi setup + funded escrow. ~4h + budget. (Item 9.)
4. **Documentation updates** — `DEPLOYMENT_TOPOLOGY.md` adds labour cost row, `SECURITY_THREAT_MODEL.md` adds DMCA stub and treasury governance, `ROADMAP_DECISIONS.md` is created. ~6h. (Items 3, 7, 8, 14, 15, 16.)
5. **Customer-buyer review v2** — re-run with Marcus and Hannah personas at every product phase, not just architecture. Process change. (Pattern 3.)

Total v1.1 effort: ~62h pure addition (not the full 120h v1.1 backlog from the brutal review, just the items surfaced as accountability gaps).

---

## Closing

The user asked for enterprise grade. I delivered ten architecture documents that are 80% enterprise grade and 20% hackathon grade. **The 20% gap is real, named, and fixable.** Some of it can be fixed in the remaining build window (~1h 50min worth). Most of it goes into v1.1 with explicit ownership and timing.

This document — `ARCHITECTURE_ACCOUNTABILITY.md` — exists so that the gap is *visible*. An enterprise-grade team does not pretend the gap doesn't exist; it names the gap and dates the fix. The brutal review surfaced it. This document owns it.

Now build. The submission still ships. The accountability is what makes the next iteration better than this one.
