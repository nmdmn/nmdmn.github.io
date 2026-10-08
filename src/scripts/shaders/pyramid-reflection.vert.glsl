attribute vec3 aBlur;
uniform vec2 uPixel;
uniform vec2 uRange;
varying float vWeight;
varying float vDepth;
varying vec3 vNormal;

#include <common>
#include <logdepthbuf_pars_vertex>

void main() {
  vWeight = aBlur.z;
  vDepth = (position.y - uRange.x) / (uRange.y - uRange.x);
  vNormal = normalMatrix * normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position.xy += aBlur.xy * uPixel * gl_Position.w;
  #include <logdepthbuf_vertex>
}
