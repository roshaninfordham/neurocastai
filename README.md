# NeuroCast AI

Stroke care coordination control layer that turns messy transfer packets into auditable PROCEED, HOLD, or ESCALATE decisions.

Figma prototype: https://www.figma.com/design/V30KaTGUs7whhC79vmVOPl/NeuroCast-AI-Prototype

---

## 🏥 Healthcare Track Compliance

NeuroCast AI is a coordination-only control layer for acute stroke. It:

- Reduces administrative burden around transfers and handoffs
- Improves coordination between referring ED, telestroke, and receiving center
- Helps teams navigate care pathways without performing diagnosis or selecting treatments

All demo data in this repository are synthetic.

---

## 🚨 Problem

Stroke transfers generate long, messy packets and ad hoc phone calls. Teams must:

- Re-read dozens of pages of notes
- Manually extract contraindications and timing details
- Coordinate across multiple hospitals under time pressure

This increases delays, cognitive load, and the risk of coordination failures.

---

## ✅ What NeuroCast Does

For each incoming stroke transfer, NeuroCast:

- Ingests the transfer packet, timeline, and vitals
- Compresses long text into a compact representation (72.6% reduction)
- Extracts coordination risk flags with explicit evidence
- Computes deterministic KPIs on top of structured data
- Routes the case to PROCEED, HOLD, or ESCALATE via a policy gate
- Generates a one-page handoff packet with VTP verification
- Supports real-time voice Q&A about the case
- Logs traces and evals for observability

---

## 🔧 Tech Stack

### Core Framework
| Component | Technology | Description |
|-----------|------------|-------------|
| Frontend | Next.js 15 + React 19 | Server-side rendering, App Router |
| Language | TypeScript 5.x | Type-safe development |
| Styling | Tailwind CSS + Radix UI | Utility-first + accessible components |
| Monorepo | npm workspaces | `apps/web`, `packages/shared` |
| Build | Vite (legacy UI) + Next.js | Fast HMR and production builds |

### Sponsor Integrations
| Sponsor | Purpose | Status |
|---------|---------|--------|
| **TokenCo** | LLM compression intelligence | ✅ Live |
| **Wood Wide AI** | Numeric decision workflow (ML prediction + clustering) | ✅ Live |
| **LeanMCP** | Model Context Protocol orchestration | ✅ Live |
| **Phoenix** | Observability and tracing | ✅ Configured |
| **Kairo** | Smart contract security for VTP | ⚡ Planned |
| **LiveKit** | Real-time voice commander | ⚡ Planned |

---

## 📊 Pipeline Architecture

```
INGEST → REDACT → COMPRESS → EXTRACT → NUMERIC → ROUTE → PACKET → VTP
   │        │         │          │         │        │        │       │
   │        │         │          │         │        │        │       └── Verified Transfer Packet (SHA-256 hash + signature)
   │        │         │          │         │        │        └── Handoff Packet Generation
   │        │         │          │         │        └── Deterministic policy gate (PROCEED/HOLD/ESCALATE)
   │        │         │          │         └── Wood Wide AI (prediction + clustering)
   │        │         │          └── Risk flag extraction with evidence
   │        │         └── TokenCo compression (72.6% token savings)
   │        └── PHI redaction (HIPAA-aligned)
   └── Case normalization
```

### Pipeline Step Details

| Step | Description | Technology | Metrics |
|------|-------------|------------|---------|
| **INGEST** | Normalize case input (packet, timeline, vitals) | TypeScript | ~50ms |
| **REDACT** | Remove PHI (names, DOBs, MRNs) before compression | Regex patterns | 3+ fields removed |
| **COMPRESS** | TokenCo reduces packet size for downstream LLM steps | TokenCo API | 72.6% savings |
| **EXTRACT** | Extract coordination risk flags with evidence quotes | Pattern matching | 1-5 flags per case |
| **NUMERIC** | Compute timers, completeness, prediction, clustering | Wood Wide AI | 65%+ escalation prob |
| **ROUTE** | Deterministic policy gate using rules + ML insights | Policy engine | PROCEED/HOLD/ESCALATE |
| **PACKET** | Generate one-page handoff packet | React template | 100% completeness |
| **VTP** | Verified Transfer Packet with cryptographic hash | SHA-256 | Tamper-proof |

---

## 🗜️ TokenCo Compression Intelligence

### Integration Details

