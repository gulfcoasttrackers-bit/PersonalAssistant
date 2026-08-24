# YouTube Creator Revenue Lane Execution Board

Date: 2026-06-24
Prepared by: PM (@piper)
Scope: This week execution window (2026-06-24 to 2026-06-28)
Priority: P0 (portfolio first-priority lane)

## Mission (This Week)

Lock publish cadence, finalize GPX-video sync SOP, and deploy monetization rails so the YouTube lane is revenue-ready with auditable operating evidence.

## Owner Assignments, Due Dates, and Acceptance Criteria

| Workstream | Owner | Due Date | Acceptance Criteria |
|---|---|---|---|
| Publish Cadence Lock | YTC Team Lead | 2026-06-24 (EOD) | 1) Cadence doc published with next 4 upload slots (dates + publish times + topic placeholders). 2) Backup owner assigned for each slot. 3) Miss policy defined: if T-24h readiness is Red, slot auto-switches to backup queue item. |
| Weekly Content Slotting | Content Producer | 2026-06-25 (12:00 local) | 1) Four script/outline stubs linked to the four locked slots. 2) Each stub has target runtime, hook line, CTA, and title candidate. 3) All four stubs are approved by YTC Team Lead as Green/Amber/Red. |
| Edit + Upload Runbook | Video Editor | 2026-06-25 (EOD) | 1) Checklist finalized for ingest, rough cut, final cut, thumbnail, metadata, and upload QA. 2) Layout preset finalized: first-person POV event footage as background with four-corner overlay frame. 3) First scheduled video passes checklist with zero open critical items, and checklist location is shared in weekly report-back. |
| GPX-Video Sync SOP v1.0 | Ops Engineer (GPX Pipeline) | 2026-06-26 (12:00 local) | 1) SOP published with exact timeline alignment method (GPX timestamp normalization, drift tolerance, and marker strategy). 2) Includes failure modes and recovery playbook (missing points, timezone mismatch, corrupted GPX). 3) Overlay mapping rules are documented: top-left performance stats, top-right health stats, bottom-left map, bottom-right additional telemetry/insights block. 4) Dry run completed on one sample video and one live candidate with timestamped proof notes. |
| GPX QA Validation Gate | QA Lead | 2026-06-26 (EOD) | 1) Validation checklist executed on at least 2 assets (sample + live). 2) Pass thresholds met: route continuity >= 99%, desync <= 2.0s over full timeline, no unreconciled gap > 10s. 3) Overlay readability gate passes at 1080p and mobile preview (all four corners legible, no critical occlusion of POV action). 4) Gate decision logged (Go/Hold) with issue IDs for any defects. |
| Monetization Rails: Offers + Links | Monetization Ops Lead | 2026-06-27 (12:00 local) | 1) Description template finalized with affiliate/disclosure block and canonical tracking params. 2) Link map validated (no broken links, no duplicate UTM key collisions). 3) Offer rotation matrix published for the next 4 videos. |
| Monetization Rails: Channel Compliance | Compliance Owner | 2026-06-27 (EOD) | 1) Disclosure language and placement approved for video description and pinned comment. 2) Copyright-safe media/source policy attached to runbook. 3) Compliance signoff note posted with date and approver. |
| Revenue Instrumentation + Dashboard | Analytics Lead | 2026-06-28 (12:00 local) | 1) Baseline dashboard live with views, CTR, watch time, RPM/estimated revenue proxy, link CTR, conversion proxy. 2) Per-video tracking key convention documented and in use. 3) Daily snapshot export path defined and tested. |
| PM Cutover Readiness Review | PM (@piper) + YTC Team Lead | 2026-06-28 (EOD) | 1) All above workstreams have evidence links and status. 2) At least one fully compliant monetized publish goes live under new SOP. 3) Week closeout states: what shipped, what slipped, and Week+1 corrective actions. |

## Weekly Cadence (Locked)

- Slot 1: 2026-06-25 at 18:00 local
- Slot 2: 2026-06-26 at 18:00 local
- Slot 3: 2026-06-27 at 11:00 local
- Slot 4: 2026-06-28 at 18:00 local

Rule: No slot moves unless YTC Team Lead marks the slot Red and PM approves reassignment to backup queue.

## GPX-Video Sync SOP Required Sections

