/**
 * ThreatAssessmentPanel — auto-generates a formatted intelligence brief
 * from the active scenario and known threat-system data.
 *
 * Rendered as a standalone glassmorphic panel (left side).
 * Wire into ScenarioPanel by importing and toggling with a "THREAT BRIEF" button.
 */
import { useMemo } from "react";
import type { Scenario } from "./types.ts";
import { THREAT_SYSTEMS } from "../../layers/military/MissileRangeLayer.ts";
import "./threat-assessment.css";

interface Props {
    scenario: Scenario | null;
    onClose: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDtg(date: Date): string {
    // Military DTG: DDHHMMSSZMonYYYY  e.g. 271423Z FEB 2026
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const hh = String(date.getUTCHours()).padStart(2, "0");
    const mm = String(date.getUTCMinutes()).padStart(2, "0");
    const ss = String(date.getUTCSeconds()).padStart(2, "0");
    const months = [
        "JAN","FEB","MAR","APR","MAY","JUN",
        "JUL","AUG","SEP","OCT","NOV","DEC",
    ];
    const mon = months[date.getUTCMonth()];
    const yyyy = date.getUTCFullYear();
    return `${dd}${hh}${mm}${ss}Z ${mon} ${yyyy}`;
}

function computeDurationHours(startIso: string, stopIso: string): string {
    const diff = new Date(stopIso).getTime() - new Date(startIso).getTime();
    const h = diff / (1000 * 60 * 60);
    return h.toFixed(1);
}

function fmtCoord(lat: number, lon: number): string {
    const latDir = lat >= 0 ? "N" : "S";
    const lonDir = lon >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(2)}\u00B0${latDir}, ${Math.abs(lon).toFixed(2)}\u00B0${lonDir}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ThreatAssessmentPanel({ scenario, onClose }: Props) {
    const dtg = useMemo(() => formatDtg(new Date()), []);

    if (!scenario) return null;

    const durationH = computeDurationHours(scenario.startIso, scenario.stopIso);

    // Group targets by category
    const primaryTargets = scenario.targets.filter((t) => t.category === "primary");
    const secondaryTargets = scenario.targets.filter((t) => t.category === "secondary");
    const interestTargets = scenario.targets.filter((t) => t.category === "interest");

    return (
        <div className="ta-anchor">
            <div className="ta">
                {/* ── Window chrome ───────────────────────────────────── */}
                <div className="ta__header">
                    <span className="ta__title">THREAT ASSESSMENT</span>
                    <button className="ta__close" onClick={onClose} aria-label="Close">
                        &#x2715;
                    </button>
                </div>

                {/* ── Brief body ──────────────────────────────────────── */}
                <div className="ta__body">
                    <div className="ta__divider">=</div>

                    <div className="ta__banner">
                        <div className="ta__banner-line">THREAT ASSESSMENT &mdash; {scenario.codename}</div>
                        <div className="ta__banner-line ta__redacted">
                            CLASSIFICATION: <span className="ta__block">&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;</span> // NOFORN
                        </div>
                        <div className="ta__banner-line">DTG: {dtg}</div>
                    </div>

                    <div className="ta__divider">=</div>

                    {/* Section 1 */}
                    <div className="ta__section">
                        <div className="ta__section-hdr">1. SITUATION</div>
                        <div className="ta__para">{scenario.description}</div>
                    </div>

                    {/* Section 2 */}
                    <div className="ta__section">
                        <div className="ta__section-hdr">2. OVERHEAD COLLECTION WINDOW</div>
                        <div className="ta__kv">
                            <span className="ta__key">START</span>
                            <span className="ta__val">{scenario.startIso}</span>
                        </div>
                        <div className="ta__kv">
                            <span className="ta__key">STOP</span>
                            <span className="ta__val">{scenario.stopIso}</span>
                        </div>
                        <div className="ta__kv">
                            <span className="ta__key">DURATION</span>
                            <span className="ta__val">{durationH}h</span>
                        </div>
                    </div>

                    {/* Section 3 */}
                    <div className="ta__section">
                        <div className="ta__section-hdr">3. TARGET COMPLEX</div>
                        {primaryTargets.map((t) => (
                            <div key={t.label} className="ta__target ta__target--primary">
                                <span className="ta__target-cat">PRIMARY</span>
                                <span className="ta__target-label">{t.label}</span>
                                <span className="ta__target-coord">({fmtCoord(t.lat, t.lon)})</span>
                            </div>
                        ))}
                        {secondaryTargets.map((t) => (
                            <div key={t.label} className="ta__target ta__target--secondary">
                                <span className="ta__target-cat">SECONDARY</span>
                                <span className="ta__target-label">{t.label}</span>
                                <span className="ta__target-coord">({fmtCoord(t.lat, t.lon)})</span>
                            </div>
                        ))}
                        {interestTargets.map((t) => (
                            <div key={t.label} className="ta__target ta__target--interest">
                                <span className="ta__target-cat">INTEREST</span>
                                <span className="ta__target-label">{t.label}</span>
                                <span className="ta__target-coord">({fmtCoord(t.lat, t.lon)})</span>
                            </div>
                        ))}
                    </div>

                    {/* Section 4 */}
                    <div className="ta__section">
                        <div className="ta__section-hdr">4. AIR DEFENSE POSTURE</div>
                        {THREAT_SYSTEMS.map((sys) => (
                            <div key={`${sys.name}-${sys.lat}`} className="ta__threat">
                                <span className="ta__threat-bullet">&#x25AA;</span>
                                <span className="ta__threat-name">{sys.name}</span>
                                <span className="ta__threat-loc">
                                    @ {fmtCoord(sys.lat, sys.lon)}
                                </span>
                                <span className="ta__threat-range">&mdash; {sys.range}km envelope</span>
                                <span className={`ta__threat-country ta__threat-country--${
                                    ["Iran","Russia"].includes(sys.country) ? "hostile" : "friendly"
                                }`}>
                                    [{sys.country.toUpperCase()}]
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Section 5 */}
                    <div className="ta__section">
                        <div className="ta__section-hdr">5. SIGINT ASSESSMENT</div>
                        <div className="ta__placeholder">
                            Run SIGINT analysis for satellite pass data
                        </div>
                    </div>

                    {/* Section 6 */}
                    <div className="ta__section">
                        <div className="ta__section-hdr">6. RISK MATRIX</div>
                        <div className="ta__risk-bar">
                            <span className="ta__risk-fill">&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;</span>
                            <span className="ta__risk-label">CRITICAL</span>
                        </div>
                        <div className="ta__kv">
                            <span className="ta__key">Integrated air defense</span>
                            <span className="ta__val ta__val--warn">LAYERED</span>
                        </div>
                        <div className="ta__kv">
                            <span className="ta__key">EW capability</span>
                            <span className="ta__val ta__val--warn">MODERATE-HIGH</span>
                        </div>
                        <div className="ta__kv">
                            <span className="ta__key">ISR coverage</span>
                            <span className="ta__val ta__val--warn">CONTESTED</span>
                        </div>
                    </div>

                    <div className="ta__divider">=</div>

                    <div className="ta__footer">
                        <div>PREPARED BY: PALENTIR GEOINT SYSTEM</div>
                        <div className="ta__redacted">
                            <span className="ta__block">&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;</span>
                            {" // "}
                            <span className="ta__block">&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;</span>
                            {" // "}
                            <span className="ta__block">&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;</span>
                        </div>
                    </div>

                    <div className="ta__divider">=</div>
                </div>
            </div>
        </div>
    );
}
