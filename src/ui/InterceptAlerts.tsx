/**
 * InterceptAlerts — simulates real-time SIGINT/ELINT intercept notifications.
 *
 * Generates alerts at random 15-30 second intervals.
 * Alerts slide in from the right, stack vertically (max 3 visible),
 * auto-dismiss after 5 seconds, and play a Web Audio API tone on arrival.
 *
 * Positioned top-right, below the classification banner and comms ticker.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import "./styles/intercept-alerts.css";

// ── Types ────────────────────────────────────────────────────────────────────

export type AlertType     = "MIL_ACFT" | "SEISMIC" | "SAT_PASS" | "THREAT";
export type AlertPriority = "INFO" | "WARNING" | "CRITICAL";

export interface InterceptAlert {
    id: string;
    type: AlertType;
    message: string;
    timestamp: string;
    priority: AlertPriority;
}

// ── Utility helpers ──────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function rng(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Alert templates ──────────────────────────────────────────────────────────

interface AlertTemplate {
    type: AlertType;
    priority: AlertPriority;
    msg: () => string;
}

const ALERT_TEMPLATES: AlertTemplate[] = [
    {
        type: "MIL_ACFT",
        priority: "WARNING",
        msg: () =>
            `MIL ACFT ${pick(["FORTE12","DUKE01","VIPER77","REAPER31","HUNTER06"])} ` +
            `ENTERED AO \u2014 ` +
            `${pick(["RQ-4B GLOBAL HAWK","MQ-9 REAPER","RC-135W RIVET JOINT","E-3 SENTRY","P-8A POSEIDON"])} ` +
            `\u2014 ALT ${rng(25,60)},000ft`,
    },
    {
        type: "SEISMIC",
        priority: "INFO",
        msg: () =>
            `SEISMIC EVENT M${(rng(20,65)/10).toFixed(1)} \u2014 ` +
            `${rng(28,38)}.${String(rng(10,99)).padStart(2,"0")}\u00B0N ` +
            `${rng(44,60)}.${String(rng(10,99)).padStart(2,"0")}\u00B0E ` +
            `\u2014 DEPTH ${rng(5,150)}KM`,
    },
    {
        type: "SAT_PASS",
        priority: "WARNING",
        msg: () =>
            `SAT OVERHEAD \u2014 ` +
            `${pick(["COSMOS 2558","USA 314","YAOGAN 35A","CSO-2","WORLDVIEW-3"])} ` +
            `\u2014 ${pick(["IMAGING","RADAR","SIGINT"])} ` +
            `\u2014 EL ${rng(15,85)}\u00B0 ` +
            `\u2014 TGT ACQUISITION PROBABLE`,
    },
    {
        type: "THREAT",
        priority: "CRITICAL",
        msg: () =>
            `THREAT \u2014 ` +
            `${pick(["S-300","S-400","BAVAR-373"])} EMISSION DETECTED ` +
            `\u2014 BRG ${rng(0,359)}\u00B0 / RNG ${rng(80,400)}KM ` +
            `\u2014 ${pick(["SEARCH RADAR","TRACK RADAR","ENGAGEMENT RADAR"])}`,
    },
];

// ── Web Audio beep ───────────────────────────────────────────────────────────

function playBeep(
    ctx: AudioContext,
    hz: number,
    durationMs: number,
    count: number,
    delayMs = 120
): void {
    for (let i = 0; i < count; i++) {
        const startSec = ctx.currentTime + (i * (durationMs + delayMs)) / 1000;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(hz, startSec);

        gain.gain.setValueAtTime(0, startSec);
        gain.gain.linearRampToValueAtTime(0.18, startSec + 0.01);
        gain.gain.linearRampToValueAtTime(0, startSec + durationMs / 1000 - 0.01);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startSec);
        osc.stop(startSec + durationMs / 1000);
    }
}

function triggerBeep(priority: AlertPriority, ctx: AudioContext): void {
    switch (priority) {
        case "INFO":
            playBeep(ctx, 800, 100, 1);
            break;
        case "WARNING":
            playBeep(ctx, 600, 200, 2);
            break;
        case "CRITICAL":
            playBeep(ctx, 400, 300, 3, 80);
            break;
    }
}

// ── Timestamp helper ─────────────────────────────────────────────────────────

function nowUtc(): string {
    const d = new Date();
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    const ss = String(d.getUTCSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}Z`;
}

// ── Single alert card ─────────────────────────────────────────────────────────

interface AlertCardProps {
    alert: InterceptAlert;
    onDismiss: (id: string) => void;
}

function AlertCard({ alert, onDismiss }: AlertCardProps) {
    // Trigger exit animation just before removal
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(alert.id), 5000);
        return () => clearTimeout(timer);
    }, [alert.id, onDismiss]);

    const priorityClass = `ia__card--${alert.priority.toLowerCase()}`;

    return (
        <div className={`ia__card ${priorityClass}`} role="alert">
            <div className="ia__card-message">
                <span className="ia__icon">&#x26A0;</span>
                {" INTERCEPT \u2014 "}
                {alert.message}
            </div>
            <div className="ia__card-footer">
                <span className="ia__type">{alert.type}</span>
                <span className="ia__ts">{alert.timestamp}</span>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InterceptAlerts() {
    const [alerts, setAlerts]   = useState<InterceptAlert[]>([]);
    const [muted, setMuted]     = useState(false);
    const audioCtxRef           = useRef<AudioContext | null>(null);
    const counterRef            = useRef(0);

    // Lazily create AudioContext on first interaction / alert
    const getAudioCtx = useCallback((): AudioContext | null => {
        if (muted) return null;
        if (!audioCtxRef.current) {
            try {
                audioCtxRef.current = new AudioContext();
            } catch {
                return null;
            }
        }
        // Resume if suspended (browser autoplay policy)
        if (audioCtxRef.current.state === "suspended") {
            audioCtxRef.current.resume().catch(() => null);
        }
        return audioCtxRef.current;
    }, [muted]);

    // Spawn a new alert
    const spawnAlert = useCallback(() => {
        const template = pick(ALERT_TEMPLATES);
        const id = `ia-${Date.now()}-${counterRef.current++}`;
        const alert: InterceptAlert = {
            id,
            type: template.type,
            priority: template.priority,
            message: template.msg(),
            timestamp: nowUtc(),
        };

        setAlerts((prev) => {
            // Max 3 visible — drop oldest if needed
            const next = [...prev, alert];
            return next.length > 3 ? next.slice(next.length - 3) : next;
        });

        const ctx = getAudioCtx();
        if (ctx) triggerBeep(template.priority, ctx);
    }, [getAudioCtx]);

    // Schedule random intervals
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const schedule = () => {
            const delay = rng(15000, 30000);
            timeoutId = setTimeout(() => {
                spawnAlert();
                schedule();
            }, delay);
        };

        // First alert after a short warm-up
        const warmup = setTimeout(() => {
            spawnAlert();
            schedule();
        }, 4000);

        return () => {
            clearTimeout(warmup);
            clearTimeout(timeoutId);
        };
    }, [spawnAlert]);

    const dismissAlert = useCallback((id: string) => {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, []);

    return (
        <div className="ia__root" aria-live="assertive" aria-atomic="false">
            {/* Mute toggle */}
            <button
                className={`ia__mute ${muted ? "ia__mute--muted" : ""}`}
                onClick={() => setMuted((m) => !m)}
                title={muted ? "Unmute alerts" : "Mute alerts"}
                aria-label={muted ? "Unmute audio alerts" : "Mute audio alerts"}
            >
                {muted ? "\uD83D\uDD07" : "\uD83D\uDD0A"}
            </button>

            {/* Alert stack */}
            <div className="ia__stack">
                {alerts.map((alert) => (
                    <AlertCard
                        key={alert.id}
                        alert={alert}
                        onDismiss={dismissAlert}
                    />
                ))}
            </div>
        </div>
    );
}
