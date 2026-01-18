import * as crypto from 'crypto';

/**
 * SHA-256 hash of canonical JSON string
 * Returns hex string with 0x prefix
 */
export function sha256Hex(canonicalString: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(canonicalString, 'utf8');
  return '0x' + hash.digest('hex');
}

/**
 * Verify that a canonical string matches a hash
 */
export function verifyHash(canonicalString: string, expectedHash: string): boolean {
  const computed = sha256Hex(canonicalString);
  return computed === expectedHash;
}
