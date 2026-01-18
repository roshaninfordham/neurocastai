import { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { TopBar } from './components/TopBar';
import { Sidebar, Page } from './components/Sidebar';
import { StartCase } from './components/pages/StartCase';
import { CommandCenter } from './components/pages/CommandCenter';
import { EvidenceAudit } from './components/pages/EvidenceAudit';
import { HandoffPacket } from './components/pages/HandoffPacket';
import { VoiceCommander } from './components/pages/VoiceCommander';
import { Observability } from './components/pages/Observability';
// import { Products } from './components/pages/Products';
import { CaseData, VoiceAnnouncement, VitalStability } from './types/case';
import { DEMO_CASES, generateMockVitals, MOCK_COMPRESSION_STATS } from './lib/mockData';
import { calculateCompletenessScore, getMissingItems, calculateTimeDiff, determineVitalStability } from './lib/caseUtils';
import type {
  CaseInput,
  CaseInputTelemetry,
  CaseDerived,
  CompressionResult,
  NumericMetrics,
  PacketSourceType,
  TelemetryMode,
  TimelineEvent,
  PipelineEvent,
  RiskFlag as SharedRiskFlag,
} from '@neurocast/shared';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('start');
  const [activeCaseId, setActiveCaseId] = useState<string>('NC-2026-001A');
  const [cases, setCases] = useState<Record<string, CaseData>>({});
  const [announcements, setAnnouncements] = useState<VoiceAnnouncement[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const mapSharedRiskFlags = (flags: SharedRiskFlag[]): CaseData['riskFlags'] => {
    return flags.map((flag) => ({
      id: flag.id,
      name: flag.label,
      severity:
        flag.severity === 'CRITICAL'
          ? 'critical'
          : flag.severity === 'WARNING'
          ? 'warning'
          : 'info',
      evidenceQuote: flag.evidence.quote,
      source: flag.evidence.sourceAnchor,
      section: flag.evidence.docType,
      lineNumber: undefined,
      confidence:
        flag.confidence === 'HIGH'
          ? 'high'
          : flag.confidence === 'MEDIUM'
          ? 'medium'
          : 'low',
      whyMatters: flag.coordinationGuidance,
      recommendedAction: flag.coordinationGuidance,
      includeInHandoff: flag.includeInHandoffByDefault,
    }));
  };

  const mapCompression = (compression: CompressionResult | undefined) => {
    if (!compression) {
      return undefined;
    }
    return {
      originalLength: compression.originalTokenEstimate,
      compressedLength: compression.compressedTokenEstimate,
      savings: compression.savingsPct,
      summary: compression.compressedTextPreview,
    };
  };

  const mapNumeric = (numeric: NumericMetrics | undefined) => {
    if (!numeric) {
      return undefined;
    }
    const minutesToLabel = (value: number | undefined) => {
      if (value === undefined) return 'Pending';
      return `${value} min`;
    };
    const stabilityFlag: VitalStability =
      numeric.stability.status === 'STABLE'
        ? 'Stable'
        : numeric.stability.status === 'BORDERLINE'
        ? 'Borderline'
        : 'Unstable';
    return {
      timeSinceLKW: minutesToLabel(numeric.derivedTimers.timeSinceLKWMin),
      doorToCT: minutesToLabel(numeric.derivedTimers.doorToCTMin),
      ctToDecision: minutesToLabel(numeric.derivedTimers.ctToDecisionMin),
      etaToCenter: minutesToLabel(numeric.derivedTimers.etaToCenterMin),
      stabilityFlag,
      completeness: numeric.completeness.scorePct,
    };
  };

  const buildHandoffPacketFromCase = (caseData: CaseData, derived: CaseDerived) => {
    const header = {
      caseId: caseData.id,
      facilityType: caseData.facilityType === 'hub' ? 'Stroke center (hub)' : 'Non-specialized ED (spoke)',
      arrivalMode: caseData.arrivalMode,
      workflowState: caseData.workflowState,
      completenessScorePct: caseData.completenessScore,
    };

    const timelineTable = [
      {
        event: 'Last Known Well',
        time: caseData.lastKnownWell ? caseData.lastKnownWell.toISOString() : undefined,
        interval: undefined,
      },
      {
        event: 'ED Arrival',
        time: caseData.edArrival.toISOString(),
        interval: undefined,
      },
      {
        event: 'CT Start',
        time: caseData.ctStart ? caseData.ctStart.toISOString() : undefined,
        interval: undefined,
      },
      {
        event: 'Decision Time',
        time: caseData.decisionTime ? caseData.decisionTime.toISOString() : undefined,
        interval: undefined,
      },
    ];

    const vitalsSummary = {
      hr: caseData.currentVitals?.hr,
      bp: caseData.currentVitals ? `${caseData.currentVitals.bpSys}/${caseData.currentVitals.bpDia}` : undefined,
      spo2: caseData.currentVitals ? `${caseData.currentVitals.spO2}%` : undefined,
      glucose: caseData.currentVitals ? `${caseData.currentVitals.glucose}` : undefined,
      stability: caseData.numericInsights?.stabilityFlag || 'Unknown',
    };

    const risks =
      derived.outputs.riskFlags?.map((flag) => ({
        severity: flag.severity,
        label: flag.label,
        evidenceQuote: flag.evidence.quote,
        sourceAnchor: flag.evidence.sourceAnchor,
        confidence: flag.confidence,
      })) || [];

    const missingInfoChecklist = caseData.missingItems;

    const coordinationNextSteps =
      derived.outputs.decision?.nextSteps && derived.outputs.decision.nextSteps.length > 0
        ? derived.outputs.decision.nextSteps
        : caseData.nextSteps;

    const exportObj = {
      text: `NeuroCast AI coordination summary for case ${caseData.id}`,
    };

    return {
      header,
      timelineTable,
      vitalsSummary,
      risks,
      missingInfoChecklist,
      coordinationNextSteps,
      export: exportObj,
    };
  };

  const applyDerivedResultToCase = (derived: CaseDerived) => {
    setCases((prev) => {
      const existing = prev[derived.caseId];
      if (!existing) {
        return prev;
      }

      const compressionStats = mapCompression(derived.outputs.compression);
      const numericInsights = mapNumeric(derived.outputs.numeric);
      const riskFlags = derived.outputs.riskFlags
        ? mapSharedRiskFlags(derived.outputs.riskFlags)
        : existing.riskFlags;

      const workflowState = derived.outputs.decision
        ? derived.outputs.decision.state
        : existing.workflowState;
      const workflowReason = derived.outputs.decision
        ? derived.outputs.decision.reason
        : existing.workflowReason;
      const triggeredRule =
        derived.outputs.decision && derived.outputs.decision.triggeredRules.length > 0
          ? derived.outputs.decision.triggeredRules[0].name
          : existing.triggeredRule;
      const nextSteps =
        derived.outputs.decision && derived.outputs.decision.nextSteps.length > 0
          ? derived.outputs.decision.nextSteps
          : existing.nextSteps;

      const completenessScore =
        numericInsights && typeof numericInsights.completeness === 'number'
          ? numericInsights.completeness
          : existing.completenessScore;

      const missingItems = derived.outputs.numeric?.completeness.missing || existing.missingItems;

      const vtp = derived.outputs.vtp;

      const handoffPacket = derived.outputs.handoff
        ? {
            header: derived.outputs.handoff.header,
            timelineTable: derived.outputs.handoff.timelineTable,
            vitalsSummary: derived.outputs.handoff.vitalsSummary,
            risks: derived.outputs.handoff.risks,
            missingInfoChecklist: derived.outputs.handoff.missingInfoChecklist,
            coordinationNextSteps: derived.outputs.handoff.coordinationNextSteps,
            export: derived.outputs.handoff.export,
          }
        : buildHandoffPacketFromCase(
            {
              ...existing,
              workflowState,
              workflowReason,
              triggeredRule,
              nextSteps,
              compressionStats: compressionStats || existing.compressionStats,
              numericInsights: numericInsights || existing.numericInsights,
              completenessScore,
              riskFlags,
            },
            derived
          );

      return {
        ...prev,
        [derived.caseId]: {
          ...existing,
          runId: derived.runId,
          workflowState,
          workflowReason,
          triggeredRule,
          nextSteps,
          compressionStats: compressionStats || existing.compressionStats,
          numericInsights: numericInsights || existing.numericInsights,
          completenessScore,
          missingItems,
          riskFlags,
          metrics: derived.metrics,
          handoffPacket,
          vtp,
          derived,
          pipelineStatus: {
            compression: 'complete',
            extraction: 'complete',
            numeric: 'complete',
            routing: 'complete',
          },
          pipelineEvents: derived.events,
        },
      };
    });
  };

  const toCaseInput = (caseData: CaseData): CaseInput => {
    const timeline: TimelineEvent[] = [];

    if (caseData.lastKnownWell) {
      timeline.push({
        type: 'LAST_KNOWN_WELL',
        time: caseData.lastKnownWell.toISOString(),
        source: 'ED',
        certainty: 'EXACT',
      });
    }

    timeline.push({
      type: 'ED_ARRIVAL',
      time: caseData.edArrival.toISOString(),
      source: 'ED',
      certainty: 'EXACT',
    });

    if (caseData.ctStart) {
      timeline.push({
        type: 'CT_START',
        time: caseData.ctStart.toISOString(),
        source: 'ED',
        certainty: 'EXACT',
      });
    }

    if (caseData.ctaResult) {
      timeline.push({
        type: 'CTA_RESULT',
        time: caseData.ctaResult.toISOString(),
        source: 'SYSTEM',
        certainty: 'EXACT',
      });
    }

    if (caseData.decisionTime) {
      timeline.push({
        type: 'DECISION_TIME',
        time: caseData.decisionTime.toISOString(),
        source: 'ED',
        certainty: 'EXACT',
      });
    }

    if (caseData.transferRequest) {
      timeline.push({
        type: 'TRANSFER_ACTIVATED',
        time: caseData.transferRequest.toISOString(),
        source: 'SYSTEM',
        certainty: 'EXACT',
      });
    }

    const packetSourceType: PacketSourceType = caseData.uploadedDocument
      ? 'PASTE_TEXT'
      : 'SIMULATED';

    const telemetryMode: TelemetryMode = caseData.vitalsStreaming
      ? 'SIMULATED'
      : 'MANUAL';

    const telemetry: CaseInputTelemetry = {
      mode: telemetryMode,
      vitals: [],
    };

    return {
      caseId: caseData.id,
      createdAt: new Date().toISOString(),
      facility: {
        type: caseData.facilityType === 'hub' ? 'THROMBECTOMY_CENTER' : 'SPOKE_ED',
        name: caseData.facilityType === 'hub' ? 'Stroke Center' : 'Spoke ED',
      },
      arrivalMode: caseData.arrivalMode === 'EMS' ? 'EMS' : 'WALK_IN',
      patient: caseData.patientAge
        ? {
            age: caseData.patientAge,
          }
        : undefined,
      timeline,
      packet: {
        sourceType: packetSourceType,
        rawText: caseData.uploadedDocument || '',
        hasMedsList: caseData.medsListPresent,
        hasImagingReport: caseData.imagingReportAvailable,
        declaredSynthetic: true,
        consentAcknowledged: true,
      },
      telemetry,
    };
  };

  const applyPipelineEventToCase = (event: PipelineEvent) => {
    setCases((prevCases) => {
      const payload = (event.payload || {}) as { caseId?: string; state?: string; reason?: string; triggeredRuleIds?: string[] };
      const targetCaseId = payload.caseId || activeCaseId;

      if (!targetCaseId) {
        return prevCases;
      }

      const existing = prevCases[targetCaseId];
      if (!existing) {
        return prevCases;
      }

      const updatedPipelineEvents = [...(existing.pipelineEvents || []), event];

      const updatedStatus = { ...existing.pipelineStatus };

      if (event.step === 'COMPRESS') {
        if (event.eventType === 'STEP_STARTED') {
          updatedStatus.compression = 'running';
        }
        if (event.eventType === 'STEP_DONE') {
          updatedStatus.compression = 'complete';
        }
      }

      if (event.step === 'EXTRACT') {
        if (event.eventType === 'STEP_STARTED') {
          updatedStatus.extraction = 'running';
        }
        if (event.eventType === 'STEP_DONE') {
          updatedStatus.extraction = 'complete';
        }
      }

      if (event.step === 'NUMERIC') {
        if (event.eventType === 'STEP_STARTED') {
          updatedStatus.numeric = 'running';
        }
        if (event.eventType === 'STEP_DONE') {
          updatedStatus.numeric = 'complete';
        }
      }

      if (event.step === 'ROUTE') {
        if (event.eventType === 'STEP_STARTED') {
          updatedStatus.routing = 'running';
        }
        if (event.eventType === 'STEP_DONE') {
          updatedStatus.routing = 'complete';
        }
      }

      let workflowState = existing.workflowState;
      let workflowReason = existing.workflowReason;
      let triggeredRule = existing.triggeredRule;

      if (event.step === 'ROUTE' && event.eventType === 'STEP_DONE') {
        if (payload.state === 'HOLD' || payload.state === 'ESCALATE' || payload.state === 'PROCEED') {
          workflowState = payload.state;
        }
        if (typeof payload.reason === 'string') {
          workflowReason = payload.reason;
        }
        if (payload.triggeredRuleIds && payload.triggeredRuleIds.length > 0) {
          triggeredRule = payload.triggeredRuleIds[0];
        }
      }

      return {
        ...prevCases,
        [targetCaseId]: {
          ...existing,
          pipelineStatus: updatedStatus,
          pipelineEvents: updatedPipelineEvents,
          workflowState,
          workflowReason,
          triggeredRule,
        },
      };
    });
  };

  const startEventStream = (runId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const source = new EventSource(`/api/run/events?runId=${encodeURIComponent(runId)}`);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as PipelineEvent;
        applyPipelineEventToCase(data);
      } catch {
        // ignore malformed events
      }
    };

    source.addEventListener('done', async () => {
      try {
        // Retry loop to handle 409 (still RUNNING)
        let attempts = 0;
        let resultLoaded = false;
        while (attempts < 10 && !resultLoaded) {
          const response = await fetch(`/api/run/result?runId=${encodeURIComponent(runId)}`);
          if (response.status === 200) {
            const data = (await response.json()) as { status: string; result: CaseDerived | null };
            if (data.result) {
              applyDerivedResultToCase(data.result);
              resultLoaded = true;
              break;
            }
          } else if (response.status === 409) {
            await new Promise((res) => setTimeout(res, 300));
            attempts += 1;
            continue;
          } else {
            // 400/404/500
            break;
          }
        }
        if (resultLoaded) {
          toast.success('Report generated');
        } else {
          toast.error('Pipeline completed but result not ready');
        }
      } catch {
        toast.error('Pipeline completed but result could not be loaded');
      } finally {
        source.close();
        eventSourceRef.current = null;
        setActiveRunId(null);
      }
    });

    source.onerror = () => {
      source.close();
      eventSourceRef.current = null;
      toast.error('Lost connection to pipeline event stream');
    };

    eventSourceRef.current = source;
  };

  const startBackendPipelineForCase = async (caseData: CaseData) => {
    try {
      const caseInput = toCaseInput(caseData);
      const response = await fetch('/api/run/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(caseInput),
      });

      if (!response.ok) {
        throw new Error('Failed to start pipeline run');
      }

      const data = (await response.json()) as { runId: string; caseId: string };

      setCases((prev) => {
        const existing = prev[caseData.id];
        if (!existing) {
          return prev;
        }
        return {
          ...prev,
          [caseData.id]: {
            ...existing,
            runId: data.runId,
          },
        };
      });

      setActiveRunId(data.runId);
      startEventStream(data.runId);
    } catch {
      toast.error('Unable to start pipeline backend run');
    }
  };

  const handleReconnectStream = () => {
    if (activeRunId) {
      startEventStream(activeRunId);
    } else {
      toast.error('No active pipeline run to reconnect');
    }
  };

  // Initialize with a default case
  useEffect(() => {
    loadDemoCase('case-a');
  }, []);

  // Vitals streaming simulator
  useEffect(() => {
    const interval = setInterval(() => {
      setCases(prevCases => {
        const updated = { ...prevCases };
        Object.keys(updated).forEach(caseId => {
          const caseData = updated[caseId];
          if (caseData.vitalsStreaming) {
            const newVitals = generateMockVitals(caseData.workflowState === 'PROCEED');
            updated[caseId] = {
              ...caseData,
              currentVitals: newVitals,
              vitalsHistory: [...caseData.vitalsHistory, newVitals].slice(-30)
            };
          }
        });
        return updated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const loadDemoCase = (demoKey: string) => {
    const demoData = DEMO_CASES[demoKey];
    if (!demoData) return;

    const completenessScore = calculateCompletenessScore(demoData);
    const missingItems = getMissingItems(demoData);

    const newCase: CaseData = {
      id: demoData.id || 'NC-2026-001',
      facilityType: demoData.facilityType || 'spoke',
      patientAge: demoData.patientAge,
      arrivalMode: demoData.arrivalMode || 'EMS',
      lastKnownWell: demoData.lastKnownWell || null,
      lkwUnknown: demoData.lkwUnknown || false,
      symptomDiscovery: null,
      edArrival: demoData.edArrival || new Date(),
      ctStart: demoData.ctStart || null,
      ctaResult: demoData.ctaResult || null,
      decisionTime: new Date(),
      transferRequest: null,
      uploadedDocument: demoData.uploadedDocument,
      medsListPresent: demoData.medsListPresent || false,
      imagingReportAvailable: demoData.imagingReportAvailable || false,
      vitalsStreaming: true,
      workflowState: demoData.workflowState || 'PROCEED',
      workflowReason: demoData.workflowReason || '',
      triggeredRule: demoData.triggeredRule || '',
      nextSteps: demoData.nextSteps || [],
      riskFlags: demoData.riskFlags || [],
      currentVitals: generateMockVitals(demoData.workflowState === 'PROCEED'),
      vitalsHistory: [],
      completenessScore,
      missingItems: demoData.missingItems || missingItems,
      compressionStats: MOCK_COMPRESSION_STATS,
      numericInsights: {
        timeSinceLKW: demoData.lastKnownWell 
          ? calculateTimeDiff(demoData.lastKnownWell, new Date())
          : 'Unknown',
        doorToCT: demoData.ctStart 
          ? calculateTimeDiff(demoData.edArrival!, demoData.ctStart)
          : 'Pending',
        ctToDecision: 'Complete',
        etaToCenter: '45 min',
        stabilityFlag: 'Stable',
        completeness: completenessScore
      },
      pipelineStatus: {
        compression: 'complete',
        extraction: 'complete',
        numeric: 'complete',
        routing: 'complete'
      },
      pipelineEvents: demoData.pipelineEvents || []
    };

    setCases(prev => ({ ...prev, [newCase.id]: newCase }));
    setActiveCaseId(newCase.id);
    setCurrentPage('command');
    
    toast.success(`Demo case ${demoKey.toUpperCase()} loaded`);
    
    // Add announcement
    addAnnouncement(
      `Case ${newCase.id} loaded. Workflow state: ${newCase.workflowState}. ${newCase.workflowReason}`,
      'state-change'
    );
  };

  const handleStartCase = (partialCase: Partial<CaseData>) => {
    const completenessScore = calculateCompletenessScore(partialCase);
    const missingItems = getMissingItems(partialCase);

    const newCase: CaseData = {
      id: partialCase.id || 'NC-2026-NEW',
      facilityType: partialCase.facilityType || 'spoke',
      patientAge: partialCase.patientAge,
      arrivalMode: partialCase.arrivalMode || 'EMS',
      lastKnownWell: partialCase.lastKnownWell || null,
      lkwUnknown: partialCase.lkwUnknown || false,
      symptomDiscovery: null,
      edArrival: partialCase.edArrival || new Date(),
      ctStart: null,
      ctaResult: null,
      decisionTime: null,
      transferRequest: null,
      uploadedDocument: partialCase.uploadedDocument,
      medsListPresent: partialCase.medsListPresent || false,
      imagingReportAvailable: partialCase.imagingReportAvailable || false,
      vitalsStreaming: partialCase.vitalsStreaming || false,
      workflowState: 'HOLD',
      workflowReason: 'Awaiting complete data upload and imaging results',
      triggeredRule: 'Rule: Minimum data requirements not met',
      nextSteps: [
        'Upload complete transfer packet',
        'Obtain CT/CTA imaging',
        'Verify medication list',
        'Confirm last known well time'
      ],
      riskFlags: [],
      currentVitals: partialCase.vitalsStreaming ? generateMockVitals() : null,
      vitalsHistory: [],
      completenessScore,
      missingItems,
      compressionStats: partialCase.uploadedDocument ? MOCK_COMPRESSION_STATS : undefined,
      numericInsights: {
        timeSinceLKW: partialCase.lastKnownWell 
          ? calculateTimeDiff(partialCase.lastKnownWell, new Date())
          : 'Unknown',
        doorToCT: 'Not started',
        ctToDecision: 'Pending',
        etaToCenter: '45 min',
        stabilityFlag: 'Stable',
        completeness: completenessScore
      },
      pipelineStatus: {
        compression: 'pending',
        extraction: 'pending',
        numeric: 'pending',
        routing: 'pending'
      },
      pipelineEvents: []
    };

    setCases(prev => ({ ...prev, [newCase.id]: newCase }));
    setActiveCaseId(newCase.id);
    setCurrentPage('command');

    startBackendPipelineForCase(newCase);
  };

  const handleRerunPipeline = () => {
    const currentCase = cases[activeCaseId];
    if (currentCase) {
      toast.info('Re-running pipeline...');
      setCases(prev => ({
        ...prev,
        [activeCaseId]: {
          ...currentCase,
          pipelineStatus: {
            compression: 'pending',
            extraction: 'pending',
            numeric: 'pending',
            routing: 'pending',
          },
          pipelineEvents: [],
        },
      }));
      startBackendPipelineForCase(currentCase);
    }
  };

  const handleToggleFlag = (flagId: string) => {
    setCases(prev => {
      const caseData = prev[activeCaseId];
      if (!caseData) return prev;
      
      const updatedFlags = caseData.riskFlags.map(flag =>
        flag.id === flagId
          ? { ...flag, includeInHandoff: !flag.includeInHandoff }
          : flag
      );

      return {
        ...prev,
        [activeCaseId]: {
          ...caseData,
          riskFlags: updatedFlags
        }
      };
    });
  };

  const addAnnouncement = (message: string, type: VoiceAnnouncement['type']) => {
    const announcement: VoiceAnnouncement = {
      id: `ann-${Date.now()}`,
      timestamp: new Date(),
      message,
      type
    };
    setAnnouncements(prev => [announcement, ...prev].slice(0, 20));
  };

  const handleVoiceAnnounce = () => {
    const currentCase = cases[activeCaseId];
    if (currentCase) {
      const message = `Alert: ${currentCase.workflowState}. ${currentCase.workflowReason}`;
      addAnnouncement(message, 'alert');
      toast.success('Voice announcement triggered');
      
      // Use browser speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(message);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const currentCase = cases[activeCaseId];
  const availableCases = Object.keys(cases);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Toaster position="top-right" />
      
      <TopBar
        currentCaseId={activeCaseId}
        availableCases={availableCases}
        workflowState={currentCase?.workflowState || 'HOLD'}
        completenessScore={currentCase?.completenessScore || 0}
        onCaseChange={setActiveCaseId}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

        <main className="flex-1 overflow-auto bg-slate-50">
          {currentPage === 'start' && (
            <StartCase
              onStartCase={handleStartCase}
              onLoadDemo={loadDemoCase}
            />
          )}

          {currentPage === 'command' && currentCase && (
            <CommandCenter
              caseData={currentCase}
              onGenerateHandoff={() => setCurrentPage('handoff')}
              onOpenEvidence={() => setCurrentPage('evidence')}
              onRerunPipeline={handleRerunPipeline}
              onVoiceAnnounce={handleVoiceAnnounce}
              onReconnect={handleReconnectStream}
            />
          )}

          {currentPage === 'evidence' && currentCase && (
            <EvidenceAudit
              caseData={currentCase}
              onBack={() => setCurrentPage('command')}
              onToggleFlag={handleToggleFlag}
            />
          )}

          {currentPage === 'handoff' && currentCase && (
            <HandoffPacket
              caseData={currentCase}
              onBack={() => setCurrentPage('command')}
            />
          )}

          {currentPage === 'voice' && currentCase && (
            <VoiceCommander
              caseData={currentCase}
              announcements={announcements}
              onBack={() => setCurrentPage('command')}
              onAnnounce={(msg) => addAnnouncement(msg, 'alert')}
            />
          )}

          {currentPage === 'observability' && currentCase && (
            <Observability
              caseData={currentCase}
              onBack={() => setCurrentPage('command')}
            />
          )}

          {currentPage === 'products' && (
            <Products />
          )}

          {!currentCase && currentPage !== 'start' && currentPage !== 'products' && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-slate-600 mb-4">No active case selected</p>
                <button
                  onClick={() => setCurrentPage('start')}
                  className="text-blue-600 hover:underline"
                >
                  Start a new case
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
