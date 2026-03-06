import { useEffect, useState } from "react";
import type { SatelliteRecord } from "./types.ts";
import { getSatelliteVelocity } from "./propagator.ts";
import { useViewer } from "../../core/ViewerContext.tsx";
import "./styles.css";

// We need a way to get the selected record from Cesium's entity selection
interface DetectionPanelProps {
    record: SatelliteRecord | null;
    onClose: () => void;
}

export function DetectionPanel({ record, onClose }: DetectionPanelProps) {
    const viewer = useViewer();
    const [velocity, setVelocity] = useState<string>("---");

    const trackSatellite = () => {
        if (!viewer || !record) return;
        const entity = viewer.entities.getById(`sat-${record.id}`);
        if (entity) {
            // Track the satellite (moves camera to follow it)
            viewer.trackedEntity = entity;
        }
    };

    useEffect(() => {
        if (!record) return;

        // Interval to update live telemetry data (like velocity)
        const interval = setInterval(() => {
            const speed = getSatelliteVelocity(record.satrec, new Date());
            if (speed) {
                setVelocity(speed.toFixed(2) + " km/s");
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [record]);

    if (!record) return null;

    return (
        <div className="detection-panel">
            <header className="detection-panel__header">
                <h3>🛰️ SIGNAL LOCK: {record.id}</h3>
                <div className="detection-panel__actions">
                    <button onClick={trackSatellite} className="detection-panel__track">TRACK</button>
                    <button onClick={onClose} className="detection-panel__close">X</button>
                </div>
            </header>

            <div className="detection-panel__body">
                <div className="telemetry-row">
                    <span className="telemetry-label">DESIGNATION:</span>
                    <span className="telemetry-val">{record.name}</span>
                </div>
                <div className="telemetry-row">
                    <span className="telemetry-label">ORBIT CLASS:</span>
                    <span className="telemetry-val">{record.orbitCategory}</span>
                </div>
                <div className="telemetry-row">
                    <span className="telemetry-label">INCLINATION:</span>
                    <span className="telemetry-val">{(record.satrec.inclo * (180 / Math.PI)).toFixed(2)}°</span>
                </div>
                <div className="telemetry-row">
                    <span className="telemetry-label">LIVE VELOCITY:</span>
                    <span className="telemetry-val highlight">{velocity}</span>
                </div>
            </div>
        </div>
    );
}
