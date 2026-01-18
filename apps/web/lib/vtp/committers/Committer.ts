/**
 * Committer interface for VTP hash storage
 * Abstraction allows for different backends (local sim, blockchain, etc.)
 */

export interface CommitMetadata {
  vtpId: string;
  caseId: string;
  runId: string;
  workflowState: string;
  timestamp: string;
}

export interface CommitResult {
  txId: string;
  explorerUrl?: string;
  committedAt: string;
  success: boolean;
  error?: string;
}

export interface Committer {
  /**
   * Commit a VTP hash to the storage backend
   * @param hash - SHA-256 hash with 0x prefix
   * @param metadata - Additional VTP metadata
   * @returns Commit result with transaction ID
   */
  commitHash(hash: string, metadata: CommitMetadata): Promise<CommitResult>;

  /**
   * Verify a hash exists in storage
   * @param hash - SHA-256 hash with 0x prefix
   * @returns true if hash is committed
   */
  verifyCommit(hash: string): Promise<boolean>;

  /**
   * Get commit details for a hash
   * @param hash - SHA-256 hash with 0x prefix
   * @returns Commit result if found, null otherwise
   */
  getCommit(hash: string): Promise<CommitResult | null>;
}
