import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { TopBar } from './components/TopBar';
import { Sidebar, Page } from './components/Sidebar';
import { StartCase } from './components/pages/StartCase';
import { CommandCenter } from './components/pages/CommandCenter';
import { EvidenceAudit } from './components/pages/EvidenceAudit';
import { HandoffPacket } from './components/pages/HandoffPacket';
import { VoiceCommander } from './components/pages/VoiceCommander';
import { Observability } from './components/pages/Observability';
import { CaseData, VoiceAnnouncement, PipelineStatus } from './types/case';
import { DEMO_CASES, generateMockVitals, MOCK_COMPRESSION_STATS } from './lib/mockData';
import { calculateCompletenessScore, getMissingItems, calculateTimeDiff, determineVitalStability } from './lib/caseUtils';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('start');
  const [activeCaseId, setActiveCaseId] = useState<string>('NC-2026-001A');
  const [cases, setCases] = useState<Record<string, CaseData>>({});
  const [announcements, setAnnouncements] = useState<VoiceAnnouncement[]>([]);

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
      }
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

    // Simulate pipeline execution
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
        compression: partialCase.uploadedDocument ? 'complete' : 'pending',
        extraction: partialCase.uploadedDocument ? 'complete' : 'pending',
        numeric: 'complete',
        routing: 'complete'
      }
    };

    // Run pipeline simulation
    runPipeline(newCase);
  };

  const runPipeline = (caseData: CaseData) => {
    setCases(prev => ({ ...prev, [caseData.id]: caseData }));
    setActiveCaseId(caseData.id);
    
    // Simulate pipeline stages
    let currentStatus = { ...caseData.pipelineStatus };
    
    // Stage 1: Compression
    currentStatus.compression = 'running';
    updateCaseStatus(caseData.id, currentStatus);
    
    setTimeout(() => {
      currentStatus.compression = 'complete';
      currentStatus.extraction = 'running';
      updateCaseStatus(caseData.id, currentStatus);
      
      setTimeout(() => {
        currentStatus.extraction = 'complete';
        currentStatus.numeric = 'running';
        updateCaseStatus(caseData.id, currentStatus);
        
        setTimeout(() => {
          currentStatus.numeric = 'complete';
          currentStatus.routing = 'running';
          updateCaseStatus(caseData.id, currentStatus);
          
          setTimeout(() => {
            currentStatus.routing = 'complete';
            updateCaseStatus(caseData.id, currentStatus);
            setCurrentPage('command');
            toast.success('Pipeline execution complete');
          }, 500);
        }, 500);
      }, 800);
    }, 600);
  };

  const updateCaseStatus = (caseId: string, status: Record<string, PipelineStatus>) => {
    setCases(prev => ({
      ...prev,
      [caseId]: {
        ...prev[caseId],
        pipelineStatus: status as any
      }
    }));
  };

  const handleRerunPipeline = () => {
    const currentCase = cases[activeCaseId];
    if (currentCase) {
      toast.info('Re-running pipeline...');
      runPipeline(currentCase);
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

          {!currentCase && currentPage !== 'start' && (
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