// src/content.ts — T1.2: Inject MeetFlow sidebar into Google Meet DOM
// Runs as a content script on https://meet.google.com/*
const SIDEBAR_ID = "meetflow-sidebar-root";
const SIDEBAR_WIDTH = "380px";
let sidebarFrame = null;
let isVisible = true;
function injectSidebar() {
    if (document.getElementById(SIDEBAR_ID))
        return;
    // Wait for Meet's main layout to be available
    const meetRoot = document.querySelector('[data-call-ended="false"]')
        ?? document.querySelector("[jscontroller]")
        ?? document.body;
    // Container — sits alongside Meet UI without breaking it
    const container = document.createElement("div");
    container.id = SIDEBAR_ID;
    Object.assign(container.style, {
        position: "fixed",
        top: "0",
        right: "0",
        width: SIDEBAR_WIDTH,
        height: "100vh",
        zIndex: "9999",
        display: "flex",
        flexDirection: "column",
        pointerEvents: "none", // allow click-through when collapsed
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    });
    // iframe — isolates React app styles from Meet's CSS
    sidebarFrame = document.createElement("iframe");
    sidebarFrame.src = chrome.runtime.getURL("sidebar.html");
    Object.assign(sidebarFrame.style, {
        width: "100%",
        height: "100%",
        border: "none",
        borderRadius: "0",
        pointerEvents: "all",
        background: "transparent",
    });
    sidebarFrame.allow = "microphone; display-capture";
    container.appendChild(sidebarFrame);
    document.body.appendChild(container);
    // Push Meet content left so sidebar doesn't overlap video tiles
    injectMeetLayoutAdjustment();
}
function injectMeetLayoutAdjustment() {
    const style = document.createElement("style");
    style.id = "meetflow-layout";
    style.textContent = `
    /* Shrink Meet's main area to make room for the sidebar */
    [data-allocation-index="0"],
    [jsmodel*="VfPpkd"],
    .crqnQb,
    .r6xAKc {
      transition: padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    body.meetflow-active [data-allocation-index="0"] {
      padding-right: ${SIDEBAR_WIDTH} !important;
    }
  `;
    document.head.appendChild(style);
    document.body.classList.add("meetflow-active");
}
function toggleSidebar() {
    const container = document.getElementById(SIDEBAR_ID);
    if (!container)
        return;
    isVisible = !isVisible;
    container.style.transform = isVisible ? "translateX(0)" : `translateX(${SIDEBAR_WIDTH})`;
    if (isVisible) {
        document.body.classList.add("meetflow-active");
    }
    else {
        document.body.classList.remove("meetflow-active");
    }
}
// ── Detect meeting start/end ──────────────────────────────────────────────────
function detectMeetingState() {
    const observer = new MutationObserver(() => {
        const meetingCode = window.location.pathname.replace("/", "");
        const isInMeeting = !!document.querySelector("[data-call-ended='false']")
            || !!document.querySelector(".crqnQb"); // fallback selector
        if (isInMeeting && !document.getElementById(SIDEBAR_ID)) {
            injectSidebar();
            chrome.runtime.sendMessage({
                type: "MEETING_STARTED",
                meetingId: meetingCode,
            });
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}
// ── Listen for messages from background/sidebar ───────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TOGGLE_SIDEBAR")
        toggleSidebar();
});
// ── Keyboard shortcut: Cmd/Ctrl+K → open Magic Search ────────────────────────
document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        sidebarFrame?.contentWindow?.postMessage({ type: "OPEN_MAGIC_SEARCH" }, "*");
    }
});
// ── Init ──────────────────────────────────────────────────────────────────────
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", detectMeetingState);
}
else {
    detectMeetingState();
}
export {};
