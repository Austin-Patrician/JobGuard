const buckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const timestamps = buckets.get(key) ?? [];
  const recent = timestamps.filter((t) => now - t < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  buckets.set(key, recent);
  return true;
}
