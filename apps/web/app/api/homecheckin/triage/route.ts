import { NextResponse } from 'next/server';
import { TriageDecision, OvershootNormalizedResult } from '@neurocast/shared';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(req: Request) {
    if (!GEMINI_API_KEY) {
        // Graceful demo fallback
        return NextResponse.json(mockTriageDecision());
    }

    try {
        const body = await req.json();
        const observations = body.observations as OvershootNormalizedResult[];
        const derivedSignals = body.derivedSignals || {};
        const override = body.override;

        // Build derived summary
        const derivedSummary = `
Derived Signals Summary:
- Total windows analyzed: ${observations.length}
- Possible stroke windows: ${derivedSignals.possibleStrokeWindows || 0}
- High concern windows: ${derivedSignals.highConcernWindows || 0}  
- Average confidence: ${((derivedSignals.avgConfidence || 0) * 100).toFixed(1)}%
- Consecutive high-concern streak: ${derivedSignals.streakHighConcern || 0}
- Last signal: ${derivedSignals.lastSignalType || 'unknown'} (${derivedSignals.lastSeverity || 'unknown'})
${override ? `- Coordinator Override: ${override}` : ''}
        `.trim();

        // Construct prompt
        const prompt = `
You are an expert stroke triage assistant. Analyze these vision observation signals and produce a triage recommendation in STRICT JSON.

IMPORTANT: You are NOT diagnosing. You are providing decision support based on observable telemetry signals only.
DO NOT make definitive medical statements. Use phrases like "signals consistent with", "warrants evaluation", "recommend assessment".

${derivedSummary}

Recent Observations (parsed):
${JSON.stringify(observations.map(o => o.parsed || o.raw).slice(-10), null, 2)}

${override === "ESCALATE" ? "NOTE: Coordinator has marked ESCALATE - treat as high urgency minimum." : ""}
${override === "SAFE" ? "NOTE: Coordinator has marked SAFE - consider this in assessment but still report concerning signals." : ""}

Output Schema (return ONLY this JSON, no markdown):
{
  "urgency": "low" | "medium" | "high" | "critical",
  "what_happened": "brief summary of detected signals",
  "why_it_matters": "clinical significance of these signals",
  "what_next": [{"action": "string", "reason": "string"}],
  "confidence": 0.0-1.0,
  "supporting_signals": ["signal_name_1", "signal_name_2"],
  "disclaimer": "Demo only. Not medical advice."
}
    `;

        const response = await fetch(GEMINI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error("No response from Gemini");

        // Defensive parsing: strip markdown code blocks if present
        const cleaned = text.replace(/```json|```/g, "").trim();
        return NextResponse.json(JSON.parse(cleaned));

    } catch (error) {
        console.error("Triage API Error:", error);
        // Fallback on error
        return NextResponse.json(mockTriageDecision());
    }
}

function mockTriageDecision(): TriageDecision {
    return {
        urgency: "high",
        what_happened: "Detected unilateral facial asymmetry and arm drift consistent with stroke symptoms.",
        why_it_matters: "Sudden onset of focal neurological deficits is highly suggestive of acute ischemic stroke.",
        what_next: [
            { action: "call_emergency_services", reason: "Immediate medical attention required." },
            { action: "start_stroke_pipeline", reason: "Initiate verified transfer to stroke center." }
        ],
        confidence: 0.92,
        supporting_signals: ["facial_asymmetry", "arm_drift"],
        disclaimer: "Demo only. Not medical advice."
    };
}
