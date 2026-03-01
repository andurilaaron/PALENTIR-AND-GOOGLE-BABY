// Thermal Vision Effect — false-color heat map
// Uniforms provided: u_time (float), u_resolution (vec2)

uniform sampler2D colorTexture;
uniform float u_time;
uniform vec2 u_resolution;
in vec2 v_textureCoordinates;

// Thermal color ramp: black → blue → purple → red → orange → yellow → white
vec3 thermalRamp(float t) {
    t = clamp(t, 0.0, 1.0);

    if (t < 0.15) {
        // Black to dark blue
        return mix(vec3(0.0, 0.0, 0.05), vec3(0.0, 0.0, 0.5), t / 0.15);
    } else if (t < 0.3) {
        // Dark blue to purple
        return mix(vec3(0.0, 0.0, 0.5), vec3(0.5, 0.0, 0.7), (t - 0.15) / 0.15);
    } else if (t < 0.5) {
        // Purple to red
        return mix(vec3(0.5, 0.0, 0.7), vec3(0.9, 0.1, 0.0), (t - 0.3) / 0.2);
    } else if (t < 0.7) {
        // Red to orange
        return mix(vec3(0.9, 0.1, 0.0), vec3(1.0, 0.6, 0.0), (t - 0.5) / 0.2);
    } else if (t < 0.85) {
        // Orange to yellow
        return mix(vec3(1.0, 0.6, 0.0), vec3(1.0, 1.0, 0.2), (t - 0.7) / 0.15);
    } else {
        // Yellow to white
        return mix(vec3(1.0, 1.0, 0.2), vec3(1.0, 1.0, 1.0), (t - 0.85) / 0.15);
    }
}

void main() {
    vec2 uv = v_textureCoordinates;

    // Sample scene
    vec4 color = texture(colorTexture, uv);

    // Convert to "heat" value (luminance-based)
    float heat = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Slight contrast boost
    heat = pow(heat, 0.85);

    // Apply thermal color ramp
    vec3 thermal = thermalRamp(heat);

    // Subtle noise for sensor feel
    float noise = fract(sin(dot(uv * u_resolution, vec2(12.9898, 78.233)) + u_time) * 43758.5453);
    thermal += (noise - 0.5) * 0.03;

    out_FragColor = vec4(thermal, 1.0);
}
