import { z } from "zod";

const activityTypeSchema = z.enum(["sailing", "biking", "running"]);
const distanceUnitSchema = z.enum(["mi", "km"]);
const speedUnitSchema = z.enum(["mph", "kph"]);
const paceUnitSchema = z.enum(["min/mi", "min/km"]);
const elevationUnitSchema = z.enum(["ft", "m"]);
const temperatureUnitSchema = z.enum(["F", "C"]);
const cornerSchema = z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]);
const expeditionLocationKindSchema = z.enum(["location", "area"]);
const expeditionTypeSchema = z.enum(["bike", "boat", "sailing", "running", "other"]);
const expeditionTrackPlanSchema = z
  .object({
    mode: z.enum(["boundary", "route", "tbd"]),
    reference: z.string().min(1).optional(),
    notes: z.string().min(1).optional(),
  })
  .strict();

const expeditionPlannerSchema = z
  .object({
    locationLabel: z.string().min(1),
    locationKind: expeditionLocationKindSchema,
    plannedDates: z.array(z.string().date()).min(1),
    equipment: z.array(z.string().min(1)).min(1),
    expeditionType: expeditionTypeSchema,
    trackPlan: expeditionTrackPlanSchema,
  })
  .strict();

const sessionKeyPattern = /^\d{8}_[A-Z]+_[A-Z0-9]+_\d{2}$/;

const videoSourceSchema = z
  .object({
    path: z.string().min(1),
    fileName: z.string().min(1),
    format: z.enum(["mp4"]),
    codec: z.enum(["h264", "h265"]),
    frameRate: z.number().positive(),
    resolution: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    capturedAt: z.string().datetime(),
    durationSeconds: z.number().positive(),
    timezone: z.string().min(1),
    pov: z.literal(true),
  })
  .strict();

const gpsTrackSchema = z
  .object({
    path: z.string().min(1),
    format: z.literal("gpx"),
    version: z.literal("1.1"),
    timezone: z.literal("UTC"),
    pointCount: z.number().int().positive(),
    hasElevation: z.boolean(),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
  })
  .strict();

const dataStreamSchema = z
  .object({
    path: z.string().min(1),
    format: z.enum(["fit", "csv", "json"]),
    source: z.string().min(1),
    startedAt: z.string().datetime().optional(),
    endedAt: z.string().datetime().optional(),
  })
  .strict();

const overlayLayoutSchema = z
  .object({
    background: z.literal("pov-video"),
    corners: z
      .object({
        topLeft: z.object({ panel: z.literal("performance") }).strict(),
        topRight: z.object({ panel: z.literal("health") }).strict(),
        bottomLeft: z.object({ panel: z.literal("map") }).strict(),
        bottomRight: z.object({ panel: z.literal("auxiliary") }).strict(),
      })
      .strict(),
    readabilityTargets: z
      .object({
        desktop1080p: z.literal(true),
        mobilePreview: z.literal(true),
      })
      .strict(),
  })
  .strict();

const sailingAuxSchema = z
  .enum(["wind-shift-delta", "current-set-drift", "layline-indicator", "tide-state", "heel-angle"])
  .array()
  .max(6);

const bikingAuxSchema = z
  .enum(["elevation-profile", "segment-pr-status", "rolling-30s-power", "temperature"])
  .array()
  .max(6);

const runningAuxSchema = z
  .enum(["elevation-profile", "last-3-splits", "rolling-pace-trend", "temperature", "vo2-estimate"])
  .array()
  .max(6);

const sportOverlaySchema = z.discriminatedUnion("activityType", [
  z
    .object({
      activityType: z.literal("sailing"),
      performanceFields: z
        .enum(["boat-speed", "vmg", "true-wind-speed", "true-wind-angle", "heading", "tack-gybe-count"])
        .array()
        .min(1),
      healthFields: z.enum(["heart-rate", "heart-rate-zone", "elapsed-time", "calorie-burn"]).array().min(1),
      auxiliaryFields: sailingAuxSchema,
    })
    .strict(),
  z
    .object({
      activityType: z.literal("biking"),
      performanceFields: z
        .enum(["speed", "power", "cadence", "gear", "gradient", "distance-covered"])
        .array()
        .min(1),
      healthFields: z.enum(["heart-rate", "heart-rate-zone", "power-zone", "elapsed-time", "calorie-burn"]).array().min(1),
      auxiliaryFields: bikingAuxSchema,
    })
    .strict(),
  z
    .object({
      activityType: z.literal("running"),
      performanceFields: z
        .enum(["pace", "speed", "cadence", "stride-length", "distance-covered"])
        .array()
        .min(1),
      healthFields: z.enum(["heart-rate", "heart-rate-zone", "vo2-estimate", "elapsed-time", "calorie-burn"]).array().min(1),
      auxiliaryFields: runningAuxSchema,
    })
    .strict(),
]);

