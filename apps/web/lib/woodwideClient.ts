import type {
  CaseInput,
  NumericMetrics,
  RiskFlag,
  TimelineEvent,
  VitalReading,
} from "@neurocast/shared";

const WOOD_WIDE_URL = process.env.WOOD_WIDE_URL;
const WOOD_WIDE_API_KEY = process.env.WOOD_WIDE_API_KEY;

function minutesBetween(a?: string, b?: string): number | undefined {
  if (!a || !b) return undefined;
  const start = new Date(a).getTime();
  const end = new Date(b).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return undefined;
  return Math.max(0, Math.round((end - start) / 60000));
}

function buildTimelineLookup(timeline: TimelineEvent[]) {
  const map: Record<string, string> = {};
  timeline.forEach((t) => {
    map[t.type] = t.time;
  });
  return map;
}

function localNumericFallback(
  input: CaseInput,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _riskFlags: RiskFlag[]
): NumericMetrics {
  const lookup = buildTimelineLookup(input.timeline);

  const derivedTimers = {
    timeSinceLKWMin: minutesBetween(lookup["LAST_KNOWN_WELL"], new Date().toISOString()),
    doorToCTMin: minutesBetween(lookup["ED_ARRIVAL"], lookup["CT_START"]),
    ctToDecisionMin: minutesBetween(lookup["CT_START"], lookup["DECISION_TIME"]),
    etaToCenterMin: 45,
  };

  const missing: string[] = [];
  if (!lookup["LAST_KNOWN_WELL"]) missing.push("Last known well time not established");
  if (!input.packet.hasMedsList) missing.push("Complete medication list needed");
  if (!lookup["CT_START"]) missing.push("CT imaging not started");
  if (!lookup["CTA_RESULT"]) missing.push("CTA result pending");

  const completenessScore = Math.max(
    0,
    Math.min(
      100,
      100 - missing.length * 10 + (input.packet.hasMedsList ? 5 : 0)
    )
  );

  const vitals: VitalReading[] = input.telemetry.vitals || [];
  const anomalies = [] as NumericMetrics["anomalies"];
  let stabilityStatus: NumericMetrics["stability"]["status"] = "STABLE";

  vitals.forEach((v) => {
    if (v.sbp && v.sbp > 190) {
      anomalies?.push({ name: "High SBP", value: `${v.sbp} mmHg`, severity: "HIGH" });
    }
    if (v.hr && (v.hr > 120 || v.hr < 50)) {
      anomalies?.push({ name: "HR excursion", value: `${v.hr} bpm`, severity: "MED" });
    }
    if (v.spo2 && v.spo2 < 92) {
      anomalies?.push({ name: "Low SpO2", value: `${v.spo2}%`, severity: "MED" });
    }
  });

  if (anomalies && anomalies.length > 0) {
    stabilityStatus = "BORDERLINE";
  }

  // Timeline inconsistency
  const ctBeforeArrival =
    lookup["CT_START"] && lookup["ED_ARRIVAL"] &&
    new Date(lookup["CT_START"]).getTime() < new Date(lookup["ED_ARRIVAL"]).getTime();
  if (ctBeforeArrival) {
    anomalies?.push({ name: "Timeline order", value: "CT before arrival", severity: "HIGH" });
    stabilityStatus = "UNSTABLE";
  }

  return {
    provider: "WOOD_WIDE",
    derivedTimers,
    stability: {
      status: stabilityStatus,
      reasons: anomalies?.map((a) => a.name) ?? [],
    },
    completeness: {
      scorePct: completenessScore,
      missing,
    },
    anomalies,
  };
}

export async function computeNumericMetrics(
  input: CaseInput,
  riskFlags: RiskFlag[]
): Promise<NumericMetrics> {
  // If no API configured, use deterministic fallback
  if (!WOOD_WIDE_URL || !WOOD_WIDE_API_KEY) {
    return localNumericFallback(input, riskFlags);
  }

  const timeline_events = input.timeline.map((t) => ({
    event_type: t.type,
    timestamp: t.time,
    certainty: t.certainty ?? "EXACT",
  }));

  const vitals_stream = (input.telemetry.vitals || []).map((v) => ({
    t: v.time,
    systolic_bp: v.sbp,
    diastolic_bp: v.dbp,
    hr: v.hr,
    spo2: v.spo2,
  }));

  const packet_completeness = [
    { field_name: "hasMedsList", present_bool: Boolean(input.packet.hasMedsList) },
    { field_name: "hasImagingReport", present_bool: Boolean(input.packet.hasImagingReport) },
    { field_name: "lastKnownWell", present_bool: input.timeline.some((t) => t.type === "LAST_KNOWN_WELL") },
    { field_name: "ctStart", present_bool: input.timeline.some((t) => t.type === "CT_START") },
    { field_name: "ctaResult", present_bool: input.timeline.some((t) => t.type === "CTA_RESULT") },
  ];

  const flags = riskFlags.map((f) => ({
    flag_id: f.id,
    severity: f.severity,
    category: f.category,
  }));

  const body = {
    timeline_events,
    vitals_stream,
    packet_completeness,
    flags,
  };

  try {
    const response = await fetch(WOOD_WIDE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WOOD_WIDE_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Wood Wide error ${response.status}`);
    }

    const data = await response.json();

    // Expect data to resemble NumericMetrics fields; validate lightly
    const metrics: NumericMetrics = {
      provider: "WOOD_WIDE",
      derivedTimers: {
        timeSinceLKWMin: data.derivedTimers?.timeSinceLKWMin ?? undefined,
        doorToCTMin: data.derivedTimers?.doorToCTMin ?? undefined,
        ctToDecisionMin: data.derivedTimers?.ctToDecisionMin ?? undefined,
        etaToCenterMin: data.derivedTimers?.etaToCenterMin ?? undefined,
      },
      stability: {
        status: data.stability?.status ?? "STABLE",
        reasons: data.stability?.reasons ?? [],
      },
      completeness: {
        scorePct: data.completeness?.scorePct ?? 0,
        missing: data.completeness?.missing ?? [],
      },
      anomalies: data.anomalies ?? [],
    };

    return metrics;
  } catch {
    // Fallback to deterministic local computation on error
    return localNumericFallback(input, riskFlags);
  }
}
