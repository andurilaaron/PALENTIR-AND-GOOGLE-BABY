import { useMemo, useState, useEffect } from "react";
import { useLayerRegistry } from "../core/useLayerRegistry.ts";
import "./styles/layers-panel.css";

function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function formatEntityCount(count: number): string {
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + "K";
    }
    return count.toString();
}

export function LayerPanel() {
    const { layers, toggle } = useLayerRegistry();
    const [now, setNow] = useState(Date.now());
    const [collapsed, setCollapsed] = useState(false);

    // Keep timestamps updating
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 5000);
        return () => clearInterval(timer);
    }, []);

    // We don't really use 'now' variable directly in render, 
    // but its state change forces a re-render so formatTimeAgo updates.

    return (
        <div className={`lp-anchor ${collapsed ? "lp-anchor--collapsed" : ""}`}>
            <section className="lp" aria-label="Layers">
                {/* Header */}
                <header className="lp__header">
                    <h2 className="lp__title">DATA LAYERS</h2>
                    <button
                        className="lp__collapse-btn"
                        onClick={() => setCollapsed(!collapsed)}
                        title={collapsed ? "Expand" : "Collapse"}
                    >
                        {collapsed ? "+" : "−"}
                    </button>
                </header>

                {/* Layer list */}
                {!collapsed && (
                    <div className="lp__content">
                        {layers.length === 0 ? (
                            <div className="lp__empty">No layers registered</div>
                        ) : (
                            <ul className="lp__list" aria-label="Layer list">
                                {layers.map((layer) => (
                                    <li key={layer.id} className="lp__item">
                                        <div className="lp__item-main">
                                            {layer.icon && <span className="lp__item-icon">{layer.icon}</span>}
                                            <div className="lp__item-info">
                                                <span className="lp__layer-name">{layer.label}</span>
                                                <span className="lp__layer-meta">
                                                    {layer.source || "Unknown"} · {" "}
                                                    {layer.lastRefresh ? formatTimeAgo(layer.lastRefresh) : "never"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="lp__item-controls">
                                            {layer.entityCount !== undefined ? (
                                                <span className="lp__entity-count">{formatEntityCount(layer.entityCount)}</span>
                                            ) : (
                                                <span className="lp__entity-count lp__entity-count--empty">-</span>
                                            )}

                                            <button
                                                className={`lp__toggle-btn ${layer.enabled ? "is-on" : "is-off"}`}
                                                onClick={() => toggle(layer.id)}
                                                aria-pressed={layer.enabled}
                                            >
                                                {layer.enabled ? "ON" : "OFF"}
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
