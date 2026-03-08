/**
 * ClassBanner — persistent government classification marking banner.
 *
 * Fixed full-width bar at the very top of the viewport (z-index: 9998).
 * Left side shows classification caveat markings; right side shows a
 * slowly pulsing "UNCLASSIFIED — DEMONSTRATION SYSTEM" notice.
 */
import "./styles/class-banner.css";

export function ClassBanner() {
    return (
        <div className="cb" role="banner" aria-label="Classification marking">
            <span className="cb__left">
                TOP SECRET // SI // TK // NOFORN
            </span>
            <span className="cb__right">
                UNCLASSIFIED — DEMONSTRATION SYSTEM
            </span>
        </div>
    );
}
