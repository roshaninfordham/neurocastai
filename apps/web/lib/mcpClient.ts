/**
 * MCP Client Wrapper
 * Provides functions to interact with LeanMCP server for pipeline orchestration
 */

import type { CaseInput, PipelineEvent, CaseDerived } from '@neurocast/shared';
import { getMcpBaseUrl, getMcpSseUrl } from './pipelineConfig';

export type McpRunResult = {
    runId: string;
    caseId?: string;
};

export type McpEventHandlers = {
    onEvent: (event: PipelineEvent) => void;
    onDone: (status: string, result?: CaseDerived) => void;
    onError: (error: Error) => void;
};

// Track seen event IDs per run for deduplication
const seenEventIds = new Map<string, Set<string>>();

/**
 * Start a pipeline run via MCP
 * Calls the MCP endpoint with tool invocation format
 */
export async function startMcpRun(caseInput: CaseInput): Promise<McpRunResult> {
    const baseUrl = getMcpBaseUrl();

    const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            tool: 'neurocast.run_pipeline',
            arguments: {
                caseInput,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`MCP start failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.runId) {
        throw new Error('MCP response missing runId');
    }

    // Initialize dedupe set for this run
    seenEventIds.set(data.runId, new Set());

    return {
        runId: data.runId,
        caseId: data.caseId,
    };
}

/**
 * Open SSE event stream from MCP server
 * Returns an EventSource that can be closed when done
 */
export function openMcpEventStream(
    runId: string,
    handlers: McpEventHandlers
): EventSource {
    const sseUrl = getMcpSseUrl();
    const url = `${sseUrl}/events?runId=${encodeURIComponent(runId)}`;

    const source = new EventSource(url);

    // Get or create dedupe set
    if (!seenEventIds.has(runId)) {
        seenEventIds.set(runId, new Set());
    }
    const seen = seenEventIds.get(runId)!;

    // Handle message events
    source.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data) as PipelineEvent;

            // Deduplicate by event ID
            if (data.id && seen.has(data.id)) {
                return;
            }
            if (data.id) {
                seen.add(data.id);
            }

            handlers.onEvent(data);
        } catch {
            // Ignore malformed events
        }
    });

    // Handle done event
    source.addEventListener('done', (event) => {
        try {
            const data = JSON.parse((event as MessageEvent).data);
            handlers.onDone(data.status, data.result);
        } catch {
            handlers.onDone('DONE');
        } finally {
            source.close();
            // Clean up dedupe set
            seenEventIds.delete(runId);
        }
    });

    // Handle errors
    source.onerror = () => {
        source.close();
        seenEventIds.delete(runId);
        handlers.onError(new Error('MCP event stream connection failed'));
    };

    return source;
}

/**
 * Clear event dedupe tracking for a run
 * Call this when switching runs or cleaning up
 */
export function clearRunTracking(runId: string): void {
    seenEventIds.delete(runId);
}

/**
 * Check if MCP server is available
 * Useful for fallback logic
 */
export async function checkMcpAvailability(): Promise<boolean> {
    try {
        const baseUrl = getMcpBaseUrl();
        const response = await fetch(`${baseUrl}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
        });
        return response.ok;
    } catch {
        return false;
    }
}
