# NeuroCast AI - Technical Architecture Documentation

## 📌 System Overview

NeuroCast AI is an **autonomous stroke care coordination platform** that transforms messy transfer packets into auditable PROCEED, HOLD, or ESCALATE decisions. The system integrates multiple AI services (Overshoot AI for vision, Gemini for triage, Wood Wide for numeric trust, and Kairo for smart contract security) into a unified pipeline.

---

## 🏗️ High-Level System Architecture

```mermaid
flowchart TB
    subgraph "Patient Interface"
        HC["Home Check-In<br/>(Patient-side)"]
    end

    subgraph "NeuroCast Core Platform"
        HUB["NeuroCast Hub<br/>(Dashboard)"]
        CC["Command Center<br/>(Coordination Board)"]
        SC["Start Case<br/>(Simulation)"]
        VC["Voice Commander<br/>(LiveKit)"]
    end

    subgraph "AI Services Layer"
        OV["Overshoot AI<br/>(Vision Detection)"]
        GM["Gemini<br/>(Triage Decision)"]
        WW["Wood Wide AI<br/>(Numeric Trust)"]
        KR["Kairo AI<br/>(Smart Gating)"]
    end

    subgraph "Output Layer"
        VTP["Verified Transfer Packet<br/>(SHA-256 Signed)"]
        NOT["Notification System<br/>(EMS/Hospital/Family)"]
    end

    HC --> |"Video Stream"| OV
    OV --> |"Detection Results"| GM
    GM --> |"Triage Decision"| WW
    WW --> |"Risk Score"| KR
    KR --> |"Security Gate"| VTP
    VTP --> NOT

    HUB --> HC
    HUB --> CC
    HUB --> SC
    HUB --> VC
```

---

## 🔄 Home Check-In Feature - Deep Technical Flowchart

The Home Check-In module enables patients to initiate verified transfer cases via video telemetry and AI-powered triage.

```mermaid
flowchart TD
    subgraph "1. SESSION INIT"
        A["Patient Opens Home Check-In"] --> B["Create Session<br/>(HCI-timestamp-uuid)"]
        B --> C["Initialize State Machine<br/>(Step: HOME_CHECKIN)"]
    end

    subgraph "2. VIDEO_DETECT"
        C --> D{"User Action"}
        D -->|"Start Camera"| E["Request Camera Permission"]
        D -->|"Upload Video"| F["Select Video File"]
        E --> G["Overshoot SDK Init<br/>(RealtimeVision)"]
        F --> G
        G --> H["Stream Frames to<br/>Overshoot AI API"]
        H --> I["Receive Detection Results<br/>(1 result/sec)"]
        I --> J["Normalize Result<br/>(signal_type, severity, confidence)"]
        J --> K["Update Derived Signals<br/>(possibleStrokeWindows, avgConfidence)"]
        K --> L["Append to Evidence Log"]
        L --> M{"More Frames?"}
        M -->|"Yes"| H
        M -->|"No"| N["Step: VIDEO_DETECT Complete"]
    end

    subgraph "3. TRIAGE"
        N --> O{"≥5 Results?"}
        O -->|"No"| P["Show Warning Toast"]
        O -->|"Yes"| Q["POST /api/homecheckin/triage"]
        Q --> R["Gemini Analyzes<br/>Derived Signals"]
        R --> S["Return TriageDecision<br/>(urgency, what_happened, why_it_matters, what_next)"]
        S --> T["Store in Session"]
        T --> U["Step: TRIAGE Complete"]
    end

    subgraph "4. NOTIFY"
        U --> V{"Override Applied?"}
        V -->|"ESCALATE"| W["Force HIGH urgency"]
        V -->|"SAFE"| X["Cap at MODERATE"]
        V -->|"None"| Y["Use Triage urgency"]
        W --> Z["POST /api/homecheckin/notify"]
        X --> Z
        Y --> Z
        Z --> AA["Generate NotifyEvents<br/>(EMS, Hospital, Family)"]
        AA --> AB["Append to notifyLog"]
        AB --> AC["Step: NOTIFY Complete"]
    end

    subgraph "5. VTP GENERATION"
        AC --> AD["Calculate Wood Wide Risk<br/>(riskProb = f(derivedSignals))"]
        AD --> AE["Kairo Security Gate<br/>(ALLOW/WARN/BLOCK)"]
        AE --> AF{"Decision?"}
        AF -->|"BLOCK"| AG["Disable Commit Button"]
        AF -->|"ALLOW/WARN"| AH["POST /api/homecheckin/vtp"]
        AH --> AI["Assemble VTP Payload"]
        AI --> AJ["SHA-256 Hash Signature"]
        AJ --> AK["Return vtpHash"]
        AK --> AL["Display VTP + Download Option"]
    end

    style A fill:#1e3a5f,stroke:#4ade80,color:#fff
    style N fill:#065f46,stroke:#4ade80,color:#fff
    style U fill:#7c2d12,stroke:#f97316,color:#fff
    style AC fill:#5b21b6,stroke:#a78bfa,color:#fff
    style AL fill:#0f766e,stroke:#2dd4bf,color:#fff
```

