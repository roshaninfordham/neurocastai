# LeanMCP Integration

Technical documentation for the LeanMCP Model Context Protocol orchestration in NeuroCast AI.

## Overview

LeanMCP provides unified pipeline orchestration with:

1. **MCP-First Execution** - Primary execution via MCP server
2. **Automatic Fallback** - Seamless switch to local API if MCP unavailable
3. **SSE Event Streaming** - Real-time pipeline progress updates
4. **Event Deduplication** - Prevents duplicate processing on reconnection

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Browser (React)                            │
├─────────────────────────────────────────────────────────────────────┤
│  App.tsx                                                             │
│    ├── startBackendPipelineForCase()                                │
│    ├── handleReconnectStream()                                       │
│    └── applyPipelineEventToCase()                                   │
├─────────────────────────────────────────────────────────────────────┤
│  src/lib/pipelineUtils.ts                                           │
│    ├── startPipelineRun() ─────► MCP or LOCAL                       │
│    ├── openEventStream() ──────► SSE connection                     │
│    └── extractIntermediateOutputs()                                 │
├─────────────────────────────────────────────────────────────────────┤
│                             │                                        │
│        ┌────────────────────┴────────────────────┐                  │
│        ▼                                         ▼                  │
│  MCP Server (3001)                    Local API (3000/api)          │
│  POST /mcp                            POST /api/run/start           │
│  GET /events?runId=xxx                GET /api/run/events?runId=xxx │
│  GET /health                          GET /api/run/result           │
└─────────────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

```env
# Pipeline Mode: 'mcp' (default) or 'local'
NEXT_PUBLIC_PIPELINE_MODE=mcp

# LeanMCP Server URLs
NEXT_PUBLIC_MCP_BASE_URL=http://localhost:3001
NEXT_PUBLIC_MCP_SSE_BASE_URL=http://localhost:3001
```

## Implementation

### File: `src/lib/pipelineUtils.ts`

#### MCP Availability Check

```typescript
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
```

#### Unified Pipeline Start

```typescript
export async function startPipelineRun(
  caseInput: CaseInput,
  onFallback?: () => void
): Promise<PipelineRunResult> {
  if (PIPELINE_MODE === 'mcp') {
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
```

#### MCP Start Request

