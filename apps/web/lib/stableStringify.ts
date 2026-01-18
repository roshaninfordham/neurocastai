export function stableStringify(obj: unknown): string {
  const seen = new WeakSet();
  const stringify = (value: unknown): unknown => {
    if (value === null || typeof value !== "object") return value;
    if (seen.has(value)) return undefined;
    seen.add(value);
    if (Array.isArray(value)) return value.map((v) => stringify(v));
    const keys = Object.keys(value).sort();
    const result: Record<string, unknown> = {};
    keys.forEach((k) => {
      result[k] = stringify((value as Record<string, unknown>)[k]);
    });
    return result;
  };
  return JSON.stringify(stringify(obj));
}
