// src/services/stream.ts
// T1.3: Dual-stream audio capture (tabCapture + getUserMedia)
// B1.1: WebSocket connection to backend STT server
const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001";
const CHUNK_INTERVAL_MS = 250; // send audio every 250ms for low latency
export class AudioStreamService {
    meetingId;
    token;
    onEvent;
    ws = null;
    mediaRecorder = null;
    combinedStream = null;
    reconnectTimer = null;
    reconnectAttempts = 0;
    maxReconnects = 5;
    constructor(meetingId, token, onEvent) {
        this.meetingId = meetingId;
        this.token = token;
        this.onEvent = onEvent;
    }
    // ── T1.3: Capture both system audio (tab) + microphone ─────────────────────
    async startCapture() {
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
            const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const dest = ctx.createMediaStreamDestination();
            dest.channelCount = 1; // Force mono for better STT recognition
            if (tabAudio) {
                ctx.createMediaStreamSource(tabAudio).connect(dest);
            }
            ctx.createMediaStreamSource(micAudio).connect(dest);
            // AudioContext often starts suspended in browsers
            if (ctx.state === "suspended") {
                await ctx.resume();
            }
            this.combinedStream = dest.stream;
            await this.connectWebSocket();
            this.startMediaRecorder();
        }
        catch (err) {
            this.onEvent({ type: "error", message: err.message });
            throw err;
        }
    }
    async captureTabAudio() {
        try {
            // getDisplayMedia requires video: true to show the picker.
            // systemAudio: "include" hints to Chrome to show the system audio checkbox.
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    // systemAudio is a non-standard hint for some Chrome versions
                },
                // @ts-ignore - non-standard Chrome hint
                systemAudio: "include",
            });
            // User selected a tab/screen — filter video tracks to save bandwidth/CPU
            stream.getVideoTracks().forEach((t) => t.stop());
            // Check if user actually shared audio
            if (stream.getAudioTracks().length === 0) {
                stream.getTracks().forEach((t) => t.stop());
                return null;
            }
            return stream;
        }
        catch (err) {
            console.warn("[MeetFlow] System audio capture denied or failed:", err);
            return null;
        }
    }
    // ── B1.1: WebSocket connection with reconnect logic ─────────────────────────
    connectWebSocket() {
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
                    const msg = JSON.parse(event.data);
                    this.onEvent(msg);
                }
                catch {
                    // ignore malformed frames
                }
            };
        });
    }
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnects)
            return;
        this.reconnectAttempts++;
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
        this.reconnectTimer = setTimeout(() => this.connectWebSocket(), delay);
    }
    // ── Send audio chunks as binary frames ────────────────────────────────────
    startMediaRecorder() {
        if (!this.combinedStream)
            return;
        // Use audio/webm;codecs=opus — good compression, Deepgram-compatible
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm";
        this.mediaRecorder = new MediaRecorder(this.combinedStream, {
            mimeType,
            audioBitsPerSecond: 16000,
        });
        console.log(`[MeetFlow] MediaRecorder started with mimeType: ${this.mediaRecorder.mimeType}`);
        let sendQueue = Promise.resolve();
        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
                // Sequentially queue the ArrayBuffer conversion and sending
                sendQueue = sendQueue.then(async () => {
                    try {
                        if (this.ws?.readyState === WebSocket.OPEN) {
                            const buf = await e.data.arrayBuffer();
                            this.ws.send(buf); // ArrayBuffer directly
                        }
                    }
                    catch (err) {
                        console.error("[MeetFlow] Error sending audio chunk:", err);
                    }
                });
            }
        };
        this.mediaRecorder.start(CHUNK_INTERVAL_MS);
    }
    async stop() {
        if (this.reconnectTimer)
            clearTimeout(this.reconnectTimer);
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
    get isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}
