uniform sampler2D tDiffuse;
varying vec2 vUv;
#include <well_haze>

void main() {
  vec3 color = texture2D(tDiffuse, vUv).rgb;
  // One invalid HDR texel otherwise poisons several bloom mip levels.
  if (any(isnan(color)) || any(isinf(color))) color = vec3(0.0);
  color = wellHaze(color, vUv);
  if (any(isnan(color)) || any(isinf(color))) color = vec3(0.0);
  gl_FragColor = vec4(clamp(color, vec3(0.0), vec3(12.0)), 1.0);
}
