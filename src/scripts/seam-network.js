import * as Three from "three";
import { masonrySize, courseHeight, seededRandom } from "./masonry-layout.js";
import { sideBase, sideTop } from "./side-surface.js";

const axis = face => face === 1 ? 2 : 0;
const alongSign = face => face === 0 ? 1 : -1;
export const seamSamples = 8;
// A tiny lip-side offset improves grazing-angle visibility without turning the
// occupied corridors into permanent brick outlines or disabling depth testing.
export const seamLipOffset = .0025;

// Real, surviving casing joints, not a rectangular overlay or a Voronoi skin.
// Connectivity is fixed; each segment retains BOTH of its stone neighbours.
export default class SeamNetwork {
  constructor(masonry) {
    this.masonry = masonry;
    this.edges = [];
    // Face 3 is the horizontal crown, not the unused fourth casing side.
    this.faces = [[], [], [], []];
    this.stones = masonry.blocks.filter(block => block.sideWeights.some(weight => weight > .001)
      || block.course === masonrySize.courses - 1);
    this.stones.forEach((block, index) => { block.seamIndex = index; });
    for (const block of this.stones) {
      block.seamShift = new Three.Vector3();
      block.seamSin = Math.sin(block.rotation[1]);
      block.seamCos = Math.cos(block.rotation[1]);
    }
    for (let face = 0; face < 3; face++) this.buildFace(face);
    this.buildTop();
    this.shiftA = new Three.Vector3();
    this.shiftB = new Three.Vector3();
    this.pointA = new Three.Vector3();
    this.pointB = new Three.Vector3();
    this.crown = this.stones.filter(block => block.course === masonrySize.courses - 1);
    this.casing = this.stones.filter(block => block.course !== masonrySize.courses - 1);
    for (const node of this.faces[3]) {
      node.stones = [...new Set(node.edges.flatMap(edge => [edge.a, edge.b]))];
      node.point = new Three.Vector3();
    }
  }

  buildTop() {
    const rows = new Map(), nodes = this.faces[3];
    for (const block of this.stones) {
      if (block.course !== masonrySize.courses - 1) continue;
      const row = Number(block.id.split(":")[1]);
      if (!rows.has(row)) rows.set(row, []);
      const [x, , z] = block.position, [width, , depth] = block.dimensions;
      rows.get(row).push({ block, min: x - width / 2, max: x + width / 2,
        low: z - depth / 2, high: z + depth / 2 });
    }
    for (const row of rows.values()) row.sort((a, b) => a.min - b.min);
    const nodeAt = (x, z) => {
      let node = nodes.find(candidate => Math.abs(candidate.along - x) < .004 && Math.abs(candidate.y - z) < .004);
      if (!node) { node = { along: x, y: z, face: 3, edges: [] }; nodes.push(node); }
      return node;
    };
    const add = (a, b, x0, z0, x1, z1, horizontal, gap) => {
      const from = nodeAt(x0, z0), to = nodeAt(x1, z1);
      const length = Math.hypot(to.along - from.along, to.y - from.y);
      if (from === to || length < .005) return;
      const edge = { id: this.edges.length, face: 3, a, b, from, to, length, horizontal,
        width: Math.min(.018, Math.max(.006, gap + .007)), exposure: 0,
        sideA: horizontal ? 3 : 1, sideB: horizontal ? 2 : 0 };
      this.edges.push(edge); from.edges.push(edge); to.edges.push(edge);
    };
    for (const [index, row] of rows) {
      for (let i = 1; i < row.length; i++) {
        const left = row[i - 1], right = row[i], gap = right.min - left.max;
        if (gap < -.001 || gap > .006) continue;
        const x = (left.max + right.min) / 2;
        add(left.block, right.block, x, Math.max(left.low, right.low) - .00125,
          x, Math.min(left.high, right.high) + .00125, false, gap);
      }
      const above = rows.get(index + 1);
      if (!above) continue;
      for (const lower of row) for (const upper of above) {
        const gap = upper.low - lower.high;
        const start = Math.max(lower.min, upper.min) - .00125;
        const end = Math.min(lower.max, upper.max) + .00125;
        if (gap < -.001 || gap > .006 || end - start < .006) continue;
        const z = (lower.high + upper.low) / 2;
        add(lower.block, upper.block, start, z, end, z, true, gap);
      }
    }
  }

