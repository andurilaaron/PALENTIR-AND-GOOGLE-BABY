// Thermal Vision Effect — false-color heat map with FLIR features
// Uniforms provided: u_time (float), u_resolution (vec2)
// User-controlled: u_contrast, u_sensor_noise, u_white_hot, u_edge_overlay, u_edge_strength

uniform sampler2D colorTexture;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_contrast;
uniform float u_sensor_noise;
uniform float u_white_hot;
uniform float u_edge_overlay;
uniform float u_edge_strength;
in vec2 v_textureCoordinates;

// Thermal color ramp: black -> blue -> purple -> red -> orange -> yellow -> white
vec3 thermalRamp(float t) {
    t = clamp(t, 0.0, 1.0);

    if (t < 0.15) {
        return mix(vec3(0.0, 0.0, 0.05), vec3(0.0, 0.0, 0.5), t / 0.15);
    } else if (t < 0.3) {
        return mix(vec3(0.0, 0.0, 0.5), vec3(0.5, 0.0, 0.7), (t - 0.15) / 0.15);
    } else if (t < 0.5) {
        return mix(vec3(0.5, 0.0, 0.7), vec3(0.9, 0.1, 0.0), (t - 0.3) / 0.2);
    } else if (t < 0.7) {
        return mix(vec3(0.9, 0.1, 0.0), vec3(1.0, 0.6, 0.0), (t - 0.5) / 0.2);
    } else if (t < 0.85) {
        return mix(vec3(1.0, 0.6, 0.0), vec3(1.0, 1.0, 0.2), (t - 0.7) / 0.15);
    } else {
        return mix(vec3(1.0, 1.0, 0.2), vec3(1.0, 1.0, 1.0), (t - 0.85) / 0.15);
    }
}

float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 uv = v_textureCoordinates;
    vec2 texel = 1.0 / u_resolution;

    // Sample scene
    vec4 color = texture(colorTexture, uv);

    // Convert to "heat" value (luminance-based)
    float heat = luminance(color.rgb);

    // Contrast control
    heat = pow(heat, u_contrast);

    // White-hot / black-hot polarity inversion
    if (u_white_hot > 0.5) {
        heat = 1.0 - heat;
    }

    // Apply thermal color ramp
    vec3 thermal = thermalRamp(heat);

    // Laplacian edge enhancement (guarded by toggle)
    if (u_edge_overlay > 0.5) {
        float tc = luminance(texture(colorTexture, uv + vec2(     0.0,  texel.y)).rgb);
        float bc = luminance(texture(colorTexture, uv + vec2(     0.0, -texel.y)).rgb);
        float ml = luminance(texture(colorTexture, uv + vec2(-texel.x,      0.0)).rgb);
        float mr = luminance(texture(colorTexture, uv + vec2( texel.x,      0.0)).rgb);
        float center = luminance(color.rgb);
        float laplacian = abs((tc + bc + ml + mr) - 4.0 * center);
        laplacian = clamp(laplacian * u_edge_strength * 10.0, 0.0, 1.0);
        thermal = mix(thermal, vec3(1.0), laplacian * 0.7);
    }

    // Subtle noise for sensor feel
    float noise = fract(sin(dot(uv * u_resolution, vec2(12.9898, 78.233)) + u_time) * 43758.5453);
    thermal += (noise - 0.5) * u_sensor_noise;

    out_FragColor = vec4(thermal, 1.0);
}
