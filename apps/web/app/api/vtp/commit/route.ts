import { NextRequest, NextResponse } from 'next/server';
import { LocalSimCommitter } from '../../../../lib/vtp/committers/LocalSimCommitter';
import { analyzeContract, generateVTPCommitContract } from '../../../../lib/kairo/kairoAnalyzer';

/**
 * POST /api/vtp/commit
 * Run Kairo security gate, then commit VTP hash
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hash, metadata, bypassKairoCheck } = body;

    if (!hash) {
      return NextResponse.json(
        { success: false, error: 'Hash required' },
        { status: 400 }
      );
    }

    // Step 1: Run Kairo security analysis on contract
    let kairoResult = null;
    
    if (!bypassKairoCheck) {
      const contractSource = generateVTPCommitContract();
      kairoResult = await analyzeContract(contractSource, 'VTPCommit');
      
      // Check Kairo decision
      if (kairoResult.decision === 'BLOCK') {
        return NextResponse.json({
          success: false,
          kairoBlocked: true,
          kairoDecision: kairoResult.decision,
          kairoReason: kairoResult.decision_reason,
          kairoRiskScore: kairoResult.risk_score,
          message: 'VTP commit blocked by Kairo security gate',
          findings: kairoResult.summary,
        }, { status: 403 });
      }
    }

    // Step 2: Commit to local sim storage (ALLOW or WARN status)
    const committer = new LocalSimCommitter();
    const result = await committer.commitHash(hash, {
      ...metadata,
      kairoDecision: kairoResult?.decision || 'ESCALATE',
      kairoRiskScore: kairoResult?.risk_score || 0,
    });

    return NextResponse.json({
      success: true,
      committed: true,
      result,
      kairoDecision: kairoResult?.decision || 'ESCALATE',
      kairoRiskScore: kairoResult?.risk_score || 0,
      kairoFindingsSummary: kairoResult?.summary || null,
      message: kairoResult?.decision === 'WARN' 
        ? `VTP committed with warning: ${kairoResult.decision_reason}`
        : 'VTP hash committed to local simulation storage. Blockchain deployment coming soon (Kairo-gated).',
    });
  } catch (error) {
    console.error('VTP commit error:', error);
    return NextResponse.json(
      { success: false, error: 'Commit failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/vtp/commit?hash=0x...
 * Check if hash is committed
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hash = searchParams.get('hash');

    if (!hash) {
      return NextResponse.json(
        { success: false, error: 'Hash parameter required' },
        { status: 400 }
      );
    }

    const committer = new LocalSimCommitter();
    const commit = await committer.getCommit(hash);

    return NextResponse.json({
      success: true,
      committed: commit !== null,
      commit,
    });
  } catch (error) {
    console.error('VTP commit check error:', error);
    return NextResponse.json(
      { success: false, error: 'Check failed' },
      { status: 500 }
    );
  }
}
