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
import type { ExtMessage } from "../types/index.js";

let streamService: AudioStreamService | null = null;

const TABS = [
  { id: "transcript", label: "Transcript", shortLabel: "TX" },
  { id: "replies", label: "Replies", shortLabel: "AI" },
  { id: "search", label: "Search", shortLabel: "⌘K" },
  { id: "docs", label: "Docs", shortLabel: "📎" },
  { id: "minutes", label: "Minutes", shortLabel: "📝" },
] as const;

export function Sidebar() {
  const {
    activeTab, setActiveTab,
    streamStatus, setStreamStatus,
    token, setToken,
    meetingId, setMeetingId,
    addSegment,
    setLoadingReply, setPendingReply,
    isMagicSearchOpen, setMagicSearchOpen,
  } = useMeetFlowStore();

  // Load auth token from chrome.storage on mount
  useEffect(() => {
    chrome.runtime.sendMessage<ExtMessage>({ type: "GET_AUTH_TOKEN" }, (tok: string | null) => {
      if (tok) setToken(tok);
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
    if (!token) return;
    setStreamStatus("connecting");

    try {
      // Create meeting in backend
      // FIX: sidebar runs in an iframe — window.location is the extension's
      // sidebar.html URL, not the Meet tab URL. Read from the parent via
      // postMessage or fall back to a sensible default.
      const meetUrl = (window.parent !== window)
        ? document.referrer || "https://meet.google.com"
        : window.location.href;
      const meeting = await meetingsApi.create(token, {
        title: "Google Meet",
        googleMeetUrl: meetUrl,
      });
      setMeetingId(meeting.id);

      // Open audio stream + STT
      streamService = new AudioStreamService(meeting.id, token, (event) => {
        if (event.type === "connected") {
          setStreamStatus("live");
        } else if (event.type === "disconnected") {
          setStreamStatus("idle");
        } else if (event.type === "error") {
          setStreamStatus("error");
        } else if (event.type === "transcript") {
          addSegment(event.data);
          // FIX: auto-switch to transcript tab so user can see segments appear
          // (only on first final segment to avoid fighting user's tab choice)
          if (event.data.isFinal) {
            const { activeTab } = useMeetFlowStore.getState();
            if (activeTab !== "transcript") setActiveTab("transcript");
          }

          // Detect questions directed at user — trigger Smart Reply (B2.2)
          if (event.data.isFinal) {
            const text = event.data.text.toLowerCase();
            const isQuestion = text.includes("?") && (
              text.includes("you think") ||
              text.includes("your view") ||
              text.includes("do you") ||
              text.includes("what about you") ||
              text.includes("can you")
            );
            if (isQuestion) triggerSmartReply(meeting.id, event.data.text);
          }
        }
      });

      await streamService.startCapture();
    } catch (err) {
      setStreamStatus("error");
      console.error("[MeetFlow] Start failed:", err);
    }
  };

  const triggerSmartReply = async (mId: string, triggerText: string) => {
    if (!token) return;
    setLoadingReply(true);
    setActiveTab("replies");
    try {
      const reply = await aiApi.smartReply(token, mId, triggerText);
      setPendingReply(reply, triggerText);
    } catch {
      setLoadingReply(false);
    }
  };

  // ── Stop meeting ──────────────────────────────────────────────────────────
  const stopMeeting = async () => {
    // FIX: capture ref + null it BEFORE awaiting stop().
    // Awaiting first means the WS onclose fires during the await window,
    // calls onEvent("disconnected"), and the reconnect loop restarts — 
    // which is exactly the "stop → 2s → back to live" bug.
    const svc = streamService;
    streamService = null;
    setStreamStatus("idle");
    setMeetingId(null);
    await svc?.stop(); // stop() now sees stopped=true so onclose is a no-op
  };

  const isLive = streamStatus === "live";
  const isConnecting = streamStatus === "connecting";
  // "error" state should show Start button so user can retry
  const showStart = !isLive && !isConnecting;

  return (
    <div className={styles.sidebar}>
      <Header />

      {/* Tab bar */}
      <div className={styles.tabs} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={clsx(styles.tab, activeTab === tab.id && styles.tabActive)}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "search") setMagicSearchOpen(true);
            }}
          >
            <span className={styles.tabLabel}>{tab.label}</span>
            <span className={styles.tabShort}>{tab.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Panel area */}
      <div className={styles.panelArea}>
        {activeTab === "transcript" && <TranscriptPanel />}
        {activeTab === "replies" && <SmartReplyPanel />}
        {activeTab === "docs" && <DocumentsPanel />}
        {activeTab === "minutes" && <MinutesPanel />}
      </div>

      {/* Footer: Start / Stop controls */}
      <div className={styles.footer}>
        {showStart && (
          <button
            className={styles.startBtn}
            onClick={startMeeting}
            disabled={!token}
          >
            <span className={styles.startDot} />
            Start Recording
          </button>
        )}
        {isConnecting && (
          <button className={styles.startBtn} disabled>
            <span className={styles.connectSpinner} />
            Connecting…
          </button>
        )}
        {isLive && (
          <button className={styles.stopBtn} onClick={stopMeeting}>
            <span className={styles.stopSquare} />
            Stop Recording
          </button>
        )}
        <button
          className={styles.searchFab}
          onClick={() => setMagicSearchOpen(true)}
          title="Magic Search (⌘K)"
          disabled={!meetingId}
        >
          <SearchIcon />
          <kbd>⌘K</kbd>
        </button>
      </div>

      {/* Magic Search overlay */}
      <MagicSearch />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
