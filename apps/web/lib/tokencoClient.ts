/**
 * TokenCo Client Wrapper (Server-only)
 * Handles compression API calls to TokenCo service
 * 
 * IMPORTANT: This module must only be used server-side.
 * Never expose TOKENCO_API_KEY to the browser.
 */

const TOKENCO_API_URL = 'https://api.thetokencompany.com/v1/compress';

export interface TokenCoCompressParams {
    text: string;
    aggressiveness?: number;
    maxOutputTokens?: number | null;
    minOutputTokens?: number | null;
}

export interface TokenCoCompressResult {
    output: string;
    originalTokens: number;
    outputTokens: number;
    compressionTime: number;
    tokensSaved: number;
    ratio: number;
    percent: number;
}

export class TokenCoError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public errorType?: string
    ) {
        super(message);
        this.name = 'TokenCoError';
    }
}

/**
 * Compress text using TokenCo API
 */
export async function compressText(params: TokenCoCompressParams): Promise<TokenCoCompressResult> {
    const apiKey = process.env.TOKENCO_API_KEY;
    const model = process.env.TOKENCO_MODEL || 'bear-1';

    if (!apiKey) {
        throw new TokenCoError('TokenCo API key missing', undefined, 'CONFIG_ERROR');
    }

    const { text, aggressiveness = 0.6, maxOutputTokens, minOutputTokens } = params;

    // Build compression settings
    const compressionSettings: Record<string, unknown> = {
        aggressiveness,
    };
    if (maxOutputTokens !== null && maxOutputTokens !== undefined) {
        compressionSettings.max_output_tokens = maxOutputTokens;
    }
    if (minOutputTokens !== null && minOutputTokens !== undefined) {
        compressionSettings.min_output_tokens = minOutputTokens;
    }

    const requestBody = {
        model,
        input: text,
        compression_settings: compressionSettings,
    };

    try {
        const startTime = Date.now();

        const response = await fetch(TOKENCO_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');

            if (response.status === 401) {
                throw new TokenCoError('TokenCo authentication failed - invalid API key', 401, 'AUTH_ERROR');
            }
            if (response.status === 429) {
                throw new TokenCoError('TokenCo rate limit exceeded', 429, 'RATE_LIMIT');
            }
            if (response.status >= 500) {
                throw new TokenCoError(`TokenCo server error: ${response.status}`, response.status, 'SERVER_ERROR');
            }

            throw new TokenCoError(`TokenCo API error: ${response.status} - ${errorText}`, response.status, 'API_ERROR');
        }

        const data = await response.json();
        const endTime = Date.now();

        // Extract response fields
        const output = data.output || '';
        const originalTokens = data.original_input_tokens || 0;
        const outputTokens = data.output_tokens || 0;
        const compressionTime = data.compression_time || ((endTime - startTime) / 1000);

        // Compute derived metrics
        const tokensSaved = originalTokens - outputTokens;
        const ratio = originalTokens / Math.max(1, outputTokens);
        const percent = originalTokens > 0 ? 100 * (1 - outputTokens / originalTokens) : 0;

        return {
            output,
            originalTokens,
            outputTokens,
            compressionTime,
            tokensSaved,
            ratio,
            percent,
        };
    } catch (error) {
        if (error instanceof TokenCoError) {
            throw error;
        }
        // Network or parsing error
        throw new TokenCoError(
            `TokenCo request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            undefined,
            'NETWORK_ERROR'
        );
    }
}

/**
 * Check if TokenCo is configured and available
 */
export function isTokenCoConfigured(): boolean {
    return !!process.env.TOKENCO_API_KEY;
}
