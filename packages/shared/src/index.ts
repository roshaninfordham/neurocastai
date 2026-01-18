export type WorkflowState = "PROCEED" | "HOLD" | "ESCALATE";

export type FacilityType = "SPOKE_ED" | "THROMBECTOMY_CENTER" | "EMS" | "CLINIC";

export type ArrivalMode = "EMS" | "WALK_IN" | "TRANSFER";

export type Sex = "F" | "M" | "X" | "U";

export type TimelineEventType =
  | "LAST_KNOWN_WELL"
  | "ED_ARRIVAL"
  | "CT_START"
  | "CTA_RESULT"
  | "DECISION_TIME"
  | "TRANSFER_ACTIVATED";

export type TimelineEventSource = "EMS" | "ED" | "SYSTEM" | "UNKNOWN";

export type TimelineCertainty = "EXACT" | "ESTIMATED" | "UNKNOWN";

export type TimelineEvent = {
  type: TimelineEventType;
  time: string;
  source: TimelineEventSource;
  certainty?: TimelineCertainty;
};

export type VitalReading = {
  time: string;
  hr?: number;
  sbp?: number;
  dbp?: number;
  spo2?: number;
  glucose?: number;
  tempC?: number;
};

export type PacketSourceType = "PASTE_TEXT" | "UPLOAD_PDF" | "UPLOAD_TXT" | "SIMULATED";

export type TelemetryMode = "SIMULATED" | "MANUAL" | "DEVICE_STREAM";

export type CaseInputPacket = {
  sourceType: PacketSourceType;
  rawText: string;
  hasMedsList?: boolean;
  hasImagingReport?: boolean;
  declaredSynthetic: true;
  consentAcknowledged: true;
};

export type CaseInputTelemetry = {
  mode: TelemetryMode;
  vitals: VitalReading[];
};

export type CaseInput = {
  caseId: string;
  createdAt: string;
  facility: {
    type: FacilityType;
    name?: string;
  };
  arrivalMode: ArrivalMode;
  patient?: {
    age?: number;
    sex?: Sex;
    weightKg?: number;
  };
  timeline: TimelineEvent[];
  packet: CaseInputPacket;
  telemetry: CaseInputTelemetry;
};

export type RedactionMethod = "REGEX_DEMO" | "DEID_TOOL" | "MANUAL";

export type RedactionSummary = {
  phiRemoved: boolean;
  removedFields: string[];
  method: RedactionMethod;
};

export type NormalizedCase = {
  caseId: string;
  timeline: TimelineEvent[];
  telemetry: CaseInputTelemetry;
  packet: {
    redactedText: string;
    redactionSummary: RedactionSummary;
  };
};

export type CompressionResult = {
  provider: "TOKENCO" | "FALLBACK";
  originalTokenEstimate: number;
  compressedTokenEstimate: number;
  savingsPct: number;
  compressedTextPreview: string;
  notes?: string;
};

export type StabilityStatus = "STABLE" | "BORDERLINE" | "UNSTABLE";

export type AnomalySeverity = "LOW" | "MED" | "HIGH";

export type NumericMetrics = {
  provider?: string;
  timers?: {
    doorToCT?: number;
    ctToDecision?: number;
    timeSinceLKW?: number;
    etaToCenter?: number;
  };
  derivedTimers?: {
    timeSinceLKWMin?: number;
    doorToCTMin?: number;
    ctToDecisionMin?: number;
    etaToCenterMin?: number;
  };
  stability: {
    status: StabilityStatus;
    reasons?: string[];
    flagCount?: number;
  };
  completeness: {
    scorePct: number;
    missing?: string[];
    missingFields?: number;
  };
  anomalies?: {
    name: string;
    value: string;
    severity: AnomalySeverity;
  }[];
  prediction?: {
    needsEscalationProb: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  };
  clustering?: {
    clusterId: number;
    clusterName?: string;
  };
};

export type RiskSeverity = "CRITICAL" | "WARNING" | "INFO";

