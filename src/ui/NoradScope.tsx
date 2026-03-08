/**
 * NoradScope — NORAD-style full-screen satellite tracking overlay.
 * Rendered into document.body via a React portal so it is never clipped
 * by the EntityInspector panel. pointer-events: none — globe stays interactive.
 */
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "./styles/norad-scope.css";

// --- Deterministic helpers (mirror of EntityInspector's hashCode) ---
function hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

function fakeInclination(noradId: string): string {
    // Produce a plausible inclination 0–98° deterministically from the ID
    const deg = (hashCode(noradId) % 980) / 10;
    return `${deg.toFixed(1)}°`;
}

function fakePeriod(orbitType: string, noradId: string): string {
    // Rough period ranges by orbit class, jittered deterministically
    const jitter = (hashCode(noradId + "period") % 200) / 10; // 0–20
    if (orbitType === "GEO") return "1436.0 min";
    if (orbitType === "MEO") return `${(360 + jitter * 5).toFixed(1)} min`;
    // LEO default
    return `${(88 + jitter * 0.5).toFixed(1)} min`;
}

function fakeRange(noradId: string, altitude: string): string {
    // Range = slant range from observer: altitude + some offset
    const altKm = parseFloat(altitude);
    if (isNaN(altKm)) return "—";
    const offset = (hashCode(noradId + "range") % 500) + 100;
    return `${(altKm + offset).toFixed(0)} km`;
}

function fakeElevation(noradId: string): string {
    const el = (hashCode(noradId + "elev") % 700) / 10; // 0–70°
    return `${el.toFixed(1)}°`;
}

export interface NoradScopeProps {
    visible: boolean;
    satelliteName: string;
    noradId: string;
    altitude: string;
    orbitType: string;
    lat: string;
    lon: string;
}

export function NoradScope({
    visible,
    satelliteName,
    noradId,
    altitude,
    orbitType,
    lat,
    lon,
}: NoradScopeProps) {
    // UTC clock ticking every second for the bottom-left box
    const [utcTime, setUtcTime] = useState(() => new Date().toUTCString().slice(17, 25));
    const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!visible) {
            if (clockRef.current) {
                clearInterval(clockRef.current);
                clockRef.current = null;
            }
            return;
        }
        setUtcTime(new Date().toUTCString().slice(17, 25));
        clockRef.current = setInterval(() => {
            setUtcTime(new Date().toUTCString().slice(17, 25));
        }, 1000);
        return () => {
            if (clockRef.current) {
                clearInterval(clockRef.current);
                clockRef.current = null;
            }
        };
    }, [visible]);

    if (!visible) return null;

    const inclination = fakeInclination(noradId || satelliteName);
    const period = fakePeriod(orbitType, noradId || satelliteName);
    const range = fakeRange(noradId || satelliteName, altitude);
    const elevation = fakeElevation(noradId || satelliteName);

    const content = (
        <div className="ns ns--visible" aria-hidden="true">
            {/* Full-viewport crosshairs */}
            <div className="ns__crosshair-h" />
            <div className="ns__crosshair-v" />

            {/* Corner HUD brackets */}
            <div className="ns__brackets">
                <div className="ns__bracket ns__bracket--tl" />
                <div className="ns__bracket ns__bracket--tr" />
                <div className="ns__bracket ns__bracket--bl" />
                <div className="ns__bracket ns__bracket--br" />
            </div>

            {/* Radar sweep (inside outer ring, CSS conic-gradient) */}
            <div className="ns__sweep-wrapper">
                <div className="ns__sweep" />
            </div>

            {/* Outer acquisition ring */}
            <div className="ns__ring-outer" />

            {/* Inner ring */}
            <div className="ns__ring-inner" />

            {/* Center dot */}
            <div className="ns__center-dot" />

            {/* ---- TOP-LEFT: NORAD TRACK ---- */}
            <div className="ns__box ns__box--tl">
                <div className="ns__box-header">
                    <span className="ns__blink" />
                    NORAD TRACK
                </div>
                <div className="ns__sat-name">{satelliteName || "UNKNOWN"}</div>
                <div className="ns__row">
                    <span className="ns__row-label">NORAD ID</span>
                    <span className="ns__row-value ns__row-value--bright">{noradId || "—"}</span>
                </div>
                <div className="ns__row">
                    <span className="ns__row-label">ALTITUDE</span>
                    <span className="ns__row-value">{altitude || "—"}</span>
                </div>
                <div className="ns__row">
                    <span className="ns__row-label">UTC</span>
                    <span className="ns__row-value ns__row-value--green">{utcTime}</span>
                </div>
            </div>

            {/* ---- TOP-RIGHT: ORBITAL ELEMENTS ---- */}
            <div className="ns__box ns__box--tr">
                <div className="ns__box-header">ORBITAL ELEMENTS</div>
                <div className="ns__row">
                    <span className="ns__row-label">ORBIT TYPE</span>
                    <span className="ns__row-value ns__row-value--bright">{orbitType || "—"}</span>
                </div>
                <div className="ns__row">
                    <span className="ns__row-label">INCLINATION</span>
                    <span className="ns__row-value">{inclination}</span>
                </div>
                <div className="ns__row">
                    <span className="ns__row-label">PERIOD</span>
                    <span className="ns__row-value">{period}</span>
                </div>
                <div className="ns__row">
                    <span className="ns__row-label">EPOCH</span>
                    <span className="ns__row-value ns__row-value--green">
                        {new Date().toISOString().slice(0, 10)}
                    </span>
                </div>
            </div>

            {/* ---- BOTTOM-LEFT: GROUND TRACK ---- */}
            <div className="ns__box ns__box--bl">
                <div className="ns__box-header">GROUND TRACK</div>
                <div className="ns__row">
                    <span className="ns__row-label">LAT</span>
                    <span className="ns__row-value ns__row-value--bright">{lat || "—"}</span>
                </div>
                <div className="ns__row">
                    <span className="ns__row-label">LON</span>
                    <span className="ns__row-value ns__row-value--bright">{lon || "—"}</span>
                </div>
                <div className="ns__row">
                    <span className="ns__row-label">SUB-POINT</span>
                    <span className="ns__row-value ns__row-value--green">UPDATING</span>
                </div>
            </div>

            {/* ---- BOTTOM-RIGHT: ACQUISITION ---- */}
            <div className="ns__box ns__box--br">
                <div className="ns__box-header">ACQUISITION</div>
                <div className="ns__row">
                    <span className="ns__row-label">SIGNAL</span>
                    <div className="ns__signal-bar-track">
                        <div className="ns__signal-bar-fill" />
                    </div>
                </div>
                <div className="ns__row">
                    <span className="ns__row-label">RANGE</span>
                    <span className="ns__row-value">{range}</span>
                </div>
                <div className="ns__row">
                    <span className="ns__row-label">ELEVATION</span>
                    <span className="ns__row-value">{elevation}</span>
                </div>
                <div className="ns__row">
                    <span className="ns__row-label">STATUS</span>
                    <span className="ns__row-value ns__row-value--green">
                        <span className="ns__blink" />
                        LOCKED
                    </span>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(content, document.body);
}
