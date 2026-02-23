const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = "ApiError";
    }
}
async function request(path, options = {}, token) {
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };
    if (token)
        headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new ApiError(res.status, body.error ?? "Request failed");
    }
    if (res.status === 204)
        return undefined;
    return res.json();
}
// ── Meetings ──────────────────────────────────────────────────────────────────
export const meetingsApi = {
    create: (token, payload) => request("/api/meetings", { method: "POST", body: JSON.stringify(payload) }, token),
    list: (token) => request("/api/meetings", {}, token),
    get: (token, id) => request(`/api/meetings/${id}`, {}, token),
    update: (token, id, payload) => request(`/api/meetings/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token),
    exportUrl: (id, token) => `${BASE_URL}/api/meetings/${id}/export?token=${token}`,
    generateMinutes: (token, id) => request(`/api/meetings/${id}/minutes`, { method: "POST" }, token),
};
// ── AI ────────────────────────────────────────────────────────────────────────
export const aiApi = {
    smartReply: (token, meetingId, triggerText) => request(`/api/ai/smart-reply/${meetingId}`, {
        method: "POST",
        body: JSON.stringify({ triggerText }),
    }, token),
    markReplyUsed: (token, replyId, variant) => request(`/api/ai/smart-reply/${replyId}/used`, {
        method: "PATCH",
        body: JSON.stringify({ variant }),
    }, token),
    magicSearch: (token, meetingId, query) => request(`/api/ai/search/${meetingId}`, {
        method: "POST",
        body: JSON.stringify({ query }),
    }, token),
};
// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
    upload: (token, file) => {
        const form = new FormData();
        form.append("file", file);
        return request("/api/documents", { method: "POST", body: form, headers: {} }, // let browser set multipart boundary
        token);
    },
    list: (token) => request("/api/documents", {}, token),
    delete: (token, id) => request(`/api/documents/${id}`, { method: "DELETE" }, token),
};
export { ApiError };
