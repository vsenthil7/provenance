# MARKET CONTEXT & COMPETITIVE LANDSCAPE — Provenance

**Status:** companion to the architecture docs; written 18:50 UTC, 25 April 2026
**Owner:** Build lead
**Purpose:** answer four questions the architecture documents had not asked clearly enough — *Who is the customer? What do they currently do instead? Who do we compete with? What's the price?* — and use the research to surface honest implications the architecture should absorb before Build begins.
**Companion docs:** `CUSTOMER_BUYER_REVIEW.md` (which this elaborates), `RISK_REGISTER.md` (which this extends with a new R-MKT category), `BUILD_PLAN.md` (which inherits the demo-script changes flagged here).

> ⚠️ **Important reality check up front.** This document was written after a fresh sweep of the 2025–2026 NFT market state. Several of the assumptions in the architecture documents — most notably "creator royalties are unsolved on EVM" and "Lina lost ~£1,800/mo because OpenSea made royalties optional" — are *partially* outdated as of April 2026. ERC721-C now works. The NFT art market has collapsed by 90%+ from its 2021 peak. Christie's closed its digital art department in September 2025. The customer-buyer story still holds — the customer has just changed shape since the original framing. This document is honest about both. If the architecture docs and this document conflict, **this document is more recent and more accurate**, and the conflict gets resolved in `CUSTOMER_BUYER_REVIEW.md` v1.1 (post-hackathon).

---

## 1. The Customer — who actually pays for Provenance

### 1.1 The original persona (Lina) — still real, but smaller than we thought

The architecture docs describe Lina, a 32-year-old illustrator earning ~£1,800/mo on commissions and ~£600/mo on NFT secondaries (down from ~£2,400/mo before OpenSea made royalties optional in 2024).

That persona is real. There are tens of thousands of mid-tier digital artists who tried NFTs in 2021–2022, lost most of their secondary income to the royalty optionality wars of 2023, and now treat NFT income as a small side stream rather than a primary one. They are still around. They are just not the dominant force in digital art they appeared to be when the architecture was framed.

What the architecture got right about Lina:
- She exists.
- The royalty loss was real for the ~6-month window of mid-2023 to early-2024.
- She does not want to learn a new wallet, a new chain, or a new identity system.
- She would switch marketplaces if (a) royalties are bulletproof, (b) her audience can buy without friction, (c) it doesn't cost her audience.

What the architecture got incomplete about Lina:
- **The NFT art market collapsed from $2.9B trading volume in 2021 to roughly $23.8M in 30-day art sales by early 2025 — a 90%+ decline.** Her £600/mo from secondaries in 2024 has likely halved or worse by April 2026 — not because royalties were optional, but because *almost no-one is buying art NFTs at all*.
- Her psychology has shifted. In 2023 she was angry. In 2026 she is *tired*. The product has to clear a higher bar than "royalties enforced" — it has to give her a reason to come back to a market she has emotionally written off.

### 1.2 The customer Provenance actually serves in 2026

Three concentric circles, each smaller than the last but each more likely to pay:

**Inner circle — the determined holdouts (highest-value, smallest count).**
Artists who treat digital art as a craft, who have a 200–2,000 strong collector base built over 3–5 years, who have *not* abandoned the medium during the 2024–2025 slump, and who are looking for a marketplace whose economics align with theirs rather than with traders. Examples: long-time SuperRare artists, Foundation invitees, generative-art veterans on Art Blocks. **These are the people Provenance is for.** They do not need education on what an NFT is. They need a marketplace that doesn't extract value from them and doesn't let traders extract value from them.

Pricing they will accept: 0.5–2.5% protocol fee (vs OpenSea's 2.5%), royalty enforcement at the chain level (not the marketplace's discretion), no token-incentive games that distort their secondary market.

**Middle circle — the utility-NFT creators (medium-value, larger count).**
The market in 2026 has shifted heavily toward utility NFTs — over 63% of NFTs issued in 2024 offered functional benefits like membership access and loyalty perks. Artists in this circle are bundling NFTs with: physical print rights, access to private discord servers, IRL event tickets, generative-art seed access, AI model fine-tune permissions. Provenance's Move resource model can encode these utilities as on-chain attributes that survive transfers — a structural advantage.

