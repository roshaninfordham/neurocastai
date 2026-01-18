import type {
  CaseDerived,
  CaseInput,
  CompressionResult,
  NumericMetrics,
  PipelineEvent,
  PipelineEventType,
  PipelineMetrics,
  PipelineStep,
  RiskFlag,
  RoutingDecision,
} from "@neurocast/shared";
import { runStore } from "./runStore";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createEvent(
  runId: string,
  caseId: string,
  step: PipelineStep,
  eventType: PipelineEventType,
  message: string,
  payload?: Record<string, unknown>
): PipelineEvent {
  return {
    id: `${runId}-${step}-${eventType}-${Date.now()}`,
    time: new Date().toISOString(),
    eventType,
    step,
    message,
    payload: {
      caseId,
      ...payload,
    },
  };
}

function buildRiskFlags(input: CaseInput): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const text = input.packet.rawText.toLowerCase();

  const hasDoac =
    text.includes("apixaban") ||
    text.includes("eliquis") ||
    text.includes("xarelto") ||
    text.includes("rivaroxaban") ||
    text.includes("dabigatran");

  const hasWakeUpPattern =
    text.includes("wake-up stroke") ||
    text.includes("wake up stroke") ||
    text.includes("found down") ||
    text.includes("unknown onset");

  if (hasDoac) {
    flags.push({
      id: "risk-meds-doac",
      label: "Anticoagulant present (possible DOAC)",
      severity: "CRITICAL",
      confidence: "HIGH",
      category: "MEDS",
      evidence: {
        quote: "Redacted mention of DOAC in medications list.",
        sourceAnchor: "Transfer Packet → Medications",
        docType: "TRANSFER_PACKET",
      },
      coordinationGuidance:
        "Hold thrombolysis workflow and escalate to stroke coordinator for anticoagulant management.",
      includeInHandoffByDefault: true,
    });
  }

  if (hasWakeUpPattern || !input.timeline.some((t) => t.type === "LAST_KNOWN_WELL")) {
    flags.push({
      id: "risk-timeline-unknown-onset",
      label: "Possible unknown onset / wake-up pattern",
      severity: "WARNING",
      confidence: "MEDIUM",
      category: "TIMELINE",
      evidence: {
        quote: "Redacted description suggesting wake-up stroke or unclear onset time.",
        sourceAnchor: "Transfer Packet → History",
        docType: "TRANSFER_PACKET",
      },
      coordinationGuidance:
        "Escalate timeline clarification and consider advanced imaging-based eligibility pathways.",
      includeInHandoffByDefault: true,
    });
  }

  return flags;
}

function determineRouting(flags: RiskFlag[]): RoutingDecision {
  let workflowState: RoutingDecision["state"] = "PROCEED";
  const triggeredRules: RoutingDecision["triggeredRules"] = [];

  const hasCriticalMeds = flags.some(
    (f) => f.severity === "CRITICAL" && f.category === "MEDS"
  );
  const hasUnknownOnsetFlag = flags.some((f) =>
    f.label.toLowerCase().includes("unknown onset") ||
    f.label.toLowerCase().includes("wake-up")
  );

  if (hasCriticalMeds) {
    workflowState = "HOLD";
    triggeredRules.push({
      id: "rule-critical-meds",
      name: "Critical anticoagulant present",
      explanation:
        "Detected a critical anticoagulant medication which requires hold-and-review before transfer.",
    });
  } else if (hasUnknownOnsetFlag) {
    workflowState = "ESCALATE";
    triggeredRules.push({
      id: "rule-unknown-onset",
      name: "Unknown onset / wake-up stroke",
      explanation:
        "Timeline suggests possible wake-up stroke or unclear onset and should be escalated.",
    });
  } else {
    workflowState = "PROCEED";
    triggeredRules.push({
      id: "rule-clear-path",
      name: "No high-risk blockers detected",
      explanation:
        "No critical anticoagulant or unknown-onset patterns detected in synthetic packet.",
    });
  }

  const reason =
    workflowState === "HOLD"
      ? "Hold workflow due to critical anticoagulant risk flag."
      : workflowState === "ESCALATE"
      ? "Escalate case due to possible unknown onset / wake-up pattern."
      : "Proceed with transfer workflow; no major blockers detected.";

  const nextSteps: string[] =
    workflowState === "HOLD"
      ? [
          "Confirm anticoagulant timing and last dose.",
          "Discuss risk/benefit with stroke specialist.",
          "Document decision and rationale in handoff packet.",
        ]
      : workflowState === "ESCALATE"
      ? [
          "Clarify exact time last known well if possible.",
          "Review advanced imaging criteria with hub center.",
          "Coordinate transfer with explicit timeline uncertainty notes.",
        ]
      : [
          "Confirm transfer destination and ETA.",
          "Ensure imaging and packet are attached to transfer.",
          "Notify stroke coordinator at receiving center.",
        ];

  return {
    state: workflowState,
    reason,
    triggeredRules,
    nextSteps,
    safetyNote: "Coordination only. No diagnosis.",
  };
}

