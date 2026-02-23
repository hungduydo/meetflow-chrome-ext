// src/store/index.ts — Zustand global state
import { create } from "zustand";
import type { TranscriptSegment, SmartReply, MagicSearchResult, MeetingMinutes } from "../types/index.js";

type Tab = "transcript" | "replies" | "search" | "docs" | "minutes";
type StreamStatus = "idle" | "connecting" | "live" | "error";

interface MeetFlowStore {
  // Auth
  token: string | null;
  setToken: (token: string | null) => void;

  // Meeting session
  meetingId: string | null;
  meetingTitle: string;
  streamStatus: StreamStatus;
  setMeetingId: (id: string | null) => void;
  setStreamStatus: (s: StreamStatus) => void;

  // Transcript — T1.4
  segments: TranscriptSegment[];
  interimText: string;
  addSegment: (seg: TranscriptSegment) => void;
  setInterimText: (text: string) => void;
  clearTranscript: () => void;

  // Smart Reply — B2.2
  pendingReply: SmartReply | null;
  triggerText: string | null;
  isLoadingReply: boolean;
  setPendingReply: (reply: SmartReply | null, trigger?: string) => void;
  setLoadingReply: (v: boolean) => void;
  dismissReply: () => void;

  // Magic Search — B2.4
  searchQuery: string;
  searchResult: MagicSearchResult | null;
  isSearching: boolean;
  setSearchQuery: (q: string) => void;
  setSearchResult: (r: MagicSearchResult | null) => void;
  setSearching: (v: boolean) => void;

  // Meeting Minutes — B3.2
  minutes: MeetingMinutes | null;
  isGeneratingMinutes: boolean;
  setMinutes: (m: MeetingMinutes | null) => void;
  setGeneratingMinutes: (v: boolean) => void;

  // UI
  activeTab: Tab;
  isSidebarOpen: boolean;
  isMagicSearchOpen: boolean;
  setActiveTab: (tab: Tab) => void;
  setSidebarOpen: (v: boolean) => void;
  setMagicSearchOpen: (v: boolean) => void;
}

export const useMeetFlowStore = create<MeetFlowStore>((set) => ({
  // Auth
  token: null,
  setToken: (token) => set({ token }),

  // Meeting
  meetingId: null,
  meetingTitle: "Meeting",
  streamStatus: "idle",
  setMeetingId: (meetingId) => set({ meetingId }),
  setStreamStatus: (streamStatus) => set({ streamStatus }),

  // Transcript
  segments: [],
  interimText: "",
  addSegment: (seg) =>
    set((s) => {
      if (!seg.isFinal) return { interimText: seg.text };
      // Replace any previous interim + deduplicate by id
      const existing = s.segments.findIndex((x) => x.id === seg.id);
      if (existing !== -1) return { interimText: "" };
      return {
        segments: [...s.segments, seg],
        interimText: "",
      };
    }),
  setInterimText: (interimText) => set({ interimText }),
  clearTranscript: () => set({ segments: [], interimText: "" }),

  // Smart Reply
  pendingReply: null,
  triggerText: null,
  isLoadingReply: false,
  setPendingReply: (pendingReply, triggerText = null) =>
    set({ pendingReply, triggerText, isLoadingReply: false }),
  setLoadingReply: (isLoadingReply) => set({ isLoadingReply }),
  dismissReply: () => set({ pendingReply: null, triggerText: null }),

  // Magic Search
  searchQuery: "",
  searchResult: null,
  isSearching: false,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchResult: (searchResult) => set({ searchResult }),
  setSearching: (isSearching) => set({ isSearching }),

  // Minutes
  minutes: null,
  isGeneratingMinutes: false,
  setMinutes: (minutes) => set({ minutes, isGeneratingMinutes: false }),
  setGeneratingMinutes: (isGeneratingMinutes) => set({ isGeneratingMinutes }),

  // UI
  activeTab: "transcript",
  isSidebarOpen: true,
  isMagicSearchOpen: false,
  setActiveTab: (activeTab) => set({ activeTab }),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setMagicSearchOpen: (isMagicSearchOpen) => set({ isMagicSearchOpen }),
}));
