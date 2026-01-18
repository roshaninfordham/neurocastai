## 1) Scope & Claim

NeuroCast AI is a demo-only coordination assistant using synthetic data.

It is not a medical device, not for clinical use, and does not diagnose or provide treatment recommendations.

The system is designed around HIPAA-aligned principles: data minimization, de-identification, and auditability.

## 2) Data Policy

- Synthetic data only is used in this demo. The UI requires an explicit “synthetic data” acknowledgement before running any pipeline.
- No PHI may be sent to any model or tool call.
- No PHI may be stored in logs, traces, or analytics.
- Evidence quotes shown in the UI must originate from redacted text, never from raw packet text.

## 3) PHI Categories to Redact

The redaction layer targets the following PHI categories:

- Direct identifiers (always remove or mask)
  - Patient name (first and last), including initials when paired with other PHI
  - Date of birth (DOB); ages greater than 89 are generalized into ranges for demo purposes
  - Phone numbers
  - Email addresses
  - Full postal address and ZIP code (only city/state may be retained if needed, otherwise removed)
  - Medical record number (MRN), patient ID, account number
  - Insurance member ID
  - Device identifiers such as implant serial numbers
  - Photos or biometric identifiers (not applicable unless images are added later)

- Quasi-identifiers (mask when present in text)
  - Provider names
  - Facility names (shown only as role labels such as “Spoke ED” or “Center”)
  - Exact dates and times tied to identity (for the demo, timestamps are allowed but never alongside explicit name/DOB combinations)

- Free-text patterns
  - Lines or fragments like “Patient: John Smith”, “Name:”, “MRN:”, “DOB:”, “Address:”
  - Contact lines such as “Contact: 555-…”
  - Any appearance of “SSN:” or similar identifiers

## 4) Redaction Method

The REDACT pipeline step applies regex-based and heuristic rules for the PHI categories above and replaces matched spans with stable tokens, for example:

- `[NAME]`
- `[DOB]`
- `[PHONE]`
- `[MRN]`
- `[EMAIL]`
- `[ADDRESS]`

The redaction step emits a `RedactionSummary` object with:

- `phiRemoved`: boolean flag indicating whether any PHI was detected and removed
- `removedFields`: array of PHI category tokens such as `["NAME", "DOB", "MRN"]`
- `method`: string identifier of the redaction implementation, set to `"REGEX_DEMO"` in this prototype

Only `redactedText` and the accompanying `RedactionSummary` are permitted to flow into downstream tools or model prompts.

## 4b) TokenCo Compression

TokenCo compression operates exclusively on redacted text:

- TokenCo API calls receive only the PHI-redacted text, never raw patient data
- Compression aggressiveness is capped for high-risk cases (anticoagulants, unknown onset)
- Critical safety-critical terms are validated post-compression via coverage guardrails
- If guardrails fail, the system falls back to using the redacted text without compression

## 5) Safe Logging and Tracing Rules

Logs and traces may store:

- `caseId` and `runId`
- Pipeline step names and timings
- Token counts and compression ratios
- Rule identifiers and policy decisions

Logs and traces must never store:

- Raw packet text
- Full redacted packet text
- PHI fields such as names, DOB, MRN, phone numbers, email addresses, or addresses

Allowed logging patterns:

- Short redacted previews for debugging, capped at 200 characters
- Structured, non-PHI metadata such as `{ removedFields: ["NAME","DOB","MRN"], method: "REGEX_DEMO" }`

Any logging that includes free text must be validated to ensure it does not contain PHI or identifiable spans.

## 6) Security Posture

For this demo implementation:

- There is no persistent storage of case content; processing occurs in memory only.
- No real patient data is accepted or processed; all inputs are synthetic or simulated.
- The system operates without real user accounts; an optional local password may be used for demo access control only.

Together, these controls make the NeuroCast AI prototype “HIPAA-aligned by design” for coordination-only workflows, while staying within an appropriate claim level for a hackathon demonstration.

