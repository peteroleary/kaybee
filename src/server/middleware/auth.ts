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
 * Gated on the `AUTH_REQUIRED` env var, which defaults to *disabled*
 * ("false"/unset). While disabled this middleware is a pass-through: it never
 * rejects a request, but still best-effort decodes a bearer token if one is
 * present (so downstream rate limiting can key off uid instead of IP). A
 * loud one-time warning is logged at boot when auth is not enforced.
 *
 * This default is deliberate — the client does not yet send ID tokens on
 * /api calls (src/lib/api/client.ts exists but is not wired into any
 * component), so enforcing auth now would break every AI feature. The phase
 * that adds the autonomy engine flips the default to true.
 */
export function requireAuth(): express.RequestHandler {
  const authRequired = process.env.AUTH_REQUIRED === "true";

  if (!authRequired) {
    console.warn(
      '[auth] AUTH_REQUIRED is not "true" — /api routes (except /health) are NOT verifying Firebase ID ' +
        "tokens. This is a deliberate temporary Phase 7 default; a later phase flips AUTH_REQUIRED=true."
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
