import { useEffect, useRef, useState } from "react";
import type { Viewer } from "cesium";
import { ViewerProvider } from "./core/ViewerContext.tsx";
import { LayerRegistry } from "./core/LayerRegistry.ts";
import { DummyLayer } from "./core/DummyLayer.ts";
import { GoogleTilesLayer } from "./layers/tiles/index.ts";
import { LayerPanel } from "./ui/LayerPanel.tsx";

declare global {
    interface Window {
        CESIUM_BASE_URL?: string;
    }
}

export default function App() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [viewer, setViewer] = useState<Viewer | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Point Cesium at local static assets (no CDN)
        window.CESIUM_BASE_URL = "/cesium/";

        let v: Viewer | undefined;
        let cancelled = false;

        (async () => {
            const Cesium = await import("cesium");
            if (cancelled) return;

            v = new Cesium.Viewer(containerRef.current!, {
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

            v.scene.globe.enableLighting = true;
            v.scene.fog.enabled = true;
            v.scene.postProcessStages.fxaa.enabled = true;

            // Connect the LayerRegistry to the viewer
            LayerRegistry.attach(v);

            // Register layers
            LayerRegistry.register(new DummyLayer());
            LayerRegistry.register(new GoogleTilesLayer());

            // Expose viewer to React tree
            setViewer(v);
        })();

        return () => {
            cancelled = true;
            if (v) {
                LayerRegistry.detach();
                v.destroy();
            }
        };
    }, []);

    return (
        <ViewerProvider viewer={viewer}>
            <div id="palentir-app">
                {/* Globe container — fills entire viewport */}
                <div ref={containerRef} id="cesium-container" />

                {/* UI overlays */}
                <LayerPanel />
            </div>
        </ViewerProvider>
    );
}
