/**
 * ZoomControls — Zoom in/out buttons + home view reset.
 * Fixed right side of the viewport.
 */
import { useViewer } from "../core/ViewerContext.tsx";
import "./styles/zoom-controls.css";

export function ZoomControls() {
    const viewer = useViewer();

    const handleZoomIn = () => {
        if (!viewer) return;
        const cam = viewer.camera;
        const height = cam.positionCartographic.height;
        cam.zoomIn(height * 0.4);
    };

    const handleZoomOut = () => {
        if (!viewer) return;
        const cam = viewer.camera;
        const height = cam.positionCartographic.height;
        cam.zoomOut(height * 0.6);
    };

    const handleHome = () => {
        if (!viewer) return;
        viewer.camera.flyHome(1.5);
    };

    return (
        <div className="zc">
            <button className="zc__btn" onClick={handleZoomIn} title="Zoom in" aria-label="Zoom in">
                +
            </button>
            <button className="zc__btn" onClick={handleZoomOut} title="Zoom out" aria-label="Zoom out">
                &minus;
            </button>
            <div className="zc__divider" />
            <button className="zc__btn zc__btn--home" onClick={handleHome} title="Reset view" aria-label="Reset view">
                &#x2302;
            </button>
        </div>
    );
}
