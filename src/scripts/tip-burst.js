import * as Three from "three";
import { masonrySize, tipOpening } from "./masonry-layout.js";
import { bassRegions, bassRegionWeight } from "./bass-resonance.js";

const tau = Math.PI * 2;
const samples = 256;
const euler = new Three.Euler(0, 0, 0, "YXZ");
const orbit = new Three.Quaternion();
const up = new Three.Vector3(0, 1, 0);

export function ease(start, end, value) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function tipState(progress) {
  const opening = ease(1.15, 1.98, progress) * (1 - ease(2.15, 2.78, progress));
  const emission = ease(1.65, 1.98, progress) * (1 - ease(2.08, 2.43, progress));
  return { opening, emission, reveal: ease(1.67, 1.98, progress) };
}

export function prepareTip(blocks) {
  const courses = new Map();
  blocks.forEach(block => {
    const height = block.restPosition.y;
    const detached = block.course < tipOpening.detachedCourses;
    // A broader falloff opens the lower courses too, rather than concentrating
    // almost all of the extra space in the detached tip. Still zero at middle.
    const influence = Math.pow(1 - ease(tipOpening.mouthY, tipOpening.middleY, height), 1.25);
    if (influence === 0) return;
    const angle = Math.atan2(block.restPosition.z, block.restPosition.x);
    block.burst = { detached, influence, angle, phase: block.seed * 29,
      position: block.restPosition.clone(), quaternion: block.restQuaternion.clone(),
      correction: new Float32Array((samples + 1) * 2),
    };
    block.currentPosition = block.restPosition.clone();
    block.currentQuaternion = block.restQuaternion.clone();
    if (!courses.has(block.course)) courses.set(block.course, []);
    courses.get(block.course).push(block);
    if (!detached) {
      const separation = .18 * influence;
      block.burst.position.x += Math.cos(angle) * separation;
      block.burst.position.z += Math.sin(angle) * separation;
      block.burst.position.y -= .022 * influence;
      block.burst.quaternion.setFromEuler(euler.set(0, block.rotation[1] + (block.seed - .5) * .006 * influence, 0, "YXZ"));
    }
  });
  courses.forEach((stones, course) => {
    if (!stones[0].burst.detached) return;
    stones.sort((a, b) => a.burst.angle - b.burst.angle);
    const length = stones.reduce((sum, block) => sum + block.scale.z + .037, 0);
    const radius = Math.max(course === 0 ? .44 : .48 + course * .012, length / (tau * .82) + .108);
    let along = 0;
    stones.forEach(block => {
      const angle = along / length * tau + course * .53 + .31;
      const r = radius + (block.seed - .5) * .22;
      block.burst.position.set(Math.cos(angle) * r,
        (course === 0 ? -.25 : -.065 + (course - 2) * .13) + (block.seed - .5) * .07,
        Math.sin(angle) * r);
      block.burst.quaternion.setFromEuler(euler.set((block.seed - .5) * (course === 0 ? .6 : .28), -angle + (block.seed - .5) * .45,
        (block.seed - .5) * (course === 0 ? .6 : .28), "YXZ"));
      along += block.scale.z + .037;
    });
  });
  const moving = blocks.filter(block => block.burst);
  packPaths(courses);
  prepareBassRegions(moving);
  return moving;
}

