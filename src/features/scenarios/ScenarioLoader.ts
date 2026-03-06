/**
 * ScenarioLoader — loads a scenario into the viewer.
 *
 * Sets time range, seeks clock, enables layers, flies camera,
 * and places target marker entities with pulsing rings.
 */
import type { Viewer } from "cesium";
import type { Scenario } from "./types.ts";
import { ClockController } from "../playback/ClockController.ts";
import { LayerRegistry } from "../../core/LayerRegistry.ts";

const TARGET_PREFIX = "scenario-target-";

export class ScenarioLoader {
    private static activeScenarioId: string | null = null;
    private static markerIds: string[] = [];

    /** Load a scenario into the viewer */
    static async load(viewer: Viewer, scenario: Scenario): Promise<void> {
        const Cesium = await import("cesium");

        // Clear any previous scenario markers
        ScenarioLoader.clearMarkers(viewer);

        // 1. Set time range and seek
        ClockController.setRange(scenario.startIso, scenario.stopIso);
        ClockController.seekTo(scenario.seekIso);
        ClockController.pause();

        // 2. Enable required layers
        for (const layerId of scenario.enableLayers) {
            const layer = LayerRegistry.getById(layerId);
            if (layer && !layer.enabled) {
                await LayerRegistry.enableLayer(layerId);
            }
        }

        // 3. Place target markers
        const categoryStyles = {
            primary: {
                color: Cesium.Color.fromCssColorString("#ef4444"),
                size: 14,
                ringSize: 50,
            },
            secondary: {
                color: Cesium.Color.fromCssColorString("#f59e0b"),
                size: 10,
                ringSize: 35,
            },
            interest: {
                color: Cesium.Color.fromCssColorString("#22d3ee"),
                size: 8,
                ringSize: 25,
            },
        };

        for (const target of scenario.targets) {
            const style = categoryStyles[target.category];
            const eid = `${TARGET_PREFIX}${target.label}`;

            viewer.entities.add({
                id: eid,
                name: target.label,
                position: Cesium.Cartesian3.fromDegrees(target.lon, target.lat),
                point: {
                    pixelSize: style.size,
                    color: style.color.withAlpha(0.9),
                    outlineColor: style.color.withAlpha(0.3),
                    outlineWidth: style.ringSize,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
                label: {
                    text: target.label,
                    font: "bold 12px ui-monospace, SFMono-Regular, monospace",
                    fillColor: style.color,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 3,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -20),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
                properties: {
                    isScenarioTarget: true,
                    category: target.category,
                    scenario: scenario.id,
                },
            });

            ScenarioLoader.markerIds.push(eid);
        }

        // 4. Fly camera to scenario overview
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                scenario.camera.lon,
                scenario.camera.lat,
                scenario.camera.altitude
            ),
            orientation: {
                heading: Cesium.Math.toRadians(scenario.camera.heading),
                pitch: Cesium.Math.toRadians(scenario.camera.pitch),
                roll: 0,
            },
            duration: 3,
        });

        ScenarioLoader.activeScenarioId = scenario.id;
        console.log(`[ScenarioLoader] Loaded scenario: ${scenario.codename}`);
    }

    /** Remove all scenario markers from the viewer */
    static clearMarkers(viewer: Viewer): void {
        for (const id of ScenarioLoader.markerIds) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        ScenarioLoader.markerIds = [];
        ScenarioLoader.activeScenarioId = null;
    }

    static getActiveScenarioId(): string | null {
        return ScenarioLoader.activeScenarioId;
    }
}
