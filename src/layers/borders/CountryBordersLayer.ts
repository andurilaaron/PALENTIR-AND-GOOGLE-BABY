/**
 * CountryBordersLayer — renders country border outlines from Natural Earth GeoJSON.
 *
 * Uses a lightweight 110m resolution Natural Earth dataset (countries).
 * Renders polyline borders in a subtle cyan/white style, always visible.
 */
import type { Viewer, JulianDate, GeoJsonDataSource } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";

const GEOJSON_URL =
    "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

export class CountryBordersLayer implements LayerPlugin {
    readonly id = "country-borders";
    readonly label = "Country Borders";
    readonly category: LayerCategory = "custom";
    readonly icon = "\uD83C\uDF10";
    readonly source = "Natural Earth";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount?: number;
    lastRefresh?: number;

    private dataSource: GeoJsonDataSource | null = null;

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");

        this.status = "loading";

        try {
            const ds = await Cesium.GeoJsonDataSource.load(GEOJSON_URL, {
                stroke: Cesium.Color.fromCssColorString("#4a90d9").withAlpha(0.45),
                strokeWidth: 1.5,
                fill: Cesium.Color.TRANSPARENT,
                clampToGround: true,
            });

            // Override per-entity styling for a uniform look
            const entities = ds.entities.values;
            for (const entity of entities) {
                // Hide fill polygons, show only outlines
                if (entity.polygon) {
                    entity.polygon.fill = new Cesium.ConstantProperty(false);
                    entity.polygon.outline = new Cesium.ConstantProperty(true);
                    entity.polygon.outlineColor = new Cesium.ConstantProperty(
                        Cesium.Color.fromCssColorString("#4a90d9").withAlpha(0.45)
                    );
                    entity.polygon.outlineWidth = new Cesium.ConstantProperty(1);
                }
                // Hide labels/points that GeoJSON may add
                if (entity.label) entity.label.show = new Cesium.ConstantProperty(false);
                if (entity.billboard) entity.billboard.show = new Cesium.ConstantProperty(false);
            }

            viewer.dataSources.add(ds);
            this.dataSource = ds;

            this.entityCount = entities.length;
            this.lastRefresh = Date.now();
            this.status = "ready";

            console.log(
                `[CountryBordersLayer] Loaded ${entities.length} country borders`
            );
        } catch (err) {
            console.error("[CountryBordersLayer] Failed to load:", err);
            this.status = "error";
            throw err;
        }
    }

    onRemove(viewer: Viewer): void {
        if (this.dataSource) {
            viewer.dataSources.remove(this.dataSource, true);
            this.dataSource = null;
        }
        this.entityCount = undefined;
        this.lastRefresh = undefined;
        this.status = "idle";
        console.log("[CountryBordersLayer] Removed");
    }

    onTick(_viewer: Viewer, _time: JulianDate): void {
        // Static layer — no per-tick updates needed
    }
}
