// Blueprint Effect — inverted luminance with grid overlay and edge detection
// Uniforms provided: u_time (float), u_resolution (vec2)
// User-controlled: u_grid_spacing, u_grid_intensity, u_edge_strength, u_blue_tint, u_paper_brightness

uniform sampler2D colorTexture;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_grid_spacing;
uniform float u_grid_intensity;
uniform float u_edge_strength;
uniform float u_blue_tint;
uniform float u_paper_brightness;
in vec2 v_textureCoordinates;

float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 uv = v_textureCoordinates;
    vec2 texel = 1.0 / u_resolution;

    // Sample scene luminance
    vec4 color = texture(colorTexture, uv);
    float lum = luminance(color.rgb);

    // Invert — dark ink on bright paper
    float ink = 1.0 - lum;

    // Sobel edge detection for ink strokes
    float tl = luminance(texture(colorTexture, uv + vec2(-texel.x,  texel.y)).rgb);
    float tc = luminance(texture(colorTexture, uv + vec2(     0.0,  texel.y)).rgb);
    float tr = luminance(texture(colorTexture, uv + vec2( texel.x,  texel.y)).rgb);
    float ml = luminance(texture(colorTexture, uv + vec2(-texel.x,      0.0)).rgb);
    float mr = luminance(texture(colorTexture, uv + vec2( texel.x,      0.0)).rgb);
    float bl = luminance(texture(colorTexture, uv + vec2(-texel.x, -texel.y)).rgb);
    float bc = luminance(texture(colorTexture, uv + vec2(     0.0, -texel.y)).rgb);
    float br = luminance(texture(colorTexture, uv + vec2( texel.x, -texel.y)).rgb);

    float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
    float gy = -tl - 2.0*tc - tr + bl + 2.0*bc + br;
    float edge = sqrt(gx*gx + gy*gy);
    edge = clamp(edge * u_edge_strength, 0.0, 1.0);

    // Cartesian grid overlay
    vec2 pixelCoord = uv * u_resolution;
    float gridH = smoothstep(1.0, 0.0, abs(mod(pixelCoord.x, u_grid_spacing) - 0.5));
    float gridV = smoothstep(1.0, 0.0, abs(mod(pixelCoord.y, u_grid_spacing) - 0.5));
    float grid = max(gridH, gridV) * u_grid_intensity;

    // Combine: paper base, ink from edges and inverted luminance
    float paperBase = u_paper_brightness;
    float darkInk = max(edge, ink * 0.3) + grid * 0.5;
    float value = paperBase - darkInk * 0.6;
    value = clamp(value, 0.0, 1.0);

    // Blueprint blue tint
    vec3 bluePaper = vec3(0.85 - u_blue_tint * 0.6, 0.9 - u_blue_tint * 0.35, 1.0);
    vec3 darkBlue  = vec3(0.05, 0.1, 0.25);
    vec3 result = mix(darkBlue, bluePaper, value);

    out_FragColor = vec4(result, 1.0);
}
