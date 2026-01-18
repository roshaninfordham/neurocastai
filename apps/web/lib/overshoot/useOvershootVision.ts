import { useState, useRef, useCallback } from 'react';
import { OvershootNormalizedResult } from '@neurocast/shared';

// Stub for @overshoot/sdk since we can't reliably install private/new packages in this env without auth issues sometimes
// In a real scenario, this would import from the actual package
// import { RealtimeVision } from '@overshoot/sdk';

interface MockResult {
    result: string;
    latencyMs: number;
}

// Mock implementation for the hackathon demo
class MockRealtimeVision {
    private interval: NodeJS.Timeout | null = null;

    constructor(config: Record<string, unknown>) {
        // Log to satisfy usage check
        console.log('MockRealtimeVision init:', config);
    }

    async startCamera(opts: Record<string, unknown>): Promise<void> {
        console.log('Starting mock camera', opts);
    }

    async stop(): Promise<void> {
        if (this.interval) clearInterval(this.interval);
    }

    onResult(cb: (result: MockResult) => void): void {
        // Generate mock stroke-like symptoms
        this.interval = setInterval(() => {
            const isRisk = Math.random() > 0.3;
            cb({
                result: JSON.stringify({
                    signal_type: isRisk ? (Math.random() > 0.5 ? 'facial_asymmetry' : 'arm_weakness') : 'normal',
                    severity: isRisk ? 'high' : 'low',
                    confidence: 0.85 + Math.random() * 0.1,
                    notes: isRisk ? 'Detected potential abnormal movement.' : 'No significant deviation observed.'
                }),
                latencyMs: 120
            });
        }, 1000); // 1 fps for demo
    }
}

interface VisionRef {
    startCamera: (opts: Record<string, unknown>) => Promise<void>;
    stop: () => Promise<void>;
    onResult: (cb: (result: MockResult) => void) => void;
}

export function useOvershootVision() {
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<OvershootNormalizedResult[]>([]);
    const visionRef = useRef<VisionRef | null>(null);

    const startCamera = useCallback(async () => {
        try {
            setError(null);
            // In real implementation:
            // visionRef.current = new RealtimeVision({ apiKey: process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY });
            // await visionRef.current.startCamera({ facingMode: 'user' });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const apiKey = (process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY || 'mock_key') as unknown;

            visionRef.current = new MockRealtimeVision({ apiKey });
            await visionRef.current.startCamera({});
            setIsRunning(true);

            visionRef.current.onResult((rawResult: MockResult) => {
                const timestamp = new Date().toISOString();
                let parsed;
                try {
                    parsed = JSON.parse(rawResult.result);
                } catch {
                    parsed = { notes: rawResult.result };
                }

                const normalized: OvershootNormalizedResult = {
                    ts: timestamp,
                    raw: rawResult.result,
                    parsed,
                    inferenceLatencyMs: rawResult.latencyMs,
                    source: 'camera'
                };

                setResults(prev => [...prev.slice(-49), normalized]); // Keep last 50
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start camera');
            setIsRunning(false);
        }
    }, []);

    const stop = useCallback(async () => {
        if (visionRef.current) {
            await visionRef.current.stop();
            setIsRunning(false);
        }
    }, []);

    const processVideo = useCallback(async (file: File) => {
        console.log("Processing uploaded file:", file.name);
        setIsRunning(true);
        setError(null);
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock result for uploaded video
        const timestamp = new Date().toISOString();
        const mockResult = {
            signal_type: 'facial_asymmetry',
            severity: 'high',
            confidence: 0.92,
            notes: 'Uploaded video analysis: Clear right-side facial droop detected.'
        };

        const normalized: OvershootNormalizedResult = {
            ts: timestamp,
            raw: JSON.stringify(mockResult),
            parsed: mockResult,
            inferenceLatencyMs: 450,
            source: 'video'
        };

        setResults([normalized]);
        setIsRunning(false);
    }, []);

    const clearResults = useCallback(() => {
        setResults([]);
    }, []);

    return {
        isRunning,
        error,
        results,
        startCamera,
        stop,
        clearResults,
        processVideo
    };
}
