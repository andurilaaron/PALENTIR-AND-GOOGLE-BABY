/**
 * SearchBar — Location / address / coordinate search with Nominatim geocoding.
 *
 * Keyboard shortcuts:
 *   /  or  Ctrl+K  — open
 *   Escape          — close
 *   Arrow Up/Down   — navigate results
 *   Enter           — select highlighted result
 */
import { useEffect, useRef, useState, useCallback } from "react";
import * as Cesium from "cesium";
import { useViewer } from "../core/ViewerContext.tsx";
import "./styles/search-bar.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NominatimResult {
    display_name: string;
    lat: string;
    lon: string;
    type: string;
    class: string;
    addressdetails?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Altitude helpers
// ---------------------------------------------------------------------------

const TYPE_ALTITUDE: Record<string, number> = {
    country:       5_000_000,
    state:         1_000_000,
    region:        1_000_000,
    county:          500_000,
    city:             50_000,
    town:             20_000,
    village:          10_000,
    suburb:            8_000,
    neighbourhood:     5_000,
    road:              2_000,
    house:             1_000,
};

function altitudeForType(type: string): number {
    return TYPE_ALTITUDE[type.toLowerCase()] ?? 10_000;
}

// ---------------------------------------------------------------------------
// Coordinate parsing
// ---------------------------------------------------------------------------

/**
 * Try to parse a raw string as geographic coordinates.
 * Supports:
 *   "34.05, -118.24"
 *   "34.05°N 118.24°W"
 *   "34°03'N 118°14'W"
 *   "34°03'12\"N 118°14'30\"W"
 */
function parseCoords(input: string): { lat: number; lon: number } | null {
    const s = input.trim();

    // Pattern 1: decimal degrees, comma-separated  e.g. "34.05, -118.24"
    const decimal = s.match(
        /^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/
    );
    if (decimal) {
        const lat = parseFloat(decimal[1]);
        const lon = parseFloat(decimal[2]);
        if (isFinite(lat) && isFinite(lon)) return { lat, lon };
    }

    // Pattern 2: decimal degrees with cardinal  e.g. "34.05°N 118.24°W"
    const decimalCard = s.match(
        /^(\d{1,3}(?:\.\d+)?)°?\s*([NS])\s+(\d{1,3}(?:\.\d+)?)°?\s*([EW])$/i
    );
    if (decimalCard) {
        let lat = parseFloat(decimalCard[1]);
        let lon = parseFloat(decimalCard[3]);
        if (decimalCard[2].toUpperCase() === "S") lat = -lat;
        if (decimalCard[4].toUpperCase() === "W") lon = -lon;
        if (isFinite(lat) && isFinite(lon)) return { lat, lon };
    }

    // Pattern 3: DMS  e.g. "34°03'N 118°14'W" or "34°03'12"N 118°14'30"W"
    const dms = s.match(
        /^(\d{1,3})°(\d{1,2})(?:'(\d{1,2})(?:\"|\u201D)?)?[`']?\s*([NS])\s+(\d{1,3})°(\d{1,2})(?:'(\d{1,2})(?:\"|\u201D)?)?[`']?\s*([EW])$/i
    );
    if (dms) {
        const latDeg = parseFloat(dms[1]);
        const latMin = parseFloat(dms[2]);
        const latSec = dms[3] ? parseFloat(dms[3]) : 0;
        const lonDeg = parseFloat(dms[5]);
        const lonMin = parseFloat(dms[6]);
        const lonSec = dms[7] ? parseFloat(dms[7]) : 0;

        let lat = latDeg + latMin / 60 + latSec / 3600;
        let lon = lonDeg + lonMin / 60 + lonSec / 3600;
        if (dms[4].toUpperCase() === "S") lat = -lat;
        if (dms[8].toUpperCase() === "W") lon = -lon;
        if (isFinite(lat) && isFinite(lon)) return { lat, lon };
    }

    return null;
}

// ---------------------------------------------------------------------------
// Nominatim fetch
// ---------------------------------------------------------------------------

