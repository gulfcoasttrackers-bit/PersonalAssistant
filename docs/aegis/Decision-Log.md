# Aegis Decision Log

Project: Personal Assistant
Owner: PM
Last Updated: 2026-05-04

Use one section per governed item (feature, integration, release, or external transaction workflow).

## Entry Template
- Item ID:
- Date:
- Scope Summary:
- Current Gate (0-5):
- PM Decision:
- Finance/Compliance Decision:
- Cyber Decision:
- Lead PA Decision:
- User Approval/Waiver:
- Risks Accepted:
- Rollback Plan:
- Evidence Links:
- Notes:

---

## Entry 001 — Initial Aegis Registration

- Item ID: PA-001
- Date: 2026-05-02
- Scope Summary: Register Personal Assistant under Aegis Solo governance. App is in progress. Core features delivered: Today view, Projects, Tasks with subtasks, Priority levels, Calendar, Quick-entry (⌘K), JWT auth via NextAuth. Optional Google Calendar sync not yet configured. Runs on port 3000 against local PostgreSQL on port 5432.
- Current Gate: 1 — Build Readiness
- PM Decision: Gate 0 and Gate 1 satisfied. Objective, scope, tech stack, API shape, and security notes documented in README. No paid services in use. Effort is owner sweat equity.
- Finance/Compliance Decision: PENDING — No external contracts. Google Calendar OAuth is optional and requires user-supplied credentials; no capital call required. Gate 2 packet to be completed if OAuth or any paid integration is activated.
- Cyber Decision: PENDING — Gate 3 formal signoff required. Passwords bcrypt-hashed (cost 12). All API routes validate ownership via JWT. Input validated with Zod on every route. Binds to localhost:3000 only.
- Lead PA Decision: PENDING — Gate 4 required before any production-equivalent deployment.
- User Approval/Waiver: Active — App running in local dev mode. Google Calendar sync explicitly optional and deferred.
- Risks Accepted: JWT strategy (no session table); acceptable for local-only use. Google Calendar credentials not configured.
- Rollback Plan: npm run db:push is non-destructive for schema changes. Previous schema can be restored via Prisma migration history.
- Evidence Links: README.md · prisma/schema.prisma · src/lib/auth.ts
- Notes: NEXTAUTH_SECRET must be a strong random value before any non-local deployment.

---

## Entry 002 — Gate Advancement Approval

- Item ID: PA-001
- Date: 2026-05-04
- Scope Summary: Advance Personal Assistant through Gate 2 (Compliance), Gate 3 (Security), and Gate 4 (Release Approval) for local self-hosted operation on localhost:3000 with local PostgreSQL.
- Current Gate: 4 — Release Approved
- PM Decision: Approve advancement. Validation work completed and governance artifacts updated.
- Finance/Compliance Decision: APPROVED — No external funding dependency for current scope. Optional Google OAuth remains user-managed and non-blocking.
- Cyber Decision: APPROVED — Session ownership checks and input validation confirmed across API routes; build-time type safety issues corrected.
- Lead PA Decision: APPROVED — Release readiness confirmed via successful production build after remediation and clean rebuild.
- User Approval/Waiver: Requested gate advancement completed.
- Risks Accepted: Local monitoring only (no centralized alerting). Public exposure remains out of scope pending separate review.
- Rollback Plan: Revert to prior commit and restore previous schema/state as needed; continue local-only deployment posture.
- Evidence Links: docs/aegis/Gate-2-Compliance-Packet.md · docs/aegis/Gate-3-Security-Signoff.md · docs/aegis/Gate-4-Release-Approval.md · src/app/api/calendar/sync/route.ts · src/app/api/user/password/route.ts
- Notes: Node v20.20.2 used for verification. Cleared route/module build issue by rebuilding from a clean `.next` state.

---

## Entry 003 — Stability Decisions (Migration + Google Sync Timing)

- Item ID: PA-002
- Date: 2026-05-12
- Scope Summary: Finalize the database migration operating model and lock Google Calendar sync timing to prevent scope drift during current stability week.
- Current Gate: 4 — Release Approved (stability hardening cycle)
- PM Decision: APPROVED — Migration path is now migration-history-first (baseline migration + migrate dev/deploy). Google sync remains read-first manual pull only this week; no background or bi-directional expansion.
- Finance/Compliance Decision: APPROVED — No additional paid integration or contract required for this scope. Optional Google integration remains user-managed.
- Cyber Decision: APPROVED WITH CONSTRAINTS — Maintain authenticated-only sync route, preserve local secret hygiene, and validate token refresh/error handling before any sync expansion.
- Lead PA Decision: APPROVED — Execute stability sequence this week; defer feature expansion until acceptance criteria pass.
- User Approval/Waiver: Requested PM-run stability decisions delivered as memo + execution sequence.
- Risks Accepted: Temporary deferral of expanded sync automation in exchange for reduced drift risk and stronger rollback posture.
- Rollback Plan: Revert to previous commit and prior local DB state if baseline migration validation fails; keep Google sync in manual mode only.
- Evidence Links: docs/aegis/Stability-Decision-Memo-2026-05-12.md · prisma/schema.prisma · src/app/api/calendar/sync/route.ts · src/lib/auth.ts
- Notes: Any attempt to introduce background sync, write-sync, or multi-calendar logic before baseline migration and regression completion is out of scope.

---

## Entry 004 — Stability Decisions Refresh (Week Of 2026-06-09)

- Item ID: PA-003
- Date: 2026-06-09
- Scope Summary: Reconfirm and operationalize this week's stability priorities by finalizing the Prisma migration baseline path and constraining Google sync timing to prevent scope drift.
- Current Gate: 4 — Release Approved (stability hardening cycle)
- PM Decision: APPROVED — Migration history is mandatory source of schema truth this week. Baseline migration must be created and committed before any additional schema or sync-scope changes.
- Finance/Compliance Decision: APPROVED — No new paid integrations or vendor commitments required for this week's scope.
- Cyber Decision: APPROVED WITH CONSTRAINTS — Keep sync authenticated, pull-only, and constrained to existing timing model; no new background/webhook/bi-directional behaviors in this cycle.
- Lead PA Decision: APPROVED — Execute implementation sequence in docs/aegis/Stability-Decision-Memo-2026-06-09.md and defer sync expansion until acceptance criteria are met.
- User Approval/Waiver: PM-directed weekly stability decision run requested and delivered.
- Risks Accepted: Temporary feature deferral to reduce migration drift risk and preserve rollback reliability.
- Rollback Plan: Revert migration baseline commit and restore prior local DB state if baseline validation fails; keep Google sync manual pull-only until defects are remediated.
- Evidence Links: docs/aegis/Stability-Decision-Memo-2026-06-09.md · prisma/schema.prisma · src/app/api/calendar/sync/route.ts · src/components/CalendarAutoSyncAgent.tsx
- Notes: Baseline migration created and applied on 2026-06-09 as prisma/migrations/20260609110606_baseline_2026_06_09/migration.sql; migrate deploy validation returned no pending migrations.
