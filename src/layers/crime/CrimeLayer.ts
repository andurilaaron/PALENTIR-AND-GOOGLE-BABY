import type { Viewer } from "cesium";
import type { LayerPlugin, LayerCategory, LayerStatus } from "../../core/LayerPlugin.ts";

export class CrimeLayer implements LayerPlugin {
    readonly id = "crime-abs";
    readonly label = "Crime Map (ABS)";
    readonly category: LayerCategory = "custom";
    readonly icon = "🚨";
    readonly source = "abs.gov.au";

    enabled = false;
    status: LayerStatus = "idle";
    entityCount?: number;
    lastRefresh?: number;

    private entityIds: string[] = [];

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");
        this.status = "loading";

        // Mock hotspots mapped roughly to large Australian metro areas
        const hotspots = [
            { name: "Sydney, NSW", lat: -33.8688, lon: 151.2093, weight: 150 },
            { name: "Melbourne, VIC", lat: -37.8136, lon: 144.9631, weight: 120 },
            { name: "Brisbane, QLD", lat: -27.4698, lon: 153.0251, weight: 100 },
            { name: "Perth, WA", lat: -31.9505, lon: 115.8605, weight: 80 },
            { name: "Adelaide, SA", lat: -34.9285, lon: 138.6007, weight: 60 }
        ];

        let idCounter = 0;

        // Spread points in a Gaussian-like distribution around city centers
        for (const city of hotspots) {
            for (let i = 0; i < city.weight; i++) {
                const u1 = Math.random();
                const u2 = Math.random();

                // radius scale 0.1 to 0.4 roughly covers metro bounds
                const r = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * 0.15;
                const theta = Math.random() * 2 * Math.PI;

                const dLat = r * Math.sin(theta);
                const dLon = r * Math.cos(theta);

                const id = `crime-${idCounter++}`;

                viewer.entities.add({
                    id,
                    name: "ABS Crime Incident",
                    position: Cesium.Cartesian3.fromDegrees(city.lon + dLon, city.lat + dLat, 100),
                    point: {
                        pixelSize: 6,
                        color: Cesium.Color.ORANGERED.withAlpha(0.7),
                        outlineColor: Cesium.Color.BLACK.withAlpha(0.6),
                        outlineWidth: 1,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY
                    },
                    properties: {
                        isCrime: true,
                        city: city.name,
                        type: ["Theft", "Assault", "Burglary", "Vandalism"][Math.floor(Math.random() * 4)]
                    }
                });

                this.entityIds.push(id);
            }
        }

        this.entityCount = this.entityIds.length;
        this.lastRefresh = Date.now();
        this.status = "ready";

        console.log(`[CrimeLayer] ✅ Rendered ${this.entityCount} incidents over Australia`);
    }

    onRemove(viewer: Viewer): void {
        this.status = "idle";
        for (const id of this.entityIds) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        this.entityIds = [];
        this.entityCount = 0;
        console.log("[CrimeLayer] 🔄 Removed");
    }
}