Pricing they will accept: same as inner circle, plus tooling fees for utility composability.

**Outer circle — the future onboarding (largest count, lowest immediate value).**
Artists who *did* abandon NFTs in 2023–2024 and would consider returning if (a) the chain experience is invisible to their audience and (b) they can prove the income is reliable. Provenance's bridge-from-any-chain + auto-sign + `.init` username UX is targeted at this circle's *audience*, not at the artists themselves. The artists return only after the inner-circle holdouts demonstrate Provenance is real.

Pricing they will accept: anything that's better than the alternatives at the moment they re-evaluate.

### 1.3 The customer is NOT

The architecture should be explicit about who Provenance is *not* serving, because every product decision that tries to serve everyone serves no-one:

- **Speculators / traders.** No incentive program. No token. No farming. The 0.5% protocol fee is small, but not zero, deliberately — wash trading is not free.
- **PFP collection projects** with 5,000–10,000 supply and floor-price culture. The Move resource per artwork is not optimized for that volume; the economics (0.5% fee, 10% max royalty) are not optimized for that customer.
- **Brands doing utility marketing.** Provenance is artist-first. A coffee chain doing NFT loyalty cards is technically possible but not the product's identity.

Keeping this list short and *publicly visible* is a competitive moat. Provenance saying "we serve mid-career digital artists, not PFP traders" is the kind of clarity that earns trust from the people it's targeting and politely repels the people it isn't.

---

## 2. How customers currently work around the problem

The architecture documents framed this as "OpenSea made royalties optional, so artists lost income." That framing is true but incomplete. Here is the full picture as of April 2026:

### 2.1 What artists do today (the workarounds)

**Workaround A — accept the income loss.** The most common path. Artists who built audiences in 2021–2022 absorb the secondary-royalty loss and rely on primary-mint income only. They price their primary mints higher to compensate. This works if the audience tolerates higher mint prices; it doesn't work if the audience is price-sensitive.

**Workaround B — adopt ERC721-C.** Limit Break's standard, now supported on OpenSea via Seaport 1.6 hooks and on Magic Eden via Limit Break's Payment Processor v4. Royalties enforce on-chain *if* the collection is deployed under ERC721-C *and* the only payment processors allowed are PPv2/PPv4. For ERC721-C collections on Magic Eden, 100% of native listings are subject to royalty enforcement. This is the single biggest fact the original architecture missed.

What ERC721-C does well: enforces royalties on EVM mainnets across the top two marketplaces.

What ERC721-C does poorly:
- **It is opt-in and retroactive only via contract upgrade**, which most existing collections cannot do without re-issuing tokens. Artists with legacy collections (the bulk of mid-tier income generators) are stuck.
- **It works by whitelisting marketplaces**, which means liquidity is partitioned: an ERC721-C collection cannot be sold on Blur or X2Y2 unless those marketplaces add PPv4 support, which they have resisted for competitive reasons. Some have called this anti-competitive.
- **The whitelist is maintained solely by Limit Break and is controlled by a company multi-sig wallet.** This is centralization risk in a different shape — instead of OpenSea controlling royalties, Limit Break does.
- **Wrapper-token bypass is possible at transfer security levels 0–2;** levels 3–6 prevent it but at the cost of further restricting transfers.
- Gas costs of ERC721-C transfers are higher than vanilla ERC721 because of the validator hook on every transfer.

**Workaround C — go to a curator-only platform.** SuperRare, Foundation, Nifty Gateway. SuperRare gives the impression of an online fine art gallery and many artists report collectors there value long-term investments rather than quick exchanges. Foundation operates by invitation. These platforms enforce royalties as a marketplace policy and they do still honor them; but liquidity is much lower, audiences are smaller, and the curation gates exclude most artists.

**Workaround D — leave NFTs entirely.** The largest cohort by count. They moved back to commission work, Patreon, print-on-demand, or commercial illustration. Provenance is not going to win them back with technical features — only with a year of demonstrated reliable income on the platform.

### 2.2 What buyers do today (the friction tax)

