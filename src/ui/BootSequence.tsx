/**
 * BootSequence — full-screen terminal boot animation shown on first load.
 *
 * Renders a black overlay with green monospace text appearing line-by-line
 * with a typewriter effect. After all lines are displayed (~3.5s) the overlay
 * crossfades out over 0.5s then unmounts via the `onComplete` callback.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import "./styles/boot-sequence.css";

const BOOT_LINES = [
    "> PALENTIR GEOSPATIAL INTELLIGENCE PLATFORM v4.2.1",
    "[INIT] System bootstrap...",
    "[AUTH] OPERATOR: AUTHENTICATED VIA PKI CERT ████████████",
    "[CONN] Establishing secure uplink to GEOINT cloud...",
    "[CONN] ADS-B mesh gateway... ONLINE",
    "[CONN] TLE catalog downlink... ONLINE",
    "[CONN] USGS seismic feed... ONLINE",
    "[LOAD] LayerRegistry: 14 plugins registered",
    "[LOAD] PostFxEngine: 8 shader modes compiled",
    "[LOAD] ClockController: UTC sync locked",
    "[SYS ] All subsystems NOMINAL",
    "[WARN] THIS SYSTEM PROCESSES OPEN-SOURCE INTELLIGENCE DATA ONLY",
    "[WARN] UNCLASSIFIED // FOR DEMONSTRATION PURPOSES",
    "> Entering operational view...",
];

const LINE_INTERVAL_MS = 240;
const FADE_OUT_DELAY_MS = 400; // extra pause after last line before fading
const FADE_DURATION_MS = 500;

export function BootSequence({ onComplete }: { onComplete: () => void }) {
    const [visibleCount, setVisibleCount] = useState(0);
    const [fadingOut, setFadingOut] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Stable ref so the effect never restarts when parent re-renders
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    const fireComplete = useCallback(() => onCompleteRef.current(), []);

    useEffect(() => {
        let idx = 0;

        const showNextLine = () => {
            idx += 1;
            setVisibleCount(idx);

            if (idx < BOOT_LINES.length) {
                timerRef.current = setTimeout(showNextLine, LINE_INTERVAL_MS);
            } else {
                // All lines shown — wait a beat then fade out
                timerRef.current = setTimeout(() => {
                    setFadingOut(true);
                    timerRef.current = setTimeout(() => {
                        fireComplete();
                    }, FADE_DURATION_MS);
                }, FADE_OUT_DELAY_MS);
            }
        };

        timerRef.current = setTimeout(showNextLine, LINE_INTERVAL_MS);

        return () => {
            if (timerRef.current !== null) clearTimeout(timerRef.current);
        };
    }, [fireComplete]);

    return (
        <div className={`boot${fadingOut ? " boot--fade-out" : ""}`}>
            {/* CRT scanline overlay */}
            <div className="boot__scanlines" aria-hidden="true" />

            <div className="boot__terminal" role="log" aria-live="polite" aria-label="System boot log">
                {BOOT_LINES.slice(0, visibleCount).map((line, i) => (
                    <div
                        key={i}
                        className="boot__line"
                        style={{ animationDelay: "0ms" }}
                    >
                        {line}
                        {/* Blinking cursor only on the last visible line */}
                        {i === visibleCount - 1 && !fadingOut && (
                            <span className="boot__cursor" aria-hidden="true">▋</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
