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
  provider: "TOKENCO";
  originalTokenEstimate: number;
  compressedTokenEstimate: number;
  savingsPct: number;
  compressedTextPreview: string;
  notes?: string;
};

export type StabilityStatus = "STABLE" | "BORDERLINE" | "UNSTABLE";

export type AnomalySeverity = "LOW" | "MED" | "HIGH";

export type NumericMetrics = {
  provider: "WOOD_WIDE";
  derivedTimers: {
    timeSinceLKWMin?: number;
    doorToCTMin?: number;
    ctToDecisionMin?: number;
    etaToCenterMin?: number;
  };
  stability: {
    status: StabilityStatus;
    reasons: string[];
  };
  completeness: {
    scorePct: number;
    missing: string[];
  };
  anomalies?: {
    name: string;
    value: string;
    severity: AnomalySeverity;
  }[];
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

export type VoiceSummary = {
  pushAlertsEnabled: boolean;
  lastAnnouncement?: string;
  allowedQuestionTypes: string[];
  blockedTopics: string[];
};

export type PipelineStep =
  | "INGEST"
  | "REDACT"
  | "COMPRESS"
  | "EXTRACT"
  | "NUMERIC"
  | "ROUTE"
  | "PACKET"
  | "VOICE_SUMMARY";

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
};

export type CaseDerived = {
  caseId: string;
  runId: string;
  status: CaseRunStatus;
  outputs: CaseDerivedOutputs;
  metrics: PipelineMetrics;
  events: PipelineEvent[];
};
