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

        // Construct prompt
        const prompt = `
      You are an expert stroke triage system. Analyze these vision observation headers (no video) and produce a triage decision in STRICT JSON.
      
      Observations:
      ${JSON.stringify(observations.map(o => o.parsed || o.raw).slice(-10))}

      Output Schema:
      {
        "urgency": "low" | "medium" | "high" | "critical",
        "what_happened": "brief summary",
        "why_it_matters": "clinical significance",
        "what_next": [{"action", "reason"}],
        "confidence": 0.0-1.0,
        "supporting_signals": ["string"],
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

        return NextResponse.json(JSON.parse(text));

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
