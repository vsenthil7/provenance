# INITIA_INTEGRATION.md — Provenance

**Doc version:** 1.0
**Audience:** judges scoring the Technical Execution & Initia Integration weight (30%).

This document is intentionally ruthless: every claim about Initia integration must be code-level specific. If a primitive isn't load-bearing, we say so and remove it.

---

## 0. The load-bearing test

> If we removed Initia and rebuilt this on Ethereum + IPFS + ENS + LayerZero, what would break?

| Initia primitive | What we'd lose by removing it | Verdict |
|---|---|---|
| **Own appchain (MiniMove)** | Move's resource model. Without it, `Artwork` is an ERC-721 with a permissionless `transferFrom` and royalties become a whitelist game. The product's headline differentiation evaporates. | **Load-bearing.** |
| **Auto-signing (authz)** | Auctions need wallet popups for every bid. Auction UX collapses to "watch the wallet." Moves the product from "feels like eBay" to "feels like blockchain." | **Load-bearing.** |
| **`.init` usernames** | Artist identity reverts to `init1xyz…` strings. Artist pages, collection cards, and the "lina.init" social signal all degrade to bech32. Discoverability and trust both drop. | **Significantly load-bearing**, though the product would technically run. |
| **Interwoven Bridge** | Buyers from other chains face manual bridging. Conversion rate on cross-chain traffic estimated to fall ~70% (industry benchmark for added bridging steps). | **Load-bearing for go-to-market**, less so for hackathon demo. |
| **OPinit Stack** | We'd be on a generic Cosmos chain or a roll-our-own L2. We'd lose the executor / challenger / IBC relayer infrastructure we get for free. | **Load-bearing for ops**, less so for product. |
| **VIP** | INIT-token-rewarded user activity disappears as a growth mechanism. | **Not currently used; deferred to post-hackathon.** |

Four of six primitives are structural. One is operational. One is deferred. We earn the 30% Initia-integration weight on substance.

---

## 1. InterwovenKit usage — exact integration

### 1.1 Provider setup (`apps/web/app/providers.tsx`)

```tsx
'use client';

import { InterwovenKitProvider, TESTNET } from '@initia/interwovenkit-react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/chain/wagmi';
import { provenanceChain } from '@/lib/chain/customChain';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 3, staleTime: 30_000 } },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <InterwovenKitProvider
          {...TESTNET}
          defaultChainId="provenance-1"
          customChain={provenanceChain}
        >
          {children}
        </InterwovenKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

`provenanceChain` is the registry-shaped object — `{ chainId, chainName, bech32Prefix, apis: { rpc, rest, indexer }, fees, ... }`. **The `indexer` URL is mandatory** even though we don't use it for our marketplace queries (we use Ponder); the kit itself queries it for portfolio views and the absence of it triggers "URL not found" errors. Pinned to v2.4.0+.

### 1.2 Hooks consumed and where

```tsx
// components/wallet/ConnectButton.tsx
'use client';
import { useInterwovenKit } from '@initia/interwovenkit-react';
import { useAccount, useDisconnect } from 'wagmi';

export function ConnectButton() {
  const { address: evmAddress } = useAccount();
  const { disconnect } = useDisconnect();
  const { initiaAddress, username, openConnect } = useInterwovenKit();

  if (!initiaAddress) {
    return <button onClick={openConnect}>Connect wallet</button>;
  }

  return (
    <div className="flex items-center gap-2">
      <span>{username ?? shortenAddress(initiaAddress)}</span>
      <button onClick={() => disconnect()}>Disconnect</button>
    </div>
  );
}
```

```tsx
// components/wallet/BridgeButton.tsx
'use client';
import { useInterwovenKit } from '@initia/interwovenkit-react';

export function BridgeButton({ amountUinit, onComplete }: Props) {
  const { openBridge } = useInterwovenKit();
  return (
    <button
      onClick={() =>
        openBridge({
          dstChainId: 'provenance-1',
          dstDenom: 'uinit',
          dstAmount: amountUinit.toString(),
          onComplete,
        })
      }
    >
      Top up to bid
    </button>
  );
}
```

```tsx
// components/wallet/AutoSignToggle.tsx
'use client';
import { useInterwovenKit } from '@initia/interwovenkit-react';

