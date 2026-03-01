/**
 * PostFxPanel — mode selector overlay for visual effects.
 *
 * Modes: NORMAL | CRT | NVG | THERMAL
 * Positioned top-right corner.
 */
import { useEffect, useState } from "react";
import { AppState } from "../core/AppState.ts";
import type { EffectMode } from "../core/AppState.ts";
import type { PostFxEngine } from "../postfx/PostFxEngine.ts";
import "./styles/postfx-panel.css";

const MODES: { mode: EffectMode; label: string; icon: string }[] = [
    { mode: "NORMAL", label: "STD", icon: "◯" },
    { mode: "CRT", label: "CRT", icon: "▦" },
    { mode: "NVG", label: "NVG", icon: "◉" },
    { mode: "THERMAL", label: "THR", icon: "◈" },
];

interface PostFxPanelProps {
    engine: PostFxEngine | null;
}

export function PostFxPanel({ engine }: PostFxPanelProps) {
    const [activeMode, setActiveMode] = useState<EffectMode>("NORMAL");

    useEffect(() => {
        const unsubscribe = AppState.subscribe((state) => {
            setActiveMode(state.effects.mode);
        });
        return unsubscribe;
    }, []);

    function handleModeChange(mode: EffectMode) {
        if (!engine || mode === activeMode) return;
        engine.setMode(mode);
    }

    return (
        <div className="pfx-anchor">
            <div className="pfx" aria-label="Visual Effects">
                <span className="pfx__label">MODE</span>
                <div className="pfx__modes">
                    {MODES.map(({ mode, label, icon }) => (
                        <button
                            key={mode}
                            className={`pfx__btn ${activeMode === mode ? "pfx__btn--active" : ""}`}
                            onClick={() => handleModeChange(mode)}
                            title={label}
                            aria-pressed={activeMode === mode}
                        >
                            <span className="pfx__btn-icon">{icon}</span>
                            <span className="pfx__btn-label">{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
