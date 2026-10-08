uniform vec4 uMusicPanels[4];
uniform vec4 uMusicSafeArea;
varying float vActivity;
varying vec2 vScreen;

void main() {
  float core = 1.0 - smoothstep(.08, .48, length(gl_PointCoord - .5));
  vec2 safe = smoothstep(uMusicSafeArea.xy, uMusicSafeArea.xy + .015, vScreen)
    * (1.0 - smoothstep(uMusicSafeArea.zw - .015, uMusicSafeArea.zw, vScreen));
  float mask = safe.x * safe.y;
  // The HTML has no WebGL depth buffer. Keep the field out of each projected
  // panel's screen bounds, including transition overlap and the mobile layout.
  for (int i = 0; i < 4; i++) {
    vec4 panel = uMusicPanels[i];
    vec2 inside = smoothstep(panel.xy - .012, panel.xy, vScreen)
      * (1.0 - smoothstep(panel.zw, panel.zw + .012, vScreen));
    mask *= 1.0 - inside.x * inside.y;
  }
  float alpha = core * mask * min(.20, vActivity * .32);
  if (alpha < .002) discard;
  gl_FragColor = vec4(vec3(.12, .18, .14), alpha);
  #include <colorspace_fragment>
}
