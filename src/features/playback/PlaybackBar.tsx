/**
 * PlaybackBar — full-width bottom dock with timeline, controls, layer pills, and event legend.
 *
 * Layout (top → bottom):
 *   Row 1: [⏸] ─── SCRUBBER ─── [2026-03-07 14:32:00Z]
 *   Row 2: [LIVE | PLAYBACK] │ [1m/s 3m/s 5m/s 15m/s 1h/s OFF] │ [RANGE]
 *   Row 3: Layer toggle pills
 *   Row 4: Event category legend dots
 */
import { useEffect, useState, useCallback } from "react";
import { AppState } from "../../core/AppState.ts";
import type { PlaybackState } from "../../core/AppState.ts";
import { useAppState } from "../../core/useAppState.ts";
import { ClockController } from "./ClockController.ts";
import { useLayerRegistry } from "../../core/useLayerRegistry.ts";
import "./playback-bar.css";

const SPEEDS = [
    { label: "1m/s", mult: 60 },
    { label: "3m/s", mult: 180 },
    { label: "5m/s", mult: 300 },
    { label: "15m/s", mult: 900 },
    { label: "1h/s", mult: 3600 },
];

const PILL_COLORS: Record<string, string> = {
    "google-3d-tiles": "#94a3b8",
    flights: "#60a5fa",
    "military-flights": "#ef4444",
    satellites: "#22d3ee",
    earthquakes: "#f97316",
    "weather-radar": "#a78bfa",
    "satellite-imagery": "#818cf8",
    "crime-abs": "#f87171",
    traffic: "#4ade80",
    "street-traffic": "#34d399",
    "traffic-particles": "#6ee7b7",
    cctv: "#fbbf24",
    "vehicle-detection": "#d4a017",
};

const EVENT_CATEGORIES = [
    { label: "Kinetic", color: "#ef4444" },
    { label: "Retaliation", color: "#f97316" },
    { label: "Civilian Impact", color: "#fbbf24" },
    { label: "Maritime", color: "#3b82f6" },
    { label: "Infrastructure", color: "#8b5cf6" },
    { label: "Escalation", color: "#ec4899" },
    { label: "Airspace Closure", color: "#22d3ee" },
];

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatUtc(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toISOString().replace("T", " ").substring(0, 19) + "Z";
    } catch {
        return iso;
    }
}

