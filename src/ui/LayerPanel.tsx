/**
 * LayerPanel — glassmorphic overlay for toggling data layers.
 *
 * Hidden by default. Opened via the detail button in PlaybackBar.
 * Close via the X button in the header.
 */
import { useMemo, useCallback } from "react";
import { useLayerRegistry } from "../core/useLayerRegistry.ts";
import { useAppState } from "../core/useAppState.ts";
import { AppState } from "../core/AppState.ts";
import "./styles/layers-panel.css";

export function LayerPanel() {
    const { layers, toggle } = useLayerRegistry();
    const { ui, playback } = useAppState();

    const enabledCount = useMemo(
        () => layers.filter((l) => l.enabled).length,
        [layers]
    );

    const isHistorical = playback.mode === "historical";

    const handleClose = useCallback(() => {
        AppState.setState({ ui: { isLayersOpen: false } });
    }, []);

    if (!ui.isLayersOpen) return null;

    return (
        <div className="lp-anchor">
            <section className="lp" aria-label="Layers">
                <header className="lp__header">
                    <h2 className="lp__title">
                        <span className="lp__icon">{"\u25C9"}</span> Layers
                    </h2>
                    <div className="lp__header-right">
                        <span className="lp__badge">{enabledCount} active</span>
                        <button
                            className="lp__close"
                            onClick={handleClose}
                            aria-label="Close layer panel"
                            title="Close"
                        >
                            {"\u2715"}
                        </button>
                    </div>
                </header>

                {layers.length === 0 ? (
                    <div className="lp__empty">No layers registered</div>
                ) : (
                    <ul className="lp__list" aria-label="Layer list">
                        {layers.map((layer) => (
                            <li key={layer.id} className="lp__item">
                                <label className="lp__toggle-label">
                                    <span className="lp__switch-track">
                                        <input
                                            type="checkbox"
                                            className="lp__switch-input"
                                            checked={layer.enabled}
                                            onChange={() => toggle(layer.id)}
                                            aria-label={`Toggle ${layer.label}`}
                                        />
                                        <span className="lp__switch-slider" />
                                    </span>
                                    <div className="lp__layer-info">
                                        <div className="lp__layer-name">
                                            {layer.icon && <span className="lp__layer-emoji">{layer.icon}</span>}
                                            {layer.label}
                                            {isHistorical && layer.enabled && layer.timeAware === "full" && (
                                                <span className="lp__time-badge lp__time-badge--live">TIME-SYNC</span>
                                            )}
                                            {isHistorical && layer.enabled && layer.timeAware === "snapshot" && (
                                                <span className="lp__time-badge lp__time-badge--snap">SNAPSHOT</span>
                                            )}
                                        </div>
                                        {layer.source && (
                                            <div className="lp__layer-sub">
                                                {layer.source} &middot; {layer.lastRefresh ? "active" : "standby"}
                                            </div>
                                        )}
                                    </div>
                                </label>
                                <div className="lp__layer-stats">
                                    {layer.entityCount !== undefined && layer.entityCount > 0 && (
                                        <span className="lp__count">{layer.entityCount >= 1000 ? (layer.entityCount / 1000).toFixed(1) + "K" : layer.entityCount}</span>
                                    )}
                                    <span
                                        className={`lp__status lp__status--${layer.status}`}
                                        title={layer.status}
                                    >
                                        {layer.enabled ? "ON" : "OFF"}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
