import * as Three from "three";
import { masonrySize, courseHeight, tipOpening } from "./masonry-layout.js";
import { ease } from "./tip-burst.js";
import { chapterWeights } from "./choreography.js";

export const sideBase = tipOpening.middleY + courseHeight;
export const sideTop = masonrySize.top - courseHeight;
export const sideTravel = .12;

// Only the seated exterior casing above the prepared tip paths moves. The top
// two courses retain their existing paving motion/support, and Y never changes.
export function sideMotionWeights(block) {
  const height = block.position[1];
  const weight = block.course >= masonrySize.courses - 2 ? 0
    : ease(sideBase, sideBase + .14, height) * (1 - ease(sideTop - .22, sideTop - .07, height));
  return [0, 1, 2].map(face => block.faces.includes(face) ? weight : 0);
}

const clamp = value => Math.max(0, Math.min(1, value));

// Three musical faces share ONE small RGBA field: pads / sequence / bass.
// Each channel is bounded outward pressure, not tint, glow, or a moving skin.
// Rigid translations are shared by color, depth, mirrored view and CPU guides.
export default class SideSurface {
  constructor() {
    this.uniforms = { uSideField: { value: null }, uSideFieldSize: { value: 0 } };
    this.weights = {};
    this.patches = [[], [], []];
    this.active = false;
    this.resize(false);
  }

  resize(compact) {
    const size = compact ? 24 : 32;
    if (size === this.size) return;
    this.uniforms.uSideField.value?.dispose();
    this.size = size;
    this.data = new Float32Array(size * size * 4);
    const texture = new Three.DataTexture(this.data, size, size, Three.RGBAFormat, Three.FloatType);
    texture.minFilter = texture.magFilter = Three.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    this.uniforms.uSideField.value = texture;
    this.uniforms.uSideFieldSize.value = size;
    this.active = false;
  }

  update(features, progress) {
    const weights = chapterWeights(progress, this.weights);
    for (const patches of this.patches) patches.length = 0;
    for (const note of features.pads.midi.active) {
      // Voice order is the preset order: Lola at the top, Mumble Grow below.
      // Pitch remains stable along each horizontal voice band; unisons remain
      // separate voices rather than merging into a generic volume pulse.
      note.sideHeight = .86 - note.track * .132;
      note.sideAlong = note.x / masonrySize.halfWidth;
      note.sideWidth = .34;
      note.sideBreadth = .105;
      note.sideStrength = note.strength * weights.padSide;
      this.patches[0].push(note);
    }
    for (const note of features.sequence.midi.active) {
      note.sideHeight = .20 + note.register * .62;
      note.sideAlong = note.x / masonrySize.halfWidth;
      note.sideWidth = .24;
      note.sideBreadth = .14;
      note.sideStrength = (note.strength * .6 + note.hit * .8) * weights.sequenceSide;
      this.patches[1].push(note);
    }
    for (const note of features.bass.midi.active) {
      // Existing bass register, low notes lower / high notes higher. Broad
      // course pressure complements, but never edits, the opened-tip mechanism.
      note.sideHeight = .18 + clamp((note.pitch - 31) / 12) * .62;
      note.sideAlong = 0;
      note.sideWidth = 1.05;
      note.sideBreadth = .15;
      note.sideStrength = (note.strength * .75 + note.hit * .25) * weights.bassSide;
      this.patches[2].push(note);
    }
    const fallback = !features.bass.midi.ready ? features.bass.level * weights.bassSide : 0;
    const active = this.patches.some(patches => patches.some(note => note.sideStrength > .0001)) || fallback > .0001;
    if (!active && !this.active) return false;
    this.active = active;
    if (!active) this.data.fill(0);
    else for (let row = 0; row < this.size; row++) {
      const height = row / (this.size - 1);
      for (let column = 0; column < this.size; column++) {
        const along = column / (this.size - 1) * 2 - 1;
        const at = (row * this.size + column) * 4;
        for (let face = 0; face < 3; face++) {
          if (!this.patches[face].length && (face !== 2 || fallback === 0)) {
            this.data[at + face] = 0;
            continue;
          }
          let pressure = face === 2 ? fallback * Math.exp(-Math.pow((height - .5) / .3, 2) - along * along) : 0;
          for (const note of this.patches[face]) {
            const x = (along - note.sideAlong) / note.sideWidth;
            const y = (height - note.sideHeight) / note.sideBreadth;
            const distance = x * x + y * y;
            if (distance < 8) pressure += Math.exp(-distance * 1.25) * (1 - ease(6, 8, distance)) * note.sideStrength;
          }
          this.data[at + face] = pressure === 0 ? 0 : sideTravel * (1 - Math.exp(-pressure * 2.2));
        }
      }
    }
    this.uniforms.uSideField.value.needsUpdate = true;
    return true;
  }

  sampleFace(position, face) {
    const radius = masonrySize.halfWidth * (position.y - masonrySize.tip + courseHeight / 2) / (masonrySize.top - masonrySize.tip);
    const along = face === 0 ? position.x : face === 1 ? -position.z : -position.x;
    const x = clamp(along / Math.max(.001, radius) * .5 + .5) * (this.size - 1);
    const y = clamp((position.y - sideBase) / (sideTop - sideBase)) * (this.size - 1);
    const column = Math.floor(x), row = Math.floor(y), fx = x - column, fy = y - row;
    const a = (row * this.size + column) * 4 + face;
    const b = (row * this.size + Math.min(this.size - 1, column + 1)) * 4 + face;
    const c = (Math.min(this.size - 1, row + 1) * this.size + column) * 4 + face;
    const d = (Math.min(this.size - 1, row + 1) * this.size + Math.min(this.size - 1, column + 1)) * 4 + face;
    return (this.data[a] * (1 - fx) + this.data[b] * fx) * (1 - fy) + (this.data[c] * (1 - fx) + this.data[d] * fx) * fy;
  }

  sample(block, target) {
    const weights = block.sideWeights;
    const position = block.restPosition;
    target.set(0, 0, 0);
    if (weights[0]) target.z += this.sampleFace(position, 0) * weights[0];
    if (weights[1]) target.x += this.sampleFace(position, 1) * weights[1];
    if (weights[2]) target.z -= this.sampleFace(position, 2) * weights[2];
    return target;
  }
}