export function PlaybackBar() {
    const [pb, setPb] = useState<PlaybackState>(() => AppState.getState().playback);
    const { ui } = useAppState();
    const { layers, toggle } = useLayerRegistry();
    const [showRange, setShowRange] = useState(false);
    const [rangeStart, setRangeStart] = useState("");
    const [rangeStop, setRangeStop] = useState("");

    useEffect(() => {
        return AppState.subscribe((state) => setPb(state.playback));
    }, []);

    const handlePlayPause = useCallback(() => {
        pb.isPlaying ? ClockController.pause() : ClockController.play();
    }, [pb.isPlaying]);

    const handleSpeed = useCallback((mult: number) => {
        ClockController.setMultiplier(mult);
    }, []);

    const handleGoLive = useCallback(() => {
        ClockController.goLive();
    }, []);

    const handlePlayback = useCallback(() => {
        ClockController.pause();
    }, []);

    const handleScrub = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const ms = parseFloat(e.target.value);
            ClockController.seekTo(new Date(ms).toISOString());
        },
        []
    );

    const handleApplyRange = useCallback(() => {
        if (!rangeStart || !rangeStop) return;
        ClockController.setRange(
            new Date(rangeStart).toISOString(),
            new Date(rangeStop).toISOString()
        );
        setShowRange(false);
    }, [rangeStart, rangeStop]);

    const handleClearRange = useCallback(() => {
        ClockController.clearRange();
        setShowRange(false);
    }, []);

    const handleTogglePanel = useCallback(() => {
        AppState.setState({ ui: { isLayersOpen: !ui.isLayersOpen } });
    }, [ui.isLayersOpen]);

    const isLive = pb.mode === "live";
    const hasRange = pb.startIso !== null && pb.stopIso !== null;
    const scrubMin = hasRange ? new Date(pb.startIso!).getTime() : 0;
    const scrubMax = hasRange ? new Date(pb.stopIso!).getTime() : 100;
    const scrubVal = hasRange ? new Date(pb.currentIso).getTime() : 0;

    return (
        <div className="pb-dock">
            {/* Row 1: Timeline */}
            <div className="pb-row pb-row--timeline">
                <button
                    className="pb__playpause"
                    onClick={handlePlayPause}
                    title={pb.isPlaying ? "Pause" : "Play"}
                >
                    {pb.isPlaying ? "\u2016" : "\u25B6"}
                </button>

                <div className="pb__timeline-wrap">
                    <input
                        type="range"
                        className="pb__scrubber"
                        min={scrubMin}
                        max={scrubMax}
                        value={scrubVal}
                        onChange={handleScrub}
                        disabled={!hasRange}
                        title={hasRange ? "Scrub timeline" : "Set a time range to enable scrubbing"}
                    />
                    <div className="pb__event-markers" />
                </div>

                <span className={`pb__time ${isLive ? "pb__time--live" : "pb__time--hist"}`}>
                    {formatUtc(pb.currentIso)}
                </span>
            </div>

            {/* Row 2: Mode + Speed + Range */}
            <div className="pb-row pb-row--controls">
                <div className="pb__mode-group">
                    <button
                        className={`pb__mode-btn ${isLive ? "pb__mode-btn--active pb__mode-btn--live" : ""}`}
                        onClick={handleGoLive}
                    >
                        LIVE
                    </button>
                    <button
                        className={`pb__mode-btn ${!isLive ? "pb__mode-btn--active pb__mode-btn--playback" : ""}`}
                        onClick={handlePlayback}
                    >
                        PLAYBACK
                    </button>
                </div>

                <span className="pb__divider" />

                <div className="pb__speed-group">
                    {SPEEDS.map((s) => (
                        <button
                            key={s.mult}
                            className={`pb__speed ${pb.multiplier === s.mult ? "pb__speed--active" : ""}`}
                            onClick={() => handleSpeed(s.mult)}
                        >
                            {s.label}
                        </button>
                    ))}
                    <button
                        className={`pb__speed ${pb.multiplier === 1 ? "pb__speed--active" : ""}`}
                        onClick={() => handleSpeed(1)}
                    >
                        OFF
                    </button>
                </div>

                <span className="pb__divider" />

                <button
                    className={`pb__ctrl-btn ${showRange ? "pb__ctrl-btn--active" : ""}`}
                    onClick={() => setShowRange(!showRange)}
                >
                    RANGE
                </button>
            </div>

            {/* Range editor (conditional) */}
            {showRange && (
                <div className="pb-row pb-row--range">
                    <label className="pb__range-label">
                        START
                        <input
                            type="datetime-local"
                            className="pb__range-input"
                            value={rangeStart}
                            onChange={(e) => setRangeStart(e.target.value)}
                        />
                    </label>
                    <label className="pb__range-label">
                        END
                        <input
                            type="datetime-local"
                            className="pb__range-input"
                            value={rangeStop}
                            onChange={(e) => setRangeStop(e.target.value)}
                        />
                    </label>
                    <button className="pb__range-apply" onClick={handleApplyRange}>
                        APPLY
                    </button>
                    <button className="pb__range-clear" onClick={handleClearRange}>
                        CLEAR
                    </button>
                </div>
            )}

            {/* Row 3: Layer toggle pills */}
            <div className="pb-row pb-row--layers">
                {layers.map((layer) => {
                    const accent = PILL_COLORS[layer.id] || "#5b9cf5";
                    return (
                        <button
                            key={layer.id}
                            className={`pb__pill ${layer.enabled ? "pb__pill--on" : ""}`}
                            style={
                                layer.enabled
                                    ? {
                                          borderColor: accent,
                                          color: accent,
                                          background: hexToRgba(accent, 0.12),
                                      }
                                    : undefined
                            }
                            onClick={() => toggle(layer.id)}
                            title={`${layer.label}${layer.source ? ` — ${layer.source}` : ""}`}
                        >
                            {layer.icon && (
                                <span className="pb__pill-icon">{layer.icon}</span>
                            )}
                            {layer.label}
                            {layer.enabled &&
                                layer.entityCount !== undefined &&
                                layer.entityCount > 0 && (
                                    <span className="pb__pill-count">
                                        {layer.entityCount >= 1000
                                            ? (layer.entityCount / 1000).toFixed(1) + "K"
                                            : layer.entityCount}
                                    </span>
                                )}
                        </button>
                    );
                })}
                <button
                    className={`pb__pill pb__pill-detail ${ui.isLayersOpen ? "pb__pill-detail--open" : ""}`}
                    onClick={handleTogglePanel}
                    title={ui.isLayersOpen ? "Close detail panel" : "Open detail panel"}
                >
                    DETAIL
                </button>
            </div>

            {/* Row 4: Event category legend */}
            <div className="pb-row pb-row--legend">
                {EVENT_CATEGORIES.map((cat) => (
                    <span key={cat.label} className="pb__legend-item">
                        <span
                            className="pb__legend-dot"
                            style={{ background: cat.color, color: cat.color }}
                        />
                        {cat.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
