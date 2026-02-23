import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/MinutesPanel.tsx — B3.2
import { useMeetFlowStore } from "../store/index.js";
import { meetingsApi } from "../services/api.js";
import styles from "./MinutesPanel.module.css";
import clsx from "clsx";
export function MinutesPanel() {
    const { token, meetingId, minutes, isGeneratingMinutes, setMinutes, setGeneratingMinutes } = useMeetFlowStore();
    const generate = async () => {
        if (!token || !meetingId)
            return;
        setGeneratingMinutes(true);
        try {
            const result = await meetingsApi.generateMinutes(token, meetingId);
            setMinutes(result);
        }
        catch (err) {
            setGeneratingMinutes(false);
            console.error(err);
        }
    };
    const copyAll = () => {
        if (!minutes)
            return;
        const text = [
            `## Summary\n${minutes.summary}`,
            `\n## Action Items\n${minutes.actionItems.map((a) => `- [ ] ${a.task}${a.assignee ? ` (@${a.assignee})` : ""}${a.dueDate ? ` · Due: ${a.dueDate}` : ""}`).join("\n")}`,
            `\n## Decisions\n${minutes.decisions.map((d) => `- ${d.decision}\n  Context: ${d.context}`).join("\n")}`,
            `\n## Key Topics\n${minutes.keyTopics.map((t) => `- ${t}`).join("\n")}`,
        ].join("\n");
        navigator.clipboard.writeText(text);
    };
    return (_jsxs("div", { className: styles.panel, children: [!minutes && !isGeneratingMinutes && (_jsxs("div", { className: styles.empty, children: [_jsx("div", { className: styles.emptyIcon, children: _jsx(NotesIcon, {}) }), _jsx("p", { children: "Generate AI meeting minutes from the full transcript." }), _jsx("p", { className: styles.emptySub, children: "Includes summary, action items, decisions, and key topics." }), _jsxs("button", { className: styles.generateBtn, onClick: generate, disabled: !token || !meetingId, children: [_jsx(SparklesIcon, {}), "Generate Minutes"] })] })), isGeneratingMinutes && (_jsxs("div", { className: styles.loading, children: [_jsx("div", { className: styles.loadingRing }), _jsx("p", { children: "Analysing transcript\u2026" }), _jsx("p", { className: styles.loadingSub, children: "This takes a few seconds" })] })), minutes && (_jsxs("div", { className: clsx(styles.minutes, "animate-fade-in"), children: [_jsxs("div", { className: styles.minutesHeader, children: [_jsx("span", { className: styles.minutesTitle, children: "Meeting Minutes" }), _jsxs("div", { className: styles.minutesActions, children: [_jsxs("button", { className: styles.actionBtn, onClick: copyAll, title: "Copy as Markdown", children: [_jsx(CopyIcon, {}), " Copy"] }), _jsxs("button", { className: styles.actionBtn, onClick: generate, title: "Regenerate", children: [_jsx(RefreshIcon, {}), " Regen"] })] })] }), _jsxs("section", { className: styles.section, children: [_jsx("h3", { className: styles.sectionTitle, children: "Summary" }), _jsx("p", { className: styles.sectionBody, children: minutes.summary })] }), minutes.actionItems.length > 0 && (_jsxs("section", { className: styles.section, children: [_jsxs("h3", { className: styles.sectionTitle, children: [_jsx("span", { className: styles.titleDot, style: { background: "var(--accent)" } }), "Action Items"] }), _jsx("ul", { className: styles.actionList, children: minutes.actionItems.map((item, i) => (_jsxs("li", { className: styles.actionItem, children: [_jsx("span", { className: styles.checkbox }), _jsxs("div", { className: styles.actionBody, children: [_jsx("span", { className: styles.actionTask, children: item.task }), _jsxs("div", { className: styles.actionMeta, children: [item.assignee && _jsxs("span", { className: styles.assignee, children: ["@", item.assignee] }), item.dueDate && _jsx("span", { className: styles.dueDate, children: item.dueDate })] })] })] }, i))) })] })), minutes.decisions.length > 0 && (_jsxs("section", { className: styles.section, children: [_jsxs("h3", { className: styles.sectionTitle, children: [_jsx("span", { className: styles.titleDot, style: { background: "var(--purple)" } }), "Decisions"] }), _jsx("ul", { className: styles.decisionList, children: minutes.decisions.map((d, i) => (_jsxs("li", { className: styles.decisionItem, children: [_jsx("p", { className: styles.decisionText, children: d.decision }), _jsx("p", { className: styles.decisionCtx, children: d.context })] }, i))) })] })), minutes.keyTopics.length > 0 && (_jsxs("section", { className: styles.section, children: [_jsxs("h3", { className: styles.sectionTitle, children: [_jsx("span", { className: styles.titleDot, style: { background: "var(--amber)" } }), "Key Topics"] }), _jsx("div", { className: styles.topics, children: minutes.keyTopics.map((t, i) => (_jsx("span", { className: styles.topic, children: t }, i))) })] }))] }))] }));
}
function NotesIcon() {
    return _jsxs("svg", { width: "28", height: "28", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: [_jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }), _jsx("polyline", { points: "14 2 14 8 20 8" }), _jsx("line", { x1: "16", y1: "13", x2: "8", y2: "13" }), _jsx("line", { x1: "16", y1: "17", x2: "8", y2: "17" }), _jsx("polyline", { points: "10 9 9 9 8 9" })] });
}
function SparklesIcon() {
    return _jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" }) });
}
function CopyIcon() {
    return _jsxs("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] });
}
function RefreshIcon() {
    return _jsxs("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("polyline", { points: "23 4 23 10 17 10" }), _jsx("path", { d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10" })] });
}
