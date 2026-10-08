uniform float uBeamReveal;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 p = position;
  p.y = (p.y - 2.1) * max(uBeamReveal, .001) + 2.1;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
