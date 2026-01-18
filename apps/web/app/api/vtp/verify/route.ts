import { NextRequest, NextResponse } from 'next/server';
import { canonicalJSONString } from '../../../../lib/vtp/canonicalize';
import { sha256Hex } from '../../../../lib/vtp/hash';
import { verifySignature } from '../../../../lib/vtp/sign';

/**
 * POST /api/vtp/verify
 * Verify a VTP packet's integrity
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vtp } = body;

    if (!vtp || !vtp.integrity) {
      return NextResponse.json(
        { success: false, error: 'VTP data required' },
        { status: 400 }
      );
    }

    // Extract integrity before canonicalization
    const { integrity, ...vtpWithoutIntegrity } = vtp;
    const storedHash = integrity.hash_sha256;
    const storedSignature = integrity.signature;

    // Recompute hash
    const canonical = canonicalJSONString(vtpWithoutIntegrity);
    const computedHash = sha256Hex(canonical);

    // Verify hash matches
    const hashValid = computedHash === storedHash;

    // Verify signature if present
    let signatureValid = false;
    if (storedSignature) {
      signatureValid = verifySignature(storedHash, storedSignature);
    }

    const verified = hashValid && (storedSignature ? signatureValid : true);

    return NextResponse.json({
      success: true,
      verified,
      hash: {
        stored: storedHash,
        computed: computedHash,
        valid: hashValid,
      },
      signature: storedSignature
        ? {
            present: true,
            valid: signatureValid,
          }
        : {
            present: false,
          },
    });
  } catch (error) {
    console.error('VTP verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