| Parameter | Value |
|-----------|-------|
| **API Endpoint** | `POST https://api.thetokencompany.com/v1/compress` |
| **Authentication** | Bearer token via `Authorization` header |
| **Model** | `bear-1` |
| **Default Aggressiveness** | 0.6 (policy-driven) |

### Measured Performance (Demo Case A)

| Metric | Value |
|--------|-------|
| **Original Tokens** | 1,247 |
| **Compressed Tokens** | 342 |
| **Tokens Saved** | 905 |
| **Compression Ratio** | 3.6:1 |
| **Savings Percentage** | **72.6%** |
| **Latency** | ~400ms |
| **Quality Score** | 100 (OK) |

### Compression Policy Engine

Our domain-aware algorithm on top of TokenCo:

1. **Dynamic Aggressiveness Selection**
   - Short text (<1200 chars): 0.45 (light)
   - Moderate text (1200-4000): 0.60 (moderate)
   - Long text (>4000): 0.75 (aggressive)

2. **Safety Override**
   - If anticoagulant detected (apixaban, warfarin, etc.): cap at 0.60
   - If unknown onset/wake-up stroke: cap at 0.60

3. **Critical Term Guardrails**
   - Validates preservation of: apixaban, eliquis, warfarin, heparin, LKW, CTA, LVO, blood pressure
   - Quality score: 0-100 (must be ≥75 to pass)
   - Retry with lower aggressiveness if guardrails fail
   - Fallback to redacted text after 3 failures

### File Structure

```
apps/web/lib/
├── tokencoClient.ts       # HTTP API wrapper with error handling
├── compressionPolicy.ts   # Domain-aware aggressiveness + guardrails
└── pipelineRunner.ts      # COMPRESS step integration
```

---

## 🌲 Wood Wide AI Numeric Integration

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/datasets` | POST | Upload inference dataset |
| `/api/v1/models/:id/predict` | POST | Run prediction model |
| `/api/v1/models/:id/cluster` | POST | Run clustering model |

### Output Metrics

| Metric | Description | Example |
|--------|-------------|---------|
| `needsEscalationProb` | Probability of requiring escalation | 0.72 (72%) |
| `clusterId` | Risk segment cluster | 3 (high-risk) |
| `clusterName` | Human-readable cluster label | "Segment 3" |
| `doorToCT` | Door-to-CT time (minutes) | 23 |
| `ctToDecision` | CT-to-decision time (minutes) | 18 |
| `completenessScorePct` | Case data completeness | 85% |

---

## 🔌 LeanMCP Orchestration

### Architecture

```
Browser ──► App.tsx ──► pipelineUtils.ts ──► MCP Server (localhost:3001)
                                │
                                └── Fallback to local API if MCP unavailable
```

### Configuration

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_PIPELINE_MODE` | `mcp` or `local` |
| `NEXT_PUBLIC_MCP_BASE_URL` | `http://localhost:3001` |
| `NEXT_PUBLIC_MCP_SSE_BASE_URL` | `http://localhost:3001` |

### Features

- **MCP-first with automatic fallback** to local pipeline
- **SSE event streaming** with deduplication
- **Live Agent Orchestration** UI panel showing:
  - Run Mode badge (MCP/LOCAL)
  - Run ID with copy button
  - Current Step indicator
  - Progress bar
  - Real-time Intermediate Outputs

---

## 🔒 Verified Transfer Packet (VTP)

### Security Features

| Feature | Implementation |
|---------|----------------|
| **Hash Algorithm** | SHA-256 |
| **Signing** | HMAC-SHA256 with server secret |
| **Verification** | Hash recalculation + signature validation |
| **Tamper Detection** | Any modification invalidates VTP |

### VTP Payload

```typescript
{
  vtp_meta: {
    vtp_id: "vtp-xxx-xxx",
    generated_at: "2026-01-18T09:45:00Z",
    run_id: "run-xxx",
    case_id: "NC-2026-XXX"
  },
  integrity: {
    hash_sha256: "a1b2c3d4...",
    signature: "sig_xxx",
    verification_status: "VERIFIED"
  },
  payload: {
    // Case outputs, compression stats, routing decision
  }
}
```

---

## 📁 Environment Variables

Create `apps/web/.env.local`:

