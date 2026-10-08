attribute float aSeam;
attribute float aAlong;
attribute float aAcross;
attribute float aExposure;
attribute vec3 aFaceNormal;
attribute float aGlowFin;
varying float vSeam;
varying float vAlong;
varying float vAcross;
varying float vExposure;
varying float vGrazing;
varying float vGlowFin;

void main() {
  vSeam = aSeam;
  vAlong = aAlong;
  vAcross = aAcross;
  vExposure = aExposure;
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vec3 viewNormal = normalize(normalMatrix * aFaceNormal);
  vGrazing = 1.0 - abs(dot(viewNormal, normalize(-viewPosition.xyz)));
  vGlowFin = aGlowFin;
  gl_Position = projectionMatrix * viewPosition;
}