// Prepare five safe displacements over only the already-open end of the path.
// The small free cloud has cross-course contacts, unlike the seated horizontal
// courses. Keep each pair on its ORIGINAL separating axis so normalized blends
// of notes remain safe too. No runtime collision simulation or note randomizer.
function prepareBassRegions(moving) {
  const detached = moving.filter(block => block.burst.detached);
  const matrix = new Three.Matrix4(), position = new Three.Vector3(), quaternion = new Three.Quaternion();
  const courseRegions = new Map();
  moving.forEach(block => {
    if (block.burst.detached) {
      block.burst.regions = bassRegions.map(region => bassRegionWeight(block.burst.position.y, region));
      block.burst.regionOffsets = new Float32Array((samples + 1) * bassRegions.length * 2);
    } else {
      if (!courseRegions.has(block.course)) courseRegions.set(block.course, {
        weights: bassRegions.map(region => bassRegionWeight(block.burst.position.y, region)),
        radius: masonrySize.halfWidth * (block.course + 1) / masonrySize.courses + .18 * block.burst.influence,
      });
      const course = courseRegions.get(block.course);
      block.burst.regions = course.weights;
      block.burst.regionRadius = course.radius;
    }
  });
  for (let step = Math.floor(.86 * samples); step <= samples; step++) {
    const opening = step / samples, gate = ease(.86, 1, opening);
    const poses = detached.map(block => {
      rawPose(block, opening, position, quaternion);
      position.x += block.burst.correction[step * 2];
      position.z += block.burst.correction[step * 2 + 1];
      matrix.makeRotationFromQuaternion(quaternion);
      const m = matrix.elements, yaw = Math.atan2(m[8], m[10]), c = Math.cos(yaw), s = Math.sin(yaw);
      return { block, x: position.x, y: position.y, z: position.z, ux: c, uz: -s, vx: s, vz: c,
        hx: (Math.abs(c * m[0] - s * m[2]) * block.scale.x + Math.abs(c * m[4] - s * m[6]) * block.scale.y + Math.abs(c * m[8] - s * m[10]) * block.scale.z) / 2,
        hz: (Math.abs(s * m[0] + c * m[2]) * block.scale.x + Math.abs(s * m[4] + c * m[6]) * block.scale.y + Math.abs(s * m[8] + c * m[10]) * block.scale.z) / 2,
        hy: (Math.abs(m[1]) * block.scale.x + Math.abs(m[5]) * block.scale.y + Math.abs(m[9]) * block.scale.z) / 2,
      };
    });
    const contacts = [];
    for (let i = 0; i < poses.length; i++) for (let j = i + 1; j < poses.length; j++) {
      const a = poses[i], b = poses[j];
      if (Math.abs(a.y - b.y) > a.hy + b.hy + .012) continue;
      let best;
      for (const [x, z] of [[a.ux, a.uz], [a.vx, a.vz], [b.ux, b.uz], [b.vx, b.vz]]) {
        const extent = a.hx * Math.abs(x * a.ux + z * a.uz) + a.hz * Math.abs(x * a.vx + z * a.vz)
          + b.hx * Math.abs(x * b.ux + z * b.uz) + b.hz * Math.abs(x * b.vx + z * b.vz);
        const signed = (b.x - a.x) * x + (b.z - a.z) * z, gap = Math.abs(signed) - extent;
        if (!best || gap > best.gap) best = { i, j, x: x * (signed < 0 ? -1 : 1), z: z * (signed < 0 ? -1 : 1), gap, extent };
      }
      // Retain the prepared clearance, with headroom for the existing tiny
      // ambient rocking. Never pull a baseline-separated pair together.
      best.minimum = best.extent + Math.min(.012, Math.max(0, best.gap));
      contacts.push(best);
    }
    bassRegions.forEach((region, mode) => {
      const targets = poses.map(pose => {
        const radius = Math.max(.001, Math.hypot(pose.x, pose.z));
        const travel = region.travel * pose.block.burst.regions[mode] * gate;
        return { x: pose.x * (1 + travel / radius), z: pose.z * (1 + travel / radius) };
      });
      for (let iteration = 0; iteration < 32; iteration++) {
        let changed = false;
        contacts.forEach(({ i, j, x, z, minimum }) => {
          const a = targets[i], b = targets[j], shortage = minimum - ((b.x - a.x) * x + (b.z - a.z) * z);
          if (shortage <= .000001) return;
          const shift = (shortage + .000002) / 2;
          a.x -= x * shift; a.z -= z * shift;
          b.x += x * shift; b.z += z * shift;
          changed = true;
        });
        poses.forEach((pose, i) => {
          const target = targets[i], radius = Math.max(.001, Math.hypot(pose.x, pose.z));
          const x = pose.x / radius, z = pose.z / radius, shortage = radius - (target.x * x + target.z * z);
          if (shortage <= .000001) return;
          target.x += x * (shortage + .000002); target.z += z * (shortage + .000002);
          changed = true;
        });
        if (!changed) break;
      }
      poses.forEach((pose, i) => {
        const at = (step * bassRegions.length + mode) * 2;
        pose.block.burst.regionOffsets[at] = targets[i].x - pose.x;
        pose.block.burst.regionOffsets[at + 1] = targets[i].z - pose.z;
      });
    });
  }
}

