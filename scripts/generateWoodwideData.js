/**
 * Generate synthetic training data for Wood Wide AI numeric decision workflow.
 * Synthetic data only. No PHI. For demo/training purposes.
 * 
 * Generates realistic stroke transfer case features with a deterministic label
 * for needs_escalation based on clinical coordination risk factors.
 */

const fs = require('fs');
const path = require('path');

const SEED = 42;
let rng = SEED;
function random() {
  rng = (rng * 1103515245 + 12345) & 0x7fffffff;
  return rng / 0x7fffffff;
}

function randomInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(random() * arr.length)];
}

function generateRow(index) {
  // Timing features (minutes)
  const lkw_known = random() > 0.15 ? 1 : 0;
  const time_since_lkw_min = lkw_known ? randomInt(15, 180) : null;
  const door_to_ct_min = randomInt(5, 60);
  const ct_to_decision_min = randomInt(5, 30);
  const estimated_transport_to_center_min = randomInt(20, 90);

  // Completeness features
  const has_meds_list = random() > 0.2 ? 1 : 0;
  const has_imaging_report = random() > 0.15 ? 1 : 0;
  const missing_items_count = (has_meds_list ? 0 : 1) + (has_imaging_report ? 0 : 1) + (lkw_known ? 0 : 1);
  const completeness_score_pct = Math.max(0, Math.min(100, 100 - missing_items_count * 15 - randomInt(-10, 10)));

  // Vitals summary (derived from simulated time-series)
  const sbp_baseline = randomInt(120, 180);
  const sbp_max = sbp_baseline + randomInt(0, 40);
  const sbp_min = sbp_baseline - randomInt(0, 20);
  const hr_max = randomInt(60, 130);
  const spo2_min = randomInt(88, 100);
  const vitals_variance_score = Math.min(100, Math.abs(sbp_max - sbp_min) + Math.abs(hr_max - 70) / 2);

  // Risk flags
  const doac_present = random() > 0.7 ? 1 : 0;
  const wake_up_pattern = lkw_known === 0 && random() > 0.5 ? 1 : 0;

  // Label: needs_escalation (deterministic decision logic)
  const needs_escalation =
    doac_present === 1 ||
    lkw_known === 0 ||
    completeness_score_pct < 70 ||
    door_to_ct_min > 30 ||
    spo2_min < 92 ||
    sbp_max > 200
      ? 1
      : 0;

  return {
    case_id: `SYNTH-${String(index).padStart(4, '0')}`,
    time_since_lkw_min: time_since_lkw_min !== null ? time_since_lkw_min : '',
    door_to_ct_min,
    ct_to_decision_min,
    estimated_transport_to_center_min,
    completeness_score_pct,
    missing_items_count,
    has_meds_list,
    has_imaging_report,
    lkw_known,
    sbp_max,
    sbp_min,
    hr_max,
    spo2_min,
    vitals_variance_score,
    doac_present,
    wake_up_pattern,
    needs_escalation,
  };
}

function main() {
  const numRows = 1000;
  const rows = [];
  
  for (let i = 1; i <= numRows; i++) {
    rows.push(generateRow(i));
  }

  // Convert to CSV
  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(',')];
  
  rows.forEach((row) => {
    const values = headers.map((h) => {
      const val = row[h];
      return val === null || val === '' ? '' : val;
    });
    csvLines.push(values.join(','));
  });

  const csvContent = csvLines.join('\n');
  const outputPath = path.join(__dirname, '..', 'data', 'woodwide', 'neurocast_train_v1.csv');
  
  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  console.log(`✅ Generated ${numRows} rows → ${outputPath}`);
  
  // Stats
  const escalationCount = rows.filter((r) => r.needs_escalation === 1).length;
  console.log(`   Needs escalation: ${escalationCount} (${((escalationCount / numRows) * 100).toFixed(1)}%)`);
}

main();
