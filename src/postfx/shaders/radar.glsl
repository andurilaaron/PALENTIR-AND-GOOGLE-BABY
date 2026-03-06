// Radar Sweep Effect — rotating sweep arc with concentric rings
// Uniforms provided: u_time (float), u_resolution (vec2)
// User-controlled: u_sweep_speed, u_ring_count, u_trail_length, u_overlay_intensity, u_bg_desat

uniform sampler2D colorTexture;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_sweep_speed;
uniform float u_ring_count;
uniform float u_trail_length;
uniform float u_overlay_intensity;
uniform float u_bg_desat;
in vec2 v_textureCoordinates;

#define PI 3.14159265359
#define TAU 6.28318530718

void main() {
    vec2 uv = v_textureCoordinates;

    // Sample scene
    vec4 color = texture(colorTexture, uv);

    // Desaturate background
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 gray = vec3(lum);
    vec3 bg = mix(color.rgb, gray, u_bg_desat);

    // Green-tint the desaturated background
    bg *= vec3(0.6, 1.0, 0.6);

    // Polar coordinates from center
    vec2 centered = uv - 0.5;
    // Correct for aspect ratio
    float aspect = u_resolution.x / u_resolution.y;
    centered.x *= aspect;

    float dist = length(centered);
    float angle = atan(centered.y, centered.x); // -PI to PI

    // Sweep arm angle (rotating)
    float sweepAngle = mod(u_time * u_sweep_speed * TAU, TAU) - PI;

    // Angular difference (wrapped to -PI..PI)
    float angleDiff = angle - sweepAngle;
    angleDiff = mod(angleDiff + PI, TAU) - PI;

    // Trail: bright behind the sweep arm
    float trail = 0.0;
    if (angleDiff < 0.0 && angleDiff > -u_trail_length * TAU) {
        trail = 1.0 + angleDiff / (u_trail_length * TAU); // 1.0 at arm, 0.0 at tail
        trail = trail * trail; // Quadratic falloff
    }
    // Bright line at sweep arm
    float arm = smoothstep(0.02, 0.0, abs(angleDiff)) * 0.8;
    trail = max(trail, arm);

    // Fade out at edges
    trail *= smoothstep(0.55, 0.45, dist);

    // Concentric rings
    float rings = abs(fract(dist * u_ring_count) - 0.5);
    rings = smoothstep(0.48, 0.5, rings);
    float ringOverlay = rings * 0.15;

    // Cross-hairs (vertical + horizontal through center)
    float crossH = smoothstep(0.002, 0.0, abs(centered.y));
    float crossV = smoothstep(0.002, 0.0, abs(centered.x));
    float cross = max(crossH, crossV) * 0.1;

    // Compose radar overlay
    vec3 radarColor = vec3(0.2, 1.0, 0.3);
    vec3 overlay = radarColor * (trail * 0.7 + ringOverlay + cross);

    // Blend
    vec3 result = mix(bg, bg + overlay, u_overlay_intensity);

    out_FragColor = vec4(result, 1.0);
}
