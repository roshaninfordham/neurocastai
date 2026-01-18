/**
 * Compression Policy Engine
 * Our domain-aware algorithm on top of TokenCo
 * 
 * This provides:
 * 1. Dynamic aggressiveness selection based on input characteristics
 * 2. Safety-critical term preservation guardrails
 * 3. Quality validation with scoring
 */

// Critical terms that MUST be preserved in compression (lowercase)
const CRITICAL_TERMS = {
    meds: [
        'apixaban', 'eliquis', 'warfarin', 'heparin', 'xarelto',
        'rivaroxaban', 'dabigatran', 'anticoagulant', 'coumadin', 'pradaxa'
    ],
    timeline: [
        'last known well', 'lkw', 'unknown onset', 'wake-up', 'woke up',
        'witnessed', 'unwitnessed', 'symptom onset'
    ],
    imaging: [
        'cta', 'ct ', 'ct:', 'm1', 'lvo', 'occlusion', 'mri', 'dwi',
        'perfusion', 'penumbra', 'infarct'
    ],
    vitals: [
        'bp', 'blood pressure', 'glucose', 'inr', 'heart rate',
        'oxygen', 'spo2', 'saturation'
    ],
};

// High-risk keywords that trigger conservative compression
const HIGH_RISK_KEYWORDS = [
    'apixaban', 'eliquis', 'warfarin', 'xarelto', 'rivaroxaban',
    'dabigatran', 'anticoagulant', 'heparin', 'coumadin',
    'unknown onset', 'wake-up stroke', 'unwitnessed'
];

export interface AggressivenessContext {
    redactedText: string;
    caseHasHighRiskMeds?: boolean;
    caseHasUnknownOnset?: boolean;
}

export interface AggressivenessResult {
    aggressiveness: number;
    reason: 'length-short' | 'length-moderate' | 'length-long' | 'risk-capped';
    originalAggressiveness?: number;
    riskFactors?: string[];
}

export interface ValidationResult {
    ok: boolean;
    warnings: string[];
    score: number;
    missingTerms: string[];
    criticalTermsFound: number;
    criticalTermsPreserved: number;
}

/**
 * Choose compression aggressiveness based on input characteristics
 * This is our domain-aware policy algorithm
 */
export function chooseAggressiveness(context: AggressivenessContext): AggressivenessResult {
    const { redactedText, caseHasHighRiskMeds, caseHasUnknownOnset } = context;

    const charLen = redactedText.length;
    const textLower = redactedText.toLowerCase();

    // Determine base aggressiveness by length
    let aggressiveness: number;
    let reason: AggressivenessResult['reason'];

    if (charLen < 1200) {
        aggressiveness = 0.45;
        reason = 'length-short';
    } else if (charLen <= 4000) {
        aggressiveness = 0.6;
        reason = 'length-moderate';
    } else {
        aggressiveness = 0.75;
        reason = 'length-long';
    }

    const originalAggressiveness = aggressiveness;

    // Check for high-risk factors in the text
    const riskFactors: string[] = [];

    // Check explicit flags
    if (caseHasHighRiskMeds) {
        riskFactors.push('high-risk-meds-flag');
    }
    if (caseHasUnknownOnset) {
        riskFactors.push('unknown-onset-flag');
    }

    // Scan text for high-risk keywords
    for (const keyword of HIGH_RISK_KEYWORDS) {
        if (textLower.includes(keyword)) {
            riskFactors.push(`detected:${keyword.replace(/\s+/g, '-')}`);
        }
    }

    // Apply safety override: cap at 0.6 for high-risk cases
    if (riskFactors.length > 0 && aggressiveness > 0.6) {
        aggressiveness = 0.6;
        reason = 'risk-capped';
    }

    return {
        aggressiveness,
        reason,
        originalAggressiveness: originalAggressiveness !== aggressiveness ? originalAggressiveness : undefined,
        riskFactors: riskFactors.length > 0 ? riskFactors : undefined,
    };
}

/**
 * Validate compression quality using critical term preservation
 * Ensures safety-critical content is not destroyed
 */
export function validateCompression(
    redactedText: string,
    compressedText: string
): ValidationResult {
    const redactedLower = redactedText.toLowerCase();
    const compressedLower = compressedText.toLowerCase();

    const missingTerms: string[] = [];
    let criticalTermsFound = 0;
    let criticalTermsPreserved = 0;

    // Check each category of critical terms
    for (const [category, terms] of Object.entries(CRITICAL_TERMS)) {
        for (const term of terms) {
            if (redactedLower.includes(term)) {
                criticalTermsFound++;

                if (compressedLower.includes(term)) {
                    criticalTermsPreserved++;
                } else {
                    missingTerms.push(`${category}:${term}`);
                }
            }
        }
    }

    // Calculate quality score
    let score = 100;

    // Subtract 15 per missing critical term
    score -= missingTerms.length * 15;

    // Penalty if compressed text is too short (< 20% of original)
    const compressionRatio = compressedText.length / Math.max(1, redactedText.length);
    if (compressionRatio < 0.2) {
        score -= 5;
    }

    // Clamp score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine if compression is acceptable
    const ok = score >= 75;

    // Generate warnings
    const warnings: string[] = [];
    if (missingTerms.length > 0) {
        warnings.push(`Missing critical terms: ${missingTerms.join(', ')}`);
    }
    if (compressionRatio < 0.2) {
        warnings.push('Compression may be too aggressive (< 20% of original length)');
    }

    return {
        ok,
        warnings,
        score,
        missingTerms,
        criticalTermsFound,
        criticalTermsPreserved,
    };
}

/**
 * Get a lower aggressiveness value for retry after guardrail failure
 */
export function getLowerAggressiveness(current: number): number {
    const lower = current - 0.15;
    return Math.max(0.25, lower);
}

/**
 * Count high-risk keywords in text
 */
export function countHighRiskKeywords(text: string): number {
    const textLower = text.toLowerCase();
    let count = 0;
    for (const keyword of HIGH_RISK_KEYWORDS) {
        if (textLower.includes(keyword)) {
            count++;
        }
    }
    return count;
}
