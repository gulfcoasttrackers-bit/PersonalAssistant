'use client'

import { useMemo, useState } from 'react'

type LocationKind = 'location' | 'area'
type ExpeditionType = 'bike' | 'boat' | 'sailing' | 'running' | 'other'
type TrackPlanMode = 'boundary' | 'route' | 'tbd'
type OutputMode = 'expeditionPlan' | 'fullManifest'
type ActivityType = 'sailing' | 'biking' | 'running'

type ExpeditionPlan = {
  locationLabel: string
  locationKind: LocationKind
  plannedDates: string[]
  equipment: string[]
  expeditionType: ExpeditionType
  trackPlan: {
    mode: TrackPlanMode
    reference?: string
    notes?: string
  }
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map(part => part.trim())
    .filter(Boolean)
}

export function ExpeditionPlannerClient() {
  const [locationLabel, setLocationLabel] = useState('')
  const [locationKind, setLocationKind] = useState<LocationKind>('location')
  const [plannedDatesInput, setPlannedDatesInput] = useState('')
  const [equipmentInput, setEquipmentInput] = useState('')
  const [expeditionType, setExpeditionType] = useState<ExpeditionType>('bike')
  const [trackMode, setTrackMode] = useState<TrackPlanMode>('tbd')
  const [trackReference, setTrackReference] = useState('')
  const [trackNotes, setTrackNotes] = useState('')
  const [outputMode, setOutputMode] = useState<OutputMode>('expeditionPlan')
  const [copied, setCopied] = useState(false)

  const plan = useMemo<ExpeditionPlan>(() => {
    const plannedDates = splitLines(plannedDatesInput)
    const equipment = splitLines(equipmentInput)

    return {
      locationLabel: locationLabel.trim(),
      locationKind,
      plannedDates: plannedDates.length > 0 ? plannedDates : [''],
      equipment: equipment.length > 0 ? equipment : [''],
      expeditionType,
      trackPlan: {
        mode: trackMode,
        reference: trackReference.trim() || undefined,
        notes: trackNotes.trim() || undefined,
      },
    }
  }, [equipmentInput, locationKind, locationLabel, plannedDatesInput, trackMode, trackNotes, trackReference, expeditionType])

  const activityTypeForManifest: ActivityType = useMemo(() => {
    if (expeditionType === 'running') return 'running'
    if (expeditionType === 'boat' || expeditionType === 'sailing') return 'sailing'
    return 'biking'
  }, [expeditionType])

  const json = useMemo(() => {
    if (outputMode === 'expeditionPlan') {
      return JSON.stringify(plan, null, 2)
    }

    const firstDate = splitLines(plannedDatesInput)[0] ?? '2026-07-01'
    const sessionDate = firstDate.replace(/-/g, '')
    const sessionLocation = (plan.locationLabel || 'LOCATION').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'LOCATION'
    const activityToken = activityTypeForManifest === 'biking' ? 'BIKE' : activityTypeForManifest === 'sailing' ? 'SAILING' : 'RUN'

    return JSON.stringify(
      {
        schemaVersion: '1.0.0',
        sessionKey: `${sessionDate}_${activityToken}_${sessionLocation}_01`,
        activityType: activityTypeForManifest,
        timezone: 'America/New_York',
        athleteId: 'athlete-id',
        channelId: 'channel-id',
        titleCandidate: `${plan.locationLabel || 'Expedition'} - ${firstDate}`,
        expeditionPlan: plan,
        unitsProfile: {
          distance: 'mi',
          speed: 'mph',
          pace: 'min/mi',
          elevation: 'ft',
          temperature: 'F',
        },
        inputBundle: {
          video: {
            path: '/session-key/video/source.mp4',
            fileName: 'source.mp4',
            format: 'mp4',
            codec: 'h264',
            frameRate: 30,
            resolution: { width: 1920, height: 1080 },
            capturedAt: '2026-07-01T10:00:00.000Z',
            durationSeconds: 3600,
            timezone: 'America/New_York',
            pov: true,
          },
          gpsTrack: {
            path: '/session-key/telemetry/track.gpx',
            format: 'gpx',
            version: '1.1',
            timezone: 'UTC',
            pointCount: 1,
            hasElevation: true,
            startedAt: '2026-07-01T10:00:00.000Z',
            endedAt: '2026-07-01T11:00:00.000Z',
          },
        },
        sync: {
          anchorStrategy: 'first-common-timestamp',
          maxDesyncSeconds: 2,
          maxTelemetryGapSeconds: 10,
          allowLinearDriftCorrection: true,
          allowNonlinearWarping: false,
        },
        overlayLayout: {
          background: 'pov-video',
          corners: {
            topLeft: { panel: 'performance' },
            topRight: { panel: 'health' },
            bottomLeft: { panel: 'map' },
            bottomRight: { panel: 'auxiliary' },
          },
          readabilityTargets: {
            desktop1080p: true,
            mobilePreview: true,
          },
        },
        sportOverlay:
          activityTypeForManifest === 'sailing'
            ? {
                activityType: 'sailing',
                performanceFields: ['boat-speed'],
                healthFields: ['heart-rate'],
                auxiliaryFields: ['tide-state'],
              }
            : activityTypeForManifest === 'running'
              ? {
                  activityType: 'running',
                  performanceFields: ['pace'],
                  healthFields: ['heart-rate'],
                  auxiliaryFields: ['last-3-splits'],
                }
              : {
                  activityType: 'biking',
                  performanceFields: ['speed'],
                  healthFields: ['heart-rate'],
                  auxiliaryFields: ['elevation-profile'],
                },
        publishTargets: {
          slotDate: firstDate,
          slotTimeLocal: '18:00',
          thumbnailVariant: 'v1',
          descriptionTemplateId: 'default-template',
        },
        validation: {
          ingestPassed: false,
          rendererFieldAvailabilityReportPath: '/session-key/output/field-availability.json',
          requiredEvidencePaths: [
            '/session-key/output/sync-proof-1.png',
            '/session-key/output/readability-1080p.png',
            '/session-key/output/readability-mobile.png',
          ],
        },
        notes: ['Replace placeholder IDs and paths before validation.'],
      },
      null,
      2
    )
  }, [activityTypeForManifest, outputMode, plan, plannedDatesInput])
  const canCopy = plan.locationLabel.trim().length > 0 && splitLines(plannedDatesInput).length > 0 && splitLines(equipmentInput).length > 0

  async function copyJson() {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-white">Expedition Planner</h1>
        <p className="text-muted mt-1">Generate the JSON block that feeds the next-release session manifest.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form className="card p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="block text-sm text-white">Location or area</span>
              <input
                className="input w-full"
                value={locationLabel}
                onChange={e => setLocationLabel(e.target.value)}
                placeholder="Example: Pinellas County Trail System"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-white">Location type</span>
              <select className="input w-full" value={locationKind} onChange={e => setLocationKind(e.target.value as LocationKind)}>
                <option value="location">Location</option>
                <option value="area">Area</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-white">Type</span>
              <select className="input w-full" value={expeditionType} onChange={e => setExpeditionType(e.target.value as ExpeditionType)}>
                <option value="bike">Bike</option>
                <option value="boat">Boat</option>
                <option value="sailing">Sailing</option>
                <option value="running">Running</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="block text-sm text-white">Planned date(s)</span>
              <textarea
                className="input w-full resize-none"
                rows={3}
                value={plannedDatesInput}
                onChange={e => setPlannedDatesInput(e.target.value)}
                placeholder={"2026-07-01\n2026-07-03"}
              />
              <p className="text-xs text-subtle">Use one ISO date per line or separate with commas.</p>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="block text-sm text-white">Equipment</span>
              <textarea
                className="input w-full resize-none"
                rows={3}
                value={equipmentInput}
                onChange={e => setEquipmentInput(e.target.value)}
                placeholder={"camera, phone mount, wearable, bike computer"}
              />
              <p className="text-xs text-subtle">List the equipment you need available for capture and sync.</p>
            </label>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <label className="space-y-2 block">
              <span className="block text-sm text-white">Output mode</span>
              <select className="input w-full" value={outputMode} onChange={e => setOutputMode(e.target.value as OutputMode)}>
                <option value="expeditionPlan">Expedition block only</option>
                <option value="fullManifest">Full session manifest template</option>
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-sm text-white">Track plan mode</span>
                <select className="input w-full" value={trackMode} onChange={e => setTrackMode(e.target.value as TrackPlanMode)}>
                  <option value="boundary">Boundary</option>
                  <option value="route">Route</option>
                  <option value="tbd">TBD</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="block text-sm text-white">Reference</span>
                <input
                  className="input w-full"
                  value={trackReference}
                  onChange={e => setTrackReference(e.target.value)}
                  placeholder="GPX draft, map link, or boundary note"
                />
              </label>
            </div>

            <label className="space-y-2 block">
              <span className="block text-sm text-white">Notes</span>
              <textarea
                className="input w-full resize-none"
                rows={4}
                value={trackNotes}
                onChange={e => setTrackNotes(e.target.value)}
                placeholder="Route constraints, staging notes, or capture reminders"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <p className="text-xs text-subtle">
              {outputMode === 'expeditionPlan'
                ? 'The JSON here is the planner block to paste into the manifest.'
                : 'The JSON here is a full manifest template seeded from the planner values.'}
            </p>
            <button type="button" className="btn-primary" onClick={copyJson} disabled={!canCopy}>
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
          </div>
        </form>

        <div className="card p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">JSON output</h2>
              <p className="text-sm text-muted mt-1">
                {outputMode === 'expeditionPlan'
                  ? 'Ready to embed in the session manifest as expeditionPlan.'
                  : 'Ready as a manifest starter. Replace placeholders before parse/validation.'}
              </p>
            </div>
          </div>
          <pre className="bg-black/30 border border-border rounded-xl p-4 overflow-auto text-xs leading-6 text-zinc-200 min-h-[24rem]">
            <code>{json}</code>
          </pre>
          {!canCopy && (
            <p className="text-xs text-amber-400">Fill in location, at least one date, and at least one equipment item to make the JSON useful.</p>
          )}
        </div>
      </div>
    </div>
  )
}