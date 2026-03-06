/**
 * LayerRegistry — singleton that manages all LayerPlugin instances.
 *
 * Responsibilities:
 *  - Register / unregister plugins
 *  - Enable / disable layers (calls onAdd / onRemove)
 *  - Drive the update loop (onTick) via Cesium clock
 *  - Notify subscribers when state changes (for UI reactivity)
 */
import type { Viewer, Event } from "cesium";
import type { LayerPlugin } from "./LayerPlugin.ts";

export type RegistryListener = () => void;

class _LayerRegistry {
    private plugins: Map<string, LayerPlugin> = new Map();
    private listeners: Set<RegistryListener> = new Set();
    private viewer: Viewer | null = null;
    private tickRemover: Event.RemoveCallback | null = null;

    /* ── Viewer connection ───────────────────────────────── */

    /**
     * Connect the registry to a Cesium Viewer.
     * Starts the onTick loop for all enabled layers.
     */
    attach(viewer: Viewer): void {
        this.viewer = viewer;
        this.tickRemover = viewer.clock.onTick.addEventListener(
            (clock) => {
                const time = clock.currentTime;
                for (const plugin of this.plugins.values()) {
                    if (plugin.enabled && plugin.onTick) {
                        try {
                            plugin.onTick(viewer, time);
                        } catch (err) {
                            console.error(`[LayerRegistry] onTick error in "${plugin.id}":`, err);
                        }
                    }
                }
            }
        );
    }

    /**
     * Disconnect from the viewer and stop the tick loop.
     */
    detach(): void {
        if (this.tickRemover) {
            this.tickRemover();
            this.tickRemover = null;
        }
        this.viewer = null;
    }

    /* ── Plugin CRUD ─────────────────────────────────────── */

    register(plugin: LayerPlugin): void {
        if (this.plugins.has(plugin.id)) {
            console.warn(`[LayerRegistry] Plugin "${plugin.id}" already registered. Skipping.`);
            return;
        }
        this.plugins.set(plugin.id, plugin);
        this.notify();
    }

    unregister(id: string): void {
        const plugin = this.plugins.get(id);
        if (!plugin) return;

        // Disable first if active
        if (plugin.enabled && this.viewer) {
            plugin.onRemove(this.viewer);
            plugin.enabled = false;
            plugin.status = "idle";
            plugin.entityCount = undefined;
            plugin.lastRefresh = undefined;
        }

        this.plugins.delete(id);
        this.notify();
    }

    getAll(): LayerPlugin[] {
        return Array.from(this.plugins.values());
    }

    getById(id: string): LayerPlugin | undefined {
        return this.plugins.get(id);
    }

    /* ── Enable / Disable ───────────────────────────────── */

    async enableLayer(id: string): Promise<void> {
        const plugin = this.plugins.get(id);
        if (!plugin || plugin.enabled || !this.viewer) return;

        plugin.status = "loading";
        this.notify();

        try {
            await plugin.onAdd(this.viewer);
            plugin.enabled = true;
            plugin.status = "ready";
        } catch (err) {
            console.error(`[LayerRegistry] Failed to enable "${id}":`, err);
            plugin.status = "error";
        }

        this.notify();
    }

    disableLayer(id: string): void {
        const plugin = this.plugins.get(id);
        if (!plugin || !plugin.enabled || !this.viewer) return;

        plugin.onRemove(this.viewer);
        plugin.enabled = false;
        plugin.status = "idle";
        plugin.entityCount = undefined;
        plugin.lastRefresh = undefined;
        this.notify();
    }

    async toggleLayer(id: string): Promise<void> {
        const plugin = this.plugins.get(id);
        if (!plugin) return;
        if (plugin.enabled) {
            this.disableLayer(id);
        } else {
            await this.enableLayer(id);
        }
    }

    /* ── Subscriptions (for UI reactivity) ──────────────── */

    subscribe(listener: RegistryListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}

/** Singleton instance */
export const LayerRegistry = new _LayerRegistry();
