import { createHash } from 'crypto';
import type {
  CaseInput,
  CompressionResult,
  NumericMetrics,
  RiskFlag,
  RoutingDecision,
  VerifiedTransferPacket,
  VtpMeta,
  VtpPrivacy,
  VtpCoordinationTimeline,
  VtpNumericReasoningWoodwide,
  VtpRiskFlag,
  VtpRoutingDecision,
  VtpAgentTraceSummary,
  VtpIntegrity,
  RedactionSummary,
} from "@neurocast/shared";
import { stableStringify } from "./stableStringify";

export function hashVtpPacket(packet: VerifiedTransferPacket): string {
  const canonical = stableStringify(packet);
  const hash = createHash("sha256").update(canonical).digest("hex");
  return `0x${hash}`;
}

export function buildVtpPacket(params: {
  vtpId: string;
  runId: string;
  caseId: string;
  input: CaseInput;
  decision: RoutingDecision;
  numeric: NumericMetrics;
  riskFlags: RiskFlag[];
  redactionSummary: RedactionSummary;
  compression?: CompressionResult;
}): VerifiedTransferPacket {
  const meta: VtpMeta = {
    vtp_version: "1.0.0",
    vtp_id: params.vtpId,
    case_id: params.caseId,
    run_id: params.runId,
    created_at_iso: new Date().toISOString(),
    environment: "development",
    synthetic_declared: true,
    consent_acknowledged: true,
  };

  const privacy: VtpPrivacy = {
    redaction_summary: params.redactionSummary,
    phi_policy_version: "1.0",
  };

  const timeline: VtpCoordinationTimeline = {
    last_known_well_iso: params.input.timeline.find(t => t.type === "LAST_KNOWN_WELL")?.time,
    door_time_iso: params.input.timeline.find(t => t.type === "ED_ARRIVAL")?.time,
    ct_start_iso: params.input.timeline.find(t => t.type === "CT_START")?.time,
    cta_result_iso: params.input.timeline.find(t => t.type === "CTA_RESULT")?.time,
    decision_time_iso: params.input.timeline.find(t => t.type === "DECISION_TIME")?.time,
    derived_minutes: {
      door_to_ct: params.numeric.derivedTimers?.doorToCTMin,
      ct_to_decision: params.numeric.derivedTimers?.ctToDecisionMin,
      time_since_lkw: params.numeric.derivedTimers?.timeSinceLKWMin,
    },
  };

  const woodwide: VtpNumericReasoningWoodwide = {
    provider: "woodwide",
    metrics: {
      completeness_score_pct: params.numeric.completeness.scorePct,
      missing_items_count: params.numeric.completeness.missing?.length || 0,
      vitals_summary: params.numeric.prediction ? {
        hr_max: params.numeric.prediction.needsEscalationProb ? 100 : undefined,
      } : undefined,
    },
  };

  const riskFlags: VtpRiskFlag[] = params.riskFlags.map(rf => ({
    id: rf.id,
    category: rf.category,
    severity: rf.severity,
    label: rf.label,
    confidence: rf.confidence,
    source_anchor: rf.evidence.sourceAnchor,
    evidence_quote_redacted: rf.evidence.quote,
  }));

  const routingDecision: VtpRoutingDecision = {
    state: params.decision.state,
    decision_reason: params.decision.reason,
    triggered_rule_ids: params.decision.triggeredRules.map(r => r.id),
    recommended_next_steps: params.decision.nextSteps,
  };

  const summary: VtpAgentTraceSummary = {
    pipeline_steps: ["INGEST", "REDACT", "EXTRACT", "NUMERIC", "ROUTE", "PACKET"],
    warnings_count: 0,
    errors_count: 0,
    total_latency_ms: 0,
  };

  const integrity: VtpIntegrity = {
    hash_sha256: "",
    signature_alg: "sha256",
    verification_status: "PENDING",
  };

  const packet: VerifiedTransferPacket = {
    vtp_meta: meta,
    privacy,
    coordination_timeline: timeline,
    numeric_reasoning_woodwide: woodwide,
    risk_flags: riskFlags,
    routing_decision: routingDecision,
    agent_trace_summary: summary,
    integrity,
  };

  // Compute and set the hash
  const packetHash = hashVtpPacket(packet);
  packet.integrity.hash_sha256 = packetHash;
  return packet;
}
