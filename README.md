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

1. Ingest
2. Token Company compression
3. LLM-based risk extraction
4. Wood Wide numeric metrics
5. Deterministic routing gate
6. Handoff packet generation
7. Voice agent and safe Q and A (LiveKit)
8. Observability and evals (Phoenix)

Stochastic LLM steps are upstream, while the final workflow state is produced by deterministic policy code.

See `docs/ARCHITECTURE.md` and `docs/SAFETY.md` for details.

## Tech stack

- Web: Next.js, React, TypeScript
- Monorepo: pnpm workspaces under `apps` and `packages`
- Shared types: `@neurocast/shared` package for `CaseInput` and `CaseDerived`
- Data: synthetic demo cases under `data/demo_cases`
- Planned sponsor integrations:
  - Token Company for compression
  - LeanMCP for MCP deployment
  - Wood Wide for numeric KPIs
  - LiveKit for voice agent
  - Phoenix for traces and evals
  - Kairo (optional) for audit hash ledger

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
