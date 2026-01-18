/**
 * Canonicalization for VTP - ensures same packet produces same hash
 * 
 * Rules:
 * - Stable key ordering (alphabetical)
 * - No whitespace differences
 * - Arrays maintain order but must be deterministic (risk_flags sorted by id)
 * - Numbers serialized consistently
 */

export function canonicalJSONString(obj: unknown): string {
  return JSON.stringify(obj, sortedReplacer);
}

function sortedReplacer(_key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    // For risk_flags arrays, sort by id for determinism
    if (value.length > 0 && value[0] && typeof value[0] === 'object' && 'id' in value[0]) {
      return value.slice().sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));
    }
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    // Sort object keys alphabetically
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value).sort();
    for (const key of keys) {
      sorted[key] = (value as Record<string, unknown>)[key];
    }
    return sorted;
  }

  return value;
}
