# TECH_STACK.md — Provenance

**Doc version:** 1.0
**Convention:** each layer table has *Chosen | Alternatives considered | Rationale | Risk*. Risk is the honest one, not a sales pitch.

---

## Layer 0 — Data Availability

| Field | Value |
|---|---|
| **Chosen** | Celestia (mocha-4 testnet for hackathon) |
| **Alternatives** | Initia L1 batch inbox (in-band DA) ; Avail |
| **Rationale** | Celestia is the default Weave-supported DA for OPinit rollups. Switching to in-band DA would mean paying L1 gas for every batch — an order of magnitude more expensive at scale and fragile during L1 congestion. Avail is supported by Weave but the operator tooling story on testnet is less mature. Picking Celestia is the path-of-least-resistance choice the hackathon organisers expect. |
| **Risk** | Mocha-4 has had outages historically. If Celestia goes down during demo, the executor stops submitting batches; deposits/withdrawals stall but the rollup itself keeps producing blocks (DA is async). Mitigation: pre-record the demo. |

## Layer 1 — Settlement

| Field | Value |
|---|---|
| **Chosen** | Initia L1 (initiation-2 testnet) |
| **Alternatives** | None — hackathon mandates Initia |
| **Rationale** | Mandatory. |
| **Risk** | initiation-2 throughput / RPC liveness during the submission window. We use multiple RPC endpoints from the official registry as a fallback list. |

## Layer 2 — Rollup VM

| Field | Value |
|---|---|
| **Chosen** | **MiniMove** |
| **Alternatives** | MiniEVM ; MiniWasm |
| **Rationale** | This is the most consequential pick in the stack and gets a long defence below. |
| **Risk** | MiniMove is less tooled than MiniEVM (Hardhat/Foundry vs Aptos CLI variants). Fewer Stack Overflow answers. Build velocity penalty estimated at 2–3 hours over the 17-hour build. |

### MiniMove vs MiniEVM vs MiniWasm — the defence

The product's core differentiator is **non-circumventable royalty enforcement**. The choice of VM is the choice of whether that differentiator is *structural* or *aspirational*. Concrete walk-through:

**Royalty enforcement under MiniEVM (Solidity).** ERC-721 / ERC-1155 give every holder a permissionless `transferFrom`. EIP-2981 publishes a royalty rate but transferring the token to a buyer is divorced from any payment — money moves on a different contract or off-chain entirely. To enforce royalties on EVM you have to either (a) use a transfer hook (ERC-721C) which only blocks marketplaces that haven't been whitelisted — every six months a new "royalty-skipping" marketplace appears and the cat-and-mouse continues; or (b) a wrapped-token model where the canonical ERC-721 is held in a vault and the user holds a non-transferable claim — destroys composability. We could ship either pattern in MiniEVM, but the customer-buyer review (Lina) called out that the royalty story has to be *guaranteed*, not *enforceable-via-whitelist*. EVM gets us closer to "OpenSea but with our marketplace whitelisted" than to "a real solution."

**Royalty enforcement under MiniMove.** Move's resource model lets us define `Artwork` such that the *only* code path that simultaneously moves an `Artwork` resource AND moves `Coin<INIT>` lives inside our `royalty::settle` function. Because Move resources cannot be duplicated, dropped, or moved without a `move_to` / `move_from` call, and because `Object<Artwork>` ownership is gated by a friend capability we control, there is no permissionless `transferFrom(token, buyer)` that can be paired with an off-chain payment to skip the royalty. Free transfers (gifts) ARE allowed, by design — gifting was never the attack vector. The trade is: gain protocol-level enforcement, lose the ability for a third party to build a competing marketplace on top of our artworks (because they'd have to call our module too). For Lina, that trade is correct — she'd rather have one marketplace that pays her than ten that don't.

**Royalty enforcement under MiniWasm (CosmWasm).** CosmWasm has actor-style messaging and could simulate the Move pattern with a single canonical contract that holds NFT custody. This works, but the resulting contract surface is enormous (you re-implement object permissions, ownership tracking, etc.) and the gas overhead of inter-contract messaging on CosmWasm is non-trivial. We'd be re-implementing what Move gives us natively. CosmWasm is the right pick for products where rich messaging between heterogeneous contracts is the headline (DeFi composability); royalty enforcement is not that product.