function rawPose(block, opening, position, quaternion) {
  // Ease the stone pose itself as well as the shared scroll envelope. This
  // leaves time for fine joints to open before fragments change orientation.
  const travel = ease(block.burst.detached ? .10 : 0, 1, opening);
  position.copy(block.restPosition).lerp(block.burst.position, travel);
  quaternion.copy(block.restQuaternion).slerp(block.burst.quaternion, travel);
  if (block.burst.detached) {
    // First release fine joints without changing grid ordering. This keeps
    // sampled contact corrections continuous before rotation can begin.
    const release = 1 + .22 * ease(0, .12, opening) * (1 - travel);
    position.x *= release;
    position.z *= release;
  }
}

// One-time geometric clearance, never frame-integrated physics. The original
// course ordering remains; no distant rings or structural helix is generated.
function packPaths(courses) {
  const p = new Three.Vector3(), q = new Three.Quaternion(), matrix = new Three.Matrix4();
  const groups = [...courses.values()].filter(stones => !stones[0].burst.detached);
  groups.push([...courses.values()].flat().filter(block => block.burst.detached));
  for (let step = 1; step <= samples; step++) {
    const opening = step / samples;
    groups.forEach(stones => {
      const detached = stones[0].burst.detached;
      const poses = stones.map(block => {
        rawPose(block, opening, p, q);
        matrix.makeRotationFromQuaternion(q);
        const m = matrix.elements;
        // A conservative XZ rectangle encloses the little pitch/roll angles.
        const yaw = Math.atan2(m[8], m[10]), c = Math.cos(yaw), s = Math.sin(yaw);
        const hx = (Math.abs(c * m[0] - s * m[2]) * block.scale.x + Math.abs(c * m[4] - s * m[6]) * block.scale.y + Math.abs(c * m[8] - s * m[10]) * block.scale.z) / 2 + .002 * opening;
        const hz = (Math.abs(s * m[0] + c * m[2]) * block.scale.x + Math.abs(s * m[4] + c * m[6]) * block.scale.y + Math.abs(s * m[8] + c * m[10]) * block.scale.z) / 2 + .002 * opening;
        return { block, y: p.y,
          hy: (Math.abs(m[1]) * block.scale.x + Math.abs(m[5]) * block.scale.y + Math.abs(m[9]) * block.scale.z) / 2,
          x: p.x + block.burst.correction[(step - 1) * 2] * .94,
          z: p.z + block.burst.correction[(step - 1) * 2 + 1] * .94, restX: p.x, restZ: p.z,
          ux: c, uz: -s, vx: s, vz: c, hx, hz,
          bound: Math.hypot(hx, hz),
        };
      });
      const margin = (detached ? .025 : .002) * ease(.10, .25, opening);
      for (let iteration = 0; iteration < 100; iteration++) {
        let changed = false;
        for (let i = 0; i < poses.length; i++) for (let j = i + 1; j < poses.length; j++) {
          const a = poses[i], b = poses[j], dx = b.x - a.x, dz = b.z - a.z;
          if (Math.abs(a.y - b.y) > a.hy + b.hy + margin) continue;
          if (Math.hypot(dx, dz) > a.bound + b.bound + margin) continue;
          let overlap = Infinity, nx = 0, nz = 0;
          for (const [x, z] of [[a.ux, a.uz], [a.vx, a.vz], [b.ux, b.uz], [b.vx, b.vz]]) {
            const extentA = a.hx * Math.abs(x * a.ux + z * a.uz) + a.hz * Math.abs(x * a.vx + z * a.vz);
            const extentB = b.hx * Math.abs(x * b.ux + z * b.uz) + b.hz * Math.abs(x * b.vx + z * b.vz);
            const signed = dx * x + dz * z;
            const depth = extentA + extentB + margin - Math.abs(signed);
            if (depth < overlap) { overlap = depth; nx = x * (signed < 0 ? -1 : 1); nz = z * (signed < 0 ? -1 : 1); }
          }
          if (overlap <= .00001) continue;
          const shift = (overlap + .00002) / 2;
          a.x -= nx * shift; a.z -= nz * shift;
          b.x += nx * shift; b.z += nz * shift;
          changed = true;
        }
        // Only the detached tip needs an open axis. The higher stone courses
        // retain their real recessed chamber instead of being spread outward.
        if (detached) poses.forEach(pose => {
          const radius = Math.hypot(pose.x, pose.z), minimum = (.15 + pose.bound) * ease(.12, .82, opening);
          if (radius >= minimum) return;
          const angle = radius > .00001 ? Math.atan2(pose.z, pose.x) : pose.block.burst.angle;
          pose.x = Math.cos(angle) * minimum; pose.z = Math.sin(angle) * minimum;
          changed = true;
        });
        if (!changed) break;
      }
      poses.forEach(pose => {
        pose.block.burst.correction[step * 2] = pose.x - pose.restX;
        pose.block.burst.correction[step * 2 + 1] = pose.z - pose.restZ;
      });
    });
  }
}

