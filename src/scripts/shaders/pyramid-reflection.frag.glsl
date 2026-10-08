uniform vec3 uColor;
varying float vWeight;
varying float vDepth;
varying vec3 vNormal;

#include <logdepthbuf_pars_fragment>

void main() {
  #include <logdepthbuf_fragment>
  // Quiet planar shading and ink that dissolves toward the broad, deeper end.
  // Nothing fades because of scrolling; the geometry follows the live pose.
  float shade = .88 + .12 * abs(normalize(vNormal).x);
  float wash = 1.0 - .62 * smoothstep(.12, 1.0, vDepth);
  gl_FragColor = vec4(uColor * shade, .20 * wash * vWeight);
  #include <colorspace_fragment>
}