export function startPipelineRun(
  runId: string,
  caseId: string,
  input: CaseInput
): void {
  runStore.setStatus(runId, "RUNNING");

  (async () => {
    const startedAt = Date.now();
    const stageLatencies: Partial<Record<PipelineStep, number>> = {};

    const recordLatency = (step: PipelineStep, startTime: number) => {
      stageLatencies[step] = Date.now() - startTime;
    };

    try {
      const ingestStart = Date.now();
      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "INGEST",
          "STEP_STARTED",
          "Ingesting packet and normalizing case input."
        )
      );

      await delay(300);

      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "INGEST",
          "STEP_DONE",
          "Case input normalized for pipeline."
        )
      );
      recordLatency("INGEST", ingestStart);

      const redactStart = Date.now();
      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "REDACT",
          "STEP_STARTED",
          "Redacting PHI from packet text before compression.",
          { method: "REGEX_DEMO" }
        )
      );

      await delay(300);

      const removedFields = ["NAME", "DOB", "MRN"];

      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "REDACT",
          "STEP_DONE",
          "PHI removed: NAME, DOB, MRN (3 categories).",
          {
            removedFields,
            method: "REGEX_DEMO",
          }
        )
      );
      recordLatency("REDACT", redactStart);

      const compressStart = Date.now();
      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "COMPRESS",
          "STEP_STARTED",
          "Compressing transfer packet text (TokenCo stub).",
          {
            provider: "TOKENCO",
          }
        )
      );

      await delay(400);

      const compression: CompressionResult = {
        provider: "TOKENCO",
        originalTokenEstimate: 1200,
        compressedTokenEstimate: 350,
        savingsPct: 71,
        compressedTextPreview:
          "Redacted summary of transfer packet suitable for downstream tools.",
      };

      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "COMPRESS",
          "STEP_DONE",
          "Compression complete with token savings.",
          {
            provider: compression.provider,
            originalTokenEstimate: compression.originalTokenEstimate,
            compressedTokenEstimate: compression.compressedTokenEstimate,
            savingsPct: compression.savingsPct,
          }
        )
      );
      recordLatency("COMPRESS", compressStart);

      const extractStart = Date.now();
      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "EXTRACT",
          "STEP_STARTED",
          "Extracting coordination risk flags from redacted text."
        )
      );

      await delay(500);

      const riskFlags = buildRiskFlags(input);

      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "EXTRACT",
          "STEP_PROGRESS",
          "Risk candidates identified; verifying evidence spans.",
          {
            candidateRiskCount: riskFlags.length,
          }
        )
      );

      await delay(300);

      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "EXTRACT",
          "STEP_DONE",
          "Risk flags extracted from packet.",
          {
            riskFlagsRaised: riskFlags.map((r) => r.id),
          }
        )
      );
      recordLatency("EXTRACT", extractStart);

      const numericStart = Date.now();
      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "NUMERIC",
          "STEP_STARTED",
          "Computing numeric timers and completeness scores (Wood Wide stub)."
        )
      );

      await delay(400);

      const numeric: NumericMetrics = {
        provider: "WOOD_WIDE",
        derivedTimers: {
          timeSinceLKWMin: 90,
          doorToCTMin: 20,
          ctToDecisionMin: 10,
          etaToCenterMin: 45,
        },
        stability: {
          status: "STABLE",
          reasons: [],
        },
        completeness: {
          scorePct: 85,
          missing: [],
        },
      };

      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "NUMERIC",
          "STEP_DONE",
          "Numeric metrics computed for case.",
          {
            completenessScorePct: numeric.completeness.scorePct,
          }
        )
      );
      recordLatency("NUMERIC", numericStart);

      const routeStart = Date.now();
      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "ROUTE",
          "STEP_STARTED",
          "Evaluating deterministic routing policy gates."
        )
      );

      await delay(300);

      const routingDecision = determineRouting(riskFlags);

      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "ROUTE",
          "STEP_DONE",
          `Routing decision ${routingDecision.state} from deterministic gate.`,
          {
            state: routingDecision.state,
            reason: routingDecision.reason,
            triggeredRuleIds: routingDecision.triggeredRules.map((r) => r.id),
          }
        )
      );
      recordLatency("ROUTE", routeStart);

      const packetStart = Date.now();
      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "PACKET",
          "STEP_STARTED",
          "Assembling coordination handoff packet."
        )
      );

      await delay(300);

      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "PACKET",
          "STEP_DONE",
          "Handoff packet assembled for display in UI."
        )
      );
      recordLatency("PACKET", packetStart);

      const entry = runStore.getRun(runId);
      const events: PipelineEvent[] = entry?.events ?? [];

      const metrics: PipelineMetrics = {
        totalLatencyMs: Date.now() - startedAt,
        stageLatenciesMs: stageLatencies,
      };

      const derived: CaseDerived = {
        caseId,
        runId,
        status: "DONE",
        outputs: {
          compression,
          riskFlags,
          numeric,
          decision: routingDecision,
        },
        metrics,
        events,
      };

      runStore.completeRun(runId, derived);
    } catch {
      runStore.failRun(runId);
      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "ROUTE",
          "ERROR",
          "Pipeline failed unexpectedly; see server logs for details."
        )
      );
    }
  })();
}
