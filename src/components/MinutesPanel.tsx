// src/components/MinutesPanel.tsx — B3.2
import { useMeetFlowStore } from "../store/index.js";
import { meetingsApi } from "../services/api.js";
import styles from "./MinutesPanel.module.css";
import clsx from "clsx";

export function MinutesPanel() {
  const { token, meetingId, minutes, isGeneratingMinutes, setMinutes, setGeneratingMinutes } =
    useMeetFlowStore();

  const generate = async () => {
    if (!token || !meetingId) return;
    setGeneratingMinutes(true);
    try {
      const result = await meetingsApi.generateMinutes(token, meetingId);
      setMinutes(result);
    } catch (err) {
      setGeneratingMinutes(false);
      console.error(err);
    }
  };

  const copyAll = () => {
    if (!minutes) return;
    const text = [
      `## Summary\n${minutes.summary}`,
      `\n## Action Items\n${minutes.actionItems.map((a) => `- [ ] ${a.task}${a.assignee ? ` (@${a.assignee})` : ""}${a.dueDate ? ` · Due: ${a.dueDate}` : ""}`).join("\n")}`,
      `\n## Decisions\n${minutes.decisions.map((d) => `- ${d.decision}\n  Context: ${d.context}`).join("\n")}`,
      `\n## Key Topics\n${minutes.keyTopics.map((t) => `- ${t}`).join("\n")}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={styles.panel}>
      {!minutes && !isGeneratingMinutes && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <NotesIcon />
          </div>
          <p>Generate AI meeting minutes from the full transcript.</p>
          <p className={styles.emptySub}>Includes summary, action items, decisions, and key topics.</p>
          <button
            className={styles.generateBtn}
            onClick={generate}
            disabled={!token || !meetingId}
          >
            <SparklesIcon />
            Generate Minutes
          </button>
        </div>
      )}

      {isGeneratingMinutes && (
        <div className={styles.loading}>
          <div className={styles.loadingRing} />
          <p>Analysing transcript…</p>
          <p className={styles.loadingSub}>This takes a few seconds</p>
        </div>
      )}

      {minutes && (
        <div className={clsx(styles.minutes, "animate-fade-in")}>
          <div className={styles.minutesHeader}>
            <span className={styles.minutesTitle}>Meeting Minutes</span>
            <div className={styles.minutesActions}>
              <button className={styles.actionBtn} onClick={copyAll} title="Copy as Markdown">
                <CopyIcon /> Copy
              </button>
              <button className={styles.actionBtn} onClick={generate} title="Regenerate">
                <RefreshIcon /> Regen
              </button>
            </div>
          </div>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Summary</h3>
            <p className={styles.sectionBody}>{minutes.summary}</p>
          </section>

          {minutes.actionItems.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.titleDot} style={{ background: "var(--accent)" }} />
                Action Items
              </h3>
              <ul className={styles.actionList}>
                {minutes.actionItems.map((item, i) => (
                  <li key={i} className={styles.actionItem}>
                    <span className={styles.checkbox} />
                    <div className={styles.actionBody}>
                      <span className={styles.actionTask}>{item.task}</span>
                      <div className={styles.actionMeta}>
                        {item.assignee && <span className={styles.assignee}>@{item.assignee}</span>}
                        {item.dueDate && <span className={styles.dueDate}>{item.dueDate}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {minutes.decisions.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.titleDot} style={{ background: "var(--purple)" }} />
                Decisions
              </h3>
              <ul className={styles.decisionList}>
                {minutes.decisions.map((d, i) => (
                  <li key={i} className={styles.decisionItem}>
                    <p className={styles.decisionText}>{d.decision}</p>
                    <p className={styles.decisionCtx}>{d.context}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {minutes.keyTopics.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.titleDot} style={{ background: "var(--amber)" }} />
                Key Topics
              </h3>
              <div className={styles.topics}>
                {minutes.keyTopics.map((t, i) => (
                  <span key={i} className={styles.topic}>{t}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function NotesIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
function SparklesIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></svg>;
}
function CopyIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
}
function RefreshIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
}
