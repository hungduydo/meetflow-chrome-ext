import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/popup.tsx — Extension action popup
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
function Popup() {
    const [token, setTokenState] = useState(null);
    const [activeMeeting, setActiveMeeting] = useState(null);
    const [tokenInput, setTokenInput] = useState("");
    const [saved, setSaved] = useState(false);
    useEffect(() => {
        chrome.storage.local.get("meetflow_token", (res) => {
            setTokenState(res.meetflow_token ?? null);
        });
        chrome.storage.session.get("activeMeetingId", (res) => {
            setActiveMeeting(res.activeMeetingId ?? null);
        });
    }, []);
    const saveToken = () => {
        if (!tokenInput.trim())
            return;
        chrome.storage.local.set({ meetflow_token: tokenInput.trim() }, () => {
            setTokenState(tokenInput.trim());
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        });
    };
    const clearToken = () => {
        chrome.storage.local.remove("meetflow_token");
        setTokenState(null);
        setTokenInput("");
    };
    const openMeet = () => {
        chrome.tabs.create({ url: "https://meet.google.com" });
    };
    return (_jsxs("div", { style: popupStyles.container, children: [_jsxs("div", { style: popupStyles.header, children: [_jsxs("span", { style: popupStyles.logo, children: ["MeetFlow ", _jsx("span", { style: { color: "var(--accent)" }, children: "AI" })] }), _jsx("span", { style: popupStyles.version, children: "v1.0" })] }), _jsxs("div", { style: popupStyles.status, children: [_jsx("div", { style: { ...popupStyles.statusDot, background: token ? "var(--accent)" : "var(--text-muted)" } }), _jsx("span", { style: popupStyles.statusText, children: activeMeeting ? `Live · ${activeMeeting.slice(0, 8)}…` : token ? "Ready" : "Not authenticated" })] }), !token ? (_jsxs("div", { style: popupStyles.section, children: [_jsx("p", { style: popupStyles.label, children: "Supabase JWT Token" }), _jsxs("div", { style: popupStyles.inputRow, children: [_jsx("input", { style: popupStyles.input, type: "password", placeholder: "Paste your token\u2026", value: tokenInput, onChange: (e) => setTokenInput(e.target.value), onKeyDown: (e) => e.key === "Enter" && saveToken() }), _jsx("button", { style: popupStyles.saveBtn, onClick: saveToken, children: "Save" })] }), _jsx("p", { style: popupStyles.hint, children: "Get your token from the MeetFlow web app after signing in." })] })) : (_jsxs("div", { style: popupStyles.section, children: [_jsxs("div", { style: popupStyles.tokenRow, children: [_jsxs("span", { style: popupStyles.tokenMask, children: ["Token \u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", token.slice(-6)] }), _jsx("button", { style: popupStyles.clearBtn, onClick: clearToken, children: "Clear" })] }), saved && _jsx("span", { style: popupStyles.savedMsg, children: "\u2713 Saved" })] })), _jsx("div", { style: popupStyles.actions, children: _jsx("button", { style: popupStyles.primaryBtn, onClick: openMeet, children: "Open Google Meet" }) }), _jsx("p", { style: popupStyles.footer, children: "Join a Meet call to activate the sidebar" })] }));
}
const popupStyles = {
    container: { padding: "16px", display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-base)", minHeight: "200px" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    logo: { fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: "15px", color: "var(--text-primary)" },
    version: { fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" },
    status: { display: "flex", alignItems: "center", gap: "7px", padding: "8px 10px", background: "var(--bg-raised)", borderRadius: "6px", border: "1px solid var(--border)" },
    statusDot: { width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0 },
    statusText: { fontSize: "12px", color: "var(--text-secondary)" },
    section: { display: "flex", flexDirection: "column", gap: "6px" },
    label: { fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" },
    inputRow: { display: "flex", gap: "6px" },
    input: { flex: 1, padding: "7px 10px", background: "var(--bg-raised)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--text-primary)", fontSize: "12px", fontFamily: "var(--font-mono)", outline: "none" },
    saveBtn: { padding: "7px 14px", background: "var(--accent)", border: "none", borderRadius: "6px", color: "var(--bg-base)", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-ui)" },
    clearBtn: { padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text-muted)", fontSize: "11px", cursor: "pointer", fontFamily: "var(--font-ui)" },
    tokenRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    tokenMask: { fontSize: "12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" },
    savedMsg: { fontSize: "11px", color: "var(--accent)" },
    hint: { fontSize: "10px", color: "var(--text-muted)", lineHeight: 1.5 },
    actions: { display: "flex", gap: "6px" },
    primaryBtn: { flex: 1, padding: "9px", background: "var(--bg-raised)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--text-primary)", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-ui)" },
    footer: { fontSize: "10px", color: "var(--text-muted)", textAlign: "center" },
};
createRoot(document.getElementById("popup-root")).render(_jsx(StrictMode, { children: _jsx(Popup, {}) }));
