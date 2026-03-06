import { useEffect, useRef, useState } from "react";
import type { Viewer } from "cesium";
import { ViewerProvider } from "./core/ViewerContext.tsx";
import { LayerRegistry } from "./core/LayerRegistry.ts";
import { GoogleTilesLayer } from "./layers/tiles/index.ts";
import { FlightLayer, MilitaryFlightLayer } from "./layers/flights/index.ts";
import { SatelliteLayer } from "./layers/satellites/index.ts";
import { EarthquakeLayer } from "./layers/earthquakes/index.ts";
import { TrafficLayer, TrafficParticleLayer } from "./layers/traffic/index.ts";
import { StreetTrafficLayer } from "./layers/traffic/StreetTrafficLayer.ts";
import { CCTVLayer } from "./layers/cctv/index.ts";
import { WeatherRadarLayer } from "./layers/weather/WeatherRadarLayer.ts";
import { SatelliteImageryLayer } from "./layers/imagery/index.ts";
import { CrimeLayer } from "./layers/crime/CrimeLayer.ts";
import { VehicleDetectionLayer } from "./layers/detection/index.ts";
import { createPostFxEngine } from "./postfx/index.ts";
import type { PostFxEngine } from "./postfx/index.ts";
import { ClockController } from "./features/playback/index.ts";
import { LayerPanel } from "./ui/LayerPanel.tsx";
import { PostFxPanel } from "./ui/PostFxPanel.tsx";
import { PlaybackBar } from "./features/playback/index.ts";
import { ShotPlannerPanel } from "./features/shot-planner/ShotPlannerPanel.tsx";
import { EntityInspector } from "./ui/EntityInspector.tsx";
import type { InspectedEntity } from "./ui/EntityInspector.tsx";
import { CCTVFeedPanel } from "./ui/CCTVFeedPanel.tsx";
import type { CCTVCamera } from "./layers/cctv/cctvData.ts";

declare global {
    interface Window {
        CESIUM_BASE_URL?: string;
    }
}

export default function App() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [viewer, setViewer] = useState<Viewer | null>(null);
    const [pfxEngine, setPfxEngine] = useState<PostFxEngine | null>(null);
    const [inspectedEntity, setInspectedEntity] = useState<InspectedEntity | null>(null);

    // Derive selected CCTV camera from inspected entity
    const cctvRecord: CCTVCamera | null =
        inspectedEntity?.type === "cctv"
            ? (inspectedEntity.properties.record as CCTVCamera) ?? null
            : null;
    const cctvId = cctvRecord ? inspectedEntity!.id : null;

    useEffect(() => {
        if (!containerRef.current) return;

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

            LayerRegistry.attach(v);

            // Register all layers
            LayerRegistry.register(new GoogleTilesLayer());
            LayerRegistry.register(new FlightLayer());
            LayerRegistry.register(new MilitaryFlightLayer());
            LayerRegistry.register(new EarthquakeLayer());
            LayerRegistry.register(new SatelliteLayer());
            LayerRegistry.register(new WeatherRadarLayer());
            LayerRegistry.register(new SatelliteImageryLayer());
            LayerRegistry.register(new CrimeLayer());
            LayerRegistry.register(new TrafficLayer());
            LayerRegistry.register(new StreetTrafficLayer());
            LayerRegistry.register(new TrafficParticleLayer());
            LayerRegistry.register(new CCTVLayer());
            LayerRegistry.register(new VehicleDetectionLayer());

            // Initialize clock controller after layers are registered
            await ClockController.attach(v);

            const engine = createPostFxEngine(v);
            setPfxEngine(engine);

            // Unified entity selection listener
            v.selectedEntityChanged.addEventListener((entity) => {
                if (!entity || !entity.properties) {
                    setInspectedEntity(null);
                    return;
                }

                const now = Cesium.JulianDate.now();
                const props: Record<string, any> = {};

                // Flatten all Cesium PropertyBag values
                if (entity.properties) {
                    const names = entity.properties.propertyNames;
                    for (const key of names) {
                        const val = entity.properties[key];
                        props[key] = val?.getValue ? val.getValue(now) : val;
                    }
                }

                // Determine entity type from flags
                let type: InspectedEntity["type"] = "unknown";
                if (props.isFlight) {
                    const record = props.record;
                    // Differentiate civilian vs. military by entity ID prefix
                    const isMil = entity.id?.startsWith("mil-flight-");
                    type = isMil ? "military-flight" : "flight";
                    // Merge record fields directly into props for display
                    if (record && typeof record === "object") {
                        Object.assign(props, record);
                    }
                } else if (props.isSatellite) {
                    type = "satellite";
                    const record = props.record;
                    if (record && typeof record === "object") {
                        Object.assign(props, {
                            name: record.name,
                            id: record.id,
                            orbitCategory: record.orbitCategory,
                        });
                    }
                } else if (props.isEarthquake) {
                    type = "earthquake";
                } else if (props.isCCTV) {
                    type = "cctv";
                    const record = props.record;
                    if (record && typeof record === "object") {
                        Object.assign(props, record);
                    }
                } else if (props.isCrime) {
                    type = "crime";
                } else if (props.isDetection) {
                    type = "detection";
                }

                setInspectedEntity({
                    id: entity.id ?? "unknown",
                    name: entity.name ?? props.callsign ?? props.name ?? entity.id ?? "",
                    type,
                    properties: props,
                });
            });

            setViewer(v);
        })();

        return () => {
            cancelled = true;
            if (v) {
                pfxEngine?.destroy();
                ClockController.detach();
                LayerRegistry.detach();
                v.destroy();
            }
        };
    }, []);

    return (
        <ViewerProvider viewer={viewer}>
            <div id="palentir-app">
                <div ref={containerRef} id="cesium-container" />

                <LayerPanel />
                <PostFxPanel engine={pfxEngine} />
                <CCTVFeedPanel
                    cameraId={cctvId}
                    record={cctvRecord}
                    onClose={() => setInspectedEntity(null)}
                />
                <ShotPlannerPanel />
                <PlaybackBar />

                {/* Unified entity inspector — handles ALL entity types */}
                <EntityInspector
                    entity={inspectedEntity}
                    onClose={() => setInspectedEntity(null)}
                />
            </div>
        </ViewerProvider>
    );
}
