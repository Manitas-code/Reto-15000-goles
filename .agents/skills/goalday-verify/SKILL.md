---
name: goalday-verify
description: Verify GOALDAY changes and choose checks by risk, including local development versus compiled production, page navigation, animation/timers, and fake versus remote services. Use when asked to test, validate, reproduce, or gather evidence for a GOALDAY change.
---

# Verify GOALDAY

Read [the current verification runbook](../../../docs/verificacion.md), then inspect `make help` and the relevant test files. Use the repository's current targets rather than reconstructing their underlying commands. `make verify` runs the full matrix; focused work can use `make e2e`, `make e2e-prod` after `make build`, or `make e2e-docker`. Use `make offline SOURCE=dev|prod` to start an isolated fake-upstream server, `make evidence` for the compiled visual walk-through, and `make report RUN_DIR=...` to view a saved phase. Ordinary `make e2e` rejects inherited explicit origins. Read the baseline and expert-origin modes in the runbook before overriding that guard.

1. Record the checked commit or diff and the starting `git status --short`. Give each run a fresh artifact directory; the runner rejects a `GOALDAY_RUN_DIR` that already has a manifest.
2. Map the changed behavior to the runbook's risk matrix. Run the smallest set that covers that risk, then broaden to the full check when the change touches shared state, navigation, build, or server behavior.
3. Separate development behavior from the compiled artifact when build or production serving is in scope. `make e2e-prod` requires a prior build. Exercise navigation through the actual root HTML routes and preserve query/hash behavior.
4. For animations and timers, check both the state transition and its timing/cancellation path. Reduced motion or a fake clock can cover determinism, but does not alone establish wall-clock expiry behavior.
5. Label evidence by service: fake/offline, local development, compiled local production, or authorized remote. Normal `make e2e` rejects inherited explicit origins. Use `SOURCE=baseline` only with the original checkout served on loopback; direct Playwright CLI origin overrides are for deliberate expert diagnostics. A fake proves only the fake contract. Remote Supabase behavior needs an authorized environment and a clear scope.
6. Report exact commands, exit status, commit/diff, result directory and any limitation. Each run manifest captures tracked changes, copies permitted untracked source inputs, lists snapshot omissions, and hashes the initial and final trees. A changed final digest makes the run fail; rerun against a stable final snapshot. Separate observed results from inference. Keep failed evidence and explain it; don't update accepted fixtures to make a comparison pass.

The current baseline is `88552644372229ccd8e8157c3ac99c88965b5675`. Capture scripts can overwrite fixtures and require a separate checkout of that revision. The repository still lacks `goles.js`; verification must not imply that Gol del día is operational.
