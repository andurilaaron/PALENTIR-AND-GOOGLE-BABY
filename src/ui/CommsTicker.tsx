/**
 * CommsTicker — scrolling decoded military comms traffic ticker.
 *
 * Cycles through fake SIGACT, SALUTE, METAR, NOTAM, ELINT, and LINK-16
 * message templates every 3 seconds. Full-width, just below the
 * classification banner. Text replaces with a fade transition.
 */
import { useEffect, useState } from "react";
import "./styles/comms-ticker.css";

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function utc(): string {
    const d = new Date();
    const hh = d.getUTCHours().toString().padStart(2, "0");
    const mm = d.getUTCMinutes().toString().padStart(2, "0");
    const ss = d.getUTCSeconds().toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}Z`;
}

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function rng(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function grid(): string {
    const zones = ["38S", "37S", "38T", "37T"];
    const bands = ["MC", "MD", "NC", "ND", "LC", "KD"];
    const e = rng(1000, 9999);
    const n = rng(1000, 9999);
    return `${pick(zones)} ${pick(bands)} ${e} ${n}`;
}

function coords(): string {
    // Random lat/lon roughly over the Middle East
    const lat = (rng(2400, 3800) / 100).toFixed(2);
    const lon = (rng(3300, 5800) / 100).toFixed(2);
    return `${lat}N ${lon}E`;
}

// ---------------------------------------------------------------------------
// Message templates
// ---------------------------------------------------------------------------

const TEMPLATES: Array<() => string> = [
    () =>
        `[${utc()}] SIGACT RPT — GRID ${grid()} — TYPE: ${pick(["IDF", "SAF", "IED", "UNK"])} — ${pick(["NFI", "DEVELOPING", "CONFIRMED"])}`,
    () =>
        `[${utc()}] SALUTE RPT — SZ ${rng(1, 4)} PLT / ACT ${pick(["MOVING", "STATIC", "DISPERSING"])} / LOC ${coords()} / TM ${utc()}`,
    () =>
        `[${utc()}] METAR ${pick(["OIII", "OIKB", "EGLL", "KJFK", "ZBAA"])} ${utc().slice(0, 4)}Z ${rng(10, 36)}0${rng(5, 25)}KT 9999 FEW0${rng(20, 50)} ${rng(10, 35)}/${rng(3, 20)} Q10${rng(5, 30)}`,
    () =>
        `[${utc()}] NOTAM — ${pick(["AIRSPACE CLOSURE", "TFR ACTIVE", "MIL EXERCISE"])} — ${pick(["FIR TEHRAN", "FIR BAGHDAD", "FIR ANKARA", "CONUS"])} — EFF ${utc()}`,
    () =>
        `[${utc()}] ELINT — ${pick(["S-300", "S-400", "PATRIOT", "IRON DOME", "TOR-M1"])} EMISSION DET — BRG ${rng(0, 359)}° / RNG ${rng(50, 500)}KM`,
    () =>
        `[${utc()}] LINK-16 — TN J${rng(1000, 9999)} — ${pick(["HOSTILE", "UNKNOWN", "FRIENDLY", "PENDING"])} — ALT ${rng(5, 55)}K FT — HDG ${rng(0, 359)}°`,
];

const INTERVAL_MS = 3000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommsTicker() {
    const [message, setMessage] = useState<string>(() => pick(TEMPLATES)());
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const id = setInterval(() => {
            // Fade out, swap text, fade back in
            setVisible(false);
            setTimeout(() => {
                setMessage(pick(TEMPLATES)());
                setVisible(true);
            }, 300);
        }, INTERVAL_MS);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="ct-ticker" aria-live="polite" aria-label="Communications traffic feed">
            <span className="ct-ticker__prefix">COMMS</span>
            <span className="ct-ticker__divider" />
            <span className={`ct-ticker__message ${visible ? "ct-ticker__message--visible" : "ct-ticker__message--hidden"}`}>
                {message}
            </span>
        </div>
    );
}
