# EXTRA THOUGHTS — Provenance

**Status:** companion to `MARKET_CONTEXT.md`; written 18:50 UTC, 25 April 2026
**Owner:** Build lead
**Purpose:** capture the strategic, technical, and product observations that fell outside the architecture documents — questions worth asking before Build, ideas worth tracking after submission, and traps worth naming so the team doesn't walk into them.
**Companion docs:** `MARKET_CONTEXT.md` (the customer + competitive analysis this builds on), all ten architecture documents (the locked-in system this critiques).

> This document is *deliberately* less polished than the architecture docs. It is not a deliverable; it is a thinking-out-loud companion. Sections are independent — read whichever ones are relevant. Opinions are mine; the team should disagree where useful.

---

## 1. The questions the architecture didn't ask

### 1.1 What happens when the first artist's collection gets a copyright takedown?

Nothing in the architecture handles a DMCA notice or copyright dispute. R2 storage means we have a single, takedown-able point — and the on-chain `content_hash` doesn't help if the file is *contested* rather than *missing*. If a Disney lawyer emails the team about a Mickey Mouse fan-art NFT, what happens?

**Architecturally:** the `content_hash` stays on chain forever. The R2 image goes dark. The artwork resource still exists, still routes royalties. It just shows a placeholder.

**Operationally:** the team has not decided whether to comply with takedowns proactively, only after court order, or never. This is a real decision and `SECURITY_THREAT_MODEL.md` did not address it. **The honest answer for v1:** comply with valid DMCA notices for the R2-hosted file, refuse to alter on-chain state. This is what every web2-with-on-chain-receipt platform does. It needs to be in the Terms of Service before any artist onboards.

**Risk:** an artist alleges takedown abuse and we have no appeals process. Add to `RISK_REGISTER.md` as R-LEGAL-01 (post-hackathon).

### 1.2 What's the artist's recovery path if they lose their wallet?

The architecture is silent on this. Move resources are anchored to a wallet address. If Lina loses her seed phrase, every artwork in her collection becomes unmoveable; every royalty stream becomes unclaimable forever.

**Mitigation options the architecture did not consider:**
- **Multi-signature artist wallets** for serious artists (Move supports this trivially via `0x1::multisig_account`). Trade-off: more friction at sign-time.
- **Recovery delegate** — artist designates a backup address that, after a 30-day timelock, can claim royalty streams if the primary stops responding. Custom Move logic; small surface area.
- **`.init` username as anchor** — if the username is what audiences trust, and Initia's username system supports re-pointing to a new address, the artist's brand survives a key loss. **This may be the most elegant answer.** Audiences follow `lina.init`, not `init1q9z...`. If Lina rotates her wallet and updates her username pointer, her audience never notices.

The third option is *almost free* given the architecture already uses `.init` everywhere. But it requires: (a) verifying that Initia's username system supports atomic re-pointing, (b) deciding whether artwork resources should reference username-as-resolver or wallet-as-author, (c) handling royalty stream re-pointing if the wallet rotates.

**Recommendation:** out of scope for hackathon. Add to v1.1 backlog as a feature, and to `RISK_REGISTER.md` as R-OPS-06 (current state: artists have no recovery path; documented).

### 1.3 What's the protocol's treasury policy?

The architecture sets a 0.5% protocol fee paid to a treasury address. It does not say:
- Who controls the treasury address (single-sig? multisig? DAO?)
- How treasury funds are spent (chain ops? team payroll? marketing? grants to artists?)
- How treasury policy is changed (governance? unilateral team decision?)

For the hackathon: the treasury is a single-sig wallet held by the build lead, used to pay the €5.92/mo Hetzner bill. Honest, simple, sufficient.

For production: this becomes a real question. Three plausible models:
1. **Team multisig** — fast, low overhead, dependent on team integrity.
2. **Public foundation** — slower, higher overhead, more credible.
3. **On-chain DAO** — most credible, highest overhead, requires actual users to participate.

Provenance's customer (Lina) probably doesn't care which until the treasury holds material funds (>£10k). At that point the team should commit to one model publicly. Add to v1.1 backlog. Track as R-PROD-08.

