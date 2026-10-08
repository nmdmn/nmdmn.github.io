// Conservative degradation of OPTIONAL decoration only. Raw frame intervals
// are observed before scene delta clamping; isolated stalls, hidden time and
// startup do not count. This is not a device benchmark or an audio clock.
export default class FrameBudget {
  constructor() {
    this.level = 0;
    this.reset();
  }

  reset() {
    this.warmup = 2;
    this.elapsed = this.slowTime = this.fastTime = 0;
  }

  sample(interval) {
    if (!Number.isFinite(interval) || interval <= 0 || interval > .25) {
      this.reset();
      return false;
    }
    if (this.warmup > 0) { this.warmup -= interval; return false; }
    this.elapsed += interval;
    if (interval > .038) this.slowTime += interval;
    if (interval < .025) this.fastTime += interval;
    // Six seconds avoids reacting to one resize, navigation, or compilation.
    // Recovery takes twice as long to avoid oscillating particle density.
    const duration = this.level === 0 ? 6 : 12;
    if (this.elapsed < duration) return false;
    const slow = this.slowTime / this.elapsed > .7;
    const fast = this.fastTime / this.elapsed > .9;
    const next = slow ? Math.min(2, this.level + 1) : fast ? Math.max(0, this.level - 1) : this.level;
    this.elapsed = this.slowTime = this.fastTime = 0;
    if (next === this.level) return false;
    this.level = next;
    return true;
  }

  get decorationScale() { return this.level === 0 ? 1 : this.level === 1 ? .5 : 0; }
}
