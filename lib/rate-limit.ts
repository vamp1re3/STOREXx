import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function getRequestKey(req: NextRequest, scope: string) {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const key = forwardedFor || req.headers.get('x-real-ip') || 'unknown';
  return `${scope}:${key}`;
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const nextEntry = { count: 1, resetAt: now + windowMs };
    store.set(key, nextEntry);
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      resetInMs: windowMs,
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(current.resetAt - now, 0),
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(limit - current.count, 0),
    resetInMs: Math.max(current.resetAt - now, 0),
  };
}
