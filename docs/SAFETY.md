# Safety and scope

NeuroCast AI is a stroke care coordination control layer. It is not a diagnostic tool and does not recommend treatment.

## Data policy

- Demo cases in this repository are synthetic only.
- No real protected health information is stored in this repo.
- Any deployment with real data must follow institutional security and compliance requirements.

## Clinical scope

- The system does not provide diagnosis.
- The system does not recommend or select treatments.
- The system focuses on coordination, routing, and information compression only.

Final clinical decisions remain the responsibility of licensed clinicians.

## Deterministic final decision

- LLMs are used only for compression and evidence extraction.
- Numeric KPIs and policy rules are implemented in deterministic code.
- The workflow state output is reproducible for the same input.
- Every decision is traceable back to specific rules, metrics, and evidence.

## Evidence requirements

- Every coordination risk flag must be backed by evidence.
- Evidence includes:
  - Source text snippets from the packet or timeline
  - Structured vitals or metrics
  - Policy rules that fired
- Risk flags without evidence are discarded or marked invalid.

## Blocked questions in voice and chat

The voice and chat interfaces must block certain categories of questions, including:

- Direct diagnosis or treatment recommendation requests
- Questions about specific drug dosing or imaging protocols
- Questions about predicting outcomes or prognosis
- Requests to override institutional stroke protocols

Instead, the system can:

- Explain what information is available in the packet
- Describe coordination status and workflow state
- Suggest contacting the appropriate clinical specialist

## Disclaimers

- NeuroCast AI is a coordination tool, not a medical device.
- It is not intended to replace clinical judgment.
- Outputs are for information and coordination support only.
- Use in production clinical environments requires additional validation, regulatory review, and institutional approval.

