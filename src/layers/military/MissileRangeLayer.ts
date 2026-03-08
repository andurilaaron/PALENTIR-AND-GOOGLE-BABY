/**
 * MissileRangeLayer — draws concentric threat rings around known SAM/missile
 * system locations sourced from Jane's / open-source intelligence.
 *
 * Hostile (Iran, Russia): semi-transparent red fill
 * Friendly (Israel, Saudi Arabia, UAE, Turkey): semi-transparent blue fill
 */
import type { Viewer } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
    TimeAwareness,
} from "../../core/LayerPlugin.ts";

interface ThreatSystem {
    name: string;
    range: number; // km
    lat: number;
    lon: number;
    country: string;
}

const THREAT_SYSTEMS: ThreatSystem[] = [
    // Iran
    { name: "S-300PMU2",    range: 200,  lat: 33.72, lon: 51.44, country: "Iran" },
    { name: "Bavar-373",    range: 300,  lat: 32.65, lon: 51.66, country: "Iran" },
    { name: "Sayyad-4C",    range: 150,  lat: 35.69, lon: 51.39, country: "Iran" },
    { name: "TOR-M1",       range: 12,   lat: 33.51, lon: 51.93, country: "Iran" },
    { name: "Khordad-15",   range: 75,   lat: 34.88, lon: 51.59, country: "Iran" },
    // Israel
    { name: "Iron Dome",    range: 70,   lat: 31.25, lon: 34.79, country: "Israel" },
    { name: "David's Sling",range: 300,  lat: 31.90, lon: 34.81, country: "Israel" },
    { name: "Arrow-3",      range: 2400, lat: 31.90, lon: 34.81, country: "Israel" },
    // Turkey
    { name: "S-400 (TUR)",  range: 400,  lat: 39.93, lon: 32.86, country: "Turkey" },
    // Saudi Arabia
    { name: "PATRIOT PAC-3",range: 160,  lat: 24.07, lon: 47.58, country: "Saudi Arabia" },
    { name: "THAAD",        range: 200,  lat: 21.67, lon: 39.15, country: "Saudi Arabia" },
    // Russia (Syria)
    { name: "S-400 (RUS)",  range: 400,  lat: 35.41, lon: 35.95, country: "Russia" },
    { name: "S-300V4",      range: 250,  lat: 34.80, lon: 36.10, country: "Russia" },
    // UAE
    { name: "PATRIOT (UAE)",range: 160,  lat: 24.25, lon: 54.55, country: "UAE" },
    { name: "THAAD (UAE)",  range: 200,  lat: 24.25, lon: 54.55, country: "UAE" },
];

const HOSTILE_COUNTRIES = new Set(["Iran", "Russia"]);

export class MissileRangeLayer implements LayerPlugin {
    readonly id = "missile-ranges";
    readonly label = "Threat Rings";
    readonly category: LayerCategory = "custom";
    readonly icon = "\uD83C\uDFAF"; // 🎯
    readonly source = "Jane's / OSINT";
    readonly timeAware: TimeAwareness = "none";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount?: number;

    private entityIds: string[] = [];

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");
        this.status = "loading";

        for (const sys of THREAT_SYSTEMS) {
            const isHostile = HOSTILE_COUNTRIES.has(sys.country);

            // ── ring fill color ────────────────────────────────────────
            const fillColor = isHostile
                ? new Cesium.Color(0.94, 0.27, 0.27, 0.06)   // red, alpha 0.06
                : new Cesium.Color(0.27, 0.56, 0.94, 0.06);   // blue, alpha 0.06

            const outlineColor = isHostile
                ? new Cesium.Color(0.94, 0.27, 0.27, 0.3)
                : new Cesium.Color(0.27, 0.56, 0.94, 0.3);

            const radiusM = sys.range * 1000;

            // ── ellipse (range ring) ───────────────────────────────────
            const ringId = `mr-ring-${sys.name.replace(/[^A-Za-z0-9]/g, "_")}`;
            viewer.entities.add({
                id: ringId,
                position: Cesium.Cartesian3.fromDegrees(sys.lon, sys.lat),
                ellipse: {
                    semiMajorAxis: radiusM,
                    semiMinorAxis: radiusM,
                    material: fillColor,
                    outline: true,
                    outlineColor,
                    outlineWidth: 1,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                },
            });
            this.entityIds.push(ringId);

            // ── label at center ────────────────────────────────────────
            const labelId = `mr-label-${sys.name.replace(/[^A-Za-z0-9]/g, "_")}`;
            viewer.entities.add({
                id: labelId,
                position: Cesium.Cartesian3.fromDegrees(sys.lon, sys.lat),
                label: {
                    text: `${sys.name}\n${sys.range}km`,
                    font: "10px ui-monospace, SFMono-Regular, monospace",
                    fillColor: isHostile
                        ? new Cesium.Color(1.0, 0.55, 0.55, 0.9)
                        : new Cesium.Color(0.55, 0.78, 1.0, 0.9),
                    outlineColor: Cesium.Color.BLACK.withAlpha(0.7),
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.CENTER,
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    pixelOffset: new Cesium.Cartesian2(0, 0),
                    showBackground: false,
                },
            });
            this.entityIds.push(labelId);

            // ── point at system location ───────────────────────────────
            const pointId = `mr-point-${sys.name.replace(/[^A-Za-z0-9]/g, "_")}`;
            viewer.entities.add({
                id: pointId,
                position: Cesium.Cartesian3.fromDegrees(sys.lon, sys.lat),
                point: {
                    pixelSize: 6,
                    color: isHostile
                        ? new Cesium.Color(0.94, 0.27, 0.27, 1.0)
                        : new Cesium.Color(0.27, 0.56, 0.94, 1.0),
                    outlineColor: Cesium.Color.BLACK.withAlpha(0.6),
                    outlineWidth: 1,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                },
            });
            this.entityIds.push(pointId);
        }

        this.entityCount = this.entityIds.length;
        this.status = "ready";
        console.log(
            `[MissileRangeLayer] Added ${THREAT_SYSTEMS.length} threat systems (${this.entityIds.length} entities)`
        );
    }

    onRemove(viewer: Viewer): void {
        for (const id of this.entityIds) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        this.entityIds = [];
        this.entityCount = 0;
        this.status = "idle";
    }
}

/** Exported constant so ThreatAssessmentPanel can read system data without
 *  needing a viewer instance. */
export { THREAT_SYSTEMS };