export type RiskConfidence = "HIGH" | "MEDIUM" | "LOW";

export type RiskCategory = "MEDS" | "TIMELINE" | "VITALS" | "DOCUMENTATION" | "OTHER";

export type RiskEvidenceDocType =
  | "TRANSFER_PACKET"
  | "EMS_NOTE"
  | "IMAGING_REPORT"
  | "OTHER";

export type RiskFlag = {
  id: string;
  label: string;
  severity: RiskSeverity;
  confidence: RiskConfidence;
  category: RiskCategory;
  evidence: {
    quote: string;
    sourceAnchor: string;
    docType: RiskEvidenceDocType;
  };
  coordinationGuidance: string;
  includeInHandoffByDefault: boolean;
};

export type RoutingDecisionRule = {
  id: string;
  name: string;
  explanation: string;
};

export type RoutingDecision = {
  state: WorkflowState;
  reason: string;
  triggeredRules: RoutingDecisionRule[];
  nextSteps: string[];
  safetyNote: string;
};

export type HandoffPacketHeader = {
  caseId: string;
  facilityType: string;
  arrivalMode: string;
  workflowState: string;
  completenessScorePct: number;
};

export type HandoffTimelineRow = {
  event: string;
  time?: string;
  interval?: string;
};

export type HandoffVitalsSummary = {
  hr?: number;
  bp?: string;
  spo2?: string;
  glucose?: string;
  stability: string;
};

export type HandoffRiskSummary = {
  severity: string;
  label: string;
  evidenceQuote: string;
  sourceAnchor: string;
  confidence: string;
};

export type HandoffPacket = {
  header: HandoffPacketHeader;
  timelineTable: HandoffTimelineRow[];
  vitalsSummary: HandoffVitalsSummary;
  risks: HandoffRiskSummary[];
  missingInfoChecklist: string[];
  coordinationNextSteps: string[];
  export: {
    text: string;
  };
};

// Verified Transfer Packet (VTP) - Full Specification
export type VtpMeta = {
  vtp_version: string;
  vtp_id: string;
  case_id: string;
  run_id: string;
  created_at_iso: string;
  environment: string;
  synthetic_declared: boolean;
  consent_acknowledged: boolean;
};

export type VtpPrivacy = {
  redaction_summary: RedactionSummary;
  phi_policy_version: string;
};

export type VtpCoordinationTimeline = {
  last_known_well_iso?: string;
  door_time_iso?: string;
  ct_start_iso?: string;
  cta_result_iso?: string;
  decision_time_iso?: string;
  derived_minutes: {
    door_to_ct?: number;
    ct_to_decision?: number;
    time_since_lkw?: number;
  };
};

export type VtpNumericReasoningWoodwide = {
  provider: string;
  prediction?: {
    needs_escalation_prob: number;
    threshold_used: number;
  };
  segment?: {
    cluster_id: number;
    cluster_label: string;
  };
  metrics: {
    completeness_score_pct: number;
    missing_items_count: number;
    vitals_summary?: {
      hr_max?: number;
      sbp_max?: number;
      sbp_min?: number;
      spo2_min?: number;
    };
  };
  inference_metadata?: {
    model_id_pred?: string;
    model_id_cluster?: string;
    dataset_id_infer?: string;
    latency_ms?: number;
  };
};

export type VtpRiskFlag = {
  id: string;
  category: string;
  severity: string;
  label: string;
  confidence: string;
  source_anchor: string;
  evidence_quote_redacted: string;
  rule_id?: string;
};

export type VtpRoutingDecision = {
  state: WorkflowState;
  decision_reason: string;
  triggered_rule_ids: string[];
  recommended_next_steps: string[];
};

export type VtpAgentTraceSummary = {
  pipeline_steps: string[];
  warnings_count: number;
  errors_count: number;
  total_latency_ms: number;
  token_savings_pct?: number;
};

