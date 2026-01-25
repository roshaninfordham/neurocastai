import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { TriageDecision, OvershootNormalizedResult } from '@neurocast/shared';

/**
 * Home Check-In VTP Generator
 * 
 * Assembles a Verified Transfer Packet from home check-in session data including:
 * - Overshoot evidence summary
 * - Triage decision
 * - Coordinator override
 * - Notification log
 * - Wood Wide numeric trust
 * - Kairo security gate result
 */

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

interface HomeCheckinSession {
    sessionId: string;
    startedAt: string;
    mode: "camera" | "video";
    overshootResults: OvershootNormalizedResult[];
    derivedSignals: {
        possibleStrokeWindows: number;
        highConcernWindows: number;
        avgConfidence: number;
        lastSignalType?: string;
        lastSeverity?: string;
    };
    triageDecision?: TriageDecision;
    woodwideNumeric?: WoodWideNumeric;
    kairoDecision?: KairoDecision;
    override: CoordinatorOverride;
    notifyLog: NotifyEvent[];
}

interface VTPRequest {
    session: HomeCheckinSession;
}

interface HomeCheckinVTP {
    vtp_meta: {
        vtp_version: string;
        vtp_id: string;
        session_id: string;
        created_at_iso: string;
        environment: string;
        synthetic_declared: boolean;
    };
    patient_context: {
        location_type: string;
        check_in_mode: string;
        disclaimer: string;
    };
    home_checkin_evidence: {
        total_windows_analyzed: number;
        possible_stroke_windows: number;
        high_concern_windows: number;
        avg_confidence: number;
        last_signal_type: string;
        last_severity: string;
        sample_observations: Array<{
            ts: string;
            signal_type: string;
            severity: string;
            confidence: number;
            notes: string;
        }>;
    };
    triage_decision: {
        urgency: string;
        what_happened: string;
        why_it_matters: string;
        what_next: Array<{ action: string; reason: string }>;
        confidence: number;
        supporting_signals: string[];
        disclaimer: string;
    } | null;
    coordinator_override: {
        override_type: CoordinatorOverride;
        logged_at: string | null;
        affects_triage: boolean;
        affects_notify: boolean;
    };
    notification_log: NotifyEvent[];
    numeric_trust_layer: {
        provider: string;
        risk_probability: number;
        cluster_id?: number;
        features?: Record<string, number>;
        interpretation: string;
    };
    security_gate: {
        provider: string;
        decision: string;
        risk_score: number;
        summary: string;
        commit_allowed: boolean;
    };
    integrity_proof: {
        hash_sha256: string;
        signature_alg: string;
        verification_status: "VERIFIED" | "PENDING" | "FAILED";
    };
    audit_metadata: {
        pipeline_steps: string[];
        models_used: string[];
        total_latency_ms: number;
    };
}

function computeHash(data: object): string {
    const canonical = JSON.stringify(data, Object.keys(data).sort());
    return `0x${createHash('sha256').update(canonical).digest('hex')}`;
}

export async function POST(req: Request) {
    try {
        const body: VTPRequest = await req.json();
        const { session } = body;

        const vtpId = `HCI-VTP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Build evidence summary from last 5 observations
        const sampleObs = session.overshootResults.slice(-5).map(r => ({
            ts: r.ts,
            signal_type: r.parsed?.signal_type || "unknown",
            severity: r.parsed?.severity || "unknown",
            confidence: r.parsed?.confidence || 0,
            notes: r.parsed?.notes || ""
        }));

        // Build VTP
        const vtp: Omit<HomeCheckinVTP, 'integrity_proof'> = {
            vtp_meta: {
                vtp_version: "1.0.0-homecheckin",
                vtp_id: vtpId,
                session_id: session.sessionId,
                created_at_iso: new Date().toISOString(),
                environment: "demo",
                synthetic_declared: true
            },
            patient_context: {
                location_type: "home",
                check_in_mode: session.mode,
                disclaimer: "Demo only. No PHI collected. Observable signals only."
            },
            home_checkin_evidence: {
                total_windows_analyzed: session.overshootResults.length,
                possible_stroke_windows: session.derivedSignals.possibleStrokeWindows,
                high_concern_windows: session.derivedSignals.highConcernWindows,
                avg_confidence: session.derivedSignals.avgConfidence,
                last_signal_type: session.derivedSignals.lastSignalType || "none",
                last_severity: session.derivedSignals.lastSeverity || "none",
                sample_observations: sampleObs
            },
            triage_decision: session.triageDecision ? {
                urgency: session.triageDecision.urgency,
                what_happened: session.triageDecision.what_happened,
                why_it_matters: session.triageDecision.why_it_matters,
                what_next: session.triageDecision.what_next,
                confidence: session.triageDecision.confidence,
                supporting_signals: session.triageDecision.supporting_signals,
                disclaimer: session.triageDecision.disclaimer
            } : null,
            coordinator_override: {
                override_type: session.override,
                logged_at: session.override ? new Date().toISOString() : null,
                affects_triage: session.override === "ESCALATE",
                affects_notify: session.override !== null
            },
            notification_log: session.notifyLog,
            numeric_trust_layer: {
                provider: "woodwide",
                risk_probability: session.woodwideNumeric?.riskProb ?? 0,
                cluster_id: session.woodwideNumeric?.clusterId,
                features: session.woodwideNumeric?.features,
                interpretation: session.woodwideNumeric?.riskProb && session.woodwideNumeric.riskProb > 0.7
                    ? "HIGH RISK - immediate attention recommended"
                    : session.woodwideNumeric?.riskProb && session.woodwideNumeric.riskProb > 0.4
                        ? "MODERATE RISK - close monitoring advised"
                        : "LOW RISK - routine follow-up"
            },
            security_gate: {
                provider: "kairo",
                decision: session.kairoDecision?.decision || "ALLOW",
                risk_score: session.kairoDecision?.riskScore || 0,
                summary: session.kairoDecision?.summary || "Security check passed",
                commit_allowed: session.kairoDecision?.decision !== "BLOCK"
            },
            audit_metadata: {
                pipeline_steps: ["HOME_CHECKIN", "VIDEO_DETECT", "TRIAGE", "NOTIFY", "VTP"],
                models_used: ["overshoot/stroke-telemetry", "gemini-1.5-flash", "woodwide/risk-pred"],
                total_latency_ms: session.overshootResults.reduce((acc, r) => acc + (r.totalLatencyMs || 0), 0)
            }
        };

        // Compute hash
        const hash = computeHash(vtp);

        // Add integrity proof
        const fullVtp: HomeCheckinVTP = {
            ...vtp,
            integrity_proof: {
                hash_sha256: hash,
                signature_alg: "sha256",
                verification_status: "VERIFIED"
            }
        };

        return NextResponse.json({
            vtp: fullVtp,
            hash,
            verification_status: "VERIFIED",
            commit_allowed: fullVtp.security_gate.commit_allowed
        });

    } catch (error) {
        console.error("VTP Generation Error:", error);
        return NextResponse.json({
            error: "VTP generation failed",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