```typescript
async function startMcpRun(caseInput: CaseInput): Promise<{ runId: string; caseId: string }> {
  const response = await fetch(`${MCP_BASE_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool: 'neurocast.run_pipeline',
      arguments: { caseInput },
    }),
  });

  const data = await response.json();
  return { runId: data.runId, caseId: data.caseId || caseInput.caseId };
}
```

#### SSE Event Stream

```typescript
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
    const event = JSON.parse(e.data) as PipelineEvent;
    
    // Deduplicate by event ID
    if (event.id && seen.has(event.id)) return;
    if (event.id) seen.add(event.id);
    
    handlers.onEvent(event);
  });

  eventSource.addEventListener('done', (e) => {
    const data = JSON.parse((e as MessageEvent).data);
    handlers.onDone(data.status || 'DONE');
    eventSource.close();
    seenEventIds.delete(runId);
  });

  eventSource.onerror = () => {
    eventSource.close();
    seenEventIds.delete(runId);
    handlers.onError(new Error('Event stream connection lost'));
  };

  return eventSource;
}
```

### File: `src/App.tsx`

#### Start Pipeline for Case

```typescript
const startBackendPipelineForCase = async (caseData: CaseData) => {
  try {
    const result = await startPipelineRun(
      buildCaseInput(caseData),
      () => toast.warning('MCP offline → fallback to local')
    );

    setActiveRunId(result.runId);
    setActiveRunSource(result.source);

    // Update case with run info
    setCases(prev => ({
      ...prev,
      [activeCaseId]: {
        ...prev[activeCaseId],
        runId: result.runId,
        runSource: result.source,
        currentStep: 'INGEST',
        intermediateOutputs: {},
        pipelineStatus: { compression: 'pending', ... },
      },
    }));

    // Start event stream
    startEventStream(result.runId, result.source);

    if (result.source === 'MCP') {
      toast.success('Pipeline started via MCP');
    }
  } catch (error) {
    toast.error('Failed to start pipeline');
  }
};
```

#### Handle Reconnection

```typescript
const handleReconnectStream = () => {
  if (activeRunId && activeRunSource) {
    startEventStream(activeRunId, activeRunSource);
    toast.success('Stream reconnected');
  } else {
    toast.error('No active run to reconnect');
  }
};
```

## UI: Live Agent Orchestration

### File: `src/components/LiveAgentOrchestration.tsx`

```tsx
export function LiveAgentOrchestration({ caseData, onRerun, onReconnect }) {
  const runId = caseData.runId;
  const runSource = caseData.runSource;
  const currentStep = caseData.currentStep || 'INGEST';
  const intermediateOutputs = caseData.intermediateOutputs || {};

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
      <CardHeader>
        <CardTitle>
          <Activity /> Live Agent Orchestration
        </CardTitle>
        <Button onClick={onReconnect}>Reconnect</Button>
        <Button onClick={onRerun}>Re-run</Button>
      </CardHeader>
      <CardContent>
        {/* Run Info Row */}
        <div className="flex items-center gap-4">
          {/* Run Mode Badge */}
          <span>Run Mode:</span>
          {runSource === 'MCP' ? (
            <Badge className="bg-purple-600">
              <Cloud /> MCP
            </Badge>
          ) : (
            <Badge variant="outline">
              <Server /> LOCAL
            </Badge>
          )}

          {/* Run ID */}
          <span>Run ID:</span>
          <code>{runId?.slice(0, 8)}...</code>
          <Button onClick={handleCopyRunId}><Copy /></Button>

          {/* Current Step */}
          <span>Current Step:</span>
          <Badge>{currentStep}</Badge>
        </div>

        {/* Progress Bar */}
        <Progress value={progressPercent} />

        {/* Intermediate Outputs Panel */}
        <div className="grid grid-cols-4 gap-3">
          {/* REDACT, COMPRESS, EXTRACT, NUMERIC, ROUTE, PACKET, VTP */}
          {/* Each step shows real-time output data */}
        </div>
      </CardContent>
    </Card>
  );
}
```

## Intermediate Outputs

### Type Definition

```typescript
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
  };
  extract?: { flagCount: number; criticalCount: number };
  numeric?: {
    prob?: number;
    cluster?: number;
    clusterName?: string;
    timers?: { doorToCT?: number; ctToDecision?: number };
    completeness?: number;
  };
  route?: { state: string; ruleIds: string[]; reason: string };
  packet?: { ready: boolean };
  vtp?: { hash: string; verified: boolean; vtpId: string };
}
```

### Extraction Logic

```typescript
export function extractIntermediateOutputs(
  event: PipelineEvent,
  existing: IntermediateOutputs = {}
): IntermediateOutputs {
  const outputs = { ...existing };
  const payload = event.payload || {};

  if (event.step === 'REDACT' && event.eventType === 'STEP_DONE') {
    outputs.redact = {
      removedFields: payload.removedFields || [],
      phiRemoved: payload.phiRemoved ?? true,
    };
  }

  if (event.step === 'COMPRESS' && event.eventType === 'STEP_DONE') {
    outputs.compress = {
      savingsPct: payload.compressionPct || 0,
      originalTokens: payload.originalTokens || 0,
      compressedTokens: payload.outputTokens || 0,
      tokensSaved: payload.tokensSaved || 0,
      ratio: payload.compressionRatio || 1,
      qualityScore: payload.qualityScore,
      qualityOk: payload.qualityOk,
      provider: payload.provider || 'TOKENCO',
    };
  }

  // ... similar for other steps

  return outputs;
}
```

## Error Handling

### Fallback Behavior

1. MCP unavailable → Automatic switch to local API
2. Toast notification: "MCP offline → fallback to local"
3. Run continues with `source: 'LOCAL'`
4. UI shows LOCAL badge instead of MCP

### Stream Reconnection

1. User clicks "Reconnect" button
2. `handleReconnectStream()` called
3. New EventSource opened with same `runId` and `source`
4. Event deduplication prevents duplicate processing
5. Toast: "Stream reconnected"

## API Endpoints

### MCP Server (localhost:3001)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Availability check |
| `/mcp` | POST | Start pipeline run |
| `/events` | GET (SSE) | Event stream |

### Local API (localhost:3000)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/run/start` | POST | Start pipeline run |
| `/api/run/events` | GET (SSE) | Event stream |
| `/api/run/result` | GET | Final result |

## Demo Run Button

### File: `src/components/pages/StartCase.tsx`

```tsx
{/* Demo Run (Full Stack) - Prominent Button */}
{onDemoRun && (
  <Card className="border-2 border-purple-500 bg-gradient-to-r from-purple-50 to-indigo-50">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-purple-900">Demo Run (Full Stack)</h3>
          <p className="text-sm text-purple-700">Load Case A → Start MCP Pipeline → Navigate to Command Center</p>
        </div>
        <Button onClick={onDemoRun} size="lg" className="bg-purple-600 hover:bg-purple-700">
          <Play /> Start Demo
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

## Testing

1. **MCP Mode**: Start LeanMCP server on port 3001, run app
2. **Fallback**: Stop MCP server, verify automatic switch to local
3. **Reconnection**: Disconnect network, click Reconnect, verify stream resumes
4. **Deduplication**: Reconnect mid-stream, verify no duplicate events
