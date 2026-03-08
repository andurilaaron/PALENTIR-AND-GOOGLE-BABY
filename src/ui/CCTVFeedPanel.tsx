/**
 * CCTVFeedPanel — floating camera feed viewer.
 *
 * Shows an embedded live stream (iframe) when a CCTV camera with a
 * streamUrl is selected, or a styled "NO SIGNAL" placeholder otherwise.
 * Positioned top-right, offset below the PostFxPanel.
 *
 * Error handling:
 *  - If the iframe fails to load, a 3-second "RECONNECTING..." state is
 *    shown before falling back to the NO SIGNAL placeholder.
 *  - Active streams show a pulsing REC indicator in the top-left corner.
 */
import { useState, useEffect } from "react";
import type { CCTVCamera } from "../layers/cctv/cctvData.ts";
import "./styles/cctv-feed.css";

interface CCTVFeedPanelProps {
    cameraId: string | null;
    record: CCTVCamera | null;
    onClose: () => void;
}

const STATUS_BADGE: Record<CCTVCamera["status"], string> = {
    online: "",
    offline: "cv__badge--offline",
    maintenance: "cv__badge--maintenance",
};

type FeedState = "streaming" | "reconnecting" | "no-signal";

export function CCTVFeedPanel({ cameraId, record, onClose }: CCTVFeedPanelProps) {
    const [feedState, setFeedState] = useState<FeedState>(
        record?.streamUrl ? "streaming" : "no-signal"
    );

    // Reset feed state whenever the selected camera changes.
    useEffect(() => {
        setFeedState(record?.streamUrl ? "streaming" : "no-signal");
    }, [cameraId, record?.streamUrl]);

    if (!cameraId || !record) return null;

    function handleIframeError() {
        setFeedState("reconnecting");
        setTimeout(() => setFeedState("no-signal"), 3000);
    }

    const showIframe = record.streamUrl && feedState === "streaming";
    const showReconnecting = feedState === "reconnecting";
    const showNoSignal = !record.streamUrl || feedState === "no-signal";

    return (
        <div className="cv-anchor">
            <div className="cv">
                {/* Header */}
                <div className="cv__header">
                    <div className="cv__header-left">
                        <span className={`cv__status-dot cv__status-dot--${record.status}`} />
                        <span className="cv__title">{record.name}</span>
                    </div>
                    <button className="cv__close" onClick={onClose} aria-label="Close feed">
                        ✕
                    </button>
                </div>

                {/* Feed area */}
                <div className="cv__feed">
                    {showIframe && (
                        <>
                            {/* REC indicator — only shown while a stream is active */}
                            <div className="cv__rec">
                                <span className="cv__rec-dot" />
                                <span className="cv__rec-label">REC</span>
                            </div>
                            <iframe
                                key={cameraId}
                                src={record.streamUrl}
                                allow="autoplay; encrypted-media"
                                allowFullScreen
                                title={`${record.name} live feed`}
                                onError={handleIframeError}
                            />
                        </>
                    )}

                    {showReconnecting && (
                        <div className="cv__placeholder">
                            <span className="cv__placeholder-icon">📡</span>
                            <span className="cv__placeholder-name">{record.name}</span>
                            <span className="cv__placeholder-label cv__placeholder-label--reconnecting">
                                RECONNECTING...
                            </span>
                        </div>
                    )}

                    {showNoSignal && (
                        <div className="cv__placeholder">
                            <span className="cv__placeholder-icon">📹</span>
                            <span className="cv__placeholder-name">{record.name}</span>
                            <span className="cv__placeholder-label">NO SIGNAL</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="cv__footer">
                    <span className="cv__meta">{record.type} · {record.location}</span>
                    <span className={`cv__badge ${STATUS_BADGE[record.status]}`}>
                        {record.status}
                    </span>
                </div>
            </div>
        </div>
    );
}