**Other dimensions:**
- **Tooling.** MiniEVM wins decisively (Foundry tests, Hardhat, OpenZeppelin libs). MiniMove second (Aptos-derived `move test` + the `0x1::simple_nft` reference). MiniWasm third (CosmWasm test framework is verbose).
- **Developer hiring.** EVM is most common, then Wasm/Rust, then Move. Doesn't matter for the hackathon (one builder).
- **Initiation-2 maturity.** All three are deployable via Weave; MiniMove is the best-documented for NFT-style use cases (`0x1::simple_nft` is on-chain at L1) and we crib from it.

**Verdict:** MiniMove. The differentiator is structural, not bolted-on. We pay a small tooling penalty and earn the headline of the demo.

## Layer 3 — Smart contract / module language

| Field | Value |
|---|---|
| **Chosen** | Move (Initia-flavoured, derived from Aptos Move) |
| **Alternatives** | Solidity, CosmWasm — gated by VM choice above |
| **Rationale** | Follows MiniMove. We use the `0x1::simple_nft` and `0x1::object` modules as references for our resource pattern. |
| **Risk** | Move resource semantics around `Object<T>` and friend capabilities are subtle; we'll write invariant tests for "no path moves Artwork+Coin without calling settle". |

## Layer 4 — Frontend framework

| Field | Value |
|---|---|
| **Chosen** | Next.js 15 (App Router, RSC enabled) |
| **Alternatives** | Vite + React ; Remix |
| **Rationale** | Next.js gives us file-based routing, SSR for OG images on artwork pages (critical for shareability), and a single deploy target on Vercel that handles the API routes for the upload presign flow. Remix has a similar feature set but the ecosystem of wallet libraries (wagmi, InterwovenKit) is documented primarily against Next. Vite is faster for dev iteration but moves SSR / serverless-edge work to a separate provider, which costs us 1+ hour of plumbing. |
| **Risk** | App Router edge cases with client-only InterwovenKitProvider — we wrap it in a `'use client'` `<Providers />` component to avoid SSR-rendering of the wallet UI. |

## Layer 5 — UI library

| Field | Value |
|---|---|
| **Chosen** | Tailwind CSS + shadcn/ui |
| **Alternatives** | Mantine ; Chakra UI ; NextUI/HeroUI |
| **Rationale** | shadcn is copy-paste, not a runtime dependency, so we own the components and can theme them to a deliberately understated gallery aesthetic. Mantine is full-featured but bundle-heavy and visually homogeneous (most Mantine apps look like Mantine apps). For an art marketplace the visual differentiation matters; Tailwind + shadcn lets us reach for Inter / Tiempos / Söhne typography and editorial layout choices without a fight. |
| **Risk** | We have to actually do design work; defaults will look generic. Mitigated by spending Phase 6 polish hours on type and grid rather than features. |

## Layer 6 — Wallet / signing (mandatory layer)

| Field | Value |
|---|---|
| **Chosen** | InterwovenKit (`@initia/interwovenkit-react`) v2.4+ |
| **Features used** | `useInterwovenKit()` → `initiaAddress`, `username`, `requestTxBlock`, `openConnect`, `openBridge`, `autoSign.enable()`, `autoSign.disable()`, `autoSign.isEnabled`. `InterwovenKitProvider` wraps the tree; we pass `defaultChainId="provenance-1"` and `customChain` with our rollup's `apis: { rpc, rest, indexer }`. We use the `...TESTNET` baseline from the kit. We use `useAccount` and `useDisconnect` from wagmi for wallet connection state (per the kit's documented pattern). We do NOT manually instantiate a username resolver — the `username` property from the hook is the authoritative source. |
| **Rationale** | Mandatory. |
| **Risk** | Version churn (the kit is pre-1.0 ergonomically — v2.4.0 changed `openModal` to `openConnect`). We pin a specific minor version in package.json and don't upgrade during the build. |

## Layer 7 — State management

