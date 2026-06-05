# Personal Assistant Stability Decision Memo

Date: 2026-05-12  
Owner: PM (@piper)  
Scope: This-week stability decisions for database migration path and Google sync timing.

## Decision Summary

Decision 1: Finalize DB migration path with Prisma migration history as the only source of schema truth.

- Approved path:
  - Stop using db push for normal schema evolution.
  - Create and commit a baseline migration from current schema.
  - Use migrate dev for local schema changes.
  - Use migrate deploy for release/deployment execution.
- Rationale:
  - Current project has no checked-in migration history, which increases drift risk and weakens rollback confidence.
  - Governance and release checks are stronger with explicit SQL history in version control.

Decision 2: Defer Google Calendar write-sync and broad automation until migration baseline and core reliability checks are complete.

- Approved timing:
  - Keep Google integration in read-first, manually triggered sync mode this week.
  - Do not add recurring background sync, bi-directional sync, webhook ingestion, or conflict-resolution logic this week.
  - Re-open expanded sync scope only after migration baseline, regression pass, and observability checkpoints are complete.
- Rationale:
  - Existing Google sync route already performs token refresh and import upsert behavior; adding background/bi-directional behavior now would create high drift risk in both data and schedule.
  - Stability objective is better served by hardening current behavior and preserving a narrow release envelope.

## Scope Guardrails (Effective Immediately)

- In scope this week:
  - Migration baseline and process normalization.
  - Reliability fixes for existing endpoints only.
  - Sync hardening for current GET import path only (timeouts, errors, and idempotency validation).
- Out of scope this week:
  - New calendar UX flows.
  - Push sync to Google.
  - Background jobs/queues/cron workers.
  - Multi-calendar support or cross-account merge logic.

## Implementation Sequence (This Week)

1. Stabilization kickoff (Day 1)
   - Freeze schema-changing feature work.
   - Confirm current schema in prisma/schema.prisma reflects production-intent local state.
   - Record this memo and the decision-log entry before execution.

2. Migration baseline creation (Day 1)
   - Generate initial migration from current schema and commit under prisma/migrations.
   - Validate on a clean database: migrate deploy succeeds end-to-end.
   - Keep db push available for emergency local recovery only, not default flow.

3. Process switch enforcement (Day 2)
   - Update team runbook/README usage from db push-first to migrate-first.
   - Add pre-merge checklist item: schema changes require migration files.
   - Reject schema PRs that change schema.prisma without a matching migration directory.

4. Google sync hardening pass (Day 2-3)
   - Keep sync entrypoint manual and authenticated.
   - Add/verify defensive handling for token refresh failures and Google API non-200 responses.
   - Validate idempotent upsert behavior with repeated imports.
   - Verify all-day event timezone handling with regression checks.

5. Reliability validation (Day 3-4)
   - Run focused regression for Tasks, Projects, Events, Auth, and Calendar import.
   - Confirm no schema drift between developer environments after fresh clone + migrate deploy.
   - Reconfirm local-only security posture and secret handling requirements.

6. Weekly closeout and gate decision (Day 5)
   - Publish outcome summary: migration baseline status, sync stability findings, open risks.
   - If all acceptance criteria pass, approve next-week decision point for optional sync expansion.
   - If criteria fail, continue freeze and defer sync expansion by one sprint.

## Acceptance Criteria

- A committed migration baseline exists and applies cleanly via migrate deploy.
- No schema changes merge without migration artifacts.
- Calendar sync route remains operational and idempotent for repeated pulls.
- No new background sync scope lands this week.
- Decision log updated with explicit risk and rollback notes.

## Risks and Mitigations

- Risk: Hidden local schema drift across machines.
  - Mitigation: clean-db migration validation and migration-only merge policy.
- Risk: OAuth token edge cases cause flaky imports.
  - Mitigation: explicit refresh-failure handling and controlled manual execution.
- Risk: Scope pressure to add auto-sync quickly.
  - Mitigation: enforce out-of-scope list and defer expansion to next decision gate.

## Rollback Position

- If migration baseline causes instability, revert to last known good commit, restore database from local backup, and re-run with corrected baseline SQL.
- If sync reliability degrades, disable sync entrypoint exposure in UI and retain local event operations while remediating.
