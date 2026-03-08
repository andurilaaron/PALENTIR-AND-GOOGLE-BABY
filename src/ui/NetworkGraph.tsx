/**
 * NetworkGraph — Palantir-style link analysis / force-directed graph panel.
 * Pure HTML Canvas, no external graph libraries.
 * Shows a simulated intelligence network: operations → countries → agencies → assets → targets.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import "./styles/network-graph.css";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

interface GraphNode {
    id: string;
    label: string;
    type: "aircraft" | "satellite" | "country" | "agency" | "base" | "event";
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    radius: number;
}

interface GraphEdge {
    source: string;
    target: string;
    label?: string;
    strength: number; // 0..1 — visual weight only
}

// ---------------------------------------------------------------------------
// Type colours
// ---------------------------------------------------------------------------

const TYPE_COLOR: Record<GraphNode["type"], string> = {
    aircraft:  "#60a5fa",
    satellite: "#22d3ee",
    country:   "#fbbf24",
    agency:    "#ef4444",
    base:      "#f97316",
    event:     "#ec4899",
};

const TYPE_RADIUS: Record<GraphNode["type"], number> = {
    event:     20,
    country:   14,
    agency:    11,
    satellite: 9,
    aircraft:  9,
    base:      9,
};

// ---------------------------------------------------------------------------
// Sample intelligence network data
// ---------------------------------------------------------------------------

function makeNode(id: string, label: string, type: GraphNode["type"], x: number, y: number): GraphNode {
    return {
        id, label, type,
        x, y, vx: 0, vy: 0,
        color: TYPE_COLOR[type],
        radius: TYPE_RADIUS[type],
    };
}

const INITIAL_NODES: GraphNode[] = [
    // Central operation
    makeNode("op-epic-fury",   "OPERATION\nEPIC FURY",  "event",     0,    0),

    // Country nodes
    makeNode("c-usa",          "USA",                   "country",  -200,  -80),
    makeNode("c-israel",       "ISRAEL",                "country",  -160,   90),
    makeNode("c-iran",         "IRAN",                  "country",   180,   60),
    makeNode("c-russia",       "RUSSIA",                "country",   160, -100),
    makeNode("c-china",        "CHINA",                 "country",   210,  120),

    // Agency nodes
    makeNode("ag-nro",         "NRO",                   "agency",   -280, -160),
    makeNode("ag-cia",         "CIA",                   "agency",   -300,  -40),
    makeNode("ag-mossad",      "MOSSAD",                "agency",   -260,  140),
    makeNode("ag-irgc",        "IRGC",                  "agency",    290,   20),
    makeNode("ag-pla-ssf",     "PLA/SSF",               "agency",    310,  160),
    makeNode("ag-gru",         "GRU",                   "agency",    270, -160),

    // Asset / satellite nodes
    makeNode("sat-forte12",    "FORTE 12",              "satellite", -340, -240),
    makeNode("sat-cosmos",     "COSMOS 2558",           "satellite",  360, -220),
    makeNode("sat-wv3",        "WORLDVIEW-3",           "satellite", -310,  -90),
    makeNode("ac-rq4b",        "RQ-4B",                 "aircraft",  -260,  220),

    // Base / target nodes
    makeNode("b-tehran",       "TEHRAN",                "base",      310,   90),
    makeNode("b-natanz",       "NATANZ",                "base",      340,  150),
    makeNode("b-isfahan",      "ISFAHAN",               "base",      260,  200),
    makeNode("b-dimona",       "DIMONA",                "base",     -200,  180),
    makeNode("b-nellis",       "NELLIS AFB",            "base",     -380,  -10),
    makeNode("b-ramstein",     "RAMSTEIN AB",           "base",     -100, -200),

    // Additional cross-link nodes
    makeNode("sat-kh-19",      "KH-19",                 "satellite", -100, -260),
    makeNode("ac-u2",          "U-2S",                  "aircraft",   -60, -220),
    makeNode("ag-dia",         "DIA",                   "agency",    -60,  -80),
    makeNode("ag-csec",        "CSE/CSEC",              "agency",   -340,  -90),
    makeNode("b-fordow",       "FORDOW",                "base",      400,  100),
    makeNode("ag-unit8200",    "UNIT 8200",             "agency",   -220,  200),
    makeNode("sat-ofek16",     "OFEK-16",               "satellite", -140,  260),
    makeNode("ac-hermes900",   "HERMES 900",            "aircraft",   40,  260),
    makeNode("b-arak",         "ARAK",                  "base",      300,  240),
];

const EDGES: GraphEdge[] = [
    // Operation to countries
    { source: "op-epic-fury", target: "c-usa",         label: "LEAD",    strength: 1.0 },
    { source: "op-epic-fury", target: "c-israel",      label: "PARTNER", strength: 0.9 },
    { source: "op-epic-fury", target: "c-iran",        label: "TARGET",  strength: 0.8 },
    { source: "op-epic-fury", target: "c-russia",      label: "MONITOR", strength: 0.5 },
    { source: "op-epic-fury", target: "c-china",       label: "MONITOR", strength: 0.4 },

    // USA → agencies
    { source: "c-usa",    target: "ag-nro",        strength: 0.9 },
    { source: "c-usa",    target: "ag-cia",        strength: 0.9 },
    { source: "c-usa",    target: "ag-dia",        strength: 0.7 },
    { source: "c-usa",    target: "ag-csec",       label: "PARTNER", strength: 0.5 },

    // Israel → agencies
    { source: "c-israel", target: "ag-mossad",     strength: 0.9 },
    { source: "c-israel", target: "ag-unit8200",   strength: 0.9 },

    // Iran → agencies + targets
    { source: "c-iran",   target: "ag-irgc",       strength: 0.9 },
    { source: "ag-irgc",  target: "b-natanz",      strength: 0.8 },
    { source: "ag-irgc",  target: "b-isfahan",     strength: 0.7 },
    { source: "ag-irgc",  target: "b-fordow",      strength: 0.7 },
    { source: "ag-irgc",  target: "b-tehran",      strength: 0.6 },
    { source: "ag-irgc",  target: "b-arak",        strength: 0.6 },

    // Russia → agencies
    { source: "c-russia", target: "ag-gru",        strength: 0.9 },
    { source: "ag-gru",   target: "sat-cosmos",    strength: 0.8 },

    // China → agencies
    { source: "c-china",  target: "ag-pla-ssf",    strength: 0.9 },

    // NRO → assets
    { source: "ag-nro",       target: "sat-forte12",   strength: 0.9 },
    { source: "ag-nro",       target: "sat-kh-19",     strength: 0.8 },
    { source: "ag-nro",       target: "sat-wv3",       strength: 0.7 },

    // CIA → assets + bases
    { source: "ag-cia",       target: "ac-rq4b",       strength: 0.8 },
    { source: "ag-cia",       target: "ac-u2",         strength: 0.7 },
    { source: "ag-cia",       target: "b-nellis",      strength: 0.6 },
    { source: "ag-cia",       target: "b-ramstein",    strength: 0.6 },
    { source: "ag-dia",       target: "b-ramstein",    strength: 0.5 },

    // Mossad → assets + bases
    { source: "ag-mossad",    target: "b-dimona",      strength: 0.8 },
    { source: "ag-mossad",    target: "ac-hermes900",  strength: 0.7 },
    { source: "ag-unit8200",  target: "sat-ofek16",    strength: 0.9 },
    { source: "ag-unit8200",  target: "ac-hermes900",  strength: 0.6 },

    // Assets targeting Iran
    { source: "sat-forte12",  target: "b-natanz",      label: "TASKED",  strength: 0.7 },
    { source: "sat-wv3",      target: "b-isfahan",     label: "IMAGING", strength: 0.7 },
    { source: "sat-kh-19",    target: "b-fordow",      label: "IMAGING", strength: 0.6 },
    { source: "ac-rq4b",      target: "b-natanz",      label: "PATROL",  strength: 0.6 },
    { source: "ac-u2",        target: "b-tehran",      label: "SIGINT",  strength: 0.5 },
    { source: "sat-ofek16",   target: "b-arak",        label: "IMAGING", strength: 0.6 },
    { source: "ac-hermes900", target: "b-isfahan",     label: "RECON",   strength: 0.5 },

    // Cross-links
    { source: "ag-csec",  target: "sat-forte12",   label: "TASKED",  strength: 0.5 },
    { source: "c-usa",    target: "c-israel",      label: "INTEL SH", strength: 0.6 },
    { source: "c-russia", target: "c-iran",        label: "SUPPORT", strength: 0.4 },
    { source: "c-china",  target: "c-iran",        label: "ECON",    strength: 0.3 },
    { source: "ag-gru",   target: "ag-irgc",       label: "LIAISON", strength: 0.4 },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NetworkGraphProps {
    visible: boolean;
    onClose: () => void;
}

// ---------------------------------------------------------------------------
// Force simulation constants
// ---------------------------------------------------------------------------

const REPULSION   = 4500;
const SPRING_K    = 0.018;
const REST_LENGTH = 110;
const DAMPING     = 0.82;
const MAX_ITERS   = 260;
const ENERGY_STOP = 0.08;
const DT          = 0.55;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NetworkGraph({ visible, onClose }: NetworkGraphProps) {
    const canvasRef     = useRef<HTMLCanvasElement>(null);
    const nodesRef      = useRef<GraphNode[]>([]);
    const rafRef        = useRef<number>(0);
    const iterRef       = useRef<number>(0);
    const simDoneRef    = useRef<boolean>(false);
    const selectedRef   = useRef<string | null>(null);
    const dragRef       = useRef<{ id: string; ox: number; oy: number } | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Build an edge lookup for fast neighbour access
    const edgeMapRef = useRef<Map<string, Set<string>>>(new Map());

    // -----------------------------------------------------------------------
    // Initialise nodes (deep copy so we can mutate)
    // -----------------------------------------------------------------------

    const initNodes = useCallback(() => {
        nodesRef.current = INITIAL_NODES.map(n => ({ ...n }));
        iterRef.current = 0;
        simDoneRef.current = false;

        const em = new Map<string, Set<string>>();
        for (const e of EDGES) {
            if (!em.has(e.source)) em.set(e.source, new Set());
            if (!em.has(e.target)) em.set(e.target, new Set());
            em.get(e.source)!.add(e.target);
            em.get(e.target)!.add(e.source);
        }
        edgeMapRef.current = em;
    }, []);

    // -----------------------------------------------------------------------
    // Force simulation step
    // -----------------------------------------------------------------------

    const simStep = useCallback(() => {
        const nodes = nodesRef.current;
        const n = nodes.length;

        // Repulsion between all pairs (Coulomb)
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dx = nodes[j].x - nodes[i].x;
                const dy = nodes[j].y - nodes[i].y;
                const dist2 = dx * dx + dy * dy + 0.01;
                const dist  = Math.sqrt(dist2);
                const force = REPULSION / dist2;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                nodes[i].vx -= fx * DT;
                nodes[i].vy -= fy * DT;
                nodes[j].vx += fx * DT;
                nodes[j].vy += fy * DT;
            }
        }

        // Spring attraction along edges (Hooke)
        const nodeMap = new Map(nodes.map(nd => [nd.id, nd]));
        for (const edge of EDGES) {
            const a = nodeMap.get(edge.source);
            const b = nodeMap.get(edge.target);
            if (!a || !b) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
            const stretch = dist - REST_LENGTH * (1 + (1 - edge.strength) * 0.5);
            const force   = SPRING_K * stretch;
            const fx = (dx / dist) * force * DT;
            const fy = (dy / dist) * force * DT;
            a.vx += fx;
            a.vy += fy;
            b.vx -= fx;
            b.vy -= fy;
        }

        // Integrate + dampen + keep central node pinned lightly
        let totalEnergy = 0;
        for (const nd of nodes) {
            if (dragRef.current?.id === nd.id) continue;
            nd.vx *= DAMPING;
            nd.vy *= DAMPING;
            nd.x  += nd.vx * DT;
            nd.y  += nd.vy * DT;
            totalEnergy += nd.vx * nd.vx + nd.vy * nd.vy;
        }

        // Very soft centre gravity to stop drift
        for (const nd of nodes) {
            nd.vx -= nd.x * 0.0006 * DT;
            nd.vy -= nd.y * 0.0006 * DT;
        }

        iterRef.current++;
        if (iterRef.current >= MAX_ITERS || totalEnergy < ENERGY_STOP) {
            simDoneRef.current = true;
        }
    }, []);

    // -----------------------------------------------------------------------
    // Render one frame
    // -----------------------------------------------------------------------

    const drawFrame = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;
        const cx = W / 2;
        const cy = H / 2;
        const sel = selectedRef.current;

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#0a101c";
        ctx.fillRect(0, 0, W, H);

        // Subtle grid
        ctx.strokeStyle = "rgba(96,165,250,0.04)";
        ctx.lineWidth = 1;
        const gridStep = 40;
        for (let x = cx % gridStep; x < W; x += gridStep) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = cy % gridStep; y < H; y += gridStep) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        const nodeMap = new Map(nodesRef.current.map(nd => [nd.id, nd]));

        // Draw edges
        for (const edge of EDGES) {
            const a = nodeMap.get(edge.source);
            const b = nodeMap.get(edge.target);
            if (!a || !b) continue;

            const ax = a.x + cx, ay = a.y + cy;
            const bx = b.x + cx, by = b.y + cy;

            const isHighlighted = sel && (sel === edge.source || sel === edge.target);
            const alpha = isHighlighted ? 0.75 : edge.strength * 0.22 + 0.06;
            const width = isHighlighted ? 1.5 : 0.8;

            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.strokeStyle = isHighlighted
                ? `rgba(255,255,255,${alpha})`
                : `rgba(180,210,255,${alpha})`;
            ctx.lineWidth = width;
            ctx.stroke();

            // Edge label at midpoint (only for highlighted or strong edges)
            if (edge.label && (isHighlighted || edge.strength >= 0.7)) {
                const mx = (ax + bx) / 2;
                const my = (ay + by) / 2;
                ctx.fillStyle = isHighlighted ? "rgba(255,255,255,0.55)" : "rgba(180,210,255,0.3)";
                ctx.font = "500 8px ui-monospace, monospace";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(edge.label, mx, my);
            }
        }

        // Draw nodes
        for (const nd of nodesRef.current) {
            const nx = nd.x + cx;
            const ny = nd.y + cy;
            const isSel   = sel === nd.id;
            const isNeigh = sel ? edgeMapRef.current.get(sel)?.has(nd.id) : false;
            const dimmed  = sel && !isSel && !isNeigh;

            const baseAlpha = dimmed ? 0.3 : 1.0;
            const r = nd.radius;

            // Outer glow for selected
            if (isSel) {
                const grd = ctx.createRadialGradient(nx, ny, r * 0.5, nx, ny, r * 2.8);
                grd.addColorStop(0, nd.color + "55");
                grd.addColorStop(1, nd.color + "00");
                ctx.beginPath();
                ctx.arc(nx, ny, r * 2.8, 0, Math.PI * 2);
                ctx.fillStyle = grd;
                ctx.fill();
            }

            // Node circle
            ctx.globalAlpha = baseAlpha;
            ctx.beginPath();
            ctx.arc(nx, ny, r, 0, Math.PI * 2);

            // Fill: dark centre
            ctx.fillStyle = `rgba(6,10,20,0.85)`;
            ctx.fill();

            // Stroke: node colour
            ctx.strokeStyle = isSel ? nd.color : nd.color + "cc";
            ctx.lineWidth   = isSel ? 2.5 : isNeigh ? 1.8 : 1.2;
            ctx.stroke();

            // Inner dot
            ctx.beginPath();
            ctx.arc(nx, ny, r * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = nd.color + (isSel ? "ee" : "88");
            ctx.fill();

            // Label (split on \n for multi-line)
            ctx.fillStyle = isSel
                ? "#ffffff"
                : isNeigh
                    ? "rgba(220,232,248,0.9)"
                    : "rgba(160,190,220,0.6)";
            ctx.font = `600 ${isSel ? 8.5 : 7.5}px ui-monospace, monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";

            const lines = nd.label.split("\n");
            const lineH = isSel ? 10 : 9;
            const labelY = ny + r + 4;
            for (let li = 0; li < lines.length; li++) {
                ctx.fillText(lines[li], nx, labelY + li * lineH);
            }

            ctx.globalAlpha = 1.0;
        }
    }, []);

    // -----------------------------------------------------------------------
    // Animation loop
    // -----------------------------------------------------------------------

    const loop = useCallback(() => {
        if (!simDoneRef.current) {
            simStep();
        }
        drawFrame();
        rafRef.current = requestAnimationFrame(loop);
    }, [simStep, drawFrame]);

    // -----------------------------------------------------------------------
    // Resize canvas to match CSS size
    // -----------------------------------------------------------------------

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { width, height } = canvas.getBoundingClientRect();
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width  = width;
            canvas.height = height;
        }
    }, []);

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    useEffect(() => {
        if (!visible) return;
        initNodes();
        resizeCanvas();
        rafRef.current = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(rafRef.current);
        };
    }, [visible, initNodes, loop, resizeCanvas]);

    // -----------------------------------------------------------------------
    // Mouse interaction
    // -----------------------------------------------------------------------

    const hitTest = useCallback((ex: number, ey: number): GraphNode | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const mx = ex - rect.left;
        const my = ey - rect.top;
        const cx = canvas.width  / 2;
        const cy = canvas.height / 2;
        let closest: GraphNode | null = null;
        let bestDist = Infinity;
        for (const nd of nodesRef.current) {
            const dx = (nd.x + cx) - mx;
            const dy = (nd.y + cy) - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nd.radius + 6 && dist < bestDist) {
                bestDist = dist;
                closest = nd;
            }
        }
        return closest;
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const nd = hitTest(e.clientX, e.clientY);
        if (nd) {
            dragRef.current = { id: nd.id, ox: e.clientX - nd.x, oy: e.clientY - nd.y };
            selectedRef.current = nd.id;
            setSelectedId(nd.id);
            nd.vx = 0; nd.vy = 0;
            simDoneRef.current = false; // wake sim
        } else {
            selectedRef.current = null;
            setSelectedId(null);
        }
    }, [hitTest]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!dragRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const nd = nodesRef.current.find(n => n.id === dragRef.current!.id);
        if (!nd) return;
        nd.x  = e.clientX - dragRef.current.ox;
        nd.y  = e.clientY - dragRef.current.oy;
        nd.vx = 0; nd.vy = 0;
        simDoneRef.current = false;
    }, []);

    const handleMouseUp = useCallback(() => {
        dragRef.current = null;
    }, []);

    // -----------------------------------------------------------------------
    // Derived display data for info bar
    // -----------------------------------------------------------------------

    const selectedNode  = nodesRef.current.find(n => n.id === selectedId) ?? null;
    const neighbourCount = selectedId
        ? (edgeMapRef.current.get(selectedId)?.size ?? 0)
        : 0;

    if (!visible) return null;

    return (
        <div className="ng" role="dialog" aria-label="Link Analysis">
            {/* Header */}
            <div className="ng__header">
                <div className="ng__header-left">
                    <div className="ng__title-block">
                        <span className="ng__eyebrow">Intelligence Network</span>
                        <span className="ng__title">LINK ANALYSIS</span>
                    </div>
                </div>
                <div className="ng__badge">
                    <span className="ng__node-count">{INITIAL_NODES.length} NODES · {EDGES.length} EDGES</span>
                    <button className="ng__close" onClick={onClose} aria-label="Close">✕</button>
                </div>
            </div>

            {/* Canvas */}
            <div className="ng__canvas-wrap">
                <canvas
                    ref={canvasRef}
                    className={`ng__canvas${dragRef.current ? " ng__canvas--dragging" : ""}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>

            {/* Selected node info bar */}
            <div className="ng__info-bar">
                {selectedNode ? (
                    <>
                        <span
                            className="ng__info-dot"
                            style={{ background: selectedNode.color }}
                        />
                        <span className="ng__info-name">{selectedNode.label.replace("\n", " ")}</span>
                        <span className="ng__info-type">{selectedNode.type}</span>
                        <span className="ng__info-connections">{neighbourCount} CONNECTION{neighbourCount !== 1 ? "S" : ""}</span>
                    </>
                ) : (
                    <span className="ng__info-hint">Click a node to inspect — drag to reposition</span>
                )}
            </div>

            {/* Legend */}
            <div className="ng__legend">
                {(Object.entries(TYPE_COLOR) as [GraphNode["type"], string][]).map(([type, color]) => (
                    <div key={type} className="ng__legend-item">
                        <span className="ng__legend-dot" style={{ background: color }} />
                        <span className="ng__legend-label">{type}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
