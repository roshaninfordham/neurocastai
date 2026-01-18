# NeuroCast AI Architecture

NeuroCast AI is a stroke care coordination control layer. It does not perform diagnosis or recommend treatment. Instead, it ingests messy handoff data, compresses it, scores coordination risk, and routes the case to PROCEED, HOLD, or ESCALATE with auditable evidence.

## Users

- Emergency department nurse and physician
- Stroke coordinator
- Telestroke neurologist

These users are responsible for clinical decisions. NeuroCast is a decision support and coordination tool only.

## Inputs

- Transfer packet text from referring facility
- Timeline notes and key events
- Vitals and other structured signals

All inputs in this repository and demo flow are synthetic.

## Outputs

- Workflow state: PROCEED, HOLD, or ESCALATE
- Evidence-backed coordination risk flags
- One-page handoff packet artifact
- Voice announcements and Q and A responses
- Traces, metrics, and evals for observability

## Control layer and deterministic gating

NeuroCast separates stochastic and deterministic steps.

- LLM stages are used for compression and evidence extraction.
- Deterministic code computes numeric KPIs and applies policy gates.
- The final routing decision is always deterministic and reproducible for a given input.

This separation makes the system auditable and safer for high-acuity coordination while still benefiting from language models.

## Pipeline

1. Ingest
   - Receive a messy transfer packet, timeline notes, and vitals.
   - Normalize into a structured `CaseInput` object.
2. TokenCo compression
   - Use a compression model or API to summarize long free text into a compact, token-efficient representation.
   - Preserve traceability to original spans for audit.
3. Risk extraction
   - Use an LLM prompt to extract potential coordination risk flags from compressed text and structured vitals.
   - Capture supporting evidence snippets and rationales.
4. Wood Wide numeric metrics
   - Compute deterministic KPIs from structured data and extracted fields.
   - Examples include time metrics, protocol checklist completion, and signal quality.
5. Deterministic routing gate
   - Combine numeric KPIs and risk flags using a transparent policy engine.
   - Produce one of three workflow states: PROCEED, HOLD, or ESCALATE.
   - Log the exact rules that fired for audit.
6. Handoff generation
   - Render a one-page handoff packet containing:
     - Patient identifiers or pseudonyms
     - Key vitals, timelines, and checklists
     - Workflow state and reasons
     - Highlighted risk flags with evidence snippets
7. Voice and Q and A
   - Connect to a voice agent platform such as LiveKit.
   - Allow safe questions like why the case was escalated and which evidence mattered.
8. Observability and evals
   - Stream traces, metrics, and evaluation events to a system like Phoenix.
   - Track latency, token usage, policy gate activations, and user overrides.

## Deployment as MCP

NeuroCast is intended to be deployed as an MCP service on LeanMCP.

- The MCP backend exposes endpoints for running the pipeline on a `CaseInput`.
- The web app and voice agent call into this MCP service.
- Sponsors such as Token Company, Wood Wide, LiveKit, Phoenix, and LeanMCP itself plug into the pipeline stages described above.

