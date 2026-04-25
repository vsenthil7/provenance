# BRUTAL CUSTOMER ROLE-PLAY — Provenance

**Status:** companion to `CUSTOMER_BUYER_REVIEW.md` (the original, hackathon-frozen review) and to `MARKET_CONTEXT.md` / `EXTRA_THOUGHTS.md`
**Written:** 18:59 UTC, 25 April 2026
**Owner:** Build lead
**Mode:** adversarial, no scope-shrinking, enterprise-grade throughout
**Method:** I role-play as five distinct real-world customer types. Each one decides — buy or don't buy. If buy, why and at what price. If don't buy, what is missing and what would change the answer. Each gives a willingness-to-pay number per enhancement. Each tells me what they currently spend, in real money, solving this problem without Provenance.

> No persona is a friend. No persona is "the customer-buyer reviewer who eventually approves." Each one is a real person with real money and real options, and most of them will not buy.

> ⚠️ **Note:** This document is *additive* to `CUSTOMER_BUYER_REVIEW.md`, which remains the locked architecture-page artifact (Conditional Approve verdict, six post-hackathon conditions). This document goes *deeper* than the original by pricing each enhancement, naming the operational cost of managing each customer, and being honest about the standalone unit economics of Provenance as a business. It is intended for post-submission re-reading, not for inclusion in the hackathon submission package.

---

## CUSTOMER 1 — Lina, mid-career digital illustrator, 32, London

**Background:** 4 years on Ethereum NFTs. Has a 600-strong collector base. Migrated her one collection to ERC721-C in Q1 2025. Currently earns ~£2,200/mo on commissions, ~£200/mo on NFT secondaries (down from £600/mo in 2024). Solana audience exists but she can't reach them with her ERC721-C collection. Tired but still in the market.

### Verdict: **Buys. Conditional on three things shipping.**

