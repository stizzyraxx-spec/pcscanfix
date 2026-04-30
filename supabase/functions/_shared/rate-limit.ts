// In-memory token-bucket rate limiter for Edge Functions.
// Per-IP, per-key. Resets on cold start (acceptable — abusers just wait).

const buckets = new Map<string, { windowStart: number; count: number }>();

function getIP(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip');
  if (fwd) return fwd.split(',')[0].trim().slice(0, 64);
  return 'unknown';
}

// Returns true if allowed, false if rate-limited.
export function checkRateLimit(req: Request, key: string, limit: number, windowMs: number): boolean {
  const ip = getIP(req);
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();

  let bucket = buckets.get(bucketKey);
  if (!bucket || now - bucket.windowStart > windowMs) {
    bucket = { windowStart: now, count: 0 };
    buckets.set(bucketKey, bucket);
  }
  bucket.count++;

  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (now - b.windowStart > windowMs * 2) buckets.delete(k);
    }
  }

  return bucket.count <= limit;
}
