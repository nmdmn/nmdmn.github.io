uniform sampler2D tDiffuse;
uniform sampler2D tScene;
varying vec2 vUv;

void main() {
  vec3 glow = max(texture2D(tDiffuse, vUv).rgb, vec3(0.0));
  vec3 scene = texture2D(tScene, vUv).rgb;
  if (any(isnan(scene)) || any(isinf(scene))) scene = vec3(0.0);
  float light = dot(scene, vec3(.2126, .7152, .0722));
  // Preserve the charcoal monument instead of pouring a white veil over it.
  float preserve = mix(.24, 1.0, smoothstep(.06, .38, light));
  float peak = max(glow.r, max(glow.g, glow.b));
  vec3 tint = glow / max(peak, .00001);
  float veil = min(.55, 1.0 - exp(-peak * .24)) * preserve;
  // A bounded, chromatic halation remains visible on pale paper. Highlights
  // retain HDR headroom; the existing finish pass supplies the final shoulder.
  gl_FragColor = vec4(tint * (1.0 + min(peak, .8)), veil);
}
