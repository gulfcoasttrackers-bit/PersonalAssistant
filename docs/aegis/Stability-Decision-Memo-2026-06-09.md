# Personal Assistant Stability Decision Memo

Date: 2026-06-09  
Owner: PM (@piper)  
Scope: This-week stability decisions for database migration path and Google sync timing to prevent scope drift.

## Decision Summary

Decision 1: Finalize and enforce migration-history-first DB operations this week.

- Approved path:
  - Treat Prisma migrations as the single source of schema truth.
  - Create and commit the first migration baseline from the current `prisma/schema.prisma` state.
  - Use `npm run db:migrate` for all schema changes after baseline creation.
  - Reserve `npm run db:push` for emergency local recovery only.
- Rationale:
  - The repository currently has `prisma/schema.prisma` but no `prisma/migrations` directory, which leaves rollback and reproducibility weak.
  - A committed migration history closes drift risk across machines and release attempts.

Decision 2: Lock Google sync timing to a stability-first cadence and hold expansion scope.

- Approved timing policy for this week:
  - Keep Google sync read-only pull behavior (no Google write-back).
  - Keep manual sync as the operational default for all users this week.
  - Do not introduce new background schedulers, webhook ingestion, or bi-directional conflict logic this week.
  - If auto-sync is used, it remains best-effort pull-only and receives no scope expansion or reliability promises in this cycle.
- Rationale:
  - Existing sync already handles token refresh, event upsert, conflict preservation for local edits, and sync logging.
  - Expanding timing models before migration baseline and regression closure would increase stability and schedule risk.

## Scope Guardrails (Week Of 2026-06-09)

- In scope:
  - Migration baseline creation and migration workflow enforcement.
  - Hardening current sync route behavior only (`GET /api/calendar/sync`).
  - Regression and evidence capture for auth, projects, tasks, events, and calendar sync.
- Out of scope:
  - Google write-sync.
  - New recurring background worker architecture.
  - Webhooks/push notifications.
  - Multi-calendar and cross-account merge logic.

## Implementation Sequence (This Week)

1. Day 1 - Governance lock and branch hygiene
   - Record this memo and Decision Log entry before implementation.
   - Freeze schema-changing feature work until baseline migration lands.
   - Open a dedicated stability branch if not already active.

2. Day 1 - Migration baseline generation
   - Run: `npm run db:migrate -- --name baseline_2026_06_09`
   - Confirm `prisma/migrations/.../migration.sql` is generated and committed.
   - Run: `npm run db:generate` to align Prisma client.

3. Day 2 - Reproducibility validation on clean state
   - Validate from clean DB path using migration history (`migrate deploy` flow).
   - Verify app startup and critical API routes after migration apply.
   - Capture validation notes in docs for auditability.

4. Day 2-3 - Google sync hardening without scope expansion
   - Validate sync outcomes for: no Google account, expired/invalid refresh token, Google API failure, repeated imports, and local-edit conflict preservation.
   - Confirm no new timing mechanisms are added in code this week.
   - Ensure sync log entries remain complete (`trigger`, `status`, `synced`, `skipped`, `conflicts`, `detail`).

5. Day 3-4 - Reliability regression pass
   - Run lint/build and focused functional checks for Tasks, Projects, Events, Calendar, Auth.
   - Validate no schema drift on a second machine or clean environment.

6. Day 5 - Closeout and next-gate trigger
   - Publish outcomes and open risks.
   - Approve next-week sync timing review only if all acceptance criteria pass.

## Acceptance Criteria

- A baseline migration exists in `prisma/migrations` and is committed.
- Migration apply is reproducible from clean state.
- Schema changes are blocked unless accompanied by migration artifacts.
- Google sync remains pull-only with no timing-scope expansion this week.
- Decision Log updated with risk and rollback posture.

## Risks and Mitigations

- Risk: Unknown drift between local databases.
  - Mitigation: migration-first enforcement and clean-state validation.
- Risk: Sync instability from OAuth or Google API failures.
  - Mitigation: explicit failure-path validation and logging verification.
- Risk: Scope pressure to add automated sync logic during stability week.
  - Mitigation: explicit out-of-scope guardrails and deferment to next gate.

## Rollback Position

- If migration baseline introduces instability:
  - Revert the baseline commit.
  - Restore database from latest local backup/snapshot.
  - Regenerate corrected migration in a new branch and re-validate.
- If sync reliability regresses:
  - Keep sync entrypoint manual-only in operations.
  - Suspend optional auto-sync usage guidance until defects are corrected.
