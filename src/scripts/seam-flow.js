import * as Three from "three";
import SeamNetwork, { seamSamples } from "./seam-network.js";
import { chapterWeights } from "./choreography.js";
import SeamVertex from "./shaders/seam.vert.glsl";
import SeamFragment from "./shaders/seam.frag.glsl";

// Finale travelers are disabled; never prepare unreachable long-lead routes.
const names = ["pads", "sequence", "bass"];
const profiles = [
  { speed: .23, tail: 2.1, head: .19, pause: .075, band: .22, horizontal: .25 },
  { speed: 1.15, tail: .28, head: .045, pause: .022, band: .52, horizontal: .05, echo: 1.6 },
  { speed: .64, tail: .80, head: .13, pause: .05, band: .36, horizontal: .65 },
];

function texture(data, width, height) {
  const map = new Three.DataTexture(data, width, height, Three.RGBAFormat, Three.FloatType);
  map.minFilter = map.magFilter = Three.NearestFilter;
  map.generateMipmaps = false;
  map.needsUpdate = true;
  return map;
}

// Bounded, analytic note journeys. There is no simulation backlog, source
// restart, per-frame RNG or per-frame geometry allocation. Six pad voices share
// the same physical labyrinth without losing their distinct route identities.
export default class SeamFlow {
  constructor(masonry, app) {
    this.app = app;
    this.network = new SeamNetwork(masonry);
    this.fallback = this.network.edges.map(edge => edge.face === 2 && edge.horizontal
      ? Math.exp(-Math.pow((edge.from.y - 2.6) / .15, 2) - Math.pow((edge.from.along + edge.to.along) / .9, 2)) : 0);
    this.routes = new Map();
    this.crownRoutes = new Map();
    this.weights = {};
    this.active = false;
    const count = this.network.edges.length;
    this.data = new Float32Array(Math.max(1, count) * seamSamples * 4);
    this.stoneData = new Float32Array(Math.max(1, this.network.stones.length) * 16);
    this.uniforms = {
      uSeamFlow: { value: texture(this.data, seamSamples, Math.max(1, count)) },
      uSeamRows: { value: Math.max(1, count) },
      uSeamStones: { value: texture(this.stoneData, 4, Math.max(1, this.network.stones.length)) },
      uSeamStoneRows: { value: Math.max(1, this.network.stones.length) },
      uSeamActive: { value: 0 },
    };
    let vertices = 0;
    for (const edge of this.network.edges) {
      edge.vertexOffset = vertices;
      edge.spans = edge.face === 3 ? 3 : 1;
      // Crossed light skins give each occupied joint a tiny 3D profile. The
      // outward skin remains visible when the paving itself is nearly edge-on.
      edge.quads = edge.spans * 2;
      vertices += edge.quads * 4;
    }
    const positions = new Float32Array(vertices * 3), along = [], across = [], ids = [], indices = [], normals = [], fins = [];
    this.exposure = new Float32Array(vertices);
    for (let i = 0; i < count; i++) {
      const edge = this.network.edges[i];
      // Top corridors fold down the vertical joints of stepped bricks. Shared
      // corner anchors join each legal route, rather than teleporting at lips.
      const stops = edge.face === 3 ? [0, .12, .88, 1] : [0, 1];
      const normal = edge.face === 3 ? [0, 1, 0] : edge.face === 0 ? [0, 0, 1]
        : edge.face === 1 ? [1, 0, 0] : [0, 0, -1];
      for (let span = 0; span < edge.spans; span++) for (let fin = 0; fin < 2; fin++) {
        along.push(stops[span], stops[span], stops[span + 1], stops[span + 1]);
        across.push(-1, 1, -1, 1); ids.push(i, i, i, i);
        for (let vertex = 0; vertex < 4; vertex++) { normals.push(...normal); fins.push(fin); }
        const at = edge.vertexOffset + (span * 2 + fin) * 4;
        indices.push(at, at + 2, at + 1, at + 1, at + 2, at + 3);
      }
    }
    this.geometry = new Three.BufferGeometry();
    this.geometry.setAttribute("position", new Three.BufferAttribute(positions, 3).setUsage(Three.DynamicDrawUsage));
    this.geometry.setAttribute("aAlong", new Three.Float32BufferAttribute(along, 1));
    this.geometry.setAttribute("aAcross", new Three.Float32BufferAttribute(across, 1));
    this.geometry.setAttribute("aSeam", new Three.Float32BufferAttribute(ids, 1));
    this.geometry.setAttribute("aFaceNormal", new Three.Float32BufferAttribute(normals, 3));
    this.geometry.setAttribute("aGlowFin", new Three.Float32BufferAttribute(fins, 1));
    this.geometry.setAttribute("aExposure", new Three.BufferAttribute(this.exposure, 1).setUsage(Three.DynamicDrawUsage));
    this.geometry.setIndex(indices);
    this.mesh = new Three.Mesh(this.geometry, new Three.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: SeamVertex, fragmentShader: SeamFragment,
      transparent: true, blending: Three.AdditiveBlending, premultipliedAlpha: true,
      depthTest: true, depthWrite: false, side: Three.DoubleSide,
    }));
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    // One extra attribute, shared by both masonry geometry tiers. It indexes
    // four local edge-spill values per owned face, NOT an all-over green tint.
    for (let variant = 0; variant < masonry.batches.length; variant++) {
      const batch = masonry.batches[variant];
      const ids = new Float32Array(batch.count).fill(-1);
      for (const block of this.network.stones) if (block.batch === batch) ids[block.slot] = block.seamIndex;
      const attribute = new Three.InstancedBufferAttribute(ids, 1);
      masonry.highGeometry[variant].setAttribute("aSeamStone", attribute);
      masonry.lowGeometry[variant].setAttribute("aSeamStone", attribute);
    }
    this.updatePose();
  }

  prepare(channels) {
    this.routes.clear();
    this.crownRoutes.clear();
    for (let face = 0; face < names.length; face++) {
      const notes = channels.find(channel => channel.name === names[face])?.score.notes || [];
      for (const note of notes) {
        const journey = this.network.prepare(note, face, profiles[face]);
        this.routes.set(note, journey);
        if (face < 2) this.crownRoutes.set(note, this.network.prepare(note, 3, profiles[face]));
      }
    }
  }

  deposit(route, profile, age, strength, detail) {
    if (age < 0) return;
    const tail = profile.tail * detail;
    for (const step of route.steps) {
      if (age < step.start - profile.head * 2 || age > step.next + tail * 4) continue;
      const edge = step.edge;
      for (let sample = 0; sample < seamSamples; sample++) {
        const t = sample / (seamSamples - 1);
        const travel = (step.forward ? t : 1 - t) * edge.length;
        const passed = step.start + travel / profile.speed;
        const since = age - passed;
        let head = Math.exp(-Math.pow(since / profile.head, 2));
        if (age >= step.end && age < step.next) {
          const end = step.forward ? 1 : 0;
          head = Math.max(head, Math.exp(-Math.pow((t - end) * edge.length / (profile.head * profile.speed), 2)));
        }
        const wake = since >= 0 ? Math.exp(-since / tail) * (1 - Three.MathUtils.smoothstep(since, tail * 2, tail * 4)) : 0;
        const at = (edge.id * seamSamples + sample) * 4;
        this.data[at] += head * strength;
        this.data[at + 1] += wake * strength * .55;
      }
    }
  }

  updatePose() {
    const positions = this.geometry.attributes.position.array;
    this.network.preparePose();
    for (const edge of this.network.edges) {
      this.network.pose(edge);
      const a = this.network.pointA, b = this.network.pointB;
      const half = edge.width / 2;
      for (let span = 0; span < edge.spans; span++) for (let fin = 0; fin < 2; fin++) for (let vertex = 0; vertex < 4; vertex++) {
        const end = vertex < 2 ? span : span + 1;
        const point = edge.face === 3 ? end === 0 ? edge.from.point : end === 1 ? a : end === 2 ? b : edge.to.point
          : vertex < 2 ? a : b;
        const sign = vertex % 2 ? 1 : -1;
        const index = edge.vertexOffset + (span * 2 + fin) * 4 + vertex;
        const at = index * 3;
        positions[at] = point.x; positions[at + 1] = point.y; positions[at + 2] = point.z;
        if (fin) {
          const height = (vertex % 2) * (edge.face === 3 ? .018 : .014);
          if (edge.face === 3) positions[at + 1] += height;
          else if (edge.face === 0) positions[at + 2] += height;
          else if (edge.face === 1) positions[at] += height;
          else positions[at + 2] -= height;
        } else if (edge.face === 3) positions[at + (edge.horizontal ? 2 : 0)] += half * sign;
        else if (edge.horizontal) positions[at + 1] += half * sign;
        else if (edge.face === 0) positions[at] += half * sign;
        else if (edge.face === 1) positions[at + 2] -= half * sign;
        else positions[at] -= half * sign;
        this.exposure[index] = edge.exposure;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aExposure.needsUpdate = true;
  }

  update(features, progress, enabled) {
    // Chapter 4 belongs to the gravity well/core, with NO joint travelers on
    // either crown or casing. Fade the departing sides, then clear both atlases.
    const pathReveal = 1 - Three.MathUtils.smoothstep(progress, 2.10, 2.5);
    const flowing = enabled && pathReveal > .0001;
    // Clear once when paths end, not two full atlases on every finale/silent frame.
    if (!flowing && !this.active) return;
    const weights = chapterWeights(progress, this.weights);
    this.data.fill(0); this.stoneData.fill(0);
    let active = false;
    // Never degrade musical heads/voice identities; only optional branch wakes.
    const decoration = this.app.frameBudget.decorationScale;
    const detail = this.app.compact ? .72 : 1;
    if (flowing) for (let face = 0; face < names.length; face++) {
      const feature = features[names[face]];
      const emphasis = (face === 0 ? weights.padSide : face === 1 ? weights.sequenceSide
        : weights.bassSide) * pathReveal;
      for (const note of feature.midi.active) {
        const journey = this.routes.get(note);
        if (!journey) continue;
        const raw = Math.max(note.strength, note.hit * .8, note.echo * .7) * emphasis;
        if (raw < .0001) continue;
        const strength = 1 - Math.exp(-raw * 4.2);
        this.deposit(journey.route, journey.profile, note.age, strength, detail);
        const branch = journey.branch;
        if (branch && decoration > 0) this.deposit(branch.route, journey.profile, note.age - branch.start, strength * .26 * decoration, detail * .65);
        active = true;
      }
      // Short-lead audio echoes can outlast its note envelope. They remain real
      // analysed release energy, not invented onsets or detached spark particles.
      if (face === 1) for (const note of feature.midi.recent) {
        if (note.age <= note.duration + note.release) continue;
        const journey = this.routes.get(note);
        if (!journey || note.echo * emphasis < .0001) continue;
        this.deposit(journey.route, journey.profile, note.age, (1 - Math.exp(-note.echo * emphasis * 3)) * .6, detail);
        active = true;
      }
      // If bass MIDI is unavailable, expose a small stationary course region
      // using only the measured low-end envelope. No fabricated kick/onset,
      // pitch, route clock, or extra audio source is introduced.
      if (face === 2 && !feature.midi.ready && feature.level * emphasis > .0001) {
        const strength = (1 - Math.exp(-feature.level * emphasis * 3)) * .35;
        for (const edge of this.network.edges) {
          const value = this.fallback[edge.id] * strength;
          if (value < .0001) continue;
          for (let sample = 0; sample < seamSamples; sample++) this.data[(edge.id * seamSamples + sample) * 4 + 1] += value;
        }
        active = true;
      }
    }
    // The first two compositions now also inhabit the horizontal paving.
    // Pads remain under short lead; fade these roof explorers out before the
    // opened-tip chapter. The finale intentionally has no pathfinding light.
    const earlyTop = progress < 1.5 ? 1 - Three.MathUtils.smoothstep(progress, 1.12, 1.5) : 0;
    if (flowing && earlyTop > .0001) for (let instrument = 0; instrument < 2; instrument++) {
      const feature = features[names[instrument]];
      const emphasis = earlyTop * (instrument === 0 ? weights.padSide : weights.sequenceSide);
      for (const note of feature.midi.active) {
        const journey = this.crownRoutes.get(note);
        if (!journey) continue;
        const raw = Math.max(note.strength, note.hit * .8, note.echo * .7) * emphasis;
        if (raw < .0001) continue;
        const strength = 1 - Math.exp(-raw * 4.2);
        this.deposit(journey.route, journey.profile, note.age, strength, detail);
        if (journey.branch && decoration > 0) this.deposit(journey.branch.route, journey.profile,
          note.age - journey.branch.start, strength * .26 * decoration, detail * .65);
        active = true;
      }
      if (instrument === 1) for (const note of feature.midi.recent) {
        if (note.age <= note.duration + note.release) continue;
        const journey = this.crownRoutes.get(note);
        if (!journey || note.echo * emphasis < .0001) continue;
        this.deposit(journey.route, journey.profile, note.age,
          (1 - Math.exp(-note.echo * emphasis * 3)) * .6, detail);
        active = true;
      }
    }
    this.mesh.visible = active;
    this.uniforms.uSeamActive.value = active ? 1 : 0;
    if (!active && !this.active) return;
    if (active) {
      this.updatePose();
      for (const edge of this.network.edges) {
        let spill = 0;
        for (let sample = 0; sample < seamSamples; sample++) {
          const at = (edge.id * seamSamples + sample) * 4;
          this.data[at] = Math.min(1.25, this.data[at]);
          this.data[at + 1] = Math.min(.9, this.data[at + 1]);
          spill += (this.data[at] * .65 + this.data[at + 1] * .35) / seamSamples;
        }
        spill *= edge.exposure;
        const a = edge.a.seamIndex * 16 + edge.face * 4 + edge.sideA;
        const b = edge.b.seamIndex * 16 + edge.face * 4 + edge.sideB;
        this.stoneData[a] = Math.min(1, this.stoneData[a] + spill);
        this.stoneData[b] = Math.min(1, this.stoneData[b] + spill);
      }
    }
    this.active = active;
    this.uniforms.uSeamFlow.value.needsUpdate = true;
    this.uniforms.uSeamStones.value.needsUpdate = true;
  }
}

// A restrained approximation of close-range bounced light. Bloom alone does
// not illuminate stone; only occupied neighbouring joints contribute here.
export function bindSeamLight(shader, seams) {
  Object.assign(shader.uniforms, seams.uniforms);
  shader.vertexShader = `attribute float aSeamStone;
    varying float vSeamStone; varying vec3 vSeamScale;
    ${shader.vertexShader}`.replace("#include <begin_vertex>", `#include <begin_vertex>
      vSeamStone = aSeamStone;
      vSeamScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));`);
  shader.fragmentShader = `uniform sampler2D uSeamStones;
    uniform float uSeamStoneRows; uniform float uSeamActive;
    varying float vSeamStone; varying vec3 vSeamScale;
    float seamEdgeLight(vec2 p, vec2 size, vec4 light) {
      vec4 distance = vec4(.5 + p.x, .5 - p.x, .5 + p.y, .5 - p.y) * size.xxyy;
      vec4 reach = exp(-pow(max(distance, vec4(0.0)) / .020, vec4(2.0)));
      return dot(reach, light);
    }
    ${shader.fragmentShader}`.replace("#include <emissivemap_fragment>", `
      #include <emissivemap_fragment>
      if (uSeamActive > .5 && vSeamStone > -.5) {
        float row = (vSeamStone + .5) / uSeamStoneRows;
        vec4 front = texture2D(uSeamStones, vec2(.125, row));
        vec4 right = texture2D(uSeamStones, vec2(.375, row));
        vec4 back = texture2D(uSeamStones, vec2(.625, row));
        vec4 crown = texture2D(uSeamStones, vec2(.875, row));
        float spill = seamEdgeLight(vStoneLocal.xy, vSeamScale.xy, front)
          * smoothstep(.39, .49, vStoneLocal.z) * max(.12, vStoneNormal.z);
        spill += seamEdgeLight(vec2(-vStoneLocal.z, vStoneLocal.y), vSeamScale.zy, right)
          * smoothstep(.39, .49, vStoneLocal.x) * max(.12, vStoneNormal.x);
        spill += seamEdgeLight(vec2(-vStoneLocal.x, vStoneLocal.y), vSeamScale.xy, back)
          * smoothstep(.39, .49, -vStoneLocal.z) * max(.12, -vStoneNormal.z);
        spill += seamEdgeLight(vStoneLocal.xz, vSeamScale.xz, crown)
          * smoothstep(.39, .49, vStoneLocal.y) * max(.12, vStoneNormal.y);
        totalEmissiveRadiance += vec3(.035, .64, .17) * min(.8, spill);
      }
    `);
}