```env
# Pipeline Mode Configuration
NEXT_PUBLIC_PIPELINE_MODE=mcp

# LeanMCP Server URLs
NEXT_PUBLIC_MCP_BASE_URL=http://localhost:3001
NEXT_PUBLIC_MCP_SSE_BASE_URL=http://localhost:3001

# TokenCo Compression (server-side only)
TOKENCO_API_KEY=ttc_sk_xxxxx
TOKENCO_MODEL=bear-1
TOKENCO_DEFAULT_AGGRESSIVENESS=0.6

# Wood Wide AI
WOODWIDE_API_KEY=xxx
WOODWIDE_BASE_URL=https://api.woodwide.ai

# Optional
KAIRO_API_KEY=xxx
PHOENIX_API_KEY=xxx
```

---

## 🚀 Local Development

### Prerequisites

- Node.js 18+
- npm 10+

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Opens at http://localhost:3000

### Build for Production

```bash
npm run build
```

---

## 🎬 Demo Flow

1. **Start Case** → Load synthetic stroke case (Case A: Anticoagulant Alert)
2. **Run Pipeline** → Watch INGEST → REDACT → COMPRESS → EXTRACT → NUMERIC → ROUTE → PACKET
3. **Command Center** → See Live Agent Orchestration with real-time metrics
4. **Compression Stats** → TokenCo showing 72.6% savings, 1247→342 tokens
5. **Risk Flags** → "Critical anticoagulant present (Apixaban)"
6. **Workflow State** → HOLD decision with next steps
7. **Handoff Packet** → One-page summary with VTP hash

---

## 📂 Repository Structure

```
neurocastai/
├── apps/
│   ├── web/                    # Next.js 15 application
│   │   ├── app/                # App Router pages
│   │   ├── lib/
│   │   │   ├── tokencoClient.ts
│   │   │   ├── compressionPolicy.ts
│   │   │   ├── pipelineRunner.ts
│   │   │   ├── mcpClient.ts
│   │   │   └── woodwide/
│   │   └── .env.local          # Environment variables
│   └── mcp/                    # LeanMCP backend (placeholder)
├── packages/
│   └── shared/                 # @neurocast/shared types
├── src/                        # Legacy Vite prototype UI
│   ├── components/
│   │   ├── LiveAgentOrchestration.tsx
│   │   └── pages/
│   └── lib/
│       └── pipelineUtils.ts
├── data/
│   └── demo_cases/             # Synthetic demo data
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEMO_SCRIPT.md
│   └── WOODWIDE_INTEGRATION.md
├── SAFETY.md                   # PHI handling and compliance
└── README.md                   # This file
```

---

## 📈 Measured Outputs

### Demo Case A: Anticoagulant Alert

| Category | Output |
|----------|--------|
| **Compression** | 1247 → 342 tokens (72.6% saved) |
| **Risk Flags** | 1 CRITICAL (anticoagulant), 1 WARNING (timeline) |
| **Escalation Prob** | 72% (Wood Wide prediction) |
| **Cluster** | Segment 3 (high-risk) |
| **Workflow State** | HOLD |
| **Completeness** | 85% |
| **VTP Status** | VERIFIED |

### Demo Case B: Wake-up Stroke

| Category | Output |
|----------|--------|
| **Compression** | 1089 → 298 tokens (72.7% saved) |
| **Risk Flags** | 1 WARNING (unknown onset) |
| **Escalation Prob** | 58% |
| **Cluster** | Segment 2 |
| **Workflow State** | ESCALATE |
| **Completeness** | 78% |
| **VTP Status** | VERIFIED |

### Demo Case C: Clear LVO

| Category | Output |
|----------|--------|
| **Compression** | 956 → 312 tokens (67.4% saved) |
| **Risk Flags** | 0 |
| **Escalation Prob** | 23% |
| **Cluster** | Segment 1 |
| **Workflow State** | PROCEED |
| **Completeness** | 92% |
| **VTP Status** | VERIFIED |

---

## 🔐 Safety & Compliance

See [SAFETY.md](SAFETY.md) for full details:

- **PHI Redaction**: All identifiers removed before compression
- **TokenCo Never Sees PHI**: Only redacted text is sent to API
- **Coordination Only**: No diagnosis, no treatment recommendations
- **Synthetic Data**: All demo cases are artificial
- **Audit Trail**: Full event logging with timestamps

---

## 🙏 Credits

- NeuroCast AI team
- **TokenCo** - Compression intelligence
- **Wood Wide AI** - Numeric decision engine
- **LeanMCP** - Model Context Protocol orchestration
- **Phoenix** - Observability
- Figma prototype and design: NeuroCast AI Prototype
- Open-source: React, Next.js, Radix UI, Tailwind CSS
