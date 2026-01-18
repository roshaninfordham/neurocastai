import { CaseData, RiskFlag, Vitals } from '../types/case';

const PIPELINE_EVENTS_CASE_A = [
  {
    id: 'case-a-evt-1',
    time: '2026-01-01T12:00:00Z',
    eventType: 'STEP_STARTED',
    step: 'INGEST',
    message: 'Ingesting case NC-2026-001A from spoke ED',
    payload: { sourceType: 'SIMULATED' }
  },
  {
    id: 'case-a-evt-2',
    time: '2026-01-01T12:00:01Z',
    eventType: 'STEP_DONE',
    step: 'INGEST',
    message: 'Basic fields validated and queued for processing',
    payload: { fieldsValidated: 8 }
  },
  {
    id: 'case-a-evt-REDACT-1',
    time: '2026-01-01T12:00:01Z',
    eventType: 'STEP_STARTED',
    step: 'REDACT',
    message: 'Redacting PHI from packet text before compression.',
    payload: { method: 'REGEX_DEMO' }
  },
  {
    id: 'case-a-evt-REDACT-2',
    time: '2026-01-01T12:00:02Z',
    eventType: 'STEP_DONE',
    step: 'REDACT',
    message: 'PHI removed: NAME, DOB, MRN (3 categories).',
    payload: { removedFields: ['NAME', 'DOB', 'MRN'], method: 'REGEX_DEMO' }
  },
  {
    id: 'case-a-evt-3',
    time: '2026-01-01T12:00:03Z',
    eventType: 'STEP_STARTED',
    step: 'COMPRESS',
    message: 'TokenCo compression started for transfer packet',
    payload: { provider: 'TOKENCO' }
  },
  {
    id: 'case-a-evt-4',
    time: '2026-01-01T12:00:04Z',
    eventType: 'STEP_DONE',
    step: 'COMPRESS',
    message: 'Compression completed with token savings',
    payload: { originalTokens: 1247, compressedTokens: 342, savingsPct: 72.6 }
  },
  {
    id: 'case-a-evt-5',
    time: '2026-01-01T12:00:05Z',
    eventType: 'STEP_STARTED',
    step: 'EXTRACT',
    message: 'Context agent scanning for anticoagulant and timeline risks',
    payload: { rulesEvaluated: 7 }
  },
  {
    id: 'case-a-evt-6',
    time: '2026-01-01T12:00:06Z',
    eventType: 'STEP_PROGRESS',
    step: 'EXTRACT',
    message: 'Potential DOAC mention detected — verifying evidence span',
    payload: { candidateRiskId: 'risk-1' }
  },
  {
    id: 'case-a-evt-7',
    time: '2026-01-01T12:00:07Z',
    eventType: 'STEP_DONE',
    step: 'EXTRACT',
    message: 'Risk flags extracted from packet',
    payload: { riskFlagsRaised: ['risk-1', 'risk-2', 'risk-3'] }
  },
  {
    id: 'case-a-evt-8',
    time: '2026-01-01T12:00:08Z',
    eventType: 'STEP_STARTED',
    step: 'NUMERIC',
    message: 'Computing numeric timers and completeness scores',
    payload: { timers: ['timeSinceLKWMin', 'doorToCTMin'] }
  },
  {
    id: 'case-a-evt-9',
    time: '2026-01-01T12:00:09Z',
    eventType: 'STEP_DONE',
    step: 'NUMERIC',
    message: 'Numeric metrics computed for case NC-2026-001A',
    payload: { completenessScorePct: 82 }
  },
  {
    id: 'case-a-evt-10',
    time: '2026-01-01T12:00:10Z',
    eventType: 'STEP_STARTED',
    step: 'ROUTE',
    message: 'Evaluating deterministic routing policy gates',
    payload: { policyVersion: 'v1.0.0' }
  },
  {
    id: 'case-a-evt-11',
    time: '2026-01-01T12:00:11Z',
    eventType: 'STEP_DONE',
    step: 'ROUTE',
    message: 'Routing decision HOLD due to DOAC risk flag',
    payload: { state: 'HOLD', contributingRiskIds: ['risk-1'] }
  }
] as any;

