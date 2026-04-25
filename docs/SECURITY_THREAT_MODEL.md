# SECURITY_THREAT_MODEL.md — Provenance

**Doc version:** 1.0
**Posture:** testnet, no real money. Threat model is written for v1.1 (mainnet candidate) so that promotion requires no architecture change, only audit + key-management upgrade.

---

## 1. STRIDE per major component

### 1.1 Frontend (Next.js / Vercel)

| Threat | Vector | Mitigation |
|---|---|---|
| **Spoofing** | Phishing site hosted at `provenance-app.com` (typo) tricking users into connecting | Out of architectural scope; we register defensive domains and rely on user verification of URL. v1.1: ENS-style content-addressed domain. |
| **Tampering** | XSS injecting a malicious `requestTxBlock` call | Strict CSP (`script-src 'self' 'sha256-...'`); no `dangerouslySetInnerHTML`; user input on chain side is bounded by Move's BCS validation; the wallet's signing UI is the user's last line of defence (signing party showing the actual function call). |
| **Repudiation** | User claims "I never signed that bid" | All txs are on-chain with the user's signature. Chain is the proof. |
| **Information disclosure** | Backend leaking R2 keys, etc. | No secrets in client bundle; presign endpoint runs in a Worker with secrets in Cloudflare's secret store; audit log of every presign request. |
| **Denial of service** | Floods to the Vercel app | Vercel's edge throttling + Cloudflare proxy. Static-rendered pages are served from edge cache. |
| **Elevation of privilege** | Frontend cannot grant itself anything; the chain is the authority. | N/A by architecture. |

### 1.2 Provenance Rollup (MiniMove modules)

| Threat | Vector | Mitigation |
|---|---|---|
| **Spoofing** | Non-artist tries to mint into someone else's collection | `assert!(signer::address_of(creator) == collection.artist_addr, E_NOT_COLLECTION_OWNER)` |
| **Tampering** | Bug in `royalty::settle` skips the artist payment | Move test suite includes invariants; PROTOCOL_TREASURY balance + artist balance + seller balance change MUST sum to gross — asserted in the function itself before transferring. |
| **Tampering #2** | Reentrancy through `Coin<INIT>` deposit | Move's resource model + lack of fallback functions = no reentrancy in the EVM sense. Coin operations are direct moves, not callbacks. |
| **Repudiation** | A signer claims they did not place a bid | Tx hash + signed payload on-chain. |
| **Information disclosure** | All on-chain data is public by default | Acceptable: the marketplace is a public market. No PII on chain. |
| **Denial of service** | Spam mints, spam listings, spam offers, spam bids | Each tx pays gas in INIT (`umin` denom on rollup; `0.15 umin` min gas price); spam is paid by the spammer. Per-collection rate limit (≤ 1 mint / 5 sec / artist) enforced at module level via a lightweight counter. Global mint pause via admin (multisig) for runaway abuse. |
| **DoS via gas exhaustion** | Long for-loops in module logic on attacker-controlled input | Module carefully bounded: bids store one current_bid at a time (no list), offers are individual objects (no list iteration), all module-level loops are over fixed-size structures. |
| **Elevation of privilege** | Attacker becomes the artist of someone else's collection | Impossible: `artist_addr` set at creation, immutable. |
| **Royalty circumvention** | The headline attack | Defended at Move type-system level. See ARCHITECTURE §3.1 and DATA_MODEL §1.2. |

### 1.3 Sequencer (single, on Hetzner)

