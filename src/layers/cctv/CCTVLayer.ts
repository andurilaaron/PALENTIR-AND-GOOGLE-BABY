/**
 * CCTVLayer — CCTV camera markers with status-based coloring.
 *
 * Uses sample data. In production, fetches from PostGIS.
 * Colors: green=online, red=offline, amber=maintenance.
 */
import type { Viewer } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";
import { SAMPLE_CAMERAS } from "./cctvData.ts";
import type { CCTVCamera } from "./cctvData.ts";

const STATUS_COLORS: Record<CCTVCamera["status"], string> = {
    online: "#22c55e",
    offline: "#ef4444",
    maintenance: "#f59e0b",
};

export class CCTVLayer implements LayerPlugin {
    readonly id = "cctv";
    readonly label = "CCTV Cameras";
    readonly category: LayerCategory = "cctv";
    enabled = false;
    status: LayerStatus = "idle";

    private entityIds: string[] = [];

    async onAdd(viewer: Viewer): Promise<void> {
        const Cesium = await import("cesium");

        for (const cam of SAMPLE_CAMERAS) {
            const color = Cesium.Color.fromCssColorString(
                STATUS_COLORS[cam.status]
            );

            viewer.entities.add({
                id: cam.id,
                name: cam.name,
                position: Cesium.Cartesian3.fromDegrees(
                    cam.longitude,
                    cam.latitude,
                    50
                ),
                billboard: {
                    image: this.createCameraIcon(STATUS_COLORS[cam.status]),
                    width: 24,
                    height: 24,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
                point: {
                    pixelSize: 6,
                    color,
                    outlineColor: color.withAlpha(0.3),
                    outlineWidth: 4,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    show: false, // Hidden when billboard is visible
                },
                label: {
                    text: `📹 ${cam.name}`,
                    font: "10px system-ui",
                    fillColor: Cesium.Color.fromCssColorString("#dce8f8"),
                    backgroundColor: Cesium.Color.fromCssColorString("#0a101c").withAlpha(0.7),
                    showBackground: true,
                    backgroundPadding: new Cesium.Cartesian2(6, 4),
                    style: Cesium.LabelStyle.FILL,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -28),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    show: true,
                },
                description: this.buildDescription(cam),
                properties: { isCCTV: true, record: cam },
            });

            this.entityIds.push(cam.id);
        }

        console.log(
            `[CCTVLayer] ✅ Loaded ${SAMPLE_CAMERAS.length} cameras`
        );
    }

    onRemove(viewer: Viewer): void {
        for (const id of this.entityIds) {
            const entity = viewer.entities.getById(id);
            if (entity) viewer.entities.remove(entity);
        }
        this.entityIds = [];
        console.log("[CCTVLayer] 🔄 Removed");
    }

    /** Generate a small colored camera icon as a data URL */
    private createCameraIcon(color: string): string {
        const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="${color}" opacity="0.25"/>
        <circle cx="12" cy="12" r="5" fill="${color}"/>
        <circle cx="12" cy="12" r="2" fill="white" opacity="0.8"/>
      </svg>`;
        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }

    /** Build HTML description for the info panel */
    private buildDescription(cam: CCTVCamera): string {
        const statusColor = STATUS_COLORS[cam.status];
        return `
      <table style="font-family: system-ui; font-size: 13px; color: #dce8f8;">
        <tr><td style="padding: 4px 8px; color: #5a6a82;">Status</td>
            <td style="padding: 4px 8px;"><span style="color: ${statusColor}; font-weight: 600;">${cam.status.toUpperCase()}</span></td></tr>
        <tr><td style="padding: 4px 8px; color: #5a6a82;">Type</td>
            <td style="padding: 4px 8px;">${cam.type.toUpperCase()}</td></tr>
        <tr><td style="padding: 4px 8px; color: #5a6a82;">Location</td>
            <td style="padding: 4px 8px;">${cam.location}</td></tr>
        <tr><td style="padding: 4px 8px; color: #5a6a82;">Coords</td>
            <td style="padding: 4px 8px;">${cam.latitude.toFixed(4)}°, ${cam.longitude.toFixed(4)}°</td></tr>
      </table>`;
    }
}
