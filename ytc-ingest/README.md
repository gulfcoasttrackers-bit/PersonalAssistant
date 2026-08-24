# YTC Ingest Staging

Use this folder for raw test bundles that should stay local and out of git.

Session naming:

- `YYYYMMDD_ACTIVITY_LOCATION_SEQUENCE`
- Example: `20260625_BIKE_BAYTRAIL_01`

Required bundle layout:

- `ytc-ingest/<session-key>/video/source.mp4`
- `ytc-ingest/<session-key>/telemetry/track.gpx`
- `ytc-ingest/<session-key>/telemetry/metrics.fit`
- `ytc-ingest/<session-key>/manifest/session.json`
- `ytc-ingest/<session-key>/output/render-v1.mp4`

For yesterday's sample ride, start with a folder such as:

- `ytc-ingest/20260625_BIKE_<LOCATION>_01/`

If you only have video, photo, and GPX right now, place them like this until the rest of the bundle exists:

- `video/source.mp4`
- `video/source-photo.jpg`
- `telemetry/track.gpx`

Keep original exports unchanged in this staging area.