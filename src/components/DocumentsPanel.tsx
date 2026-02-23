// src/components/DocumentsPanel.tsx — B2.3
import { useEffect, useRef, useState } from "react";
import { useMeetFlowStore } from "../store/index.js";
import { documentsApi } from "../services/api.js";
import type { Document } from "../types/index.js";
import styles from "./DocumentsPanel.module.css";
import clsx from "clsx";

const STATUS_LABEL = {
  pending:    "Queued",
  processing: "Embedding…",
  ready:      "Ready",
  failed:     "Failed",
};

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function DocumentsPanel() {
  const { token } = useMeetFlowStore();
  const [docs, setDocs] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) loadDocs();
  }, [token]);

  async function loadDocs() {
    if (!token) return;
    const list = await documentsApi.list(token).catch(() => []);
    setDocs(list);
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length || !token) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await documentsApi.upload(token, file);
      }
      await loadDocs();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    await documentsApi.delete(token, id).catch(() => {});
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className={styles.panel}>
      {/* Drop zone */}
      <div
        className={clsx(styles.dropZone, uploading && styles.uploading)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.docx"
          style={{ display: "none" }}
          onChange={(e) => handleUpload(e.target.files)}
        />
        {uploading ? (
          <>
            <span className={styles.uploadSpinner} />
            <span className={styles.dropText}>Uploading & embedding…</span>
          </>
        ) : (
          <>
            <UploadIcon />
            <span className={styles.dropText}>Drop files or click to upload</span>
            <span className={styles.dropSub}>PDF, TXT, DOCX · Max 10MB</span>
          </>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Document list */}
      <div className={styles.list}>
        {docs.length === 0 && !uploading && (
          <div className={styles.empty}>
            <p>No documents uploaded yet.</p>
            <p className={styles.emptySub}>
              Upload PDFs or docs to let MeetFlow reference them during meetings.
            </p>
          </div>
        )}

        {docs.map((doc) => (
          <div key={doc.id} className={clsx(styles.docRow, "animate-slide-up")}>
            <div className={styles.docIcon}>
              <FileIcon />
            </div>
            <div className={styles.docInfo}>
              <span className={styles.docName}>{doc.filename}</span>
              <span className={styles.docMeta}>
                {fileSize(doc.fileSize)}
                {doc.chunkCount > 0 && ` · ${doc.chunkCount} chunks`}
              </span>
            </div>
            <span className={styles.statusBadge} data-status={doc.status}>
              {STATUS_LABEL[doc.status]}
            </span>
            <button
              className={styles.deleteBtn}
              onClick={() => handleDelete(doc.id)}
              title="Delete"
              aria-label="Delete document"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
