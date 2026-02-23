import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/Header.tsx
import { useMeetFlowStore } from "../store/index.js";
import styles from "./Header.module.css";
const STATUS_LABEL = {
    idle: "Ready",
    connecting: "Connecting…",
    live: "LIVE",
    error: "Error",
};
export function Header() {
    const { streamStatus, meetingTitle, isSidebarOpen, setSidebarOpen } = useMeetFlowStore();
    return (_jsxs("header", { className: styles.header, children: [_jsxs("div", { className: styles.left, children: [_jsxs("div", { className: styles.logo, children: [_jsx("span", { className: styles.logoMark, children: "M" }), _jsx("span", { className: styles.logoText, children: "eetFlow" })] }), _jsxs("div", { className: styles.statusBadge, "data-status": streamStatus, children: [streamStatus === "live" && _jsx("span", { className: styles.liveDot }), _jsx("span", { className: styles.statusLabel, children: STATUS_LABEL[streamStatus] })] })] }), _jsxs("div", { className: styles.right, children: [streamStatus === "live" && (_jsxs("div", { className: styles.recIndicator, title: "Recording in progress", children: [_jsx("span", { className: styles.recDot }), _jsx("span", { className: styles.recLabel, children: "REC" })] })), _jsx("button", { className: styles.collapseBtn, onClick: () => setSidebarOpen(!isSidebarOpen), title: "Collapse sidebar", "aria-label": "Collapse sidebar", children: _jsx(ChevronRight, {}) })] })] }));
}
function ChevronRight() {
    return (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", children: _jsx("polyline", { points: "9 18 15 12 9 6" }) }));
}
