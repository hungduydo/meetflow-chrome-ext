// src/services/api.ts — typed wrapper around the MeetFlow backend REST API
import type {
  Meeting, MeetingMinutes, SmartReply,
  MagicSearchResult, Document, TranscriptSegment,
} from "../types/index.js";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Meetings ──────────────────────────────────────────────────────────────────
export const meetingsApi = {
  create: (token: string, payload: { title?: string; googleMeetUrl?: string }) =>
    request<Meeting>("/api/meetings", { method: "POST", body: JSON.stringify(payload) }, token),

  list: (token: string) =>
    request<Meeting[]>("/api/meetings", {}, token),

  get: (token: string, id: string) =>
    request<Meeting & { transcript_segments: TranscriptSegment[] }>(`/api/meetings/${id}`, {}, token),

  update: (token: string, id: string, payload: { title?: string; status?: string }) =>
    request<Meeting>(`/api/meetings/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token),

  exportUrl: (id: string, token: string) =>
    `${BASE_URL}/api/meetings/${id}/export?token=${token}`,

  generateMinutes: (token: string, id: string) =>
    request<MeetingMinutes>(`/api/meetings/${id}/minutes`, { method: "POST" }, token),
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiApi = {
  smartReply: (token: string, meetingId: string, triggerText: string) =>
    request<SmartReply>(`/api/ai/smart-reply/${meetingId}`, {
      method: "POST",
      body: JSON.stringify({ triggerText }),
    }, token),

  markReplyUsed: (token: string, replyId: string, variant: "professional" | "casual" | "concise") =>
    request<void>(`/api/ai/smart-reply/${replyId}/used`, {
      method: "PATCH",
      body: JSON.stringify({ variant }),
    }, token),

  magicSearch: (token: string, meetingId: string, query: string) =>
    request<MagicSearchResult>(`/api/ai/search/${meetingId}`, {
      method: "POST",
      body: JSON.stringify({ query }),
    }, token),
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  upload: (token: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ id: string; filename: string; status: string }>(
      "/api/documents",
      { method: "POST", body: form, headers: {} }, // let browser set multipart boundary
      token
    );
  },

  list: (token: string) =>
    request<Document[]>("/api/documents", {}, token),

  delete: (token: string, id: string) =>
    request<void>(`/api/documents/${id}`, { method: "DELETE" }, token),
};

export { ApiError };
