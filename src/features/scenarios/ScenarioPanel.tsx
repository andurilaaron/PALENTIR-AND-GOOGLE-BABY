/**
 * ScenarioPanel — compact scenario loader + screen record + SIGINT button.
 * Positioned top-right below PostFx panel.
 */
import { useState, useCallback } from "react";
import { useViewer } from "../../core/ViewerContext.tsx";
import { SCENARIOS } from "./scenarios.ts";
import { ScenarioLoader } from "./ScenarioLoader.ts";
import { screenRecorder } from "./ScreenRecorder.ts";
import { SatelliteIntelPanel } from "./SatelliteIntelPanel.tsx";
import { ThreatAssessmentPanel } from "./ThreatAssessment.tsx";
import { NetworkGraph } from "../../ui/NetworkGraph.tsx";
import "./scenario-panel.css";

export function ScenarioPanel() {
    const viewer = useViewer();
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [showIntel, setShowIntel] = useState(false);
    const [showThreat, setShowThreat] = useState(false);
    const [showGraph, setShowGraph] = useState(false);

    const handleLoad = useCallback(
        async (scenarioId: string) => {
            if (!viewer) return;
            const scenario = SCENARIOS.find((s) => s.id === scenarioId);
            if (!scenario) return;

            await ScenarioLoader.load(viewer, scenario);
            setActiveId(scenarioId);
            setExpanded(false);
        },
        [viewer]
    );

    const handleClear = useCallback(() => {
        if (!viewer) return;
        ScenarioLoader.clearMarkers(viewer);
        setActiveId(null);
        setShowIntel(false);
        setShowThreat(false);
    }, [viewer]);

    const handleRecord = useCallback(() => {
        if (!viewer) return;

        if (isRecording) {
            screenRecorder.stop();
            setIsRecording(false);
        } else {
            const canvas = viewer.scene.canvas;
            const started = screenRecorder.start(canvas);
            setIsRecording(started);
        }
    }, [viewer, isRecording]);

    const active = SCENARIOS.find((s) => s.id === activeId);

    return (
        <>
            <div className="sc-anchor">
                <div className="sc">
                    {/* Header */}
                    <button
                        className="sc__toggle"
                        onClick={() => setExpanded(!expanded)}
                    >
                        <span className="sc__toggle-icon">
                            {active ? "\u25C9" : "\u25CB"}
                        </span>
                        <span className="sc__toggle-label">
                            {active ? active.codename : "SCENARIOS"}
                        </span>
                        <span className="sc__toggle-arrow">
                            {expanded ? "\u25B2" : "\u25BC"}
                        </span>
                    </button>

                    {/* SIGINT button — only when scenario active */}
                    {active && (
                        <button
                            className={`sc__sigint ${showIntel ? "sc__sigint--active" : ""}`}
                            onClick={() => setShowIntel(!showIntel)}
                            title="Satellite Intelligence Analysis"
                        >
                            SIGINT
                        </button>
                    )}

                    {/* Threat Assessment button — only when scenario active */}
                    {active && (
                        <button
                            className={`sc__sigint ${showThreat ? "sc__sigint--active" : ""}`}
                            onClick={() => setShowThreat(!showThreat)}
                            title="Threat Assessment Brief"
                        >
                            THREAT
                        </button>
                    )}

                    {/* Network Graph button */}
                    <button
                        className={`sc__sigint ${showGraph ? "sc__sigint--active" : ""}`}
                        onClick={() => setShowGraph(!showGraph)}
                        title="Link Analysis / Network Graph"
                    >
                        GRAPH
                    </button>

                    {/* Record button */}
                    <button
                        className={`sc__rec ${isRecording ? "sc__rec--active" : ""}`}
                        onClick={handleRecord}
                        title={isRecording ? "Stop recording" : "Start recording"}
                    >
                        <span className="sc__rec-dot" />
                        {isRecording ? "STOP" : "REC"}
                    </button>
                </div>

                {/* Expanded scenario list */}
                {expanded && (
                    <div className="sc__dropdown">
                        {SCENARIOS.map((s) => (
                            <button
                                key={s.id}
                                className={`sc__item ${activeId === s.id ? "sc__item--active" : ""}`}
                                onClick={() => handleLoad(s.id)}
                                style={{ "--sc-accent": s.color } as React.CSSProperties}
                            >
                                <div className="sc__item-header">
                                    <span className="sc__item-code">{s.codename}</span>
                                    {activeId === s.id && (
                                        <span className="sc__item-badge">ACTIVE</span>
                                    )}
                                </div>
                                <div className="sc__item-desc">{s.description}</div>
                                <div className="sc__item-meta">
                                    {s.targets.length} targets &middot;{" "}
                                    {s.enableLayers.length} layers
                                </div>
                            </button>
                        ))}

                        {activeId && (
                            <button className="sc__clear" onClick={handleClear}>
                                CLEAR SCENARIO
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Satellite Intel Panel — renders separately (left side) */}
            {showIntel && (
                <SatelliteIntelPanel
                    scenario={active ?? null}
                    onClose={() => setShowIntel(false)}
                />
            )}

            {/* Threat Assessment Panel */}
            {showThreat && (
                <ThreatAssessmentPanel
                    scenario={active ?? null}
                    onClose={() => setShowThreat(false)}
                />
            )}

            {/* Network Graph */}
            <NetworkGraph
                visible={showGraph}
                onClose={() => setShowGraph(false)}
            />
        </>
    );
}
