/**
 * uniformDescriptors — metadata for per-mode shader uniforms.
 *
 * Each descriptor defines the slider/toggle control exposed in PostFxPanel,
 * along with the GLSL uniform name, range, and default value.
 */
import type { EffectMode } from "../core/AppState.ts";

export interface UniformDescriptor {
    /** GLSL uniform name (must match the shader) */
    uniform: string;
    /** Human-readable label for the UI */
    label: string;
    /** Control type */
    type: "range" | "toggle";
    /** Minimum value (range only) */
    min?: number;
    /** Maximum value (range only) */
    max?: number;
    /** Step increment (range only) */
    step?: number;
    /** Default value — matches the original hardcoded constant */
    default: number;
}

export const UNIFORM_DESCRIPTORS: Partial<Record<EffectMode, UniformDescriptor[]>> = {
    CRT: [
        { uniform: "u_scanline_freq",   label: "Scanline Frequency",  type: "range", min: 0.5, max: 3.0, step: 0.1, default: 1.5 },
        { uniform: "u_barrel",          label: "Barrel Distortion",   type: "range", min: 0.0, max: 0.5, step: 0.01, default: 0.15 },
        { uniform: "u_phosphor_glow",   label: "Phosphor Glow",       type: "range", min: 0.0, max: 0.3, step: 0.01, default: 0.08 },
        { uniform: "u_flicker",         label: "Flicker Intensity",   type: "range", min: 0.0, max: 0.15, step: 0.01, default: 0.03 },
        { uniform: "u_vignette",        label: "Vignette Strength",   type: "range", min: 0.0, max: 5.0, step: 0.1, default: 2.5 },
    ],
    NVG: [
        { uniform: "u_gain",            label: "Gain",                type: "range", min: 0.5, max: 2.5, step: 0.1, default: 1.4 },
        { uniform: "u_grain",           label: "Grain Intensity",     type: "range", min: 0.0, max: 0.3, step: 0.01, default: 0.12 },
        { uniform: "u_ccd_scanlines",   label: "CCD Scanlines",       type: "range", min: 0.0, max: 0.15, step: 0.01, default: 0.05 },
        { uniform: "u_vignette_radius", label: "Vignette Radius",     type: "range", min: 0.1, max: 0.8, step: 0.01, default: 0.3 },
        { uniform: "u_gamma",           label: "Gamma",               type: "range", min: 0.3, max: 1.5, step: 0.05, default: 0.7 },
    ],
    THERMAL: [
        { uniform: "u_contrast",        label: "Contrast",            type: "range", min: 0.3, max: 2.0, step: 0.05, default: 0.85 },
        { uniform: "u_sensor_noise",    label: "Sensor Noise",        type: "range", min: 0.0, max: 0.15, step: 0.01, default: 0.03 },
        { uniform: "u_white_hot",       label: "White-Hot",           type: "toggle", default: 0.0 },
        { uniform: "u_edge_overlay",    label: "Edge Enhancement",    type: "toggle", default: 0.0 },
        { uniform: "u_edge_strength",   label: "Edge Strength",       type: "range", min: 0.0, max: 2.0, step: 0.1, default: 0.8 },
    ],
    EDGE: [
        { uniform: "u_edge_threshold",  label: "Edge Threshold",      type: "range", min: 0.01, max: 0.5, step: 0.01, default: 0.1 },
        { uniform: "u_line_brightness", label: "Line Brightness",     type: "range", min: 0.5, max: 3.0, step: 0.1, default: 1.5 },
        { uniform: "u_bg_darken",       label: "BG Darken",           type: "range", min: 0.0, max: 1.0, step: 0.05, default: 0.85 },
        { uniform: "u_tint_r",          label: "Tint R",              type: "range", min: 0.0, max: 1.0, step: 0.05, default: 0.0 },
        { uniform: "u_tint_g",          label: "Tint G",              type: "range", min: 0.0, max: 1.0, step: 0.05, default: 1.0 },
        { uniform: "u_tint_b",          label: "Tint B",              type: "range", min: 0.0, max: 1.0, step: 0.05, default: 1.0 },
    ],
    RADAR: [
        { uniform: "u_sweep_speed",     label: "Sweep Speed",         type: "range", min: 0.1, max: 3.0, step: 0.1, default: 0.8 },
        { uniform: "u_ring_count",      label: "Ring Count",          type: "range", min: 2.0, max: 12.0, step: 1.0, default: 5.0 },
        { uniform: "u_trail_length",    label: "Trail Length",        type: "range", min: 0.05, max: 0.8, step: 0.05, default: 0.3 },
        { uniform: "u_overlay_intensity", label: "Overlay Intensity", type: "range", min: 0.0, max: 1.0, step: 0.05, default: 0.6 },
        { uniform: "u_bg_desat",        label: "BG Desaturation",     type: "range", min: 0.0, max: 1.0, step: 0.05, default: 0.7 },
    ],
    MOSAIC: [
        { uniform: "u_block_size",      label: "Block Size (px)",     type: "range", min: 2.0, max: 64.0, step: 1.0, default: 8.0 },
        { uniform: "u_cell_border",     label: "Cell Border Dark",    type: "range", min: 0.0, max: 1.0, step: 0.05, default: 0.3 },
        { uniform: "u_saturation",      label: "Saturation",          type: "range", min: 0.0, max: 2.0, step: 0.05, default: 1.0 },
    ],
    BLUEPRINT: [
        { uniform: "u_grid_spacing",    label: "Grid Spacing",        type: "range", min: 10.0, max: 100.0, step: 5.0, default: 40.0 },
        { uniform: "u_grid_intensity",  label: "Grid Intensity",      type: "range", min: 0.0, max: 1.0, step: 0.05, default: 0.3 },
        { uniform: "u_edge_strength",   label: "Edge Strength",       type: "range", min: 0.0, max: 3.0, step: 0.1, default: 1.5 },
        { uniform: "u_blue_tint",       label: "Blue Tint",           type: "range", min: 0.0, max: 1.0, step: 0.05, default: 0.7 },
        { uniform: "u_paper_brightness", label: "Paper Brightness",   type: "range", min: 0.3, max: 1.0, step: 0.05, default: 0.85 },
    ],
};