  buildFace(face) {
    const rows = new Map(), nodes = new Map();
    for (const block of this.stones) {
      if (block.sideWeights[face] <= .001) continue;
      const center = block.position[axis(face)] * alongSign(face);
      const half = block.dimensions[axis(face)] / 2;
      const cell = { block, min: center - half, max: center + half };
      if (!rows.has(block.course)) rows.set(block.course, []);
      rows.get(block.course).push(cell);
    }
    for (const row of rows.values()) row.sort((a, b) => a.min - b.min);
    const nodeAt = (along, y) => {
      const course = Math.round((y - masonrySize.tip) / courseHeight);
      if (!nodes.has(course)) nodes.set(course, []);
      const row = nodes.get(course);
      // Seeded placement jitter is < .0007; reconnect the original cell joints,
      // not holes or unrelated seams. A course joint remains a T-junction.
      let node = row.find(candidate => Math.abs(candidate.along - along) < .004);
      if (!node) {
        node = { along, y, face, edges: [] };
        row.push(node);
        this.faces[face].push(node);
      }
      return node;
    };
    const add = (a, b, x0, y0, x1, y1, horizontal, gap) => {
      const from = nodeAt(x0, y0), to = nodeAt(x1, y1);
      const length = Math.hypot(to.along - from.along, to.y - from.y);
      if (from === to || length < .005) return;
      const edge = { id: this.edges.length, face, a, b, from, to, length, horizontal,
        width: Math.min(.018, Math.max(.006, gap + .007)), exposure: 0,
        sideA: horizontal ? 3 : 1, sideB: horizontal ? 2 : 0 };
      this.edges.push(edge);
      from.edges.push(edge); to.edges.push(edge);
    };
    for (const [course, row] of rows) {
      const low = masonrySize.tip + course * courseHeight, high = low + courseHeight;
      for (let i = 1; i < row.length; i++) {
        const left = row[i - 1], right = row[i], gap = right.min - left.max;
        if (gap < -.001 || gap > .006) continue; // Missing bricks are NOT bridged.
        const along = (left.max + right.min) / 2;
        add(left.block, right.block, along, low, along, high, false, gap);
      }
      const above = rows.get(course + 1);
      if (!above) continue;
      for (const lower of row) for (const upper of above) {
        // Recover the original cell boundary before the authored joint inset.
        // Each overlap splits at the staggered joints above and below it.
        const start = Math.max(lower.min, upper.min) - .00125;
        const end = Math.min(lower.max, upper.max) + .00125;
        if (end - start < .006) continue;
        add(lower.block, upper.block, start, high, end, high, true, .0015);
      }
    }
  }

  closest(face, along, height) {
    const y = face === 3 ? height : sideBase + height * (sideTop - sideBase);
    const radius = masonrySize.halfWidth * (y - masonrySize.tip) / (masonrySize.top - masonrySize.tip);
    const x = face === 3 ? along : along * radius;
    let nearest, distance = Infinity;
    for (const node of this.faces[face]) {
      if (!node.edges.length) continue;
      const d = Math.hypot(node.along - x, (node.y - y) * (face === 3 ? 1 : 1.4));
      if (d < distance) { distance = d; nearest = node; }
    }
    return nearest;
  }

  route(start, profile, random, duration, avoid = null) {
    const steps = [];
    let node = start, previous = avoid, elapsed = 0;
    if (!node) return { steps, duration: 0 };
    const centerY = node.y;
    for (let i = 0; i < 384 && elapsed < duration; i++) {
      let chosen, best = -Infinity;
      for (const edge of node.edges) {
        const next = edge.from === node ? edge.to : edge.from;
        // Deterministic exploration: prefer new corridors, occasionally reverse
        // at dead ends, stay near the voice/register, and never cut across stone.
        const band = Math.abs(next.y - centerY) / profile.band;
        const score = random() * 1.5 - band * .8 + (edge.horizontal ? profile.horizontal : 0)
          - (edge === previous ? 2.4 : 0);
        if (score > best) { best = score; chosen = edge; }
      }
      if (!chosen) break;
      const forward = chosen.from === node;
      const end = elapsed + chosen.length / profile.speed;
      const step = { edge: chosen, forward, start: elapsed, end, next: end + profile.pause };
      steps.push(step);
      elapsed = step.next;
      node = forward ? chosen.to : chosen.from;
      previous = chosen;
    }
    return { steps, duration: elapsed };
  }