### 1.4 Are royalty streams transferable?

The architecture says "royalties go to the original artist's wallet." It doesn't address: can Lina sell her future royalty stream to a collector? Can she split it 60/40 with a collaborator? Can she designate her child as the post-mortem recipient?

This matters because:
- **Royalty financialisation** is a $multi-million market in traditional music (Spotify backed catalogues, music royalty REITs). On-chain transferable royalty streams enable similar financialisation for visual artists.
- **Co-creation** is common — Lina collaborates with a writer for an illustrated story. Splitting royalties 50/50 should be one transaction, not an off-chain trust agreement.
- **Estate planning** is a real concern for artists who treat their NFT income as long-term.

Move's resource model can encode this directly: a `RoyaltyStream` resource that owns the right to receive royalties for a specific Artwork, and which itself is transferable, splittable, and inheritable.

**This is a v2.0 idea.** It is not in scope for hackathon. But it is a clean, principled extension of the existing architecture, and worth noting that `royalty.move` should be designed *not to preclude* this future. Specifically: don't hard-code the royalty recipient as `original_artist`; instead route to a `RoyaltyStream` object whose initial owner is the artist. This adds about 30 lines of Move code in Phase 2 and unlocks the entire v2.0 feature set later.

**Action:** add a 15-minute task to `BUILD_PLAN.md` Phase 2 (royalty.move design): "design royalty recipient as `Object<RoyaltyStream>` not raw address, even though v1 always points the stream at the artist." This is the most strategic 15 minutes of the build.

### 1.5 Does the auction module support reserve prices?

The architecture's auction module has min-bid, anti-snipe, and finalize. It does not mention *reserve* — the artist's right to set a minimum price below which the auction does not finalize, returning bids if unmet.

In traditional art auctions, reserve is universal. Sotheby's auctions all have reserves. Without reserve, an artist who lists a piece in a low-traffic week may sell for a derisory price.

**This is a 30-line addition to `auction.move`** — a new field `reserve: Option<u64>`, a check in `finalize` that returns escrowed bids if the highest bid < reserve.

**It should be in v1.** Add to `BUILD_PLAN.md` Phase 2 as a subtask of `auction.move`. The customer (Lina) will absolutely ask "can I set a reserve" within minutes of testing the product. Better to have it on day 1.

### 1.6 Does the offer module have a minimum lifetime?

`offer.move` allows anyone to make an offer on any artwork, which the owner can accept. Without a minimum lifetime, a malicious bidder can:
1. Wait for the owner to be about to accept.
2. Cancel the offer in the same block.
3. The owner's "accept" tx fails.
4. Owner is annoyed; bidder wastes nothing.

This is a low-impact griefing vector but a real one. Standard mitigation: offers have a minimum 1-hour lifetime; cancellation is a 1-hour delayed action. Add to `offer.move` Phase 2 backlog.

---

## 2. Things the architecture got right that should be celebrated, not just shipped

### 2.1 The customer-buyer review pattern is the most valuable artifact

The architecture documents have customer-buyer reviews at the end of each. This pattern — *forcing the team to write the customer's pushback before shipping* — is unusually rigorous for a hackathon submission. It catches scope creep, identifies hand-waving, and produces honest documents.

**The Build phase should keep this pattern at every phase boundary** (already in `04_BUILD_PROMPT.md` Operating Rule 7). Don't cut it under time pressure. The 5-minute customer-buyer review at the end of each phase is what keeps the product honest.

### 2.2 The "named, capped, written" exemption budget for testing

The architecture caps total coverage exemptions at 5 across the entire codebase. Each exemption is named in writing, capped, and tracked. This is a stronger discipline than most production codebases I've seen, let alone hackathon submissions.

**Why it works:** the cap forces the team to choose carefully. Exemption #1 is easy. Exemption #5 is agonising. By forcing the choice to be explicit and finite, the architecture turns "we'll just exempt this" from a slippery slope into a real decision.

