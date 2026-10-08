import * as Three from "three";
import { seededRandom } from "./masonry-layout.js";

export const pondDropCapacity = 4;
export const pondDropDuration = 7.2;

export function pondDropUniforms() {
  return {
    uDrops: { value: Array.from({ length: pondDropCapacity }, () => new Three.Vector4(0, 0, -1, 0)) },
    uDropCount: { value: 0 },
    uDropDuration: { value: pondDropDuration },
  };
}

function scatterImpact(random, impacts, x, z) {
  let best, bestDistance = -1;
  // Up to eight cheap candidates, only when scheduling an impact. Prefer a
  // different patch of water from its burst neighbours, without a fixed ring,
  // per-frame collision checks, an unbounded retry loop or running physics.
  for (let attempt = 0; attempt < 8; attempt++) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * .90;
    const candidate = { x: x + Math.cos(angle) * radius, z: z + Math.sin(angle) * radius };
    let distance = Infinity;
    impacts.forEach(impact => {
      const dx = candidate.x - impact.x, dz = candidate.z - impact.z;
      distance = Math.min(distance, dx * dx + dz * dz);
    });
    if (distance > bestDistance) { best = candidate; bestDistance = distance; }
    if (distance >= .60 * .60) break;
  }
  // If the candidate budget is exhausted, retain the most separated random
  // location rather than snapping to a grid or spending more CPU time.
  return best;
}

// Randomly scheduled bursts, independent of section changes. The visible-time
// clock schedules and ages analytic waves; there is no running simulation.
export default class PondDrops {
  constructor(uniforms, seed = Math.floor(Math.random() * 4294967296)) {
    this.uniforms = uniforms;
    this.seed = seed;
    this.reset();
  }

  reset() {
    this.random = seededRandom(this.seed);
    this.events = [];
    this.nextImpact = 1.4 + this.random() * 4.6;
    this.time = 0;
    this.previousTime = null;
  }

  pause() { this.previousTime = null; }

  burst(now, center) {
    let birth = now;
    const selection = this.random();
    const count = selection < .10 ? 1 : selection < .35 ? 2 : selection < .75 ? 3 : 4;
    const x = center.x + (this.random() - .5) * .40;
    const z = center.z + (this.random() - .5) * .40;
    const impacts = [];
    for (let i = 0; i < count; i++) {
      const position = scatterImpact(this.random, impacts, x, z);
      impacts.push(position);
      const drop = { birth, ...position, strength: .75 + this.random() * .30 };
      if (this.time < birth + pondDropDuration) this.events.push(drop);
      if (i < count - 1) birth += .18 + this.random() * .28;
    }
    // Genuine quiet intervals after the last ripple fades, with an irregular
    // bounded exponential wait instead of a near-metronomic repeat interval.
    const quiet = Math.min(7.5, .8 - Math.log(Math.max(.0001, 1 - this.random())) * 2.2);
    this.nextImpact = birth + pondDropDuration + quiet;
  }

  update(timestamp, center, enabled) {
    this.uniforms.uDropCount.value = 0;
    this.uniforms.uDrops.value.forEach(drop => drop.set(0, 0, -1, 0));
    // Switching motion off leaves the original reflection completely still;
    // keep the clock so resuming cannot restart or catch up in a burst.
    if (!enabled) { this.pause(); return; }
    const stamp = Number.isFinite(timestamp) ? timestamp : this.previousTime ?? 0;
    if (this.previousTime !== null) this.time += Math.max(0, stamp - this.previousTime);
    this.previousTime = stamp;
    const now = this.time;
    // Keep the bounded queue in place instead of allocating it every frame.
    let retained = 0;
    for (const drop of this.events) if (now < drop.birth + pondDropDuration) this.events[retained++] = drop;
    this.events.length = retained;
    while (this.nextImpact <= now) this.burst(this.nextImpact, center);
    let count = 0;
    this.events.forEach(drop => {
      const age = now - drop.birth;
      if (age < 0 || age >= pondDropDuration || count >= pondDropCapacity) return;
      this.uniforms.uDrops.value[count++].set(drop.x, drop.z, age, drop.strength);
    });
    this.uniforms.uDropCount.value = count;
  }
}
