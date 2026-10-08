uniform sampler2D uSeamFlow;
uniform float uSeamRows;
varying float vSeam;
varying float vAlong;
varying float vAcross;
varying float vExposure;
varying float vGrazing;
varying float vGlowFin;

void main() {
  float grid = clamp(vAlong, 0.0, 1.0) * 7.0;
  float column = floor(grid);
  float row = (vSeam + .5) / uSeamRows;
  vec2 a = texture2D(uSeamFlow, vec2((column + .5) / 8.0, row)).rg;
  vec2 b = texture2D(uSeamFlow, vec2((min(7.0, column + 1.0) + .5) / 8.0, row)).rg;
  vec2 energy = mix(a, b, fract(grid)) * vExposure;
  // Bounded compensation for lost pixel coverage, not visibility through
  // opaque stone. Crossed skins share exactly the same musical occupancy.
  energy *= (1.0 + .8*vGrazing*vGrazing) * mix(1.0, .62, vGlowFin);
  // A narrow bright head, a darker emerald wake. No animated noise clock or
  // global flicker: the moving occupancy samples come from audible note age.
  float core = exp(-vAcross * vAcross * 6.0);
  float soft = 1.0 - smoothstep(.35, 1.0, abs(vAcross));
  vec3 light = vec3(.95, 7.8, 2.45) * energy.r * core
    + vec3(.070, 2.4, .55) * energy.g * soft;
  float alpha = clamp((energy.r + energy.g) * soft, 0.0, 1.0);
  if (alpha < .0001) discard;
  // Additive premultiplied energy; alpha is not applied twice to the HDR head.
  gl_FragColor = vec4(light, alpha);
}