async function fetchNominatim(query: string): Promise<NominatimResult[]> {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "8");
    url.searchParams.set("addressdetails", "1");

    const resp = await fetch(url.toString(), {
        headers: {
            "User-Agent": "Palentir-GEOINT/1.0",
            "Accept-Language": "en",
        },
    });

    if (!resp.ok) throw new Error(`Nominatim HTTP ${resp.status}`);
    return resp.json() as Promise<NominatimResult[]>;
}

// ---------------------------------------------------------------------------
// SearchBar component
// ---------------------------------------------------------------------------

export function SearchBar() {
    const viewer = useViewer();

    const [open, setOpen] = useState(false);
    const [closing, setClosing] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    // ── Open / close helpers ───────────────────────────────────────────────

    const openSearch = useCallback(() => {
        setOpen(true);
        setClosing(false);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    const closeSearch = useCallback(() => {
        setClosing(true);
        setTimeout(() => {
            setOpen(false);
            setClosing(false);
            setQuery("");
            setResults([]);
            setSelectedIndex(-1);
        }, 150);
    }, []);

    // ── Global keyboard shortcuts ──────────────────────────────────────────

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            // Don't steal keystrokes while typing in other inputs
            const tag = (e.target as HTMLElement)?.tagName;
            const inInput = tag === "INPUT" || tag === "TEXTAREA";

            if (!open) {
                if (
                    (e.key === "/" && !inInput) ||
                    (e.key === "k" && e.ctrlKey)
                ) {
                    e.preventDefault();
                    openSearch();
                }
            } else {
                if (e.key === "Escape") {
                    e.preventDefault();
                    closeSearch();
                }
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, openSearch, closeSearch]);

    // ── Debounced query → Nominatim ────────────────────────────────────────

    useEffect(() => {
        if (!open) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (abortRef.current) abortRef.current.abort();

        const trimmed = query.trim();

        if (!trimmed) {
            setResults([]);
            setLoading(false);
            setSelectedIndex(-1);
            return;
        }

        // If it looks like raw coordinates, skip Nominatim
        if (parseCoords(trimmed)) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        debounceRef.current = setTimeout(async () => {
            const ctrl = new AbortController();
            abortRef.current = ctrl;

            try {
                const data = await fetchNominatim(trimmed);
                if (!ctrl.signal.aborted) {
                    setResults(data);
                    setSelectedIndex(-1);
                }
            } catch {
                if (!ctrl.signal.aborted) setResults([]);
            } finally {
                if (!ctrl.signal.aborted) setLoading(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, open]);

    // ── Fly camera ────────────────────────────────────────────────────────

    const flyTo = useCallback(
        (lat: number, lon: number, type: string, label?: string) => {
            if (!viewer) return;

            const altitude = altitudeForType(type);
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(lon, lat, altitude),
                duration: 2.0,
            });

            // Drop a temporary pin entity
            const pinId = `search-pin-${Date.now()}`;
            const pinEntity = viewer.entities.add({
                id: pinId,
                name: label ?? "Search result",
                position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
                point: {
                    pixelSize: 10,
                    color: Cesium.Color.fromCssColorString("#22d3ee"),
                    outlineColor: Cesium.Color.fromCssColorString("#0a101c"),
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                },
                label: label
                    ? new Cesium.LabelGraphics({
                          text: label.length > 40 ? label.slice(0, 40) + "…" : label,
                          font: "11px monospace",
                          fillColor: Cesium.Color.fromCssColorString("#dce8f8"),
                          outlineColor: Cesium.Color.fromCssColorString("#0a101c"),
                          outlineWidth: 2,
                          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                          pixelOffset: new Cesium.Cartesian2(0, -18),
                          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                      })
                    : undefined,
            });

            // Auto-remove after 30 seconds
            setTimeout(() => {
                if (viewer && !viewer.isDestroyed()) {
                    viewer.entities.removeById(pinId);
                }
            }, 30_000);

            void pinEntity; // suppress unused-var lint
        },
        [viewer]
    );

    // ── Handle result selection ────────────────────────────────────────────

    const selectResult = useCallback(
        (result: NominatimResult) => {
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);
            const shortName = result.display_name.split(",")[0].trim();
            flyTo(lat, lon, result.type, shortName);
            closeSearch();
        },
        [flyTo, closeSearch]
    );

    const selectCoords = useCallback(
        (coords: { lat: number; lon: number }) => {
            flyTo(coords.lat, coords.lon, "default");
            closeSearch();
        },
        [flyTo, closeSearch]
    );

    // ── Keyboard navigation inside the dropdown ────────────────────────────

    function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        const trimmed = query.trim();
        const coordMatch = parseCoords(trimmed);

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((i) => Math.max(i - 1, -1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (coordMatch) {
                selectCoords(coordMatch);
            } else if (selectedIndex >= 0 && results[selectedIndex]) {
                selectResult(results[selectedIndex]);
            } else if (results.length > 0) {
                selectResult(results[0]);
            }
        } else if (e.key === "Escape") {
            closeSearch();
        }
    }

    // ── Render helpers ─────────────────────────────────────────────────────

    const trimmedQuery = query.trim();
    const coordMatch = parseCoords(trimmedQuery);
    const showCoordResult = !!coordMatch && trimmedQuery.length > 0;
    const showResults = (results.length > 0 || showCoordResult) && !loading;
    const showNoResults =
        !loading &&
        results.length === 0 &&
        !showCoordResult &&
        trimmedQuery.length >= 2 &&
        !parseCoords(trimmedQuery);

    // ── Render ─────────────────────────────────────────────────────────────

    if (!open) {
        return (
            <button
                className="sb-trigger"
                onClick={openSearch}
                aria-label="Open location search (/ or Ctrl+K)"
                title="Search location (/ or Ctrl+K)"
            >
                <SearchIcon />
            </button>
        );
    }

    return (
        <div className={`sb${closing ? " sb--closing" : ""}`} role="search">
            {/* Input row */}
            <div className="sb__input-row">
                <span className="sb__input-icon" aria-hidden="true">
                    <SearchIcon />
                </span>
                <input
                    ref={inputRef}
                    className="sb__input"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onInputKeyDown}
                    placeholder="Search location, address, coordinates..."
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Location search"
                    aria-autocomplete="list"
                    aria-expanded={showResults}
                />
                <button
                    className="sb__close-btn"
                    onClick={closeSearch}
                    aria-label="Close search"
                    tabIndex={0}
                >
                    ×
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <div className="sb__loading" role="status" aria-live="polite">
                    Searching…
                </div>
            )}

            {/* Coordinate direct-fly shortcut */}
            {showCoordResult && coordMatch && (
                <ul className="sb__results" role="listbox">
                    <li
                        className={`sb__result${selectedIndex === 0 ? " sb__result--selected" : ""}`}
                        role="option"
                        aria-selected={selectedIndex === 0}
                        onClick={() => selectCoords(coordMatch)}
                        onMouseEnter={() => setSelectedIndex(0)}
                    >
                        <span className="sb__result-name">
                            Fly to coordinates
                        </span>
                        <span className="sb__pin-badge">coords</span>
                        <span className="sb__result-coords">
                            {coordMatch.lat.toFixed(5)},{" "}
                            {coordMatch.lon.toFixed(5)}
                        </span>
                    </li>
                </ul>
            )}

            {/* Nominatim results */}
            {!showCoordResult && showResults && (
                <ul className="sb__results" role="listbox" aria-label="Search results">
                    {results.map((r, i) => {
                        const name =
                            r.display_name.length > 60
                                ? r.display_name.slice(0, 60) + "…"
                                : r.display_name;
                        const lat = parseFloat(r.lat).toFixed(4);
                        const lon = parseFloat(r.lon).toFixed(4);
                        const isSelected = i === selectedIndex;

                        return (
                            <li
                                key={`${r.lat}-${r.lon}-${i}`}
                                className={`sb__result${isSelected ? " sb__result--selected" : ""}`}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => selectResult(r)}
                                onMouseEnter={() => setSelectedIndex(i)}
                            >
                                <span className="sb__result-name">{name}</span>
                                <span className="sb__pin-badge">{r.type}</span>
                                <span className="sb__result-coords">
                                    {lat}, {lon}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* No results */}
            {showNoResults && (
                <div className="sb__no-results">No results found</div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// SearchIcon SVG
// ---------------------------------------------------------------------------

function SearchIcon() {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="6.5" cy="6.5" r="4" />
            <line x1="10" y1="10" x2="14" y2="14" />
        </svg>
    );
}
