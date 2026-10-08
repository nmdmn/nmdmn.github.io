uniform float uReveal;
uniform float uInverse;
varying float vFade;

void main() {
  float core = 1.0 - smoothstep(.08, .49, length(gl_PointCoord - .5));
  vec3 color = mix(vec3(.15, .24, .18), vec3(.57, .72, .61), uInverse);
  gl_FragColor = vec4(color, core * vFade * uReveal * .26);
}
