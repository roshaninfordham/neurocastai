import type {
  CaseInput,
  CaseDerivedOutputs,
  PipelineMetrics,
  RedactionSummary,
  VerifiedTransferPacket,
} from '@neurocast/shared';
import { canonicalJSONString } from './canonicalize';
import { sha256Hex } from './hash';
import { signHash } from './sign';

interface BuildVtpParams {
  caseInput: CaseInput;
  outputs: CaseDerivedOutputs;
  runId: string;
  metrics: PipelineMetrics;
  redactionSummary: RedactionSummary;
}

/**
 * Build a complete Verified Transfer Packet from pipeline outputs
 */
export function buildVerifiedTransferPacket(
  params: BuildVtpParams
): VerifiedTransferPacket {
  const { caseInput, outputs, runId, metrics, redactionSummary } = params;

  // Build timeline lookup
  const timelineMap: Record<string, string> = {};
  caseInput.timeline.forEach((evt) => {
    timelineMap[evt.type] = evt.time;
  });

  // Compute derived minutes
  const doorToCT = computeMinutes(timelineMap['ED_ARRIVAL'], timelineMap['CT_START']);
  const ctToDecision = computeMinutes(timelineMap['CT_START'], timelineMap['DECISION_TIME']);
  const timeSinceLKW = computeMinutes(
    timelineMap['LAST_KNOWN_WELL'],
    timelineMap['ED_ARRIVAL']
  );

  // Extract vitals summary
  const vitals = caseInput.telemetry.vitals;
  const vitalsSummary = vitals.length > 0 ? {
    hr_max: Math.max(...vitals.map((v) => v.hr ?? 0)),
    sbp_max: Math.max(...vitals.map((v) => v.sbp ?? 0)),
    sbp_min: Math.min(...vitals.map((v) => v.sbp ?? 999)),
    spo2_min: Math.min(...vitals.map((v) => v.spo2 ?? 100)),
  } : undefined;

  // Map risk flags to VTP format (PHI-safe)
  const vtpRiskFlags = (outputs.riskFlags || []).map((flag) => ({
    id: flag.id,
    category: flag.category,
    severity: flag.severity,
    label: flag.label,
    confidence: flag.confidence,
    source_anchor: flag.evidence.sourceAnchor,
    evidence_quote_redacted: flag.evidence.quote.slice(0, 120), // Max 120 chars
    rule_id: undefined, // Not yet tracked
  }));

  // Build cluster label
  const clusterLabel = outputs.numeric?.clustering
    ? `Segment ${outputs.numeric.clustering.clusterId}` +
      (outputs.numeric.clustering.clusterId >= 3 ? ' (High-Risk)' : ' (Standard)')
    : 'Unknown';

  // Build VTP without integrity (needed for hash computation)
  const vtpWithoutIntegrity = {
    vtp_meta: {
      vtp_version: '1.0',
      vtp_id: `VTP-${caseInput.caseId}-${runId}-${Date.now()}`,
      case_id: caseInput.caseId,
      run_id: runId,
      created_at_iso: new Date().toISOString(),
      environment: 'demo',
      synthetic_declared: true,
      consent_acknowledged: true,
    },
    privacy: {
      redaction_summary: redactionSummary,
      phi_policy_version: 'PHI-RULES-1',
    },
    coordination_timeline: {
      last_known_well_iso: timelineMap['LAST_KNOWN_WELL'],
      door_time_iso: timelineMap['ED_ARRIVAL'],
      ct_start_iso: timelineMap['CT_START'],
      cta_result_iso: timelineMap['CTA_RESULT'],
      decision_time_iso: timelineMap['DECISION_TIME'],
      derived_minutes: {
        door_to_ct: doorToCT,
        ct_to_decision: ctToDecision,
        time_since_lkw: timeSinceLKW,
      },
    },
    numeric_reasoning_woodwide: {
      provider: outputs.numeric?.provider || 'Wood Wide AI',
      prediction: outputs.numeric?.prediction
        ? {
            needs_escalation_prob: outputs.numeric.prediction.needsEscalationProb,
            threshold_used: 0.65,
          }
        : undefined,
      segment: outputs.numeric?.clustering
        ? {
            cluster_id: outputs.numeric.clustering.clusterId,
            cluster_label: clusterLabel,
          }
        : undefined,
      metrics: {
        completeness_score_pct: outputs.numeric?.completeness.scorePct ?? 0,
        missing_items_count: outputs.numeric?.completeness.missingFields ?? 0,
        vitals_summary: vitalsSummary,
      },
      inference_metadata: undefined, // TODO: Add model IDs from Wood Wide bootstrap
    },
    risk_flags: vtpRiskFlags,
    routing_decision: {
      state: outputs.decision?.state ?? 'HOLD',
      decision_reason: outputs.decision?.reason ?? 'Unknown',
      triggered_rule_ids: outputs.decision?.triggeredRules.map((r) => r.id) ?? [],
      recommended_next_steps: outputs.decision?.nextSteps ?? [],
    },
    agent_trace_summary: {
      pipeline_steps: Object.keys(metrics.stageLatenciesMs || {}),
      warnings_count: 0, // TODO: Track warnings
      errors_count: 0, // TODO: Track errors
      total_latency_ms: Object.values(metrics.stageLatenciesMs || {}).reduce(
        (sum, val) => sum + val,
        0
      ),
      token_savings_pct: outputs.compression?.savingsPct,
    },
  };

  // Canonicalize and hash (without integrity field to avoid circular dependency)
  const canonical = canonicalJSONString(vtpWithoutIntegrity);
  const hash = sha256Hex(canonical);
  const signature = signHash(hash);

  // Build final VTP with integrity
  const vtp: VerifiedTransferPacket = {
    ...vtpWithoutIntegrity,
    integrity: {
      hash_sha256: hash,
      signature,
      signature_alg: 'ed25519-demo',
      verification_status: 'VERIFIED',
    },
  };

  return vtp;
}

function computeMinutes(start?: string, end?: string): number | undefined {
  if (!start || !end) return undefined;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / 60000));
}
