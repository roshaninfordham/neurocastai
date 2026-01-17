import { CaseData, VitalStability } from '../types/case';

export function calculateTimeDiff(start: Date | null, end: Date | null): string {
  if (!start || !end) return 'Unknown';
  
  const diffMs = end.getTime() - start.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  
  if (diffMin < 60) {
    return `${diffMin} min`;
  }
  
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;
  return `${hours}h ${minutes}m`;
}

export function calculateCompletenessScore(caseData: Partial<CaseData>): number {
  let score = 0;
  let total = 0;
  
  // LKW known
  total += 20;
  if (caseData.lastKnownWell || caseData.lkwUnknown === false) score += 20;
  
  // Document uploaded
  total += 20;
  if (caseData.uploadedDocument) score += 20;
  
  // Vitals streaming
  total += 15;
  if (caseData.vitalsStreaming) score += 15;
  
  // CT info
  total += 20;
  if (caseData.ctStart) score += 20;
  
  // CTA result
  total += 15;
  if (caseData.ctaResult) score += 15;
  
  // Meds list
  total += 10;
  if (caseData.medsListPresent) score += 10;
  
  return Math.round((score / total) * 100);
}

export function determineVitalStability(vitals: any): VitalStability {
  if (!vitals) return 'Stable';
  
  const { hr, bpSys, spO2 } = vitals;
  
  // Critical thresholds
  if (hr > 120 || hr < 50 || bpSys > 200 || bpSys < 90 || spO2 < 90) {
    return 'Unstable';
  }
  
  // Warning thresholds
  if (hr > 100 || hr < 60 || bpSys > 180 || bpSys < 100 || spO2 < 94) {
    return 'Borderline';
  }
  
  return 'Stable';
}

export function getMissingItems(caseData: Partial<CaseData>): string[] {
  const missing: string[] = [];
  
  if (!caseData.lastKnownWell && !caseData.lkwUnknown) {
    missing.push('Last known well time not established');
  }
  
  if (!caseData.uploadedDocument) {
    missing.push('Transfer packet not uploaded');
  }
  
  if (!caseData.medsListPresent) {
    missing.push('Complete medication list needed');
  }
  
  if (!caseData.ctStart) {
    missing.push('CT imaging not started');
  }
  
  if (!caseData.ctaResult) {
    missing.push('CTA result pending');
  }
  
  if (!caseData.vitalsStreaming) {
    missing.push('Vitals monitoring not active');
  }
  
  return missing;
}

export function formatTime(date: Date | null): string {
  if (!date) return '--:--';
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

export function formatTimeWithDate(date: Date | null): string {
  if (!date) return 'Not set';
  return date.toLocaleString('en-US', { 
    month: 'short',
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}
