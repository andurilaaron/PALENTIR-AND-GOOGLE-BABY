// Night Vision (NVG) Effect — green monochrome with grain and vignette
// Uniforms provided: u_time (float), u_resolution (vec2)
// User-controlled: u_gain, u_grain, u_ccd_scanlines, u_vignette_radius, u_gamma

uniform sampler2D colorTexture;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_gain;
uniform float u_grain;
uniform float u_ccd_scanlines;
uniform float u_vignette_radius;
uniform float u_gamma;
in vec2 v_textureCoordinates;

// Simple hash-based noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 uv = v_textureCoordinates;

    // Sample scene
    vec4 color = texture(colorTexture, uv);

    // Convert to luminance
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Amplify (night vision boost)
    lum = pow(lum, u_gamma) * u_gain;
    lum = clamp(lum, 0.0, 1.0);

    // Green NVG tint
    vec3 nvg = vec3(lum * 0.1, lum * 0.95, lum * 0.12);

    // Film grain noise
    float noise = hash(uv * u_resolution + vec2(u_time * 100.0, 0.0));
    noise = (noise - 0.5) * u_grain;
    nvg += vec3(noise * 0.3, noise, noise * 0.3);

    // Vignette (circular dark edges, typical of NVG)
    vec2 centered = uv - 0.5;
    float dist = length(centered);
    float vignette = smoothstep(0.5, u_vignette_radius, dist);
    nvg *= vignette;

    // Slight scanline effect (CCD sensor lines)
    float scanline = (1.0 - u_ccd_scanlines) + u_ccd_scanlines * sin(uv.y * u_resolution.y * 0.8);
    nvg *= scanline;

    out_FragColor = vec4(nvg, 1.0);
}
