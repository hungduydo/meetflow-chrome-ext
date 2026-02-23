import { useMeetFlowStore } from "../store/index.js";
import styles from "./Header.module.css";
import { version } from "../../package.json";

const STATUS_LABEL: Record<string, string> = {
  idle: "Ready",
  connecting: "Connecting…",
  live: "LIVE",
  error: "Error",
};

export function Header() {
  const { streamStatus, meetingTitle, isSidebarOpen, setSidebarOpen } = useMeetFlowStore();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>M</span>
          <span className={styles.logoText}>eetFlow</span>
          <span className={styles.version}>v{version}</span>
        </div>
        <div className={styles.statusBadge} data-status={streamStatus}>
          {streamStatus === "live" && <span className={styles.liveDot} />}
          <span className={styles.statusLabel}>{STATUS_LABEL[streamStatus]}</span>
        </div>
      </div>

      <div className={styles.right}>
        {/* T1.2: Recording indicator — always visible when live */}
        {streamStatus === "live" && (
          <div className={styles.recIndicator} title="Recording in progress">
            <span className={styles.recDot} />
            <span className={styles.recLabel}>REC</span>
          </div>
        )}
        <button
          className={styles.collapseBtn}
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <ChevronRight />
        </button>
      </div>
    </header>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