const PIPELINE_EVENTS_CASE_B = [
  {
    id: 'case-b-evt-1',
    time: '2026-01-02T09:00:00Z',
    eventType: 'STEP_STARTED',
    step: 'INGEST',
    message: 'Ingesting case NC-2026-002B with unknown onset time',
    payload: { lkwUnknown: true }
  },
  {
    id: 'case-b-evt-2',
    time: '2026-01-02T09:00:01Z',
    eventType: 'STEP_DONE',
    step: 'INGEST',
    message: 'Core fields captured; marking onset time as unknown',
    payload: { fieldsValidated: 6 }
  },
  {
    id: 'case-b-evt-REDACT-1',
    time: '2026-01-02T09:00:01Z',
    eventType: 'STEP_STARTED',
    step: 'REDACT',
    message: 'Redacting PHI from packet text before risk extraction.',
    payload: { method: 'REGEX_DEMO' }
  },
  {
    id: 'case-b-evt-REDACT-2',
    time: '2026-01-02T09:00:02Z',
    eventType: 'STEP_DONE',
    step: 'REDACT',
    message: 'PHI removed: NAME, ADDRESS (2 categories).',
    payload: { removedFields: ['NAME', 'ADDRESS'], method: 'REGEX_DEMO' }
  },
  {
    id: 'case-b-evt-3',
    time: '2026-01-02T09:00:03Z',
    eventType: 'STEP_STARTED',
    step: 'EXTRACT',
    message: 'Context agent scanning history for wake-up stroke patterns',
    payload: { pattern: 'wake-up-stroke' }
  },
  {
    id: 'case-b-evt-4',
    time: '2026-01-02T09:00:04Z',
    eventType: 'STEP_PROGRESS',
    step: 'EXTRACT',
    message: 'Potential wake-up stroke language detected',
    payload: { candidateRiskId: 'risk-b1' }
  },
  {
    id: 'case-b-evt-5',
    time: '2026-01-02T09:00:05Z',
    eventType: 'STEP_DONE',
    step: 'EXTRACT',
    message: 'Risk flags raised for unknown onset and incomplete meds history',
    payload: { riskFlagsRaised: ['risk-b1', 'risk-b2'] }
  },
  {
    id: 'case-b-evt-6',
    time: '2026-01-02T09:00:06Z',
    eventType: 'STEP_STARTED',
    step: 'NUMERIC',
    message: 'Computing timers with unknown last-known-well handling',
    payload: { timers: ['doorToCTMin'] }
  },
  {
    id: 'case-b-evt-7',
    time: '2026-01-02T09:00:07Z',
    eventType: 'STEP_DONE',
    step: 'NUMERIC',
    message: 'Numeric metrics computed with partial data',
    payload: { completenessScorePct: 64 }
  },
  {
    id: 'case-b-evt-8',
    time: '2026-01-02T09:00:08Z',
    eventType: 'STEP_STARTED',
    step: 'ROUTE',
    message: 'Applying wake-up stroke routing rules',
    payload: { policyVersion: 'v1.0.0' }
  },
  {
    id: 'case-b-evt-9',
    time: '2026-01-02T09:00:09Z',
    eventType: 'STEP_DONE',
    step: 'ROUTE',
    message: 'Routing decision ESCALATE to center with MRI capability',
    payload: { state: 'ESCALATE', contributingRiskIds: ['risk-b1'] }
  }
] as any;

