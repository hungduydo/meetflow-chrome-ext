import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/SmartReplyPanel.tsx — B2.2
import { useMeetFlowStore } from "../store/index.js";
import { aiApi } from "../services/api.js";
import styles from "./SmartReplyPanel.module.css";
import clsx from "clsx";
const VARIANTS = [
    { key: "professional", label: "Professional", icon: "💼", desc: "Formal & thorough" },
    { key: "casual", label: "Casual", icon: "💬", desc: "Friendly & natural" },
    { key: "concise", label: "Concise", icon: "⚡", desc: "One sentence" },
];
export function SmartReplyPanel() {
    const { pendingReply, triggerText, isLoadingReply, token, meetingId, dismissReply, setActiveTab, } = useMeetFlowStore();
    const noActivity = !pendingReply && !isLoadingReply;
    const handleUse = async (variant) => {
        if (!pendingReply || !token)
            return;
        const text = pendingReply[variant];
        // Copy to clipboard
        await navigator.clipboard.writeText(text);
        // Track usage in backend
        await aiApi.markReplyUsed(token, pendingReply.replyId, variant).catch(() => { });
        dismissReply();
    };
    return (_jsxs("div", { className: styles.panel, children: [isLoadingReply && (_jsxs("div", { className: styles.loading, children: [_jsx("div", { className: styles.loadingBar, children: _jsx("div", { className: styles.loadingFill }) }), _jsx("p", { className: styles.loadingText, children: "Generating replies\u2026" })] })), pendingReply && (_jsxs("div", { className: clsx(styles.replyCard, "animate-slide-up"), children: [triggerText && (_jsxs("div", { className: styles.trigger, children: [_jsx("span", { className: styles.triggerLabel, children: "Addressed:" }), _jsxs("span", { className: styles.triggerText, children: ["\"", triggerText, "\""] })] })), _jsx("div", { className: styles.variants, children: VARIANTS.map(({ key, label, icon, desc }) => (_jsxs("button", { className: styles.variantBtn, onClick: () => handleUse(key), title: "Click to copy to clipboard", children: [_jsxs("div", { className: styles.variantHeader, children: [_jsx("span", { className: styles.variantIcon, children: icon }), _jsx("span", { className: styles.variantLabel, children: label }), _jsx("span", { className: styles.variantDesc, children: desc }), _jsx("span", { className: styles.copyHint, children: "Copy \u2197" })] }), _jsx("p", { className: styles.variantText, children: pendingReply[key] })] }, key))) }), _jsx("button", { className: styles.dismissBtn, onClick: dismissReply, children: "Dismiss" })] })), noActivity && (_jsxs("div", { className: styles.idle, children: [_jsx("div", { className: styles.idleIcon, children: _jsx("svg", { width: "28", height: "28", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) }) }), _jsx("p", { children: "Smart Reply activates when someone addresses you directly." }), _jsx("p", { className: styles.idleSub, children: "MeetFlow detects questions directed at you and generates 3 reply options instantly." })] }))] }));
}