- Input contract: required GPX schema fields, timezone source of truth, and naming standard.
- Sync method: timestamp alignment sequence and drift correction method.
- Overlay layout spec: first-person POV footage full-screen background plus four-corner HUD.
- Corner assignments: top-left performance stats, top-right health stats, bottom-left route map, bottom-right available auxiliary data (weather, elevation delta, cadence trend, split markers, or event notes).
- QA thresholds: continuity, desync, and gap tolerances.
- Exception handling: missing/corrupt GPX, clock skew, dropped frames.
- Evidence protocol: before/after screenshots, timeline markers, and validation log.

## Expedition Planner Required Sections

Use this intake before capture so media can be framed and named against the resulting GPX track.

- Location or area selection: exact place name plus an area label when the capture is not point-specific.
- Planned date(s): one or more target capture dates.
- Equipment: camera, vessel, bike, wearable, and any other capture or navigation gear.
- Activity type: biking, sailing, running, or the closest supported type.
- Track plan mode: boundary, route, or tbd when the capture geometry is not finalized.
- Notes: any route constraints, boundary notes, or staging details needed before sync.

## Four-Corner Overlay Field Map (By Sport)

Corner positions are fixed. Data fields in each corner swap by activity type detected at ingest.

### Top-Left — Performance Stats

| Sport | Fields |
|---|---|
| Sailing | Boat speed (kts), VMG (kts), true wind speed (kts), true wind angle (°), heading (°), tack/gybe count |
| Biking | Speed (mph/kph), power (W), cadence (rpm), gear, gradient (%), distance covered |
| Running | Pace (min/mi or min/km), speed (mph/kph), cadence (spm), stride length, distance covered |

### Top-Right — Health Stats

| Sport | Fields |
|---|---|
| Sailing | Heart rate (bpm), heart rate zone, elapsed time, calorie burn estimate |
| Biking | Heart rate (bpm), heart rate zone, power zone, elapsed time, calorie burn |
| Running | Heart rate (bpm), heart rate zone, VO2 estimate, elapsed time, calorie burn |

### Bottom-Left — Route Map

All sports: live GPS trace on course map with current position marker, start/finish pins, and elapsed distance scale bar. Zoom level auto-adjusts to fit full route in frame with current position centered.

### Bottom-Right — Auxiliary / Sport-Specific Insights

| Sport | Fields |
|---|---|
| Sailing | Wind direction arrow + shift delta, current set/drift, layline indicator, tide state, heel angle |
| Biking | Elevation profile with current position marker, segment PR status, rolling 30s power, temperature |
| Running | Elevation profile with current position marker, split table (last 3 splits), rolling pace trend, temperature |

### Auto-Switch Rules

- Activity type is detected from GPX activity tag or file name convention at ingest.
- If type is ambiguous, defaults to the field set that matches the most available data channels.
- Any field with no data source returns a dash placeholder — no empty boxes.
- Bottom-right block supports up to 6 rows; overflow fields are hidden (not truncated).

## Data Source Contract (Overlay Build Spec)

### Canonical Inputs

| Input Artifact | Format | Required | Source | Notes |
|---|---|---|---|---|
| POV video | mp4 (H.264/H.265) | Yes | Action camera / phone camera export | Must include original creation timestamp and frame rate metadata. |
| GPS track | gpx 1.1 | Yes | Device export (Garmin/Wahoo/Strava/raw) | UTC timestamps required per point for sync. |
| Activity descriptor | json or csv | Yes | Ingest manifest | Includes activity type, timezone, units profile, and athlete/channel ID. |
| Heart rate stream | fit/csv/json | Optional (required for health panel) | Wearable export (Garmin/Apple/Polar) | If missing, health fields render with dash placeholder. |
| Power/cadence stream | fit/csv/json | Optional (bike focus) | Power meter/head unit export | Supports sparse data with interpolation disabled by default. |
| Environmental stream | json/csv | Optional | Weather API / marine feed / onboard sensors | Used for wind, tide, and temperature overlays. |

### Required GPX Fields

| GPX Field | Required | Type | Unit | Validation Rule |
|---|---|---|---|---|
| time | Yes | ISO8601 timestamp | UTC | Monotonic ascending; no duplicate adjacent timestamps. |
| lat | Yes | float | degrees | Range -90 to 90. |
| lon | Yes | float | degrees | Range -180 to 180. |
| ele | Optional | float | meters | If absent, elevation-derived metrics disabled. |
| speed (derived) | Derived | float | m/s | Derived from distance/time when native speed unavailable. |

