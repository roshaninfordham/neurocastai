import type { CaseDerived, RiskFlag } from "@neurocast/shared";

function sanitizeRiskFlags(flags: RiskFlag[] | undefined): RiskFlag[] | undefined {
  if (!flags) return flags;
  return flags.map((f) => ({
    ...f,
    // Ensure evidence quotes are short, redacted-style, never raw packet text
    evidence: {
      ...f.evidence,
      quote:
        f.evidence.quote && f.evidence.quote.length > 120
          ? f.evidence.quote.slice(0, 120) + "…"
          : f.evidence.quote,
    },
  }));
}

export function sanitizeCaseDerived(derived: CaseDerived): CaseDerived {
  // Deep copy via JSON to avoid mutating store
  const safe: CaseDerived = JSON.parse(JSON.stringify(derived));

  // Remove any potential raw text from events payloads
  safe.events = (safe.events || []).map((evt) => {
    if (evt.payload && "rawText" in evt.payload) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { rawText, ...rest } = evt.payload as Record<string, unknown>;
      return { ...evt, payload: rest };
    }
    return evt;
  });

  // Strip compressed free-text previews (keep numbers only)
  if (safe.outputs && safe.outputs.compression) {
    delete (safe.outputs.compression as Record<string, unknown>).compressedTextPreview;
    // Notes may contain free text; drop
    delete (safe.outputs.compression as Record<string, unknown>).notes;
  }

  // Sanitize risk flags evidence quotes
  if (safe.outputs) {
    safe.outputs.riskFlags = sanitizeRiskFlags(safe.outputs.riskFlags);
    if (safe.outputs.vtp) {
      // VTP already has sanitized risk_flags from buildVtp
      // No need to sanitize again
    }
  }

  return safe;
}