| Field | Value |
|---|---|
| **Chosen** | TanStack Query (server cache) + Zustand (transient UI state) |
| **Alternatives** | Redux Toolkit (sole) ; Jotai ; SWR |
| **Rationale** | The marketplace is overwhelmingly read-heavy from a server-of-truth (the indexer). TanStack Query handles caching, refetch, optimistic updates, and stale-while-revalidate. Zustand handles modal/drawer/toast state — the 5% that's truly client-side. Redux Toolkit is correct for shared mutable client state at scale but we don't have that surface; using it would be ceremony. Jotai is fine but pairs poorly with TanStack Query's mental model. |
| **Risk** | Two libraries instead of one — small mental tax on contributors. Worth it for the right tool per job. |

## Layer 8 — Indexer / data layer

| Field | Value |
|---|---|
| **Chosen** | Ponder (with custom Cosmos/Move event source adapter) |
| **Alternatives** | SubQuery ; The Graph (no Initia support) ; custom Go indexer ; direct from chain RPC |
| **Rationale** | Ponder gives us a typed schema, GraphQL output, hot-reload local dev, and Postgres backend — all in TypeScript so we share types with the frontend. It's EVM-first but the architecture (block source → handlers → DB) is generic enough that we write a thin adapter that subscribes to the Tendermint WebSocket on our rollup, decodes Move events using `@initia/initia.js`'s BCS deserializers, and feeds them as if they were EVM logs. SubQuery has Cosmos support but the developer experience is heavier (yaml manifests, a separate query node). A custom Go indexer would cost 6+ hours we don't have. Reading direct from RPC kills page-load p95. |
| **Risk** | The adapter is the riskiest custom code in the system. We write it as a single file (~200 LOC) with a mock-block test suite. If it fails on demo day we fall back to a thinner "RESTClient.indexer" path that queries the chain's NFT REST API directly with worse perf but correct data. |

## Layer 9 — Storage (media)

| Field | Value |
|---|---|
| **Chosen** | Cloudflare R2 with signed-PUT direct uploads (artist) and public GET URLs (everyone) |
| **Alternatives** | IPFS via web3.storage ; Arweave via Bundlr ; AWS S3 |
| **Rationale** | R2 has zero egress fees, a generous free tier (10GB / 1M class A ops / 10M class B ops monthly), works with the same S3 SDK we know, and signed-PUT means the artist uploads bytes directly to Cloudflare without our backend touching them. Content addressing (sha256-of-bytes as the path component) gives us pseudo-immutability without IPFS's pinning ceremony. IPFS via web3.storage is the right *post-MVP* mirror but during a 17-hour build we cannot afford the pinning-failure debugging cycle. Arweave is permanent but expensive and the upload UX (Bundlr) is a separate flow. S3 has egress fees that bite at any moderate scale. |
| **Risk** | R2 outage = artwork images return 502. The on-chain `content_hash` lets anyone rehost (architectural mitigation). The customer-buyer review flagged this as the architecture's biggest honest weakness. v1.1 mirrors to IPFS; v1 ships with R2-only and a documented path. |

## Layer 10 — Off-chain services

| Field | Value |
|---|---|
| **Runtime** | Node.js 20 LTS for the indexer; Cloudflare Workers (V8 isolate) for the upload-presign endpoint and OG-image generator |
| **Hosting** | Indexer + Postgres on Railway (free tier sufficient for hackathon, $5/mo at 100 users); Workers on Cloudflare (free tier covers our load); Sequencer + executor + challenger + IBC relayer on a single Hetzner CX22 (€4.59/mo, 4GB RAM, 2 vCPU, 40GB disk — comfortably within rollup requirements) |
| **Queue** | None in v1 — every off-chain workflow is either request-response (presign) or event-driven (indexer). Adding BullMQ would be premature abstraction. |
| **Database** | Postgres 16 on Neon (free tier — generous, branched envs, autoscale). Indexer's only persistent dep. |
| **Rationale** | Hetzner gives us bare-metal-ish performance for the chain processes at a price the customer can defend. Railway and Neon free tiers cover the demo and the first 100 users. Cloudflare Workers cover the edge surface. No AWS/GCP — onboarding overhead doesn't pay for itself in a 17-hour build. |
| **Risk** | Hetzner has no managed restart-on-OOM beyond systemd. We use systemd `Restart=always` and Grafana alerts; if the box itself dies, demo is dead — we accept this and pre-record. |

## Layer 11 — Observability

