/**
 * ThreatconIndicator — persistent military readiness status bar.
 *
 * Displays three clickable chips for THREATCON, FPCON, and INFOCON levels.
 * Fixed top-left, below the classification banner.
 * Each chip cycles through its respective levels on click.
 */
import { useState } from "react";
import "./styles/threatcon.css";

const THREATCON_LEVELS = ["ALPHA", "BRAVO", "CHARLIE", "DELTA"] as const;
const FPCON_LEVELS     = ["NORMAL", "ALPHA", "BRAVO", "CHARLIE", "DELTA"] as const;
const INFOCON_LEVELS   = ["5", "4", "3", "2", "1"] as const;

type ThreatconLevel = typeof THREATCON_LEVELS[number];
type FpconLevel     = typeof FPCON_LEVELS[number];
type InfoconLevel   = typeof INFOCON_LEVELS[number];

/** Maps a level value to a CSS modifier class suffix. */
function threatconColor(level: ThreatconLevel): string {
    switch (level) {
        case "ALPHA":   return "green";
        case "BRAVO":   return "cyan";
        case "CHARLIE": return "amber";
        case "DELTA":   return "red-pulse";
    }
}

function fpconColor(level: FpconLevel): string {
    switch (level) {
        case "NORMAL":  return "green";
        case "ALPHA":   return "cyan";
        case "BRAVO":   return "amber";
        case "CHARLIE": return "red";
        case "DELTA":   return "red-pulse";
    }
}

function infoconColor(level: InfoconLevel): string {
    switch (level) {
        case "5": return "green";
        case "4": return "cyan";
        case "3": return "amber";
        case "2": return "red";
        case "1": return "red-pulse";
    }
}

function nextIndex<T>(arr: readonly T[], current: T): T {
    const idx = arr.indexOf(current);
    return arr[(idx + 1) % arr.length];
}

export function ThreatconIndicator() {
    const [threatcon, setThreatcon] = useState<ThreatconLevel>("ALPHA");
    const [fpcon,     setFpcon]     = useState<FpconLevel>("NORMAL");
    const [infocon,   setInfocon]   = useState<InfoconLevel>("5");

    return (
        <div className="tc-bar">
            <button
                className={`tc-chip tc-chip--${threatconColor(threatcon)}`}
                onClick={() => setThreatcon(nextIndex(THREATCON_LEVELS, threatcon))}
                title="Click to cycle THREATCON level"
            >
                <span className="tc-chip__label">THREATCON</span>
                <span className="tc-chip__value">{threatcon}</span>
            </button>

            <button
                className={`tc-chip tc-chip--${fpconColor(fpcon)}`}
                onClick={() => setFpcon(nextIndex(FPCON_LEVELS, fpcon))}
                title="Click to cycle FPCON level"
            >
                <span className="tc-chip__label">FPCON</span>
                <span className="tc-chip__value">{fpcon}</span>
            </button>

            <button
                className={`tc-chip tc-chip--${infoconColor(infocon)}`}
                onClick={() => setInfocon(nextIndex(INFOCON_LEVELS, infocon))}
                title="Click to cycle INFOCON level"
            >
                <span className="tc-chip__label">INFOCON</span>
                <span className="tc-chip__value">{infocon}</span>
            </button>
        </div>
    );
}
