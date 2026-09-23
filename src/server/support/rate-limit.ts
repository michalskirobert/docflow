const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
const buckets = new Map<string, number[]>();

export function consumeSupportRateLimit(key: string) {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter(
    (time) => now - time < WINDOW_MS,
  );
  if (recent.length >= MAX_REQUESTS) return false;
  recent.push(now);
  buckets.set(key, recent);
  return true;
}
