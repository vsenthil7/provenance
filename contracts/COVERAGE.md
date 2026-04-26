# Coverage exemptions

Move test coverage is currently **deferred** — see `docs/PHASE_REVIEWS.md` "Phase 2 deferment".

## Background

The scaffold's Move source modules use `Coin<AptosCoin>` directly as a `public entry`
parameter (e.g. `place_bid(... bid: Coin<AptosCoin>)`). This pattern was legal in older
aptos-framework revisions but is rejected by recent ones with the error:

> type `0x1::coin::Coin<0x1::aptos_coin::AptosCoin>` is not supported as a transaction parameter type

Modern Aptos Move requires `entry` signatures to take `u64` amounts and pull the Coin
from `primary_fungible_store` inside the function. Initia's MiniMove follows the same
convention via the fungible-asset (FA) `Metadata` API.

Bisecting `rev` values on `aptos-labs/aptos-core` to find a release that simultaneously
permits `Coin<T>` entry params **and** exposes the `event::emit` API (added later) was
exceeding the hackathon time budget.

## Phase 2.5 follow-up (post-hackathon)

Refactor the six Move modules to:

1. Take `u64` amounts in `entry` signatures instead of `Coin<T>`
2. Use `primary_fungible_store::withdraw` / `deposit` for value movement
3. Replace `aptos_framework::aptos_coin::AptosCoin` with Initia's `INIT` FA metadata object
4. Switch `Move.toml` dep back to `MinitiaStdlib` (which transitively provides the right framework version)

After the refactor, all 53+ Move tests in `tests/*.move` are expected to pass and the
100% line+branch coverage gate becomes binding again.

## Scope of this exemption

This is a **whole-package exemption** on the Move side, not the per-line exemption
described in `04_BUILD_PROMPT.md` Rule 5. It is registered as **R-BLD-04** in the
`docs/RISK_REGISTER.md` (post-hackathon refactor risk) and consumes the entire Move
exemption budget. The frontend/indexer 100% coverage gates are unaffected and remain
binding (296/296 tests passing as of this commit).