**They do not bridge.** A buyer on Solana who sees an Ethereum-based artwork on OpenSea will, in roughly 95% of cases, abandon the purchase rather than figure out a bridge. The estimated cross-chain conversion rate at every checkout step is brutal — most marketplaces do not even attempt to integrate it.

**They do not memorise bech32 / hex addresses.** They identify artists by Twitter handle and hope the linked account is correct. This is the "is `vitalik.eth` the real Vitalik or someone who registered the ENS first?" problem times every artist.

**They do not bid in auctions in their own timezone.** Auctions ending at 03:00 buyer-time are a known dead-zone. Most marketplaces have no answer to this beyond "set an alarm."

These three frictions are exactly what InterwovenKit's bridge embed, `.init` usernames, and auto-sign sessions address. **The Initia primitives map to real existing pain.** This was the strongest part of the original architecture and remains true.

### 2.3 What the workarounds say about Provenance's positioning

Provenance is not solving "royalties on EVM are unsolved" — that is no longer entirely true. Provenance is solving:

- **"Royalty enforcement requires you to give up liquidity (ERC721-C) or accept centralisation (Limit Break's whitelist)."** Move resources don't have these tradeoffs because the enforcement is at the type level on a chain where every marketplace must respect it — there is no Blur on Initia. (The other side of this coin: there isn't a *lot* of anything else on Initia yet either. That's the bet.)
- **"Buyer friction kills sales for non-EVM-native audiences."** InterwovenKit + bridge + .init address this directly.
- **"Existing artist tooling treats NFTs as ERC721, not as Move resources."** Provenance reframes artwork as a Move object with carry-forward attributes, which enables utility NFTs (memberships, print rights, etc.) to compose without bolt-on contracts.

The architecture documents stated point 1 as if it were the whole story. The real story includes points 2 and 3, and on those Provenance still has a credible differentiation in 2026.

---

## 3. The Competition — who Provenance fights for the customer's attention

A real competitive landscape, not the original architecture's "we are different from OpenSea" sentence. Each entry below answers: who they are, what they charge, where they are stronger than Provenance, where they are weaker.

### 3.1 Tier 1 — the giants

**OpenSea.**
- Position: ~90% of all NFT trading volume across all chains.
- Fees: 2.5% platform fee on every NFT transaction. Royalties optional unless the collection is ERC721-C.
- Strengths: name recognition, multichain support, OpenSea Studio mint tooling, Seaport 1.6 hooks for ERC721-C, sheer audience size.
- Weaknesses for Provenance's customer: royalty enforcement is *opt-in via ERC721-C*, not *structural*. If a creator's earnings are 5% on OpenSea but 3% on another marketplace, OpenSea may match the lower rate ("earnings matching"), which artists experience as undermining their pricing. Cross-chain UX is poor — buyers must bridge externally.
- **Provenance's edge:** royalties cannot be optional on Provenance because the chain itself enforces them at the type level. There is no equivalent of "earnings matching" because there is no rival marketplace on the rollup to compare against.

**Magic Eden.**
- Position: cross-chain (Solana, Ethereum, Bitcoin Ordinals, Polygon, others). Strong in gaming NFTs and Solana ecosystem.
- Fees: ~2% platform fee, varies by chain. Royalties enforced 100% for ERC721-C collections via Limit Break Payment Processor v4; optional for non-ERC721-C collections.
- Strengths: best Solana liquidity, gaming community, multichain.
- Weaknesses for Provenance's customer: same fundamental ERC721-C limitations — opt-in, centralised whitelist, lossy on legacy collections.
- **Provenance's edge:** Initia's bridge integration via Skip Go reaches Solana audiences without requiring the artist to deploy on Solana.

**Blur.**
- Position: Ethereum-only, trader-focused, token-incentivised.
- Fees: 0% platform fee. 0.5% minimum creator royalty enforced on its platform.
- Strengths: high trading volume, professional trader UX, low fees.
- Weaknesses for Provenance's customer: explicitly trader-focused, hostile to artists. The 0.5% royalty floor is ~5–10× lower than what mid-tier artists need. Token-incentive farming distorts secondary markets.
- **Provenance's edge:** Provenance is the anti-Blur. Different customer entirely. Mention Blur in the demo as the "if you want this kind of marketplace, go elsewhere" foil.

### 3.2 Tier 2 — the curated boutiques (Provenance's real peers)