export type VtpIntegrity = {
  hash_sha256: string;
  signature?: string;
  signature_alg: string;
  verification_status: "VERIFIED" | "FAILED" | "PENDING";
};

export type VerifiedTransferPacket = {
  vtp_meta: VtpMeta;
  privacy: VtpPrivacy;
  coordination_timeline: VtpCoordinationTimeline;
  numeric_reasoning_woodwide: VtpNumericReasoningWoodwide;
  risk_flags: VtpRiskFlag[];
  routing_decision: VtpRoutingDecision;
  agent_trace_summary: VtpAgentTraceSummary;
  integrity: VtpIntegrity;
};

export type VtpReceipt = {
  runIdHash: string;
  packetHash: string;
  state: WorkflowState;
  issuedAt: string;
  issuer?: string;
  txHash?: string;
};

export type VoiceSummary = {
  pushAlertsEnabled: boolean;
  lastAnnouncement?: string;
  allowedQuestionTypes: string[];
  blockedTopics: string[];
};

export type KairoDecisionType = "ALLOW" | "WARN" | "BLOCK" | "ESCALATE";

export type KairoScanSummary = {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export type KairoScanResult = {
  decision: KairoDecisionType;
  decision_reason: string;
  risk_score: number;
  summary: KairoScanSummary;
  raw?: Record<string, unknown>;
};

export type KairoDecision = {
  decision: KairoDecisionType;
  decision_reason?: string;
  riskScore?: number;
  risk_score?: number;
  analyzedAt: string;
  summary?: string | KairoScanSummary;
  findings?: KairoScanResult;
  source?: string;
};

export type PipelineStep =
  | "INGEST"
  | "REDACT"
  | "COMPRESS"
  | "EXTRACT"
  | "NUMERIC"
  | "ROUTE"
  | "PACKET"
  | "KAIRO_ANALYZE"
  | "VOICE_SUMMARY"
  | "HOME_CHECKIN"
  | "VIDEO_DETECT"
  | "TRIAGE"
  | "NOTIFY";

export type PipelineEventType =
  | "STEP_STARTED"
  | "STEP_PROGRESS"
  | "STEP_DONE"
  | "WARNING"
  | "ERROR";

export type PipelineEvent = {
  id: string;
  time: string;
  eventType: PipelineEventType;
  step: PipelineStep;
  message: string;
  payload?: Record<string, unknown>;
};

export type PipelineMetrics = {
  totalLatencyMs?: number;
  stageLatenciesMs?: Partial<Record<PipelineStep, number>>;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    compressionTokens?: number;
  };
  costUsdEstimate?: number;
  errorCount?: number;
};

export type CaseRunStatus = "READY" | "RUNNING" | "DONE" | "FAILED";

export type CaseDerivedOutputs = {
  compression?: CompressionResult;
  riskFlags?: RiskFlag[];
  numeric?: NumericMetrics;
  decision?: RoutingDecision;
  handoff?: HandoffPacket;
  voice?: VoiceSummary;
  vtp?: VerifiedTransferPacket;
  kairo?: KairoDecision;
  homeCheckin?: HomeCheckinResult;
};

export type OvershootNormalizedResult = {
  ts: string;
  raw: string;
  parsed?: {
    signal_type?: string;
    severity?: string;
    confidence?: number;
    notes?: string;
  };
  inferenceLatencyMs?: number;
  totalLatencyMs?: number;
  source: "camera" | "video";
};

export type TriageDecision = {
  urgency: "low" | "medium" | "high" | "critical";
  what_happened: string;
  why_it_matters: string;
  what_next: Array<{ action: string; reason: string }>;
  confidence: number;
  supporting_signals: string[];
  disclaimer: string;
};

export type HomeCheckinResult = {
  observations: OvershootNormalizedResult[];
  triage?: TriageDecision;
};

export type CaseDerived = {
  caseId: string;
  runId: string;
  status: CaseRunStatus;
  outputs: CaseDerivedOutputs;
  metrics: PipelineMetrics;
  events: PipelineEvent[];
};
