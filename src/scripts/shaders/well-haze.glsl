uniform sampler2D tSceneDepth;
uniform mat4 uHazeInverseProjection;
uniform mat4 uHazeViewToWell;
uniform vec3 uHazeOrigin;
uniform vec2 uWellHazeDrift;
uniform float uWellHazeReveal;
uniform float uWellHazeTime;
uniform float uWellHazePressure;
uniform float uWellHazeSteps;
uniform float uWellHazeCoreRadius;

vec3 wellHaze(vec3 color, vec2 uv) {
  if (uWellHazeReveal < .0001) return color;
  float depth = texture2D(tSceneDepth, uv).r;
  // Never paint the empty white background or invent a luminous floor.
  if (depth >= .999999) return color;
  vec4 viewHit = uHazeInverseProjection * vec4(uv*2.0-1.0, depth*2.0-1.0, 1.0);
  viewHit /= viewHit.w;
  vec3 hit = (uHazeViewToWell * viewHit).xyz;
  vec3 origin = uHazeOrigin;
  vec3 center = vec3(0.0, 2.48, 0.0);
  // Protect the opaque horizon with a soft transition, not a binary spherical
  // fog mask that can leave an extra hard contour around the black hole.
  float horizonFade = smoothstep(.012, .045, abs(length(hit-center)-uWellHazeCoreRadius));
  if (horizonFade < .00001) return color;
  float distanceToHit = length(hit-origin);
  vec3 ray = (hit-origin) / max(.0001, distanceToHit);
  // Conservative box bounds are only an integration optimization. Density has
  // already faded to zero BEFORE every box face; there is no spherical shell.
  vec3 extent = vec3(1.52, 1.08, 1.52);
  vec3 inverseRay = (step(vec3(0.0), ray)*2.0-1.0) / max(abs(ray), vec3(.00001));
  vec3 first = (center-extent-origin) * inverseRay;
  vec3 last = (center+extent-origin) * inverseRay;
  vec3 near = min(first, last), far = max(first, last);
  float start = max(0.0, max(near.x, max(near.y, near.z)));
  float end = min(distanceToHit, min(far.x, min(far.y, far.z)));
  if (end <= start) return color;
  float stepSize = (end-start) / uWellHazeSteps;
  float opticalDepth = 0.0;
  for (int i=0; i<12; i++) {
    if (float(i) >= uWellHazeSteps) break;
    vec3 samplePoint = origin + ray*(start+(float(i)+.5)*stepSize);
    vec3 local = samplePoint-center;
    float radial = length(samplePoint.xz);
    // Broad Gaussian air replaces the annular/ellipsoidal skin, which read as
    // a separate green ball. Feather over generous world-space distances.
    float cloud = exp(-dot(local.xz-uWellHazeDrift, local.xz-uWellHazeDrift)/.6724 - local.y*local.y/.36);
    float radialFade = 1.0-smoothstep(.85, 1.48, radial);
    float verticalFade = 1.0-smoothstep(.48, 1.04, abs(local.y));
    float breathing = .82 + .18*sin(samplePoint.x*3.1 + samplePoint.z*2.7
      + samplePoint.y*4.0 - uWellHazeTime*.24);
    float density = cloud * radialFade * verticalFade * breathing * .55;
    opticalDepth += density * stepSize;
  }
  float extinction = opticalDepth * uWellHazeReveal * horizonFade * (.85+uWellHazePressure*.35);
  // Smooth saturation avoids the flat-opacity plateau of a hard depth clamp.
  float transmission = exp(-.60*(1.0-exp(-extinction/.60)));
  vec3 scattering = vec3(.035, .68, .16) * (.85+uWellHazePressure*.15);
  return color*transmission + scattering*(1.0-transmission);
}