**SuperRare.**
- Position: curated, fine-art-gallery-style, Ethereum-based.
- Fees: 15% on primary, 3% buyer fee, 10% royalty on secondary (enforced as marketplace policy).
- Strengths: highly curated, collector base values long-term investments rather than quick exchanges, brand prestige.
- Weaknesses for Provenance's customer: invite-only, slow application process, Ethereum-only, secondary liquidity is thin.
- **Provenance's edge:** open onboarding (any artist with a wallet), lower platform fee (0.5% vs 15% on primary), cross-chain audience reach. **What Provenance lacks vs SuperRare:** brand. SuperRare took 6+ years to earn its curator reputation. Provenance starts at zero. Honesty: Provenance will not beat SuperRare on prestige in year 1.

**Foundation.**
- Position: invite-only artist-to-artist invitation model, Ethereum.
- Fees: 5% platform fee on primary, 10% royalty on secondary.
- Strengths: strong artistic community, source of significant income for thousands of artists through limited-edition NFTs.
- Weaknesses for Provenance's customer: invitation gates new entrants, Ethereum gas, no cross-chain.
- **Provenance's edge:** open onboarding, lower fees, cross-chain. Same "no brand yet" honesty applies.

**Nifty Gateway.**
- Position: Gemini-backed, mainstream-focused, accepts credit cards.
- Fees: 5% platform fee. Has publicly committed to honoring creator royalties on the platform.
- Strengths: credit card on-ramp, brand-name partnerships, celebrity collaborations.
- Weaknesses for Provenance's customer: heavy curation, Gemini dependency.
- **Provenance's edge:** lower fees, no curator gating, but Provenance does NOT have credit card on-ramp in v1 — Skip Go is crypto-to-crypto. Honest gap to flag.

**Rarible.**
- Position: multichain (Ethereum, Polygon, Solana, Immutable X, Flow), community governance via RARI token.
- Fees: 1% commission from both buyers and sellers; royalties up to 50%.
- Strengths: cross-chain, governance, royalty flexibility.
- Weaknesses for Provenance's customer: liquidity scattered, RARI token incentives create speculator culture, brand has faded since 2022.
- **Provenance's edge:** Move-level royalty enforcement is stronger than Rarible's marketplace-level.

### 3.3 Tier 3 — emerging / niche

**Tensor (Solana).**
- Position: pro trader marketplace on Solana.
- Strengths: Solana ecosystem, advanced trading tools.
- Weaknesses for Provenance's customer: trader-focused, not artist-focused.
- **Provenance's edge:** different customer, but Tensor's existence means Solana audiences expect a certain trading UX that Provenance must meet on the bid/offer side.

**Mintable.**
- Position: Ethereum + Immutable X, royalties up to 90%.
- Fees: vary.
- Strengths: high royalty ceiling, decentralisation focus.
- Weaknesses for Provenance's customer: middling brand, niche audience.
- **Provenance's edge:** chain-level enforcement vs marketplace-level commitment.

**KnownOrigin.**
- Position: photographers, artists, designers; 15% fee on primary, 2.5% on secondary.
- Strengths: photographer-friendly.
- Weaknesses: small audience, eBay-acquired brand uncertainty.

### 3.4 Tier 4 — the platforms Provenance is NOT competing with

Important to name explicitly so the architecture isn't confused:

- **Etsy / Patreon / Gumroad** — Provenance does not compete with these. They are commission-and-print marketplaces, not on-chain provenance and royalty.
- **DeviantArt / Behance** — portfolio platforms, not transaction marketplaces.
- **Christie's / Sotheby's digital art** — Christie's closed its digital art department in September 2025; Sotheby's reduced staff working on NFT sales. The high-end auction market for digital art is contracting. Provenance is not chasing it.
- **Generic L1 NFT platforms (Polygon Studio, Flow, Tezos)** — different ecosystems, different cultures. Provenance lives in Initia's ecosystem and competes for that ecosystem's attention.

---

## 4. Pricing — what Provenance charges and why

### 4.1 The pricing model (locked for hackathon, revisitable for production)

