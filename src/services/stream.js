const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001";
const CHUNK_INTERVAL_MS = 250;
export class AudioStreamService {
    meetingId;
    token;
    onEvent;
    ws = null;
    mediaRecorder = null;
    combinedStream = null;
    audioContext = null;
    reconnectTimer = null;
    reconnectAttempts = 0;
    maxReconnects = 5;
    // FIX 1: explicit stopped flag — root cause of "stop → 2s → back to recording".
    // When stop() closes the WS, ws.onclose fires and calls attemptReconnect().
    // Without this flag nothing distinguishes a deliberate stop from a network
    // drop, so reconnect fires, WS reopens, "connected" event fires, and the UI
    // flips back to "live" ~2 seconds later.
    stopped = false;
    constructor(meetingId, token, onEvent) {
        this.meetingId = meetingId;
        this.token = token;
        this.onEvent = onEvent;
    }
    async startCapture() {
        this.stopped = false;
        try {
            const tabAudio = await this.captureTabAudio();
            const micAudio = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
                video: false,
            });
            // FIX 2: store AudioContext so we can close() it in stop() and fully
            // release audio hardware (stops the browser recording indicator).
            this.audioContext = new (window.AudioContext ||
                window.webkitAudioContext)({ sampleRate: 16000 });
            const dest = this.audioContext.createMediaStreamDestination();
            dest.channelCount = 1; // mono for STT
            if (tabAudio)
                this.audioContext.createMediaStreamSource(tabAudio).connect(dest);
            this.audioContext.createMediaStreamSource(micAudio).connect(dest);
            if (this.audioContext.state === "suspended")
                await this.audioContext.resume();
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
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
                // @ts-ignore
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
            console.warn("[MeetFlow] System audio capture failed:", err);
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
            this.ws.onerror = () => {
                if (!this.stopped)
                    this.onEvent({ type: "error", message: "WebSocket error" });
                reject(new Error("WebSocket error"));
            };
            this.ws.onclose = () => {
                // FIX 1: only reconnect when we have NOT deliberately stopped
                if (!this.stopped) {
                    this.onEvent({ type: "disconnected" });
                    this.attemptReconnect();
                }
            };
            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this.onEvent(msg);
                }
                catch { /* ignore */ }
            };
        });
    }
    attemptReconnect() {
        if (this.stopped || this.reconnectAttempts >= this.maxReconnects)
            return;
        this.reconnectAttempts++;
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
        this.reconnectTimer = setTimeout(() => {
            if (!this.stopped)
                this.connectWebSocket();
        }, delay);
    }
    startMediaRecorder() {
        if (!this.combinedStream)
            return;
        const PREFERRED = ["audio/webm;codecs=opus", "audio/webm"];
        const mimeType = PREFERRED.find((t) => MediaRecorder.isTypeSupported(t)) ?? "audio/webm";
        this.mediaRecorder = new MediaRecorder(this.combinedStream, {
            mimeType,
            audioBitsPerSecond: 32_000,
        });
        console.log(`[MeetFlow] MediaRecorder mimeType: ${this.mediaRecorder.mimeType}`);
        let sendQueue = Promise.resolve();
        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size === 0 || this.stopped)
                return;
            if (this.ws?.readyState !== WebSocket.OPEN)
                return;
            sendQueue = sendQueue.then(async () => {
                try {
                    if (!this.stopped && this.ws?.readyState === WebSocket.OPEN) {
                        const buf = await e.data.arrayBuffer();
                        this.ws.send(buf);
                    }
                }
                catch (err) {
                    console.error("[MeetFlow] Chunk send error:", err);
                }
            });
        };
        this.mediaRecorder.start(CHUNK_INTERVAL_MS);
    }
    async stop() {
        // FIX 1: set FIRST — every async callback checks this before acting
        this.stopped = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
            this.mediaRecorder.stop();
        }
        this.mediaRecorder = null;
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
                try {
                    this.ws.send(JSON.stringify({ type: "end" }));
                }
                catch { /* ok */ }
                this.ws.close(1000, "Stream ended");
            }
            this.ws = null;
        }
    }
    get isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}
