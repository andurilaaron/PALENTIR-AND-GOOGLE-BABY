/**
 * EntityInspector — unified click-to-select panel for ALL entity types.
 * Handles: flights, military flights, satellites, earthquakes, crimes.
 * Actions: Track (lock camera + live trail), Fly To, More Info, Close.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useViewer } from "../core/ViewerContext.tsx";
import "./styles/entity-inspector.css";

export interface InspectedEntity {
    id: string;
    name: string;
    type: "flight" | "military-flight" | "satellite" | "earthquake" | "crime" | "unknown";
    properties: Record<string, any>;
}

interface EntityInspectorProps {
    entity: InspectedEntity | null;
    onClose: () => void;
}

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
    "flight": { icon: "✈️", color: "#60a5fa", label: "CIVIL FLIGHT" },
    "military-flight": { icon: "🎖️", color: "#ef4444", label: "MIL AIRCRAFT" },
    "satellite": { icon: "🛰️", color: "#4cd6e4", label: "SATELLITE" },
    "earthquake": { icon: "🌍", color: "#f59e0b", label: "SEISMIC EVENT" },
    "crime": { icon: "🚨", color: "#f97316", label: "CRIME REPORT" },
    "unknown": { icon: "📍", color: "#9ca3af", label: "ENTITY" },
};

const TRAIL_MAX_POINTS = 300; // ~10 minutes at 2s sample rate
const TRAIL_SAMPLE_MS = 2000;
const TRAIL_ENTITY_PREFIX = "ei-trail-";

export function EntityInspector({ entity, onClose }: EntityInspectorProps) {
    const viewer = useViewer();
    const [expanded, setExpanded] = useState(false);
    const [isTracking, setIsTracking] = useState(false);

    // Trail state — lives as refs so it doesn't cause re-renders on each sample
    const trailPositions = useRef<any[]>([]);    // Cesium.Cartesian3 ring buffer
    const trailTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const trailEntityId = useRef<string | null>(null);

    /** Tear down any active trail polyline + timer */
    const clearTrail = useCallback(() => {
        if (trailTimer.current) {
            clearInterval(trailTimer.current);
            trailTimer.current = null;
        }
        if (trailEntityId.current && viewer) {
            const te = viewer.entities.getById(trailEntityId.current);
            if (te) viewer.entities.remove(te);
            trailEntityId.current = null;
        }
        trailPositions.current = [];
    }, [viewer]);

    // Reset when entity changes or panel unmounts
    useEffect(() => {
        setExpanded(false);
        if (isTracking) {
            if (viewer) viewer.trackedEntity = undefined;
            clearTrail();
            setIsTracking(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entity?.id]);

    useEffect(() => () => {
        if (viewer) viewer.trackedEntity = undefined;
        clearTrail();
    }, [clearTrail, viewer]);

    if (!entity) return null;

    const meta = TYPE_META[entity.type] ?? TYPE_META.unknown;
    const p = entity.properties;

    const handleFlyTo = () => {
        if (!viewer) return;
        const cesiumEntity = viewer.entities.getById(entity.id);
        if (cesiumEntity) {
            viewer.flyTo(cesiumEntity, {
                duration: 2.5,
                offset: { heading: 0, pitch: -0.3, range: 150000 }
            } as any);
        }
    };

    const handleTrack = async () => {
        if (!viewer) return;
        const cesiumEntity = viewer.entities.getById(entity.id);
        if (!cesiumEntity) return;

        if (isTracking) {
            // --- Stop tracking ---
            viewer.trackedEntity = undefined;
            clearTrail();
            setIsTracking(false);
        } else {
            // --- Start tracking ---
            const Cesium = await import("cesium");

            // Lock camera to entity
            viewer.trackedEntity = cesiumEntity;
            setIsTracking(true);

            // Helper to sample current entity position
            const samplePosition = (): any | null => {
                const pos = cesiumEntity.position?.getValue(viewer.clock.currentTime);
                return pos ?? null;
            };

            // Seed the first position
            const firstPos = samplePosition();
            if (firstPos) trailPositions.current = [firstPos];

            // Create trail polyline entity driven by a CallbackProperty
            const trailId = `${TRAIL_ENTITY_PREFIX}${entity.id}`;
            trailEntityId.current = trailId;

            // Remove any pre-existing trail for this entity
            const oldTrail = viewer.entities.getById(trailId);
            if (oldTrail) viewer.entities.remove(oldTrail);

            const trailColor = Cesium.Color.fromCssColorString(meta.color).withAlpha(0.85);
            const glowColor = Cesium.Color.fromCssColorString(meta.color).withAlpha(0.25);

            viewer.entities.add({
                id: trailId,
                polyline: {
                    // CallbackProperty re-reads positions ref every frame
                    positions: new Cesium.CallbackProperty(() => {
                        return trailPositions.current.length >= 2
                            ? trailPositions.current
                            : null;
                    }, false),
                    width: 2.5,
                    material: new Cesium.PolylineGlowMaterialProperty({
                        glowPower: 0.2,
                        color: trailColor,
                        taperPower: 0.8,
                    }),
                    arcType: Cesium.ArcType.NONE, // straight geodetic segments
                    clampToGround: false,
                }
            });

            // Also add a subtle glow copy underneath
            viewer.entities.add({
                id: `${trailId}-glow`,
                polyline: {
                    positions: new Cesium.CallbackProperty(() => {
                        return trailPositions.current.length >= 2
                            ? trailPositions.current
                            : null;
                    }, false),
                    width: 8,
                    material: new Cesium.PolylineGlowMaterialProperty({
                        glowPower: 0.6,
                        color: glowColor,
                    }),
                    arcType: Cesium.ArcType.NONE,
                    clampToGround: false,
                }
            });

            // Sample position every 2s and append to trail
            trailTimer.current = setInterval(() => {
                const pos = samplePosition();
                if (!pos) return;
                trailPositions.current = [...trailPositions.current, pos].slice(-TRAIL_MAX_POINTS);
            }, TRAIL_SAMPLE_MS);
        }
    };

    /** Render entity-specific detail rows */
    const renderDetails = () => {
        const rows: { label: string; value: string }[] = [];

        if (entity.type === "flight" || entity.type === "military-flight") {
            if (p.callsign) rows.push({ label: "CALLSIGN", value: p.callsign });
            if (p.icao24) rows.push({ label: "ICAO24", value: p.icao24 });
            if (p.altitude != null) rows.push({ label: "ALTITUDE", value: `${Math.round(p.altitude).toLocaleString()} m` });
            if (p.velocity != null) rows.push({ label: "SPEED", value: `${(p.velocity * 1.944).toFixed(0)} kts` });
            if (p.heading != null) rows.push({ label: "HEADING", value: `${Math.round(p.heading)}°` });
            if (p.verticalRate != null) {
                const vr = p.verticalRate;
                rows.push({ label: "V/RATE", value: `${vr > 0 ? "↑ +" : "↓ "}${vr.toFixed(1)} m/s` });
            }
        }

        if (entity.type === "satellite") {
            if (p.name) rows.push({ label: "NAME", value: p.name });
            if (p.id) rows.push({ label: "NORAD ID", value: String(p.id) });
            if (p.orbitCategory) rows.push({ label: "ORBIT CLASS", value: p.orbitCategory });
        }

        if (entity.type === "earthquake") {
            if (p.mag != null) rows.push({ label: "MAGNITUDE", value: `M${p.mag.toFixed(1)}` });
            if (p.place) rows.push({ label: "LOCATION", value: p.place });
            if (p.depth != null) rows.push({ label: "DEPTH", value: `${p.depth} km` });
            if (p.time) rows.push({ label: "TIME", value: new Date(p.time).toLocaleString() });
        }

        if (entity.type === "crime") {
            if (p.city) rows.push({ label: "CITY", value: p.city });
            if (p.type) rows.push({ label: "CATEGORY", value: p.type });
            rows.push({ label: "SOURCE", value: "ABS.gov.au" });
        }

        return rows;
    };

    const details = renderDetails();
    const canTrack = entity.type === "flight" || entity.type === "military-flight" || entity.type === "satellite";

    return (
        <div
            className="ei"
            data-accent={meta.color}
            style={{ "--ei-accent": meta.color } as React.CSSProperties}
        >
            {/* Tracking pulse indicator */}
            {isTracking && <div className="ei__tracking-bar" />}

            {/* Header */}
            <div className="ei__header">
                <div className="ei__header-left">
                    <span className="ei__icon">{meta.icon}</span>
                    <div>
                        <div className="ei__type">{meta.label}</div>
                        <div className="ei__name">{entity.name || entity.id}</div>
                    </div>
                </div>
                <button className="ei__close" onClick={onClose} aria-label="Close">✕</button>
            </div>

            {/* Quick stats (top 3 rows always visible) */}
            {details.slice(0, 3).map((row) => (
                <div key={row.label} className="ei__row">
                    <span className="ei__label">{row.label}</span>
                    <span className="ei__value">{row.value}</span>
                </div>
            ))}

            {/* Expanded details */}
            {expanded && details.slice(3).map((row) => (
                <div key={row.label} className="ei__row">
                    <span className="ei__label">{row.label}</span>
                    <span className="ei__value">{row.value}</span>
                </div>
            ))}

            {/* More info toggle */}
            {details.length > 3 && (
                <button className="ei__expand" onClick={() => setExpanded(!expanded)}>
                    {expanded ? "▲ Less" : `▼ More info (${details.length - 3} more)`}
                </button>
            )}

            {/* Action buttons */}
            <div className="ei__actions">
                <button className="ei__btn ei__btn--fly" onClick={handleFlyTo}>
                    🎯 Fly To
                </button>
                {canTrack && (
                    <button
                        className={`ei__btn ei__btn--track ${isTracking ? "ei__btn--active" : ""}`}
                        onClick={handleTrack}
                    >
                        {isTracking ? "⏹ Stop Track" : "📡 Track"}
                    </button>
                )}
            </div>
        </div>
    );
}
