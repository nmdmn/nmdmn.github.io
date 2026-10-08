import { surfaceSpan } from "./stone-surface.js";
import { masonrySize, courseHeight } from "./masonry-layout.js";
import { sideBase, sideTop } from "./side-surface.js";

// The paving retains positive lift / monotone lateral strain. Separate seated
// casing weights allow rigid outward face motion, never modifying tip paths.
export function stoneMotionWeight(block) { return block.course === masonrySize.courses - 1 ? 1 : 0; }

const sampling = `
  attribute float aStoneCrown;
  attribute vec3 aStoneSides;
  uniform sampler2D uStoneField;
  uniform float uStoneFieldSize;
  uniform sampler2D uSideField;
  uniform float uSideFieldSize;
  vec3 stoneSurface(vec2 position) {
    vec2 grid = clamp(position / ${surfaceSpan.toFixed(1)} + .5, 0.0, 1.0) * (uStoneFieldSize - 1.0);
    vec2 base = floor(grid), blend = fract(grid);
    vec2 uv = (base + .5) / uStoneFieldSize;
    vec2 texel = vec2(1.0 / uStoneFieldSize);
    vec3 a = texture2D(uStoneField, uv).rgb;
    vec3 b = texture2D(uStoneField, uv + vec2(texel.x, 0.0)).rgb;
    vec3 c = texture2D(uStoneField, uv + vec2(0.0, texel.y)).rgb;
    vec3 d = texture2D(uStoneField, uv + texel).rgb;
    return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y);
  }
  vec3 sideField(vec2 position) {
    vec2 grid = clamp(position, 0.0, 1.0) * (uSideFieldSize - 1.0);
    vec2 base = floor(grid), blend = fract(grid);
    vec2 uv = (base + .5) / uSideFieldSize;
    vec2 texel = vec2(1.0 / uSideFieldSize);
    vec3 a = texture2D(uSideField, uv).rgb;
    vec3 b = texture2D(uSideField, uv + vec2(texel.x, 0.0)).rgb;
    vec3 c = texture2D(uSideField, uv + texel).rgb;
    vec3 d = texture2D(uSideField, uv + vec2(0.0, texel.y)).rgb;
    return mix(mix(a, b, blend.x), mix(d, c, blend.x), blend.y);
  }
  vec3 stoneSides(vec3 position) {
    float radius = max(.001, ${masonrySize.halfWidth.toFixed(8)} * (position.y - ${masonrySize.tip.toFixed(8)} + ${(courseHeight / 2).toFixed(8)}) / ${(masonrySize.top - masonrySize.tip).toFixed(8)});
    float height = (position.y - ${sideBase.toFixed(8)}) / ${(sideTop - sideBase).toFixed(8)};
    vec3 shift = vec3(0.0);
    if (aStoneSides.x > .0001) shift.z += sideField(vec2(position.x / radius * .5 + .5, height)).r * aStoneSides.x;
    if (aStoneSides.y > .0001) shift.x += sideField(vec2(-position.z / radius * .5 + .5, height)).g * aStoneSides.y;
    if (aStoneSides.z > .0001) shift.z -= sideField(vec2(-position.x / radius * .5 + .5, height)).b * aStoneSides.z;
    return shift;
  }
`;

const deformation = `
  if (aStoneCrown > .001 || dot(aStoneSides, aStoneSides) > .00000001) {
    vec3 shift = stoneSides(instanceMatrix[3].xyz);
    if (aStoneCrown > .001) shift += stoneSurface(instanceMatrix[3].xz) * aStoneCrown;
    // Convert a pyramid-local rigid translation into the instance frame.
    transformed += vec3(dot(shift, instanceMatrix[0].xyz) / dot(instanceMatrix[0].xyz, instanceMatrix[0].xyz),
      dot(shift, instanceMatrix[1].xyz) / dot(instanceMatrix[1].xyz, instanceMatrix[1].xyz),
      dot(shift, instanceMatrix[2].xyz) / dot(instanceMatrix[2].xyz, instanceMatrix[2].xyz));
  }
`;

export function bindStoneMotion(shader, surface, sides) {
  Object.assign(shader.uniforms, surface.uniforms, sides.uniforms);
  shader.vertexShader = `${sampling}\n${shader.vertexShader}`
    .replace("#include <begin_vertex>", `#include <begin_vertex>\n${deformation}`);
}
