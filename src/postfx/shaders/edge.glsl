// Edge Detection Effect — Sobel edge lines over darkened background
// Uniforms provided: u_time (float), u_resolution (vec2)
// User-controlled: u_edge_threshold, u_line_brightness, u_bg_darken, u_tint_r/g/b

uniform sampler2D colorTexture;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_edge_threshold;
uniform float u_line_brightness;
uniform float u_bg_darken;
uniform float u_tint_r;
uniform float u_tint_g;
uniform float u_tint_b;
in vec2 v_textureCoordinates;

float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 uv = v_textureCoordinates;
    vec2 texel = 1.0 / u_resolution;

    // 3x3 neighborhood luminance samples
    float tl = luminance(texture(colorTexture, uv + vec2(-texel.x,  texel.y)).rgb);
    float tc = luminance(texture(colorTexture, uv + vec2(     0.0,  texel.y)).rgb);
    float tr = luminance(texture(colorTexture, uv + vec2( texel.x,  texel.y)).rgb);
    float ml = luminance(texture(colorTexture, uv + vec2(-texel.x,      0.0)).rgb);
    float mr = luminance(texture(colorTexture, uv + vec2( texel.x,      0.0)).rgb);
    float bl = luminance(texture(colorTexture, uv + vec2(-texel.x, -texel.y)).rgb);
    float bc = luminance(texture(colorTexture, uv + vec2(     0.0, -texel.y)).rgb);
    float br = luminance(texture(colorTexture, uv + vec2( texel.x, -texel.y)).rgb);

    // Sobel operators
    float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
    float gy = -tl - 2.0*tc - tr + bl + 2.0*bc + br;
    float edge = sqrt(gx*gx + gy*gy);

    // Threshold and brightness
    float mask = smoothstep(u_edge_threshold, u_edge_threshold + 0.05, edge);
    mask *= u_line_brightness;
    mask = clamp(mask, 0.0, 1.0);

    // Background: darkened original
    vec4 original = texture(colorTexture, uv);
    vec3 bg = original.rgb * (1.0 - u_bg_darken);

    // Tinted edge lines
    vec3 tint = vec3(u_tint_r, u_tint_g, u_tint_b);
    vec3 result = mix(bg, tint, mask);

    out_FragColor = vec4(result, 1.0);
}