She buys because Provenance solves three of her current real problems at once: chain-level royalty enforcement (vs ERC721-C's whitelist game), multi-chain reach (her 40% Solana audience), and a 0.5% protocol fee that is materially below SuperRare's 15% and competitive with OpenSea's 2.5%. She has spent 4 years figuring out what marketplace economics serve her vs extract from her, and Provenance's pricing is the first one in that period that aligns with her side.

### What she pays for what's already built

| What she gets | Her current alternative | Current monthly cost to her | What Provenance saves |
|---|---|---|---|
| Chain-level royalty enforcement | ERC721-C contract upgrade + LimitBreak whitelist dependency | ~£40 in Ethereum gas amortised over 12mo + ~£0 explicit fee | She pays £0 instead of £40, plus structural certainty vs centralised whitelist |
| Multi-chain audience reach | She does not reach Solana buyers; estimated lost revenue ~£80/mo | £80/mo opportunity cost | £80/mo recovered |
| `.init` username | Twitter handle + bech32 fallback in Discord | £0 explicit, but 2–3 lost sales/mo from address-confusion (~£100/mo) | £100/mo recovered |
| 0% primary fee vs SuperRare 15% | She does not list on SuperRare; she'd lose 15% of primary if she did | If she'd taken the SuperRare invite she had in 2024: £150/mo lost on £1,000 primary GMV | £150/mo not lost |

**Total monthly value to Lina at her current scale: ~£370/mo** of recovered or saved revenue, against a £0 monthly Provenance fee (only the 0.5% on actual secondary sales).

She would tolerate a £15/mo Provenance subscription on top of the protocol fee if it bought her advanced features (see WTP table below). She would not tolerate a 1%+ protocol fee — that's the line where Provenance starts to feel like the platforms she fled.

### What is missing for Lina

These are the things she would name within 30 minutes of testing the product. Provenance's response is in italics.

1. **No way to recover if she loses her wallet.** This is her single biggest fear. *We need to ship `.init` re-pointing or a 30-day timelock recovery delegate before she puts a £500 piece on chain. v1.1.*
2. **No reserve price on auctions.** "I am not selling my piece for £40 just because Tuesday was quiet." *15-line addition; should be in v1, not v1.1.*
3. **No email notifications.** She checks email more than she checks any wallet UI. *Trivial to add post-submission; v1.1.*
4. **No way to verify she is the real Lina.** A scammer could mint at `1ina.init` (number 1 not letter L). *We need a verification badge that links to a signed message from her existing Twitter. v1.1.*
5. **No print-rights NFTs.** A meaningful share of her income is selling A3 prints to her collectors. She wants the NFT to come with a redeemable physical print right. *This is the utility-NFT lane in `MARKET_CONTEXT.md` §1.2; v2.0.*
6. **No royalty splits.** She collaborates with a writer for an illustrated story; she wants 50/50 splits on chain, not in a Notion doc. *Ship as `Object<RoyaltyStream>` per `EXTRA_THOUGHTS.md` §1.4; design in v1, full UX in v1.1.*

### Lina's willingness-to-pay per enhancement (£/month, on top of 0.5% protocol fee)

| Enhancement | Lina's WTP/month | Why this number |
|---|---|---|
| Wallet recovery via `.init` re-point | £25 | Existential fear; would pay more if asked |
| Reserve price on auctions | £0 (must be free) | Standard auction feature; if priced she would feel insulted |
| Email notifications | £5 | Convenience |
| Verification badge | £15 (one-time, not monthly) | Anti-impersonation is a real concern |
| Royalty splits | £10 | Useful for ~30% of her work |
| Print-rights NFTs | £25 | Could double her per-piece revenue |
| Custom collection page (white-label) | £50 | Would replace a Squarespace site she pays £14/mo for |
| Audit logs (every tx, downloadable for accountant) | £20 | Saves 2h/mo of bookkeeping |
| **Plausible monthly subscription bundle** | **£45/mo** | Wallet recovery + email + splits + audit logs |

**She would pay £45/mo for the right bundle.** That is the artist-tier subscription number.

### What she currently spends solving these without Provenance

- **Squarespace artist site:** £14/mo
- **Mailchimp for collector list:** £11/mo
- **OpenSea Studio (free, but 2.5% on secondary vs Provenance's 0.5%):** ~£8/mo opportunity cost on £400 secondary GMV
- **ERC721-C contract upgrade gas (one-time, amortised):** ~£3.50/mo
- **Failed cross-chain sales lost to bridge friction:** ~£80/mo opportunity cost
- **Address confusion lost sales:** ~£100/mo opportunity cost
- **Total current "shadow cost" of solving these problems badly: ~£216/mo**

Provenance at the £45/mo subscription tier replaces ~£216/mo of shadow cost. **That is a 4.8× value-for-cost ratio**, which is the kind of number that closes a sale.

---

## CUSTOMER 2 — Marcus, generative-art veteran, 41, Berlin

**Background:** 7 years in generative art. Sold an Art Blocks Curated piece for 80 ETH in 2022. Currently sells on Art Blocks' presents tier and SuperRare. Earns ~£8,000/mo from primary sales of generative drops, ~£1,200/mo on secondaries. Has a 3,000-strong collector base who have known him for years. Technically literate.

### Verdict: **Doesn't buy in v1. Buys in v2.0 if specific things ship.**

He doesn't buy in v1 because he is not feature-starved — Art Blocks and SuperRare already serve him, with a brand reputation that took years to build. He is also generative-first, which means the *seed* and *script* matter as much as the output image, and Provenance's `Object<Artwork>` doesn't yet model that.

### Why he doesn't buy

1. **No on-chain script storage.** Art Blocks stores the generative script on Ethereum so the art is reproducible 100 years from now. Provenance's R2-only image storage is, to him, fundamentally not generative-art-grade. "If your storage layer is centralised, you don't understand what generative art is for."
2. **No seed + script composition primitive.** A generative artwork is a script + a seed. Provenance treats them as one image. Marcus needs the script as a separate Move resource, with its own permissions and royalty rules.
3. **No curator brand.** Art Blocks Curated is a quality signal that took years. Provenance has none. Marcus' collectors trust Art Blocks; they don't know Provenance.
4. **Primary fee at 0% is suspicious to him.** "What's the catch?" Generative artists are used to paying 10–15% to Art Blocks because the curation is worth it. 0% reads as "you'll figure out monetisation later," which to Marcus reads as "you'll rugpull eventually."
5. **No physical-world tie.** Marcus has done plotter prints, projection events, gallery shows. NFT-only is a step backward for him.

### What would change his mind

- **On-chain script storage** (he'll accept Celestia DA blobs for the script as long as integrity is verifiable). Move resource `Object<GenerativeScript>` separate from `Object<Artwork>`.
- **A curator network.** Provenance × an established curator. He doesn't care which curator — he cares that a quality bar exists.
- **A higher protocol fee tier (1.5%) that funds curation, marketing, and chain durability.** Counterintuitively, Marcus would pay *more* to feel safer.

### His WTP per enhancement (£/month, his scale)

| Enhancement | Marcus' WTP/month | Why this number |
|---|---|---|
| On-chain generative script storage | £150 | Critical to his medium |
| Curator network access | £200 | He'd pay for the brand |
| Plotter print fulfillment | £75 | Convenience for his existing offering |
| Royalty splits | £50 | Multi-collaborator works |
| Wallet recovery | £100 | His back catalogue is worth £100k+ |
| Audit logs + tax export | £40 | Real bookkeeping for £100k/yr operation |
| **Plausible monthly subscription** | **£300/mo** | Curator + script storage + recovery |

**He would pay £300/mo for the v2.0 product. He pays £0 for v1 because it doesn't serve him yet.**

### What he currently spends

- **Art Blocks platform fee on primary:** ~10% of £8,000 = £800/mo
- **SuperRare platform fee on primary:** 15% of his SuperRare drops, ~£300/mo
- **Personal gallery shows (annual amortised):** ~£500/mo
- **Plotter, paper, framing for physical prints:** ~£200/mo
- **Accountant for crypto-tax filing:** ~£150/mo
- **Total current cost: ~£1,950/mo**

Provenance at v2.0 with the £300/mo subscription would replace some of this — maybe £400-500/mo of value — but not all. Marcus is not a price-sensitive customer; he is a feature-sensitive customer. He doesn't quit Art Blocks for £100 cheaper. He quits for *better*.

---

## CUSTOMER 3 — Carla, NFT collector, 38, Toronto

**Background:** Bought her first NFT in 2021. Currently holds ~80 pieces across Ethereum, Solana, and Base. Spends £400-600/mo buying art (down from £2,000/mo in 2022). Crypto-native but not a developer. Decisive about UX: if a buy flow takes more than 90 seconds, she abandons.

### Verdict: **Buys, but as a buyer not as a payer. The thing she buys is friction reduction.**

Carla doesn't pay Provenance directly — buyers don't pay platform fees on Provenance. But she *is* the customer the artists are trying to reach, so the question is: does Provenance reduce her friction enough that she'd actively buy on it vs OpenSea/Magic Eden?

Yes, conditionally.

### Why she would actively buy on Provenance

1. **Bridge-in-the-buy-flow.** She has £200 in USDC on Solana. Today, buying an Ethereum-based piece means a 10-minute Wormhole bridge with $2 fee, then a 3-minute swap. Skip Go in the buy flow is one click.
2. **Auto-sign for auctions.** She has lost three auctions in the last year because she was AFK during the wallet-popup window. £0 lost to her wallet, but £600 of pieces she wanted now in someone else's hands. Auto-sign at place_bid scope only is a feature she'd actively seek out.
3. **`.init` usernames.** She's been scammed once by a fake-Twitter-handle artist. A verifiable on-chain username that links to socials is meaningful to her.
4. **Royalty enforcement.** She *cares* that the artist gets paid. She buys art because she likes art, not because she likes flipping. A platform where the artist is structurally protected feels like the right place to spend.

### Why she might NOT buy on Provenance even if she likes it

1. **No fiat on-ramp.** She has GBP in her bank account. To buy on Provenance, she has to first move GBP → USDC → bridge → INIT → buy. That's 4 steps. OpenSea has Stripe → buy in 2 steps. *This is the single biggest gap.*
2. **No mobile app.** She browses art on her phone in bed. Responsive web is "fine" but is not how she shops. Magic Eden's iOS app is what she uses 60% of the time.
3. **Single-sequencer trust model.** She read the architecture's honesty section and is glad it's there but is not delighted. "I'd put £50 on this. I would not put £500 on this until there's a real challenger network."
4. **No collection-discovery UX.** She finds new artists via OpenSea's "trending" tab and Twitter. Provenance has neither yet. She'd buy from artists she already knows; she would not discover new ones on the platform.

### Carla's WTP per enhancement (she pays as buyer-side ancillary services)

| Enhancement | Carla's WTP | Why |
|---|---|---|
| Fiat on-ramp (Stripe → INIT) | She pays Stripe's 2.9% gladly | Already pays this on every other platform |
| Mobile native app | £0 (must be free, but is non-negotiable for her engagement) | She browses on phone |
| Auto-sign for bidding | £0 (delight feature, drives engagement) | She'd use it daily |
| Bridge-in-buy-flow | £0 (she pays Skip Go's pass-through fee, ~0.3%) | Already pays equivalent on other platforms via manual bridges |
| Discovery / trending tab | £0 (UX feature) | She'd browse 10× more often |
| Push notifications for new drops by followed artists | £3/mo subscription | She'd pay for it |
| Premium "first-look" access to drops (early-access tier) | £15/mo | She'd pay for early access on her favourite artists |
| **Plausible monthly subscription (collector tier)** | **£18/mo** | First-look access + push + discovery |

**She would pay £18/mo for a collector subscription.** That's a revenue lane Provenance hasn't designed yet but should. At 200 collector subscribers, that's £3,600/mo — more than the current 0.5% protocol fee at 10k users would yield.

### What she currently spends

- **Stripe fees on USDC purchases:** 2.9% of £600 = £17/mo
- **Wormhole / Squid bridge fees:** ~£8/mo
- **Lost auctions due to AFK during sign window:** ~£200/mo (her honest estimate of pieces she wanted but didn't win)
- **Subscription to NFT analytics tools (Nansen Lite):** £35/mo
- **Total: ~£260/mo**

Provenance at the £18/mo collector tier replaces ~£200/mo of that loss. **11× value-for-cost ratio for buyers.** Carla becomes an evangelist at this ratio.

---

## CUSTOMER 4 — Hannah, brand marketing director at a mid-tier UK fashion label, 39, Manchester

**Background:** £80M revenue brand. Did an NFT loyalty drop in 2022 with a Polygon studio agency that cost £45,000 and produced ~600 mints. Currently has a 12,000-strong loyalty program. Treats NFTs as one channel among many for customer engagement. Not crypto-native; she Googles things during meetings.

### Verdict: **Doesn't buy in v1. Doesn't buy in v2.0 either, probably.** This is honest.

She does not buy because Provenance is artist-first and she is not an artist. The architecture is explicit (`MARKET_CONTEXT.md` §1.3) that brand-utility marketers are not the target. **This persona exists in this document to confirm that decision.**

### Why she doesn't buy

1. **She doesn't understand Initia.** Polygon, Solana, Base — she knows. Initia she does not. Her CMO would not approve a £30k campaign on a chain she has to explain to him.
2. **No fiat on-ramp.** Her customers are middle-class British women. They do not have wallets. They do not want wallets. Stripe-to-NFT must be invisible.
3. **No customer support contact.** She runs a £80M brand. If something goes wrong, she needs a human in a UK timezone she can call. Provenance is "one VM in Hetzner" with Discord. No.
4. **No SLA, no compliance docs.** Her legal team needs SOC 2, GDPR DPA, and a written SLA. Provenance has none.
5. **She doesn't need royalty enforcement at all.** Her NFTs are loyalty cards; she gives them away. Royalty enforcement is irrelevant to her use case.

### What would change her mind

Almost nothing in v1.5 or v2.0. Provenance would have to add: enterprise tier with SOC 2, dedicated account manager, white-glove onboarding, fiat on-ramp invisible to end customers, brand-customisable storefronts, off-chain customer support. **Building that splits the team's focus and changes the product.** It's a different company.

### Hannah's WTP if Provenance pivoted to brand-utility (informational only, NOT recommended pivot)

| Enhancement | Hannah's WTP/year | Why |
|---|---|---|
| Brand storefront (white-label) | £15,000 setup + £400/mo | One-off campaign cost |
| Dedicated account manager | £6,000/yr | She expects this |
| SOC 2 + GDPR DPA | She pays nothing extra; it's table stakes | Without these she cannot use the platform |
| Fiat on-ramp invisible to customers | She pays the on-ramp fees gladly | Customer expectation |
| Custom Move modules for her specific loyalty rules | £20,000 one-off | Bespoke development |
| **Plausible annual contract** | **£40,000** | The Polygon agency she used in 2022 |

**That's a £40k/yr contract per brand. Five brands = £200k/yr.** That's larger than the artist-tier revenue at any plausible scale.

**Why I am putting this in this document despite saying it's not the target:** the team should know that Hannah exists, that Hannah pays well, that pivoting to Hannah is *technically possible*, and that the team has *deliberately* chosen Lina over Hannah. That choice should be made consciously, not by accident. If in 6 months Lina-tier revenue is £200/mo and Hannah-tier interest is £40k/yr, the team has a real decision to make.

### What Hannah currently spends

- **Polygon studio agency for 2022 NFT campaign:** £45,000 (one-off)
- **Email marketing platform (Klaviyo):** £400/mo
- **Loyalty program software (Yotpo):** £300/mo
- **Brand storefront on Shopify Plus:** £2,000/mo
- **Total comparable monthly digital-engagement spend:** £2,700/mo

Provenance brand-tier could capture ~£3,000-4,000/mo per brand if positioned at it. **The team is choosing not to pursue this. Be sure that's still the right choice in 6 months.**

---

## CUSTOMER 5 — Daniel, ex-NFT trader / hobbyist, 28, Lisbon

**Background:** Made ~£40k flipping NFTs in 2021–2022. Lost most of it in 2022–2023. Currently does freelance smart-contract dev work, ~£3,500/mo. Hobbyist collector — buys 1-2 pieces a month, £50-150 range. Crypto-native, technically literate, sceptical of everything.

### Verdict: **Buys as a buyer for fun. Doesn't pay subscription. Vocal critic if anything's wrong.**

He buys casually because Provenance is interesting to him as a Move-on-rollup experiment, not because he has a serious financial stake. He is **the most dangerous customer** because he will tweet about every issue he finds.

### Why he buys (a little)

1. **He likes Move.** He has been wanting an excuse to write Move dApps. Provenance is a real one.
2. **He likes rollups.** OPinit + Celestia DA is a stack he wants to see in production.
3. **He likes the price.** £50-150 pieces are hobbyist-tier; the 0.5% fee is fine.
4. **He likes the architecture honesty.** He's read the architecture documents. The "single-VM" disclosure is the kind of thing that makes him willing to give the team benefit of the doubt.

### Why he is dangerous

1. **He will find every UX bug.** He runs Linux, Brave, with privacy extensions. Most wallet integrations break in his setup. He'll tweet a screenshot.
2. **He will read the Move package.** If he finds a vuln, he'll either responsibly disclose (good outcome) or tweet about it (bad). Provenance needs a published bug bounty program before launch — even a small one (£100 per low-sev, £500 per medium).
3. **He will benchmark gas costs.** If `place_bid` costs more than what he'd estimate, he'll write a blog post.
4. **He will compare honestly to ERC721-C.** He'll write the comparison article whether the team likes it or not. Better to ship with the comparison already in `MARKET_CONTEXT.md` so the team can point him at it.

### Daniel's WTP per enhancement

| Enhancement | Daniel's WTP/month | Why |
|---|---|---|
| Public RPC | £0 | Must be free (this is Web3 norm) |
| Open-source Move package | £0 | Must be MIT (this is Web3 norm) |
| Bug bounty program | He pays nothing; he EXPECTS to be paid by Provenance | He's the one finding bugs |
| Public dashboards (chain stats, indexer health) | £0 | Must be free |
| API access for indexer GraphQL | £0 | Must be free at hobbyist tier |
| API rate-limit upgrade for production use | £20/mo | He'd pay for higher rate limits if he built a frontend |
| **Plausible monthly subscription** | **£0** | He's not the paying customer; he's the noise |

**He pays £0. He's not in the revenue model.** But he is in the *risk* model — the team must:

- Publish a bug bounty (£100 low / £500 medium / £2000 high / £5000 critical) before mainnet
- Pre-empt his ERC721-C comparison post by publishing it themselves
- Have a public Discord with team responsiveness (NOT just the build lead's DMs)
- Publish gas benchmarks proactively

### What Daniel currently spends

- **Subscriptions to dev tools (Tenderly, Etherscan API, etc.):** £45/mo
- **Hobbyist NFT purchases:** £100/mo average
- **Crypto cold storage hardware (amortised):** £8/mo
- **Total: £153/mo**

Provenance gets £0/mo from Daniel directly but gets either +£500/mo of brand value (if he tweets positively) or -£2,000/mo of brand damage (if he tweets a vulnerability without prior responsible disclosure). **Managing Daniel is an operational concern, not a revenue concern.**

---

## REVENUE MODEL — what these five customers say collectively

The five customers map to four revenue lanes. The architecture currently designs only one of them.

| Lane | Customer | Pricing | At plausible scale (year 1) | At plausible scale (year 3) |
|---|---|---|---|---|
| **Protocol fee** (current) | All transacting users | 0.5% on secondary | £200/mo at 50 active artists | £3,000/mo at 5,000 active users |
| **Artist subscription** (NEW, suggested) | Lina, Marcus | £15-300/mo tiers | £450/mo at 30 artists @ £15 avg | £15,000/mo at 100 artists @ Lina-tier + 20 @ Marcus-tier |
| **Collector subscription** (NEW, suggested) | Carla | £18/mo | £180/mo at 10 collectors | £3,600/mo at 200 collectors |
| **Brand enterprise** (NOT current target, but available) | Hannah | £40k/yr | £0 (not pursued) | £200k/yr at 5 brands (if pivoted) |

**Year-1 plausible revenue with current architecture: £200/mo.** That's £2,400/yr. That does not pay one engineer.

**Year-1 plausible revenue with artist + collector subscriptions added: £830/mo.** That's £10,000/yr. Still does not pay one engineer, but pays for chain ops with margin.

**Year-3 plausible revenue with all three artist-side lanes: ~£21,600/mo = £260,000/yr.** That funds a 2-3 person team.

**The architecture's current pricing is structurally undersized for the team's survival.** This is the most important honest observation in this document. The team should add subscription tiers in v1.1, not v2.0.

---

## ENHANCEMENT PRIORITY MATRIX — what to build, in what order, at what cost

A consolidated view across all five customers. Each row is one enhancement; columns show: total WTP across customers, build cost, and verdict.

| Enhancement | Lina WTP | Marcus WTP | Carla WTP | Hannah WTP | Daniel WTP | Total monthly WTP (where it materialises) | Build cost (engineer hours) | Verdict |
|---|---|---|---|---|---|---|---|---|
| Reserve price on auctions | £0 (must-have) | £0 (must-have) | n/a | n/a | n/a | unblocks £45/mo Lina sub | 1h Move + 0.5h UI | **Ship in v1 Phase 2** |
| Wallet recovery via .init re-point | £25 | £100 | n/a | n/a | n/a | £125/mo direct | 8h Move + 4h UI | **Ship in v1.1 (week 1 post)** |
| Email notifications | £5 | n/a | n/a | n/a | n/a | £5/mo direct | 6h backend + Postmark setup | **Ship in v1.1** |
| Verification badge | £15 one-off | n/a | n/a | n/a | n/a | £15 one-off × N artists | 4h | **Ship in v1.1** |
| Royalty splits as `Object<RoyaltyStream>` | £10 | £50 | n/a | n/a | n/a | £60/mo direct + unlocks v2.0 | 4h Move design in v1 + 12h v1.1 UX | **Design in v1, UX in v1.1** |
| Print-rights NFTs | £25 | £75 | n/a | n/a | n/a | £100/mo direct + new TAM | 16h Move + 8h fulfilment integration | v2.0 |
| Custom collection page (white-label) | £50 | n/a | n/a | (her use case) | n/a | £50/mo per artist | 12h | v1.1 |
| Audit logs + tax export | £20 | £40 | n/a | n/a | n/a | £60/mo direct | 8h | v1.1 |
| On-chain generative script storage | n/a | £150 | n/a | n/a | n/a | £150/mo per Marcus-tier | 20h Move + DA integration | v2.0 (high-value, single customer until proven) |
| Curator network access | n/a | £200 | n/a | n/a | n/a | £200/mo per Marcus-tier | n/a — partnership, not engineering | v2.0 (BD work, not eng work) |
| Plotter print fulfilment | n/a | £75 | n/a | n/a | n/a | £75/mo per Marcus-tier | partnership with print partner | v2.0 |
| Fiat on-ramp (Stripe → INIT) | n/a | n/a | she pays Stripe fees gladly | required for her use case | n/a | unblocks Carla + Hannah lanes | 24h + Stripe + compliance | **v1.1 — biggest single buyer-side unlock** |
| Mobile native app | n/a | n/a | (must-have for her engagement) | n/a | n/a | unblocks 60% of Carla's engagement | 80h iOS + 80h Android (or 60h React Native) | v2.0 |
| Auto-sign at place_bid scope | (already in v1) | (already in v1) | £0 (delight) | n/a | n/a | drives engagement | already shipped | ✅ v1 |
| Bridge in buy flow | (already in v1) | (already in v1) | £0 (delight) | n/a | n/a | drives engagement | already shipped | ✅ v1 |
| Discovery / trending tab | n/a | n/a | £0 (must-have) | n/a | n/a | drives Carla engagement 10× | 16h | v1.1 |
| Push notifications | n/a | n/a | £3/mo | n/a | n/a | £3/mo direct + engagement | 12h FCM/APNs | v1.1 (with mobile app) |
| First-look access tier (collector subscription) | n/a | n/a | £15/mo | n/a | n/a | £15/mo per collector × N | 8h | v1.1 |
| Bug bounty program (operational) | n/a | n/a | n/a | n/a | (he expects payouts) | -£500-2000/mo expected payout | 2h to set up + budget | **Ship before mainnet** |
| Public dashboards | n/a | n/a | n/a | n/a | £0 (must-have) | brand value | 8h Grafana | v1.1 |
| Enterprise tier (SOC 2, AM, SLA) | n/a | n/a | n/a | £40k/yr | n/a | £40k/yr per brand | 200h+ + ongoing compliance | v2.0+ if pivoted (NOT currently planned) |

### Total v1.1 backlog cost and revenue (4 weeks post-hackathon)

**Build cost in engineer-hours (one engineer at £80/hr equivalent):** ~120 hours = ~£9,600 in opportunity cost / 3 weeks of full-time work.

**Revenue unlock (run-rate at end of v1.1):**
- Artist subs: £45/mo × 20 plausible artists = £900/mo
- Collector subs: £18/mo × 30 plausible collectors = £540/mo
- Protocol fee delta from increased volume: ~£200/mo
- **Total v1.1 monthly run-rate: ~£1,640/mo**

**Payback period: £9,600 ÷ £1,640/mo = 5.9 months.** That is the bar. v1.1 features that don't fit inside that payback need to be deferred to v2.0.

### What's NOT on this matrix and why

- **Token launch.** Not on this matrix because Provenance is deliberately not a token-incentivised marketplace. Adding a token would attract Daniel-tier traders (good for volume, bad for artist culture) and would make Lina nervous (her audience is not crypto-native).
- **Cross-marketplace aggregation.** Not on matrix because Provenance is the only marketplace on the rollup. There is no aggregation play.
- **Lending / NFT-fi.** Not on matrix because the customer doesn't ask for it (Lina, Carla, Marcus all explicitly don't want it; Daniel might use it but doesn't pay). It would attract Daniel-tier customers and dilute brand.

---

## OPERATIONAL COST OF MANAGING THESE CUSTOMERS

Currently the architecture documents are silent on customer-management cost. Each customer type costs the team something to manage. Honest accounting:

| Customer type | Touch cost per customer per month | At year 1 scale | At year 3 scale |
|---|---|---|---|
| Lina-tier artist | ~30 min/mo (occasional support, feature requests) | 30 artists × 30min = 15h/mo = £1,200/mo | 200 × 30min = 100h/mo = £8,000/mo (needs hire) |
| Marcus-tier artist | ~2h/mo (high-touch, technical) | 0 customers (not yet served) | 20 × 2h = 40h/mo = £3,200/mo |
| Carla-tier collector | ~5 min/mo | 30 × 5min = 2.5h/mo = £200/mo | 500 × 5min = 42h/mo = £3,360/mo |
| Hannah-tier brand | ~8h/mo (account management) | 0 (not served) | 5 × 8h = 40h/mo (dedicated AM, £4,000/mo) |
| Daniel-tier hobbyist/critic | ~0.5h/mo (Discord, but high spike on incidents) | 50 × 0.5h = 25h/mo = £2,000/mo | 500 × 0.5h = 250h/mo (needs Discord moderator hire) |

**Year-1 customer-touch cost: ~£3,400/mo** of build-lead time at internal cost. **Plus £674/mo infrastructure.** **Plus chain operating cost (gas, bridges, etc.).** Total run-rate cost year 1: ~£5,000/mo.

**Year-1 plausible revenue: £830/mo (with subscriptions).** Year-1 net: -£4,200/mo. That's the team's runway burn.

Year 3 with the proposed subscription tiers and at the modeled scale, revenue is ~£21,600/mo, costs are ~£20,000/mo (infrastructure + 2 hires). **Year 3 plausible margin: ~£1,600/mo.** Slim.

**The conclusion is uncomfortable but honest:** Provenance as a standalone artist-marketplace business is *not* a strong standalone business at the current pricing. It works as part of an ecosystem play (Initia ecosystem grant, sponsor's £40k cheque) for years 1-2, and only gets to profitability if the artist-tier subscription captures real artist demand at the £45/mo level.

If at month 6 the subscription tier has fewer than 20 paying artists, the team has a real choice: pivot to Hannah-tier (different product, much bigger revenue), or accept that this is a passion project funded externally rather than a business.

**This is the kind of honesty the architecture documents stopped short of.** It's in this document because the user asked for brutal.

---

## THE FINAL NUMBER — what would I actually pay if I were each customer, and would I pay it?

| Customer | Subscription tier | Monthly £ | Would actually pay? | Confidence |
|---|---|---|---|---|
| Lina (artist, mid-tier) | Pro Artist | £45/mo | **Yes** | 70% (conditional on wallet recovery + reserve prices) |
| Marcus (artist, generative) | Studio | £300/mo | **Yes if v2.0 ships** | 30% (sceptical, brand-driven) |
| Carla (collector, active) | Plus | £18/mo | **Yes** | 85% (high willingness once mobile ships) |
| Hannah (brand) | Enterprise | £3,000-4,000/mo | **No** (outside Provenance's scope by design) | n/a |
| Daniel (hobbyist) | Free | £0/mo | **No subscription, possible bug-bounty payout** | n/a |

**Plausible paying customers at end of year 1: 15-25 Lina-tier + 20-50 Carla-tier + 0-2 Marcus-tier (likely 0 in y1).** Run-rate revenue at end of year 1: £1,000-2,200/mo. That covers infrastructure (£674/mo) with a small surplus, but does NOT cover engineering time at any market rate. The team is funded by sponsor / grant / passion through year 1.

**This is the truth, and the architecture should not pretend otherwise.** The team ships the hackathon submission, sleeps, then in week 2 post-submission writes the v1.1 plan with these subscription tiers and a clear-eyed runway calculation. Then they decide: keep building, pivot to Hannah-tier, or shut down honestly.

Do not skip step 1 (ship the hackathon submission). The submission is the trailhead. The above analysis is what happens *after*, not *instead of*.

Build now. Submit before 26 April 01:00 UTC. Sleep. Then read this document again on Monday and decide.
