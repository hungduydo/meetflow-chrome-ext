import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/DocumentsPanel.tsx — B2.3
import { useEffect, useRef, useState } from "react";
import { useMeetFlowStore } from "../store/index.js";
import { documentsApi } from "../services/api.js";
import styles from "./DocumentsPanel.module.css";
import clsx from "clsx";
const STATUS_LABEL = {
    pending: "Queued",
    processing: "Embedding…",
    ready: "Ready",
    failed: "Failed",
};
function fileSize(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
export function DocumentsPanel() {
    const { token } = useMeetFlowStore();
    const [docs, setDocs] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    useEffect(() => {
        if (token)
            loadDocs();
    }, [token]);
    async function loadDocs() {
        if (!token)
            return;
        const list = await documentsApi.list(token).catch(() => []);
        setDocs(list);
    }
    async function handleUpload(files) {
        if (!files?.length || !token)
            return;
        setUploading(true);
        setError(null);
        try {
            for (const file of Array.from(files)) {
                await documentsApi.upload(token, file);
            }
            await loadDocs();
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setUploading(false);
        }
    }
    async function handleDelete(id) {
        if (!token)
            return;
        await documentsApi.delete(token, id).catch(() => { });
        setDocs((prev) => prev.filter((d) => d.id !== id));
    }
    return (_jsxs("div", { className: styles.panel, children: [_jsxs("div", { className: clsx(styles.dropZone, uploading && styles.uploading), onDragOver: (e) => e.preventDefault(), onDrop: (e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }, onClick: () => fileInputRef.current?.click(), children: [_jsx("input", { ref: fileInputRef, type: "file", multiple: true, accept: ".pdf,.txt,.docx", style: { display: "none" }, onChange: (e) => handleUpload(e.target.files) }), uploading ? (_jsxs(_Fragment, { children: [_jsx("span", { className: styles.uploadSpinner }), _jsx("span", { className: styles.dropText, children: "Uploading & embedding\u2026" })] })) : (_jsxs(_Fragment, { children: [_jsx(UploadIcon, {}), _jsx("span", { className: styles.dropText, children: "Drop files or click to upload" }), _jsx("span", { className: styles.dropSub, children: "PDF, TXT, DOCX \u00B7 Max 10MB" })] }))] }), error && _jsx("div", { className: styles.error, children: error }), _jsxs("div", { className: styles.list, children: [docs.length === 0 && !uploading && (_jsxs("div", { className: styles.empty, children: [_jsx("p", { children: "No documents uploaded yet." }), _jsx("p", { className: styles.emptySub, children: "Upload PDFs or docs to let MeetFlow reference them during meetings." })] })), docs.map((doc) => (_jsxs("div", { className: clsx(styles.docRow, "animate-slide-up"), children: [_jsx("div", { className: styles.docIcon, children: _jsx(FileIcon, {}) }), _jsxs("div", { className: styles.docInfo, children: [_jsx("span", { className: styles.docName, children: doc.filename }), _jsxs("span", { className: styles.docMeta, children: [fileSize(doc.fileSize), doc.chunkCount > 0 && ` · ${doc.chunkCount} chunks`] })] }), _jsx("span", { className: styles.statusBadge, "data-status": doc.status, children: STATUS_LABEL[doc.status] }), _jsx("button", { className: styles.deleteBtn, onClick: () => handleDelete(doc.id), title: "Delete", "aria-label": "Delete document", children: _jsx(TrashIcon, {}) })] }, doc.id)))] })] }));
}
function UploadIcon() {
    return (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "17 8 12 3 7 8" }), _jsx("line", { x1: "12", y1: "3", x2: "12", y2: "15" })] }));
}
function FileIcon() {
    return (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" }), _jsx("polyline", { points: "13 2 13 9 20 9" })] }));
}
function TrashIcon() {
    return (_jsxs("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }), _jsx("path", { d: "M10 11v6M14 11v6" }), _jsx("path", { d: "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" })] }));
}
