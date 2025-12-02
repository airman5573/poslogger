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
  if (query.scenarioId) params.set("scenarioId", query.scenarioId);
  params.set("limit", String(query.limit ?? 100));
  params.set("offset", String(query.offset ?? 0));
  if (query.cursor) params.set("cursor", query.cursor);
  return params.toString();
};

export async function fetchLogs(query: LogQuery): Promise<{ items: LogItem[]; nextCursor?: string; hasMore?: boolean }> {
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

// Drive API
export type FileInfo = {
  name: string;
  size: number;
  modifiedAt: string;
};

export async function fetchFiles(): Promise<{ files: FileInfo[] }> {
  const res = await fetch(`${API_BASE}/api/drive`, {
    ...withCredentials,
  });
  return handleResponse(res);
}

export async function uploadFile(file: File): Promise<{ success: boolean; file: FileInfo }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/drive`, {
    method: "POST",
    body: formData,
    ...withCredentials,
  });
  return handleResponse(res);
}

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export function uploadFileWithProgress(
  file: File,
  onProgress: (progress: UploadProgress) => void
): Promise<{ success: boolean; file: FileInfo }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
        });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error("Invalid response"));
        }
      } else if (xhr.status === 401) {
        reject(new HttpError("Unauthorized", 401));
      } else {
        reject(new HttpError(`Upload failed: ${xhr.status}`, xhr.status));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload cancelled"));
    });

    xhr.open("POST", `${API_BASE}/api/drive`);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

export async function deleteFile(filename: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/api/drive/${encodeURIComponent(filename)}`, {
    method: "DELETE",
    ...withCredentials,
  });
  return handleResponse(res);
}

export function getDownloadUrl(filename: string): string {
  return `${API_BASE}/api/drive/${encodeURIComponent(filename)}`;
}
