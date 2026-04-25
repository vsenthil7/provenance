# Web Coverage Exemptions

This file is the only authority for frontend coverage gate exemptions per
Operating Rule 5 in `04_BUILD_PROMPT.md`.

**Budget: 2 exemptions max for web** (combined total budget across the
codebase is 5; see also `contracts/COVERAGE.md`). No 6th permitted anywhere.

## Current exemptions

_None claimed yet._ Vitest thresholds are at 100% across lines, branches,
functions, and statements. The build aims for 100.00% with zero exemptions.

## Things that are excluded from coverage by design (not exemptions)

These do not count against the budget — they are configuration choices, not
exemptions:

- `app/**/layout.tsx` — render-only, exercised by Playwright e2e
- `app/**/page.tsx` — pages are e2e-tested, not unit-tested
- `*.config.*`, `*.d.ts`, `__mocks__/**`, `test/**` — non-production code

## Exemption template (when one is genuinely needed)

| File:line | Reason it cannot reasonably be tested | Sign-off | Risk-register row |
|---|---|---|---|
| _e.g. `components/ErrorBoundary.tsx:41`_ | _e.g. global error path that requires throwing in render; mocked but uncoverable in v8_ | _builder_ | _R-BLD-03_ |

## Process

1. Try to make the path testable first. Most "untestable" branches turn out
   to be reachable with a contrived test or a render-error spy. Spend at
   least 15 minutes trying.
2. If genuinely unreachable, add a row above with a one-sentence reason.
3. Add a `RISK_REGISTER.md` line referencing the exemption.
4. Update the vitest config to exclude only the lines listed in this file.
