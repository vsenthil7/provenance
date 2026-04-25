# DONE-PROMPT — Architecture Page Closeout Retrospective

**Project:** INITIATE Hackathon (HACK0016) Submission
**Stage just completed:** Architecture Design (Page 2 of 4)
**Next stage:** Build & Run-on-Desktop (Page 3)
**Time at closeout:** _[fill in when running this]_

---

## Purpose of this prompt

This is the closeout for the Architecture page. It is run AFTER all ten architecture deliverables have been produced. It confirms the page actually finished, captures lessons, and prepares the hand-off to the Build page.

Do not run this prompt until every deliverable from `02_ARCHITECTURE_DESIGN_PROMPT.md` exists as a downloaded `.md` file.

---

## Mandatory Checklist — Did the page actually finish?

For each of the ten deliverables, mark Yes / No:

- [ ] `ARCHITECTURE.md` exists, was customer-buyer reviewed, and is downloaded
- [ ] `TECH_STACK.md` exists, was customer-buyer reviewed, and is downloaded
- [ ] `DATA_MODEL.md` exists, was customer-buyer reviewed, and is downloaded
- [ ] `API_CONTRACT.md` exists, was customer-buyer reviewed, and is downloaded
- [ ] `INITIA_INTEGRATION.md` exists, was customer-buyer reviewed, and is downloaded
- [ ] `SECURITY_THREAT_MODEL.md` exists, was customer-buyer reviewed, and is downloaded
- [ ] `DEPLOYMENT_TOPOLOGY.md` exists, was customer-buyer reviewed, and is downloaded
- [ ] `BUILD_PLAN.md` exists, was customer-buyer reviewed, and is downloaded
- [ ] `RISK_REGISTER.md` exists, was customer-buyer reviewed, and is downloaded
- [ ] `CUSTOMER_BUYER_REVIEW.md` exists with a final verdict (Approve / Conditional Approve / Reject)

If any box is unticked, the page is NOT done. Return to `02_ARCHITECTURE_DESIGN_PROMPT.md` and finish.

---

## Verdict Confirmation

Read the final verdict from `CUSTOMER_BUYER_REVIEW.md`:

- **If Approved** → proceed to "Lessons Captured" below
- **If Conditional Approve** → list the conditions explicitly here, confirm each has been satisfied with a revised file in `/mnt/user-data/outputs/`, then proceed
- **If Rejected** → the architecture is not ready for build. Return to `02_ARCHITECTURE_DESIGN_PROMPT.md` and redesign. Do not move to the Build page on a rejected architecture.

**Final verdict captured here:** _[paste the verdict from CUSTOMER_BUYER_REVIEW.md]_

---

## Lessons Captured

Three sections to fill in honestly. No hedging.

### What worked on this page

- _[bullet specific things that produced good output]_
- _[e.g. "Doing TECH_STACK before DATA_MODEL forced clarity on VM choice early"]_
- _[e.g. "Customer-buyer review caught two layers of over-engineering before they spread"]_

### What did not work

- _[bullet specific things that wasted time or produced weak output]_
- _[e.g. "Spent too long on observability stack — judges won't read it; should have stubbed and moved on"]_
- _[e.g. "Initial deployment topology assumed AWS; had to redo for Railway free tier"]_

### What to carry into the Build page

- _[concrete behavioural notes for the next page]_
- _[e.g. "Do not start coding until repo is created remote-first with branch protection"]_
- _[e.g. "Reference INITIA_INTEGRATION.md before writing any wallet code"]_
- _[e.g. "BUILD_PLAN.md is the source of truth for hour-by-hour pacing — review it every two hours"]_

---

## Architecture Locked-In Summary

Write a 5-bullet summary that the Build page will use as its starting context:

1. **Product:** _[one sentence]_
2. **VM choice:** _[Move / EVM / Wasm + 1 sentence why]_
3. **Initia primitives used (load-bearing):** _[list]_
4. **Top 3 architectural risks identified:** _[list]_
5. **Demo path (one sentence):** _[the 5-7 minute story the demo will tell]_

This summary will be the first thing pasted into the Build page prompt.

---

## Time Audit

- Time at start of Architecture page: _[from the start-prompt retro]_
- Time at end of Architecture page: _[now]_
- Total elapsed: _[difference]_
- Hackathon submission deadline: 26 April 2026, 01:00 UTC
- Effective build time remaining: _[deadline minus now, minus video / submission buffer]_

If effective build time remaining is less than what `BUILD_PLAN.md` requires, flag this here explicitly. Do not proceed to Build until either (a) the build plan is compressed to fit, or (b) the gap is acknowledged and accepted.

**Time decision:** _[Proceed as planned / Compress build plan / Re-evaluate scope]_

---

## What to NOT do at this checkpoint

- Do not start coding. The Build page has its own prompt and its own remote-first Git discipline.
- Do not skip the customer-buyer verdict if it was "Conditional Approve" — every condition must be satisfied or explicitly waived in writing.
- Do not lose the ten architecture files. They are the contract for what gets built.
- Do not let architectural drift happen on the Build page without coming back here to update the docs.

---

## Hand-off to Build Page

The Build page prompt should:
1. Reference the ten architecture files as authoritative
2. Begin with remote-first Git setup (create remote, then write code locally, commit immediately, test, fix-on-error, commit-push, retest)
3. Follow `BUILD_PLAN.md` as its hour-by-hour guide
4. Trigger another customer-buyer review at the end of each phase
5. Maintain the same operating rules: customer-first, enterprise grade, no scope shrinking, brutal honesty

When ready, paste the Architecture-Locked-In Summary (from above) into the start of the Build page prompt and begin.

---

## Closeout Statement

By completing this prompt, the following is true:

- Ten architecture deliverables exist and are downloaded
- Customer-buyer review has been performed and verdict captured
- Lessons have been recorded honestly
- Time audit has been done with eyes open
- Hand-off summary is ready for the Build page

Signed off by: _[your initials]_
At: _[timestamp]_

The Architecture page is closed. The Build page may now begin.
