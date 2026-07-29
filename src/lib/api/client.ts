import { auth } from "../firebase";

export interface ApiPostOptions {
  idempotencyKey?: string;
}

/** Typed error thrown by `apiPost` for any non-2xx response. */
export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function extractErrorMessage(details: unknown, fallback: string): string {
  if (details && typeof details === "object") {
    const record = details as Record<string, unknown>;
    if (typeof record.details === "string") return record.details;
    if (typeof record.error === "string") return record.error;
    if (record.error && typeof record.error === "object") {
      const nested = record.error as Record<string, unknown>;
      if (typeof nested.message === "string") return nested.message;
    }
  }
  return fallback;
}

async function buildHeaders(idempotencyKey: string | undefined, forceRefresh: boolean): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken(forceRefresh);
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * POSTs JSON to a `/api/*` endpoint, attaching `Authorization: Bearer
 * <idToken>` when a Firebase user is signed in. On a 401 response, retries
 * once after forcing a fresh ID token (`getIdToken(true)`) — covers the case
 * where a cached token expired mid-session. Throws `ApiClientError` (with
 * the HTTP status attached) for any other non-2xx response.
 *
 * Nothing calls this yet: existing call sites (`OrchestratorModal`,
 * `CardDetailModal`, `ListColumn`, `WorkspaceProvider`) still use bare
 * `fetch('/api/...')`. The autonomy phase migrates them here when it flips
 * AUTH_REQUIRED=true.
 */
export async function apiPost<T>(path: string, body: unknown, opts?: ApiPostOptions): Promise<T> {
  const idempotencyKey = opts?.idempotencyKey;

  const doFetch = async (forceRefresh: boolean): Promise<Response> => {
    const headers = await buildHeaders(idempotencyKey, forceRefresh);
    return fetch(path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  };

  let response = await doFetch(false);

  if (response.status === 401 && auth.currentUser) {
    response = await doFetch(true);
  }

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = undefined;
    }
    throw new ApiClientError(
      response.status,
      extractErrorMessage(details, `Request to ${path} failed with status ${response.status}`),
      details
    );
  }

  return (await response.json()) as T;
}
