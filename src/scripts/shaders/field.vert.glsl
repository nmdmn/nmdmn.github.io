uniform float uTime;
uniform float uPixelRatio;
uniform float uInverse;
uniform vec2 uSize;
attribute float aSeed;
varying float vFade;

void main() {
  vec3 p = position;
  // The top-face sheet stays just above the solid surface. Other chapters
  // have real shallow depth behind the projected DOM, not screen-space noise.
  p.z = mix(-.05 - position.z * .17, .012 + position.z * .008, uInverse);
  p.z += sin(uTime * .18 + aSeed * 30.0) * mix(.018, .002, uInverse);
  p.xy *= uSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = clamp((1.1 + aSeed * .6) * uPixelRatio, 1.0, 3.0);
  vec2 edge = 1.0 - smoothstep(vec2(.38), vec2(.5), abs(position.xy));
  vFade = edge.x * edge.y * (.72 + .28 * sin(uTime * .25 + aSeed * 20.0));
}
