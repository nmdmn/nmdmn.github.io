uniform float uWellReveal;
uniform float uLeadEnergy;
varying float vOrbitAlong;
varying float vOrbitAcross;
varying float vOrbitSpan;
varying float vOrbitTravel;
varying float vOrbitMu;

float ribbon(float along) {
  float ends = smoothstep(0.0, .22, along) * (1.0-smoothstep(.85, 1.0, along));
  return ends * (.24+.76*clamp(along, 0.0, 1.0)*clamp(along, 0.0, 1.0));
}

void main() {
  // Four shutter samples along the known orbital path, with no fullscreen
  // motion blur, frame history, particle spawning or synthetic audio trigger.
  float baseSpan = max(.001, vOrbitSpan-vOrbitTravel);
  float behindHead = (1.0-vOrbitAlong)*vOrbitSpan;
  float streak = 0.0;
  for (int i=0; i<4; i++) {
    float earlier = vOrbitTravel*(float(i)+.5)/4.0;
    streak += ribbon(1.0-(behindHead-earlier)/baseSpan)*.25;
  }
  float aa = min(.25, max(.015, fwidth(vOrbitAcross)));
  float edges = 1.0-smoothstep(.48-aa, 1.0, abs(vOrbitAcross));
  // White fragments hug the limb rather than scribble over the black center.
  float limb = 1.0-smoothstep(.16, .38, vOrbitMu);
  float alpha = streak * edges * limb * uWellReveal * (.48+uLeadEnergy*.18);
  if (alpha < .0001) discard;
  vec3 white = vec3(4.0, 4.35, 4.15);
  gl_FragColor = vec4(white*alpha, alpha);
}
