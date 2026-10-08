---
name: goalday-long-task
description: Keep GOALDAY implementation work resumable across long sessions, agents, or worktrees. Use when work spans multiple milestones, requires a handoff, risks losing context, or needs isolated parallel changes.
---

# Keep long GOALDAY work resumable

Read the relevant guide linked from [AGENTS.md](../../../AGENTS.md), then make the work reviewable at each milestone.

1. Keep `.artifacts/tasks/<slug>/checkpoint.md` as the durable handoff. Record the objective, scope, accepted decisions, risks, current commit, dirty files, completed milestones with evidence, and next concrete step. Update it after each meaningful milestone and before a handoff.
2. Give each concurrent change its own worktree and branch. Keep shared state explicit: do not have two authors edit the same files at once. The author reports commit, diff, commands, outcomes and result paths.
3. Let the offline server choose a free port (`PORT=0`) unless a fixed port matters, and record its emitted URL. Compose derives a project name from the checkout path; set a unique `COMPOSE_PROJECT`/`COMPOSE_PROJECT_NAME` override when needed. Stop only processes started by this task and record cleanup. Wrappers clean up their own children/containers on `SIGTERM`; record any process that does not exit cleanly.
4. Preserve evidence with its exact commit/diff and worktree. Verification manifests include tracked diffs, copies of untracked files, and initial/final tree digests. If a digest changes during a run, treat the result as failed and rerun on the final snapshot. Keep logs, screenshots, traces and reports out of source changes unless the task asks to add them to the repository. A reviewer reads the fixed author snapshot independently, reports findings, and re-reviews the amended snapshot.
5. Resume from the latest checkpoint, verify it against `git status`, the recorded commit/diff and current files, then continue from the stated next step. Never treat a checkpoint as proof that a command passed.

Access is determined by the actual environment and tools. A separate worktree or written policy does not enforce read-only access. Keep remote services and secrets out of scope unless the user has authorized a specific operation and environment. Use fake/offline services for repeatable tests; report precisely where remote validation remains unperformed.
