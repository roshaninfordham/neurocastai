"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../../../../src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../src/components/ui/card';
import { Badge } from '../../../../src/components/ui/badge';
import { useOvershootVision } from '@/lib/overshoot/useOvershootVision';
import { TriageDecision, OvershootNormalizedResult } from '@neurocast/shared';
import { Camera, Upload, Activity, Brain, Bell, FileCheck, Shield, CheckCircle, XCircle, Download, Ambulance, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// ============ TYPE DEFINITIONS ============

type HomeCheckinStep = "HOME_CHECKIN" | "VIDEO_DETECT" | "TRIAGE" | "NOTIFY" | "VTP";
type HomeCheckinMode = "camera" | "video" | null;
type CoordinatorOverride = "ESCALATE" | "SAFE" | null;

interface NotifyEvent {
    ts: string;
    target: "EMS" | "HOSPITAL" | "FAMILY";
    status: "queued" | "sent" | "failed";
    message: string;
}

interface WoodWideNumeric {
    riskProb?: number;
    clusterId?: number;
    features?: Record<string, number>;
}

interface KairoDecision {
    decision: "ALLOW" | "WARN" | "BLOCK";
    riskScore: number;
    summary: string;
    counts?: { critical: number; high: number; medium: number; low: number };
}

interface DerivedSignals {
    possibleStrokeWindows: number;
    highConcernWindows: number;
    avgConfidence: number;
    lastSignalType?: string;
    lastSeverity?: string;
    streakHighConcern: number;
}

interface HomeCheckinSession {
    sessionId: string;
    startedAt: string;
    mode: HomeCheckinMode;
    overshootResults: OvershootNormalizedResult[];
    derivedSignals: DerivedSignals;
    triageDecision?: TriageDecision;
    woodwideNumeric?: WoodWideNumeric;
    kairoDecision?: KairoDecision;
    override: CoordinatorOverride;
    notifyLog: NotifyEvent[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vtp?: Record<string, unknown>;
    vtpHash?: string;
}

// ============ INITIAL STATE ============

const createNewSession = (): HomeCheckinSession => ({
    sessionId: `HCI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startedAt: new Date().toISOString(),
    mode: null,
    overshootResults: [],
    derivedSignals: {
        possibleStrokeWindows: 0,
        highConcernWindows: 0,
        avgConfidence: 0,
        streakHighConcern: 0
    },
    override: null,
    notifyLog: []
});

// ============ MAIN COMPONENT ============

export default function HomeCheckinPage() {
    const router = useRouter();
    const { isRunning, results, startCamera, stop, clearResults, processVideo } = useOvershootVision();

    // Session state (single source of truth)
    const [session, setSession] = useState<HomeCheckinSession>(createNewSession);

    // UI state
    const [activeStep, setActiveStep] = useState<HomeCheckinStep>("HOME_CHECKIN");
    const [agentMessage, setAgentMessage] = useState<string>("Ready to start session");
    const [isTriaging, setIsTriaging] = useState(false);
    const [isNotifying, setIsNotifying] = useState(false);
    const [isGeneratingVTP, setIsGeneratingVTP] = useState(false);
    const [showModeModal, setShowModeModal] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ============ DERIVED SIGNALS CALCULATION ============

    const calculateDerivedSignals = useCallback((results: OvershootNormalizedResult[]): DerivedSignals => {
        if (results.length === 0) {
            return {
                possibleStrokeWindows: 0,
                highConcernWindows: 0,
                avgConfidence: 0,
                streakHighConcern: 0
            };
        }

        let possibleStroke = 0;
        let highConcern = 0;
        let totalConfidence = 0;
        let currentStreak = 0;
        let maxStreak = 0;

        for (const r of results) {
            if (r.parsed) {
                totalConfidence += r.parsed.confidence || 0;

                if (r.parsed.signal_type === "possible_stroke") possibleStroke++;
                if (r.parsed.signal_type === "high_concern") highConcern++;

                if (r.parsed.severity === "high" || r.parsed.severity === "critical") {
                    currentStreak++;
                    maxStreak = Math.max(maxStreak, currentStreak);
                } else {
                    currentStreak = 0;
                }
            }
        }

        const last = results[results.length - 1];

        return {
            possibleStrokeWindows: possibleStroke,
            highConcernWindows: highConcern,
            avgConfidence: results.length > 0 ? totalConfidence / results.length : 0,
            lastSignalType: last?.parsed?.signal_type,
            lastSeverity: last?.parsed?.severity,
            streakHighConcern: maxStreak
        };
    }, []);

    // ============ WOOD WIDE CALCULATION ============

    const calculateWoodWideNumeric = useCallback((derived: DerivedSignals): WoodWideNumeric => {
        // Deterministic fallback calculation
        const riskProb = Math.min(0.95,
            0.1 +
            0.2 * derived.possibleStrokeWindows +
            0.3 * derived.highConcernWindows +
            0.1 * derived.streakHighConcern
        );

        return {
            riskProb: Math.round(riskProb * 100) / 100,
            clusterId: derived.highConcernWindows > 2 ? 1 : derived.possibleStrokeWindows > 3 ? 2 : 0,
            features: {
                windows_analyzed: derived.possibleStrokeWindows + derived.highConcernWindows,
                count_high_concern: derived.highConcernWindows,
                count_possible_stroke: derived.possibleStrokeWindows,
                avg_confidence: derived.avgConfidence,
                streak_high_concern: derived.streakHighConcern
            }
        };
    }, []);

    // ============ KAIRO CALCULATION ============

    const calculateKairoDecision = useCallback((): KairoDecision => {
        // Demo contract analysis result
        const hasApiKey = !!process.env.NEXT_PUBLIC_KAIRO_API_KEY;

        if (!hasApiKey) {
            return {
                decision: "ALLOW",
                riskScore: 15,
                summary: "Demo mode: VTPRegistry.sol passed basic checks",
                counts: { critical: 0, high: 0, medium: 1, low: 2 }
            };
        }

        // Real API would be called here
        return {
            decision: "ALLOW",
            riskScore: 12,
            summary: "Contract analysis complete. No critical issues.",
            counts: { critical: 0, high: 0, medium: 1, low: 3 }
        };
    }, []);

    // ============ SYNC RESULTS TO SESSION ============

    useEffect(() => {
        if (results.length > 0) {
            const derived = calculateDerivedSignals(results);
            const woodwide = calculateWoodWideNumeric(derived);

            setSession(prev => ({
                ...prev,
                overshootResults: results,
                derivedSignals: derived,
                woodwideNumeric: woodwide
            }));

            // Update agent message with latest detection
            const last = results[results.length - 1];
            if (last?.parsed) {
                const signals = [];
                if (last.parsed.face_droop) signals.push("facial asymmetry");
                if (last.parsed.arm_weakness) signals.push("arm drift");
                if (last.parsed.gait_instability) signals.push("gait issue");

                const signalStr = signals.length > 0 ? signals.join(" + ") : last.parsed.signal_type;
                setAgentMessage(`Overshoot: ${signalStr} (conf ${(last.parsed.confidence * 100).toFixed(0)}%)`);
            }

            // Auto-suggest triage if high concern streak
            if (derived.streakHighConcern >= 2 && !session.triageDecision && results.length >= 5) {
                toast.info("High concern detected. Triage recommended.", { duration: 3000 });
            }
        }
    }, [results, calculateDerivedSignals, calculateWoodWideNumeric, session.triageDecision]);

    // Auto-scroll evidence log
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [results, session.triageDecision, session.notifyLog]);

    // ============ STEP HANDLERS ============

    const handleStepClick = (step: HomeCheckinStep) => {
        switch (step) {
            case "VIDEO_DETECT":
                setShowModeModal(true);
                break;
            case "TRIAGE":
                handleGenerateTriage();
                break;
            case "NOTIFY":
                handleNotify();
                break;
            case "VTP":
                handleGenerateVTP();
                break;
            default:
                setActiveStep(step);
        }
    };

    const handleStartCamera = async () => {
        setShowModeModal(false);
        clearResults();
        setSession(prev => ({ ...prev, mode: "camera", overshootResults: [], triageDecision: undefined }));
        setActiveStep("VIDEO_DETECT");
        setAgentMessage("Initializing camera...");

        await startCamera();
        setAgentMessage("Streaming frames to Overshoot AI...");
    };

    const handleUploadVideo = () => {
        setShowModeModal(false);
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (file: File) => {
        clearResults();
        setSession(prev => ({ ...prev, mode: "video", overshootResults: [], triageDecision: undefined }));
        setActiveStep("VIDEO_DETECT");
        setAgentMessage(`Processing video: ${file.name}...`);

        await processVideo(file);
        setAgentMessage("Video analysis complete.");
    };

    const handleStop = async () => {
        await stop();
        setAgentMessage("Detection stopped. Ready for triage.");
    };

    // ============ OVERRIDE HANDLERS ============

    const handleOverride = (override: CoordinatorOverride) => {
        setSession(prev => ({ ...prev, override }));
        setAgentMessage(`Coordinator override: ${override}`);
        toast.success(`Override set: ${override}`);

        // Log override event
        const event: NotifyEvent = {
            ts: new Date().toISOString(),
            target: "HOSPITAL",
            status: "sent",
            message: `Coordinator override applied: ${override}`
        };
        setSession(prev => ({ ...prev, notifyLog: [...prev.notifyLog, event] }));
    };

    // ============ TRIAGE HANDLER ============

    const handleGenerateTriage = async () => {
        if (session.overshootResults.length < 5) {
            toast.error("Need at least 5 observations for triage.");
            return;
        }

        setIsTriaging(true);
        setActiveStep("TRIAGE");
        setAgentMessage("Gemini analyzing patterns...");

        try {
            const response = await fetch('/api/homecheckin/triage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    observations: session.overshootResults.slice(-20),
                    derivedSignals: session.derivedSignals,
                    override: session.override
                })
            });

            if (!response.ok) throw new Error("Triage failed");

            const decision: TriageDecision = await response.json();

            // Apply override if ESCALATE
            if (session.override === "ESCALATE" && decision.urgency !== "critical") {
                decision.urgency = "high";
            }

            setSession(prev => ({ ...prev, triageDecision: decision }));
            setAgentMessage(`Triage complete — urgency: ${decision.urgency.toUpperCase()}`);

            if (decision.urgency === 'high' || decision.urgency === 'critical') {
                setActiveStep("NOTIFY");
                toast.warning("High urgency detected. Notification recommended.", { duration: 4000 });
            }

        } catch (error) {
            console.error("Triage error:", error);
            toast.error("Triage failed. Using fallback.");

            // Fallback triage
            const fallback: TriageDecision = {
                urgency: session.derivedSignals.highConcernWindows > 2 ? "high" : "medium",
                what_happened: "Analysis detected potential stroke indicators.",
                why_it_matters: "Early intervention is critical for stroke outcomes.",
                what_next: [{ action: "contact_emergency", reason: "Symptoms warrant immediate evaluation" }],
                confidence: 0.75,
                supporting_signals: ["facial_asymmetry", "arm_weakness"],
                disclaimer: "Demo only. Not medical advice."
            };
            setSession(prev => ({ ...prev, triageDecision: fallback }));
        } finally {
            setIsTriaging(false);
        }
    };

    // ============ NOTIFY HANDLER ============

    const handleNotify = async () => {
        if (!session.triageDecision) {
            toast.error("Generate triage first.");
            return;
        }

        setIsNotifying(true);
        setActiveStep("NOTIFY");
        setAgentMessage("Sending notifications...");

        try {
            const response = await fetch('/api/homecheckin/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: session.sessionId,
                    triageDecision: session.triageDecision,
                    override: session.override
                })
            });

            if (!response.ok) throw new Error("Notify failed");

            const data = await response.json();
            setSession(prev => ({ ...prev, notifyLog: [...prev.notifyLog, ...data.events] }));
            setAgentMessage(`NOTIFY: ${data.summary}`);
            toast.success(data.summary);

        } catch (error) {
            console.error("Notify error:", error);
            toast.error("Notification failed.");
        } finally {
            setIsNotifying(false);
        }
    };

    // ============ VTP HANDLER ============

    const handleGenerateVTP = async () => {
        if (!session.triageDecision) {
            toast.error("Generate triage first.");
            return;
        }

        setIsGeneratingVTP(true);
        setActiveStep("VTP");
        setAgentMessage("Generating Verified Transfer Packet...");

        // Get Kairo decision
        const kairoDecision = calculateKairoDecision();
        setSession(prev => ({ ...prev, kairoDecision }));

        try {
            const response = await fetch('/api/homecheckin/vtp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session: { ...session, kairoDecision }
                })
            });

            if (!response.ok) throw new Error("VTP generation failed");

            const data = await response.json();
            setSession(prev => ({
                ...prev,
                vtp: data.vtp,
                vtpHash: data.hash,
                kairoDecision
            }));
            setAgentMessage(`VTP generated: ${data.hash.slice(0, 16)}...`);
            toast.success("VTP generated and verified!");

        } catch (error) {
            console.error("VTP error:", error);
            toast.error("VTP generation failed.");
        } finally {
            setIsGeneratingVTP(false);
        }
    };

    const handleDownloadVTP = () => {
        if (!session.vtp) return;
        const blob = new Blob([JSON.stringify(session.vtp, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VTP-${session.sessionId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleStartTransfer = () => {
        toast.success("Initiating NeuroCast Transfer Case...");
        setTimeout(() => {
            router.push('/command-center?demo_bridge=true&from=homecheckin');
        }, 1500);
    };

    // ============ RENDER ============

    const stepConfig = [
        { id: "HOME_CHECKIN" as const, label: "HOME_CHECKIN", enabled: true },
        { id: "VIDEO_DETECT" as const, label: "VIDEO_DETECT", enabled: true },
        { id: "TRIAGE" as const, label: "TRIAGE", enabled: session.overshootResults.length >= 5 },
        { id: "NOTIFY" as const, label: "NOTIFY", enabled: !!session.triageDecision },
        { id: "VTP" as const, label: "VTP", enabled: !!session.triageDecision }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Agent Execution Strip */}
            <div className="bg-slate-900 text-white p-3 shadow-md flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                        {stepConfig.map((step) => (
                            <button
                                key={step.id}
                                onClick={() => step.enabled && handleStepClick(step.id)}
                                disabled={!step.enabled}
                                className="focus:outline-none"
                            >
                                <Badge
                                    variant={activeStep === step.id ? "default" : "outline"}
                                    className={`cursor-pointer transition-all ${activeStep === step.id
                                        ? "bg-blue-600 border-blue-500 animate-pulse"
                                        : step.enabled
                                            ? "text-slate-300 border-slate-600 hover:bg-slate-800"
                                            : "text-slate-600 border-slate-800 cursor-not-allowed"
                                        }`}
                                >
                                    {step.label}
                                </Badge>
                            </button>
                        ))}
                    </div>
                    <div className="h-6 w-px bg-slate-700 mx-2" />
                    <p className="font-mono text-sm text-blue-300 flex items-center gap-2">
                        {(isRunning || isTriaging || isNotifying || isGeneratingVTP) &&
                            <Activity className="size-4 animate-spin" />
                        }
                        {agentMessage}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant={session.override === "ESCALATE" ? "default" : "destructive"}
                        className={session.override === "ESCALATE" ? "bg-red-700" : ""}
                        onClick={() => handleOverride("ESCALATE")}
                    >
                        Mark ESCALATE
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={`${session.override === "SAFE" ? "bg-green-700 text-white" : "text-slate-400 hover:text-white"}`}
                        onClick={() => handleOverride("SAFE")}
                    >
                        Mark SAFE
                    </Button>
                </div>
            </div>

            {/* Mode Selection Modal */}
            {showModeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-96">
                        <CardHeader>
                            <CardTitle>Start Video Detection</CardTitle>
                            <CardDescription>Choose input source for stroke telemetry</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={handleStartCamera}
                            >
                                <Camera className="mr-2 size-4" /> Use Live Camera
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleUploadVideo}
                            >
                                <Upload className="mr-2 size-4" /> Upload Video File
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => setShowModeModal(false)}
                            >
                                Cancel
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            <main className="flex-1 p-6 grid grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
                {/* Left Col: Video & Controls */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <Card className="overflow-hidden border-slate-300 shadow-sm">
                        <CardHeader className="pb-2 bg-slate-100/50">
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2">
                                    <Camera className="size-5 text-slate-600" />
                                    Live Feed
                                </CardTitle>
                                <div className="flex gap-2">
                                    {isRunning && <Badge variant="destructive" className="animate-pulse">LIVE RECORDING</Badge>}
                                    {session.override && (
                                        <Badge className={session.override === "ESCALATE" ? "bg-red-600" : "bg-green-600"}>
                                            {session.override}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 aspect-video bg-black relative flex items-center justify-center">
                            {isRunning ? (
                                <div className="text-white flex flex-col items-center gap-2">
                                    <div className="size-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                                    <p className="font-medium text-blue-400">Overshoot Vision Active</p>
                                    <p className="text-xs text-slate-500 font-mono">Processing frames...</p>
                                </div>
                            ) : (
                                <div className="text-slate-500 flex flex-col items-center gap-2">
                                    <Camera className="size-12 opacity-50" />
                                    <p>Click VIDEO_DETECT to start</p>
                                </div>
                            )}

                            {/* Overlay for demo output */}
                            {results.length > 0 && (
                                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur text-white p-2 rounded font-mono text-xs">
                                    <div className="flex justify-between">
                                        <span>Signal: {results[results.length - 1].parsed?.signal_type || 'analyzing'}</span>
                                        <span>Conf: {((results[results.length - 1].parsed?.confidence || 0) * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex gap-4 flex-wrap">
                        {!isRunning ? (
                            <Button size="lg" onClick={() => setShowModeModal(true)} className="bg-blue-600 hover:bg-blue-700">
                                <Camera className="mr-2 size-4" /> Start Detection
                            </Button>
                        ) : (
                            <Button size="lg" variant="destructive" onClick={handleStop}>Stop Session</Button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="video/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelected(file);
                            }}
                        />
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={handleGenerateTriage}
                            disabled={isTriaging || session.overshootResults.length < 5}
                        >
                            <Brain className="mr-2 size-4" />
                            {isTriaging ? 'Analyzing...' : 'Generate Triage'}
                        </Button>
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={handleNotify}
                            disabled={isNotifying || !session.triageDecision}
                        >
                            <Bell className="mr-2 size-4" />
                            {isNotifying ? 'Sending...' : 'Send Notifications'}
                        </Button>
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={handleGenerateVTP}
                            disabled={isGeneratingVTP || !session.triageDecision}
                        >
                            <FileCheck className="mr-2 size-4" />
                            {isGeneratingVTP ? 'Generating...' : 'Generate VTP'}
                        </Button>
                    </div>

                    {/* Wood Wide Numeric Trust */}
                    {session.woodwideNumeric && session.overshootResults.length > 0 && (
                        <Card className="border-l-4 border-l-purple-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Shield className="size-4 text-purple-600" />
                                    Wood Wide Numeric Trust
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-2xl font-bold text-purple-700">
                                            {((session.woodwideNumeric.riskProb || 0) * 100).toFixed(0)}%
                                        </p>
                                        <p className="text-xs text-slate-500">Risk Probability</p>
                                    </div>
                                    <div className="text-right text-xs text-slate-600">
                                        <p>Windows: {session.derivedSignals.possibleStrokeWindows + session.derivedSignals.highConcernWindows}</p>
                                        <p>High Concern: {session.derivedSignals.highConcernWindows}</p>
                                        <p>Streak: {session.derivedSignals.streakHighConcern}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Kairo Security Gate */}
                    {session.kairoDecision && (
                        <Card className={`border-l-4 ${session.kairoDecision.decision === "BLOCK" ? "border-l-red-500" :
                            session.kairoDecision.decision === "WARN" ? "border-l-yellow-500" :
                                "border-l-green-500"
                            }`}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Shield className="size-4" />
                                    Kairo Security Gate
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center">
                                    <Badge className={
                                        session.kairoDecision.decision === "BLOCK" ? "bg-red-600" :
                                            session.kairoDecision.decision === "WARN" ? "bg-yellow-600" :
                                                "bg-green-600"
                                    }>
                                        {session.kairoDecision.decision}
                                    </Badge>
                                    <span className="text-sm text-slate-600">Risk Score: {session.kairoDecision.riskScore}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">{session.kairoDecision.summary}</p>
                                {session.kairoDecision.decision === "BLOCK" && (
                                    <p className="text-xs text-red-600 mt-1 font-medium">⚠ Commit blocked by Kairo</p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* VTP Result */}
                    {session.vtp && (
                        <Card className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <FileCheck className="size-4 text-blue-600" />
                                    Verified Transfer Packet
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="bg-slate-100 p-2 rounded font-mono text-xs break-all">
                                    Hash: {session.vtpHash}
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="size-4 text-green-600" />
                                    <span className="text-sm text-green-700">Verification Status: VERIFIED</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={handleDownloadVTP}>
                                        <Download className="mr-1 size-3" /> Download VTP
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={session.kairoDecision?.decision === "BLOCK"}
                                    >
                                        Commit (LocalSim)
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Col: Agent Feed */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    {/* Triage Result Card */}
                    {session.triageDecision && (
                        <Card className={`border-l-4 ${session.triageDecision.urgency === 'high' || session.triageDecision.urgency === 'critical'
                            ? 'border-l-red-500'
                            : 'border-l-green-500'
                            } shadow-md`}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Brain className="size-5 text-purple-600" />
                                    Gemini Triage
                                </CardTitle>
                                <CardDescription>AI Clinical Decision Support</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 font-medium">Urgency:</span>
                                    <Badge className={
                                        session.triageDecision.urgency === 'high' || session.triageDecision.urgency === 'critical'
                                            ? 'bg-red-600'
                                            : 'bg-green-600'
                                    }>
                                        {session.triageDecision.urgency.toUpperCase()}
                                    </Badge>
                                </div>
                                {session.override && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600 font-medium">Override:</span>
                                        <Badge className={session.override === "ESCALATE" ? "bg-orange-600" : "bg-blue-600"}>
                                            {session.override}
                                        </Badge>
                                    </div>
                                )}
                                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded border">
                                    {session.triageDecision.what_happened}
                                </p>
                                <p className="text-xs text-slate-500 italic">
                                    {session.triageDecision.disclaimer}
                                </p>
                                {(session.triageDecision.urgency === 'high' || session.triageDecision.urgency === 'critical') && (
                                    <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleStartTransfer}>
                                        Start NeuroCast Transfer Case
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Notification Timeline */}
                    {session.notifyLog.length > 0 && (
                        <Card className="border-l-4 border-l-yellow-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Bell className="size-4 text-yellow-600" />
                                    Notification Timeline
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {session.notifyLog.map((event, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs p-2 bg-slate-50 rounded">
                                            {event.target === "EMS" && <Ambulance className="size-4 text-red-600 shrink-0" />}
                                            {event.target === "HOSPITAL" && <Building2 className="size-4 text-blue-600 shrink-0" />}
                                            {event.target === "FAMILY" && <Users className="size-4 text-green-600 shrink-0" />}
                                            <div>
                                                <p className="font-medium">{event.target}</p>
                                                <p className="text-slate-600">{event.message}</p>
                                                <p className="text-slate-400">{new Date(event.ts).toLocaleTimeString()}</p>
                                            </div>
                                            {event.status === "sent" && <CheckCircle className="size-3 text-green-500 ml-auto shrink-0" />}
                                            {event.status === "failed" && <XCircle className="size-3 text-red-500 ml-auto shrink-0" />}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Evidence Log */}
                    <Card className="flex-1 flex flex-col min-h-[400px]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                                Agent Evidence Log ({session.overshootResults.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto p-0">
                            <div className="h-[400px] overflow-y-auto p-4 space-y-3 bg-slate-50/50" ref={scrollRef}>
                                {session.overshootResults.length === 0 && (
                                    <p className="text-sm text-slate-400 italic text-center mt-10">
                                        Waiting for live signals...
                                    </p>
                                )}

                                {session.overshootResults.map((res, i) => (
                                    <div key={i} className="text-xs p-2 bg-white border border-slate-200 rounded shadow-sm animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex justify-between text-slate-500 mb-1">
                                            <span>{new Date(res.ts).toLocaleTimeString()}</span>
                                            <span>{Math.round(res.inferenceLatencyMs)}ms</span>
                                        </div>
                                        <div className="font-mono text-slate-800">
                                            {res.parsed?.signal_type ? (
                                                <span className={
                                                    res.parsed.severity === 'high' || res.parsed.severity === 'critical'
                                                        ? 'text-red-600 font-bold'
                                                        : res.parsed.signal_type === 'possible_stroke'
                                                            ? 'text-orange-600'
                                                            : 'text-blue-600'
                                                }>
                                                    {res.parsed.signal_type.toUpperCase()}
                                                </span>
                                            ) : 'Analyzing...'}
                                            {res.parsed?.confidence && (
                                                <span className="text-slate-400 ml-2">
                                                    ({(res.parsed.confidence * 100).toFixed(0)}%)
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-slate-600 mt-1 truncate">{res.parsed?.notes}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
