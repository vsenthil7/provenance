# Move Coverage Exemptions

This document records every line of Move source code that is **not** covered by
the test suite, with a written justification. Per the build rules in
`04_BUILD_PROMPT.md` Rule 5, the project allows up to **5 exemptions** total.
This file enumerates them. If a 6th exemption is needed, the build halts and
either (a) refactors to make the path testable, or (b) cuts the feature.

## Coverage status (last measured)

```
$ aptos move test --coverage
Test result: OK. Total tests: 92; passed: 92; failed: 0
$ aptos move coverage summary --dev
counters    100.00%
artwork     100.00%
market      100.00%
auction     100.00%
collection   95.88%
royalty      91.43%
TOTAL        98.55%
```

## Exempted lines

### Exemption 1 — `royalty.move`: defensive `royalty_bps <= MAX_ROYALTY_BPS`

```move
assert!(royalty_bps <= MAX_ROYALTY_BPS, error::invalid_state(E_ROYALTY_BPS_TOO_HIGH));
```

**Why exempt:** `settlement_facts()` returns the artwork's stored `bps`, which
is itself constrained at construction time:

- `artwork::mint` (entry) checks `royalty_override_bps <= MAX_ROYALTY_BPS`
  before storing.
- `collection::create_collection` checks `default_royalty_bps <= MAX_ROYALTY_BPS`
  before storing.

For `royalty::settle` to receive a `bps > MAX`, an artwork or collection
resource would have to exist on-chain with an out-of-range value, which the
upstream invariant prevents. The assert is defensive depth — useful as a
bytecode-level guard if the upstream invariants are ever weakened, but
unreachable in the present module set.

**Tested upstream invariants:** `mint_override_above_cap_rejected`,
`entry_create_collection_oversize_default_royalty_rejected`,
`collection_default_royalty_above_cap_rejected`.

**Risk acceptance:** R-BLD-03 row added.

### Exemption 2 — `royalty.move`: defensive `E_ARITHMETIC_INVARIANT_BROKEN`

```move
assert!(
    royalty_amount + protocol_fee + seller_net == gross_uinit,
    error::internal(E_ARITHMETIC_INVARIANT_BROKEN),
);
```

**Why exempt:** This assert can only fire if `mul_bps`, `mul_bps`, and
subtraction give an inconsistent result. `mul_bps` is unit-tested across the
relevant boundaries (`mul_bps_zero_amount`, `mul_bps_zero_bps`,
`mul_bps_at_5_percent`, `mul_bps_at_10_percent_cap`,
`mul_bps_dust_rounds_down_to_zero`, `mul_bps_no_overflow_at_huge_amount`) and
the arithmetic identity `royalty + fee + net == gross` is algebraic. Reaching
this assert requires either a compiler bug or a deliberate code change that
violates the invariant — both out of test scope.

**Risk acceptance:** R-BLD-03 row added.

### Exemption 3 — `royalty.move`: defensive `E_INSUFFICIENT_PAYMENT`

```move
assert!(
    coin::value(&payment) >= gross_uinit,
    error::internal(E_INSUFFICIENT_PAYMENT),
);
```

**Why exempt:** `royalty::settle` is friend-only and the only callers
(`market::buy_now_with_coin`, `market::accept_offer`,
`auction::finalize_auction`) all check `coin::value >= price` before invoking.
The assert here is a defensive crosscheck that fires only if a friend module
is buggy. Adding a test for this path would require a malicious friend
module, which by definition isn't part of the production build.

**Risk acceptance:** R-BLD-03 row added.

### Exemption 4 — `collection.move`: defensive `!collection.frozen` in `increment_supply`

```move
public(friend) fun increment_supply(...): u64 acquires Collection {
    ...
    assert!(!collection.frozen, error::invalid_state(E_FROZEN));
    ...
}
```

**Why exempt:** The only caller, `artwork::mint`, calls `mint_facts` first
and asserts `!frozen` *before* invoking `increment_supply`. The duplicate
check inside `increment_supply` is defensive depth — present so the friend
function is internally safe even if the caller pre-check is removed in a
future refactor.

**Tested upstream:** `mint_rejects_into_frozen_collection`,
`entry_mint_rejects_into_frozen_collection`.

**Risk acceptance:** R-BLD-03 row added.

### Exemption 5 — `collection.move`: defensive `supply_remaining` in `increment_supply`

```move
public(friend) fun increment_supply(...): u64 acquires Collection {
    ...
    assert!(
        ...,
        error::invalid_state(E_SUPPLY_EXHAUSTED),
    );
    ...
}
```

**Why exempt:** Same pattern as Exemption 4 — `artwork::mint` checks
`supply_remaining` via `mint_facts` before calling. Internal duplicate check.

**Tested upstream:** `mint_rejects_when_supply_exhausted`,
`entry_mint_rejects_when_supply_exhausted`.

**Risk acceptance:** R-BLD-03 row added.

## Hard cap on exemptions

This file lists **5 exemptions**, which is exactly the cap. **No 6th
exemption is permitted.** If a 6th uncovered line is encountered in future
work, the resolution must be either:

1. Refactor the production code to remove the uncovered line (e.g. delete
   the dead defensive check, OR extract shared logic so the test-only
   shortcut and the production path share assertion code), OR
2. Cut the feature whose coverage gap forces the new exemption.

## Note on test-only `_for_test` shortcut duplications

Some test-only public-fun shortcuts (`market::list_fixed_for_test`,
`market::make_offer_for_test`, `auction::create_auction_for_test`,
`artwork::mint_for_test`, etc.) duplicate the assert logic of their
production counterparts so that tests can chain calls (the entry function
doesn't return a typed `Object<T>` handle). The aptos coverage tool counts
the duplicate lines, which means **lines covered by exhaustive tests on the
production path may still appear uncovered** if the duplicate path is
unreached.

This is **not** an exemption — every uncovered line that arose from this
pattern was addressed by adding tests on the entry-function path
(`tests/entry_path_tests.move`). The remaining uncovered lines listed
above are all defensive depth, never duplicate-shortcut artifacts.

## Risk register reference

`R-BLD-03 — Move test coverage gate may force exemptions under time pressure`
in `docs/RISK_REGISTER.md`. This file is the realisation of that risk: 5 of
the 5 permitted exemption slots are used; further regressions trigger the
hard-cap rule above.
