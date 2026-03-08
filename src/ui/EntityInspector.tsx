/**
 * EntityInspector — unified click-to-select panel for ALL entity types.
 * Handles: flights, military flights, satellites, earthquakes, crimes.
 * Actions: Track (lock camera + live trail), Fly To, More Info, Close.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useViewer } from "../core/ViewerContext.tsx";
import "./styles/entity-inspector.css";
import { NoradScope } from "./NoradScope.tsx";

// --- Deterministic hash helpers for redacted field values ---
function hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}
function pickByHash(arr: string[], entityId: string, salt: number): string {
    return arr[(hashCode(entityId) + salt) % arr.length];
}

export interface InspectedEntity {
    id: string;
    name: string;
    type: "flight" | "military-flight" | "satellite" | "earthquake" | "crime" | "cctv" | "detection" | "cable" | "nuclear" | "military-base" | "unknown";
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
    "cctv": { icon: "📹", color: "#22c55e", label: "CCTV CAMERA" },
    "detection": { icon: "🚗", color: "#d4a017", label: "VEHICLE DETECT" },
    "cable": { icon: "🔌", color: "#22d3ee", label: "SUBMARINE CABLE" },
    "nuclear": { icon: "☢️", color: "#f59e0b", label: "NUCLEAR FACILITY" },
    "military-base": { icon: "🏛️", color: "#ef4444", label: "MIL INSTALLATION" },
    "unknown": { icon: "📍", color: "#9ca3af", label: "ENTITY" },
};

const TRAIL_MAX_POINTS = 300; // ~10 minutes at 2s sample rate
const TRAIL_SAMPLE_MS = 2000;
const TRAIL_ENTITY_PREFIX = "ei-trail-";

// --- Telemetry helpers ---
function headingToCompass(deg: number): string {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

interface TrackingTelemetry {
    speed: string;
    altitude: string;
    heading: string;
    vrate: string;
}

export function EntityInspector({ entity, onClose }: EntityInspectorProps) {
    const viewer = useViewer();
    const [expanded, setExpanded] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [trackingTelemetry, setTrackingTelemetry] = useState<TrackingTelemetry | null>(null);
    // Satellite ground track — updated every second alongside telemetry
    const [scopeLat, setScopeLat] = useState("—");
    const [scopeLon, setScopeLon] = useState("—");

    // Trail state — lives as refs so it doesn't cause re-renders on each sample
    const trailPositions = useRef<any[]>([]);    // Cesium.Cartesian3 ring buffer
    const trailTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const telemTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const trailEntityId = useRef<string | null>(null);

    /** Tear down any active trail polyline + timer */
    const clearTrail = useCallback(() => {
        if (trailTimer.current) {
            clearInterval(trailTimer.current);
            trailTimer.current = null;
        }
        if (telemTimer.current) {
            clearInterval(telemTimer.current);
            telemTimer.current = null;
        }
        if (trailEntityId.current && viewer) {
            const te = viewer.entities.getById(trailEntityId.current);
            if (te) viewer.entities.remove(te);
            trailEntityId.current = null;
        }
        trailPositions.current = [];
        setTrackingTelemetry(null);
        setScopeLat("—");
        setScopeLon("—");
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

            // --- Live telemetry ticker (1s) ---
            const isFlight = entity.type === "flight" || entity.type === "military-flight";
            const isSatellite = entity.type === "satellite";

            const readTelemetry = () => {
                if (isFlight) {
                    // Read latest values from the entity's properties bag
                    const rec = cesiumEntity.properties?.getValue
                        ? cesiumEntity.properties.getValue(viewer.clock.currentTime)
                        : null;
                    const src = rec ?? entity.properties;
                    const speedKts = src?.velocity != null
                        ? `${(src.velocity * 1.944).toFixed(0)} kts`
                        : "—";
                    const altFt = src?.altitude != null
                        ? `${Math.round(src.altitude * 3.28084).toLocaleString()} ft`
                        : "—";
                    const hdgDeg = src?.heading != null ? Math.round(src.heading) : null;
                    const hdg = hdgDeg != null
                        ? `${hdgDeg}° ${headingToCompass(hdgDeg)}`
                        : "—";
                    const vr = src?.verticalRate;
                    const vrate = vr != null
                        ? `${vr > 0 ? "↑ +" : vr < 0 ? "↓ " : ""}${vr.toFixed(1)} m/s`
                        : "—";
                    setTrackingTelemetry({ speed: speedKts, altitude: altFt, heading: hdg, vrate });
                } else if (isSatellite) {
                    const pos = samplePosition();
                    let altKm = "—";
                    if (pos) {
                        try {
                            const carto = Cesium.Cartographic.fromCartesian(pos);
                            altKm = `${(carto.height / 1000).toFixed(0)} km`;
                            // Update ground-track lat/lon for NoradScope
                            const latDeg = Cesium.Math.toDegrees(carto.latitude);
                            const lonDeg = Cesium.Math.toDegrees(carto.longitude);
                            setScopeLat(`${latDeg.toFixed(4)}°`);
                            setScopeLon(`${lonDeg.toFixed(4)}°`);
                        } catch {
                            altKm = "—";
                        }
                    }
                    const rec = cesiumEntity.properties?.getValue
                        ? cesiumEntity.properties.getValue(viewer.clock.currentTime)
                        : null;
                    const src = rec ?? entity.properties;
                    // Orbital velocity: v ≈ sqrt(GM / r), GM=3.986e14, r = R_earth + h
                    let spdKms = "—";
                    if (pos) {
                        try {
                            const carto = Cesium.Cartographic.fromCartesian(pos);
                            const r = 6371000 + carto.height;
                            const v = Math.sqrt(3.986e14 / r) / 1000;
                            spdKms = `${v.toFixed(2)} km/s`;
                        } catch {
                            spdKms = "—";
                        }
                    }
                    const orbitCat = src?.orbitCategory ?? entity.properties?.orbitCategory;
                    // Classify orbit type
                    let orbitType = orbitCat ?? "—";
                    if (!orbitCat && pos) {
                        try {
                            const carto = Cesium.Cartographic.fromCartesian(pos);
                            const h = carto.height / 1000;
                            orbitType = h < 2000 ? "LEO" : h < 35000 ? "MEO" : "GEO";
                        } catch {
                            orbitType = "—";
                        }
                    }
                    setTrackingTelemetry({
                        speed: spdKms,
                        altitude: altKm,
                        heading: orbitType,
                        vrate: "—",
                    });
                }
            };

            // Run immediately then every second
            readTelemetry();
            telemTimer.current = setInterval(readTelemetry, 1000);
        }
    };

    /** Render entity-specific detail rows */
    const renderDetails = () => {
        const rows: { label: string; value: string; redacted?: "block" | "bracket" | "class" }[] = [];

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

        if (entity.type === "cctv") {
            if (p.status) rows.push({ label: "STATUS", value: p.status.toUpperCase() });
            if (p.type) rows.push({ label: "TYPE", value: p.type.toUpperCase() });
            if (p.location) rows.push({ label: "LOCATION", value: p.location });
            if (p.latitude != null && p.longitude != null) {
                rows.push({ label: "COORDS", value: `${p.latitude.toFixed(4)}°, ${p.longitude.toFixed(4)}°` });
            }
        }

        if (entity.type === "cable") {
            if (p.name) rows.push({ label: "NAME", value: p.name });
            if (p.capacity) rows.push({ label: "CAPACITY", value: p.capacity });
            if (p.length) rows.push({ label: "LENGTH", value: p.length });
            if (p.rfs) rows.push({ label: "READY FOR SERVICE", value: p.rfs });
        }

        if (entity.type === "nuclear") {
            if (p.name) rows.push({ label: "FACILITY", value: p.name });
            if (p.country) rows.push({ label: "COUNTRY", value: p.country });
            if (p.type) rows.push({ label: "TYPE", value: p.type });
            if (p.capacity) rows.push({ label: "CAPACITY", value: p.capacity });
            if (p.status) rows.push({ label: "STATUS", value: p.status });
        }

        if (entity.type === "military-base") {
            if (p.name) rows.push({ label: "INSTALLATION", value: p.name });
            if (p.country) rows.push({ label: "COUNTRY", value: p.country });
            if (p.type) rows.push({ label: "TYPE", value: p.type });
            if (p.branch) rows.push({ label: "BRANCH", value: p.branch });
        }

        // Redacted intel fields (decorative) — deterministic per entity ID
        const eid = entity.id;
        rows.push({ label: "OPERATOR",        value: "████████████",          redacted: "block"  });
        rows.push({ label: "MISSION ID",      value: "██████-████",           redacted: "block"  });
        rows.push({ label: "TASKING REF",     value: "[REDACTED — LEVEL 4]",  redacted: "bracket" });
        rows.push({
            label: "COLLECTION",
            value: `${pickByHash(["HUMINT","SIGINT","GEOINT","MASINT","OSINT"], eid, 0)} / ${pickByHash(["TIER 1","TIER 2","TIER 3"], eid, 7)}`,
            redacted: "block",
        });
        rows.push({
            label: "CLASSIFICATION",
            value: pickByHash(["TS//SI//TK","S//NF","TS//SCI","C//REL FVEY"], eid, 13),
            redacted: "class",
        });

        return rows;
    };

    const details = renderDetails();
    const canTrack = entity.type === "flight" || entity.type === "military-flight" || entity.type === "satellite";

    const redactedClass = (r?: "block" | "bracket" | "class"): string => {
        if (!r) return "ei__value";
        if (r === "bracket") return "ei__value ei__value--redacted-bracket";
        if (r === "class")   return "ei__value ei__value--redacted-class";
        return "ei__value ei__value--redacted";
    };

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
                    <span className={redactedClass(row.redacted)}>{row.value}</span>
                </div>
            ))}

            {/* Expanded details */}
            {expanded && details.slice(3).map((row) => (
                <div key={row.label} className="ei__row">
                    <span className="ei__label">{row.label}</span>
                    <span className={redactedClass(row.redacted)}>{row.value}</span>
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

            {/* Live telemetry readout */}
            {isTracking && trackingTelemetry && (() => {
                const isFlight = entity.type === "flight" || entity.type === "military-flight";
                const isSat = entity.type === "satellite";
                return (
                    <div className="ei__telemetry">
                        {isFlight && <>
                            <div className="ei__telem-item">
                                <span className="ei__telem-label">SPD</span>
                                <span className="ei__telem-value">{trackingTelemetry.speed}</span>
                            </div>
                            <div className="ei__telem-item">
                                <span className="ei__telem-label">ALT</span>
                                <span className="ei__telem-value">{trackingTelemetry.altitude}</span>
                            </div>
                            <div className="ei__telem-item">
                                <span className="ei__telem-label">HDG</span>
                                <span className="ei__telem-value">{trackingTelemetry.heading}</span>
                            </div>
                            <div className="ei__telem-item">
                                <span className="ei__telem-label">V/S</span>
                                <span className="ei__telem-value">{trackingTelemetry.vrate}</span>
                            </div>
                        </>}
                        {isSat && <>
                            <div className="ei__telem-item">
                                <span className="ei__telem-label">ALT</span>
                                <span className="ei__telem-value">{trackingTelemetry.altitude}</span>
                            </div>
                            <div className="ei__telem-item">
                                <span className="ei__telem-label">SPD</span>
                                <span className="ei__telem-value">{trackingTelemetry.speed}</span>
                            </div>
                            <div className="ei__telem-item">
                                <span className="ei__telem-label">ORBIT</span>
                                <span className="ei__telem-value">{trackingTelemetry.heading}</span>
                            </div>
                        </>}
                    </div>
                );
            })()}

            {/* NORAD Scope overlay — satellite tracking only, rendered to body via portal */}
            <NoradScope
                visible={isTracking && entity.type === "satellite"}
                satelliteName={entity.name || entity.id}
                noradId={String(entity.properties?.id ?? entity.id)}
                altitude={trackingTelemetry?.altitude ?? "—"}
                orbitType={trackingTelemetry?.heading ?? entity.properties?.orbitCategory ?? "—"}
                lat={scopeLat}
                lon={scopeLon}
            />
        </div>
    );
}
