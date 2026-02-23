// src/types/index.ts

export interface TranscriptSegment {
  id: string;
  meetingId: string;
  text: string;
  speakerId: string | null;
  speakerLabel: string | null;
  startMs: number;
  endMs: number;
  confidence: number;
  isFinal: boolean;
}

export interface SmartReply {
  replyId: string;
  professional: string;
  casual: string;
  concise: string;
}

export interface MagicSearchResult {
  transcript: {
    answer: string;
    relevantQuotes: { speaker: string; text: string; relevance: string }[];
  };
  documents: { content: string; similarity: number; documentId: string }[];
}

export interface Meeting {
  id: string;
  title: string;
  status: "active" | "completed" | "processing";
  startedAt: string;
  endedAt: string | null;
  googleMeetUrl: string | null;
}

export interface MeetingMinutes {
  summary: string;
  actionItems: { task: string; assignee: string | null; dueDate: string | null }[];
  decisions: { decision: string; context: string }[];
  keyTopics: string[];
}

export interface Document {
  id: string;
  filename: string;
  fileSize: number;
  status: "pending" | "processing" | "ready" | "failed";
  chunkCount: number;
  createdAt: string;
}

// Chrome extension message types (background ↔ content ↔ sidebar)
export type ExtMessage =
  | { type: "MEETING_STARTED"; meetingId: string }
  | { type: "MEETING_ENDED"; meetingId: string }
  | { type: "TRANSCRIPT_SEGMENT"; data: TranscriptSegment }
  | { type: "SMART_REPLY_TRIGGER"; triggerText: string; meetingId: string }
  | { type: "SMART_REPLY_RESULT"; data: SmartReply }
  | { type: "AUTH_TOKEN"; token: string }
  | { type: "GET_AUTH_TOKEN" }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SIDEBAR_READY" };
