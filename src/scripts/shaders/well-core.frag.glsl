uniform float uChaosTime;
uniform float uWellReveal;
uniform float uLeadEnergy;
uniform float uShell;
uniform float uRimExposure;
uniform float uRimPhase;
uniform float uRimSpeed;
uniform float uShellRatio;
uniform float uLeadBrightness;
varying vec3 vRimNormal;
varying vec3 vRimView;

float filteredWave(float phase, float frequency, float speed) {
  // Analytic shutter integration plus pixel filtering: apparent extreme speed
  // becomes streaking, not a high-contrast flashing/aliasing annulus on phones.
  float temporal = frequency * speed * uRimExposure * .5;
  float shutter = abs(temporal) < .0001 ? 1.0 : sin(temporal) / temporal;
  float spatial = frequency * fwidth(phase);
  float pixel = 1.0 - smoothstep(.35, 2.5, spatial);
  return sin(phase * frequency) * shutter * pixel;
}

void main() {
  vec3 n = normalize(vRimNormal);
  vec3 view = normalize(vRimView);
  float mu = clamp(dot(n, view), 0.0, 1.0);
  float rho = sqrt(max(0.0, 1.0 - mu*mu));
  // Evaluate derivatives before any discard, including the unlit interior.
  float angle = dot(n.xy, n.xy) > .00000001 ? atan(n.y, n.x) : 0.0;
  float phase = angle - uRimPhase;
  float sweep = filteredWave(phase, 1.0, uRimSpeed);
  float streaks = .80 + filteredWave(phase, 3.0, uRimSpeed)*(.13 + uLeadEnergy*.10)
    + filteredWave(phase + .7, 9.0, uRimSpeed)*.08;
  // A modest, stable approaching-side bias avoids a uniform neon circle.
  float beaming = .86 + .14*cos(angle - .65 - uChaosTime*.38);
  float pressure = .72 + uLeadEnergy*.78;
  vec3 green = vec3(.035, 2.65, .48);
  vec3 white = vec3(4.4, 5.0, 4.6);
  float whiteMix = .58 + uLeadBrightness*.18 + sweep*.18;
  vec3 radiance = mix(green, white, whiteMix) * streaks * beaming * pressure;

  if (uShell > .5) {
    // Optical path through a thin spherical atmosphere. Its column density
    // peaks at the opaque horizon's limb and vanishes at the outer silhouette.
    float inner = 1.0 / uShellRatio;
    float column = sqrt(max(0.0, 1.0-rho*rho))
      - sqrt(max(0.0, inner*inner-rho*rho));
    float outerMask = smoothstep(inner-.008, inner+.004, rho);
    float scatter = (1.0-exp(-max(0.0, column)*7.0)) * outerMask;
    float alpha = scatter * uWellReveal * (.30 + uLeadEnergy*.24);
    if (alpha < .0001) discard;
    gl_FragColor = vec4(mix(green, radiance, .28), alpha);
  } else {
    // A narrow rotating crest breathes with the lead, not the black interior.
    // At most ~3.5% of projected radius emits; the central disc stays opaque.
    float aa = min(.045, max(.001, fwidth(mu)));
    float rimWidth = .18 + uLeadEnergy*.075 + sweep*.015;
    float photon = 1.0 - smoothstep(.065-aa, rimWidth+aa, mu);
    vec3 black = vec3(.00035);
    gl_FragColor = vec4(black + radiance * photon * uWellReveal, 1.0);
  }
}
