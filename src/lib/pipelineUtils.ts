/**
 * Unified Pipeline Hook
 * Provides MCP and local pipeline execution with automatic fallback
 */

import type { CaseInput, PipelineEvent, CaseDerived } from '@neurocast/shared';
import type { CaseData } from '../types/case';

// MCP configuration - matches the lib structure in apps/web for Vite compatibility
const PIPELINE_MODE = 'mcp'; // Default to MCP
const MCP_BASE_URL = 'http://localhost:3001';
const MCP_SSE_URL = 'http://localhost:3001';

export type RunSource = 'MCP' | 'LOCAL';

export interface PipelineRunResult {
    runId: string;
    caseId: string;
    source: RunSource;
}

export interface IntermediateOutputs {
    redact?: { removedFields: string[]; phiRemoved: boolean };
    compress?: {
        savingsPct: number;
        originalTokens: number;
        compressedTokens: number;
        tokensSaved: number;
        ratio: number;
        qualityScore?: number;
        qualityOk?: boolean;
        provider?: string;
        aggressiveness?: number;
    };
    extract?: { flagCount: number; criticalCount: number };
    numeric?: {
        prob?: number;
        cluster?: number;
        clusterName?: string;
        timers?: { doorToCT?: number; ctToDecision?: number; timeSinceLKW?: number };
        completeness?: number;
    };
    route?: { state: string; ruleIds: string[]; reason: string };
    packet?: { ready: boolean };
    vtp?: { hash: string; verified: boolean; vtpId: string };
}

// Track seen event IDs per run for deduplication
const seenEventIds = new Map<string, Set<string>>();

/**
 * Extract intermediate outputs from pipeline event payloads
 */
export function extractIntermediateOutputs(
    event: PipelineEvent,
    existing: IntermediateOutputs = {}
): IntermediateOutputs {
    const outputs = { ...existing };
    const payload = event.payload || {};

    if (event.step === 'REDACT' && event.eventType === 'STEP_DONE') {
        outputs.redact = {
            removedFields: (payload.removedFields as string[]) || [],
            phiRemoved: (payload.phiRemoved as boolean) ?? true,
        };
    }

    if (event.step === 'COMPRESS' && event.eventType === 'STEP_DONE') {
        const originalTokens = (payload.originalTokens as number) || 0;
        const outputTokens = (payload.outputTokens as number) || 0;
        outputs.compress = {
            savingsPct: (payload.compressionPct as number) || 0,
            originalTokens,
            compressedTokens: outputTokens,
            tokensSaved: (payload.tokensSaved as number) || (originalTokens - outputTokens),
            ratio: (payload.compressionRatio as number) || (originalTokens / Math.max(1, outputTokens)),
            qualityScore: (payload.qualityScore as number) || undefined,
            qualityOk: (payload.qualityOk as boolean) ?? undefined,
            provider: (payload.provider as string) || 'TOKENCO',
            aggressiveness: (payload.aggressiveness as number) || undefined,
        };
    }

    if (event.step === 'EXTRACT' && event.eventType === 'STEP_DONE') {
        outputs.extract = {
            flagCount: (payload.flagCount as number) || 0,
            criticalCount: (payload.criticalCount as number) || 0,
        };
    }

    if (event.step === 'NUMERIC' && event.eventType === 'STEP_DONE') {
        const prediction = payload.prediction as { needsEscalationProb?: number } | undefined;
        const clustering = payload.clustering as { clusterId?: number; clusterName?: string } | undefined;
        const timers = payload.timers as { doorToCT?: number; ctToDecision?: number; timeSinceLKW?: number } | undefined;

        outputs.numeric = {
            prob: prediction?.needsEscalationProb,
            cluster: clustering?.clusterId,
            clusterName: clustering?.clusterName,
            timers: timers,
            completeness: (payload.completeness as number) || undefined,
        };
    }

    if (event.step === 'ROUTE' && event.eventType === 'STEP_DONE') {
        outputs.route = {
            state: (payload.state as string) || 'HOLD',
            ruleIds: (payload.triggeredRuleIds as string[]) || [],
            reason: (payload.reason as string) || '',
        };
    }

    if (event.step === 'PACKET' && event.eventType === 'STEP_DONE') {
        outputs.packet = { ready: true };
    }

    // VTP step doesn't exist in PipelineStep enum, but check for vtp payload
    if (payload.vtp || payload.vtpId) {
        outputs.vtp = {
            hash: (payload.hash as string) || (payload.vtpHash as string) || '',
            verified: (payload.verified as boolean) ?? false,
            vtpId: (payload.vtpId as string) || '',
        };
    }

    return outputs;
}

