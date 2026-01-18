/**
 * Live Agent Orchestration Component
 * Displays real-time pipeline execution status with intermediate outputs
 */

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Copy, RefreshCcw, Zap, Server, Cloud, Activity, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { CaseData } from '../types/case';

interface LiveAgentOrchestrationProps {
    caseData: CaseData;
    onRerun: () => void;
    onReconnect: () => void;
}

// Pipeline steps in order
const PIPELINE_STEPS = ['INGEST', 'REDACT', 'COMPRESS', 'EXTRACT', 'NUMERIC', 'ROUTE', 'PACKET'];

// Step descriptions for "Agent is doing..." display
const STEP_DESCRIPTIONS: Record<string, string> = {
    INGEST: 'Ingesting case data and normalizing inputs...',
    REDACT: 'Removing PHI and sensitive data...',
    COMPRESS: 'Compressing text with NeuroCast Compression (saving tokens)...',
    EXTRACT: 'Extracting coordination risk flags with evidence...',
    NUMERIC: 'Computing Wood Wide metrics (prediction + clustering)...',
    ROUTE: 'Applying deterministic routing policy...',
    PACKET: 'Generating handoff packet and VTP...',
};

export function LiveAgentOrchestration({ caseData, onRerun, onReconnect }: LiveAgentOrchestrationProps) {
    const runId = caseData.runId;
    const runSource = caseData.runSource;
    const currentStep = caseData.currentStep || 'INGEST';
    const intermediateOutputs = caseData.intermediateOutputs || {};

    // Calculate progress
    const completedSteps = (() => {
        const { compression, extraction, numeric, routing } = caseData.pipelineStatus;
        let count = 0;
        if (compression === 'complete') count++;
        if (extraction === 'complete') count++;
        if (numeric === 'complete') count++;
        if (routing === 'complete') count++;
        // INGEST and REDACT are early steps, assume complete if compression started
        if (compression !== 'pending') count += 2;
        return count;
    })();
    const progressPercent = Math.round((completedSteps / PIPELINE_STEPS.length) * 100);

    const isRunning = Object.values(caseData.pipelineStatus).some(s => s === 'running');
    const isComplete = Object.values(caseData.pipelineStatus).every(s => s === 'complete');

    const handleCopyRunId = () => {
        if (runId) {
            navigator.clipboard.writeText(runId);
            toast.success('Run ID copied');
        }
    };

    const shortenedRunId = runId ? `${runId.slice(0, 8)}...` : 'N/A';

    return (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="size-5 text-blue-600" />
                        Live Agent Orchestration
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onReconnect} className="gap-1.5">
                            <RefreshCcw className="size-3.5" />
                            Reconnect
                        </Button>
                        <Button variant="outline" size="sm" onClick={onRerun} className="gap-1.5">
                            <Zap className="size-3.5" />
                            Re-run
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Run Info Row */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                    {/* Run Mode Badge */}
                    <div className="flex items-center gap-2">
                        <span className="text-slate-600">Run Mode:</span>
                        {runSource === 'MCP' ? (
                            <Badge className="bg-purple-600 text-white gap-1">
                                <Cloud className="size-3" />
                                MCP
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-slate-100 gap-1">
                                <Server className="size-3" />
                                LOCAL
                            </Badge>
                        )}
                    </div>

                    {/* Run ID */}
                    <div className="flex items-center gap-2">
                        <span className="text-slate-600">Run ID:</span>
                        <code className="bg-white px-2 py-0.5 rounded border text-xs font-mono">{shortenedRunId}</code>
                        <Button variant="ghost" size="sm" onClick={handleCopyRunId} className="h-6 w-6 p-0">
                            <Copy className="size-3" />
                        </Button>
                    </div>

                    {/* Current Step Badge */}
                    <div className="flex items-center gap-2">
                        <span className="text-slate-600">Current Step:</span>
                        <Badge variant="outline" className={isRunning ? 'bg-amber-100 border-amber-300 animate-pulse' : 'bg-green-100 border-green-300'}>
                            {isRunning ? <Clock className="size-3 mr-1" /> : <CheckCircle2 className="size-3 mr-1" />}
                            {currentStep}
                        </Badge>
                    </div>
                </div>

                {/* Agent Status Line */}
                <div className="flex items-center gap-2 text-sm">
                    {isRunning && (
                        <>
                            <span className="text-blue-600 font-medium">Agent is doing:</span>
                            <span className="text-slate-700 italic">{STEP_DESCRIPTIONS[currentStep] || 'Processing...'}</span>
                        </>
                    )}
                    {isComplete && (
                        <>
                            <CheckCircle2 className="size-4 text-green-600" />
                            <span className="text-green-700 font-medium">Pipeline complete</span>
                        </>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                        <span>Progress</span>
                        <span>{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                </div>

                {/* Intermediate Outputs Panel */}
                <div className="bg-white rounded-lg border p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Intermediate Outputs (Real-time)</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {/* REDACT */}
                        <div className="bg-slate-50 rounded p-2">
                            <p className="text-slate-500 font-medium">REDACT</p>
                            <p className="text-slate-800">
                                {intermediateOutputs.redact
                                    ? `${intermediateOutputs.redact.removedFields.length} fields removed`
                                    : <span className="text-slate-400">Pending</span>}
                            </p>
                        </div>

                        {/* COMPRESS (NeuroCast Compression) - Enhanced metrics */}
                        <div className="bg-gradient-to-r from-purple-50 to-slate-50 rounded p-2 col-span-2 border border-purple-200">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-purple-700 font-medium">COMPRESS</p>
                                <span className="text-[10px] text-purple-500">powered by NeuroCast Compression</span>
                            </div>
                            {intermediateOutputs.compress ? (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-600 font-bold text-sm">
                                            {intermediateOutputs.compress.savingsPct}% saved
                                        </span>
                                        <span className="text-slate-600">
                                            ({intermediateOutputs.compress.tokensSaved} tokens)
                                        </span>
                                        <span className="text-slate-500">
                                            {intermediateOutputs.compress.ratio?.toFixed(1)}x ratio
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <span className="text-slate-500">
                                            {intermediateOutputs.compress.originalTokens} → {intermediateOutputs.compress.compressedTokens} tokens
                                        </span>
                                        {/* Quality Badge */}
                                        {intermediateOutputs.compress.qualityScore !== undefined && (
                                            <Badge className={
                                                intermediateOutputs.compress.qualityOk
                                                    ? 'bg-green-600 text-[10px] px-1.5 py-0'
                                                    : intermediateOutputs.compress.qualityScore >= 60
                                                        ? 'bg-amber-600 text-[10px] px-1.5 py-0'
                                                        : 'bg-red-600 text-[10px] px-1.5 py-0'
                                            }>
                                                {intermediateOutputs.compress.qualityOk
                                                    ? `Quality OK (${intermediateOutputs.compress.qualityScore})`
                                                    : intermediateOutputs.compress.qualityScore >= 60
                                                        ? `Quality WARN (${intermediateOutputs.compress.qualityScore})`
                                                        : `Fallback`}
                                            </Badge>
                                        )}
                                        {intermediateOutputs.compress.provider === 'FALLBACK' && (
                                            <Badge className="bg-slate-500 text-[10px] px-1.5 py-0">
                                                FALLBACK
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-slate-400">Pending</span>
                            )}
                        </div>

                        {/* EXTRACT */}
                        <div className="bg-slate-50 rounded p-2">
                            <p className="text-slate-500 font-medium">EXTRACT</p>
                            <p className="text-slate-800">
                                {intermediateOutputs.extract
                                    ? `${intermediateOutputs.extract.flagCount} flags (${intermediateOutputs.extract.criticalCount} critical)`
                                    : <span className="text-slate-400">Pending</span>}
                            </p>
                        </div>

                        {/* NUMERIC (Wood Wide) */}
                        <div className="bg-slate-50 rounded p-2">
                            <p className="text-slate-500 font-medium">NUMERIC</p>
                            {intermediateOutputs.numeric ? (
                                <div className="text-slate-800">
                                    {intermediateOutputs.numeric.prob !== undefined && (
                                        <p className={intermediateOutputs.numeric.prob >= 0.65 ? 'text-red-600 font-semibold' : ''}>
                                            Prob: {(intermediateOutputs.numeric.prob * 100).toFixed(0)}%
                                        </p>
                                    )}
                                    {intermediateOutputs.numeric.cluster !== undefined && (
                                        <p>Cluster: {intermediateOutputs.numeric.clusterName || `#${intermediateOutputs.numeric.cluster}`}</p>
                                    )}
                                </div>
                            ) : (
                                <span className="text-slate-400">Pending</span>
                            )}
                        </div>

                        {/* ROUTE */}
                        <div className="bg-slate-50 rounded p-2">
                            <p className="text-slate-500 font-medium">ROUTE</p>
                            {intermediateOutputs.route ? (
                                <Badge className={
                                    intermediateOutputs.route.state === 'PROCEED' ? 'bg-green-600' :
                                        intermediateOutputs.route.state === 'ESCALATE' ? 'bg-red-600' :
                                            'bg-yellow-600'
                                }>
                                    {intermediateOutputs.route.state}
                                </Badge>
                            ) : (
                                <span className="text-slate-400">Pending</span>
                            )}
                        </div>

                        {/* PACKET */}
                        <div className="bg-slate-50 rounded p-2">
                            <p className="text-slate-500 font-medium">PACKET</p>
                            <p className="text-slate-800">
                                {intermediateOutputs.packet?.ready
                                    ? <span className="text-green-600">✓ Ready</span>
                                    : <span className="text-slate-400">Pending</span>}
                            </p>
                        </div>

                        {/* VTP */}
                        <div className="bg-slate-50 rounded p-2 col-span-2">
                            <p className="text-slate-500 font-medium">VTP</p>
                            {intermediateOutputs.vtp?.hash ? (
                                <div className="text-slate-800">
                                    <p className="font-mono text-[10px] truncate">{intermediateOutputs.vtp.hash.slice(0, 16)}...</p>
                                    <p className={intermediateOutputs.vtp.verified ? 'text-green-600' : 'text-amber-600'}>
                                        {intermediateOutputs.vtp.verified ? '✓ Verified' : '⏳ Pending verification'}
                                    </p>
                                </div>
                            ) : (
                                <span className="text-slate-400">Pending</span>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