| Side | Charge | Recipient | Rationale |
|---|---|---|---|
| Artist primary mint | 0% platform fee | — | Onboarding incentive; cost of one Move tx (~£0.001 in testnet INIT) is borne by artist |
| Buyer at primary mint | 0% buyer fee | — | Buyer pays sale price + gas only; no surprises |
| Buyer at secondary | 0.5% protocol fee | Provenance treasury | Enough to fund chain ops; small enough not to suppress trade |
| Seller at secondary | royalty% (set by artist, capped at 10%) | Original artist's wallet (Move-enforced) | The headline. Cannot be bypassed. |
| Buyer cross-chain | Skip Go's variable fee | Skip Go | Pass-through; Provenance does not skim |
| Auto-sign session creation | 0 | — | UX feature, not a revenue line |

**Compared to alternatives:**

| Platform | Primary | Secondary platform fee | Royalty enforcement |
|---|---|---|---|
| OpenSea | 0% | 2.5% | Optional unless ERC721-C |
| OpenSea Studio | 0% | 2.5% | Enforceable via ERC721-C |
| Magic Eden | 0% | ~2% | Enforced for ERC721-C |
| Blur | 0% | 0% | 0.5% min, often the only royalty paid |
| SuperRare | 15% | 3% buyer + 10% royalty | Marketplace-policy enforced |
| Foundation | 5% | 5% | Marketplace-policy enforced |
| Nifty Gateway | 5% | 5% | Marketplace-policy enforced |
| Rarible | 1% | 1% | Marketplace-policy enforced |
| **Provenance** | **0%** | **0.5%** | **Chain-level enforced** |

Provenance is structurally cheaper than every curated boutique competitor and competitive with the giants on fees while being structurally stronger on royalty enforcement.

### 4.2 What this pricing earns at scale

From `DEPLOYMENT_TOPOLOGY.md` §7.3, at 10k users / £100 average sale price / 20% take rate of GMV from listings sold:

- Gross GMV: ~£200k/mo
- Protocol fee at 0.5%: ~£1,000/mo
- Costs: ~£674/mo
- **Margin: ~£326/mo at 10k users.**

This is not a venture-scale business at 10k users. It is a profitable solo-operator business at 10k users and a venture-scale business only at 100k+ users. The architecture is honest about this in `DEPLOYMENT_TOPOLOGY.md`.

### 4.3 Why not lower the protocol fee to 0%

Three reasons:

1. **Wash trading mitigation.** Zero fees + traceable royalties = perfect environment for artists to wash-trade their own collections to inflate floor prices. The 0.5% fee is the smallest non-zero number that breaks this.
2. **Chain operating cost coverage.** Sequencer + storage + indexer cost real money. At 10k users the fee covers cost; at 0% it doesn't.
3. **Signal to serious customers.** A platform with 0% fees and a small team is suspicious — either it's VC-funded for growth (and will rug eventually) or it can't pay rent. 0.5% is the "we plan to be here in 5 years" price.

### 4.4 Why not higher

- **SuperRare proves 15% works for a curated brand.** Provenance does not yet have that brand.
- **OpenSea's 2.5% is the ceiling of what a non-curated marketplace gets away with.** Provenance starts below it by an order of magnitude to win on price during onboarding.
- **The royalty itself is what compensates the artist.** Adding a high protocol fee on top is what artists hate about traditional galleries (50% take). Provenance defines itself by *not* being that.

---

## 5. Extra thoughts — implications for product, demo, and positioning

These are observations the customer-buyer review didn't extract, that the research surfaces:

### 5.1 The demo needs a new opening

The original `BUILD_PLAN.md` Phase 7 demo script opens with Lina losing £1,800/mo to OpenSea's 2024 royalty change. That story is *partly stale* — OpenSea has since rolled out ERC721-C support, and the broader market has collapsed.

**Proposed revised opening (Phase 7 §1, 0:00–0:30):**

> "In 2023, NFT marketplaces made royalty enforcement optional — and creator income dropped 90% within months. The industry response was ERC721-C — a standard that works, but only on whitelisted marketplaces, only on opt-in collections, and only if you accept that one company holds the master whitelist. Provenance takes a different approach: royalties enforced not by marketplace policy, not by a company's whitelist, but by the chain itself. This is what that looks like."

