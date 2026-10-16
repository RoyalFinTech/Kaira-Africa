import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';

/**
 * The generated hooks call relative paths like "/api/customers".
 * setBaseUrl prepends this so they resolve to the actual backend,
 * which may run on a different origin/port than the frontend (true
 * in local dev, and true for most real deployments — see
 * artifacts/api-server's .env.production.example WEB_BASE_URL vs
 * API_BASE_URL, which are deliberately separate).
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

// Single shared storage key. Business-user sessions ("usr_"-prefixed
// tokens) and admin sessions ("adm_"-prefixed tokens) are two
// completely separate auth surfaces on the backend (see
// requireUser/requireAdmin), but a single browser tab only ever acts
// as one or the other at a time — logging in as one naturally
// replaces the other, matching how the two portals are used in
// practice. Two browser profiles/incognito windows if you genuinely
// need both simultaneously for testing.
const TOKEN_STORAGE_KEY = 'kaira_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function isUserToken(): boolean {
  return getToken()?.startsWith('usr_') ?? false;
}

export function isAdminToken(): boolean {
  return getToken()?.startsWith('adm_') ?? false;
}

/**
 * There is no admin equivalent of GET /auth/me on the backend (only
 * user sessions can re-fetch "who am I" — see api-server's
 * requireUser vs requireAdmin). So the admin's identity is captured
 * once, from the real POST /auth/login response, and persisted here
 * so it survives a page refresh. This is real data from a real API
 * response — just client-persisted because there's nowhere to
 * re-fetch it from later.
 */
export interface StoredAdminInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

const ADMIN_INFO_KEY = 'kaira_admin_info';

export function setAdminInfo(admin: StoredAdminInfo): void {
  localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(admin));
}

export function getAdminInfo(): StoredAdminInfo | null {
  try {
    const raw = localStorage.getItem(ADMIN_INFO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAdminInfo(): void {
  localStorage.removeItem(ADMIN_INFO_KEY);
}

/** Extract a readable message from Kaira's nested API error envelope. */
function readableErrorMessage(value: unknown, depth = 0): string | undefined {
  if (depth > 5 || value == null) return undefined;
  if (typeof value === "string") {
    const message = value.trim();
    if (!message || /^\[object object\]$/i.test(message) ||
        /^<!doctype html/i.test(message) || /^<html/i.test(message)) return undefined;
    if ((message.startsWith("{") || message.startsWith("[")) && depth < 5) {
      try {
        const nested = readableErrorMessage(JSON.parse(message), depth + 1);
        if (nested) return nested;
      } catch {
        // Avoid showing serialized object payloads in the interface.
      }
      if (message.startsWith("{") || message.startsWith("[")) return undefined;
    }
    return message.slice(0, 500);
  }
  if (Array.isArray(value)) {
    const messages = value.map((item) => readableErrorMessage(item, depth + 1))
      .filter((item): item is string => Boolean(item));
    return messages.length ? messages.slice(0, 4).join(" · ").slice(0, 500) : undefined;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["message", "detail", "error_description", "title", "error", "issues", "errors", "data", "cause"]) {
      const message = readableErrorMessage(record[key], depth + 1);
      if (message && !/^error$/i.test(message)) return message;
    }
  }
  return undefined;
}

/**
 * Small typed helper for the few auth endpoints that are introduced
 * outside the generated SDK. It shares the same API origin and bearer
 * token as the generated hooks, and surfaces server messages to forms.
 */
export async function apiRequestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const apiOrigin = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const normalizedPath = path.startsWith("/api/")
    ? path
    : `/api${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiOrigin}${normalizedPath}`, {
    ...init,
    headers,
  });
  if (response.status === 204) {
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = readableErrorMessage(payload) || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export function initApiClient(): void {
  setBaseUrl(API_BASE_URL);
  setAuthTokenGetter(() => getToken());
}
