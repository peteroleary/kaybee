import type express from "express";
import type { AuthedRequest } from "./auth.js";

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const HOURLY_CAPACITY = 60;
const BURST_CAPACITY = 10; // per minute

const HOURLY_REFILL_MS_PER_TOKEN = HOUR_MS / HOURLY_CAPACITY;
const BURST_REFILL_MS_PER_TOKEN = MINUTE_MS / BURST_CAPACITY;

const STALE_ENTRY_MS = 2 * HOUR_MS;
const SWEEP_THRESHOLD = 5000;

interface Buckets {
  hourlyTokens: number;
  hourlyUpdatedAt: number;
  burstTokens: number;
  burstUpdatedAt: number;
}

/**
 * In-memory, per-process token buckets keyed by uid (or IP for unauthenticated
 * requests). This is intentionally not shared across instances — if the server
 * is ever scaled horizontally beyond a single Node process, this needs to move
 * to a shared store (Redis, Firestore, etc.) or limits become per-instance
 * rather than per-user/global.
 */
const buckets = new Map<string, Buckets>();

function refill(bucket: Buckets, now: number): void {
  const hourlyElapsed = now - bucket.hourlyUpdatedAt;
  if (hourlyElapsed > 0) {
    const refillAmount = hourlyElapsed / HOURLY_REFILL_MS_PER_TOKEN;
    bucket.hourlyTokens = Math.min(HOURLY_CAPACITY, bucket.hourlyTokens + refillAmount);
    bucket.hourlyUpdatedAt = now;
  }

  const burstElapsed = now - bucket.burstUpdatedAt;
  if (burstElapsed > 0) {
    const refillAmount = burstElapsed / BURST_REFILL_MS_PER_TOKEN;
    bucket.burstTokens = Math.min(BURST_CAPACITY, bucket.burstTokens + refillAmount);
    bucket.burstUpdatedAt = now;
  }
}

function sweepStaleEntries(now: number): void {
  if (buckets.size < SWEEP_THRESHOLD) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.hourlyUpdatedAt > STALE_ENTRY_MS) {
      buckets.delete(key);
    }
  }
}

function getKey(req: AuthedRequest): string {
  if (req.uid) return `uid:${req.uid}`;
  return `ip:${req.ip ?? "unknown"}`;
}

/**
 * Per-uid (or per-IP when unauthenticated) token bucket rate limiter for AI
 * endpoints: 60 calls/hour sustained, with a 10/minute burst cap. Returns 429
 * with `Retry-After` when either bucket is exhausted.
 */
export function rateLimit(): express.RequestHandler {
  return (req: AuthedRequest, res, next) => {
    const now = Date.now();
    const key = getKey(req);

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        hourlyTokens: HOURLY_CAPACITY,
        hourlyUpdatedAt: now,
        burstTokens: BURST_CAPACITY,
        burstUpdatedAt: now,
      };
      buckets.set(key, bucket);
    }

    refill(bucket, now);

    if (bucket.hourlyTokens < 1 || bucket.burstTokens < 1) {
      const hourlyWaitMs = (1 - bucket.hourlyTokens) * HOURLY_REFILL_MS_PER_TOKEN;
      const burstWaitMs = (1 - bucket.burstTokens) * BURST_REFILL_MS_PER_TOKEN;
      const retryAfterSeconds = Math.max(1, Math.ceil(Math.max(hourlyWaitMs, burstWaitMs) / 1000));

      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: "rate_limited",
        message: "Too many AI requests. Please slow down.",
        retryable: true,
        retryAfterSeconds,
      });
      return;
    }

    bucket.hourlyTokens -= 1;
    bucket.burstTokens -= 1;

    sweepStaleEntries(now);

    next();
  };
}
