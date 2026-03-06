/**
 * ShotPlannerPanel — UI for saving/recalling camera positions on the globe.
 * Phase 5 adds time capture, time-aware recall, and inline rename.
 */
import { useCallback, useEffect, useState } from "react";
import { useViewer } from "../../core/ViewerContext.tsx";
import { AppState } from "../../core/AppState.ts";
import { ClockController } from "../playback/ClockController.ts";
import { ShotPlannerStore } from "./ShotPlannerStore.ts";
import type { CameraShot } from "./ShotPlannerStore.ts";
import "./shot-planner.css";

export function ShotPlannerPanel() {
    const viewer = useViewer();
    const [shots, setShots] = useState<CameraShot[]>(() =>
        ShotPlannerStore.getAll()
    );
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    useEffect(() => {
        const unsub = ShotPlannerStore.subscribe(() => {
            setShots(ShotPlannerStore.getAll());
        });
        return unsub;
    }, []);

    const handleSave = useCallback(async () => {
        if (!viewer) return;

        const Cesium = await import("cesium");
        const camera = viewer.camera;
        const pos = camera.positionCartographic;

        const name = `Shot ${shots.length + 1}`;

        // Capture clock time
        const timeIso = Cesium.JulianDate.toIso8601(viewer.clock.currentTime);

        // Capture playback range if set
        const playback = AppState.getState().playback;

        ShotPlannerStore.save({
            name,
            longitude: (pos.longitude * 180) / Math.PI,
            latitude: (pos.latitude * 180) / Math.PI,
            height: pos.height,
            heading: (camera.heading * 180) / Math.PI,
            pitch: (camera.pitch * 180) / Math.PI,
            roll: (camera.roll * 180) / Math.PI,
            timeIso,
            startIso: playback.startIso ?? undefined,
            stopIso: playback.stopIso ?? undefined,
        });
    }, [viewer, shots.length]);

    const handleRecall = useCallback(
        async (shot: CameraShot) => {
            if (!viewer) return;

            const Cesium = await import("cesium");

            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                    shot.longitude,
                    shot.latitude,
                    shot.height
                ),
                orientation: {
                    heading: (shot.heading * Math.PI) / 180,
                    pitch: (shot.pitch * Math.PI) / 180,
                    roll: (shot.roll * Math.PI) / 180,
                },
                duration: 2.0,
            });

            // Restore time if captured
            if (shot.timeIso) {
                ClockController.seekTo(shot.timeIso);
                ClockController.pause();
            }

            // Restore time range if captured
            if (shot.startIso && shot.stopIso) {
                ClockController.setRange(shot.startIso, shot.stopIso);
            }
        },
        [viewer]
    );

    const handleDelete = useCallback((id: string) => {
        ShotPlannerStore.remove(id);
    }, []);

    const handleStartRename = useCallback((shot: CameraShot) => {
        setEditingId(shot.id);
        setEditName(shot.name);
    }, []);

    const handleCommitRename = useCallback(() => {
        if (editingId && editName.trim()) {
            ShotPlannerStore.rename(editingId, editName.trim());
        }
        setEditingId(null);
        setEditName("");
    }, [editingId, editName]);

    const handleRenameKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") handleCommitRename();
            if (e.key === "Escape") {
                setEditingId(null);
                setEditName("");
            }
        },
        [handleCommitRename]
    );

    return (
        <div className="sp-anchor">
            <button
                className="sp-trigger"
                onClick={() => setIsOpen(!isOpen)}
                title="Shot Planner"
                aria-label="Toggle Shot Planner"
            >
                📷
            </button>

            {isOpen && (
                <div className="sp" aria-label="Shot Planner">
                    <header className="sp__header">
                        <h2 className="sp__title">Shot Planner</h2>
                        <button
                            className="sp__save-btn"
                            onClick={handleSave}
                            title="Save current camera position"
                        >
                            + Save
                        </button>
                    </header>

                    {shots.length === 0 ? (
                        <div className="sp__empty">
                            No saved shots. Navigate the globe and click "+ Save".
                        </div>
                    ) : (
                        <ul className="sp__list">
                            {shots.map((shot) => (
                                <li key={shot.id} className="sp__item">
                                    <button
                                        className="sp__recall-btn"
                                        onClick={() => handleRecall(shot)}
                                        title={`Fly to ${shot.name}`}
                                    >
                                        {editingId === shot.id ? (
                                            <input
                                                className="sp__rename-input"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onBlur={handleCommitRename}
                                                onKeyDown={handleRenameKeyDown}
                                                onClick={(e) => e.stopPropagation()}
                                                autoFocus
                                            />
                                        ) : (
                                            <span
                                                className="sp__shot-name"
                                                onDoubleClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStartRename(shot);
                                                }}
                                            >
                                                {shot.name}
                                            </span>
                                        )}
                                        <span className="sp__shot-coords">
                                            {shot.latitude.toFixed(2)}&deg;, {shot.longitude.toFixed(2)}&deg;
                                        </span>
                                        {shot.timeIso && (
                                            <span className="sp__shot-time">
                                                {new Date(shot.timeIso).toISOString().replace("T", " ").substring(0, 19)}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        className="sp__delete-btn"
                                        onClick={() => handleDelete(shot.id)}
                                        title="Delete shot"
                                        aria-label={`Delete ${shot.name}`}
                                    >
                                        ✕
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
