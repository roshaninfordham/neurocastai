import type { KairoScanResult, KairoDecisionType } from "@neurocast/shared";

/**
 * Kairo Security Platform Integration
 * Analyzes Solidity contracts for security vulnerabilities
 */

const KAIRO_API_KEY = process.env.KAIRO_API_KEY;
const KAIRO_PROJECT_ID = process.env.KAIRO_PROJECT_ID;
const KAIRO_BASE_URL = process.env.KAIRO_BASE_URL || "https://kairoaisec.com";

const KAIRO_TIMEOUT_MS = 30000; // 30 second timeout

/**
 * Analyzes a Solidity contract using Kairo security platform
 */
export async function analyzeContract(
  solidityCode: string,
  contractName: string = "VTPCommit"
): Promise<KairoScanResult> {
  // Check if Kairo is configured
  if (!KAIRO_API_KEY || !KAIRO_PROJECT_ID) {
    return {
      decision: "ESCALATE",
      decision_reason: "Kairo security analysis unavailable (missing configuration). Manual review recommended for production deployment.",
      risk_score: 0,
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    };
  }

  try {
    const requestBody = {
      projectId: KAIRO_PROJECT_ID,
      files: [
        {
          path: `${contractName}.sol`,
          content: solidityCode,
        },
      ],
      config: {
        analysis: "full",
        includeAnalytics: true,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), KAIRO_TIMEOUT_MS);

    const response = await fetch(`${KAIRO_BASE_URL}/api/v1/analyze`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KAIRO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // If Kairo returns an error, escalate for manual review
      console.warn(
        `Kairo API error: ${response.status} - ${response.statusText}`
      );
      return {
        decision: "ESCALATE",
        decision_reason: `Kairo analysis returned ${response.status}. Manual review recommended.`,
        risk_score: 50,
        summary: {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
      };
    }

    const analysisResult = await response.json();

    // Transform Kairo response to our format
    return transformKairoResponse(analysisResult);
  } catch (error) {
    console.error("Kairo analysis error:", error);

    // Determine error type for graceful degradation
    const isTimeout =
      error instanceof Error && error.name === "AbortError";
    const isNetworkError =
      error instanceof TypeError && error.message.includes("fetch");

    return {
      decision: "ESCALATE",
      decision_reason: isTimeout
        ? "Kairo analysis timed out. Manual review recommended."
        : isNetworkError
        ? "Kairo service unavailable. Manual review recommended."
        : "Kairo analysis failed. Manual review recommended.",
      risk_score: isNetworkError ? 0 : 50,
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    };
  }
}

/**
 * Transform Kairo API response to standardized format
 */
function transformKairoResponse(kairoResponse: Record<string, unknown>): KairoScanResult {
  // Safely extract findings
  const findings = (kairoResponse?.findings as Record<string, unknown>[]) || [];
  const riskScore = (kairoResponse?.riskScore as number) || 0;

  // Count severity levels
  const summary = {
    total: findings.length,
    critical: countBySeverity(findings, "CRITICAL"),
    high: countBySeverity(findings, "HIGH"),
    medium: countBySeverity(findings, "MEDIUM"),
    low: countBySeverity(findings, "LOW"),
  };

  // Determine decision based on severity
  let decision: KairoDecisionType = "ALLOW";
  if (summary.critical > 0) {
    decision = "BLOCK";
  } else if (summary.high > 0) {
    decision = "WARN";
  } else if (riskScore > 70) {
    decision = "WARN";
  }

  const reason =
    decision === "BLOCK"
      ? `Found ${summary.critical} critical security issue(s). Deployment blocked.`
      : decision === "WARN"
      ? `Found ${summary.high} high-severity issue(s) and ${summary.medium} medium-severity issues. Deploy with caution.`
      : `Contract analysis passed. Risk score: ${Math.round(riskScore)}/100.`;

  return {
    decision,
    decision_reason: reason,
    risk_score: Math.round(riskScore),
    summary,
    raw: kairoResponse,
  };
}

function countBySeverity(
  findings: Record<string, unknown>[],
  severity: string
): number {
  return findings.filter((f) => (f as Record<string, string>).severity === severity).length;
}

/**
 * Generates a minimal VTPCommit.sol contract for analysis
 * Used for demo purposes - contains no PHI
 */
export function generateVTPCommitContract(): string {
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * NeuroCast VTP (Verified Transfer Packet) Commitment Contract
 * 
 * Stores cryptographic commitments of VTP hashes to provide
 * tamper-evident audit trail for inter-hospital transfers.
 * 
 * NO PHI (Protected Health Information) is stored on-chain.
 * Only hashes, timestamps, and non-identifying metadata.
 */
contract VTPCommit {
    
    // VTP Commitment record
    struct VTPCommitment {
        bytes32 vtpHash;           // SHA-256 hash of VTP
        bytes32 signerPubKeyHash;  // Hash of Ed25519 signer pubkey
        uint256 timestamp;         // When committed
        bytes32 metadataHash;      // Hash of case metadata (no PHI)
        address committer;         // Address that committed
    }
    
    // Mapping from transaction ID to commitment
    mapping(string => VTPCommitment) public commitments;
    
    // Array of all commitment transaction IDs
    string[] public commitmentIds;
    
    // Kairo security gate status
    mapping(string => string) public kairoDecisions;
    
    // Events
    event VTPCommitted(
        bytes32 indexed vtpHash,
        uint256 timestamp,
        bytes32 metadataHash,
        address indexed committer
    );
    
    event KairoGateTriggered(
        string indexed txId,
        string decision,
        uint256 riskScore
    );
    
    /**
     * Commit a VTP hash to immutable log
     * 
     * @param txId Unique transaction ID
     * @param vtpHash SHA-256 hash of VTP
     * @param signerPubKeyHash Hash of Ed25519 public key
     * @param metadataHash Hash of case metadata (case_id, run_id, etc)
     */
    function commit(
        string calldata txId,
        bytes32 vtpHash,
        bytes32 signerPubKeyHash,
        bytes32 metadataHash
    ) external {
        require(vtpHash != bytes32(0), "VTP hash required");
        require(signerPubKeyHash != bytes32(0), "Signer pubkey hash required");
        
        VTPCommitment memory record = VTPCommitment({
            vtpHash: vtpHash,
            signerPubKeyHash: signerPubKeyHash,
            timestamp: block.timestamp,
            metadataHash: metadataHash,
            committer: msg.sender
        });
        
        commitments[txId] = record;
        commitmentIds.push(txId);
        
        emit VTPCommitted(vtpHash, block.timestamp, metadataHash, msg.sender);
    }
    
    /**
     * Record Kairo security gate decision
     * 
     * @param txId Transaction ID
     * @param decision ALLOW | WARN | BLOCK | ESCALATE
     * @param riskScore 0-100 risk assessment
     */
    function recordKairoDecision(
        string calldata txId,
        string calldata decision,
        uint256 riskScore
    ) external {
        require(riskScore <= 100, "Risk score must be 0-100");
        kairoDecisions[txId] = decision;
        emit KairoGateTriggered(txId, decision, riskScore);
    }
    
    /**
     * Retrieve commitment record by transaction ID
     */
    function getCommitment(string calldata txId)
        external
        view
        returns (VTPCommitment memory)
    {
        return commitments[txId];
    }
    
    /**
     * Get total number of commitments
     */
    function getCommitmentCount() external view returns (uint256) {
        return commitmentIds.length;
    }
    
    /**
     * Get commitment ID at specific index
     */
    function getCommitmentIdAt(uint256 index)
        external
        view
        returns (string memory)
    {
        return commitmentIds[index];
    }
}`;
}
