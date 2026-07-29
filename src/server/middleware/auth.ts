import type express from "express";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export interface AuthedRequest extends express.Request {
  uid?: string;
  email?: string | null;
}

const FIREBASE_PROJECT_ID = "kaybee-503713";

let adminInitialized = false;
function ensureAdminApp(): void {
  if (adminInitialized) return;
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId: FIREBASE_PROJECT_ID,
    });
  }
  adminInitialized = true;
}

async function verifyBearerToken(token: string): Promise<{ uid: string; email: string | null }> {
  ensureAdminApp();
  const decoded = await getAuth().verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email ?? null };
}

function extractBearerToken(req: express.Request): string | undefined {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) return undefined;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : undefined;
}

/**
 * Verifies `Authorization: Bearer <idToken>` via the Firebase Admin SDK
 * (`getAuth().verifyIdToken`), populating `req.uid` / `req.email` on success.
 *
 * Auth is ENFORCED BY DEFAULT (Phase 4): the autonomy run loop must never
 * reach an unauthenticated Gemini proxy. Set `AUTH_REQUIRED=false` to opt out
 * for local development only (e.g. exercising signed-out flows without a
 * Firebase session) — while disabled this middleware is a pass-through: it
 * never rejects a request, but still best-effort decodes a bearer token if
 * one is present (so downstream rate limiting can key off uid instead of IP).
 * A loud one-time warning is logged at boot when auth is not enforced.
 */
export function requireAuth(): express.RequestHandler {
  const authRequired = process.env.AUTH_REQUIRED !== "false";

  if (!authRequired) {
    console.warn(
      '[auth] AUTH_REQUIRED=false — /api routes (except /health) are NOT verifying Firebase ID ' +
        "tokens. Intended for local development only; do not deploy with auth disabled."
    );
  }

  return (req: AuthedRequest, res, next) => {
    const token = extractBearerToken(req);

    if (!authRequired) {
      if (!token) {
        next();
        return;
      }
      verifyBearerToken(token)
        .then(({ uid, email }) => {
          req.uid = uid;
          req.email = email;
        })
        .catch(() => {
          // Auth is not enforced yet — ignore verification failures.
        })
        .finally(() => next());
      return;
    }

    if (!token) {
      res.status(401).json({ error: "unauthorized", details: "Missing bearer token" });
      return;
    }

    verifyBearerToken(token)
      .then(({ uid, email }) => {
        req.uid = uid;
        req.email = email;
        next();
      })
      .catch((err: any) => {
        res.status(401).json({ error: "unauthorized", details: err?.message || "Invalid token" });
      });
  };
}