  prepare(note, face, profile) {
    const height = face === 0 ? .86 - note.track * .132 : face === 1 ? .20 + note.register * .62
      : .18 + Math.max(0, Math.min(1, (note.pitch - 31) / 12)) * .62;
    const along = face === 2 ? (note.pitch % 3 - 1) * .18 : note.x / masonrySize.halfWidth;
    const seed = Math.round(note.time * 48000) ^ (note.pitch * 7919) ^ (note.track * 104729) ^ (face * 3571);
    const random = seededRandom(seed);
    const start = face === 3 ? this.closest(face, note.x, note.z) : this.closest(face, along, height);
    const duration = Math.max(note.duration + note.release, profile.echo || 0);
    const route = this.route(start, profile, random, duration + profile.tail);
    let branch = null;
    if (route.steps.length > 4 && random() < .55) {
      const fork = route.steps[Math.min(route.steps.length - 2, 2 + Math.floor(random() * 5))];
      const node = fork.forward ? fork.edge.to : fork.edge.from;
      if (node.edges.length > 2) branch = { start: fork.next,
        route: this.route(node, profile, random, Math.min(1.8, duration), fork.edge) };
    }
    return { route, branch, profile, face };
  }

  frontAt(block, face, along, shift) {
    // Resolve the actual slightly rotated exterior plane, not an ideal pyramid.
    const sin = block.seamSin, cos = block.seamCos;
    const x = block.position[0] + shift.x, z = block.position[2] + shift.z;
    if (face === 1) {
      const localZ = (-along - z + sin * block.dimensions[0] / 2) / cos;
      return x + cos * block.dimensions[0] / 2 + sin * localZ;
    }
    const sign = face === 0 ? 1 : -1;
    const localX = (sign * along - x - sin * sign * block.dimensions[2] / 2) / cos;
    return sign * (z - sin * localX + cos * sign * block.dimensions[2] / 2);
  }

  setPoint(target, face, along, y, front) {
    if (face === 0) target.set(along, y, front);
    else if (face === 1) target.set(front, y, -along);
    else target.set(-along, y, -front);
  }

  preparePose() {
    // Each stone serves several graph edges. Sample its shared field once.
    for (const block of this.casing) this.masonry.sides.sample(block, block.seamShift);
    for (const block of this.crown) this.masonry.surface.sample(block.restPosition, block.seamShift);
    for (const node of this.faces[3]) {
      let x = 0, z = 0, y = -Infinity;
      for (const block of node.stones) {
        x += block.seamShift.x; z += block.seamShift.z;
        y = Math.max(y, block.position[1] + block.dimensions[1] / 2 + block.seamShift.y);
      }
      node.point.set(node.along + x / node.stones.length, y + seamLipOffset, node.y + z / node.stones.length);
    }
  }

  pose(edge) {
    if (edge.face === 3) {
      // The crown is translated rigidly by the same bilinear field as its GPU
      // stones. Uneven authored heights and live lifts decide the outer lip.
      this.shiftA.copy(edge.a.seamShift);
      this.shiftB.copy(edge.b.seamShift);
      const y = Math.max(edge.a.position[1] + edge.a.dimensions[1] / 2 + this.shiftA.y,
        edge.b.position[1] + edge.b.dimensions[1] / 2 + this.shiftB.y) + seamLipOffset;
      this.pointA.copy(edge.from.point); this.pointA.y = y;
      this.pointB.copy(edge.to.point); this.pointB.y = y;
      edge.exposure = .38 + .62 * (1 - Math.exp(-this.shiftA.distanceTo(this.shiftB) * 12));
      return;
    }
    this.shiftA.copy(edge.a.seamShift);
    this.shiftB.copy(edge.b.seamShift);
    const alongShift = (this.shiftA.getComponent(axis(edge.face)) + this.shiftB.getComponent(axis(edge.face))) * alongSign(edge.face) / 2;
    const a = edge.from.along + alongShift, b = edge.to.along + alongShift;
    const frontA = Math.max(this.frontAt(edge.a, edge.face, a, this.shiftA), this.frontAt(edge.b, edge.face, a, this.shiftB));
    const frontB = Math.max(this.frontAt(edge.a, edge.face, b, this.shiftA), this.frontAt(edge.b, edge.face, b, this.shiftB));
    // Just outside the lip for oblique views, still registered to real joints.
    // Solid stones continue to occlude the route through ordinary depth tests.
    this.setPoint(this.pointA, edge.face, a, edge.from.y, frontA + seamLipOffset);
    this.setPoint(this.pointB, edge.face, b, edge.to.y, frontB + seamLipOffset);
    const pressure = this.shiftA.length() + this.shiftB.length();
    const differential = this.shiftA.distanceTo(this.shiftB);
    edge.exposure = .24 + .76 * (1 - Math.exp(-pressure * 10 - differential * 18));
  }
}
