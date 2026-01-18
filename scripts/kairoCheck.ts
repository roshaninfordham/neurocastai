import fs from "fs";
import path from "path";

const API_URL = process.env.KAIRO_API_URL || "https://api.kairosecurity.com/v1/analyze";
const API_KEY = process.env.KAIRO_API_KEY;
const PROJECT_ID = process.env.KAIRO_PROJECT_ID || "demo-project";

async function main() {
  if (!API_KEY) {
    console.error("KAIRO_API_KEY not set; skipping analyze call.");
    process.exit(1);
  }

  const contractPath = path.join(__dirname, "..", "contracts", "TransferReceiptRegistry.sol");
  const source = fs.readFileSync(contractPath, "utf-8");

  const payload = {
    project_id: PROJECT_ID,
    code: {
      language: "solidity",
      files: [
        {
          path: "TransferReceiptRegistry.sol",
          content: source,
        },
      ],
    },
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error(`Kairo analyze failed: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.error(text);
    process.exit(1);
  }

  const data = await response.json();
  console.log("Kairo Decision:", data.decision);
  console.log("Risk Score:", data.risk_score ?? data.riskScore);
  console.log("Summary:", data.summary ?? data.summary_text);
  console.log("Decision Reason:", data.decision_reason || data.reason);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
