/**
 * HexOverlay — decorative scrolling hex dump.
 *
 * Renders random hex telemetry lines that scroll upward in real time.
 * Purely decorative; pointer-events disabled so it never blocks interaction.
 * Positioned bottom-right, above the PlaybackBar.
 */
import { useEffect, useRef, useState } from "react";
import "./styles/hex-overlay.css";

const MAX_LINES = 20;
const INTERVAL_MS = 400;

function randomHexByte(): string {
    return Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0")
        .toUpperCase();
}

function generateLine(addressOffset: number): string {
    const buf = new Uint8Array(8);
    crypto.getRandomValues(buf);
    const addr = (0x4a00 + (addressOffset & 0xffff))
        .toString(16)
        .padStart(4, "0")
        .toUpperCase();
    const bytes = Array.from(buf)
        .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
        .join(" ");
    // Suppress unused randomHexByte — kept for reference; we use crypto above.
    void randomHexByte;
    return `0x${addr}: ${bytes}`;
}

let globalOffset = 0;

export function HexOverlay() {
    const [lines, setLines] = useState<string[]>([]);
    const offsetRef = useRef(0);

    useEffect(() => {
        const id = setInterval(() => {
            const newLine = generateLine(globalOffset++);
            offsetRef.current++;
            setLines((prev) => {
                const next = [...prev, newLine];
                return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
            });
        }, INTERVAL_MS);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="hx-overlay" aria-hidden="true">
            {lines.map((line, i) => (
                <div key={i} className="hx-line">
                    {line}
                </div>
            ))}
        </div>
    );
}
