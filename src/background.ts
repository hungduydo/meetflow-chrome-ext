// src/background.ts — MV3 service worker
// Coordinates meeting sessions, tabCapture, and auth token storage

import type { ExtMessage } from "./types/index.js";

// ── Auth token storage ────────────────────────────────────────────────────────
async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get("meetflow_token");
  return (result.meetflow_token as string) ?? null;
}

async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ meetflow_token: token });
}

// ── Message handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(
  (msg: ExtMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void): boolean | undefined => {
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
  }
);

// ── Extension action click → toggle sidebar ───────────────────────────────────
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" } satisfies ExtMessage);
  }
});

// ── On install: open onboarding ───────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
  }
});
