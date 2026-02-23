// src/services/stream.ts
// T1.3: Dual-stream audio capture (tabCapture + getUserMedia)
// B1.1: WebSocket connection to backend STT server

import type { TranscriptSegment } from "../types/index.js";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001";
const CHUNK_INTERVAL_MS = 250; // send audio every 250ms for low latency

export type StreamEvent =
  | { type: "transcript"; data: TranscriptSegment }
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "error"; message: string };

export class AudioStreamService {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private combinedStream: MediaStream | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnects = 5;

  constructor(
    private meetingId: string,
    private token: string,
    private onEvent: (event: StreamEvent) => void
  ) {}

  // ── T1.3: Capture both system audio (tab) + microphone ─────────────────────
  async startCapture(): Promise<void> {
    try {
      // System audio via tabCapture (called from background.ts via message)
      // In content script context, we use getDisplayMedia as fallback
      const tabAudio = await this.captureTabAudio();
      const micAudio = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000, // Deepgram optimal
        },
        video: false,
      });

      // Merge both streams into AudioContext
      const ctx = new AudioContext({ sampleRate: 16000 });
      const dest = ctx.createMediaStreamDestination();

      if (tabAudio) {
        ctx.createMediaStreamSource(tabAudio).connect(dest);
      }
      ctx.createMediaStreamSource(micAudio).connect(dest);
      this.combinedStream = dest.stream;

      await this.connectWebSocket();
      this.startMediaRecorder();
    } catch (err) {
      this.onEvent({ type: "error", message: (err as Error).message });
      throw err;
    }
  }

  private async captureTabAudio(): Promise<MediaStream | null> {
    try {
      // getDisplayMedia captures tab audio including Meet participants
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: { echoCancellation: false, noiseSuppression: false },
      });
      // User selected a tab/screen — filter video tracks
      stream.getVideoTracks().forEach((t) => t.stop());
      return stream;
    } catch {
      // User denied screen share — fall back to mic-only
      return null;
    }
  }

  // ── B1.1: WebSocket connection with reconnect logic ─────────────────────────
  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${WS_URL}/ws/stream?meetingId=${this.meetingId}&token=${encodeURIComponent(this.token)}`;
      this.ws = new WebSocket(url);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.onEvent({ type: "connected" });
        resolve();
      };

      this.ws.onerror = (e) => {
        this.onEvent({ type: "error", message: "WebSocket error" });
        reject(e);
      };

      this.ws.onclose = () => {
        this.onEvent({ type: "disconnected" });
        this.attemptReconnect();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as StreamEvent;
          this.onEvent(msg);
        } catch {
          // ignore malformed frames
        }
      };
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnects) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    this.reconnectTimer = setTimeout(() => this.connectWebSocket(), delay);
  }

  // ── Send audio chunks as binary frames ────────────────────────────────────
  private startMediaRecorder(): void {
    if (!this.combinedStream) return;

    // Use audio/webm;codecs=opus — good compression, Deepgram-compatible
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    this.mediaRecorder = new MediaRecorder(this.combinedStream, {
      mimeType,
      audioBitsPerSecond: 16000,
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
        e.data.arrayBuffer().then((buf) => this.ws?.send(buf));
      }
    };

    this.mediaRecorder.start(CHUNK_INTERVAL_MS);
  }

  async stop(): Promise<void> {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.mediaRecorder?.stop();
    this.combinedStream?.getTracks().forEach((t) => t.stop());

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "end" }));
      this.ws.close(1000, "Stream ended");
    }

    this.ws = null;
    this.mediaRecorder = null;
    this.combinedStream = null;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