const PIPELINE_EVENTS_CASE_C = [
  {
    id: 'case-c-evt-1',
    time: '2026-01-03T11:30:00Z',
    eventType: 'STEP_STARTED',
    step: 'INGEST',
    message: 'Ingesting case NC-2026-003C with clear onset and imaging',
    payload: { imagingAvailable: true }
  },
  {
    id: 'case-c-evt-2',
    time: '2026-01-03T11:30:01Z',
    eventType: 'STEP_DONE',
    step: 'INGEST',
    message: 'Core timing and facility fields validated',
    payload: { fieldsValidated: 9 }
  },
  {
    id: 'case-c-evt-REDACT-1',
    time: '2026-01-03T11:30:01Z',
    eventType: 'STEP_STARTED',
    step: 'REDACT',
    message: 'Redacting PHI from packet text with regex-based rules.',
    payload: { method: 'REGEX_DEMO' }
  },
  {
    id: 'case-c-evt-REDACT-2',
    time: '2026-01-03T11:30:02Z',
    eventType: 'STEP_DONE',
    step: 'REDACT',
    message: 'PHI removed: NAME (1 category).',
    payload: { removedFields: ['NAME'], method: 'REGEX_DEMO' }
  },
  {
    id: 'case-c-evt-3',
    time: '2026-01-03T11:30:03Z',
    eventType: 'STEP_STARTED',
    step: 'COMPRESS',
    message: 'TokenCo compression started for packet text',
    payload: { provider: 'TOKENCO' }
  },
  {
    id: 'case-c-evt-4',
    time: '2026-01-03T11:30:04Z',
    eventType: 'STEP_DONE',
    step: 'COMPRESS',
    message: 'Compression finished within budget',
    payload: { originalTokens: 980, compressedTokens: 310, savingsPct: 68.4 }
  },
  {
    id: 'case-c-evt-5',
    time: '2026-01-03T11:30:05Z',
    eventType: 'STEP_STARTED',
    step: 'EXTRACT',
    message: 'Context agent extracting LVO evidence and contraindications',
    payload: { rulesEvaluated: 6 }
  },
  {
    id: 'case-c-evt-6',
    time: '2026-01-03T11:30:06Z',
    eventType: 'STEP_DONE',
    step: 'EXTRACT',
    message: 'Risk flags updated with M1 occlusion and aspirin use',
    payload: { riskFlagsRaised: ['risk-c1', 'risk-c2'] }
  },
  {
    id: 'case-c-evt-7',
    time: '2026-01-03T11:30:07Z',
    eventType: 'STEP_STARTED',
    step: 'NUMERIC',
    message: 'Computing timers and completeness for clean LVO',
    payload: { timers: ['timeSinceLKWMin', 'doorToCTMin', 'ctToDecisionMin'] }
  },
  {
    id: 'case-c-evt-8',
    time: '2026-01-03T11:30:08Z',
    eventType: 'STEP_DONE',
    step: 'NUMERIC',
    message: 'Numeric metrics computed — all within expected windows',
    payload: { completenessScorePct: 94 }
  },
  {
    id: 'case-c-evt-9',
    time: '2026-01-03T11:30:09Z',
    eventType: 'STEP_STARTED',
    step: 'ROUTE',
    message: 'Evaluating final routing policy for thrombectomy transfer',
    payload: { policyVersion: 'v1.0.0' }
  },
  {
    id: 'case-c-evt-10',
    time: '2026-01-03T11:30:10Z',
    eventType: 'STEP_DONE',
    step: 'ROUTE',
    message: 'Routing decision PROCEED — activate receiving thrombectomy team',
    payload: { state: 'PROCEED', contributingRiskIds: ['risk-c1'] }
  }
] as any;

