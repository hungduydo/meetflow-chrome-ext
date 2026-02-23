import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/MagicSearch.tsx — B2.4
import { useRef, useEffect, useState } from "react";
import { useMeetFlowStore } from "../store/index.js";
import { aiApi } from "../services/api.js";
import styles from "./MagicSearch.module.css";
import clsx from "clsx";
export function MagicSearch() {
    const { isMagicSearchOpen, setMagicSearchOpen, searchQuery, setSearchQuery, searchResult, setSearchResult, isSearching, setSearching, token, meetingId, } = useMeetFlowStore();
    const inputRef = useRef(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (isMagicSearchOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
        else {
            setSearchQuery("");
            setSearchResult(null);
            setError(null);
        }
    }, [isMagicSearchOpen]);
    // Close on Escape
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape" && isMagicSearchOpen)
                setMagicSearchOpen(false);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isMagicSearchOpen]);
    const handleSearch = async () => {
        if (!searchQuery.trim() || !token || !meetingId)
            return;
        setSearching(true);
        setError(null);
        try {
            const result = await aiApi.magicSearch(token, meetingId, searchQuery);
            setSearchResult(result);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSearching(false);
        }
    };
    if (!isMagicSearchOpen)
        return null;
    return (_jsx("div", { className: styles.backdrop, onClick: () => setMagicSearchOpen(false), children: _jsxs("div", { className: styles.modal, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: styles.inputRow, children: [_jsx("span", { className: styles.cmdIcon, children: "\u2318" }), _jsx("input", { ref: inputRef, className: styles.input, value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleSearch(), placeholder: "Ask anything about this meeting\u2026", spellCheck: false }), isSearching ? (_jsx("span", { className: styles.spinner })) : (_jsx("button", { className: styles.searchBtn, onClick: handleSearch, disabled: !searchQuery.trim(), children: "Search" }))] }), error && (_jsx("div", { className: styles.error, children: error })), searchResult && !isSearching && (_jsxs("div", { className: clsx(styles.results, "animate-slide-up"), children: [_jsxs("div", { className: styles.answer, children: [_jsx("span", { className: styles.answerLabel, children: "Answer" }), _jsx("p", { className: styles.answerText, children: searchResult.transcript.answer })] }), searchResult.transcript.relevantQuotes.length > 0 && (_jsxs("div", { className: styles.quotes, children: [_jsx("span", { className: styles.sectionLabel, children: "From transcript" }), searchResult.transcript.relevantQuotes.map((q, i) => (_jsxs("div", { className: styles.quote, children: [_jsx("span", { className: styles.quoteSpeaker, children: q.speaker }), _jsxs("p", { className: styles.quoteText, children: ["\"", q.text, "\""] }), _jsx("p", { className: styles.quoteRelevance, children: q.relevance })] }, i)))] })), searchResult.documents.length > 0 && (_jsxs("div", { className: styles.docResults, children: [_jsx("span", { className: styles.sectionLabel, children: "From your documents" }), searchResult.documents.map((d, i) => (_jsxs("div", { className: styles.docResult, children: [_jsxs("span", { className: styles.similarity, children: [Math.round(d.similarity * 100), "% match"] }), _jsx("p", { className: styles.docContent, children: d.content })] }, i)))] }))] })), _jsxs("div", { className: styles.hint, children: [_jsx("kbd", { children: "\u21B5" }), " search \u00A0\u00B7\u00A0 ", _jsx("kbd", { children: "Esc" }), " close"] })] }) }));
}
