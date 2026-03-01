/**
 * GoogleTilesLayer — Photorealistic 3D Tiles from Google Maps Platform.
 *
 * Implements LayerPlugin. Reads API key from Vite env only:
 *   import.meta.env.VITE_GOOGLE_MAPS_KEY
 *
 * Gracefully degrades if key is missing (default Cesium globe remains).
 */
import type { Viewer } from "cesium";
import type {
    LayerPlugin,
    LayerCategory,
    LayerStatus,
} from "../../core/LayerPlugin.ts";

/** Google's Photorealistic 3D Tiles endpoint */
const TILES_URL =
    "https://tile.googleapis.com/v1/3dtiles/root.json";

export class GoogleTilesLayer implements LayerPlugin {
    readonly id = "google-3d-tiles";
    readonly label = "Google 3D Tiles";
    readonly category: LayerCategory = "tiles";
    enabled = false;
    status: LayerStatus = "idle";

    private tileset: InstanceType<typeof import("cesium").Cesium3DTileset> | null =
        null;

    async onAdd(viewer: Viewer): Promise<void> {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

        if (!apiKey || apiKey === "PUT_YOUR_NEW_ROTATED_KEY_HERE") {
            console.warn(
                "[GoogleTilesLayer] ⚠️  No valid VITE_GOOGLE_MAPS_KEY found in .env.local — falling back to default Cesium globe."
            );
            this.status = "error";
            return;
        }

        const Cesium = await import("cesium");

        try {
            this.tileset = await Cesium.Cesium3DTileset.fromUrl(
                `${TILES_URL}?key=${apiKey}`,
                {
                    // Performance tuning
                    maximumScreenSpaceError: 8,
                    skipLevelOfDetail: true,
                    preferLeaves: true,
                }
            );

            viewer.scene.primitives.add(this.tileset);

            // Hide the default globe imagery when 3D tiles are active
            // so photorealistic tiles are visible
            viewer.scene.globe.show = false;

            console.log("[GoogleTilesLayer] ✅ Photorealistic 3D Tiles loaded");
        } catch (err) {
            console.error("[GoogleTilesLayer] ❌ Failed to load tiles:", err);
            this.status = "error";
            throw err;
        }
    }

    onRemove(viewer: Viewer): void {
        if (this.tileset) {
            viewer.scene.primitives.remove(this.tileset);
            this.tileset = null;
        }

        // Restore default globe
        viewer.scene.globe.show = true;

        console.log("[GoogleTilesLayer] 🔄 Removed — default globe restored");
    }

    // No onTick needed — tiles are static geometry
}