export function AutoSignToggle() {
  const { autoSign } = useInterwovenKit();
  const handleEnable = async () => {
    await autoSign.enable(); // uses defaultChainId = provenance-1
  };
  const handleDisable = async () => {
    await autoSign.disable();
  };
  if (autoSign.isLoading) return <Spinner />;
  return autoSign.isEnabled ? (
    <button onClick={handleDisable}>Stop signed bidding</button>
  ) : (
    <button onClick={handleEnable}>Enable signed bidding</button>
  );
}
```

```ts
// lib/chain/tx/bid.ts
import { bcs, MsgExecute } from '@initia/initia.js';

export async function buildPlaceBidTx({ sender, auctionAddr, amountUinit }: Args) {
  return new MsgExecute(
    sender,
    PROVENANCE_PACKAGE_BECH32,    // bech32 init1...; hex would error
    'auction',
    'place_bid',
    [],
    [
      bcs.address().serialize(auctionAddr).toBase64(),
      bcs.u64().serialize(amountUinit).toBase64(),
    ],
  );
}

// usage in BidPanel.tsx
const { requestTxBlock, initiaAddress } = useInterwovenKit();
const tx = await buildPlaceBidTx({ sender: initiaAddress, auctionAddr, amountUinit });
const result = await requestTxBlock({ messages: [tx] });
// if autosign was enabled and scope matches, no popup
// if not enabled, the wallet popup appears
```

### 1.3 The exact `useInterwovenKit()` return surface we depend on

| Property | Type | Used for |
|---|---|---|
| `initiaAddress` | `string \| undefined` | Sender on every tx; auth header on presign |
| `username` | `string \| undefined` | Header, profile, artwork pages — the `.init` username, primary or subdomain |
| `openConnect` | `() => void` | "Connect wallet" button (replaces deprecated `openModal`) |
| `openBridge` | `(opts) => void` | Cross-chain top-up flow |
| `requestTxBlock` | `(opts) => Promise<TxResult>` | Every write — auctions, mints, listings, etc. |
| `autoSign.enable` | `(chainId?) => Promise<void>` | Drawer to grant authz for `place_bid` |
| `autoSign.disable` | `(chainId?) => Promise<void>` | Revoke grant |
| `autoSign.isEnabled` | `boolean` | UI state on toggle |
| `autoSign.isLoading` | `boolean` | UI state during enable/disable |

We do not use `useUsernameClient` or any manual REST resolver — the kit already gives us the authoritative `username` and that's the contract.

---

## 2. Auto-signing — the bidder's session

### 2.1 What gets granted

A single `MsgGrant` of type `cosmos.authz.v1beta1.GenericAuthorization` with `msg = "/initia.move.v1.MsgExecute"`. The kit additionally enforces — at the wallet-popup level when broadcasting — that the inner `MsgExecute` matches:

- `sender == granter` (the user)
- `module_address == PROVENANCE_PACKAGE_BECH32`
- `module_name == "auction"`
- `function_name == "place_bid"`

This filtering happens because the kit's auto-sign drawer commits the user to a *specific* set of allowed message envelopes when they enable. A `buy_now` call does not match the envelope and the kit declines to auto-broadcast it (the wallet popup appears instead).

In addition we configure a `cosmos.bank.v1beta1.SendAuthorization` with a per-tx spend cap (default 20 INIT, user-adjustable in the drawer to 1, 5, 20, or 100). The cap matters: if the session key is compromised, the maximum loss per tx is bounded.

### 2.2 Expiration policy

| User-selectable expiry | Default |
|---|---|
| 1 hour | ✓ default |
| 4 hours | |
| 8 hours | |
| 24 hours | (max) |

After expiry, the next `place_bid` produces a wallet popup. The frontend displays a banner at 80% of TTL: *"Your signed-bidding session expires in N minutes. Extend?"* Tapping "Extend" calls `autoSign.disable()` then `autoSign.enable()` immediately for a fresh window.

### 2.3 Scope of permissions

**ONLY `provenance::auction::place_bid`.** Not `make_offer`, not `accept_offer`, not `buy_now`, not anything else. Every additional scope is an additional thing a stolen session key can do, so we keep it minimal until we have user evidence justifying expansion.

### 2.4 Revocation UX

- **In-product:** the `<AutoSignToggle />` in the header. One click, one chain tx, done. Toast confirms.
- **Out-of-product:** the user can revoke from the Initia Wallet's authz panel directly — this is the kit's job and we don't intercept it.
- **Automatic:** the grant has the user-selected expiry; the chain enforces it whether or not we revoke.

### 2.5 Fallback when expired

`requestTxBlock` returns the wallet popup. The user signs as normal. We do not silently re-grant. The 80%-of-TTL banner is the ONLY place we proactively prompt for re-grant.

### 2.6 Failure mode: session key compromised

Per SECURITY_THREAT_MODEL §4 — bounded by:
- `place_bid` only
- Per-tx send cap (default 20 INIT)
- Expiry window (default 1h)

Worst case for a 1h, 20 INIT-cap session: the attacker can place however many bids fit in an hour, each ≤ 20 INIT, on auctions of their choosing. The user can revoke instantly when they notice. The artwork sale process is fundamentally non-malicious-action — the worst the attacker does with bids alone is "buy art for the user."

---

## 3. `.init` usernames — where, when, and how

### 3.1 Where they appear

| Surface | Source | Behaviour on resolution failure |
|---|---|---|
| Header (logged-in user) | `useInterwovenKit().username` | falls back to `shortenAddress(initiaAddress)` |
| Artist page URL: `/artist/lina.init` | URL param resolves to addr via REST `/initia/usernames/v1/usernames/{name}` | 404 page if name doesn't exist |
| Artist page (canonical at `/artist/init1...`) | reverse-resolved via REST `/initia/usernames/v1/addresses/{addr}` (also cached in `usernames` table; 1-day TTL) | renders bare address with the page still functional |
| Artwork detail "by ___" line | resolved at indexer time (cached in `artworks.creator_addr` + `usernames.username`) | shows `init1...` if no username |
| Bid feed: "lina.init bid 12 INIT" | resolved at indexer time | shows `init1...` |
| Settlement notification: "0.5 INIT royalty paid to lina.init" | resolved at notification time | shows `init1...` |

### 3.2 Resolution rules

- **Forward (username → addr):** looked up via Initia L1 `initia.usernames.v1.QueryAddress`. Cached on the indexer side for 24h.
- **Reverse (addr → username):** the kit does this for the connected user. For *other* addresses (sellers, bidders, etc.) the indexer hits `initia.usernames.v1.QueryUsername` once per day per address.
- **Primary username only.** The kit returns the user's primary username; we don't try to surface subdomains in v1. If the user has multiple usernames, the primary wins.
- **No subdomains in v1.** The Initia username system supports `subname.username.init` patterns; we don't use them. v1.1 may issue `editionN.lina.init` as collection-scoped subdomains for collectors — out of scope for hackathon.

### 3.3 Fallback when resolution fails

Always to `init1xyz…aaaa` (truncated bech32). The product never breaks because a username is missing.

### 3.4 Critical pattern (re-stated for builders)

> When asked to integrate usernames, **always use the `username` property directly from `useInterwovenKit()`** for the connected user. Do not manually call REST or `getProfile` for the connected user. The hook is authoritative.

For *other* users (the bidder leaderboard, the artist page), we use the indexer's cached lookup, refreshed daily.

---

## 4. Interwoven Bridge — flows

### 4.1 Where the bridge fires

| Flow | Trigger | Target |
|---|---|---|
| **Top-up before bid** | User has 0 INIT or < bid amount on `provenance-1`, clicks "Top up to bid" | `openBridge({ dstChainId: 'provenance-1', dstDenom: 'uinit', dstAmount })` |
| **Top-up before buy** | Buy now button when balance insufficient | same as above with `dstAmount = price_uinit + buffer` |
| **Withdraw earnings** | Artist studio: "Cash out 12 INIT to USDC" | `openBridge({ srcChainId: 'provenance-1', srcDenom: 'uinit', srcAmount, dstChainId: 'osmosis-1', dstDenom: 'usdc.axl' })` (or whatever route) |
| **Anywhere "I don't have INIT here"** | Generic CTA in error states | bridge widget pre-filled |

### 4.2 Source-chain support matrix (driven by Skip Go)

The bridge widget supports any chain Skip Go currently routes from to Initia ecosystem. As of the hackathon submission window: Ethereum (mainnet/L2s via CCTP and LayerZero), Cosmos chains via IBC (Osmosis, Noble, etc.), and Initia L1 itself via OPinit's optimistic bridge. We don't maintain this list; we trust Skip Go and surface their UI.

### 4.3 Fallback on bridge failure

- **Skip Go API down:** `openBridge` errors at the kit level; we show "Bridge is offline. Send INIT manually to your address: `init1...`". Provides a copyable address and a link to the Initia Wallet's transfer flow.
- **Mid-route stuck:** the user sees Skip Go's "your funds are on chain X" UI. We show a wrapper with a link to Skip Go's recovery dashboard. We do NOT claim the funds are safe — we say where they are.
- **Bridge succeeds but the listing was bought in the interim:** `buy_now` reverts (via `E_LISTING_STALE` or `E_LISTING_INACTIVE`); INIT remains in the user's wallet on `provenance-1`; we show "this piece sold while your bridge was settling. Browse similar →"

### 4.4 Why the bridge pattern is "Web2 feel"

The user clicks one button, signs one transaction on their source chain, and sees their purchased artwork in their Provenance gallery. The 2–8 minute Skip Go route runs in the background with progress. They never explicitly type "I want to bridge X then swap to Y then buy"; the marketplace constructs the route. This is the closest a multi-chain product gets to a single "Buy now" button.

---

## 5. Move resources — Initia-specific patterns

### 5.1 What we use that is specific to MoveVM

- **`Object<T>` wrappers** for `Artwork`, `Collection`, `Listing`, `Auction`, `Offer`. Object addresses become URL-stable identifiers; ownership transitions are first-class.
- **`Coin<INIT>` direct manipulation** in escrow (auction `current_escrow`, offer `escrow`). No ERC-20 approve dance, no allowance layer; the resource lives in the contract until released.
- **Friend visibility** for the cross-module helper that performs the artwork-and-money atomic swap. Friend is set in `provenance::artwork` granting only `provenance::royalty` access. This is what makes the royalty-circumvention impossibility argument hold up at compile time.
- **Native event emission via `event::emit_event`** which surfaces on the chain's event stream and is consumed by the indexer with no contract-side gas penalty for fancy structuring.
- **Generic constructor pattern** matching the chain's `0x1::simple_nft` reference module — we crib the create-collection signature so existing Initia tooling (InitiaScan, the indexer at `api.initiation-1.initia.xyz/indexer/nft/v1/...`) recognises our collections without us shipping a custom adapter.

### 5.2 What we do NOT use, and why

- **MiniEVM patterns (ERC-4337 account abstraction):** N/A — we're on MiniMove.
- **MiniWasm native modules / actor messaging:** N/A.
- **L1-only modules (DEX, Enshrined Liquidity):** out of scope for v1. Settlements pay artists in INIT; conversion to USD/USDC is the artist's choice via the bridge.

---

## 6. OPinit Stack awareness

### 6.1 What we depend on from OPinit

| OPinit component | Our dependence | Trust model |
|---|---|---|
| **OPHost (on Initia L1)** | The bridge anchor for our rollup. Funds bridged from L1 → `provenance-1` arrive via OPHost → executor → OPChild (rollup) flow. | Trust Initia L1 honest-majority. Standard. |
| **OPChild (on `provenance-1`)** | Validates incoming bridge messages; emits withdrawal proofs for outbound. | Built-in to the rollup; we don't customise it. |
| **Executor bot (we run)** | Submits L2 → L1 output roots (state commitments); relays L1 → L2 deposits; submits batches to Celestia DA. | Trusted entity in the OPinit single-sequencer model; we are running it ourselves and the customer-buyer review accepts this. |
| **Challenger bot (we run)** | Validates output roots posted by the executor; raises a dispute if it sees an invalid one. | We run BOTH executor and challenger — meaning if our executor lies, our challenger must catch it. **This is the OPinit Stack's standard trust model for a single-team rollup.** Documented in `SECURITY_THREAT_MODEL.md`. |
| **IBC Relayer (we run)** | Relays IBC messages between Initia L1 and `provenance-1`: oracle prices (not currently used), and IBC token transfers (used by the bridge for some routes). | Standard Cosmos IBC trust. |

### 6.2 Dispute period and what it means for buyers

- **L2 → L1 withdrawals require finalisation.** OPinit's standard challenge period applies (typically 7 days on production rollups; we use the Weave default for hackathon — likely shorter, will be confirmed at launch).
- **L1 → L2 deposits are fast** — finalize in ~1-2 minutes via the executor bot.
- **For buyers, this means:** purchases on `provenance-1` settle instantly to the buyer's `provenance-1` address. If the buyer wants to *withdraw* their INIT to L1 they wait the dispute period. **Important:** buyers don't typically need to withdraw — they want the artwork, which lives on `provenance-1`. Withdrawal is for artists cashing out.

### 6.3 Fast deposits

We rely on OPinit's `initialize_deposit` → executor pickup → `finalize_token_deposit_v1` pattern. Buyers from L1 see funds on `provenance-1` within minutes. This is critical for the bridge UX of §4.

### 6.4 Single-sequencer trust model (acknowledged)

A single sequencer is censorship-vulnerable and is a single point of liveness failure. This is the standard MiniMove deployment in 2026 and the customer-buyer review (ARCHITECTURE.md §4.5, §7) accepts this trade-off.

---

## 7. VIP awareness

### 7.1 Do we apply for VIP?

**Not for hackathon submission.** Reasons:

1. VIP eligibility requires meeting a set of KPIs and the application process is post-launch.
2. Our user base on day 1 is "the demo audience" — VIP rewards would be allocated to artificial users, which would distort the program.
3. We commit to applying within 90 days of post-hackathon launch if the project continues, with eligibility metrics that are organic.

### 7.2 If we did apply, what changes?

- INIT rewards to active users (artists making sales, buyers making purchases) would be distributed via VIP. This is functionally a marketing budget paid in INIT.
- The token-cost of running the rollup (executor bot's INIT-for-bridging-fees, IBC relayer's TIA-for-Celestia-fees) becomes lighter because VIP rebates flow back to the rollup operator.
- The artist's effective royalty rate goes up slightly because their take-home INIT carries embedded VIP rewards.

### 7.3 Is the architecture VIP-ready?

Yes. VIP measures activity via on-chain events; our `SettlementEvent`, `BidPlacedEvent`, and `ArtworkMintedEvent` are exactly the surfaces VIP scoring would use. No re-architecture needed.

---

## 8. Customer-buyer review

> *Reviewing this document as if Initia disappeared tomorrow.*

**What breaks if Initia disappears:**

1. **The royalty-enforcement headline.** Move resources are an Aptos Move thing too — we could in principle re-deploy on Aptos or Movement. But "an Aptos NFT marketplace with royalties" is a different product (no `.init` usernames, no Skip-Go-routed bridge, no OPinit free-tier rollup hosting). The economics get harder.

2. **The auction UX.** Cosmos's `authz` module is also on every Cosmos chain, but the InterwovenKit drawer that makes auto-sign actually usable is Initia's. Re-implementing on Aptos would require building the equivalent UX from scratch.

3. **`.init` usernames.** We'd revert to addresses. Identity portability across other Initia rollups (a real benefit if the ecosystem grows) is gone.

4. **Bridge UX.** Skip Go is multi-chain, not Initia-specific. We'd keep this if we re-deployed on, say, Osmosis. But the *trigger* — `useInterwovenKit().openBridge` — is gone.

5. **OPinit ops.** Without Initia we'd run our own rollup ops. The CX22 monthly cost is the same; the engineering effort is much higher.

**What survives:**

- Move modules (port to Aptos).
- Frontend code (90%+ port-able).
- Indexer code (the Tendermint-Cosmos source adapter would need replacement on a non-Cosmos target).
- Customer narrative ("non-circumventable royalties") survives any Move-VM target.

**Verdict:** if Initia disappears, we have a working business on Aptos with measurably worse identity, bridging, and ops. The Initia integration is **load-bearing**, not decorative — removing it isn't fatal but it's costly. This is the right amount of dependence: enough that the 30% scoring weight is earned, not so much that the project is hostage to a single chain's success.
