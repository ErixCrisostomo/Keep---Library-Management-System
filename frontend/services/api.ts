/**
 * API helper wrapper
 *
 * This module centralizes HTTP calls from the frontend to the backend API.
 * - It reads the stored `keep_token` from localStorage and attaches it as
 *   an `Authorization: Bearer ...` header when present.
 * - It normalizes error handling by throwing `ApiError` with a `status`.
 * - All requests use `Content-Type: application/json` and stringify bodies.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Generic API error with HTTP status attached.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Read token from localStorage in browser contexts.
 * Returns null on server or when no token exists.
 */
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("keep_token");
}

/**
 * Low-level request helper used by the exported `api` object below.
 * - `path` is appended to the configured `API_BASE_URL`.
 * - `options` can override method/headers/body.
 * - Throws `ApiError` on network failures or non-2xx responses.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("API fetch failed:", `${API_BASE_URL}${path}`, err);
    throw new ApiError(`Network error contacting API at ${API_BASE_URL}${path}: ${msg}`, 0);
  }

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const detail =
      body && typeof body === "object" && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : `Request failed with status ${res.status}`;
    throw new ApiError(detail, res.status);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Usage examples:
// api.get('/api/books')
// api.post('/api/auth/login', { login_id, password })
