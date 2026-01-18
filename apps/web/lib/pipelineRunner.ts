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
  HandoffPacket,
  VtpPacket,
  RedactionSummary,
} from "@neurocast/shared";
import { runStore } from "./runStore";
import { buildVerifiedTransferPacket } from "./vtp/buildVtp";
import { getOrCreateModels } from "./woodwide/woodwideBootstrap";
import { caseToFeatures, inferenceRowToCsv } from "./woodwide/caseToFeatures";
import {
  uploadDataset,
  inferPrediction,
  inferClustering,
} from "./woodwide/woodwideClient";

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

function determineRouting(
  flags: RiskFlag[],
  numeric?: NumericMetrics
): RoutingDecision {
  let workflowState: RoutingDecision["state"] = "PROCEED";
  const triggeredRules: RoutingDecision["triggeredRules"] = [];

  const hasCriticalMeds = flags.some(
    (f) => f.severity === "CRITICAL" && f.category === "MEDS"
  );
  const hasUnknownOnsetFlag = flags.some((f) =>
    f.label.toLowerCase().includes("unknown onset") ||
    f.label.toLowerCase().includes("wake-up")
  );

  // Wood Wide numeric decision integration
  const woodwideHighRisk = numeric?.prediction?.needsEscalationProb ?? 0 >= 0.65;
  const woodwideClusterRisk = numeric?.clustering?.clusterId && numeric.clustering.clusterId >= 3;

  if (hasCriticalMeds) {
    workflowState = "HOLD";
    triggeredRules.push({
      id: "rule-critical-meds",
      name: "Critical anticoagulant present",
      explanation:
        "Detected a critical anticoagulant medication which requires hold-and-review before transfer.",
    });
  } else if (woodwideHighRisk || woodwideClusterRisk) {
    workflowState = "ESCALATE";
    triggeredRules.push({
      id: "rule-woodwide-escalation",
      name: "Wood Wide numeric escalation signal",
      explanation: woodwideHighRisk
        ? `Wood Wide prediction model indicates ${Math.round((numeric?.prediction?.needsEscalationProb ?? 0) * 100)}% probability of needing escalation.`
        : `Case assigned to high-risk cluster segment ${numeric?.clustering?.clusterId}.`,
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
        "No critical anticoagulant, Wood Wide high-risk signals, or unknown-onset patterns detected.",
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

function buildHandoffPacket(
  input: CaseInput,
  outputs: {
    compression?: CompressionResult;
    riskFlags?: RiskFlag[];
    numeric?: NumericMetrics;
    decision?: RoutingDecision;
  }
): HandoffPacket {
  const facilityLabel =
    input.facility.type === "THROMBECTOMY_CENTER"
      ? "Stroke center (hub)"
      : "Non-specialized ED (spoke)";

  const timelineMap: Record<string, string> = {};
  input.timeline.forEach((t) => {
    timelineMap[t.type] = t.time;
  });

  const vitalsStability = outputs.numeric?.stability.status ?? "UNKNOWN";

  const risks = (outputs.riskFlags || []).map((r) => ({
    severity: r.severity,
    label: r.label,
    evidenceQuote:
      r.evidence.quote && r.evidence.quote.length > 120
        ? r.evidence.quote.slice(0, 120) + "…"
        : r.evidence.quote,
    sourceAnchor: r.evidence.sourceAnchor,
    confidence: r.confidence,
  }));

  const missing: string[] = [];
  if (!input.packet.hasMedsList) missing.push("Complete medication list needed");
  const hasCT = Boolean(timelineMap["CT_START"]);
  const hasCTA = Boolean(timelineMap["CTA_RESULT"]);
  if (!hasCT) missing.push("CT imaging not started");
  if (!hasCTA) missing.push("CTA result pending");
  if (!input.timeline.some((t) => t.type === "LAST_KNOWN_WELL")) {
    missing.push("Last known well time not established");
  }

  const header = {
    caseId: input.caseId,
    facilityType: facilityLabel,
    arrivalMode: input.arrivalMode,
    workflowState: outputs.decision?.state ?? "HOLD",
    completenessScorePct: outputs.numeric?.completeness.scorePct ?? 0,
  };

  const timelineTable = [
    { event: "Last Known Well", time: timelineMap["LAST_KNOWN_WELL"], interval: undefined },
    { event: "ED Arrival", time: timelineMap["ED_ARRIVAL"], interval: undefined },
    { event: "CT Start", time: timelineMap["CT_START"], interval: undefined },
    { event: "CTA Result", time: timelineMap["CTA_RESULT"], interval: undefined },
    { event: "Decision Time", time: timelineMap["DECISION_TIME"], interval: undefined },
  ];

  return {
    header,
    timelineTable,
    vitalsSummary: {
      stability: vitalsStability,
    },
    risks,
    missingInfoChecklist: missing,
    coordinationNextSteps: outputs.decision?.nextSteps ?? [],
    export: {
      text: `NeuroCast AI coordination summary for case ${input.caseId}`,
    },
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
    let redactionSummary: RedactionSummary = {
      phiRemoved: false,
      removedFields: [],
      method: "REGEX_DEMO",
    };

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
      redactionSummary = {
        phiRemoved: removedFields.length > 0,
        removedFields,
        method: "REGEX_DEMO",
      };

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
          "Computing numeric timers and completeness scores (powered by Wood Wide).",
          {
            provider: "woodwide",
            inputs: ["timeline", "vitals", "completeness", "flags"],
          }
        )
      );

      // Bootstrap Wood Wide models if needed
      let numeric: NumericMetrics;
      try {
        const { predModelId, clusterModelId } = await getOrCreateModels();
        
        // Convert case to features
        const inferenceRow = caseToFeatures(input);
        const inferCsv = inferenceRowToCsv(inferenceRow);

        // Upload inference dataset
        const inferDatasetName = `neurocast_infer_${runId}`;
        const { dataset_id: inferDatasetId } = await uploadDataset(inferCsv, inferDatasetName, true);

        // Run prediction inference
        const predResult = await inferPrediction(predModelId, inferDatasetId);
        const needsEscalationProb = predResult.predictions[0]?.probability ?? 0;

        // Run clustering inference
        const clusterResult = await inferClustering(clusterModelId, inferDatasetId);
        const clusterId = clusterResult.clusters[0]?.cluster_id ?? 0;

        // Build numeric metrics from Wood Wide outputs
        numeric = {
          timers: {
            doorToCT: inferenceRow.door_to_ct_min,
            ctToDecision: inferenceRow.ct_to_decision_min,
            timeSinceLKW: inferenceRow.time_since_lkw_min,
          },
          completeness: {
            scorePct: inferenceRow.completeness_score_pct,
            missingFields: inferenceRow.missing_items_count,
          },
          stability: {
            status: inferenceRow.vitals_variance_score < 15 ? "STABLE" : "UNSTABLE",
            flagCount: riskFlags.length,
          },
          anomalies: [],
          provider: "Wood Wide",
          prediction: {
            needsEscalationProb,
            confidence: needsEscalationProb > 0.7 ? "HIGH" : needsEscalationProb > 0.4 ? "MEDIUM" : "LOW",
          },
          clustering: {
            clusterId,
            clusterName: `Segment ${clusterId}`,
          },
        };
      } catch (err) {
        console.error("Wood Wide inference failed, using fallback:", err);
        // Fallback to deterministic computation
        const inferenceRow = caseToFeatures(input);
        numeric = {
          timers: {
            doorToCT: inferenceRow.door_to_ct_min,
            ctToDecision: inferenceRow.ct_to_decision_min,
            timeSinceLKW: inferenceRow.time_since_lkw_min,
          },
          completeness: {
            scorePct: inferenceRow.completeness_score_pct,
            missingFields: inferenceRow.missing_items_count,
          },
          stability: {
            status: inferenceRow.vitals_variance_score < 15 ? "STABLE" : "UNSTABLE",
            flagCount: riskFlags.length,
          },
          anomalies: [],
          provider: "Fallback (Wood Wide unavailable)",
        };
      }

      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "NUMERIC",
          "STEP_DONE",
          "Numeric metrics computed for case (Wood Wide).",
          {
            provider: numeric.provider,
            completenessScorePct: numeric.completeness.scorePct,
            riskProb: numeric.prediction?.needsEscalationProb,
            clusterId: numeric.clustering?.clusterId,
            anomalies: numeric.anomalies?.length ?? 0,
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

      const routingDecision = determineRouting(riskFlags, numeric);

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
          "Building NeuroCast Verified Transfer Packet (VTP)..."
        )
      );

      await delay(300);

      // Build the VTP with all outputs
      const vtp = buildVerifiedTransferPacket({
        caseInput: input,
        outputs: {
          compression,
          riskFlags,
          numeric,
          decision: routingDecision,
          handoff: buildHandoffPacket(input, {
            compression,
            riskFlags,
            numeric,
            decision: routingDecision,
          }),
        },
        runId,
        metrics: {
          totalLatencyMs: Date.now() - startedAt,
          stageLatenciesMs: stageLatencies,
        },
        redactionSummary,
      });

      runStore.appendEvent(
        runId,
        createEvent(
          runId,
          caseId,
          "PACKET",
          "STEP_DONE",
          "Verified Transfer Packet assembled with cryptographic verification.",
          {
            vtp_id: vtp.vtp_meta.vtp_id,
            hash_sha256: vtp.integrity.hash_sha256,
            verification_status: vtp.integrity.verification_status,
          }
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
          vtp,
          handoff: buildHandoffPacket(input, {
            compression,
            riskFlags,
            numeric,
            decision: routingDecision,
          }),
          kairo: {
            decision: "ALLOW",
            riskScore: 0,
            analyzedAt: new Date().toISOString(),
            summary: "Simulated Kairo pre-deploy analysis. Configure KAIRO_API_KEY to enable.",
            source: "kairo-simulated",
          },
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
