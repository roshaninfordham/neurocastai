import type { PipelineEvent } from '@neurocast/shared';

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
}

export interface VoiceAnnouncement {
  id: string;
  timestamp: Date;
  message: string;
  type: 'state-change' | 'missing-info' | 'alert';
}
