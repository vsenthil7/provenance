# Move Coverage Exemptions

This file is the only authority for Move-side coverage gate exemptions per
Operating Rule 5 in `04_BUILD_PROMPT.md`.

**Budget: 3 exemptions max for Move.** No 6th exemption permitted across the
whole codebase (see also `apps/web/COVERAGE.md` which holds 2 more for React
error boundaries).

## Current exemptions

_None claimed yet._ The budget is empty; the build aims for 100.00% with no
exemptions used.

## Exemption template

| File:line | Reason it cannot reasonably be tested | Sign-off | Risk-register row |
|---|---|---|---|
| _e.g. `royalty.move:88`_ | _e.g. native stdlib aborts on impossible u128→u64 cast_ | _builder name_ | _R-BLD-03_ |

## Process

1. Try to make the path testable first. Most "untestable" branches turn out
   to be reachable with a contrived test. Spend at least 15 minutes trying.
2. If genuinely unreachable, add a row above with a one-sentence reason.
3. Increment the relevant `RISK_REGISTER.md` row.
4. The CI gate is configured to ignore *only* the lines listed in this file.
   It re-checks that the exemption count is ≤ 3.