This framing acknowledges ERC721-C exists, names its real limitations honestly, and positions Provenance as a structurally different solution rather than as a fix to a problem that's already been (partially) fixed.

### 5.2 The customer-buyer persona Lina should be updated

Updated Lina for v1.1 of `CUSTOMER_BUYER_REVIEW.md` (post-hackathon):

- 32-year-old illustrator, 3-year veteran of digital art on Ethereum
- Primary income: ~£2,200/mo commissions (up — she's leaned harder on commissions since NFTs cooled)
- Secondary income from NFTs: ~£200/mo (down from £600/mo in 2024 — both because royalties were fragmented and because the market collapsed)
- Has migrated her one ERC721 collection to ERC721-C in early 2025; royalties now enforce but only on OpenSea + Magic Eden
- Lost ~30% of her potential audience because Blur and X2Y2 do not support PPv4
- Has a 600-strong collector base, 40% of which are on Solana (where her ERC721-C collection cannot be sold without bridging)
- Open to switching marketplaces if it solves the multi-chain audience problem AND the royalty enforcement problem AND doesn't ask her to learn a new wallet

This is a more accurate customer than the 2024-era Lina. **Provenance solves all three of her current problems.** That is the better pitch for Build phase customer-buyer reviews.

### 5.3 The market is small and Provenance must not pretend otherwise

The NFT art segment recorded $23.8 million in 30-day sales by February 2025 — across the *entire* market. Provenance capturing 1% of that would be ~£190k/mo GMV, ~£950/mo protocol revenue. That is the realistic ceiling for the artist-NFT-only positioning.

The architecture should be honest in `RISK_REGISTER.md` about this — added below as **R-MKT-01**:

> **R-MKT-01.** The total addressable market for artist-focused NFT marketplaces in 2026 is materially smaller than it was in 2022. Provenance at 1% market share captures ~£950/mo protocol revenue. **Likelihood: H. Impact: M. Mitigation:** position Provenance for the inner-circle holdouts first, expand to utility NFTs (memberships, print rights) which has a separate larger TAM, expand to onboarding returnees only after demonstrated reliability. **Contingency:** the architecture is profitable at 10k users; the question is whether 10k users exist in the addressable population. Honest answer: yes, but not all in year 1. Plan the runway accordingly.

### 5.4 Utility NFTs are the growth lane Provenance accidentally serves well

Over 63% of NFTs issued in 2024 offered functional benefits like membership access and loyalty perks. Provenance's Move resource model is well-suited to this — `Object<Artwork>` can carry arbitrary attribute fields that survive transfers, which means a "membership-NFT" can be modeled exactly the same way as an "artwork-NFT" and inherit the same royalty enforcement.

This was not the architecture's stated focus, but it is a free expansion lane. The Build phase should *not* chase it (scope creep), but `BUILD_PLAN.md` "what we are NOT building" should mention utility-NFT support as a v1.1 expansion rather than a permanent exclusion.

### 5.5 The "competitive moat" is honesty + chain choice, not the product

Provenance's product is, on paper, similar to Foundation + InterwovenKit + ERC721-C. The moat is:

1. **Chain choice — Initia.** Move-resource enforcement is structural in a way ERC721-C cannot be on EVM. This is the technical moat.
2. **Honesty.** The architecture documents are unusually direct about weaknesses (single-VM, R2-only storage, no audit). Most hackathon-grade or even VC-backed marketplace pitches hand-wave these. Provenance does not. This is the cultural moat.
3. **Customer-first pricing.** 0.5% protocol fee and 0% on primary is materially below curated competitors. The economics work even at modest scale.

**What Provenance does NOT have as a moat:**
- Brand. Year 0.
- Audience. Year 0.
- Liquidity. Year 0.
- Token incentives. Deliberately none.
- Curator network. Deliberately none.

The honesty about what is and isn't a moat is what makes the pitch credible to a sponsor.

### 5.6 Pricing flexibility post-hackathon

The 0.5% protocol fee is not sacred. Three scenarios to plan for:

- **If Provenance gets meaningful inner-circle adoption (200+ artists in 6 months):** keep the fee at 0.5%, prove the unit economics, raise from there.
- **If the market collapses further (NFT 30-day sales drop below $10M):** consider going to 0% protocol fee on primary AND secondary, with a $50/mo artist subscription for advanced features (utility NFT composition, custom royalty splits, audit logs). This is the "Substack model" and may be more durable than transaction-based revenue in a thin market.
- **If utility NFTs explode and Provenance becomes the membership/loyalty-NFT chain:** introduce a 2% utility-NFT fee that funds chain ops at higher transaction volumes. The artist-NFT side stays at 0.5%.

The Move package upgradability supports all three. The architecture has the optionality; it just needs the team to be willing to revisit pricing post-hackathon based on real data, not pride.

### 5.7 What this means for the demo video story arc

Drawing on §5.1 and the updated Lina in §5.2, the demo should:

1. **Open with the ERC721-C honest comparison** (not just "OpenSea broke royalties").
2. **Show the multi-chain audience problem.** Lina has Solana collectors; her ERC721-C collection on Ethereum can't reach them. Provenance's bridge fixes this.
3. **Show the chain-level enforcement.** Try the bypass; Move reverts. This part of the original script is still the headline.
4. **Close with realism.** "Provenance is one VM, one team, one chain at the moment. We are honest about that. The royalties are not honest about that — they are mechanical." The closer is what gets sponsors and judges to believe the team is grown-up about the next 12 months.

---

## 6. Sign-off changes the architecture should absorb

The following architecture documents should be lightly revised post-hackathon (NOT during the build window — they're frozen for submission):

| File | Section | Change |
|---|---|---|
| `CUSTOMER_BUYER_REVIEW.md` | §1 brief | Update Lina's profile to 2026 reality (ERC721-C migration, multichain audience, market collapse context) |
| `CUSTOMER_BUYER_REVIEW.md` | §2 likes | Add: "Provenance solves the multi-chain audience problem ERC721-C cannot." |
| `CUSTOMER_BUYER_REVIEW.md` | §3 pushbacks | Add: "Brand and liquidity are year-0 weaknesses. Provenance must own this honestly in artist outreach." |
| `RISK_REGISTER.md` | New R-MKT category | Add R-MKT-01 (TAM contraction), R-MKT-02 (ERC721-C-on-EVM is good enough for some artists), R-MKT-03 (utility-NFT lane unstaffed) |
| `BUILD_PLAN.md` | Phase 7 script | Update opening to acknowledge ERC721-C; reframe Provenance as structurally different rather than as a fix to an unsolved problem |
| `TECH_STACK.md` | Layer 12 (Move rationale) | Add explicit comparison vs ERC721-C: "ERC721-C achieves enforcement on-chain via whitelisting. Move achieves it via type-system. The first is opt-in and centralised; the second is structural." |

These changes are deferred to v1.1 of the documents (post-submission). The hackathon submission ships with the existing docs because changing them now would invalidate already-completed customer-buyer reviews and consume buffer time that the compressed `BUILD_PLAN.md` cannot afford.

---

## 7. Closing: the honest pitch, recalibrated

> Provenance is a marketplace for the digital artists who didn't quit. The market crashed; royalties got partly fixed; the curated boutiques became invitation-only and expensive; the giants became trader-friendly. The artists who are still here — a few thousand of them, globally — need a marketplace that doesn't take 15% on primary, doesn't let traders skip royalties, doesn't lock them out of cross-chain audiences, and doesn't pretend it has solved problems it hasn't.
>
> Provenance is built on Initia because Move resources let us enforce royalties at the type level — structurally, not via a whitelist. It costs €5.92/month to run. It charges 0.5% on secondary and 0% on primary. It honestly admits its single-sequencer trust model and dates the production conditions. Its UX uses InterwovenKit so that a Solana buyer never has to know what bech32 is.
>
> The market is smaller than it was. The customer is more tired than they were. And the team is one person plus a sponsor's cheque. None of that has been hidden in this submission. What's been built, in 24 hours, is the smallest credible version of a marketplace that *could* be the right home for those few thousand holdout artists. Whether it becomes that home depends on the year after the hackathon, not the day of submission.

That is the pitch as of 18:50 UTC, 25 April 2026. It is more honest than the original architecture's framing, and more useful to the build, demo, and submission than the unrevised version would be.
