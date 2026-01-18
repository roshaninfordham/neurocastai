/**
 * Pipeline Configuration Module
 * Provides runtime configuration for MCP vs Local pipeline execution
 */

export type PipelineMode = 'mcp' | 'local';
export type RunSource = 'MCP' | 'LOCAL';

/**
 * Get the configured pipeline mode
 */
export function getPipelineMode(): PipelineMode {
    const mode = process.env.NEXT_PUBLIC_PIPELINE_MODE;
    if (mode === 'local') return 'local';
    return 'mcp'; // default to MCP for demo
}

/**
 * Get the MCP base URL for API calls
 */
export function getMcpBaseUrl(): string {
    return process.env.NEXT_PUBLIC_MCP_BASE_URL || 'http://localhost:3001';
}

/**
 * Get the MCP SSE URL for event streaming
 */
export function getMcpSseUrl(): string {
    return process.env.NEXT_PUBLIC_MCP_SSE_BASE_URL || getMcpBaseUrl();
}

/**
 * Get the local API base URL
 */
export function getLocalApiBaseUrl(): string {
    return ''; // relative URLs for Next.js API routes
}

/**
 * Configuration object for the pipeline
 */
export const pipelineConfig = {
    get mode() {
        return getPipelineMode();
    },
    get mcpBaseUrl() {
        return getMcpBaseUrl();
    },
    get mcpSseUrl() {
        return getMcpSseUrl();
    },
    get isMcpMode() {
        return getPipelineMode() === 'mcp';
    },
};
