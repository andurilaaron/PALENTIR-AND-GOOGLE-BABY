/**
 * LayerPanel — glassmorphic overlay for toggling data layers.
 *
 * Reads from LayerRegistry via useLayerRegistry hook.
 * Toggles call enableLayer / disableLayer on the registry.
 */
import { useMemo } from "react";
import { useLayerRegistry } from "../core/useLayerRegistry.ts";
import { useAppState } from "../core/useAppState.ts";
import "./styles/layers-panel.css";

export function LayerPanel() {
    const { layers, toggle } = useLayerRegistry();
    const { ui } = useAppState();

    const enabledCount = useMemo(
        () => layers.filter((l) => l.enabled).length,
        [layers]
    );

    if (!ui.isLayersOpen) return null;

    return (
        <div className="lp-anchor">
            <section className="lp" aria-label="Layers">
                {/* Header */}
                <header className="lp__header">
                    <h2 className="lp__title">
                        <span className="lp__icon">◉</span> Layers
                    </h2>
                    <span className="lp__badge">{enabledCount} active</span>
                </header>

                {/* Layer list */}
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
                                    <span className="lp__layer-name">{layer.label}</span>
                                </label>
                                <span
                                    className={`lp__status lp__status--${layer.status}`}
                                    title={layer.status}
                                >
                                    {layer.status}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
