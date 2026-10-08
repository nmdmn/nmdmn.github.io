uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uGlow;
varying vec2 vUv;

float grain(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453) - .5;
}

void main() {
  vec3 color = texture2D(tDiffuse, vUv).rgb;
  if (any(isnan(color)) || any(isinf(color))) color = vec3(0.0);
  color = clamp(color, vec3(0.0), vec3(12.0));
  // Hue-preserving HDR shoulder AFTER multi-scale bloom. Only over-white
  // highlights roll off: paper, grey reflection and matte shadows stay exact.
  float peak = max(color.r, max(color.g, color.b));
  float excess = max(0.0, peak - 1.0);
  float shoulder = 1.0 + excess / (1.0 + excess * .35);
  color *= mix(1.0, shoulder / max(peak, 1.0), uGlow);
  float luminance = dot(color, vec3(.2126, .7152, .0722));
  // Eight film frames per second: texture, not high-frequency sparkling.
  float noise = grain(gl_FragCoord.xy + floor(uTime * 8.0) * vec2(37.0, 53.0));
  color += noise * mix(.0018, .001, clamp(luminance, 0.0, 1.0));
  // Keep the paper white and the black form black; no heavy vignette or tint.
  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}
