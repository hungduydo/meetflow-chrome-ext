// src/components/SmartReplyPanel.tsx — B2.2
import { useMeetFlowStore } from "../store/index.js";
import { aiApi } from "../services/api.js";
import styles from "./SmartReplyPanel.module.css";
import clsx from "clsx";

const VARIANTS = [
  { key: "professional" as const, label: "Professional", icon: "💼", desc: "Formal & thorough" },
  { key: "casual"       as const, label: "Casual",       icon: "💬", desc: "Friendly & natural" },
  { key: "concise"      as const, label: "Concise",      icon: "⚡", desc: "One sentence" },
];

export function SmartReplyPanel() {
  const {
    pendingReply,
    triggerText,
    isLoadingReply,
    token,
    meetingId,
    dismissReply,
    setActiveTab,
  } = useMeetFlowStore();

  const noActivity = !pendingReply && !isLoadingReply;

  const handleUse = async (variant: "professional" | "casual" | "concise") => {
    if (!pendingReply || !token) return;
    const text = pendingReply[variant];

    // Copy to clipboard
    await navigator.clipboard.writeText(text);

    // Track usage in backend
    await aiApi.markReplyUsed(token, pendingReply.replyId, variant).catch(() => {});

    dismissReply();
  };

  return (
    <div className={styles.panel}>
      {isLoadingReply && (
        <div className={styles.loading}>
          <div className={styles.loadingBar}>
            <div className={styles.loadingFill} />
          </div>
          <p className={styles.loadingText}>Generating replies…</p>
        </div>
      )}

      {pendingReply && (
        <div className={clsx(styles.replyCard, "animate-slide-up")}>
          {triggerText && (
            <div className={styles.trigger}>
              <span className={styles.triggerLabel}>Addressed:</span>
              <span className={styles.triggerText}>"{triggerText}"</span>
            </div>
          )}

          <div className={styles.variants}>
            {VARIANTS.map(({ key, label, icon, desc }) => (
              <button
                key={key}
                className={styles.variantBtn}
                onClick={() => handleUse(key)}
                title="Click to copy to clipboard"
              >
                <div className={styles.variantHeader}>
                  <span className={styles.variantIcon}>{icon}</span>
                  <span className={styles.variantLabel}>{label}</span>
                  <span className={styles.variantDesc}>{desc}</span>
                  <span className={styles.copyHint}>Copy ↗</span>
                </div>
                <p className={styles.variantText}>{pendingReply[key]}</p>
              </button>
            ))}
          </div>

          <button className={styles.dismissBtn} onClick={dismissReply}>
            Dismiss
          </button>
        </div>
      )}

      {noActivity && (
        <div className={styles.idle}>
          <div className={styles.idleIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p>Smart Reply activates when someone addresses you directly.</p>
          <p className={styles.idleSub}>
            MeetFlow detects questions directed at you and generates 3 reply options instantly.
          </p>
        </div>
      )}
    </div>
  );
}