---

## 🔐 VTP Technology - Verified Transfer Packet Flowchart

The VTP blends Wood Wide AI (numeric trust layer) and Kairo AI (smart contract security) into a tamper-proof cryptographic commitment.

```mermaid
flowchart TD
    subgraph "Input Sources"
        E1["Evidence Summary<br/>(Overshoot Results)"]
        E2["Triage Decision<br/>(Gemini)"]
        E3["Notification Log<br/>(Events)"]
        E4["Coordinator Override<br/>(ESCALATE/SAFE)"]
    end

    subgraph "Wood Wide AI - Numeric Trust Layer"
        WW1["Extract Feature Vector"] --> WW2["Calculate Risk Probability"]
        WW2 --> WW3["riskProb = 0.1 + 0.2*strokeWindows + 0.3*highConcern + 0.1*streak"]
        WW3 --> WW4["Output: Risk Score (0.0-1.0)"]
    end

    subgraph "Kairo AI - Smart Contract Security Gate"
        K1["Analyze VTP Commitment Logic"] --> K2["Evaluate Security Rules"]
        K2 --> K3{"Risk Assessment"}
        K3 -->|"riskScore < 30"| K4["ALLOW ✅"]
        K3 -->|"30 ≤ riskScore < 70"| K5["WARN ⚠️"]
        K3 -->|"riskScore ≥ 70"| K6["BLOCK 🛑"]
    end

    subgraph "VTP Assembly"
        V1["Collect All Inputs"] --> V2["Build VTP Payload"]
        V2 --> V3["Include Trust Proofs:<br/>- Wood Wide riskProb<br/>- Kairo decision"]
        V3 --> V4["Canonical JSON Stringify"]
        V4 --> V5["SHA-256 Hash"]
        V5 --> V6["Generate vtpHash<br/>(0x prefix)"]
    end

    subgraph "Output"
        O1["Verified Transfer Packet"]
        O2["Commit to Chain<br/>(EVM Stub/LocalSim)"]
        O3["Download JSON"]
    end

    E1 --> WW1
    E2 --> WW1
    E3 --> WW1
    E4 --> WW1
    WW4 --> K1
    K4 --> V1
    K5 --> V1
    K6 -.->|"Blocked"| O1
    V6 --> O1
    O1 --> O2
    O1 --> O3

    style WW4 fill:#059669,stroke:#10b981,color:#fff
    style K4 fill:#059669,stroke:#10b981,color:#fff
    style K5 fill:#d97706,stroke:#f59e0b,color:#fff
    style K6 fill:#dc2626,stroke:#ef4444,color:#fff
    style V6 fill:#0ea5e9,stroke:#38bdf8,color:#fff
```

---

## 🎯 Overshoot AI Integration

```mermaid
sequenceDiagram
    participant P as Patient
    participant UI as Home Check-In UI
    participant SDK as Overshoot SDK
    participant API as Overshoot AI API
    participant NCA as NeuroCast App

    P->>UI: Click VIDEO_DETECT
    UI->>UI: Show Modal (Camera/Upload)
    P->>UI: Select Input Mode
    UI->>SDK: Initialize RealtimeVision
    SDK->>SDK: Configure Source + Output Schema

    loop Every 1 Second
        SDK->>API: Send Video Frame
        API->>API: AI Vision Analysis
        API-->>SDK: Detection Result JSON
        SDK-->>UI: onResult Callback
        UI->>NCA: Normalize + Store Result
        NCA->>UI: Update Evidence Log
    end

    P->>UI: Stop Detection
    UI->>SDK: vision.stop()
    NCA->>NCA: Calculate Derived Signals
```

### Overshoot SDK Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| `clip_length_seconds` | 1 | Analysis window size |
| `delay_seconds` | 1 | Buffer before processing |
| `fps` | 30 | Frame capture rate |
| `sampling_ratio` | 0.1 | Frame sampling for efficiency |

