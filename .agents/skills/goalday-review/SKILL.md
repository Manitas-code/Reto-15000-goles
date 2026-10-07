---
name: goalday-review
description: Review GOALDAY code or documentation diffs for regressions in product behavior, persistence, routes, timers, API contracts, and evidence quality. Use for an independent author-reviewer pass or when asked to inspect a GOALDAY change before integration.
---

# Review a GOALDAY change

Read [the verification runbook](../../../docs/verificacion.md) and relevant domain guide before judging the diff. Review a fixed snapshot: record the commit/diff hash or base and head, inspect the complete changed files plus affected callers/tests, then report findings against that snapshot.

Do not inherit the author's conclusion. Form the review from observable code and evidence. Use the verification manifest's commit, tracked patch, saved untracked files, and initial tree digest to identify the author's exact snapshot. A `treeChanged` result invalidates the run as evidence for the final tree. For each finding, state the file/line, trigger, concrete impact and a practical correction. Separate blockers from questions and residual risks. If there are no findings, state what you inspected and what evidence remains missing; do not call that proof of correctness.

Check the invariants relevant to the change: seven public HTML routes and query/hash behavior; rules, seeds and catalog order; exact daily-start/abandonment semantics; unknown `localStorage` fields; timer/RAF cleanup; client-consumed RPC payloads versus unverified Supabase schema; secrets staying server-side; fake responses versus remote behavior; and baseline fixtures remaining independent.

When reviewing another agent's work, review its diff as a read-only snapshot. Send concise, evidence-based findings to the author, then re-review the updated snapshot. Do not silently edit their files while acting as reviewer. A passing suite and a clean review are separate evidence, neither substitutes for the other.
