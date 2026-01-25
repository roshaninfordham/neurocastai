/**
 * useOvershootVision Hook
 * 
 * Integrates Overshoot SDK for real-time stroke symptom detection via:
 * - Live camera streaming
 * - Video file upload processing
 * 
 * Returns structured JSON observations with signal_type, severity, confidence, and notes.
 * 
 * SECURITY NOTE:
 * ===============
 * Q: Are Overshoot keys safe to expose in frontend?
 * A: NO - This implementation uses NEXT_PUBLIC_ environment variables which expose
 *    the API key in the client-side bundle. This is ONLY acceptable for hackathon demos.
 * 
 * PRODUCTION REQUIREMENTS:
 * - Implement backend proxy/broker for Overshoot API calls
 * - Use server-side token minting with short-lived tokens
 * - Add rate limiting and usage monitoring
 * - Restrict API key permissions to minimum required scope
 * - Consider Overshoot's token broker if available
 * 
 * For this demo, we proceed with NEXT_PUBLIC_ but acknowledge this is NOT production-ready.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { OvershootNormalizedResult, OvershootSignal } from '@neurocast/shared';
import { toast } from 'sonner';

// Import Overshoot SDK
import { RealtimeVision } from '@overshoot/sdk';

// Overshoot configuration
const OVERSHOOT_API_URL = process.env.NEXT_PUBLIC_OVERSHOOT_API_URL || 'https://cluster1.overshoot.ai/api/v0.2';
const OVERSHOOT_API_KEY = process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY;

// JSON Schema for structured output
const OUTPUT_SCHEMA = {
    type: "object",
    properties: {
        signal_type: {
            type: "string",
            enum: ["no_concern", "possible_stroke", "high_concern", "uncertain"]
        },
        severity: {
            type: "string",
            enum: ["low", "medium", "high", "critical"]
        },
        confidence: { type: "number" },
        face_droop: { type: "boolean" },
        arm_weakness: { type: "boolean" },
        speech_difficulty: { type: "boolean" },
        gait_instability: { type: "boolean" },
        notes: { type: "string" }
    },
    required: ["signal_type", "severity", "confidence", "notes"]
};

// Stroke telemetry prompt - OBSERVABLE SIGNALS ONLY
const STROKE_TELEMETRY_PROMPT = `
You are a remote telemetry assistant monitoring VIDEO for visible signs consistent with possible stroke.
You are NOT diagnosing. You only report OBSERVABLE signals.

Look ONLY for:
- Facial asymmetry/droop (left/right/unclear)
- One-sided arm weakness/drift
- Unsteady gait / loss of balance
- Visible confusion or reduced responsiveness (only if clearly visible)

Return STRICT JSON matching the given schema:
- If uncertain, use signal_type="uncertain", severity="low", confidence<=0.4 and explain in notes.
- If multiple strong indicators, use signal_type="high_concern" and severity="high" or "critical".

Keep notes short and specific to what was seen.
`;

// Processing configuration - CORRECTED KEYS per Overshoot docs
const PROCESSING_CONFIG = {
    clip_length_seconds: 1,
    delay_seconds: 1,
    fps: 30,
    sampling_ratio: 0.1
};

// Type for vision instance (SDK may not have full types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VisionInstance = any;

export function useOvershootVision() {
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<OvershootNormalizedResult[]>([]);
    const visionRef = useRef<VisionInstance | null>(null);
    const startTimeRef = useRef<number>(0);
    const lastResultAtRef = useRef<number>(0);
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (visionRef.current) {
                visionRef.current.stop().catch(console.error);
            }
            if (inactivityTimerRef.current) {
                clearInterval(inactivityTimerRef.current);
            }
        };
    }, []);

    /**
     * Start live camera processing
     */
    const startCamera = useCallback(async () => {
        // Check for API key
        if (!OVERSHOOT_API_KEY) {
            toast.error("Overshoot disabled (missing API key)");
            // Generate fake results for demo
            generateMockResults();
            return;
        }

        try {
            // Stop any existing stream
            if (visionRef.current) {
                await visionRef.current.stop();
            }

            startTimeRef.current = Date.now();
            lastResultAtRef.current = Date.now();

            // Initialize RealtimeVision with camera source and onResult callback
            visionRef.current = new RealtimeVision({
                apiUrl: OVERSHOOT_API_URL,
                apiKey: OVERSHOOT_API_KEY,
                source: {
                    type: 'camera',
                    cameraFacing: 'user'
                },
                processing: PROCESSING_CONFIG,
                prompt: STROKE_TELEMETRY_PROMPT,
                outputSchema: OUTPUT_SCHEMA,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onResult: (r: any) => {
                    lastResultAtRef.current = Date.now();

                    const inferenceLatencyMs = r.inference_latency_ms ?? 0;
                    const totalLatencyMs = r.total_latency_ms ?? (Date.now() - startTimeRef.current);

                    // Defensive JSON parsing - NEVER crash the stream
                    let parsed: OvershootSignal | null = null;
                    let raw = '';

                    try {
                        raw = typeof r.result === 'string' ? r.result : JSON.stringify(r.result);
                        parsed = JSON.parse(raw);
                    } catch (error) {
                        console.warn('Failed to parse Overshoot result:', error);
                        // Continue with null parsed - show raw output
                    }

                    const normalized: OvershootNormalizedResult = {
                        ts: new Date().toISOString(),
                        raw,
                        parsed,
                        inferenceLatencyMs,
                        totalLatencyMs,
                        source: 'camera'
                    };

                    setResults(prev => [...prev.slice(-49), normalized]); // Keep last 50
                }
            });

            // Start the stream
            await visionRef.current.start();
            setIsRunning(true);

        } catch (error) {
            console.error('Failed to start camera:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (errorMessage.includes('permission') || errorMessage.includes('NotAllowedError')) {
                toast.error("Camera permission denied. Please allow camera access or try uploading a video.");
            } else {
                toast.error(`Failed to start camera: ${errorMessage}`);
            }

            setIsRunning(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Process uploaded video file
     */
    const processVideo = useCallback(async (file: File) => {
        // Check for API key
        if (!OVERSHOOT_API_KEY) {
            toast.error("Overshoot disabled (missing API key)");
            // Generate fake results for demo
            generateMockResults();
            return;
        }

        try {
            // Stop any existing stream
            if (visionRef.current) {
                await visionRef.current.stop();
            }

            // Clear any existing inactivity timer
            if (inactivityTimerRef.current) {
                clearInterval(inactivityTimerRef.current);
            }

            startTimeRef.current = Date.now();
            lastResultAtRef.current = Date.now();

            // Initialize RealtimeVision with video source and onResult callback
            visionRef.current = new RealtimeVision({
                apiUrl: OVERSHOOT_API_URL,
                apiKey: OVERSHOOT_API_KEY,
                source: {
                    type: 'video',
                    file
                },
                processing: PROCESSING_CONFIG,
                prompt: STROKE_TELEMETRY_PROMPT,
                outputSchema: OUTPUT_SCHEMA,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onResult: (r: any) => {
                    lastResultAtRef.current = Date.now();

                    const inferenceLatencyMs = r.inference_latency_ms ?? 0;
                    const totalLatencyMs = r.total_latency_ms ?? (Date.now() - startTimeRef.current);

                    // Defensive JSON parsing
                    let parsed: OvershootSignal | null = null;
                    let raw = '';

                    try {
                        raw = typeof r.result === 'string' ? r.result : JSON.stringify(r.result);
                        parsed = JSON.parse(raw);
                    } catch (error) {
                        console.warn('Failed to parse Overshoot result:', error);
                    }

                    const normalized: OvershootNormalizedResult = {
                        ts: new Date().toISOString(),
                        raw,
                        parsed,
                        inferenceLatencyMs,
                        totalLatencyMs,
                        source: 'video'
                    };

                    setResults(prev => [...prev.slice(-49), normalized]);
                }
            });

            // Start processing
            await visionRef.current.start();
            setIsRunning(true);

            // Start inactivity timer for video completion detection
            // If no results for 3 seconds, assume video is done
            inactivityTimerRef.current = setInterval(() => {
                const timeSinceLastResult = Date.now() - lastResultAtRef.current;
                if (timeSinceLastResult > 3000 && isRunning) {
                    console.log('Video processing complete (inactivity timeout)');
                    stop();
                }
            }, 1000);

        } catch (error) {
            console.error('Failed to process video:', error);
            toast.error(`Failed to process video: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsRunning(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRunning]);

    /**
     * Stop current stream
     */
    const stop = useCallback(async () => {
        if (visionRef.current) {
            try {
                await visionRef.current.stop();
                setIsRunning(false);
            } catch (error) {
                console.error('Failed to stop vision:', error);
            }
        }

        // Clear inactivity timer
        if (inactivityTimerRef.current) {
            clearInterval(inactivityTimerRef.current);
            inactivityTimerRef.current = null;
        }
    }, []);

    /**
     * Clear all results
     */
    const clearResults = useCallback(() => {
        setResults([]);
    }, []);

    /**
     * Generate mock results for demo when API key is missing
     */
    const generateMockResults = useCallback(() => {
        setIsRunning(true);

        const mockSignals: OvershootSignal[] = [
            {
                signal_type: "no_concern",
                severity: "low",
                confidence: 0.89,
                notes: "No significant deviation observed."
            },
            {
                signal_type: "possible_stroke",
                severity: "medium",
                confidence: 0.72,
                face_droop: true,
                notes: "Mild facial asymmetry detected on right side."
            },
            {
                signal_type: "high_concern",
                severity: "high",
                confidence: 0.91,
                face_droop: true,
                arm_weakness: true,
                notes: "Multiple indicators: facial droop and arm drift observed."
            }
        ];

        let count = 0;
        const interval = setInterval(() => {
            if (count >= 10) {
                clearInterval(interval);
                setIsRunning(false);
                return;
            }

            const signal = mockSignals[Math.floor(Math.random() * mockSignals.length)];
            const normalized: OvershootNormalizedResult = {
                ts: new Date().toISOString(),
                raw: JSON.stringify(signal),
                parsed: signal,
                inferenceLatencyMs: 120 + Math.random() * 80,
                totalLatencyMs: count * 1000,
                source: 'camera'
            };

            setResults(prev => [...prev.slice(-49), normalized]);
            count++;
        }, 1000);
    }, []);

    return {
        isRunning,
        results,
        startCamera,
        processVideo,
        stop,
        clearResults
    };
}
