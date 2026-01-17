import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { 
  Clock, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  PlayCircle, 
  RefreshCw,
  TrendingUp,
  FileText,
  Zap,
  ExternalLink
} from 'lucide-react';
import { CaseData, Vitals, PipelineStatus, WorkflowState } from '../../types/case';
import { calculateTimeDiff, formatTime, determineVitalStability } from '../../lib/caseUtils';

interface CommandCenterProps {
  caseData: CaseData;
  onGenerateHandoff: () => void;
  onOpenEvidence: () => void;
  onRerunPipeline: () => void;
  onVoiceAnnounce: () => void;
}

export function CommandCenter({ caseData, onGenerateHandoff, onOpenEvidence, onRerunPipeline, onVoiceAnnounce }: CommandCenterProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const timeSinceLKW = caseData.lastKnownWell 
    ? calculateTimeDiff(caseData.lastKnownWell, currentTime)
    : 'Unknown';

  const doorToCT = caseData.ctStart 
    ? calculateTimeDiff(caseData.edArrival, caseData.ctStart)
    : 'Pending';

  const ctToDecision = caseData.ctaResult && caseData.decisionTime
    ? calculateTimeDiff(caseData.ctaResult, caseData.decisionTime)
    : 'Pending';

  const stability = caseData.currentVitals 
    ? determineVitalStability(caseData.currentVitals)
    : 'Unknown';

  const statusIcon = (status: PipelineStatus) => {
    if (status === 'complete') return <CheckCircle2 className="size-4 text-green-600" />;
    if (status === 'running') return <RefreshCw className="size-4 text-blue-600 animate-spin" />;
    return <Clock className="size-4 text-slate-400" />;
  };

  const statusColor = (status: PipelineStatus) => {
    if (status === 'complete') return 'bg-green-50 border-green-200';
    if (status === 'running') return 'bg-blue-50 border-blue-200';
    return 'bg-slate-50 border-slate-200';
  };

  const stateColors: Record<WorkflowState, string> = {
    PROCEED: 'bg-green-600',
    HOLD: 'bg-yellow-600',
    ESCALATE: 'bg-red-600'
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Command Center</h2>
          <p className="text-slate-600">Live pipeline and decision monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRerunPipeline} className="gap-2">
            <RefreshCw className="size-4" />
            Re-run Pipeline
          </Button>
        </div>
      </div>

      {/* TWEAK A: Decision Strip */}
      <Card className="mb-6 border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-white">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Workflow State */}
            <div className="flex items-center gap-4">
              <div>
                <Badge className={`${stateColors[caseData.workflowState]} text-white text-2xl px-6 py-3 mb-2`}>
                  {caseData.workflowState}
                </Badge>
                <p className="text-xs text-slate-500">Updated {Math.floor(Math.random() * 10) + 1}s ago</p>
              </div>
            </div>

            {/* Middle: Reason + Next Steps */}
            <div className="col-span-2 space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Decision Reason:</p>
                <p className="text-sm">{caseData.workflowReason}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">Next Steps:</p>
                <ul className="space-y-1">
                  {caseData.nextSteps.slice(0, 3).map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-600 font-semibold">{idx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button onClick={onOpenEvidence} variant="outline" size="sm" className="gap-2">
                  <FileText className="size-4" />
                  View Evidence
                </Button>
                <Button onClick={onGenerateHandoff} size="sm" className="gap-2">
                  <ExternalLink className="size-4" />
                  Generate Handoff Packet
                </Button>
                <Button onClick={onVoiceAnnounce} variant="outline" size="sm" className="gap-2">
                  <Zap className="size-4" />
                  Announce
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* Column 1: Timeline */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="size-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TimelineEvent 
                label="Last Known Well"
                time={caseData.lastKnownWell}
                status={caseData.lkwUnknown ? 'unknown' : 'set'}
              />
              <TimelineEvent 
                label="ED Arrival"
                time={caseData.edArrival}
                status="set"
              />
              <TimelineEvent 
                label="CT Started"
                time={caseData.ctStart}
                status={caseData.ctStart ? 'set' : 'pending'}
              />
              <TimelineEvent 
                label="CTA Result"
                time={caseData.ctaResult}
                status={caseData.ctaResult ? 'set' : 'pending'}
              />
              <TimelineEvent 
                label="Decision Time"
                time={caseData.decisionTime}
                status={caseData.decisionTime ? 'set' : 'pending'}
              />
            </CardContent>
          </Card>

          <Card className="bg-slate-50">
            <CardHeader>
              <CardTitle className="text-sm">Derived Timers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Time since LKW:</span>
                <span className="font-semibold">{timeSinceLKW}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Door-to-CT:</span>
                <span className="font-semibold">{doorToCT}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">CT-to-Decision:</span>
                <span className="font-semibold">{ctToDecision}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">ETA to Center:</span>
                <span className="font-semibold">~45 min</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Live Telemetry */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="size-4" />
                Live Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {caseData.currentVitals ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <VitalTile label="HR" value={caseData.currentVitals.hr} unit="bpm" />
                    <VitalTile 
                      label="BP" 
                      value={`${caseData.currentVitals.bpSys}/${caseData.currentVitals.bpDia}`} 
                      unit="mmHg" 
                    />
                    <VitalTile label="SpO2" value={caseData.currentVitals.spO2} unit="%" />
                    <VitalTile label="Glucose" value={caseData.currentVitals.glucose} unit="mg/dL" />
                  </div>

                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Stability:</span>
                      <Badge 
                        className={
                          stability === 'Stable' ? 'bg-green-600' :
                          stability === 'Borderline' ? 'bg-yellow-600' :
                          'bg-red-600'
                        }
                      >
                        {stability}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <div className="size-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Telemetry healthy • {caseData.vitalsHistory.length} readings</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Activity className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Vitals streaming not active</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Column 3: NeuroCast Reasoning Feed */}
        <div className="space-y-4">
          <Card className={statusColor(caseData.pipelineStatus.compression)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Token Compression</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">powered by TokenCo</p>
                </div>
                {statusIcon(caseData.pipelineStatus.compression)}
              </div>
            </CardHeader>
            {caseData.pipelineStatus.compression === 'complete' && caseData.compressionStats && (
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Original:</span>
                  <span>{caseData.compressionStats.originalLength} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Compressed:</span>
                  <span>{caseData.compressionStats.compressedLength} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Savings:</span>
                  <span className="font-semibold text-green-600">{caseData.compressionStats.savings}%</span>
                </div>
                {caseData.compressionStats.summary && (
                  <div className="pt-2 mt-2 border-t">
                    <p className="text-xs text-slate-600 italic">"{caseData.compressionStats.summary}"</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          <Card className={statusColor(caseData.pipelineStatus.extraction)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Context Agent: Risk Flags</CardTitle>
                {statusIcon(caseData.pipelineStatus.extraction)}
              </div>
            </CardHeader>
            {caseData.pipelineStatus.extraction === 'complete' && (
              <CardContent className="space-y-2">
                {caseData.riskFlags.slice(0, 3).map((flag) => (
                  <div key={flag.id} className="p-2 bg-white border rounded text-xs">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`size-3 shrink-0 mt-0.5 ${
                        flag.severity === 'critical' ? 'text-red-600' :
                        flag.severity === 'warning' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                      <div>
                        <p className="font-medium">{flag.name}</p>
                        <p className="text-slate-600 mt-1">"{flag.evidenceQuote.slice(0, 60)}..."</p>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2">
                  <FileText className="size-3 mr-1" />
                  View All Evidence
                </Button>
              </CardContent>
            )}
          </Card>

          <Card className={statusColor(caseData.pipelineStatus.numeric)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Numeric Engine</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">powered by Wood Wide</p>
                </div>
                {statusIcon(caseData.pipelineStatus.numeric)}
              </div>
            </CardHeader>
            {caseData.pipelineStatus.numeric === 'complete' && caseData.numericInsights && (
              <CardContent className="space-y-2 text-xs">
                <div className="space-y-1">
                  <p><span className="text-slate-600">Time since LKW:</span> <strong>{caseData.numericInsights.timeSinceLKW}</strong></p>
                  <p><span className="text-slate-600">Completeness:</span> <strong>{caseData.numericInsights.completeness}%</strong></p>
                  <p><span className="text-slate-600">Stability:</span> <strong>{caseData.numericInsights.stabilityFlag}</strong></p>
                </div>
                <div className="pt-2 mt-2 border-t">
                  <p className="text-xs text-slate-500 italic">Stability rule: &gt;90% readings in-range</p>
                </div>
              </CardContent>
            )}
          </Card>

          <Card className={`${statusColor(caseData.pipelineStatus.routing)} border-2`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Routing Gate Decision</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">deterministic policy gate</p>
                </div>
                {statusIcon(caseData.pipelineStatus.routing)}
              </div>
            </CardHeader>
            {caseData.pipelineStatus.routing === 'complete' && (
              <CardContent className="space-y-3">
                <div className="text-center">
                  <Badge className={`${stateColors[caseData.workflowState]} text-white text-lg px-6 py-2`}>
                    {caseData.workflowState}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-slate-600 font-medium">Reason:</p>
                    <p className="text-sm">{caseData.workflowReason}</p>
                  </div>
                  
                  <div>
                    <p className="text-slate-600 font-medium">Triggered Rule:</p>
                    <p className="text-xs italic">{caseData.triggeredRule}</p>
                  </div>

                  <div>
                    <p className="text-slate-600 font-medium mb-1">Next Steps:</p>
                    <ul className="space-y-1 text-xs">
                      {caseData.nextSteps.slice(0, 3).map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={onGenerateHandoff} size="sm" className="flex-1 gap-1">
                    <FileText className="size-3" />
                    Handoff Packet
                  </Button>
                  <Button onClick={onVoiceAnnounce} variant="outline" size="sm" className="gap-1">
                    <Zap className="size-3" />
                    Announce
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function TimelineEvent({ label, time, status }: { label: string; time: Date | null; status: 'set' | 'pending' | 'unknown' }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}:</span>
      <span className={`font-medium ${
        status === 'pending' ? 'text-slate-400' :
        status === 'unknown' ? 'text-amber-600' :
        'text-slate-900'
      }`}>
        {status === 'unknown' ? 'Unknown' : formatTime(time)}
      </span>
    </div>
  );
}

function VitalTile({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div className="p-3 bg-slate-50 rounded-lg border">
      <p className="text-xs text-slate-600 mb-1">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-slate-500">{unit}</p>
    </div>
  );
}