# MeetFlow AI — Chrome Extension (Frontend)

> React + TypeScript Chrome Extension (Manifest V3) — the UI layer of MeetFlow AI.

---

## Architecture

```
src/
├── background.ts          # MV3 service worker — auth storage, tab events
├── content.ts             # Injected into meet.google.com — sidebar injection (T1.2)
├── content.css            # Minimal styles injected into Meet page
├── sidebar.tsx            # React entry for sidebar iframe
├── popup.tsx              # Extension action popup — auth + status
│
├── components/
│   ├── Sidebar.tsx            # Main shell — tabs, start/stop, Cmd+K
│   ├── Header.tsx             # Logo, live indicator, REC badge (T1.2 privacy)
│   ├── TranscriptPanel.tsx    # Live auto-scroll transcript (T1.4)
│   ├── SmartReplyPanel.tsx    # 3-variant AI replies (B2.2)
│   ├── MagicSearch.tsx        # Cmd+K search overlay (B2.4)
│   ├── DocumentsPanel.tsx     # RAG file upload + management (B2.3)
│   └── MinutesPanel.tsx       # AI meeting minutes generation (B3.2)
│
├── services/
│   ├── api.ts             # Typed REST client for all backend endpoints
│   └── stream.ts          # Dual-stream audio capture + WebSocket (T1.3, B1.1)
│
├── store/
│   └── index.ts           # Zustand global state
│
├── styles/
│   └── globals.css        # Design tokens, animations, fonts
│
└── types/
    └── index.ts           # Shared types + Chrome message types
```

## PRD Task Coverage

| Task  | Component / File                         |
|-------|------------------------------------------|
| T1.2  | `content.ts` — Shadow DOM sidebar injection |
| T1.3  | `services/stream.ts` — `getDisplayMedia` + `getUserMedia` dual capture |
| T1.4  | `TranscriptPanel.tsx` — auto-scroll live transcript |
| B1.1  | `services/stream.ts` — WebSocket with reconnect |
| B1.3  | `TranscriptPanel.tsx` → `GET /api/meetings/:id/export` |
| B2.2  | `SmartReplyPanel.tsx` — 3-variant smart replies + clipboard copy |
| B2.3  | `DocumentsPanel.tsx` — drag-and-drop file upload + embedding status |
| B2.4  | `MagicSearch.tsx` — Cmd+K overlay with transcript + RAG search |
| B3.2  | `MinutesPanel.tsx` — one-click AI meeting minutes generation |

## Setup

```bash
# Install dependencies
npm install

# Dev mode (watches src/, outputs to dist/)
npm run dev

# Production build
npm run build
```

## Loading in Chrome

1. Run `npm run build`
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `dist/` folder
5. Navigate to `meet.google.com` — the MeetFlow sidebar appears automatically

## Environment

Create `.env` in the project root:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## Design System

The extension uses a **dark terminal-editorial** aesthetic:

- **Fonts**: Syne (UI) + JetBrains Mono (code/timestamps)
- **Primary accent**: `#00E5A0` (teal-green)
- **Secondary**: `#8B5CF6` (purple), `#F59E0B` (amber)
- **Background layers**: `#0A0E13` → `#111720` → `#1A2130` → `#212D3F`

All design tokens live in `src/styles/globals.css` as CSS custom properties.
