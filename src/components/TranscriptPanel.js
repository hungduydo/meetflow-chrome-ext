import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
function getSpeakerColor(speakerId) {
    if (!speakerId)
        return SPEAKER_COLORS[0];
    const n = parseInt(speakerId.replace(/\D/g, ""), 10) || 0;
    return SPEAKER_COLORS[n % SPEAKER_COLORS.length];
}
function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
export function TranscriptPanel() {
    const { segments, interimText, streamStatus, token, meetingId } = useMeetFlowStore();
    const bottomRef = useRef(null);
    // Auto-scroll to bottom on new segments
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [segments.length, interimText]);
    const handleExport = () => {
        if (!token || !meetingId)
            return;
        const url = meetingsApi.exportUrl(meetingId, token);
        window.open(url, "_blank");
    };
    const isEmpty = segments.length === 0 && !interimText;
    return (_jsxs("div", { className: styles.panel, children: [_jsxs("div", { className: styles.toolbar, children: [_jsx("span", { className: styles.count, children: segments.length > 0 && `${segments.length} segments` }), _jsxs("button", { className: styles.exportBtn, onClick: handleExport, disabled: !token || !meetingId || segments.length === 0, title: "Download transcript as .txt \u2014 B1.3", children: [_jsx(DownloadIcon, {}), "Export .txt"] })] }), _jsxs("div", { className: styles.body, children: [isEmpty && streamStatus !== "live" && (_jsxs("div", { className: styles.empty, children: [_jsx("div", { className: styles.emptyIcon, children: "\u2328" }), _jsx("p", { children: "Transcript will appear here once the meeting starts." })] })), isEmpty && streamStatus === "live" && (_jsxs("div", { className: styles.waiting, children: [_jsx("span", { className: styles.waitDot }), _jsx("span", { className: styles.waitDot, style: { animationDelay: "0.2s" } }), _jsx("span", { className: styles.waitDot, style: { animationDelay: "0.4s" } })] })), segments.map((seg, i) => {
                        const showSpeaker = i === 0 || segments[i - 1].speakerId !== seg.speakerId;
                        const color = getSpeakerColor(seg.speakerId);
                        return (_jsxs("div", { className: clsx(styles.segment, "animate-slide-up"), style: { animationDelay: `${Math.min(i * 20, 200)}ms` }, children: [showSpeaker && (_jsxs("div", { className: styles.speakerRow, children: [_jsx("span", { className: styles.speakerDot, style: { background: color } }), _jsx("span", { className: styles.speakerName, style: { color }, children: seg.speakerLabel ?? `Speaker ${seg.speakerId ?? "?"}` }), _jsx("span", { className: styles.timestamp, children: formatTime(seg.startMs) })] })), _jsx("p", { className: styles.segText, children: seg.text })] }, seg.id));
                    }), interimText && (_jsx("div", { className: clsx(styles.segment, styles.interim), children: _jsx("p", { className: styles.segText, children: interimText }) })), _jsx("div", { ref: bottomRef })] })] }));
}
function DownloadIcon() {
    return (_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] }));
}
