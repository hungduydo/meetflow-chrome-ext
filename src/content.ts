// src/content.ts — Inject MeetFlow sidebar into any page with audio
import type { ExtMessage } from "./types/index.js";

const SIDEBAR_ID = "meetflow-sidebar-root";
const SIDEBAR_WIDTH = "380px";

let sidebarFrame: HTMLIFrameElement | null = null;
let isVisible = false; // hidden until the user explicitly opens it

function injectSidebar(): void {
  if (document.getElementById(SIDEBAR_ID)) return;

  const container = document.createElement("div");
  container.id = SIDEBAR_ID;
  Object.assign(container.style, {
    position:      "fixed",
    top:           "0",
    right:         "0",
    width:         SIDEBAR_WIDTH,
    height:        "100vh",
    zIndex:        "2147483647", // max z-index to stay on top
    display:       "flex",
    flexDirection: "column",
    pointerEvents: "none",
    transform:     `translateX(${SIDEBAR_WIDTH})`, // start off-screen
    transition:    "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  });

  sidebarFrame = document.createElement("iframe");
  sidebarFrame.src = chrome.runtime.getURL("sidebar.html");
  Object.assign(sidebarFrame.style, {
    width:        "100%",
    height:       "100%",
    border:       "none",
    borderRadius: "0",
    pointerEvents: "all",
    background:   "transparent",
  });
  sidebarFrame.allow = "microphone; display-capture";

  container.appendChild(sidebarFrame);
  document.body.appendChild(container);
}

function toggleSidebar(): void {
  // Lazily inject the sidebar the first time the user opens it
  if (!document.getElementById(SIDEBAR_ID)) {
    injectSidebar();
  }

  const container = document.getElementById(SIDEBAR_ID);
  if (!container) return;

  isVisible = !isVisible;
  container.style.transform = isVisible ? "translateX(0)" : `translateX(${SIDEBAR_WIDTH})`;
  container.style.pointerEvents = isVisible ? "all" : "none";
}

// ── Listen for messages from background / popup ───────────────────────────────
chrome.runtime.onMessage.addListener((msg: ExtMessage) => {
  if (msg.type === "TOGGLE_SIDEBAR") toggleSidebar();
});

// ── Keyboard shortcut: Cmd/Ctrl+K → open Magic Search ────────────────────────
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    sidebarFrame?.contentWindow?.postMessage({ type: "OPEN_MAGIC_SEARCH" }, "*");
  }
});
