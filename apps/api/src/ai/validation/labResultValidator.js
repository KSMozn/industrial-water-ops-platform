import { z } from "zod";

/**
 * Lab-result validation pipeline.
 *
 * The AI provider returns a candidate object; this module is the SOLE source
 * of truth for whether that object is safe to act on. The pipeline is:
 *   1. Shape — parse into a strict Zod schema (drops unknown keys, coerces types)
 *   2. Range — every numeric reading must sit inside a physically plausible window
 *      (a model that says ph=42 is hallucinating, not flagging an issue)
 *   3. Threshold — compare each reading to the configured operating band and
 *      emit anomalies with severity
 *   4. Suggested actions — derive deterministically from anomalies
 *   5. Confidence — coverage of expected fields × (1 - validation error rate)
 *
 * Steps 3-4 are intentionally NOT done by the model. The model parses; the
 * platform decides. This means a prompt regression or jailbreak cannot make
 * the platform recommend the wrong chemical dose.
 */

// Physical plausibility windows — outside this range we treat the reading as
// invalid (bad transcription, wrong unit, hallucinated value).
export const PLAUSIBILITY = {
  ph:           { min: 0, max: 14 },
  conductivity: { min: 0, max: 200000 }, // µS/cm — seawater ~50000
  chlorine:     { min: 0, max: 20 },     // mg/L
  turbidity:    { min: 0, max: 4000 },   // NTU
  iron:         { min: 0, max: 50 },     // mg/L
  hardness:     { min: 0, max: 2000 },   // mg/L as CaCO3
};

// Operating thresholds — values OUTSIDE these are flagged. Severity is a
// function of how far outside. In production these would be per-site and
// stored in the DB; for the POC they are constants.
export const THRESHOLDS = {
  ph:           { min: 6.5, max: 8.5, unit: "" },
  conductivity: { min: 0,   max: 1500, unit: "µS/cm" },
  chlorine:     { min: 0.2, max: 4,    unit: "mg/L" },
  turbidity:    { min: 0,   max: 5,    unit: "NTU" },
  iron:         { min: 0,   max: 0.3,  unit: "mg/L" },
  hardness:     { min: 0,   max: 200,  unit: "mg/L" },
};

const NumericReading = z.union([z.number(), z.null()]).optional();

const ShapeSchema = z.object({
  ph:           NumericReading,
  conductivity: NumericReading,
  chlorine:     NumericReading,
  turbidity:    NumericReading,
  iron:         NumericReading,
  hardness:     NumericReading,
  notes:        z.string().optional().nullable(),
});

const PARAMETERS = ["ph", "conductivity", "chlorine", "turbidity", "iron", "hardness"];

function severity(value, threshold) {
  const span = threshold.max - threshold.min || 1;
  const overshoot = value > threshold.max ? value - threshold.max : threshold.min - value;
  const ratio = overshoot / span;
  if (ratio > 1) return "critical";
  if (ratio > 0.25) return "high";
  return "medium";
}

const ACTIONS = {
  ph:           (v, t) => v < t.min
    ? { action: "Increase alkalinity dosing (soda ash)", rationale: `pH ${v} below ${t.min}` }
    : { action: "Reduce alkalinity dosing or add acid", rationale: `pH ${v} above ${t.max}` },
  chlorine:     (v, t) => v < t.min
    ? { action: "Increase chlorine dosing; investigate residual demand", rationale: `Free Cl ${v} below ${t.min} mg/L` }
    : { action: "Reduce chlorine dosing", rationale: `Free Cl ${v} above ${t.max} mg/L` },
  turbidity:    (v, t) => ({ action: "Backwash filter and inspect media", rationale: `Turbidity ${v} NTU above ${t.max}` }),
  iron:         (v, t) => ({ action: "Schedule iron removal media regen / replacement", rationale: `Fe ${v} above ${t.max} mg/L` }),
  hardness:     (v, t) => ({ action: "Regenerate softener / check brine tank", rationale: `Hardness ${v} above ${t.max} mg/L CaCO3` }),
  conductivity: (v, t) => ({ action: "Check RO membrane performance; verify TDS feed", rationale: `Conductivity ${v} µS/cm above ${t.max}` }),
};

/**
 * @returns {{
 *   ok: boolean,
 *   readings: Record<string, number|null>,
 *   anomalies: Array<{parameter:string,value:number,threshold:object,severity:string,message:string}>,
 *   suggestedActions: Array<{action:string,rationale:string}>,
 *   confidence: number,
 *   errors: Array<{path:string,message:string}>,
 * }}
 */
export function validateLabExtraction(candidate) {
  const errors = [];

  // 1. Shape
  const parsedShape = ShapeSchema.safeParse(candidate ?? {});
  if (!parsedShape.success) {
    return {
      ok: false,
      readings: {},
      anomalies: [],
      suggestedActions: [],
      confidence: 0,
      errors: parsedShape.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }
  const data = parsedShape.data;

  // 2. Plausibility
  const readings = {};
  for (const param of PARAMETERS) {
    const value = data[param];
    if (value === null || value === undefined) {
      readings[param] = null;
      continue;
    }
    const { min, max } = PLAUSIBILITY[param];
    if (value < min || value > max) {
      errors.push({ path: param, message: `Value ${value} outside plausibility range [${min}, ${max}]` });
      readings[param] = null;
    } else {
      readings[param] = value;
    }
  }

  // 3. Thresholds
  const anomalies = [];
  for (const param of PARAMETERS) {
    const v = readings[param];
    if (v === null) continue;
    const t = THRESHOLDS[param];
    if (v < t.min || v > t.max) {
      anomalies.push({
        parameter: param,
        value: v,
        threshold: t,
        severity: severity(v, t),
        message: `${param} ${v}${t.unit ? " " + t.unit : ""} outside operating range [${t.min}, ${t.max}]`,
      });
    }
  }

  // 4. Suggested actions — deterministic, derived from anomalies only.
  const suggestedActions = anomalies.map((a) => ACTIONS[a.parameter](a.value, a.threshold));

  // 5. Confidence — field coverage × (1 - error penalty), bounded [0, 1].
  const coverage = PARAMETERS.filter((p) => readings[p] !== null).length / PARAMETERS.length;
  const errorPenalty = Math.min(0.5, errors.length * 0.1);
  const confidence = Math.max(0, Math.min(1, coverage * (1 - errorPenalty)));

  return {
    ok: errors.length === 0,
    readings,
    anomalies,
    suggestedActions,
    confidence,
    errors,
  };
}
