# YTC Roadmap Realignment Decision

Date: 2026-08-13
Owner: PM (@piper)
Status: Approved

## Decision
Re-sequence YTC work so sync reliability and dashboard stability are completed before expanding monetization-stack tasks.

## Why
Current cycle evidence shows Sync Playback still depends on a better-matched GPX/video pair and dashboard load behavior still needs cleanup work. Expanding monetization setup before those checkpoints increases execution risk.

## Execution Order
1. Immediate: complete sync reliability validation with realistic-overlap media.
2. Immediate: finish dashboard load-path stabilization and remove major load-time failures.
3. Immediate: complete checklist evidence capture for core runtime and manager workflows.
4. Deferred next wave: lead capture flow setup and sponsor-intake deployment.
5. Deferred next wave: affiliate-link optimization and related monetization polish.

## Gate To Exit Deferral
Deferred monetization tasks can move back into active execution when both are true:
- at least one realistic-overlap sync flow passes Create Sync Record and Load Sync Timeline;
- dashboard load behavior is stable enough for clean readiness validation.

## Calendar Alignment
Lead-capture and sponsor-intake blocks were moved to a later next-wave window in the all-inclusive governance calendar.
