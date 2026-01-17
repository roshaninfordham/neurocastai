import { CaseData, RiskFlag, Vitals } from '../types/case';

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
    ]
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
    ]
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
        whyMatters: 'Aspirin noted for receiving team awareness - minimal bleeding risk at this dose',
        recommendedAction: 'Include in handoff - no delay indicated',
        includeInHandoff: true
      }
    ],
    missingItems: []
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