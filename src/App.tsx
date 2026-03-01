import { useEffect, useRef } from "react";

declare global {
    interface Window {
        CESIUM_BASE_URL?: string;
    }
}

export default function App() {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Point Cesium at local static assets (no CDN)
        window.CESIUM_BASE_URL = "/cesium/";

        let viewer: InstanceType<typeof import("cesium").Viewer> | undefined;
        let cancelled = false;

        (async () => {
            const Cesium = await import("cesium");
            if (cancelled) return;

            viewer = new Cesium.Viewer(containerRef.current!, {
                animation: false,
                timeline: false,
                baseLayerPicker: false,
                geocoder: false,
                sceneModePicker: false,
                navigationHelpButton: false,
                fullscreenButton: false,
                infoBox: false,
                selectionIndicator: false,
                shouldAnimate: true,
            });

            viewer.scene.globe.enableLighting = true;
            viewer.scene.fog.enabled = true;
            viewer.scene.postProcessStages.fxaa.enabled = true;
        })();

        return () => {
            cancelled = true;
            if (viewer) viewer.destroy();
        };
    }, []);

    return (
        <div id="palentir-app">
            {/* Globe container — fills entire viewport */}
            <div ref={containerRef} id="cesium-container" />
        </div>
    );
}
