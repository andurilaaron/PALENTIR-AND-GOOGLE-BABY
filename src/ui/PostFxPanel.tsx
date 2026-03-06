/**
 * PostFxPanel — mode selector overlay for visual effects with settings drawer.
 *
 * Modes: NORMAL | CRT | NVG | THERMAL | EDGE | RADAR | MOSAIC | BLUEPRINT
 * Positioned top-right corner.
 */
import { useEffect, useState, useCallback } from "react";
import { AppState } from "../core/AppState.ts";
import type { EffectMode } from "../core/AppState.ts";
import { UNIFORM_DESCRIPTORS } from "../postfx/uniformDescriptors.ts";
import type { UniformDescriptor } from "../postfx/uniformDescriptors.ts";
import type { PostFxEngine } from "../postfx/PostFxEngine.ts";
import "./styles/postfx-panel.css";

const MODES: { mode: EffectMode; label: string; icon: string }[] = [
    { mode: "NORMAL", label: "STD", icon: "\u25EF" },
    { mode: "CRT", label: "CRT", icon: "\u25A6" },
    { mode: "NVG", label: "NVG", icon: "\u25C9" },
    { mode: "THERMAL", label: "THR", icon: "\u25C8" },
    { mode: "EDGE", label: "EDG", icon: "\u25E2" },
    { mode: "RADAR", label: "RDR", icon: "\u25CE" },
    { mode: "MOSAIC", label: "MSC", icon: "\u25A3" },
    { mode: "BLUEPRINT", label: "BLU", icon: "\u25A4" },
];

function SliderRow({ desc, mode }: { desc: UniformDescriptor; mode: EffectMode }) {
    const settings = AppState.getEffectSettings(mode);
    const value = settings[desc.uniform] ?? desc.default;

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            AppState.setUniform(mode, desc.uniform, parseFloat(e.target.value));
        },
        [mode, desc.uniform]
    );

    return (
        <div className="pfx__control-row">
            <span className="pfx__control-label">{desc.label}</span>
            <input
                type="range"
                className="pfx__slider"
                min={desc.min}
                max={desc.max}
                step={desc.step}
                value={value}
                onChange={handleChange}
            />
            <span className="pfx__control-value">{value.toFixed(2)}</span>
        </div>
    );
}

function ToggleRow({ desc, mode }: { desc: UniformDescriptor; mode: EffectMode }) {
    const settings = AppState.getEffectSettings(mode);
    const value = settings[desc.uniform] ?? desc.default;
    const isOn = value > 0.5;

    const handleToggle = useCallback(() => {
        AppState.setUniform(mode, desc.uniform, isOn ? 0.0 : 1.0);
    }, [mode, desc.uniform, isOn]);

    return (
        <div className="pfx__control-row">
            <span className="pfx__control-label">{desc.label}</span>
            <button
                className={`pfx__toggle ${isOn ? "pfx__toggle--on" : ""}`}
                onClick={handleToggle}
            >
                {isOn ? "ON" : "OFF"}
            </button>
        </div>
    );
}

interface PostFxPanelProps {
    engine: PostFxEngine | null;
}

export function PostFxPanel({ engine }: PostFxPanelProps) {
    const [activeMode, setActiveMode] = useState<EffectMode>("NORMAL");
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const unsubscribe = AppState.subscribe((state) => {
            setActiveMode(state.effects.mode);
            forceUpdate((n) => n + 1);
        });
        return unsubscribe;
    }, []);

    function handleModeChange(mode: EffectMode) {
        if (!engine || mode === activeMode) return;
        engine.setMode(mode);
    }

    const descriptors = activeMode !== "NORMAL" ? UNIFORM_DESCRIPTORS[activeMode] : undefined;

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

            {descriptors && descriptors.length > 0 && (
                <div className="pfx__drawer">
                    <div className="pfx__drawer-title">
                        {activeMode} Settings
                    </div>
                    {descriptors.map((desc) =>
                        desc.type === "toggle" ? (
                            <ToggleRow key={desc.uniform} desc={desc} mode={activeMode} />
                        ) : (
                            <SliderRow key={desc.uniform} desc={desc} mode={activeMode} />
                        )
                    )}
                </div>
            )}
        </div>
    );
}
