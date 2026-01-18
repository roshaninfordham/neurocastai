"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../../../src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../src/components/ui/card';
import { Badge } from '../../../../src/components/ui/badge';
import { useOvershootVision } from '@/lib/overshoot/useOvershootVision';
import { TriageDecision } from '@neurocast/shared';
// Lucide icons
import { Camera, Upload, Activity, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function CheckInMobilePage() {
    const router = useRouter();
    const { isRunning, results, startCamera, stop, clearResults, processVideo } = useOvershootVision();
    const [triageResult, setTriageResult] = useState<TriageDecision | null>(null);
    const [isTriaging, setIsTriaging] = useState(false);
    const [activeStep, setActiveStep] = useState<"HOME_CHECKIN" | "VIDEO_DETECT" | "TRIAGE" | "NOTIFY" | null>(null);
    const [agentMessage, setAgentMessage] = useState<string>("Ready to start session");
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleUpload(file: File) {
        clearResults();
        setTriageResult(null);
        setActiveStep("HOME_CHECKIN");
        setAgentMessage("Uploading and analyzing video...");

        setActiveStep("VIDEO_DETECT");
        await processVideo(file);

        setAgentMessage("Analysis complete. Reviewing findings.");
        setActiveStep(null);
    }

    // Auto-triage logic could go here, but manual for demo stability

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [results, triageResult]);

    async function handleStartCamera() {
        clearResults();
        setTriageResult(null);
        setActiveStep("HOME_CHECKIN");
        setAgentMessage("Initializing secure session...");

        setTimeout(async () => {
            setActiveStep("VIDEO_DETECT");
            setAgentMessage("Streaming frames to Overshoot AI...");
            await startCamera();
        }, 1000);
    }

    async function handleStop() {
        await stop();
        setActiveStep("HOME_CHECKIN");
        setAgentMessage("Session ended. Reviewing evidence.");
        setTimeout(() => setActiveStep(null), 3000);
    }

    async function handleGenerateTriage() {
        if (results.length < 5) {
            toast.error("Not enough observations yet. Wait for more video data.");
            return;
        }

        setIsTriaging(true);
        setActiveStep("TRIAGE");
        setAgentMessage("Gemini interpreting patterns...");

        try {
            const response = await fetch('/api/homecheckin/triage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ observations: results.slice(-20) }) // Send last 20
            });

            if (!response.ok) throw new Error("Triage failed");

            const decision: TriageDecision = await response.json();
            setTriageResult(decision);

            if (decision.urgency === 'high' || decision.urgency === 'critical') {
                setActiveStep("NOTIFY");
                setAgentMessage("Condition critical. Preparing escalation.");
            } else {
                setAgentMessage("Analysis complete. Condition stable.");
                setTimeout(() => setActiveStep(null), 3000);
            }

        } catch {
            toast.error("Triage failed. Using fallback.");
        } finally {
            setIsTriaging(false);
        }
    }

    function handleStartTransfer() {
        if (!triageResult) return;

        // In a real app, this would POST to /api/run/start directly
        // For demo, we navigate to Start Case or Command Center with params
        // We'll simulate by setting a flag or just navigating

        toast.success("Initiating NeuroCast Transfer Case...");
        // Simulate delay
        setTimeout(() => {
            // Navigate to main app flow (adjust route as needed if using src vs app)
            // Since specific bridge to /api/run/start isn't fully wired in shared state here easily without CaseInput,
            // we will direct them to the prototype Start Case page but conceptually it's done.
            // Or better: call the API here to create the case then go to Command Center.

            // Detailed wiring skipped for brevity, directing to dashboard
            router.push('/command-center?demo_bridge=true');
        }, 1500);
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Agent Execution Strip */}
            <div className="bg-slate-900 text-white p-3 shadow-md flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                        {["HOME_CHECKIN", "VIDEO_DETECT", "TRIAGE", "NOTIFY"].map((step) => (
                            <Badge
                                key={step}
                                variant={activeStep === step ? "default" : "outline"}
                                className={activeStep === step ? "bg-blue-600 border-blue-500 animate-pulse transition-all" : "text-slate-500 border-slate-700"}
                            >
                                {step}
                            </Badge>
                        ))}
                    </div>
                    <div className="h-6 w-px bg-slate-700 mx-2" />
                    <p className="font-mono text-sm text-blue-300 flex items-center gap-2">
                        {activeStep && <Activity className="size-4 animate-spin" />}
                        {agentMessage}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => setAgentMessage("Demo Override: ESCALATE")}>Mark ESCALATE</Button>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setAgentMessage("Demo Override: SAFE")}>Mark SAFE</Button>
                </div>
            </div>

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
                                {isRunning && <Badge variant="destructive" className="animate-pulse">LIVE RECORDING</Badge>}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 aspect-video bg-black relative flex items-center justify-center">
                            {isRunning ? (
                                // Use a real video element if SDK provides stream, else placeholder
                                <div className="text-white flex flex-col items-center gap-2">
                                    <div className="size-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                                    <p className="font-medium text-blue-400">Overshoot Vision Active</p>
                                    <p className="text-xs text-slate-500 font-mono">Processing frames...</p>
                                </div>
                            ) : (
                                <div className="text-slate-500 flex flex-col items-center gap-2">
                                    <Camera className="size-12 opacity-50" />
                                    <p>Camera inactive</p>
                                </div>
                            )}

                            {/* Overlay for demo output */}
                            {results.length > 0 && (
                                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur text-white p-2 rounded font-mono text-xs">
                                    Last Signal: {JSON.stringify(results[results.length - 1].parsed?.signal_type || 'none')} | Conf: {results[results.length - 1].parsed?.confidence?.toFixed(2)}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex gap-4">
                        {!isRunning ? (
                            <Button size="lg" onClick={handleStartCamera} className="bg-blue-600 hover:bg-blue-700">
                                <Camera className="mr-2 size-4" /> Start Camera
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
                                if (file) handleUpload(file);
                            }}
                        />
                        <Button variant="outline" size="lg" disabled={isRunning} onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-2 size-4" /> Upload Video
                        </Button>
                    </div>
                </div>

                {/* Right Col: Agent Feed */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    {/* Triage Result Card */}
                    {triageResult && (
                        <Card className={`border-l-4 ${triageResult.urgency === 'high' ? 'border-l-red-500' : 'border-l-green-500'} shadow-md`}>
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
                                    <Badge className={triageResult.urgency === 'high' ? 'bg-red-600' : 'bg-green-600 uppercase'}>
                                        {triageResult.urgency}
                                    </Badge>
                                </div>
                                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded border">
                                    {triageResult.what_happened}
                                </p>
                                {triageResult.urgency === 'high' && (
                                    <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleStartTransfer}>
                                        Start NeuroCast Transfer Case
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Evidence Logic Log */}
                    <Card className="flex-1 flex flex-col min-h-[400px]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Agent Evidence Log</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto p-0" >
                            <div className="h-[400px] overflow-y-auto p-4 space-y-3 bg-slate-50/50" ref={scrollRef}>
                                {results.length === 0 && <p className="text-sm text-slate-400 italic text-center mt-10">Waiting for live signals...</p>}

                                {results.map((res, i) => (
                                    <div key={i} className="text-xs p-2 bg-white border border-slate-200 rounded shadow-sm animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex justify-between text-slate-500 mb-1">
                                            <span>{new Date(res.ts).toLocaleTimeString()}</span>
                                            <span>{res.inferenceLatencyMs}ms</span>
                                        </div>
                                        <div className="font-mono text-slate-800">
                                            {res.parsed?.signal_type ? (
                                                <span className={res.parsed.severity === 'high' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                                                    {res.parsed.signal_type.toUpperCase()}
                                                </span>
                                            ) : 'Analyzing...'}
                                        </div>
                                        <div className="text-slate-600 mt-1 truncate">{res.parsed?.notes}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <div className="p-3 border-t bg-white">
                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={handleGenerateTriage}
                                disabled={isTriaging || results.length === 0}
                            >
                                {isTriaging ? 'Gemini Thinking...' : 'Generate New Triage'}
                            </Button>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
}