export const youtubeSessionManifestSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    sessionKey: z.string().regex(sessionKeyPattern, "Expected YYYYMMDD_ACTIVITY_LOCATION_SEQUENCE"),
    activityType: activityTypeSchema,
    timezone: z.string().min(1),
    athleteId: z.string().min(1),
    channelId: z.string().min(1),
    titleCandidate: z.string().min(1),
    expeditionPlan: expeditionPlannerSchema.optional(),
    unitsProfile: z
      .object({
        distance: distanceUnitSchema,
        speed: speedUnitSchema,
        pace: paceUnitSchema,
        elevation: elevationUnitSchema,
        temperature: temperatureUnitSchema,
      })
      .strict(),
    inputBundle: z
      .object({
        video: videoSourceSchema,
        gpsTrack: gpsTrackSchema,
        heartRateStream: dataStreamSchema.optional(),
        powerCadenceStream: dataStreamSchema.optional(),
        environmentStream: dataStreamSchema.optional(),
      })
      .strict(),
    sync: z
      .object({
        anchorStrategy: z.enum(["first-common-timestamp"]),
        maxDesyncSeconds: z.number().positive().max(2),
        maxTelemetryGapSeconds: z.number().int().positive().max(10),
        allowLinearDriftCorrection: z.boolean(),
        allowNonlinearWarping: z.literal(false),
      })
      .strict(),
    overlayLayout: overlayLayoutSchema,
    sportOverlay: sportOverlaySchema,
    publishTargets: z
      .object({
        slotDate: z.string().date(),
        slotTimeLocal: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        thumbnailVariant: z.string().min(1),
        descriptionTemplateId: z.string().min(1),
      })
      .strict(),
    validation: z
      .object({
        ingestPassed: z.boolean(),
        rendererFieldAvailabilityReportPath: z.string().min(1),
        requiredEvidencePaths: z.array(z.string().min(1)).min(3),
      })
      .strict(),
    notes: z.array(z.string().min(1)).default([]),
  })
  .strict()
  .superRefine((manifest, ctx) => {
    if (manifest.activityType !== manifest.sportOverlay.activityType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sportOverlay.activityType must match activityType",
        path: ["sportOverlay", "activityType"],
      });
    }

    if (manifest.sync.allowLinearDriftCorrection !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "allowLinearDriftCorrection must be true for v1.0",
        path: ["sync", "allowLinearDriftCorrection"],
      });
    }

    const requiresHeartRate = manifest.sportOverlay.healthFields.includes("heart-rate");
    if (requiresHeartRate && !manifest.inputBundle.heartRateStream) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "heartRateStream is required when health overlay includes heart-rate",
        path: ["inputBundle", "heartRateStream"],
      });
    }

    const requiresPower = manifest.activityType === "biking" && manifest.sportOverlay.performanceFields.includes("power");
    if (requiresPower && !manifest.inputBundle.powerCadenceStream) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "powerCadenceStream is required for biking manifests with power overlay",
        path: ["inputBundle", "powerCadenceStream"],
      });
    }
  });

export type YoutubeSessionManifest = z.infer<typeof youtubeSessionManifestSchema>;

export function parseYoutubeSessionManifest(input: unknown): YoutubeSessionManifest {
  return youtubeSessionManifestSchema.parse(input);
}

export function safeParseYoutubeSessionManifest(input: unknown) {
  return youtubeSessionManifestSchema.safeParse(input);
}

export const overlayCornerOrder: readonly z.infer<typeof cornerSchema>[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];
