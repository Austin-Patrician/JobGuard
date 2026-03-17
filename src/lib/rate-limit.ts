const buckets = new Map<string, number[]>();

const MAX_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const MAX_BUCKETS = 10_000;

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

export function cleanupBuckets() {
  const now = Date.now();
  for (const [key, timestamps] of buckets) {
    const recent = timestamps.filter((t) => now - t < MAX_WINDOW_MS);
    if (recent.length === 0) {
      buckets.delete(key);
    } else {
      buckets.set(key, recent);
    }
  }

  // Safety valve: if too many unique keys, clear everything to prevent OOM
  if (buckets.size > MAX_BUCKETS) {
    buckets.clear();
  }
}

// Run cleanup every 60 seconds
const cleanupTimer = setInterval(cleanupBuckets, 60_000);
cleanupTimer.unref?.();
