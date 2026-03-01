import { useEffect, useRef, useState } from "react";
import type { Viewer } from "cesium";
import { ViewerProvider } from "./core/ViewerContext.tsx";
import { LayerRegistry } from "./core/LayerRegistry.ts";
import { DummyLayer } from "./core/DummyLayer.ts";
import { GoogleTilesLayer } from "./layers/tiles/index.ts";
import { NasaGibsLayer } from "./layers/nasa/index.ts";
import { SatelliteLayer } from "./layers/satellites/index.ts";
import { FlightLayer } from "./layers/flights/index.ts";
import { EarthquakeLayer } from "./layers/earthquakes/index.ts";
import { TrafficLayer } from "./layers/traffic/index.ts";
import { CCTVLayer } from "./layers/cctv/index.ts";
import { createPostFxEngine } from "./postfx/index.ts";
import type { PostFxEngine } from "./postfx/index.ts";
import { LayerPanel } from "./ui/LayerPanel.tsx";
import { PostFxPanel } from "./ui/PostFxPanel.tsx";
import { ShotPlannerPanel } from "./features/shot-planner/index.ts";

declare global {
    interface Window {
        CESIUM_BASE_URL?: string;
    }
}

export default function App() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [viewer, setViewer] = useState<Viewer | null>(null);
    const [pfxEngine, setPfxEngine] = useState<PostFxEngine | null>(null);

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

            // Register all layers
            LayerRegistry.register(new GoogleTilesLayer());
            LayerRegistry.register(new NasaGibsLayer());
            LayerRegistry.register(new SatelliteLayer());
            LayerRegistry.register(new FlightLayer());
            LayerRegistry.register(new EarthquakeLayer());
            LayerRegistry.register(new TrafficLayer());
            LayerRegistry.register(new CCTVLayer());
            LayerRegistry.register(new DummyLayer());

            // Initialize PostFX engine
            const engine = createPostFxEngine(v);
            setPfxEngine(engine);

            // Expose viewer to React tree
            setViewer(v);
        })();

        return () => {
            cancelled = true;
            if (v) {
                pfxEngine?.destroy();
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
                <PostFxPanel engine={pfxEngine} />
                <ShotPlannerPanel />
            </div>
        </ViewerProvider>
    );
}
