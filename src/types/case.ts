import type { PipelineEvent, PipelineMetrics, HandoffPacket, CaseDerived, VerifiedTransferPacket } from '@neurocast/shared';

export type WorkflowState = 'PROCEED' | 'HOLD' | 'ESCALATE';
export type FacilityType = 'spoke' | 'hub';
export type ArrivalMode = 'EMS' | 'walk-in';
export type VitalStability = 'Stable' | 'Borderline' | 'Unstable';
export type PipelineStatus = 'pending' | 'running' | 'complete';
export type Confidence = 'high' | 'medium' | 'low';

export interface TimelineEvent {
  id: string;
  label: string;
  time: Date | null;
  optional?: boolean;
}

export interface Vitals {
  hr: number;
  bpSys: number;
  bpDia: number;
  spO2: number;
  glucose: number;
  timestamp: Date;
}

export interface RiskFlag {
  id: string;
  name: string;
  severity: 'info' | 'warning' | 'critical';
  evidenceQuote: string;
  source: string;
  section: string;
  lineNumber?: number;
  confidence: Confidence;
  whyMatters: string;
  recommendedAction: string;
  includeInHandoff: boolean;
}

export interface CaseData {
  id: string;
  runId?: string;
  facilityType: FacilityType;
  patientAge?: number;
  arrivalMode: ArrivalMode;
  lastKnownWell: Date | null;
  lkwUnknown: boolean;
  symptomDiscovery: Date | null;
  edArrival: Date;
  ctStart: Date | null;
  ctaResult: Date | null;
  decisionTime: Date | null;
  transferRequest: Date | null;
  uploadedDocument?: string;
  medsListPresent: boolean;
  imagingReportAvailable: boolean;
  vitalsStreaming: boolean;
  workflowState: WorkflowState;
  workflowReason: string;
  triggeredRule: string;
  nextSteps: string[];
  riskFlags: RiskFlag[];
  currentVitals: Vitals | null;
  vitalsHistory: Vitals[];
  completenessScore: number;
  missingItems: string[];
  compressionStats?: {
    originalLength: number;
    compressedLength: number;
    savings: number;
    summary: string;
  };
  numericInsights?: {
    timeSinceLKW: string;
    doorToCT: string;
    ctToDecision: string;
    etaToCenter: string;
    stabilityFlag: VitalStability;
    completeness: number;
  };
  pipelineStatus: {
    compression: PipelineStatus;
    extraction: PipelineStatus;
    numeric: PipelineStatus;
    routing: PipelineStatus;
  };
  pipelineEvents?: PipelineEvent[];
  metrics?: PipelineMetrics;
  handoffPacket?: HandoffPacket;
  derived?: CaseDerived;
  vtp?: VerifiedTransferPacket | any; // Support both new and legacy VTP formats

  // MCP Integration fields
  runSource?: 'MCP' | 'LOCAL';
  currentStep?: string;
  intermediateOutputs?: {
    redact?: { removedFields: string[]; phiRemoved: boolean };
    compress?: {
      savingsPct: number;
      originalTokens: number;
      compressedTokens: number;
      tokensSaved: number;
      ratio: number;
      qualityScore?: number;
      qualityOk?: boolean;
      provider?: string;
      aggressiveness?: number;
    };
    extract?: { flagCount: number; criticalCount: number };
    numeric?: {
      prob?: number;
      cluster?: number;
      clusterName?: string;
      timers?: { doorToCT?: number; ctToDecision?: number; timeSinceLKW?: number };
      completeness?: number;
    };
    route?: { state: string; ruleIds: string[]; reason: string };
    packet?: { ready: boolean };
    vtp?: { hash: string; verified: boolean; vtpId: string };
  };
}

export interface VoiceAnnouncement {
  id: string;
  timestamp: Date;
  message: string;
  type: 'state-change' | 'missing-info' | 'alert';
}