| Threat | Vector | Mitigation |
|---|---|---|
| **Spoofing** | Imposter sequencer binds to chain ID | OPHost on L1 only accepts output roots signed by the registered executor address; an imposter cannot publish state. |
| **Tampering with tx ordering** | Sequencer reorders txs to favour a colluding bidder | **Documented honest weakness.** The single sequencer can theoretically front-run bids. Mitigations: (a) anti-snipe extension (an extension on every late bid means front-running the last bid still triggers extension); (b) public commitment to "no priority bidding" — any deviation is provable from public chain data and costs us reputational capital; (c) post-hackathon, decentralised sequencing (when OPinit supports it) is the right answer. **For hackathon: accepted.** |
| **Repudiation** | Sequencer claims it didn't censor a tx | Mempool history is not on-chain; censorship is detectable via L1-side tx (force-include via OPHost) and the submitter has recourse. We don't ship a force-include UI in v1; documented gap. |
| **Information disclosure** | Mempool peeking by sequencer | Same pattern as every L2; documented. |
| **Denial of service** | Sequencer process killed | systemd restart; if box dies, demo is dead — pre-record. |
| **Elevation of privilege** | Sequencer key compromise | The sequencer key signs blocks but does NOT control bridges or modules; an attacker can stop the chain or attempt malicious blocks but the OPinit Challenger validates output roots posted to L1. See §3 below. |

### 1.4 Executor bot

| Threat | Vector | Mitigation |
|---|---|---|
| **Spoofing** | Imposter executor submits output roots | Address is registered with OPHost at rollup creation; only signed messages from that address are accepted. |
| **Tampering with output roots** | Executor publishes a state root that doesn't match actual rollup state | Challenger bot (which we also run) recomputes and disputes. The OPinit dispute mechanism slashes the malicious party. |
| **Tampering with bridge messages** | Executor steals deposits in flight | The L1 → L2 deposit is recorded in OPHost; the rollup's OPChild module accepts only matching deposit messages from the executor address. An executor that steals would publish an invalid output root, caught by Challenger. |
| **Repudiation** | Executor claims it didn't see a deposit | Deposits are recorded on L1; executor SLA is "process within X blocks." Failure is detectable. |
| **Information disclosure** | Executor key stolen | The executor key has limited blast radius (can submit invalid output roots, which Challenger catches and slashes; cannot drain user funds because withdrawal pre-images are committed). Rotation procedure documented in DEPLOYMENT_TOPOLOGY. |
| **Denial of service** | Executor goes down | Output roots stop arriving on L1; deposits to the rollup stall; the rollup itself keeps producing blocks. systemd restart; alert on lag > 5 batches. |
| **Elevation of privilege** | Executor cannot grant itself any permission outside its registered scope. | N/A. |

### 1.5 Challenger bot