export function tipPose(block, opening, time, ambient, position, quaternion, pulsePressure = 0, pulseModes = null) {
  if (opening === 0) {
    position.copy(block.restPosition); quaternion.copy(block.restQuaternion);
    return;
  }
  rawPose(block, opening, position, quaternion);
  const sample = opening * samples, index = Math.min(samples - 1, Math.floor(sample)), mix = sample - index;
  const corrections = block.burst.correction;
  position.x += Three.MathUtils.lerp(corrections[index * 2], corrections[(index + 1) * 2], mix);
  position.z += Three.MathUtils.lerp(corrections[index * 2 + 1], corrections[(index + 1) * 2 + 1], mix);
  if (!ambient) return;
  if (pulseModes) {
    const offsets = block.burst.regionOffsets;
    const baseX = position.x, baseZ = position.z;
    for (let mode = 0; mode < pulseModes.length; mode++) {
      const strength = pulseModes[mode];
      if (strength < .000001) continue;
      if (offsets) {
        const at = (index * bassRegions.length + mode) * 2, next = at + bassRegions.length * 2;
        position.x += Three.MathUtils.lerp(offsets[at], offsets[next], mix) * strength;
        position.z += Three.MathUtils.lerp(offsets[at + 1], offsets[next + 1], mix) * strength;
      } else {
        // All stones within a loosened course share one positive dilation.
        // No vertical shift or extra rotation can close its fine horizontal seam.
        const travel = bassRegions[mode].travel * block.burst.regions[mode] * strength * ease(.86, 1, opening);
        position.x += baseX * travel / block.burst.regionRadius;
        position.z += baseZ * travel / block.burst.regionRadius;
      }
    }
  }
  if (!block.burst.detached) return;
  // A small shared kick breath supports the collision-prepared spatial basis.
  // Outward dilation only; the packed reassembly path is untouched.
  const pressure = pulsePressure * ease(.86, 1, opening);
  position.x *= 1 + pressure * .012;
  position.z *= 1 + pressure * .012;
  const amount = ease(.78, 1, opening);
  // Shared short orbital arcs preserve the irregular cloud's clearances.
  // Tiny independently phased variations and rocking keep it from moving
  // like a rigid object; none of the seated masonry follows this circulation.
  const angle = (Math.sin(time * .07) * .60 + Math.sin(time * .12 + block.burst.phase) * .008) * amount;
  const c = Math.cos(angle), s = Math.sin(angle), x = position.x, z = position.z;
  position.x = x * c - z * s;
  position.z = x * s + z * c;
  position.y += Math.sin(time * .21 + block.burst.phase) * .0015 * amount;
  orbit.setFromAxisAngle(up, -angle);
  quaternion.premultiply(orbit);
  orbit.setFromEuler(euler.set(Math.sin(time * .13 + block.burst.phase) * .008 * amount,
    Math.sin(time * .17 + block.burst.phase) * .02 * amount,
    Math.cos(time * .15 + block.burst.phase) * .008 * amount, "YXZ"));
  quaternion.multiply(orbit);
}
