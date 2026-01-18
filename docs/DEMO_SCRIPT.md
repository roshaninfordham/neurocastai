# Expo demo script (60–90 seconds)

This script assumes a synthetic stroke transfer case loaded into the system.

1. Load demo case
   - Navigate to the Start Case page.
   - Select the prebuilt synthetic case from `/data/demo_cases`.
2. Run the NeuroCast pipeline
   - Trigger the pipeline to ingest the packet, timeline, and vitals.
   - Show that the system produces a structured `CaseInput`.
3. Show compression stats
   - On the Command Center page, display how the Token Company compression step reduces token count.
   - Highlight that original text is still traceable for audit.
4. Show contraindication evidence
   - Move to the Evidence and Audit page.
   - Click on a risk flag to reveal the exact evidence snippets and vitals that support it.
5. Show decision flip to HOLD or ESCALATE
   - Change a key vital or timeline field to simulate a borderline case.
   - Highlight how the deterministic Wood Wide metrics and policy gate flip the workflow state from PROCEED to HOLD or ESCALATE.
6. Generate the handoff packet
   - Navigate to the Handoff Packet page.
   - Show the one-page artifact with workflow state, key facts, and evidence-backed flags.
7. Ask the voice agent why it escalated
   - On the Voice Commander page, use the LiveKit voice interface.
   - Ask, “Why did you escalate this case?”
   - The agent responds by citing the policy rules and evidence that triggered ESCALATE.

## Fallback plan if an API fails

If any external API or sponsor integration fails during the demo:

- Use stubbed responses stored in `/data/demo_cases/case_a_expected.json`.
- Display a banner that the system is running in offline demo mode.
- Continue the walkthrough using the expected outputs for:
  - Compression stats
  - Risk flags and evidence
  - Wood Wide metrics
  - Workflow state and handoff packet

This ensures the demo is reliable even if network calls or sponsor services are unavailable.

