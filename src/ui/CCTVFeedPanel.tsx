/**
 * CCTVFeedPanel — floating camera feed viewer.
 *
 * Shows an embedded live stream (iframe) when a CCTV camera with a
 * streamUrl is selected, or a styled "NO SIGNAL" placeholder otherwise.
 * Positioned top-right, offset below the PostFxPanel.
 */
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

export function CCTVFeedPanel({ cameraId, record, onClose }: CCTVFeedPanelProps) {
    if (!cameraId || !record) return null;

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
                    {record.streamUrl ? (
                        <iframe
                            key={cameraId}
                            src={record.streamUrl}
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            title={`${record.name} live feed`}
                        />
                    ) : (
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
