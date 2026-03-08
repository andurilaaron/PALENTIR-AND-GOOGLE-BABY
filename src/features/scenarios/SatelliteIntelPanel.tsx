/**
 * SatelliteIntelPanel — shows which satellites passed over the scenario area.
 *
 * Identifies operator/country, flags recon assets, highlights likely-tasked sats.
 * Triggered by clicking "SIGINT" button in the ScenarioPanel when a scenario is active.
 */
import { useState, useCallback, useRef } from "react";
import { LayerRegistry } from "../../core/LayerRegistry.ts";
import { SatelliteLayer } from "../../layers/satellites/SatelliteLayer.ts";
import { computeSatellitePasses } from "./SatelliteIntel.ts";
import type { SatPass } from "./SatelliteIntel.ts";
import type { Scenario } from "./types.ts";
import "./satellite-intel.css";

interface Props {
    scenario: Scenario | null;
    onClose: () => void;
}

function formatTime(iso: string): string {
    return iso.replace("T", " ").substring(11, 19) + "Z";
}

export function SatelliteIntelPanel({ scenario, onClose }: Props) {
    const [passes, setPasses] = useState<SatPass[] | null>(null);
    const [computing, setComputing] = useState(false);
    const [filter, setFilter] = useState<"all" | "recon" | "tasked">("all");
    const computed = useRef(false);

    const handleCompute = useCallback(() => {
        if (!scenario) return;

        const satLayer = LayerRegistry.getAll().find(
            (l) => l.id === "satellites"
        ) as SatelliteLayer | undefined;

        if (!satLayer || !satLayer.enabled) {
            alert("Enable the Satellites layer first.");
            return;
        }

        const records = satLayer.getRecords();
        if (records.length === 0) {
            alert("No satellite data loaded yet. Wait for TLEs to load.");
            return;
        }

        setComputing(true);
        computed.current = true;

        // Run in a timeout to avoid blocking UI
        setTimeout(() => {
            const results = computeSatellitePasses(
                records,
                scenario.targets,
                scenario.startIso,
                scenario.stopIso,
                120, // 2-min steps for speed
                800  // 800km max range
            );
            setPasses(results);
            setComputing(false);
        }, 50);
    }, [scenario]);

    if (!scenario) return null;

    const filtered = passes
        ? passes.filter((p) => {
              if (filter === "recon") return p.isRecon;
              if (filter === "tasked") return p.likelyTasked;
              return true;
          })
        : null;

    const reconCount = passes?.filter((p) => p.isRecon).length ?? 0;
    const taskedCount = passes?.filter((p) => p.likelyTasked).length ?? 0;

    // Group by country
    const countryGroups = new Map<string, number>();
    if (filtered) {
        for (const p of filtered) {
            const key = `${p.operator.flag} ${p.operator.country}`;
            countryGroups.set(key, (countryGroups.get(key) ?? 0) + 1);
        }
    }

    return (
        <div className="si-anchor">
            <div className="si">
                {/* Header */}
                <div className="si__header">
                    <span className="si__title">SATELLITE INTELLIGENCE</span>
                    <button className="si__close" onClick={onClose}>
                        \u2715
                    </button>
                </div>

                <div className="si__scenario">
                    {scenario.codename} &mdash;{" "}
                    {scenario.targets.length} targets
                </div>

                {/* Compute button */}
                {!computed.current && (
                    <button
                        className="si__compute"
                        onClick={handleCompute}
                        disabled={computing}
                    >
                        {computing
                            ? "COMPUTING PASSES..."
                            : "ANALYZE SATELLITE PASSES"}
                    </button>
                )}

                {computing && (
                    <div className="si__loading">
                        Propagating orbits over target area...
                    </div>
                )}

                {/* Results */}
                {filtered && !computing && (
                    <>
                        {/* Summary bar */}
                        <div className="si__summary">
                            <span className="si__stat">
                                {passes!.length} SATS OVERHEAD
                            </span>
                            <span className="si__stat si__stat--recon">
                                {reconCount} RECON
                            </span>
                            <span className="si__stat si__stat--tasked">
                                {taskedCount} LIKELY TASKED
                            </span>
                        </div>

                        {/* Country breakdown */}
                        <div className="si__countries">
                            {Array.from(countryGroups.entries())
                                .sort((a, b) => b[1] - a[1])
                                .map(([country, count]) => (
                                    <span key={country} className="si__country">
                                        {country}: {count}
                                    </span>
                                ))}
                        </div>

                        {/* Filter buttons */}
                        <div className="si__filters">
                            <button
                                className={`si__filter ${filter === "all" ? "si__filter--active" : ""}`}
                                onClick={() => setFilter("all")}
                            >
                                ALL ({passes!.length})
                            </button>
                            <button
                                className={`si__filter ${filter === "recon" ? "si__filter--active" : ""}`}
                                onClick={() => setFilter("recon")}
                            >
                                RECON ({reconCount})
                            </button>
                            <button
                                className={`si__filter ${filter === "tasked" ? "si__filter--active" : ""}`}
                                onClick={() => setFilter("tasked")}
                            >
                                TASKED ({taskedCount})
                            </button>
                        </div>

                        {/* Pass list */}
                        <div className="si__list">
                            {filtered.map((p) => (
                                <div
                                    key={p.satellite.id}
                                    className={`si__sat ${p.likelyTasked ? "si__sat--tasked" : p.isRecon ? "si__sat--recon" : ""}`}
                                >
                                    <div className="si__sat-header">
                                        <span className="si__sat-flag">
                                            {p.operator.flag}
                                        </span>
                                        <span className="si__sat-name">
                                            {p.satellite.name}
                                        </span>
                                        {p.likelyTasked && (
                                            <span className="si__badge si__badge--tasked">
                                                TASKED
                                            </span>
                                        )}
                                        {p.isRecon && !p.likelyTasked && (
                                            <span className="si__badge si__badge--recon">
                                                {p.reconType}
                                            </span>
                                        )}
                                    </div>
                                    <div className="si__sat-meta">
                                        <span>
                                            {p.operator.agency} &middot; NORAD{" "}
                                            {p.satellite.id}
                                        </span>
                                        <span>
                                            {p.satellite.orbitCategory} &middot;{" "}
                                            {p.passes.length} pass
                                            {p.passes.length > 1 ? "es" : ""}
                                        </span>
                                    </div>
                                    <div className="si__sat-detail">
                                        <span>
                                            Closest: {p.closestApproachKm} km
                                            from {p.closestTarget}
                                        </span>
                                    </div>

                                    {/* Individual pass windows */}
                                    {p.passes.map((pw, i) => (
                                        <div key={i} className="si__pass">
                                            <span className="si__pass-time">
                                                {formatTime(pw.enterIso)} →{" "}
                                                {formatTime(pw.exitIso)}
                                            </span>
                                            <span className="si__pass-info">
                                                Peak: {Math.round(pw.peakAltKm)}
                                                km alt, {Math.round(pw.peakDistKm)}
                                                km from {pw.nearestTarget}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
