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
    async startCapture() {
        try {
            const tabAudio = await this.captureTabAudio();
            const micAudio = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                },
                video: false,
            });
            // Merge both streams via AudioContext
            const ctx = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000,
            });
            const dest = ctx.createMediaStreamDestination();
            dest.channelCount = 1; // mono for STT
            if (tabAudio) {
                ctx.createMediaStreamSource(tabAudio).connect(dest);
            }
            ctx.createMediaStreamSource(micAudio).connect(dest);
            if (ctx.state === "suspended")
                await ctx.resume();
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
        }
        catch (err) {
            console.warn("[MeetFlow] System audio capture denied or failed:", err);
            return null;
        }
    }
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
    startMediaRecorder() {
        if (!this.combinedStream)
            return;
        // FIX 5: Use a proper bitrate. 16_000 bps was far too low — it caused
        // MediaRecorder to produce corrupt/malformed webm chunks. Opus at 32kbps
        // is the sweet spot: small enough for real-time streaming, high enough
        // for Deepgram nova-2 to decode reliably.
        // Also: prefer "audio/webm;codecs=opus" — without the explicit codec hint
        // some Chrome versions fall back to PCM inside webm, which needs different
        // Deepgram encoding params.
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
            if (e.data.size === 0)
                return;
            console.log(`[MeetFlow] Audio chunk: ${e.data.size} bytes`); // remove after debugging
            if (this.ws?.readyState !== WebSocket.OPEN)
                return;
            // Queue sequential sends to preserve chunk order
            sendQueue = sendQueue.then(async () => {
                try {
                    if (this.ws?.readyState === WebSocket.OPEN) {
                        const buf = await e.data.arrayBuffer();
                        this.ws.send(buf);
                    }
                }
                catch (err) {
                    console.error("[MeetFlow] Error sending audio chunk:", err);
                }
            });
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
