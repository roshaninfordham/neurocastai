import type { CaseInput, TimelineEvent } from "@neurocast/shared";

export interface InferenceRow {
  time_since_lkw_min: number;
  door_to_ct_min: number;
  ct_to_decision_min: number;
  lkw_known: number;
  completeness_score_pct: number;
  missing_items_count: number;
  sbp_max: number;
  sbp_min: number;
  hr_max: number;
  spo2_min: number;
  vitals_variance_score: number;
  doac_present: number;
  wake_up_pattern: number;
  timeline_gap_count: number;
  symptom_count: number;
  severity_score: number;
  case_complexity_score: number;
}

function minutesBetween(t1?: string, t2?: string): number {
  if (!t1 || !t2) return 0;
  const ms = new Date(t2).getTime() - new Date(t1).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

function buildTimelineLookup(events: TimelineEvent[]): Record<string, string | undefined> {
  const map: Record<string, string | undefined> = {};
  for (const evt of events) {
    map[evt.type] = evt.time;
  }
  return map;
}

function computeVitalsStats(vitals: CaseInput["telemetry"]["vitals"]): {
  sbp_max: number;
  sbp_min: number;
  hr_max: number;
  spo2_min: number;
  vitals_variance_score: number;
} {
  const sbpValues = vitals.map((v) => v.sbp ?? 120);
  const hrValues = vitals.map((v) => v.hr ?? 80);
  const spo2Values = vitals.map((v) => v.spo2 ?? 98);

  const sbp_max = Math.max(...sbpValues, 0);
  const sbp_min = Math.min(...sbpValues, 999);
  const hr_max = Math.max(...hrValues, 0);
  const spo2_min = Math.min(...spo2Values, 100);

  // Variance score: range/mean for sbp
  const sbpMean = sbpValues.reduce((a, b) => a + b, 0) / sbpValues.length;
  const sbpRange = sbp_max - sbp_min;
  const vitals_variance_score = sbpMean > 0 ? Math.round((sbpRange / sbpMean) * 100) : 0;

  return { sbp_max, sbp_min, hr_max, spo2_min, vitals_variance_score };
}

function computeCompletenessScore(caseInput: CaseInput): {
  completeness_score_pct: number;
  missing_items_count: number;
} {
  const fields = [
    caseInput.patient?.age,
    caseInput.patient?.sex,
    caseInput.patient?.weightKg,
    caseInput.timeline?.length,
    caseInput.telemetry.vitals?.length,
    caseInput.packet?.rawText,
    caseInput.packet?.hasMedsList,
    caseInput.packet?.hasImagingReport,
    caseInput.facility?.type,
    caseInput.arrivalMode,
  ];

  const present = fields.filter((f) => f !== undefined && f !== null && f !== 0).length;
  const total = fields.length;
  const completeness_score_pct = Math.round((present / total) * 100);
  const missing_items_count = total - present;

  return { completeness_score_pct, missing_items_count };
}

function extractFlags(caseInput: CaseInput): {
  doac_present: number;
  wake_up_pattern: number;
} {
  const text = caseInput.packet.rawText.toLowerCase();
  const doac_present = /apixaban|rivaroxaban|dabigatran|edoxaban|eliquis|xarelto|pradaxa|savaysa/i.test(text)
    ? 1
    : 0;

  const wake_up_pattern = /woke up|wake-up|upon waking|found unresponsive|noticed symptoms on awakening/i.test(text) ? 1 : 0;

  return { doac_present, wake_up_pattern };
}

function computeTimelineGapCount(events: TimelineEvent[]): number {
  if (events.length < 2) return 0;
  let gapCount = 0;
  for (let i = 1; i < events.length; i++) {
    const gap = minutesBetween(events[i - 1].time, events[i].time);
    if (gap > 15) gapCount++;
  }
  return gapCount;
}

export function caseToFeatures(caseInput: CaseInput): InferenceRow {
  const timeline = caseInput.timeline || [];
  const tMap = buildTimelineLookup(timeline);

  const time_since_lkw_min = minutesBetween(
    tMap["LAST_KNOWN_WELL"],
    tMap["ED_ARRIVAL"] || tMap["TRIAGE"]
  );
  const door_to_ct_min = minutesBetween(tMap["ED_ARRIVAL"], tMap["CT_START"]);
  const ct_to_decision_min = minutesBetween(tMap["CT_START"], tMap["DECISION_TIME"]);

  const lkw_known = tMap["LAST_KNOWN_WELL"] ? 1 : 0;

  const completeness = computeCompletenessScore(caseInput);
  const vitalsStats = computeVitalsStats(caseInput.telemetry.vitals);
  const flags = extractFlags(caseInput);

  const timeline_gap_count = computeTimelineGapCount(timeline);
  const symptom_count = caseInput.packet.rawText.split(/symptom|complaint|deficit/i).length - 1;

  // Severity: based on flags and timeline
  const severity_score = (flags.doac_present ? 20 : 0) + (timeline_gap_count * 5);

  // Complexity: missing items + timeline gaps + variance
  const case_complexity_score =
    completeness.missing_items_count * 5 +
    timeline_gap_count * 3 +
    Math.round(vitalsStats.vitals_variance_score / 10);

  return {
    time_since_lkw_min,
    door_to_ct_min,
    ct_to_decision_min,
    lkw_known,
    completeness_score_pct: completeness.completeness_score_pct,
    missing_items_count: completeness.missing_items_count,
    sbp_max: vitalsStats.sbp_max,
    sbp_min: vitalsStats.sbp_min,
    hr_max: vitalsStats.hr_max,
    spo2_min: vitalsStats.spo2_min,
    vitals_variance_score: vitalsStats.vitals_variance_score,
    doac_present: flags.doac_present,
    wake_up_pattern: flags.wake_up_pattern,
    timeline_gap_count,
    symptom_count,
    severity_score,
    case_complexity_score,
  };
}

export function inferenceRowToCsv(row: InferenceRow): string {
  const header = [
    "time_since_lkw_min",
    "door_to_ct_min",
    "ct_to_decision_min",
    "lkw_known",
    "completeness_score_pct",
    "missing_items_count",
    "sbp_max",
    "sbp_min",
    "hr_max",
    "spo2_min",
    "vitals_variance_score",
    "doac_present",
    "wake_up_pattern",
    "timeline_gap_count",
    "symptom_count",
    "severity_score",
    "case_complexity_score",
  ].join(",");

  const values = [
    row.time_since_lkw_min,
    row.door_to_ct_min,
    row.ct_to_decision_min,
    row.lkw_known,
    row.completeness_score_pct,
    row.missing_items_count,
    row.sbp_max,
    row.sbp_min,
    row.hr_max,
    row.spo2_min,
    row.vitals_variance_score,
    row.doac_present,
    row.wake_up_pattern,
    row.timeline_gap_count,
    row.symptom_count,
    row.severity_score,
    row.case_complexity_score,
  ].join(",");

  return `${header}\n${values}`;
}
