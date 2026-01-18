import type { Committer, CommitMetadata, CommitResult } from './Committer';

/**
 * EVM Blockchain Committer (placeholder for future implementation)
 * 
 * Will handle:
 * - RPC connection to EVM chain
 * - Wallet signing via Web3/Ethers
 * - Contract interaction (TransferReceiptRegistry.sol)
 * - Optional Kairo pre-deploy security gate
 * 
 * For now, this is a stub that throws "not implemented"
 */

export class EVMCommitter implements Committer {
  private rpcUrl?: string;
  private contractAddress?: string;
  private privateKey?: string;

  constructor(config?: {
    rpcUrl?: string;
    contractAddress?: string;
    privateKey?: string;
  }) {
    this.rpcUrl = config?.rpcUrl;
    this.contractAddress = config?.contractAddress;
    this.privateKey = config?.privateKey;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async commitHash(_hash: string, _metadata: CommitMetadata): Promise<CommitResult> {
    // TODO: Implement actual EVM commitment
    // 1. Connect to RPC
    // 2. Load contract ABI
    // 3. Sign transaction
    // 4. Call mintReceipt(runIdHash, packetHash, state)
    // 5. Wait for confirmation
    // 6. Return tx hash and explorer URL

    throw new Error('EVMCommitter not yet implemented. Use LocalSimCommitter for demo.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async verifyCommit(_hash: string): Promise<boolean> {
    throw new Error('EVMCommitter not yet implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getCommit(_hash: string): Promise<CommitResult | null> {
    throw new Error('EVMCommitter not yet implemented.');
  }
}

/**
 * Factory to create the appropriate committer based on environment
 */
export async function createCommitter(): Promise<Committer> {
  const useBlockchain = process.env.USE_BLOCKCHAIN === 'true';
  
  if (useBlockchain) {
    // For future blockchain deployment
    return new EVMCommitter({
      rpcUrl: process.env.EVM_RPC_URL,
      contractAddress: process.env.VTP_CONTRACT_ADDRESS,
      privateKey: process.env.DEPLOY_PRIVATE_KEY,
    });
  }

  // Default to local sim for demo
  const { localSimCommitter } = await import('./LocalSimCommitter');
  return localSimCommitter;
}
