import { ease } from "./tip-burst.js";

export const wellDepth = 1.72;
export const wellInner = .32;
export const wellOuter = 1.50;
export const wellSeatClearance = .075;
export const wellStepClearance = .70;
export const wellRefinementRadius = 1.03;
export const wellCoreRadius = .43;
export const wellCoreHeight = 2.48;
// The tiniest central cells are unnecessary even while the well descends.
// Leave a margin inside the quiet horizon for the cutout's brick-sized edge.
export const wellBrickCutout = wellCoreRadius - .06;
export function wellRefines(block) {
  return block.motionWeight > .5 && Math.hypot(block.position[0], block.position[2]) < wellRefinementRadius;
}

// Scroll-authored, reversible gravity well. The square rim stays seated; each
// crown stone translates as ONE rigid object, never bends into a smooth skin.
export function wellReveal(progress) { return ease(2.52, 3, progress); }
export function wellWeight(x, z) { return 1 - ease(wellInner, wellOuter, Math.hypot(x, z)); }
export function wellClearanceFloor(x, z, reveal, weight = wellWeight(x, z)) {
  return 3.55 - wellSeatClearance - (wellDepth * weight + wellStepClearance) * reveal;
}

// The buried supporting courses need a matching clearance volume, otherwise a
// depressed crown merely falls through another opaque lid. Cut only below the
// crown, identically in color/depth/reflection. Selected crown parents switch
// to smaller real brick replacements only while the well is open.
export function bindWellClearance(shader, surface) {
  Object.assign(shader.uniforms, surface.uniforms);
  shader.vertexShader = `attribute float aWellRefined; varying float vWellRefined;
    varying vec3 vWellPosition; varying float vWellCrown;\n${shader.vertexShader}`
    .replace("#include <project_vertex>", `
      vWellPosition = (instanceMatrix * vec4(transformed, 1.0)).xyz;
      vWellCrown = aStoneCrown;
      vWellRefined = aWellRefined;
      #include <project_vertex>`);
  shader.fragmentShader = `uniform float uWellReveal;
    varying vec3 vWellPosition; varying float vWellCrown; varying float vWellRefined;
    ${shader.fragmentShader}`.replace("#include <clipping_planes_fragment>", `
      #include <clipping_planes_fragment>
      if (vWellRefined > .5 && uWellReveal > .0001) discard;
      if (vWellCrown < .5 && uWellReveal > .00001) {
        float r = length(vWellPosition.xz);
        // Match the CPU quintic well, with room for the rigid stepped stones.
        float t = clamp((r - ${wellInner}) / ${(wellOuter - wellInner).toFixed(8)}, 0.0, 1.0);
        float weight = 1.0 - t*t*t*(t*(t*6.0-15.0)+10.0);
        // Reserve the tile thickness plus the worst rigid-step corner offset.
        // Otherwise tall buried corners can intersect a lowered paving stone.
        float floorY = 3.55 - ${wellSeatClearance} - (${wellDepth} * weight + ${wellStepClearance}) * uWellReveal;
        if (r < ${wellOuter} && vWellPosition.y > floorY && vWellPosition.y < 3.55) discard;
      }
    `);
}
