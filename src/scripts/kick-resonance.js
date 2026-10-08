import { bassRegions } from "./bass-resonance.js";

// Reuse the existing, collision-prepared spatial basis, NOT its MIDI pitch
// selector. Kick volume swells the same lower-weighted cloud profile smoothly.
// The weights sum to one, preserving the safe convex displacement bound.
const distribution = [.30, .26, .20, .15, .09];

export default class KickResonance {
  constructor() { this.modes = new Float32Array(bassRegions.length); }

  update(level, window, enabled) {
    const strength = enabled ? Math.max(0, Math.min(1, level)) * window : 0;
    for (let i = 0; i < this.modes.length; i++) this.modes[i] = distribution[i] * strength;
    return this.modes;
  }
}