**Generalise:** this pattern works for any "we'll handle the edge case later" decision. Cap the number, name them in writing, force trade-offs. Apply to: known bugs, deferred features, technical debt items.

### 2.3 The 0.5% fee is a credibility signal, not a revenue line

The architecture's pricing is calibrated *below* what would maximise revenue and *above* what would suggest the team won't be around in 5 years. 0.5% is the Goldilocks number for "we are serious but we are on your side."

**The team should not reduce this to 0% under competitive pressure.** Provenance is not Blur; it should not race to the bottom. If a competitor undercuts to 0%, Provenance should respond with better tooling, better artist support, or a higher royalty cap — not by cutting the protocol fee.

### 2.4 The single-VM topology is honest, not a flaw

Many hackathon submissions claim production-grade decentralisation while running on one VM. Provenance documents the single-VM topology as a known limitation with a named migration path. **This is the credibility-earning move.** Sponsors and judges who have seen too many overclaimed decentralisation pitches will recognise this as adult.

The lesson: the architecture's *honesty* is a feature, not a bug. The team should resist any pressure to scrub the "single-VM" language from marketing copy. It is what makes the rest of the pitch believable.

---

## 3. Things to track post-submission (the v1.1 / v2.0 backlog seeds)

A scratch list of features, fixes, and observations that should be picked up after the hackathon. Not all of these will ship; the discipline is to *capture* them now so they're not forgotten.

### 3.1 Features (v1.1, ~2 weeks post-hackathon)
- **IPFS mirror of R2 images** — the named v1.1 commitment in `CUSTOMER_BUYER_REVIEW.md` C1.
- **Reserve prices on auctions** — see §1.5.
- **Offer minimum lifetime** — see §1.6.
- **Royalty stream as `Object<RoyaltyStream>`** — see §1.4 (this might need to be in v1 if Phase 2 has time; otherwise v1.1 with a Move package upgrade).
- **Email notifications** — for outbid, won, sold, royalty paid. Most artists check email more than they check on-chain notifications.
- **Artist verification badges** — `lina.init` is good but artists also want a "verified" tier that links to their Twitter/Bluesky/Instagram. Implementation: signed message from claimed account, posted to a public attestation contract.

### 3.2 Features (v2.0, ~3 months post-hackathon)
- **Utility-NFT primitives** — membership tokens, print-rights tokens, generative-art-seed tokens, all using the same royalty enforcement.
- **Royalty splits and transferable streams** — the financialisation lane.
- **Curator collections** — a Foundation-style invite-only sub-marketplace within Provenance, run by a third-party curator (think: a "Provenance × MoMA" curated drop). 1% additional fee to the curator, optional.
- **Artist subscriptions** — £50/mo flat-fee tier with advanced features (custom royalty splits, audit logs, white-label collection pages). The "Substack model" hedge from `MARKET_CONTEXT.md` §5.6.
- **Mobile native apps** — iOS + Android. Critical because 70% of Lina's audience is mobile.
- **Credit card on-ramp** — via Stripe → USDC → bridge. The Nifty Gateway play. This is what brings non-crypto-native buyers into the market.

### 3.3 Operational improvements (post-launch)
- **Multi-VM rollup topology** — the named pre-mainnet condition C2.
- **Independent third-party challenger** — pre-mainnet condition C3.
- **Move package security audit** — pre-mainnet condition C3.
- **Off-site backups to a different cloud** — `RISK_REGISTER.md` R-PROD-06.
- **Monthly snapshot-restore drills with written checklist** — R-OPS-02.
- **JUDGE_FAQ → ARTIST_FAQ** — turn the hackathon judge FAQ into an onboarding doc for new artists.
- **Status page improvements** — historical uptime data, RSS feed, public incident log.

