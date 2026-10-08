import * as Three from "three";
import { ease } from "./tip-burst.js";
import { chapterWeights } from "./choreography.js";
import { wellReveal, wellWeight, wellDepth } from "./crown-well.js";

export const surfaceSpan = 4.1;
export const surfaceLiftLimit = .48;

// A small shared displacement field, not thousands of per-frame matrices or a
// vertex loop over every MIDI note. Main view, depth and reflection sample it.
export default class StoneSurface {
  constructor() {
    this.uniforms = { uStoneField: { value: null }, uStoneFieldSize: { value: 0 }, uWellReveal: { value: 0 } };
    this.patches = [];
    this.waves = [];
    this.weights = {};
    this.active = false;
    this.resize(false);
  }

  resize(compact) {
    const size = compact ? 24 : 32;
    if (this.size === size) return;
    this.uniforms.uStoneField.value?.dispose();
    this.size = size;
    this.data = new Float32Array(size * size * 4);
    this.strainX = new Float32Array(size);
    this.strainZ = new Float32Array(size);
    this.coordinates = new Float64Array(size);
    this.wellWeights = new Float64Array(size * size);
    for (let i = 0; i < size; i++) this.coordinates[i] = (i / (size - 1) - .5) * surfaceSpan;
    for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
      this.wellWeights[row * size + column] = wellWeight(this.coordinates[column], this.coordinates[row]);
    }
    this.staticWell = null;
    const texture = new Three.DataTexture(this.data, size, size, Three.RGBAFormat, Three.FloatType);
    texture.minFilter = texture.magFilter = Three.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    this.uniforms.uStoneField.value = texture;
    this.uniforms.uStoneFieldSize.value = size;
    this.active = false;
  }

  update(features, progress) {
    this.patches.length = this.waves.length = 0;
    const weights = chapterWeights(progress, this.weights);
    const well = wellReveal(progress);
    this.uniforms.uWellReveal.value = well;
    // Barely perceptible musical breathing in the first THREE compositions.
    // Restore the full rim instrument only during the overhead finale; this
    // scales musical lift, never the structural well descent or lateral strain.
    const liftScale = .10 + .90 * ease(2.5, 3, progress);
    const prepare = (feature, weight, percussive) => {
      if (weight < .0001) return;
      for (const note of feature.midi.active) {
        // The pads retain broad holds; sequence adds a distinct short crest
        // without changing pitch locations or making all six voices identical.
        note.surfaceStrength = (percussive ? note.strength * .72 + note.hit * .65 : note.strength) * weight;
        note.surfaceRadius = note.radius * (percussive ? .94 : 1.14)
          * (1 + feature.low * .10 - feature.high * .06) * (.94 + feature.midi.density * .06);
        this.patches.push(note);
      }
    };
    prepare(features.pads, weights.pads, false);
    prepare(features.sequence, weights.sequence, true);
    const lead = weights.lead;
    if (lead > .0001) {
      for (const note of features.lead.midi.active) {
        note.surfaceStrength = note.strength * lead;
        note.waveNumber = 1.15 + Math.max(0, Math.min(1, (note.pitch - 48) / 24)) * .8;
        note.wavePhase = note.age * 1.45 - note.pitch * .17;
        this.waves.push(note);
      }
    }
    // Overlapping held notes/release tails interfere, but cannot accumulate
    // unbounded lateral strain. The sum remains at most one unit of pressure.
    const pressure = Math.max(1, this.waves.reduce((sum, note) => sum + note.surfaceStrength, 0));
    this.waves.forEach(note => { note.surfaceStrength /= pressure; });
    // A tiny broad bass strain remains after the tip has reassembled. It uses
    // isolated bass energy, not the separate kick channel, and cannot add a
    // vertical stroke or reopen the mechanism.
    const bass = Math.min(1, features.bass.level * .65 + features.bass.midi.pulse * .35) * weights.bass;
    const active = this.patches.length + this.waves.length > 0 || bass > .0001 || well > .00001;
    if (!active && !this.active) return false;
    // With no audible field, the fixed well does not need rebuilding/uploading.
    const staticWell = this.patches.length + this.waves.length === 0 && bass === 0 ? well : null;
    if (active && staticWell !== null && staticWell === this.staticWell) return false;
    this.staticWell = staticWell;
    this.active = active;
    for (const note of this.patches) {
      if (note.surfaceDistanceX?.length !== this.size) {
        note.surfaceDistanceX = new Float64Array(this.size);
        note.surfaceDistanceZ = new Float64Array(this.size);
      }
      for (let i = 0; i < this.size; i++) {
        const x = (this.coordinates[i] - note.x) / note.surfaceRadius;
        const z = (this.coordinates[i] - note.z) / note.surfaceRadius;
        note.surfaceDistanceX[i] = x * x; note.surfaceDistanceZ[i] = z * z;
      }
    }
    if (!active) this.data.fill(0);
    else {
      // Integrate NONNEGATIVE one-dimensional strain, then anchor its midpoint.
      // X depends only on X, Z only on Z: even combined musical fields cannot
      // reverse stone ordering. The texture's linear interpolation preserves it.
      const step = surfaceSpan / (this.size - 1);
      let previousX = 0, previousZ = 0;
      for (let i = 0; i < this.size; i++) {
        const s = i * step - surfaceSpan / 2;
        let sx = bass * .009, sz = bass * .009;
        for (const note of this.waves) {
          const arrival = ease(0, .65, note.age - (s + surfaceSpan / 2) / 1.65);
          sx += .060 * note.surfaceStrength * (.5 + .5 * Math.sin(note.waveNumber * s - note.wavePhase)) * arrival;
          sz += .060 * note.surfaceStrength * (.5 + .5 * Math.sin(note.waveNumber * s - note.wavePhase - .9)) * arrival;
        }
        this.strainX[i] = i ? this.strainX[i - 1] + (sx + previousX) * step / 2 : 0;
        this.strainZ[i] = i ? this.strainZ[i - 1] + (sz + previousZ) * step / 2 : 0;
        previousX = sx; previousZ = sz;
      }
      const middle = (this.size - 1) / 2, lower = Math.floor(middle);
      const centerX = (this.strainX[lower] + this.strainX[Math.ceil(middle)]) / 2;
      const centerZ = (this.strainZ[lower] + this.strainZ[Math.ceil(middle)]) / 2;
      for (let row = 0; row < this.size; row++) {
        const z = this.coordinates[row];
        for (let column = 0; column < this.size; column++) {
          const x = this.coordinates[column];
          let relief = 0, crest = 0;
          for (const note of this.patches) {
            const distance = note.surfaceDistanceX[column] + note.surfaceDistanceZ[row];
            if (distance < 6) relief += Math.exp(-distance * 1.8) * (1 - ease(4, 6, distance)) * note.surfaceStrength;
          }
          for (const note of this.waves) {
            const k = note.waveNumber, phase = note.wavePhase, strength = note.surfaceStrength;
            const along = x * .82 + z * .58;
            const arrival = ease(0, .65, note.age - (along + surfaceSpan * .70) / 1.65);
            crest += (.5 + .5 * Math.sin(k * along - phase)) * strength * arrival;
          }
          const at = (row * this.size + column) * 4;
          const weight = this.wellWeights[row * this.size + column];
          this.data[at] = this.strainX[column] - centerX;
          // One shared ceiling, not separately bounded effects added together.
          // A lead-only crest still remains below the original .17 height cap.
          this.data[at + 1] = surfaceLiftLimit * liftScale * (1 - Math.exp(-relief * 1.8 - crest * .42))
            * (1 - well * weight * .85) - wellDepth * weight * well;
          this.data[at + 2] = this.strainZ[row] - centerZ;
          this.data[at + 3] = Math.min(1, relief + crest);
        }
      }
    }
    this.uniforms.uStoneField.value.needsUpdate = true;
    return true;
  }

  sample(position, target) {
    const x = Math.max(0, Math.min(1, position.x / surfaceSpan + .5)) * (this.size - 1);
    const z = Math.max(0, Math.min(1, position.z / surfaceSpan + .5)) * (this.size - 1);
    const column = Math.floor(x), row = Math.floor(z), fx = x - column, fz = z - row;
    const a = (row * this.size + column) * 4, b = (row * this.size + Math.min(this.size - 1, column + 1)) * 4;
    const c = (Math.min(this.size - 1, row + 1) * this.size + column) * 4, d = (Math.min(this.size - 1, row + 1) * this.size + Math.min(this.size - 1, column + 1)) * 4;
    for (let i = 0; i < 3; i++) target.setComponent(i,
      (this.data[a + i] * (1 - fx) + this.data[b + i] * fx) * (1 - fz)
      + (this.data[c + i] * (1 - fx) + this.data[d + i] * fx) * fz);
    return target;
  }
}
