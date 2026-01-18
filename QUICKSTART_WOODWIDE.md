# Quick Start: Testing Wood Wide Integration

## Prerequisites
1. Node.js 18+ installed
2. Wood Wide API key configured in `.env.local` (already done)
3. Training dataset generated at `data/woodwide/neurocast_train_v1.csv` (already done)

## Step 1: Install Dependencies
```bash
# In workspace root
npm install

# In apps/web
cd apps/web
npm install
cd ../..
```

## Step 2: Start Next.js Development Server
```bash
cd apps/web
npm run dev
```

The app should start at `http://localhost:3000`.

## Step 3: First Run (Model Bootstrap)
On the first pipeline run, Wood Wide will:
1. Authenticate with API key
2. Upload `neurocast_train_v1.csv` (1000 rows)
3. Train prediction model (needs_escalation)
4. Train clustering model (unsupervised segmentation)
5. Cache model IDs in `.woodwide-cache.json`

**Expected logs in SSE stream**:
```
🔧 No cache found. Bootstrapping Wood Wide models...
✅ Wood Wide auth OK: user_id=..., credits=...
📤 Uploading training dataset: neurocast_train_v1 (...)
✅ Dataset uploaded: dataset_abc123
🤖 Training prediction model: neurocast_readiness_pred_v1
⏳ Prediction model training started: model_xyz789 (TRAINING)
✅ Prediction model complete: model_xyz789
🤖 Training clustering model: neurocast_segments_cluster_v1
⏳ Clustering model training started: model_def456 (TRAINING)
✅ Clustering model complete: model_def456
🎉 Wood Wide bootstrap complete
```

**Expected cache file** (`.woodwide-cache.json`):
```json
{
  "trainDatasetId": "dataset_abc123",
  "predModelId": "model_xyz789",
  "clusterModelId": "model_def456",
  "createdAt": "2025-01-21T10:30:00.000Z"
}
```

## Step 4: Subsequent Runs (Use Cached Models)
After bootstrap, subsequent pipeline runs will:
1. Read model IDs from cache
2. Convert case to inference row (17 features)
3. Upload inference dataset (`neurocast_infer_{runId}`)
4. Run prediction inference → get escalation probability
5. Run clustering inference → get segment ID
6. Use outputs in routing decision

**Expected logs**:
```
✅ Using cached Wood Wide models: { trainDatasetId, predModelId, clusterModelId }
```

## Step 5: Verify UI Updates

### CommandCenter Page
1. Start Case A (anticoagulant case)
2. Run pipeline
3. Check decision strip for:
   - **Wood Wide Numeric Confidence** section
   - Escalation probability (e.g., "85% escalation probability (high)")
   - Cluster assignment (e.g., "Cluster: Segment 3")

### Observability Page
1. Click "View Metrics"
2. Scroll to **Wood Wide Numeric Engine** card (purple background)
3. Verify fields:
   - Provider: "Wood Wide"
   - Escalation Probability: 85%
   - Confidence: HIGH
   - Cluster Segment: Segment 3
   - Door-to-CT: 18 min

## Step 6: Test Routing Integration
Wood Wide outputs affect routing decisions:

| Scenario | Wood Wide Prediction | Cluster | Expected Routing | Reason |
|----------|---------------------|---------|------------------|---------|
| High-risk DOAC case | 85% | 3 | HOLD | Critical meds flag |
| Complex timeline | 72% | 4 | ESCALATE | Wood Wide ≥65% triggers escalation |
| Clean LVO case | 30% | 1 | PROCEED | No high-risk signals |
| Unknown onset | 60% | 2 | ESCALATE | Unknown onset flag |

## Troubleshooting

### Error: "WOODWIDE_API_KEY not set"
- Check `.env.local` exists in workspace root
- Verify `WOODWIDE_API_KEY=sk_9eiEMIVuOqNdbOVmTgQoU38lF43uMePZm4UOkEUYHAM`
- Restart Next.js dev server

### Error: "Training data not found"
- Verify `data/woodwide/neurocast_train_v1.csv` exists
- If missing, run: `node scripts/generateWoodwideData.js`

### Error: "Wood Wide API 401 Unauthorized"
- Check API key is valid and has credits
- Test auth: `curl -H "Authorization: Bearer sk_9ei..." https://beta.woodwide.ai/auth/me`

### Error: "Model training timeout"
- Training can take 30-60 seconds per model
- Increase `maxAttempts` in `pollModelUntilComplete()` if needed
- Check Wood Wide API status

### Error: "Fallback: Wood Wide unavailable"
- Pipeline will use deterministic computation if Wood Wide API fails
- Check browser console for error details
- Verify network connectivity to `https://beta.woodwide.ai`

## Validation Checklist
- [ ] `npm install` completes without errors
- [ ] Next.js dev server starts on port 3000
- [ ] First pipeline run logs Wood Wide bootstrap
- [ ] `.woodwide-cache.json` created after first run
- [ ] CommandCenter shows Wood Wide confidence section
- [ ] Observability shows Wood Wide Numeric Engine card
- [ ] Routing decision includes Wood Wide rule in triggered rules
- [ ] VTP export includes numeric metrics with prediction/clustering

## Next Steps
1. **Demo Preparation**: Practice demo flow with Case A, B, C
2. **Sponsor Branding**: Add Wood Wide logo to Observability card
3. **Feature Importance**: Display which features drove prediction
4. **Cluster Interpretation**: Map cluster IDs to human-readable segments
5. **VTP Provenance**: Include Wood Wide model IDs in VTP metadata

## Demo Script Example
```
1. "Let me show you NeuroCast's numeric decision workflow powered by Wood Wide AI."

2. Start Case A (high-risk DOAC case)
   → "We've got a patient on apixaban arriving at a spoke hospital."

3. Run pipeline, watch SSE events
   → "NeuroCast ingests the packet, redacts PHI, compresses with TokenCo..."
   → "Now Wood Wide analyzes 17 clinical features—timers, vitals, completeness, flags."

4. Wait for NUMERIC step
   → "Wood Wide's prediction model says 85% probability this needs escalation."
   → "The clustering model assigns it to Segment 3, a high-risk cohort."

5. Show decision strip
   → "The routing logic sees that high probability and triggers HOLD."
   → "It composes Wood Wide's numeric insights with our safety rules."

6. Navigate to Observability
   → "Here's Wood Wide's full output: 85% confidence HIGH, Segment 3, door-to-CT 18 minutes."
   → "This is what happened, why it matters, and what to do next—all backed by interpretable AI."

7. Export handoff packet
   → "The VTP hash locks this decision with Wood Wide provenance."
```

---

**Status**: Ready for testing. Install dependencies → run dev server → create case → verify Wood Wide bootstrap on first run.