| Field | Value |
|---|---|
| **Logging** | `pino` JSON logs from the indexer, captured by systemd journal on the Hetzner box for chain processes, shipped to Better Stack free tier |
| **Metrics** | Prometheus exporters: `minitiad`'s `:26660/metrics`, `node_exporter` for OS metrics, custom `provenance_indexer_head_delta` from indexer. Scraped by Grafana Cloud free tier (10k series). |
| **Tracing** | OpenTelemetry on Next.js API routes only, exported to Better Stack |
| **Alerting** | Grafana Cloud alerts → email-only (PagerDuty unnecessary at hackathon scale) |
| **Dashboards** | Three Grafana dashboards: "Chain health" (block time, mempool, peer count), "Bots health" (executor lag, challenger heartbeat, relayer state), "App health" (indexer head delta, GraphQL p95, R2 4xx/5xx) |
| **Rationale** | Free-tier-only by design. None of these tools require credit card sign-up beyond a hackathon participant's reach. |
| **Risk** | Free-tier rate limits during a viral moment. Documented in DEPLOYMENT_TOPOLOGY. |

## Layer 12 — CI/CD

| Field | Value |
|---|---|
| **Source control** | GitHub, single repository, monorepo (apps/web, indexer, contracts) |
| **CI** | GitHub Actions: `move test` for contracts, `vitest` for frontend unit, `playwright` for frontend e2e (smoke flow only), `pnpm typecheck` everywhere |
| **CD** | Vercel for frontend (preview per PR, prod on `main`); Railway auto-deploys indexer on `main`; Hetzner box updated by manual `weave` invocation (no CD because we don't want chain-modifying deploys to fire from CI) |
| **Branch protection** | `main` requires PR + green CI; signed commits enforced |
| **Test coverage** | The user instruction is **100% coverage**. We commit to 100% line coverage on the Move modules (where it matters most) and ≥ 90% on the indexer + frontend lib/. We use `cargo-llvm-cov`'s Move equivalent (`move coverage`) and Vitest's `--coverage`. Coverage thresholds enforced in CI; PRs that drop coverage fail. |
| **Secrets** | GitHub Actions Encrypted Secrets for CI (testnet keys, R2 creds, Neon URL). Hetzner box secrets in `~/.minitia/artifacts/` (file mode 600). Vercel & Railway: env vars in dashboard. We do NOT commit any secret to the repo — `.env.example` only. |
| **Rationale** | All free or built-in. Test coverage is non-negotiable per build instructions. |
| **Risk** | 100% Move coverage including error branches takes longer than estimated. We allocate Phase 2 time accordingly and accept that frontend coverage may dip if we run out — the chain code is the part that handles money. |

---

## Customer-buyer review

> *Reviewing the stack as the same Lina, plus her dev friend Marek who's mid-level full-stack and would inherit this codebase if Lina hired him.*

**Lina:** "Free tiers everywhere is reassuring. €4.59/month server is the kind of bill I can pay personally if the project survives the hackathon and looks for funding."

**Marek:** Goes through line by line.

- **Overbuilt?** Better Stack + Grafana Cloud + Prometheus is more observability than the project needs at MVP. *Counter:* the cost is the same as not having it (free tiers), and the alternative (no metrics) means we don't notice the indexer is behind until users complain. **Keep.**
- **Underbuilt?** No CDN cache layer between Vercel and the user — for a marketplace with images, image CDN matters. *Counter:* R2 public URLs are served from Cloudflare's edge already; that's the CDN. **OK.**
- **Trendy-but-fragile?** Ponder is young (post-2023). If it abandons the project we have indexer risk. *Counter:* the adapter we write is in our repo; if Ponder dies tomorrow we own a Postgres schema and a Tendermint event subscriber. The lock-in is mild. **Acceptable.**
- **Overlooked?** No backup of Postgres. *Fix:* Neon's free tier includes 7-day point-in-time restore; we enable it in DEPLOYMENT_TOPOLOGY. **Logged.**
- **Mobile.** Tailwind + shadcn is responsive but no native app. *Counter:* PWA-installable, that's good enough for v1. **Approved.**

**Verdict on the stack:** Approve. The trade-offs are honest, the choices are defensible against alternatives, and nothing is in the stack because it's fashionable.
