import { LogItem, LogQuery } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE || window.location.origin;

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
  const res = await fetch(`${API_BASE}/api/logs?${qs}`);
  if (!res.ok) throw new Error(`Failed to fetch logs: ${res.status}`);
  return res.json();
}

export async function deleteLog(id: number) {
  const res = await fetch(`${API_BASE}/api/logs/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete log: ${res.status}`);
  }
}

export async function deleteAllLogs() {
  const res = await fetch(`${API_BASE}/api/logs`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`Failed to delete all logs: ${res.status}`);
  }
  return res.json() as Promise<{ deleted: number }>;
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
