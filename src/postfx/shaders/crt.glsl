// CRT Scanline Effect — green-tinted phosphor display
// Uniforms provided: u_time (float), u_resolution (vec2)
// User-controlled: u_scanline_freq, u_barrel, u_phosphor_glow, u_flicker, u_vignette

uniform sampler2D colorTexture;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_scanline_freq;
uniform float u_barrel;
uniform float u_phosphor_glow;
uniform float u_flicker;
uniform float u_vignette;
in vec2 v_textureCoordinates;

void main() {
    vec2 uv = v_textureCoordinates;

    // Slight barrel distortion
    vec2 centered = uv - 0.5;
    float dist = dot(centered, centered);
    vec2 distorted = uv + centered * dist * u_barrel;

    // Sample the scene
    vec4 color = texture(colorTexture, distorted);

    // Convert to luminance and tint green (phosphor)
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 phosphor = vec3(lum * 0.15, lum * 1.0, lum * 0.2);

    // Scanlines
    float scanline = sin(uv.y * u_resolution.y * u_scanline_freq) * 0.5 + 0.5;
    scanline = mix(0.7, 1.0, scanline);
    phosphor *= scanline;

    // Phosphor glow (bloom approximation)
    phosphor += vec3(0.0, lum * u_phosphor_glow, 0.0);

    // Flicker
    float flicker = (1.0 - u_flicker) + u_flicker * sin(u_time * 8.0);
    phosphor *= flicker;

    // Vignette
    float vignette = 1.0 - dist * u_vignette;
    vignette = clamp(vignette, 0.0, 1.0);
    phosphor *= vignette;

    out_FragColor = vec4(phosphor, 1.0);
}
