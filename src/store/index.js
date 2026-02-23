// src/store/index.ts — Zustand global state
import { create } from "zustand";
export const useMeetFlowStore = create((set) => ({
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
    addSegment: (seg) => set((s) => {
        if (!seg.isFinal)
            return { interimText: seg.text };
        // Replace any previous interim + deduplicate by id
        const existing = s.segments.findIndex((x) => x.id === seg.id);
        if (existing !== -1)
            return { interimText: "" };
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
    setPendingReply: (pendingReply, triggerText = null) => set({ pendingReply, triggerText, isLoadingReply: false }),
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
