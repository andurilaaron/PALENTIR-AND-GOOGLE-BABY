/**
 * MilitaryBaseLayer — renders military installations as red diamond billboard markers.
 *
 * Data source: OpenStreetMap (static snapshot in server/data/military-bases.json).
 * Each installation is shown as a red SVG diamond icon with a bold monospace label below.
 */
import type { Viewer } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";

interface MilitaryBase {
    name: string;
    country: string;
    type: string;
    branch: string;
    lat: number;
    lon: number;
}

/** Inline SVG red diamond, returned as a data URL for use in a Cesium billboard. */
function createDiamondIcon(): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
  <polygon points="10,1 19,10 10,19 1,10" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.5" opacity="0.9"/>
  <polygon points="10,4 16,10 10,16 4,10" fill="#fca5a5" opacity="0.4"/>
</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export class MilitaryBaseLayer implements LayerPlugin {
    readonly id = "military-bases";
    readonly label = "Military Installations";
    readonly category: LayerCategory = "custom";
    readonly icon = "🏛️";
    readonly source = "OpenStreetMap";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount = 0;

    private entityIds: string[] = [];
    private readonly diamondIcon = createDiamondIcon();

    async onAdd(viewer: Viewer): Promise<void> {
        this.status = "loading";

        const Cesium = await import("cesium");

        let bases: MilitaryBase[] = [];
        try {
            const res = await fetch("/api/data/military-bases");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            bases = await res.json();
        } catch (err) {
            console.error("[MilitaryBaseLayer] Failed to fetch data:", err);
            this.status = "error";
            return;
        }

        const labelColor = Cesium.Color.fromCssColorString("#ef4444");
        const labelBg = Cesium.Color.fromCssColorString("#0a101c").withAlpha(0.8);

        for (const base of bases) {
            const id = `military-${base.name.replace(/[^a-zA-Z0-9]/g, "-")}`;

            viewer.entities.add({
                id,
                name: base.name,
                position: Cesium.Cartesian3.fromDegrees(base.lon, base.lat, 50),
                billboard: {
                    image: this.diamondIcon,
                    width: 20,
                    height: 20,
                    verticalOrigin: Cesium.VerticalOrigin.CENTER,
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
                label: {
                    text: base.name,
                    font: "bold 11px monospace",
                    fillColor: labelColor,
                    backgroundColor: labelBg,
                    showBackground: true,
                    backgroundPadding: new Cesium.Cartesian2(6, 4),
                    style: Cesium.LabelStyle.FILL,
                    verticalOrigin: Cesium.VerticalOrigin.TOP,
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    pixelOffset: new Cesium.Cartesian2(0, 14),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 4_000_000),
                },
                properties: {
                    isMilitaryBase: true,
                    name: base.name,
                    country: base.country,
                    type: base.type,
                    branch: base.branch,
                },
            });

            this.entityIds.push(id);
        }

        this.entityCount = bases.length;
        this.status = "ready";
        console.log(`[MilitaryBaseLayer] Loaded ${bases.length} installations`);
    }

    onRemove(viewer: Viewer): void {
        for (const id of this.entityIds) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        this.entityIds = [];
        this.entityCount = 0;
        this.status = "idle";
        console.log("[MilitaryBaseLayer] Removed");
    }
}