### Output Schema (Enforced)

```json
{
  "signal_type": "no_concern | possible_stroke | high_concern | uncertain",
  "severity": "low | medium | high | critical",
  "confidence": 0.0 - 1.0,
  "face_droop": boolean,
  "arm_weakness": boolean,
  "speech_difficulty": boolean,
  "gait_instability": boolean,
  "notes": "string"
}
```

---

## 📂 Project Structure

```
neurocastai-3/
├── apps/
│   └── web/                           # Next.js 15 Application
│       ├── app/                       # App Router Pages
│       │   ├── page.tsx               # NeuroCast Hub Dashboard
│       │   ├── home-checkin/          # Home Check-In Feature
│       │   │   └── page.tsx           # Full State Machine UI
│       │   ├── command-center/        # Case Coordination Board
│       │   ├── start-case/            # Simulation Tools
│       │   ├── voice-commander/       # LiveKit Voice Interface
│       │   └── api/                   # API Routes
│       │       ├── homecheckin/
│       │       │   ├── triage/        # Gemini Triage API
│       │       │   ├── notify/        # Notification Events API
│       │       │   └── vtp/           # VTP Generation API
│       │       ├── kairo/             # Security Gate API
│       │       ├── vtp/               # VTP Verification API
│       │       └── run/               # Pipeline Execution API
│       ├── lib/                       # Core Libraries
│       │   ├── overshoot/             # Overshoot SDK Integration
│       │   │   └── useOvershootVision.ts
│       │   ├── woodwide/              # Wood Wide AI Client
│       │   │   └── woodwideClient.ts
│       │   ├── kairo/                 # Kairo Security Client
│       │   │   └── kairoClient.ts
│       │   ├── vtp.ts                 # VTP Hash Generation
│       │   ├── pipelineRunner.ts      # Main Pipeline Logic
│       │   └── compressionPolicy.ts   # NeuroCast Compression
│       └── .env.local                 # Environment Variables (gitignored)
│
├── packages/
│   └── shared/                        # @neurocast/shared Types
│       └── src/
│           └── index.ts               # TriageDecision, OvershootNormalizedResult
│
├── src/                               # Legacy Vite UI
│   └── components/
│       └── ui/                        # Reusable UI Components
│
├── contracts/                         # Smart Contract Stubs
├── data/                              # Synthetic Demo Cases
├── docs/                              # Additional Documentation
│
├── .gitignore                         # Excludes .env.*, node_modules, .next
├── SAFETY.md                          # PHI Handling & Compliance
├── README.md                          # Main Documentation
└── ARCHITECTURE.md                    # This File
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router |
| **React 19** | UI component library |
| **TypeScript 5.x** | Type-safe development |
| **Tailwind CSS** | Utility-first styling |
| **Lucide React** | Icon library |
| **Sonner** | Toast notifications |

### AI Services
| Service | Purpose | Integration |
|---------|---------|-------------|
| **Overshoot AI** | Real-time video analysis for stroke detection | SDK via `@overshoot/sdk` |
| **Google Gemini** | AI-powered triage decision generation | REST API via `@google/generative-ai` |
| **Wood Wide AI** | Numeric trust scoring and risk probability | REST API |
| **Kairo AI** | Smart contract security gating | REST API |

### Security & Verification
| Component | Implementation |
|-----------|----------------|
| **VTP Hash** | SHA-256 cryptographic signature |
| **Kairo Gate** | ALLOW/WARN/BLOCK security decisions |
| **PHI Protection** | Regex-based redaction before processing |

---

## 🔒 Security Considerations

1. **API Keys**: All sensitive keys stored in `.env.local` (gitignored)
2. **PHI Redaction**: Patient identifiers removed before AI processing
3. **VTP Integrity**: SHA-256 hash ensures tamper detection
4. **Kairo Gating**: Blocks commits when security risks detected
5. **No Diagnosis**: System performs coordination, NOT medical diagnosis

---

## 📊 Key Metrics

| Feature | Metric | Value |
|---------|--------|-------|
| Compression | Token Savings | 72.6% |
| Detection | Frame Rate | 1 result/sec |
| Triage | Min Observations | 5 |
| VTP | Hash Algorithm | SHA-256 |
| Security | Gate Levels | 3 (ALLOW/WARN/BLOCK) |

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm --prefix apps/web run dev

# Open in browser
# http://localhost:3000
```

---

*Generated: 2026-01-24 | NeuroCast AI Team*