### Overlay Field-to-Source Mapping

| Overlay Field | Primary Source | Fallback Source | Unit/Format |
|---|---|---|---|
| Speed / pace | FIT speed or GPX-derived speed | Video metadata pace proxy disabled (no synthetic fill) | mph/kph or min/mi/min/km |
| Distance covered | GPX cumulative distance | None | mi/km |
| Heart rate | HR stream | None | bpm + zone |
| Cadence | Cadence stream | None | rpm (bike) / spm (run) |
| Power | Power stream | None | watts |
| Map trace + current marker | GPX track + current timestamp cursor | None | tile map + polyline |
| Elevation profile | GPX ele series | DEM enrichment (optional) | feet/meters |
| Wind metrics (sailing) | Marine/environment feed | Onboard sensor export | knots + degrees |
| Tide/current metrics (sailing) | Marine feed | Manual event note feed | text + numeric where available |
| Temperature | Weather feed or device sensor | None | C/F |

### Activity Detection and Units Policy

- Activity type precedence: ingest manifest > GPX activity tag > filename convention.
- Units profile precedence: channel default > athlete profile > explicit ingest override.
- Allowed units: distance (mi/km), speed (mph/kph), pace (min/mi or min/km), elevation (ft/m), temperature (F/C).

### Sync and Timing Contract

- Time anchor: first common timestamp between POV video timeline and GPX stream.
- Sync tolerance: absolute overlay-to-event desync <= 2.0s across full timeline.
- Gap handling: if telemetry gap > 10s, freeze last valid value and show "data gap" indicator.
- Clock skew correction: one linear drift correction pass allowed; no nonlinear warping in v1.0.

### Validation and Acceptance Hooks

- Ingest validator must produce a pass/fail summary before render starts.
- Renderer must output a field-availability report listing every missing optional source.
- QA evidence bundle must include: timeline sync screenshots, 1080p readability captures, and mobile preview captures.

### File Naming and Folder Convention

- Session key: YYYYMMDD_ACTIVITY_LOCATION_SEQUENCE (example: 20260625_BIKE_BAYTRAIL_01).
- Required bundle folder layout:
	- /session-key/video/source.mp4
	- /session-key/telemetry/track.gpx
	- /session-key/telemetry/metrics.(fit|csv|json)
	- /session-key/manifest/session.json
	- /session-key/output/render-v1.mp4

## Monetization Rails Required Components

- Description block template with disclosure and tracked links.
- Pinned comment template and CTA variant matrix.
- Thumbnail-to-title consistency check to protect CTR quality.
- Revenue instrumentation naming convention and dashboard mapping.
- Compliance gate before publish (copyright/disclosure checks).

## Report-Back Template (End of Each Day)

- Owner:
- Workstream:
- Status: Green / Amber / Red
- Completed today:
- Evidence path:
- Blocker:
- Decision needed:
- Next due date:

## Escalation Rules

- Any Red item inside T-24h of a slot escalates immediately to PM (@piper).
- Two Amber days in a row on the same workstream auto-creates a PM decision ticket.
- No publish proceeds without compliance/disclosure checks marked complete.

## Readiness Gap Closure Record (Draft)

Date: 2026-08-13
Prepared by: PM (@piper)
Purpose: Retroactively close the missing YTC readiness evidence gap before monetization work continues.

Rule: This record only closes the gap when every disposition below is filled and each item has an explicit evidence path.

### 1. Slot 1 Readiness Disposition

- Disposition: Green / Amber / Red
- Decision checkpoint: 2026-06-25 18:00 local
- Basis:
- Evidence path:
- Owner signoff:

### 2. Missing 2026-06-25 Sub-Checkpoints

- Weekly Content Slotting: Complete / Incomplete
- Evidence path:

- Edit + Upload Runbook: Complete / Incomplete
- Evidence path:

- 18:00 Readiness Hold Outcome: Held / Not Held
- Evidence path:

### 3. GPX-Video Sync SOP Checkpoint

- SOP v1.0 published: Yes / No
- Evidence path:

- Dry run completed: Yes / No
- Asset used:
- Evidence path:

- QA prep completed: Yes / No
- Evidence path:

- Overall checkpoint disposition: Green / Amber / Red

### 4. PM Close Condition

- Readiness gap status: Open / Closed
- Closure decision date:
- Final evidence bundle path:
- Notes:

- Default posture until completed: YTC remains Amber for monetization-readiness continuation.
