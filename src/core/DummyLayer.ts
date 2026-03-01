/**
 * DummyLayer — test implementation of LayerPlugin.
 *
 * Logs to console on add/remove/tick. Used to verify the
 * plugin architecture works end-to-end before real layers are built.
 */
import type { Viewer, JulianDate } from "cesium";
import type { LayerPlugin, LayerCategory, LayerStatus } from "./LayerPlugin.ts";

export class DummyLayer implements LayerPlugin {
    readonly id = "dummy";
    readonly label = "Test Layer";
    readonly category: LayerCategory = "custom";
    enabled = false;
    status: LayerStatus = "idle";

    private tickCount = 0;

    onAdd(_viewer: Viewer): void {
        console.log("[DummyLayer] ✅ Added to viewer");
    }

    onRemove(_viewer: Viewer): void {
        console.log("[DummyLayer] ❌ Removed from viewer");
        this.tickCount = 0;
    }

    onTick(_viewer: Viewer, _time: JulianDate): void {
        this.tickCount++;
        // Log every 300 ticks (~5 seconds at 60fps) to avoid spam
        if (this.tickCount % 300 === 0) {
            console.log(`[DummyLayer] 🔄 Tick #${this.tickCount}`);
        }
    }
}
