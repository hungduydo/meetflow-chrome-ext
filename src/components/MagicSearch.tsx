// src/components/MagicSearch.tsx — B2.4
import { useRef, useEffect, useState } from "react";
import { useMeetFlowStore } from "../store/index.js";
import { aiApi } from "../services/api.js";
import styles from "./MagicSearch.module.css";
import clsx from "clsx";

export function MagicSearch() {
  const {
    isMagicSearchOpen, setMagicSearchOpen,
    searchQuery, setSearchQuery,
    searchResult, setSearchResult,
    isSearching, setSearching,
    token, meetingId,
  } = useMeetFlowStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isMagicSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
      setSearchResult(null);
      setError(null);
    }
  }, [isMagicSearchOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMagicSearchOpen) setMagicSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMagicSearchOpen]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !token || !meetingId) return;
    setSearching(true);
    setError(null);
    try {
      const result = await aiApi.magicSearch(token, meetingId, searchQuery);
      setSearchResult(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSearching(false);
    }
  };

  if (!isMagicSearchOpen) return null;

  return (
    <div className={styles.backdrop} onClick={() => setMagicSearchOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className={styles.inputRow}>
          <span className={styles.cmdIcon}>⌘</span>
          <input
            ref={inputRef}
            className={styles.input}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ask anything about this meeting…"
            spellCheck={false}
          />
          {isSearching ? (
            <span className={styles.spinner} />
          ) : (
            <button className={styles.searchBtn} onClick={handleSearch} disabled={!searchQuery.trim()}>
              Search
            </button>
          )}
        </div>

        {/* Results */}
        {error && (
          <div className={styles.error}>{error}</div>
        )}

        {searchResult && !isSearching && (
          <div className={clsx(styles.results, "animate-slide-up")}>
            <div className={styles.answer}>
              <span className={styles.answerLabel}>Answer</span>
              <p className={styles.answerText}>{searchResult.transcript.answer}</p>
            </div>

            {searchResult.transcript.relevantQuotes.length > 0 && (
              <div className={styles.quotes}>
                <span className={styles.sectionLabel}>From transcript</span>
                {searchResult.transcript.relevantQuotes.map((q, i) => (
                  <div key={i} className={styles.quote}>
                    <span className={styles.quoteSpeaker}>{q.speaker}</span>
                    <p className={styles.quoteText}>"{q.text}"</p>
                    <p className={styles.quoteRelevance}>{q.relevance}</p>
                  </div>
                ))}
              </div>
            )}

            {searchResult.documents.length > 0 && (
              <div className={styles.docResults}>
                <span className={styles.sectionLabel}>From your documents</span>
                {searchResult.documents.map((d, i) => (
                  <div key={i} className={styles.docResult}>
                    <span className={styles.similarity}>
                      {Math.round(d.similarity * 100)}% match
                    </span>
                    <p className={styles.docContent}>{d.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={styles.hint}>
          <kbd>↵</kbd> search &nbsp;·&nbsp; <kbd>Esc</kbd> close
        </div>
      </div>
    </div>
  );
}
