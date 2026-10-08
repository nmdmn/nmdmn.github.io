varying vec3 vRimNormal;
varying vec3 vRimView;

void main() {
  // The horizon is perfectly stable. Rotation lives in the narrow light skin,
  // not in a lumpy silhouette. View-space vectors also work in the real mirror.
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vRimNormal = normalMatrix * normal;
  vRimView = -viewPosition.xyz;
  gl_Position = projectionMatrix * viewPosition;
}
