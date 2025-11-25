import { AuthStatus, LogItem, LogQuery } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE || window.location.origin;

export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const withCredentials: RequestInit = {
  credentials: "include",
};

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    throw new HttpError("Unauthorized", 401);
  }

  if (!res.ok) {
    throw new HttpError(`Request failed: ${res.status}`, res.status);
  }

  // Some endpoints (DELETE by id) return 204 with no body.
  if (res.status === 204) return undefined;
  return res.json();
};

const buildQuery = (query: LogQuery) => {
  const params = new URLSearchParams();
  if (query.levels?.length) params.set("level", query.levels.join(","));
  if (query.labels?.length) params.set("label", query.labels.join(","));
  if (query.sources?.length) params.set("source", query.sources.join(","));
  if (query.start) params.set("start", query.start);
  if (query.end) params.set("end", query.end);
  if (query.q) params.set("q", query.q);
  params.set("limit", String(query.limit ?? 200));
  params.set("offset", String(query.offset ?? 0));
  if (query.cursor) params.set("cursor", query.cursor);
  return params.toString();
};

export async function fetchLogs(query: LogQuery): Promise<{ items: LogItem[]; nextCursor?: string }> {
  const qs = buildQuery(query);
  const res = await fetch(`${API_BASE}/api/logs?${qs}`, {
    ...withCredentials,
  });
  return handleResponse(res);
}

export async function deleteLog(id: number) {
  const res = await fetch(`${API_BASE}/api/logs/${id}`, {
    method: "DELETE",
    ...withCredentials,
  });
  if (res.status === 404) return;
  await handleResponse(res);
}

export async function deleteAllLogs() {
  const res = await fetch(`${API_BASE}/api/logs`, {
    method: "DELETE",
    ...withCredentials,
  });
  return handleResponse(res) as Promise<{ deleted: number }>;
}

export async function sendTestLog(item: Partial<LogItem>) {
  const res = await fetch(`${API_BASE}/api/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error(`Failed to send log: ${res.status}`);
  return res.json();
}

export async function login(password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
    ...withCredentials,
  });
  return handleResponse(res) as Promise<{ authenticated: boolean; expiresAt: number }>;
}

export async function logout() {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    ...withCredentials,
  });
  return handleResponse(res) as Promise<{ authenticated: boolean }>;
}

export async function refreshAuth() {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    ...withCredentials,
  });
  return handleResponse(res) as Promise<{ authenticated: boolean; expiresAt: number }>;
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch(`${API_BASE}/api/auth/status`, {
    ...withCredentials,
  });

  if (res.status === 401) {
    return { authenticated: false };
  }

  if (!res.ok) {
    throw new Error(`Failed to load auth status: ${res.status}`);
  }

  return res.json();
}
