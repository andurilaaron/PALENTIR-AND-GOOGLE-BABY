// Mosaic / Pixelation Effect — UV snapped to block grid
// Uniforms provided: u_time (float), u_resolution (vec2)
// User-controlled: u_block_size, u_cell_border, u_saturation

uniform sampler2D colorTexture;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_block_size;
uniform float u_cell_border;
uniform float u_saturation;
in vec2 v_textureCoordinates;

void main() {
    vec2 uv = v_textureCoordinates;

    // Block size in UV space
    vec2 blockUV = u_block_size / u_resolution;

    // Snap UV to grid
    vec2 snapped = floor(uv / blockUV) * blockUV + blockUV * 0.5;

    // Sample at snapped position
    vec4 color = texture(colorTexture, snapped);

    // Saturation control
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 gray = vec3(lum);
    vec3 saturated = mix(gray, color.rgb, u_saturation);

    // Cell border darkening — darken pixels near block edges
    vec2 cellPos = fract(uv / blockUV); // 0..1 within cell
    float borderDist = min(min(cellPos.x, 1.0 - cellPos.x), min(cellPos.y, 1.0 - cellPos.y));
    float borderFade = smoothstep(0.0, 0.15, borderDist);
    float darken = mix(1.0 - u_cell_border, 1.0, borderFade);

    vec3 result = saturated * darken;

    out_FragColor = vec4(result, 1.0);
}
