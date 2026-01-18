import * as crypto from 'crypto';

/**
 * Demo keypair for VTP signing
 * In production, this would use HSM or secure key management
 * For demo, we generate a keypair in memory at server start
 */

interface DemoKeypair {
  publicKey: string;
  privateKey: string;
}

let cachedKeypair: DemoKeypair | null = null;

/**
 * Get or create a demo keypair for signing
 * Uses Ed25519 for demo purposes
 */
export function getOrCreateDemoKeypair(): DemoKeypair {
  if (cachedKeypair) {
    return cachedKeypair;
  }

  // Generate Ed25519 keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  cachedKeypair = {
    publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
  };

  return cachedKeypair;
}

/**
 * Sign a hash with the demo private key
 * @param hash - SHA-256 hash (with or without 0x prefix)
 * @returns signature as base64 string
 */
export function signHash(hash: string): string {
  const keypair = getOrCreateDemoKeypair();
  
  // Remove 0x prefix if present
  const hashClean = hash.startsWith('0x') ? hash.slice(2) : hash;
  const hashBuffer = Buffer.from(hashClean, 'hex');

  // Import private key
  const privateKey = crypto.createPrivateKey({
    key: Buffer.from(keypair.privateKey, 'base64'),
    type: 'pkcs8',
    format: 'der',
  });

  // Sign the hash
  const signature = crypto.sign(null, hashBuffer, privateKey);
  return signature.toString('base64');
}

/**
 * Verify a signature against a hash
 * @param hash - SHA-256 hash (with or without 0x prefix)
 * @param signature - base64 signature
 * @returns true if signature is valid
 */
export function verifySignature(hash: string, signature: string): boolean {
  try {
    const keypair = getOrCreateDemoKeypair();
    
    // Remove 0x prefix if present
    const hashClean = hash.startsWith('0x') ? hash.slice(2) : hash;
    const hashBuffer = Buffer.from(hashClean, 'hex');

    // Import public key
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(keypair.publicKey, 'base64'),
      type: 'spki',
      format: 'der',
    });

    // Verify signature
    const signatureBuffer = Buffer.from(signature, 'base64');
    return crypto.verify(null, hashBuffer, publicKey, signatureBuffer);
  } catch (err) {
    console.error('Signature verification failed:', err);
    return false;
  }
}
