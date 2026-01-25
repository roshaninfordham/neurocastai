import { NextResponse } from 'next/server';
import { TriageDecision } from '@neurocast/shared';

/**
 * Notify API - Generates notification events based on triage decision and override
 * 
 * For demo purposes: simulates EMS, Hospital, and Family notifications
 * No actual external SMS/call integrations
 */

type NotifyTarget = "EMS" | "HOSPITAL" | "FAMILY";
type NotifyStatus = "queued" | "sent" | "failed";

interface NotifyEvent {
    ts: string;
    target: NotifyTarget;
    status: NotifyStatus;
    message: string;
}

interface NotifyRequest {
    sessionId: string;
    triageDecision: TriageDecision;
    override: "ESCALATE" | "SAFE" | null;
}

interface NotifyResponse {
    events: NotifyEvent[];
    summary: string;
}

export async function POST(req: Request) {
    try {
        const body: NotifyRequest = await req.json();
        const { triageDecision, override } = body;

        const events: NotifyEvent[] = [];
        const now = new Date();

        // Determine notification level based on urgency and override
        const shouldEscalate =
            override === "ESCALATE" ||
            triageDecision.urgency === "high" ||
            triageDecision.urgency === "critical";

        const shouldNotifyMinimal = override === "SAFE" &&
            triageDecision.urgency !== "high" &&
            triageDecision.urgency !== "critical";

        if (shouldEscalate) {
            // Full escalation: EMS + Hospital + Family
            events.push({
                ts: new Date(now.getTime()).toISOString(),
                target: "EMS",
                status: "sent",
                message: `URGENT: Possible stroke detected. Patient at home location. Confidence: ${(triageDecision.confidence * 100).toFixed(0)}%. Triage: ${triageDecision.what_happened}`
            });

            events.push({
                ts: new Date(now.getTime() + 500).toISOString(),
                target: "HOSPITAL",
                status: "sent",
                message: `STROKE ALERT: Incoming patient via EMS. Pre-notification for stroke team activation. Signals: ${triageDecision.supporting_signals?.join(", ") || "facial_asymmetry, arm_weakness"}`
            });

            events.push({
                ts: new Date(now.getTime() + 1000).toISOString(),
                target: "FAMILY",
                status: "sent",
                message: `Emergency services have been notified. Please stay calm and stay with the patient. Medical team is on the way.`
            });
        } else if (shouldNotifyMinimal) {
            // Minimal notification: only family monitoring update
            events.push({
                ts: new Date(now.getTime()).toISOString(),
                target: "FAMILY",
                status: "sent",
                message: `Routine check-in complete. No urgent concerns detected. Coordinator has marked status as SAFE. Continue normal monitoring.`
            });
        } else {
            // Standard notification: family + optional hospital advisory
            events.push({
                ts: new Date(now.getTime()).toISOString(),
                target: "FAMILY",
                status: "sent",
                message: `Check-in complete. Urgency level: ${triageDecision.urgency}. ${triageDecision.what_happened}. Recommended: ${triageDecision.what_next?.[0]?.action || "continue monitoring"}`
            });

            if (triageDecision.urgency === "medium") {
                events.push({
                    ts: new Date(now.getTime() + 500).toISOString(),
                    target: "HOSPITAL",
                    status: "sent",
                    message: `Advisory: Patient flagged for medium urgency during home check-in. No immediate action required. Details: ${triageDecision.what_happened}`
                });
            }
        }

        const summary = shouldEscalate
            ? "Emergency escalation: EMS, Hospital, and Family notified"
            : shouldNotifyMinimal
                ? "Monitoring update sent to family"
                : `Standard notification: ${events.length} parties notified`;

        return NextResponse.json({ events, summary } as NotifyResponse);

    } catch (error) {
        console.error("Notify API Error:", error);

        // Fallback response
        return NextResponse.json({
            events: [{
                ts: new Date().toISOString(),
                target: "FAMILY" as NotifyTarget,
                status: "sent" as NotifyStatus,
                message: "Check-in notification processed (demo mode)"
            }],
            summary: "Fallback notification sent"
        } as NotifyResponse);
    }
}
