/**
 * ScreenRecorder — captures the Cesium canvas + UI overlay as a WebM video.
 *
 * Uses captureStream on the Cesium canvas and MediaRecorder API.
 * Downloads the file when stopped.
 */

export class ScreenRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private chunks: Blob[] = [];
    private recording = false;

    isRecording(): boolean {
        return this.recording;
    }

    /** Start recording the canvas */
    start(canvas: HTMLCanvasElement): boolean {
        if (this.recording) return false;

        try {
            const stream = canvas.captureStream(30); // 30fps
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: "video/webm;codecs=vp9",
                videoBitsPerSecond: 8_000_000, // 8 Mbps
            });

            this.chunks = [];
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.chunks.push(e.data);
            };

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.chunks, { type: "video/webm" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `palentir-capture-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.chunks = [];
                console.log("[ScreenRecorder] Recording saved");
            };

            this.mediaRecorder.start(1000); // 1s timeslice
            this.recording = true;
            console.log("[ScreenRecorder] Recording started");
            return true;
        } catch (err) {
            console.error("[ScreenRecorder] Failed to start:", err);
            return false;
        }
    }

    /** Stop recording and trigger download */
    stop(): void {
        if (!this.recording || !this.mediaRecorder) return;
        this.mediaRecorder.stop();
        this.recording = false;
        console.log("[ScreenRecorder] Recording stopped");
    }
}

export const screenRecorder = new ScreenRecorder();
