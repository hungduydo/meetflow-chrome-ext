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
  ) { }

  async startCapture(): Promise<void> {
    try {
      // const tabAudio = await this.captureTabAudio();
      const micAudio = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
        video: false,
      });

      // Merge both streams via AudioContext
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      const dest = ctx.createMediaStreamDestination();
      dest.channelCount = 1; // mono for STT

      // if (tabAudio) {
      //   ctx.createMediaStreamSource(tabAudio).connect(dest);
      // }
      ctx.createMediaStreamSource(micAudio).connect(dest);

      if (ctx.state === "suspended") await ctx.resume();

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
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        // @ts-ignore — non-standard Chrome hint
        systemAudio: "include",
      });
      stream.getVideoTracks().forEach((t) => t.stop());
      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        return null;
      }
      return stream;
    } catch (err) {
      console.warn("[MeetFlow] System audio capture denied or failed:", err);
      return null;
    }
  }

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

  private startMediaRecorder(): void {
    if (!this.combinedStream) return;

    const PREFERRED_TYPES = [
      "audio/webm;codecs=opus",
      "audio/webm",
    ];
    const mimeType = PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported(t))
      ?? "audio/webm";

    this.mediaRecorder = new MediaRecorder(this.combinedStream, {
      mimeType,
      audioBitsPerSecond: 32_000, // FIX 5: was 16_000 — too low, caused corrupt chunks
    });

    console.log(`[MeetFlow] MediaRecorder mimeType: ${this.mediaRecorder.mimeType}`);

    let sendQueue = Promise.resolve();

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size === 0) return;

      console.log(`[MeetFlow] Audio chunk: ${e.data.size} bytes`); // remove after debugging

      if (this.ws?.readyState !== WebSocket.OPEN) return;

      // Queue sequential sends to preserve chunk order
      sendQueue = sendQueue.then(async () => {
        try {
          if (this.ws?.readyState === WebSocket.OPEN) {
            const buf = await e.data.arrayBuffer();
            this.ws.send(buf);
          }
        } catch (err) {
          console.error("[MeetFlow] Error sending audio chunk:", err);
        }
      });
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
