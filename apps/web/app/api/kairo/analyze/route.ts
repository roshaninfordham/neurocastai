import { NextRequest, NextResponse } from 'next/server';
import { analyzeContract, generateVTPCommitContract } from '../../../../lib/kairo/kairoAnalyzer';

/**
 * POST /api/kairo/analyze
 * Run Kairo security analysis on VTPCommit contract
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { runId, caseId } = body;

    if (!runId || !caseId) {
      return NextResponse.json(
        { success: false, error: 'runId and caseId required' },
        { status: 400 }
      );
    }

    // Run the actual analysis
    const contractSource = generateVTPCommitContract();
    const kairoResult = await analyzeContract(contractSource, 'VTPCommit');

    return NextResponse.json({
      success: true,
      runId,
      caseId,
      kairoResult,
      decision: kairoResult.decision,
      decision_reason: kairoResult.decision_reason,
      risk_score: kairoResult.risk_score,
      findings_summary: kairoResult.summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Kairo analysis error:', error);

    return NextResponse.json(
      { 
        success: false, 
        error: 'Kairo analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
