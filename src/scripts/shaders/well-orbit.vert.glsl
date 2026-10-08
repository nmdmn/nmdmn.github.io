attribute vec3 aOrbitU;
attribute vec3 aOrbitV;
attribute vec3 aOrbitShape;
attribute float aOrbitRate;
attribute float aOrbitPhase;
uniform float uLeadEnergy;
uniform float uRimSpeed;
uniform float uOrbitShutter;
varying float vOrbitAlong;
varying float vOrbitAcross;
varying float vOrbitSpan;
varying float vOrbitTravel;
varying float vOrbitMu;

void main() {
  float along = position.x;
  float across = position.y;
  float travel = min(.55, uRimSpeed * aOrbitRate * uOrbitShutter);
  float span = aOrbitShape.y + travel;
  float angle = aOrbitPhase - (1.0-along)*span;
  float taper = pow(max(0.0, sin(along*3.14159265)), .75);
  float latitude = across * aOrbitShape.z * taper * (1.0+uLeadEnergy*.12);
  vec3 normal = normalize(cross(aOrbitU, aOrbitV));
  vec3 radial = (aOrbitU*cos(angle) + aOrbitV*sin(angle))*cos(latitude) + normal*sin(latitude);
  vec3 p = radial * aOrbitShape.x;
  vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
  vOrbitAlong = along;
  vOrbitAcross = across;
  vOrbitSpan = span;
  vOrbitTravel = travel;
  vOrbitMu = abs(dot(normalize(normalMatrix*radial), normalize(-viewPosition.xyz)));
  gl_Position = projectionMatrix * viewPosition;
}
