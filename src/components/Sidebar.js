import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/Sidebar.tsx — Main sidebar shell: tabs + start/stop controls
import { useEffect } from "react";
import { useMeetFlowStore } from "../store/index.js";
import { meetingsApi, aiApi } from "../services/api.js";
import { AudioStreamService } from "../services/stream.js";
import { Header } from "./Header.js";
import { TranscriptPanel } from "./TranscriptPanel.js";
import { SmartReplyPanel } from "./SmartReplyPanel.js";
import { MagicSearch } from "./MagicSearch.js";
import { DocumentsPanel } from "./DocumentsPanel.js";
import { MinutesPanel } from "./MinutesPanel.js";
import styles from "./Sidebar.module.css";
import clsx from "clsx";
let streamService = null;
const TABS = [
    { id: "transcript", label: "Transcript", shortLabel: "TX" },
    { id: "replies", label: "Replies", shortLabel: "AI" },
    { id: "search", label: "Search", shortLabel: "⌘K" },
    { id: "docs", label: "Docs", shortLabel: "📎" },
    { id: "minutes", label: "Minutes", shortLabel: "📝" },
];
export function Sidebar() {
    const { activeTab, setActiveTab, streamStatus, setStreamStatus, token, setToken, meetingId, setMeetingId, addSegment, setLoadingReply, setPendingReply, isMagicSearchOpen, setMagicSearchOpen, } = useMeetFlowStore();
    // Load auth token from chrome.storage on mount
    useEffect(() => {
        chrome.runtime.sendMessage({ type: "GET_AUTH_TOKEN" }, (tok) => {
            if (tok)
                setToken(tok);
        });
        // Listen for Cmd+K from content script
        window.addEventListener("message", (e) => {
            if (e.data?.type === "OPEN_MAGIC_SEARCH") {
                setMagicSearchOpen(true);
                setActiveTab("search");
            }
        });
    }, []);
    // ── Start meeting session ─────────────────────────────────────────────────
    const startMeeting = async () => {
        if (!token)
            return;
        setStreamStatus("connecting");
        try {
            // Create meeting in backend
            const meetUrl = window.location.href;
            const meeting = await meetingsApi.create(token, {
                title: document.title.replace("- Google Meet", "").trim() || "Google Meet",
                googleMeetUrl: meetUrl,
            });
            setMeetingId(meeting.id);
            // Open audio stream + STT
            streamService = new AudioStreamService(meeting.id, token, (event) => {
                if (event.type === "connected") {
                    setStreamStatus("live");
                }
                else if (event.type === "disconnected") {
                    setStreamStatus("idle");
                }
                else if (event.type === "error") {
                    setStreamStatus("error");
                }
                else if (event.type === "transcript") {
                    addSegment(event.data);
                    // Detect questions directed at user — trigger Smart Reply (B2.2)
                    if (event.data.isFinal) {
                        const text = event.data.text.toLowerCase();
                        const isQuestion = text.includes("?") && (text.includes("you think") ||
                            text.includes("your view") ||
                            text.includes("do you") ||
                            text.includes("what about you") ||
                            text.includes("can you"));
                        if (isQuestion)
                            triggerSmartReply(meeting.id, event.data.text);
                    }
                }
            });
            await streamService.startCapture();
        }
        catch (err) {
            setStreamStatus("error");
            console.error("[MeetFlow] Start failed:", err);
        }
    };
    const triggerSmartReply = async (mId, triggerText) => {
        if (!token)
            return;
        setLoadingReply(true);
        setActiveTab("replies");
        try {
            const reply = await aiApi.smartReply(token, mId, triggerText);
            setPendingReply(reply, triggerText);
        }
        catch {
            setLoadingReply(false);
        }
    };
    // ── Stop meeting ──────────────────────────────────────────────────────────
    const stopMeeting = async () => {
        await streamService?.stop();
        streamService = null;
        setStreamStatus("idle");
        setMeetingId(null);
    };
    const isLive = streamStatus === "live";
    const isConnecting = streamStatus === "connecting";
    return (_jsxs("div", { className: styles.sidebar, children: [_jsx(Header, {}), _jsx("div", { className: styles.tabs, role: "tablist", children: TABS.map((tab) => (_jsxs("button", { role: "tab", "aria-selected": activeTab === tab.id, className: clsx(styles.tab, activeTab === tab.id && styles.tabActive), onClick: () => {
                        setActiveTab(tab.id);
                        if (tab.id === "search")
                            setMagicSearchOpen(true);
                    }, children: [_jsx("span", { className: styles.tabLabel, children: tab.label }), _jsx("span", { className: styles.tabShort, children: tab.shortLabel })] }, tab.id))) }), _jsxs("div", { className: styles.panelArea, children: [activeTab === "transcript" && _jsx(TranscriptPanel, {}), activeTab === "replies" && _jsx(SmartReplyPanel, {}), activeTab === "docs" && _jsx(DocumentsPanel, {}), activeTab === "minutes" && _jsx(MinutesPanel, {})] }), _jsxs("div", { className: styles.footer, children: [!isLive && !isConnecting && (_jsxs("button", { className: styles.startBtn, onClick: startMeeting, disabled: !token, children: [_jsx("span", { className: styles.startDot }), "Start Recording"] })), isConnecting && (_jsxs("button", { className: styles.startBtn, disabled: true, children: [_jsx("span", { className: styles.connectSpinner }), "Connecting\u2026"] })), isLive && (_jsxs("button", { className: styles.stopBtn, onClick: stopMeeting, children: [_jsx("span", { className: styles.stopSquare }), "Stop Recording"] })), _jsxs("button", { className: styles.searchFab, onClick: () => setMagicSearchOpen(true), title: "Magic Search (\u2318K)", disabled: !meetingId, children: [_jsx(SearchIcon, {}), _jsx("kbd", { children: "\u2318K" })] })] }), _jsx(MagicSearch, {})] }));
}
function SearchIcon() {
    return (_jsxs("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }));
}
