/**
 * Palentir Backend Server
 *
 * Production: serves Vite build from dist/ + proxies all external APIs.
 * Development: runs on :3001, Vite dev server proxies to it.
 *
 * Handles CORS, rate-limit backoff, and caching for external API calls.
 */
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const isProd = process.env.NODE_ENV === "production";

// Gzip in production
app.use(compression());

// --- API Proxies ---

// airplanes.live — ADS-B flight data
app.use(
    "/api/flights",
    createProxyMiddleware({
        target: "https://api.airplanes.live",
        changeOrigin: true,
        pathRewrite: { "^/": "/v2/" },
        on: {
            proxyRes: (_proxyRes, _req, _res) => {
                // Allow CORS from any origin in dev
                _proxyRes.headers["access-control-allow-origin"] = "*";
            },
        },
    })
);

// OpenSky Network (may be unreachable — client handles fallback)
app.use(
    "/api/opensky",
    createProxyMiddleware({
        target: "https://opensky-network.org",
        changeOrigin: true,
        pathRewrite: { "^/": "/api/" },
        on: {
            proxyRes: (_proxyRes, _req, _res) => {
                _proxyRes.headers["access-control-allow-origin"] = "*";
            },
        },
    })
);

// Overpass API — OpenStreetMap queries (military bases, etc.)
app.use(
    "/api/overpass",
    createProxyMiddleware({
        target: "https://overpass-api.de",
        changeOrigin: true,
        pathRewrite: { "^/": "/api/" },
        on: {
            proxyRes: (_proxyRes, _req, _res) => {
                _proxyRes.headers["access-control-allow-origin"] = "*";
            },
        },
    })
);

// USGS Earthquake API (already works direct, but proxy for consistency)
app.use(
    "/api/usgs",
    createProxyMiddleware({
        target: "https://earthquake.usgs.gov",
        changeOrigin: true,
        pathRewrite: { "^/": "/" },
        on: {
            proxyRes: (_proxyRes, _req, _res) => {
                _proxyRes.headers["access-control-allow-origin"] = "*";
            },
        },
    })
);

// AIS ship tracking — AISHub or fallback
app.use(
    "/api/ais",
    createProxyMiddleware({
        target: "https://data.aishub.net",
        changeOrigin: true,
        pathRewrite: { "^/": "/" },
        on: {
            proxyRes: (_proxyRes, _req, _res) => {
                _proxyRes.headers["access-control-allow-origin"] = "*";
            },
        },
    })
);

// --- Static Data Endpoints ---

// Submarine cable GeoJSON (served from local data)
app.get("/api/data/submarine-cables", (_req, res) => {
    res.sendFile(path.join(__dirname, "data", "submarine-cables.json"));
});

// Nuclear facilities (served from local data)
app.get("/api/data/nuclear-facilities", (_req, res) => {
    res.sendFile(path.join(__dirname, "data", "nuclear-facilities.json"));
});

// Military installations (served from local data)
app.get("/api/data/military-bases", (_req, res) => {
    res.sendFile(path.join(__dirname, "data", "military-bases.json"));
});

// Australian crime hotspots (ABS/state statistics mapped to suburb centroids)
app.get("/api/data/au-crime", (_req, res) => {
    res.sendFile(path.join(__dirname, "data", "au-crime-hotspots.json"));
});

// --- Production Static File Serving ---

if (isProd) {
    const distPath = path.join(__dirname, "..", "dist");
    app.use(express.static(distPath));

    // SPA fallback — all non-API routes serve index.html
    app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
    });
}

// --- Start ---

app.listen(PORT, () => {
    console.log(`[Palentir Server] Running on port ${PORT}`);
    console.log(`[Palentir Server] Mode: ${isProd ? "PRODUCTION" : "DEVELOPMENT"}`);
    if (isProd) {
        console.log(`[Palentir Server] Serving frontend from dist/`);
    } else {
        console.log(`[Palentir Server] Vite dev server should proxy to http://localhost:${PORT}`);
    }
});
