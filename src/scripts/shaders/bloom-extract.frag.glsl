uniform sampler2D tDiffuse;
uniform float luminosityThreshold;
uniform float smoothWidth;
varying vec2 vUv;

void main() {
  vec3 color = texture2D(tDiffuse, vUv).rgb;
  float light = dot(color, vec3(.2126, .7152, .0722));
  float knee = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, light);
  // Extract emitted energy, not the white paper mixed into transparent light.
  gl_FragColor = vec4(max(color - vec3(1.0), vec3(0.0)) * knee, 1.0);
}
