uniform float uPixelRatio;
attribute float aSeed;
varying float vActivity;
varying vec2 vScreen;

void main() {
  vec3 p = position;
  vec4 field = pondMotion(p.xz);
  vec2 drift = field.xy * 9.0;
  drift *= inversesqrt(1.0 + dot(drift, drift) / .0144);
  p.xz += drift;
  p.y += min(.035, abs(field.z) * .22);
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  vScreen = gl_Position.xy / max(.001, gl_Position.w) * .5 + .5;
  gl_PointSize = clamp((.9 + aSeed * .8) * uPixelRatio, 1.0, 3.0);
  vActivity = field.w * (1.0 - smoothstep(1.9, 2.8, length(position.xz))) * (.6 + aSeed * .4);
}
