// src/popup.tsx — Extension action popup
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";

function Popup() {
  const [token, setTokenState] = useState<string | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<string | null>(null);
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
    if (!tokenInput.trim()) return;
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

  return (
    <div style={popupStyles.container}>
      {/* Header */}
      <div style={popupStyles.header}>
        <span style={popupStyles.logo}>MeetFlow <span style={{ color: "var(--accent)" }}>AI</span></span>
        <span style={popupStyles.version}>v1.0</span>
      </div>

      {/* Status */}
      <div style={popupStyles.status}>
        <div style={{ ...popupStyles.statusDot, background: token ? "var(--accent)" : "var(--text-muted)" }} />
        <span style={popupStyles.statusText}>
          {activeMeeting ? `Live · ${activeMeeting.slice(0, 8)}…` : token ? "Ready" : "Not authenticated"}
        </span>
      </div>

      {/* Token setup */}
      {!token ? (
        <div style={popupStyles.section}>
          <p style={popupStyles.label}>Supabase JWT Token</p>
          <div style={popupStyles.inputRow}>
            <input
              style={popupStyles.input}
              type="password"
              placeholder="Paste your token…"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveToken()}
            />
            <button style={popupStyles.saveBtn} onClick={saveToken}>Save</button>
          </div>
          <p style={popupStyles.hint}>Get your token from the MeetFlow web app after signing in.</p>
        </div>
      ) : (
        <div style={popupStyles.section}>
          <div style={popupStyles.tokenRow}>
            <span style={popupStyles.tokenMask}>Token ••••••••{token.slice(-6)}</span>
            <button style={popupStyles.clearBtn} onClick={clearToken}>Clear</button>
          </div>
          {saved && <span style={popupStyles.savedMsg}>✓ Saved</span>}
        </div>
      )}

      {/* Actions */}
      <div style={popupStyles.actions}>
        <button style={popupStyles.primaryBtn} onClick={openMeet}>
          Open Google Meet
        </button>
      </div>

      <p style={popupStyles.footer}>
        Join a Meet call to activate the sidebar
      </p>
    </div>
  );
}

const popupStyles: Record<string, React.CSSProperties> = {
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

createRoot(document.getElementById("popup-root")!).render(
  <StrictMode><Popup /></StrictMode>
);
