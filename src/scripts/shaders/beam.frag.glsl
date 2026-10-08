uniform float uTime;
uniform float uProjectionEmission;
varying vec2 vUv;

void main() {
  float fade = smoothstep(0.0, .72, vUv.y);
  float strand = pow(clamp(.5 + .5 * sin(vUv.x * 31.4159265 + sin(vUv.y * 8.0 - uTime * .21)), 0.0, 1.0), 4.0);
  float breath = .92 + .08 * sin(vUv.y * 9.0 - uTime * .25);
  // Broad, softly distributed emission instead of four hard ribs and a dot.
  // Most of the HDR brightness stays near the broken tip, away from the text.
  float feather = smoothstep(0.0, .18, vUv.x) * (1.0 - smoothstep(.82, 1.0, vUv.x));
  float alpha = (.055 + strand * .025) * fade * breath * uProjectionEmission * feather;
  vec3 green = mix(vec3(.14, .72, .29), vec3(.10, 2.4, .42), smoothstep(.70, 1.0, vUv.y));
  gl_FragColor = vec4(green, clamp(alpha, 0.0, .14));
  #include <colorspace_fragment>
}
