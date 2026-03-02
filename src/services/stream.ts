// src/services/stream.ts
import type { TranscriptSegment } from "../types/index.js";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001";

// Deepgram's live streaming API accepts raw PCM (linear16) reliably.
// MediaRecorder produces a WebM container (EBML header + Segment + Clusters)
// which is a pre-recorded container format — Deepgram's streaming endpoint
// can't parse it and closes the connection immediately with no transcript.
// ScriptProcessorNode captures raw Float32 samples which we convert to Int16
// (linear16) and stream directly; no container overhead, no format ambiguity.
const PCM_BUFFER_SIZE = 4096; // samples per chunk; 4096 / 16000 Hz = 256 ms

export type StreamEvent =
  | { type: "transcript"; data: TranscriptSegment }
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "error"; message: string };

export class AudioStreamService {
  private ws: WebSocket | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private silentGain: GainNode | null = null;
  private combinedStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnects = 5;

  // FIX 1: explicit stopped flag — prevents the "stop → 2 s → back to live"
  // bug where ws.onclose would fire during stop() and trigger a reconnect.
  private stopped = false;

  constructor(
    private meetingId: string,
    private token: string,
    private onEvent: (event: StreamEvent) => void
  ) { }

  async startCapture(): Promise<void> {
    this.stopped = false;
    try {
      const tabAudio = await this.captureTabAudio();
      const micAudio = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
        video: false,
      });

      // FIX 2: store AudioContext so close() fully releases audio hardware.
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: 16000 });

      // Mix tab + mic into a single mono stream via MediaStreamDestination.
      const dest = this.audioContext.createMediaStreamDestination();
      dest.channelCount = 1;
      if (tabAudio) this.audioContext.createMediaStreamSource(tabAudio).connect(dest);
      this.audioContext.createMediaStreamSource(micAudio).connect(dest);

      if (this.audioContext.state === "suspended") await this.audioContext.resume();

      this.combinedStream = dest.stream;
      await this.connectWebSocket();
      this.startPCMCapture();
    } catch (err) {
      this.onEvent({ type: "error", message: (err as Error).message });
      throw err;
    }
  }

  // MV3: chrome.tabCapture.capture() is blocked from extension iframes.
  // We ask the background service worker for a MediaStream ID via
  // getMediaStreamId(), then pass it to getUserMedia() here.
  private captureTabAudio(): Promise<MediaStream | null> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "GET_TAB_STREAM_ID" },
        (resp: { streamId?: string; error?: string } | null) => {
          if (chrome.runtime.lastError || !resp?.streamId) {
            console.warn(
              "[MeetFlow] tabCapture stream ID failed:",
              resp?.error ?? chrome.runtime.lastError?.message
            );
            resolve(null);
            return;
          }

          navigator.mediaDevices
            .getUserMedia({
              audio: {
                // @ts-ignore — chromeMediaSource is a Chrome-specific constraint
                mandatory: {
                  chromeMediaSource: "tab",
                  chromeMediaSourceId: resp.streamId,
                },
              },
              video: false,
            } as MediaStreamConstraints)
            .then((stream) => {
              const audioTracks = stream.getAudioTracks();
              if (audioTracks.length === 0) {
                stream.getTracks().forEach(t => t.stop());
                resolve(null);
                return;
              }
              resolve(stream);
            })
            .catch((err: Error) => {
              console.warn("[MeetFlow] Tab audio getUserMedia failed:", err.message);
              resolve(null);
            });
        }
      );
    });
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

      this.ws.onerror = () => {
        if (!this.stopped) this.onEvent({ type: "error", message: "WebSocket error" });
        reject(new Error("WebSocket error"));
      };

      this.ws.onclose = () => {
        // FIX 1: only reconnect on unexpected disconnect, not deliberate stop
        if (!this.stopped) {
          this.onEvent({ type: "disconnected" });
          this.attemptReconnect();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as StreamEvent;
          this.onEvent(msg);
        } catch { /* ignore binary or malformed frames */ }
      };
    });
  }

  private attemptReconnect(): void {
    if (this.stopped || this.reconnectAttempts >= this.maxReconnects) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    this.reconnectTimer = setTimeout(() => {
      if (!this.stopped) this.connectWebSocket();
    }, delay);
  }

  // Capture raw PCM audio via ScriptProcessorNode and stream as linear16.
  //
  // Why not MediaRecorder?
  //   MediaRecorder outputs audio/webm — a container format (EBML header +
  //   WebM Segment + Cluster elements). Deepgram's live streaming endpoint
  //   expects raw encoded audio without a container wrapper. When it receives
  //   WebM bytes it cannot parse them and closes the connection immediately,
  //   producing no transcript regardless of the `encoding` parameter used.
  //
  // Why ScriptProcessorNode (deprecated)?
  //   AudioWorkletNode is the modern replacement but requires loading a
  //   separate worklet module URL, which is cumbersome in a Chrome Extension
  //   iframe. ScriptProcessorNode is deprecated but still fully supported in
  //   all Chromium versions and works without extra setup.
  private startPCMCapture(): void {
    if (!this.combinedStream || !this.audioContext) return;

    this.sourceNode = this.audioContext.createMediaStreamSource(this.combinedStream);

    // 1 input channel (mono), 1 output channel
    this.scriptProcessor = this.audioContext.createScriptProcessor(PCM_BUFFER_SIZE, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (this.stopped || this.ws?.readyState !== WebSocket.OPEN) return;

      const float32 = e.inputBuffer.getChannelData(0);

      // Convert Float32 [-1, 1] → Int16 [-32768, 32767] (little-endian linear16)
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const clamped = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
      }

      try {
        this.ws!.send(int16.buffer);
      } catch (err) {
        console.error("[MeetFlow] PCM send error:", err);
      }
    };

    // ScriptProcessor must be connected to the audio graph (including
    // destination) for onaudioprocess to fire. Use a zero-gain node so the
    // combined audio is NOT played back through the device speakers.
    this.silentGain = this.audioContext.createGain();
    this.silentGain.gain.value = 0;

    this.sourceNode.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.silentGain);
    this.silentGain.connect(this.audioContext.destination);

    console.log("[MeetFlow] PCM capture started (linear16 @ 16 kHz, 4096-sample chunks)");
  }

  async stop(): Promise<void> {
    // FIX 1: set FIRST — every async callback checks this before acting
    this.stopped = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Disconnect PCM capture nodes before closing the AudioContext
    this.scriptProcessor?.disconnect();
    this.scriptProcessor = null;
    this.sourceNode?.disconnect();
    this.sourceNode = null;
    this.silentGain?.disconnect();
    this.silentGain = null;

    this.combinedStream?.getTracks().forEach((t) => t.stop());
    this.combinedStream = null;

    // FIX 2: close AudioContext to fully release audio hardware
    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close().catch(() => { });
    }
    this.audioContext = null;

    // Close WS last — onclose fires but stopped=true so it's a no-op
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        try { this.ws.send(JSON.stringify({ type: "end" })); } catch { /* ok */ }
        this.ws.close(1000, "Stream ended");
      }
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
