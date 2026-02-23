// src/components/TranscriptPanel.tsx — T1.4
import { useEffect, useRef } from "react";
import { useMeetFlowStore } from "../store/index.js";
import { meetingsApi } from "../services/api.js";
import styles from "./TranscriptPanel.module.css";
import clsx from "clsx";

const SPEAKER_COLORS = [
  "#00E5A0", "#8B5CF6", "#F59E0B", "#38BDF8", "#F43F5E",
  "#A78BFA", "#34D399", "#FB923C",
];

function getSpeakerColor(speakerId: string | null): string {
  if (!speakerId) return SPEAKER_COLORS[0];
  const n = parseInt(speakerId.replace(/\D/g, ""), 10) || 0;
  return SPEAKER_COLORS[n % SPEAKER_COLORS.length];
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function TranscriptPanel() {
  const { segments, interimText, streamStatus, token, meetingId } = useMeetFlowStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new segments
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [segments.length, interimText]);

  const handleExport = () => {
    if (!token || !meetingId) return;
    const url = meetingsApi.exportUrl(meetingId, token);
    window.open(url, "_blank");
  };

  const isEmpty = segments.length === 0 && !interimText;

  return (
    <div className={styles.panel}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.count}>
          {segments.length > 0 && `${segments.length} segments`}
        </span>
        <button
          className={styles.exportBtn}
          onClick={handleExport}
          disabled={!token || !meetingId || segments.length === 0}
          title="Download transcript as .txt — B1.3"
        >
          <DownloadIcon />
          Export .txt
        </button>
      </div>

      {/* Transcript body */}
      <div className={styles.body}>
        {isEmpty && streamStatus !== "live" && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⌨</div>
            <p>Transcript will appear here once the meeting starts.</p>
          </div>
        )}

        {isEmpty && streamStatus === "live" && (
          <div className={styles.waiting}>
            <span className={styles.waitDot} />
            <span className={styles.waitDot} style={{ animationDelay: "0.2s" }} />
            <span className={styles.waitDot} style={{ animationDelay: "0.4s" }} />
          </div>
        )}

        {segments.map((seg, i) => {
          const showSpeaker =
            i === 0 || segments[i - 1].speakerId !== seg.speakerId;
          const color = getSpeakerColor(seg.speakerId);

          return (
            <div
              key={seg.id}
              className={clsx(styles.segment, "animate-slide-up")}
              style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
            >
              {showSpeaker && (
                <div className={styles.speakerRow}>
                  <span
                    className={styles.speakerDot}
                    style={{ background: color }}
                  />
                  <span className={styles.speakerName} style={{ color }}>
                    {seg.speakerLabel ?? `Speaker ${seg.speakerId ?? "?"}`}
                  </span>
                  <span className={styles.timestamp}>{formatTime(seg.startMs)}</span>
                </div>
              )}
              <p className={styles.segText}>{seg.text}</p>
            </div>
          );
        })}

        {/* Interim (non-final) text — shown in muted style */}
        {interimText && (
          <div className={clsx(styles.segment, styles.interim)}>
            <p className={styles.segText}>{interimText}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
