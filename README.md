# NeuroCast AI

Stroke care coordination control layer that turns messy transfer packets into auditable PROCEED, HOLD, or ESCALATE decisions.

Figma prototype: https://www.figma.com/design/V30KaTGUs7whhC79vmVOPl/NeuroCast-AI-Prototype

## Healthcare track compliance

NeuroCast AI is a coordination-only control layer for acute stroke. It:

- Reduces administrative burden around transfers and handoffs
- Improves coordination between referring ED, telestroke, and receiving center
- Helps teams navigate care pathways without performing diagnosis or selecting treatments

All demo data in this repository are synthetic.

## Problem

Stroke transfers generate long, messy packets and ad hoc phone calls. Teams must:

- Re-read dozens of pages of notes
- Manually extract contraindications and timing details
- Coordinate across multiple hospitals under time pressure

This increases delays, cognitive load, and the risk of coordination failures.

## What NeuroCast does

For each incoming stroke transfer, NeuroCast:

- Ingests the transfer packet, timeline, and vitals
- Compresses long text into a compact representation
- Extracts coordination risk flags with explicit evidence
- Computes deterministic KPIs on top of structured data
- Routes the case to PROCEED, HOLD, or ESCALATE via a policy gate
- Generates a one-page handoff packet
- Supports real-time voice Q and A about the case
- Logs traces and evals for observability

## How it works

The pipeline is designed as an auditable control layer.

1. **Ingest**: Normalize case input (packet, timeline, vitals)
2. **Redact**: Remove PHI (names, DOBs, MRNs) before compression
3. **Compress**: TokenCo reduces packet size by ~71% for downstream LLM steps
4. **Extract**: LLM extracts coordination risk flags with evidence quotes
5. **Numeric**: **Wood Wide AI** computes timers, completeness, prediction probability, and clustering segments
6. **Route**: Deterministic policy gate (PROCEED/HOLD/ESCALATE) using Wood Wide insights + rule-based flags
7. **Packet**: Generate one-page handoff with VTP hash
8. **Voice**: LiveKit real-time voice Q&A (planned)

Stochastic LLM steps are upstream, while the final workflow state is produced by deterministic policy code that composes Wood Wide numeric insights with safety rules.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [SAFETY.md](SAFETY.md), and [WOODWIDE_INTEGRATION.md](WOODWIDE_INTEGRATION.md) for details.

## Tech stack

- Web: Next.js, React, TypeScript
- Monorepo: pnpm workspaces under `apps` and `packages`
- Shared types: `@neurocast/shared` package for `CaseInput` and `CaseDerived`
- Data: synthetic demo cases under `data/demo_cases`
- **Sponsor integrations**:
  - **Wood Wide AI**: Numeric decision workflow engine (prediction + clustering models)
  - **TokenCo**: LLM compression with 71% token savings
  - **Phoenix**: Observability and pipeline event tracing
  - **LiveKit**: Real-time voice commander (planned)
  - **LeanMCP**: Model Context Protocol deployment (planned)
  - **Kairo**: Smart contract security analysis for VTP receipt registry (optional)

## Local development

Prerequisites:

- Node.js 18 or later
- npm 10 or later

Install dependencies:

```bash
npm install
```

Run the web app:

```bash
npm run dev
```

This starts the Next.js app at http://localhost:3000 by running the Next.js app in `apps/web`.

## Demo flow

The recommended 60–90 second expo demo is described in `docs/DEMO_SCRIPT.md`. High level:

- Load a synthetic stroke case on Start Case.
- Run the pipeline to produce compressed text, risk flags, and KPIs.
- Show compression stats and evidence-backed contraindications.
- Highlight a workflow state flip to HOLD or ESCALATE.
- Show the one-page Handoff Packet.
- Use the Voice Commander page to ask why the case escalated.
- Optionally, show observability views on the Observability page.

If any external API fails, fall back to stub data under `data/demo_cases`.

## Repo map

- `apps/web`: Next.js frontend with pages for Start Case, Command Center, Evidence and Audit, Handoff Packet, Voice Commander, and Observability
- `apps/mcp`: Placeholder for the MCP backend service to be deployed on LeanMCP
- `packages/shared`: Shared types and schemas such as `CaseInput` and `CaseDerived`
- `data/demo_cases`: Synthetic demo case inputs and expected outputs
- `docs`: Architecture, safety, demo script, and sponsor integration docs

The legacy Vite prototype UI lives under `src` and can be migrated into the Next.js app as the design solidifies.

## Credits and tools

- NeuroCast AI team
- Figma prototype and initial design: NeuroCast AI Prototype
- Open-source libraries including React, Next.js, and the Radix UI ecosystem
