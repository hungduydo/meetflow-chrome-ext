// src/background.ts — MV3 service worker
// Coordinates meeting sessions, tabCapture, and auth token storage
// ── Auth token storage ────────────────────────────────────────────────────────
async function getToken() {
    const result = await chrome.storage.local.get("meetflow_token");
    return result.meetflow_token ?? null;
}
async function setToken(token) {
    await chrome.storage.local.set({ meetflow_token: token });
}
// ── Message handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "GET_AUTH_TOKEN") {
        getToken().then(sendResponse);
        return true; // keep channel open for async response
    }
    if (msg.type === "AUTH_TOKEN") {
        setToken(msg.token).then(() => sendResponse({ ok: true }));
        return true;
    }
    if (msg.type === "MEETING_STARTED") {
        // Store current meeting ID for popup reference
        chrome.storage.session.set({ activeMeetingId: msg.meetingId });
    }
    if (msg.type === "MEETING_ENDED") {
        chrome.storage.session.remove("activeMeetingId");
    }
});
// ── Extension action click → toggle sidebar ───────────────────────────────────
chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" });
    }
});
// ── On install: open onboarding ───────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "install") {
        chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
    }
});
export {};