| Threat | Vector | Mitigation |
|---|---|---|
| **Same operator runs both Executor and Challenger** | If we are malicious or compromised, our executor lies and our challenger doesn't object | This is the canonical OPinit single-team risk. Our mitigation is to publish the challenger output to a public log (Better Stack), making external monitoring possible. The honest-team assumption is documented for users. v1.1+: invite a third-party challenger. |
| **Challenger goes down** | Invalid output root passes unchallenged | Challenger has its own systemd; alert on missing heartbeat > 10m. The dispute window is the user's recourse — if our challenger missed, anyone running an L2 node could still raise a dispute. |
| **Challenger key compromise** | Attacker spam-disputes valid roots | Spam disputes cost the challenger collateral (per OPinit's design); economic disincentive. We rotate challenger key and document the procedure. |

### 1.6 IBC relayer

| Threat | Vector | Mitigation |
|---|---|---|
| **Relayer goes down** | IBC packets stall | Standard Cosmos behaviour; packets queue, get relayed when relayer comes back. systemd. |
| **Relayer key compromise** | Per OPinit's design, the relayer is permissioned per channel; an attacker cannot relay arbitrary packets, only to the channel set the relayer is authorized for. | Acceptable. |

### 1.7 Indexer (Ponder + Postgres)

| Threat | Vector | Mitigation |
|---|---|---|
| **Spoofing** | Attacker poses as the chain WS endpoint | TLS to the rollup's WS; pinned cert in production-bound deploy. |
| **Tampering** | Attacker mutates Postgres directly | DB connection string is server-side only; Neon enforces TLS; no public DB endpoint. |
| **Repudiation** | Indexer state diverges from chain | Re-sync from genesis is supported; chain is authoritative. Cost: ~30 min for a re-sync at hackathon scale. |
| **Information disclosure** | All indexed data is already public on-chain | Acceptable. |
| **DoS** | GraphQL endpoint flooded | Cloudflare in front of Railway; per-IP rate limit; query complexity limits in Ponder config. |
| **Elevation of privilege** | The indexer cannot write to the chain. | N/A. |

### 1.8 Image pipeline (Cloudflare Worker + R2)

| Threat | Vector | Mitigation |
|---|---|---|
| **Tampering** | Bytes in R2 don't match the on-chain `content_hash` | The finalize step recomputes sha256; mismatch rejects the upload. Anyone can verify post-hoc. |
| **Spoofing** | Attacker uploads bytes claiming to be artist X's artwork | `presign` requires a wallet signature from the address that owns the collection. |
| **Information disclosure** | Bytes are public (intentionally — art for sale). | Not a leak; expected. |
| **DoS** | Flooding presigns | Per-address rate limit (10/hour); per-IP rate limit; 25MB file cap. |
| **Censorship by Cloudflare** | R2 takes down content | The content_hash on chain enables anyone to rehost. Acknowledged in customer-buyer review. |

---

## 2. Attacker personas

### 2.1 Script kiddie

Scriptable bot, no funded wallet, motivated by lulz.

**What they can plausibly attempt:**
- Brute-force submit-button spam (bounded by gas they don't have).
- XSS attempts via title fields. → Bounded by Move String length validation + frontend sanitisation.
- DOM tampering to fake a sale → Doesn't matter; chain is authority.

**What they can do successfully:** essentially nothing. The economic and structural defences hold.

### 2.2 Financially-motivated attacker

Funded wallet, wants to extract value.

**What they can plausibly attempt:**
- **Front-run a hot auction.** See §3.
- **Wash-trade to inflate prices and dump on a real buyer.** Possible. The protocol fee + royalty cost makes it expensive (8.5% round-trip on a wash-trade); doesn't make it impossible. We don't currently detect; v1.1 we add a heuristic.
- **Exploit a Move bug.** Mitigated by tests; a hackathon submission is not audited. **This is the highest-impact unmitigated risk.** The mitigation for v1 (testnet) is "no real money." For v1.1 (mainnet), a Move audit is required before launch. Hard gate.
- **Drain executor / sequencer keys.** See §4.

### 2.3 Nation-state / sophisticated attacker

Has zero-day capability, dedicated infrastructure, willing to spend.

**What they can plausibly attempt:**
- **Compromise our Hetzner box.** Plausible. Mitigations: SSH key only, fail2ban, ufw, systemd hardening, all standard. Ultimately a hackathon deployment is not nation-state hardened; we accept this for v1.
- **DNS hijack of `provenance.app`.** Mitigated by registrar 2FA, Cloudflare auth.
- **Compromise of upstream infra (Vercel, Railway, Neon)** — out of our control.

The honest framing: a nation-state-grade attacker can take Provenance offline. They cannot retroactively change settled royalties on chain.

### 2.4 Malicious insider

We are a single team. The insider risk is a member of the team. For hackathon: solo / small team; insider = the builder. The mitigation is procedural (multisig on treasury, rotate keys, document everything in this repo).

For v1.1: 2-of-3 multisig on the treasury; the executor and challenger run on separate hosts under separate keys; admin functions on Move modules (e.g. global pause) require multisig.

---

## 3. Sybil resistance

**Where sybil matters in Provenance:**
- "First bid in" if we did a free-bid mechanism — we don't.
- "Allowlist for a drop" if artists configure allowlists — v1 doesn't ship this; v1.1 it does, and that's where sybil matters.
- "VIP rewards" if we participate — we don't yet.

**Where sybil doesn't matter:**
- Bidding (every bid escrows real INIT).
- Buying (every buy moves real INIT).
- Minting (every mint costs gas).

**For v1, our sybil resistance is "cost of capital":** doing anything in the marketplace requires INIT, which has a real cost. This is sufficient.

For allowlists in v1.1, we'll add `.init` username staking (artist publishes an allowlist of usernames; the username system has registration cost and a cooldown which already provides some sybil resistance).

---

## 4. Key compromise — what happens to whom

### 4.1 User's wallet key compromised (the worst case for the user)

- All NFTs in the wallet can be `gift`ed away by the attacker.
- All INIT can be stolen.
- All listings can be cancelled.
- This is identical to wallet compromise on any chain. We do not architect for "stolen keys are recoverable."

### 4.2 User's auto-sign session key compromised

- The attacker can call `provenance::auction::place_bid` only.
- Bounded by per-tx send cap (default 20 INIT).
- Bounded by expiry (default 1h).
- Worst case in 1h: attacker bids on auctions of their choosing, max 20 INIT/tx, however many they can fit. The user can revoke instantly when noticed.
- The attacker cannot transfer NFTs, cannot withdraw INIT, cannot change collection settings.
- This is **structurally safer** than handing the user's main key to a marketplace.

### 4.3 Sequencer key compromised

- Attacker can produce blocks, including malicious blocks.
- Challenger detects invalid state transitions in the corresponding output roots and disputes them on L1; OPinit slashes the malicious operator's deposit.
- Funds in flight: the sequencer alone cannot mint INIT or steal NFTs because module logic enforces state transitions. The worst the sequencer can do is reorder/censor.
- Recovery: rotate the key, restart with a new node identity. Documented in DEPLOYMENT_TOPOLOGY.

### 4.4 Executor key compromised

- Attacker can submit invalid output roots.
- Challenger disputes; OPinit slashes.
- Attacker cannot drain user funds because the OPHost-OPChild bridge invariants prevent it (deposits are recorded on L1; finalised withdrawals require valid output proofs).
- Recovery: rotate executor key via OPHost admin tx (requires the rollup admin key, which is our multisig in v1.1).

### 4.5 Challenger key compromised

- Attacker can submit spurious disputes.
- OPinit slashes the spammer's collateral; economic disincentive.
- The chain itself is unaffected; the executor continues to operate.
- Recovery: rotate.

---

## 5. MEV / ordering

### 5.1 Auctions

**Threat:** sequencer or networked attacker observes a high-value bid in mempool and submits their own bid first to fractionally outbid.

**Mitigations:**
1. **Anti-snipe extension.** Every bid in the last `extension_secs` window extends `ends_at` by `extension_secs`. The attacker cannot snipe the last second; their bid extends the auction and the original bidder responds.
2. **Min increment.** Each bid must exceed the previous by `min_increment_bps` (e.g. 2%). This makes "bid +1 wei" attacks impossible — the attacker has to commit to a real increment.
3. **Single sequencer FCFS.** With one sequencer, ordering is first-arrival. An attacker would need to sit closer to the sequencer than the user. Plausible but not free.

**Honest weakness:** if we are the sequencer and we collude with a bidder, we can place their tx before another's. We commit publicly to FCFS. Verifiable post-hoc by the propagation timestamps in our own logs (we publish them). v1.1 with decentralised sequencing closes this completely.

### 5.2 Buy-now / fixed-price

**Threat:** sandwich attack on a low-supply listing — attacker observes a buy and front-runs to capture the listing.

**Mitigation:** buy_now is permissionless first-come-first-serve on the chain. There's no oracle to manipulate. The "sandwich" has no second slice — once bought, the listing is closed. So there is no MEV here in the AMM-trading sense.

### 5.3 Offers

Offers are passive; they sit until accepted. No MEV.

### 5.4 Trades on the rollup are not in an MEV-rich category

Unlike DeFi (where slippage, sandwich, JIT liquidity all matter), an art marketplace's MEV surface is limited to auction front-running. We've addressed it. We don't run an AMM, don't have lending, don't have liquidations.

---

## 6. Sequencer liveness

### 6.1 What happens when sequencer dies

- Frontend reads (RESTClient): 502 errors → fallback to indexer-cached reads with a "stale data" banner.
- Frontend writes: rejected at the wagmi/InterwovenKit layer. The "Bid" button shows "Provenance is reconnecting."
- Indexer: WebSocket disconnects; reconnect loop with exponential backoff.
- OPinit Executor: continues to operate against the most recent block; will catch up on resume.
- Auctions ending in this window: cannot be `finalize`d; blocked. We surface "settling" state.
- After resume: chain produces blocks normally. Indexer catches up. `finalize_auction` calls fire. No data lost.

### 6.2 Recovery path

systemd `Restart=always` is the first line. If the box itself fails:

1. Spin up a fresh CX22 (≤ 5 min).
2. Restore data dir from latest snapshot (Hetzner snapshots, free, daily; we set up snapshots in DEPLOYMENT_TOPOLOGY).
3. Re-deploy the sequencer binary; resume from snapshot.

For the hackathon demo, we pre-record the demo video as a contingency.

### 6.3 What is NOT survivable

- Loss of the data directory without snapshot: the chain history is gone. Bridge-anchored balances on L1 are recoverable, but rollup-native state isn't. This is why daily snapshots + offsite copy are mandatory.
- Loss of executor key without rotation procedure — covered above.

---

## 7. Dispute handling (OPinit)

### 7.1 When does the challenger fire?

The challenger replays output roots posted by the executor. If the recomputed root differs, it fires `MsgChallengeOutput` to OPHost on Initia L1.

### 7.2 Who runs the challenger?

We do, separately from the executor. Different host (Hetzner CX22 #2), different key, different systemd. The challenger does not depend on the executor — it derives state from the rollup's blocks directly.

### 7.3 Dispute period

- L1-side dispute window: per OPinit's configuration. Weave default at hackathon ~7 days for production rollups; shorter for testnet (we'll record the actual value at deploy time).
- During the window: withdrawals from L2 to L1 are not finalized.

### 7.4 If a dispute is raised legitimately

- OPHost arbitrates: it asks Initia L1 validators to run the disputed block and decide.
- Slashing applies to the loser of the dispute (executor or challenger).
- The chain pauses at the disputed point until resolution.

---

## 8. Bridge attack surface

### 8.1 Funds in flight (Skip Go)

Skip Go's routes traverse multiple chains; funds can be momentarily on intermediate chains. We don't custody funds; we delegate to Skip Go.

**Risk to the user:** mid-route stuck (bridge failure on one leg). Mitigation: Skip Go's recovery dashboard; we link to it.

### 8.2 Executor compromise (deposit theft)

Covered §4.4.

### 8.3 Replay attacks

OPinit's bridge messages have nonces; replay impossible.

---

## 9. Customer-buyer review (auditor lens)

> *Reviewing as Tomas, an external auditor an enterprise customer might hire.*

**Tomas's findings:**

1. **The royalty-circumvention argument depends on the friend visibility being correct.** Validate at compile time (`move test`), validate at runtime (no path-not-via-settle moves money + artwork). We add an invariant test that constructs every public entry function in the package and asserts the relationship. **Acceptable if the test exists.**

2. **The single sequencer is a known availability risk.** Documented prominently. This is the same risk every Initia rollup carries today. **Acceptable for testnet; mainnet requires either decentralised sequencing or contractual SLAs.**

3. **The single-team executor + challenger is a known trust-minimisation gap.** Mitigated by public logs and the option of third-party challenger; for testnet, acceptable. **Mainnet requires a third-party challenger.**

4. **No formal Move audit before mainnet.** Enforced at the gating step ("no real money on testnet"). **Acceptable for hackathon; mainnet requires audit.**

5. **R2-only image storage is a centralised dependency.** Documented; v1.1 IPFS mirror. **Acceptable for testnet, marginal for mainnet at scale.**

6. **No formal incident-response plan beyond systemd restart and on-call alerts.** For hackathon, accepted; for production, runbook required (call escalation, comms, rollback). **Logged for v1.1.**

**Tomas's verdict:** "A customer's auditor would sign off the testnet posture. They would not sign off mainnet without items 3, 4, and 6 closed. The architecture's trajectory toward mainnet posture is plausible — none of the mitigations require re-architecting."

**Therefore:** Approve for hackathon submission.