### 3.4 Strategic decisions to make in the first month post-launch
- **Treasury governance model** — single-sig, foundation, or DAO (see §1.3).
- **DMCA / takedown policy** — published Terms of Service (see §1.1).
- **Wallet-loss recovery policy** — public stance on what happens when artists lose access (see §1.2).
- **Pricing flexibility** — three scenarios in `MARKET_CONTEXT.md` §5.6; pick one based on first-month data.
- **Curator network strategy** — yes/no, and if yes, who.
- **Open-sourcing the Move package** — currently the architecture says MIT-licensed. Should it stay MIT or move to a copyleft license like AGPL to prevent fork-and-undercut competitors? (Recommend: stay MIT. Forks would be welcome — they prove the protocol is real.)

---

## 4. Traps to avoid

A short list of mistakes that would be easy to make in the next 6 hours of build and the 6 months of operation.

### 4.1 Build phase traps

- **Treating the architecture as a wishlist.** It's not. It's a contract. If `BUILD_PLAN.md` says Phase 2 is 4 hours, plan for 4 hours, not 8. The compressed window in `04_BUILD_PROMPT.md` is what we have.
- **Caving on the testing discipline at hour 14.** The 100% coverage gate is non-negotiable. The forbidden-moves list in the Operating Rules is not a suggestion. If the team feels themselves wanting to disable a test "just to ship," that is the moment to take a 5-minute break and re-read the discipline.
- **Adding scope mid-build.** "Just one small feature" is how every hackathon submission overruns. The "what we are NOT building" list in `BUILD_PLAN.md` is the only authority for changes; touching it requires updating `CUSTOMER_BUYER_REVIEW.md` in the same commit.
- **Recording the demo when tired.** Demo recording at hour 18 produces visibly tired demo. Better to take a 90-min nap and record clear-headed than push through.
- **Submitting at T-5min.** Don't. The dorahacks form might fail. Submit at T-30min, edit if needed.

### 4.2 Demo phase traps

- **Talking about the technology more than the customer.** Judges have seen 50 decks about Move. They have seen 5 decks about Lina. Be Lina-centric.
- **Glossing over weaknesses.** The single-VM topology is in the architecture; mention it in the demo (briefly, ~10s) as a credibility move. If a judge asks about it later, the answer is already on tape.
- **Live demo failure.** The live deployment will be relied on during judging. Test it from a different network 30 minutes before submission. Have a recorded fallback.

### 4.3 Post-submission traps

- **Reading the leaderboard.** Don't. The leaderboard's job is to make you feel bad about your score; your job is to ship the product to its first 10 real users.
- **Believing the early adopters.** The first 5 artists who try Provenance will be unusually patient and unusually positive. They are not representative. The 50th artist's feedback is the signal.
- **Quitting too early.** NFT marketplaces take 12–24 months to find their audience. The market is small. Patience is the asset.
- **Quitting too late.** If after 12 months the architecture is sound and the marketplace has 5 artists, the product is not the problem; the market is. Be willing to pivot to utility NFTs (§3.2) or shut down honestly. Don't zombie-walk.

---

## 5. The one paragraph that matters most

Of everything in the architecture and these companion documents, this is the paragraph the team should re-read on hour 18 of the build:

> Provenance is built for the artists who didn't quit. It costs €5.92/month to operate. It charges 0.5% on secondary and 0% on primary. It enforces royalties at the type level. It admits its single-sequencer trust model in writing. It uses InterwovenKit so a Solana buyer never has to know what bech32 is. It will probably have 5 users in month 1 and 50 in month 6 and 500 in year 1. That is fine. The market is small now and so is the team. The product just has to be honest, work reliably, and be there in year 3 when the inner-circle artists are ready to come back.

Everything else — the testing discipline, the customer-buyer reviews, the named conditions for production — exists to serve that paragraph. If a Build-phase decision is unclear, the question to ask is: does this make us more or less likely to be there in year 3? Decide accordingly.

---

## 6. Last word

The architecture is good. The market is bad. The build window is short. The team is small. The product is plausible. None of these are reasons to not ship; some of them are reasons to ship more carefully.

Build now. Submit before 26 April 01:00 UTC. Sleep. Then in the first week post-submission, write the v1.1 plan with the customer-buyer review updates from `MARKET_CONTEXT.md` §6 and the v1.1 backlog from §3.1 of this document. The hackathon is the trailhead, not the summit.
