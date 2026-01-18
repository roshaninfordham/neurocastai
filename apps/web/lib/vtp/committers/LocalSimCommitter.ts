import type { Committer, CommitMetadata, CommitResult } from './Committer';

/**
 * Local simulation committer for demo
 * Stores commits in memory for audit trail
 */

interface SimCommit {
  hash: string;
  metadata: CommitMetadata;
  result: CommitResult;
}

const simStorage = new Map<string, SimCommit>();

export class LocalSimCommitter implements Committer {
  async commitHash(hash: string, metadata: CommitMetadata): Promise<CommitResult> {
    const txId = `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const result: CommitResult = {
      txId,
      committedAt: new Date().toISOString(),
      success: true,
      explorerUrl: undefined, // No explorer for sim
    };

    simStorage.set(hash, {
      hash,
      metadata,
      result,
    });

    console.log(`[LocalSimCommitter] Committed hash: ${hash} → ${txId}`);
    return result;
  }

  async verifyCommit(hash: string): Promise<boolean> {
    return simStorage.has(hash);
  }

  async getCommit(hash: string): Promise<CommitResult | null> {
    const commit = simStorage.get(hash);
    return commit ? commit.result : null;
  }

  /**
   * Get all commits (for demo audit view)
   */
  getAllCommits(): SimCommit[] {
    return Array.from(simStorage.values());
  }

  /**
   * Clear all commits (for testing)
   */
  clearAll(): void {
    simStorage.clear();
  }
}

// Singleton instance
export const localSimCommitter = new LocalSimCommitter();
