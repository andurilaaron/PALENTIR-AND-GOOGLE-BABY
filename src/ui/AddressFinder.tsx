/**
 * AddressFinder — persistent address lookup panel.
 *
 * Unlike the quick SearchBar (Ctrl+K), this is a dedicated panel for
 * detailed address resolution: shows full address breakdown, reverse
 * geocode on click, and drops a persistent marker.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useViewer } from "../core/ViewerContext.tsx";
import "./styles/address-finder.css";

interface AddressResult {
    displayName: string;
    lat: number;
    lon: number;
    type: string;
    details: Record<string, string>;
}

const TYPE_ALTITUDE: Record<string, number> = {
    country: 4000000,
    state: 1200000,
    city: 60000,
    town: 30000,
    village: 15000,
    suburb: 8000,
    road: 2000,
    house: 800,
    building: 800,
};

function altitudeForType(type: string): number {
    return TYPE_ALTITUDE[type] ?? 15000;
}

export function AddressFinder() {
    const viewer = useViewer();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<AddressResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<AddressResult | null>(null);
    const [markers, setMarkers] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Focus input when opened
    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    const search = useCallback(async (q: string) => {
        if (q.trim().length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=8&addressdetails=1`,
                { headers: { "User-Agent": "Palentir-GEOINT/1.0" } }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const mapped: AddressResult[] = data.map((r: any) => ({
                displayName: r.display_name,
                lat: parseFloat(r.lat),
                lon: parseFloat(r.lon),
                type: r.type || r.class || "place",
                details: r.address || {},
            }));
            setResults(mapped);
        } catch (err) {
            console.warn("[AddressFinder] Search failed:", err);
            setResults([]);
        }
        setLoading(false);
    }, []);

    const handleInput = (value: string) => {
        setQuery(value);
        setSelected(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(value), 350);
    };

    const flyTo = useCallback((result: AddressResult) => {
        if (!viewer) return;
        setSelected(result);
        setResults([]);

        // Fly camera
        import("cesium").then((C) => {
            viewer.camera.flyTo({
                destination: C.Cartesian3.fromDegrees(result.lon, result.lat, altitudeForType(result.type)),
                duration: 2.0,
            });

            // Drop a marker
            const markerId = `af-pin-${Date.now()}`;
            viewer.entities.add({
                id: markerId,
                position: C.Cartesian3.fromDegrees(result.lon, result.lat, 50),
                point: {
                    pixelSize: 10,
                    color: C.Color.fromCssColorString("#5b9cf5"),
                    outlineColor: C.Color.fromCssColorString("#5b9cf5").withAlpha(0.3),
                    outlineWidth: 6,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
                label: {
                    text: result.details.city || result.details.town || result.details.state || result.displayName.split(",")[0],
                    font: "bold 11px ui-monospace, monospace",
                    fillColor: C.Color.fromCssColorString("#5b9cf5"),
                    style: C.LabelStyle.FILL,
                    showBackground: true,
                    backgroundColor: C.Color.fromCssColorString("#0a101c").withAlpha(0.85),
                    backgroundPadding: new C.Cartesian2(6, 4),
                    verticalOrigin: C.VerticalOrigin.BOTTOM,
                    pixelOffset: new C.Cartesian2(0, -14),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
            });
            setMarkers((prev) => [...prev, markerId]);
        });
    }, [viewer]);

    const clearMarkers = useCallback(() => {
        if (!viewer) return;
        for (const id of markers) {
            const e = viewer.entities.getById(id);
            if (e) viewer.entities.remove(e);
        }
        setMarkers([]);
    }, [viewer, markers]);

    const handleClose = () => {
        setOpen(false);
        setQuery("");
        setResults([]);
        setSelected(null);
    };

    if (!open) {
        return (
            <button
                className="af-trigger"
                onClick={() => setOpen(true)}
                title="Address Finder"
                aria-label="Open address finder"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="af-trigger__label">FIND</span>
            </button>
        );
    }

    return (
        <div className="af">
            <div className="af__header">
                <span className="af__title">ADDRESS FINDER</span>
                <div className="af__header-actions">
                    {markers.length > 0 && (
                        <button className="af__clear" onClick={clearMarkers} title="Clear all pins">
                            CLEAR ({markers.length})
                        </button>
                    )}
                    <button className="af__close" onClick={handleClose} aria-label="Close">&#x2715;</button>
                </div>
            </div>

            <div className="af__search">
                <input
                    ref={inputRef}
                    className="af__input"
                    type="text"
                    value={query}
                    onChange={(e) => handleInput(e.target.value)}
                    placeholder="Enter address, city, landmark..."
                    spellCheck={false}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") handleClose();
                        if (e.key === "Enter" && results.length > 0) flyTo(results[0]);
                    }}
                />
                {loading && <span className="af__spinner" />}
            </div>

            {/* Results */}
            {results.length > 0 && (
                <div className="af__results">
                    {results.map((r, i) => (
                        <button
                            key={`${r.lat}-${r.lon}-${i}`}
                            className="af__result"
                            onClick={() => flyTo(r)}
                        >
                            <div className="af__result-name">{r.displayName}</div>
                            <div className="af__result-meta">
                                <span className="af__result-type">{r.type}</span>
                                <span className="af__result-coords">
                                    {r.lat.toFixed(4)}, {r.lon.toFixed(4)}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Selected address detail */}
            {selected && (
                <div className="af__detail">
                    <div className="af__detail-header">RESOLVED ADDRESS</div>
                    {Object.entries(selected.details)
                        .filter(([k]) => !["country_code", "ISO3166-2-lvl4", "ISO3166-2-lvl6"].includes(k))
                        .slice(0, 8)
                        .map(([key, value]) => (
                            <div key={key} className="af__detail-row">
                                <span className="af__detail-key">{key.replace(/_/g, " ")}</span>
                                <span className="af__detail-val">{value}</span>
                            </div>
                        ))}
                    <div className="af__detail-row">
                        <span className="af__detail-key">coordinates</span>
                        <span className="af__detail-val">{selected.lat.toFixed(6)}, {selected.lon.toFixed(6)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