export const DEMO_CASES: Record<string, Partial<CaseData>> = {
  'case-a': {
    id: 'NC-2026-001A',
    facilityType: 'spoke',
    patientAge: 68,
    arrivalMode: 'EMS',
    lkwUnknown: false,
    lastKnownWell: new Date(Date.now() - 90 * 60 * 1000), // 90 min ago
    edArrival: new Date(Date.now() - 20 * 60 * 1000), // 20 min ago
    ctStart: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
    medsListPresent: true,
    imagingReportAvailable: true,
    uploadedDocument: `TRANSFER PACKET - County General Hospital
Patient: 68M
Chief Complaint: Right-sided weakness, slurred speech
History: Patient was last seen normal at 7:30 AM. At 9:00 AM, family found him with right arm weakness and difficulty speaking.
Past Medical History: Hypertension, Type 2 Diabetes, Atrial Fibrillation
Medications: Lisinopril 10mg daily, Metformin 1000mg BID, Apixaban 5mg BID
Allergies: NKDA
Vitals on arrival: BP 165/95, HR 88, SpO2 96% on RA
Physical: Alert, oriented x2, NIHSS 8, right facial droop, right arm drift
Imaging: CT head - no acute hemorrhage, CTA pending`,
    workflowState: 'HOLD',
    workflowReason: 'Critical anticoagulant detected - specialist review required',
    triggeredRule: 'Rule: Apixaban (DOAC) requires hemorrhage risk assessment',
    nextSteps: [
      'Escalate to telestroke neurologist immediately',
      'Verify last Apixaban dose timing',
      'Obtain coagulation panel (PT/INR if available)',
      'Confirm CTA results for hemorrhage exclusion',
      'Prepare reversal agent availability assessment'
    ],
    riskFlags: [
      {
        id: 'risk-1',
        name: 'Anticoagulant Present (Apixaban)',
        severity: 'critical',
        evidenceQuote: 'Medications: Lisinopril 10mg daily, Metformin 1000mg BID, Apixaban 5mg BID',
        source: 'Transfer Packet',
        section: 'Medications',
        lineNumber: 42,
        confidence: 'high',
        whyMatters: 'DOACs like Apixaban increase bleeding risk during thrombectomy and may require specialist consultation for risk-benefit assessment',
        recommendedAction: 'Escalate to stroke specialist - verify last dose, assess hemorrhage risk, prepare reversal strategy',
        includeInHandoff: true
      },
      {
        id: 'risk-2',
        name: 'Atrial Fibrillation',
        severity: 'warning',
        evidenceQuote: 'Past Medical History: Hypertension, Type 2 Diabetes, Atrial Fibrillation',
        source: 'Transfer Packet',
        section: 'Past Medical History',
        lineNumber: 38,
        confidence: 'high',
        whyMatters: 'AF is a common stroke etiology and affects anticoagulation management decisions',
        recommendedAction: 'Include in handoff packet - may influence post-intervention management',
        includeInHandoff: true
      },
      {
        id: 'risk-3',
        name: 'Elevated Blood Pressure',
        severity: 'warning',
        evidenceQuote: 'Vitals on arrival: BP 165/95, HR 88, SpO2 96% on RA',
        source: 'Transfer Packet',
        section: 'Vitals',
        lineNumber: 51,
        confidence: 'high',
        whyMatters: 'BP >185/110 may need controlled before tPA consideration; coordinate with receiving team',
        recommendedAction: 'Monitor BP trends - may require management before intervention',
        includeInHandoff: true
      }
    ],
    missingItems: [
      'CTA result confirmation needed',
      'Last Apixaban dose timing',
      'Coagulation panel if available'
    ],
    pipelineEvents: PIPELINE_EVENTS_CASE_A
  },
  'case-b': {
    id: 'NC-2026-002B',
    facilityType: 'spoke',
    patientAge: 54,
    arrivalMode: 'walk-in',
    lkwUnknown: true,
    lastKnownWell: null,
    edArrival: new Date(Date.now() - 15 * 60 * 1000),
    medsListPresent: false,
    imagingReportAvailable: false,
    uploadedDocument: `TRANSFER PACKET - Memorial ED
Patient: 54F
Chief Complaint: Left-sided numbness
History: Patient woke up at 8 AM with left arm numbness. Unsure of exact onset time - was normal when went to bed.
Past Medical History: Unknown - patient is poor historian
Medications: "Some blood pressure pills" - unable to specify
Vitals: BP 148/88, HR 76, SpO2 98%
Physical: NIHSS 5, left arm weakness`,
    workflowState: 'ESCALATE',
    workflowReason: 'Unknown onset time (wake-up stroke) - specialist evaluation required',
    triggeredRule: 'Rule: Wake-up stroke requires advanced imaging protocol',
    nextSteps: [
      'Escalate to stroke center with MRI capability',
      'Request family contact for medication history',
      'Obtain CT/CTA urgently',
      'Consider wake-up stroke protocol eligibility'
    ],
    riskFlags: [
      {
        id: 'risk-b1',
        name: 'Unknown Onset Time (Wake-up Stroke)',
        severity: 'critical',
        evidenceQuote: 'Unsure of exact onset time - was normal when went to bed',
        source: 'Transfer Packet',
        section: 'History',
        confidence: 'high',
        whyMatters: 'Unknown onset time requires advanced imaging (MRI/perfusion) to determine treatment eligibility',
        recommendedAction: 'Escalate to comprehensive stroke center - wake-up protocol consideration',
        includeInHandoff: true
      },
      {
        id: 'risk-b2',
        name: 'Incomplete Medication History',
        severity: 'warning',
        evidenceQuote: 'Medications: "Some blood pressure pills" - unable to specify',
        source: 'Transfer Packet',
        section: 'Medications',
        confidence: 'medium',
        whyMatters: 'Unknown medications may include anticoagulants or other contraindications',
        recommendedAction: 'Request family contact or pharmacy records urgently',
        includeInHandoff: true
      }
    ],
    missingItems: [
      'Onset time confirmation (family interview needed)',
      'Complete medication list',
      'CT/CTA imaging',
      'Contact information for family'
    ],
    pipelineEvents: PIPELINE_EVENTS_CASE_B
  },
  'case-c': {
    id: 'NC-2026-003C',
    facilityType: 'spoke',
    patientAge: 72,
    arrivalMode: 'EMS',
    lkwUnknown: false,
    lastKnownWell: new Date(Date.now() - 45 * 60 * 1000),
    edArrival: new Date(Date.now() - 12 * 60 * 1000),
    ctStart: new Date(Date.now() - 5 * 60 * 1000),
    ctaResult: new Date(Date.now() - 2 * 60 * 1000),
    medsListPresent: true,
    imagingReportAvailable: true,
    uploadedDocument: `TRANSFER PACKET - Regional Medical Center
Patient: 72M
Chief Complaint: Sudden left-sided weakness
History: Clear onset at 10:15 AM while eating breakfast. Immediate right hemiparesis and aphasia.
Past Medical History: Hypertension, Hyperlipidemia
Medications: Amlodipine 5mg daily, Atorvastatin 40mg daily, Aspirin 81mg daily
Allergies: Penicillin
Vitals: BP 156/82, HR 72, SpO2 97%
Physical: NIHSS 12, global aphasia, right hemiplegia, gaze preference
Imaging: CT - no hemorrhage, no early signs. CTA - M1 occlusion confirmed.`,
    workflowState: 'PROCEED',
    workflowReason: 'Clear timeline, no contraindications, M1 occlusion confirmed - transfer immediately',
    triggeredRule: 'Rule: LVO confirmed + within window + no stops = PROCEED',
    nextSteps: [
      'Activate receiving thrombectomy team',
      'Arrange immediate transfer',
      'Confirm ETA to stroke center',
      'Send complete handoff packet'
    ],
    riskFlags: [
      {
        id: 'risk-c1',
        name: 'M1 Occlusion Confirmed',
        severity: 'info',
        evidenceQuote: 'CTA - M1 occlusion confirmed',
        source: 'Transfer Packet',
        section: 'Imaging',
        confidence: 'high',
        whyMatters: 'Large vessel occlusion is indication for mechanical thrombectomy - time critical',
        recommendedAction: 'Activate comprehensive stroke center immediately',
        includeInHandoff: true
      },
      {
        id: 'risk-c2',
        name: 'Aspirin Use',
        severity: 'info',
        evidenceQuote: 'Medications: Amlodipine 5mg daily, Atorvastatin 40mg daily, Aspirin 81mg daily',
        source: 'Transfer Packet',
        section: 'Medications',
        confidence: 'high',
        whyMatters: 'Aspirin noted for receiving team awareness - minimal bleeding risk at this dose',
        recommendedAction: 'Include in handoff - no delay indicated',
        includeInHandoff: true
      }
    ],
    missingItems: [],
    pipelineEvents: PIPELINE_EVENTS_CASE_C
  }
};

export function generateMockVitals(stable: boolean = true): Vitals {
  const baseHR = stable ? 75 : 95;
  const baseBPSys = stable ? 155 : 175;
  const baseBPDia = stable ? 85 : 100;
  const baseSpO2 = stable ? 97 : 92;
  const baseGlucose = stable ? 120 : 180;

  return {
    hr: baseHR + Math.floor(Math.random() * 10 - 5),
    bpSys: baseBPSys + Math.floor(Math.random() * 20 - 10),
    bpDia: baseBPDia + Math.floor(Math.random() * 10 - 5),
    spO2: Math.min(100, baseSpO2 + Math.floor(Math.random() * 4 - 2)),
    glucose: baseGlucose + Math.floor(Math.random() * 30 - 15),
    timestamp: new Date()
  };
}

export const MOCK_COMPRESSION_STATS = {
  originalLength: 1247,
  compressedLength: 342,
  savings: 72.6,
  summary: 'Key findings: 68M with witnessed onset 90min ago, NIHSS 8, on Apixaban for Afib, BP 165/95, CTA pending. Critical: DOAC anticoagulation requires specialist review.'
};