/**
 * Get current step from event
 */
export function getCurrentStep(event: PipelineEvent): string | undefined {
    if (event.eventType === 'STEP_STARTED') {
        return event.step;
    }
    return undefined;
}

/**
 * Check MCP availability with timeout
 */
async function checkMcpAvailable(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`${MCP_BASE_URL}/health`, {
            method: 'GET',
            signal: controller.signal,
        });

        clearTimeout(timeout);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Start pipeline run via MCP
 */
async function startMcpRun(caseInput: CaseInput): Promise<{ runId: string; caseId: string }> {
    const response = await fetch(`${MCP_BASE_URL}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tool: 'neurocast.run_pipeline',
            arguments: { caseInput },
        }),
    });

    if (!response.ok) {
        throw new Error(`MCP start failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.runId) {
        throw new Error('MCP response missing runId');
    }

    return { runId: data.runId, caseId: data.caseId || caseInput.caseId };
}

/**
 * Start pipeline run via local API
 */
async function startLocalRun(caseInput: CaseInput): Promise<{ runId: string; caseId: string }> {
    const response = await fetch('/api/run/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caseInput),
    });

    if (!response.ok) {
        throw new Error(`Local start failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Unified pipeline start with MCP fallback
 */
export async function startPipelineRun(
    caseInput: CaseInput,
    onFallback?: () => void
): Promise<PipelineRunResult> {
    if (PIPELINE_MODE === 'mcp') {
        // Check MCP availability first
        const mcpAvailable = await checkMcpAvailable();

        if (mcpAvailable) {
            try {
                const result = await startMcpRun(caseInput);
                seenEventIds.set(result.runId, new Set());
                return { ...result, source: 'MCP' };
            } catch {
                // Fall through to local
            }
        }

        // Fallback to local
        onFallback?.();
    }

    // Local mode
    const result = await startLocalRun(caseInput);
    seenEventIds.set(result.runId, new Set());
    return { ...result, source: 'LOCAL' };
}

/**
 * Open event stream (SSE) for a pipeline run
 */
export function openEventStream(
    runId: string,
    source: RunSource,
    handlers: {
        onEvent: (event: PipelineEvent) => void;
        onDone: (status: string) => void;
        onError: (error: Error) => void;
    }
): EventSource {
    const url = source === 'MCP'
        ? `${MCP_SSE_URL}/events?runId=${encodeURIComponent(runId)}`
        : `/api/run/events?runId=${encodeURIComponent(runId)}`;

    const eventSource = new EventSource(url);
    const seen = seenEventIds.get(runId) || new Set();
    seenEventIds.set(runId, seen);

    eventSource.addEventListener('message', (e) => {
        try {
            const event = JSON.parse(e.data) as PipelineEvent;
            // Dedupe by event ID
            if (event.id && seen.has(event.id)) return;
            if (event.id) seen.add(event.id);
            handlers.onEvent(event);
        } catch {
            // Ignore malformed
        }
    });

    eventSource.addEventListener('done', (e) => {
        try {
            const data = JSON.parse((e as MessageEvent).data);
            handlers.onDone(data.status || 'DONE');
        } catch {
            handlers.onDone('DONE');
        } finally {
            eventSource.close();
            seenEventIds.delete(runId);
        }
    });

    eventSource.onerror = () => {
        eventSource.close();
        seenEventIds.delete(runId);
        handlers.onError(new Error('Event stream connection lost'));
    };

    return eventSource;
}

/**
 * Clean up event tracking for a run
 */
export function cleanupRun(runId: string): void {
    seenEventIds.delete(runId);
}

/**
 * Get pipeline mode
 */
export function getPipelineMode(): 'mcp' | 'local' {
    return PIPELINE_MODE as 'mcp' | 'local';
}
