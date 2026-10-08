const clamp = value => Math.max(0, Math.min(1, value));
const follow = (value, target, delta, attack, release) => value + (target - value) * (1 - Math.exp(-delta / (target > value ? attack : release)));

// Conservative pre-fader RMS ranges calibrated against the supplied MP3s
// (2048-frame windows). Preserve genuine rests; no automatic gain chase.
const profiles = {
  pads: { floor: .018, ceiling: .31, attack: .18, release: .72 },
  sequence: { floor: .008, ceiling: .29, attack: .025, release: .13 },
  bass: { floor: .014, ceiling: .52, attack: .045, release: .27 },
  // The supplied low-passed, reverberant kick swells rather than flashing.
  kick: { floor: .008, ceiling: .30, attack: .045, release: .18 },
  lead: { floor: .012, ceiling: .29, attack: .09, release: .40 },
};

export const quietFeatures = () => Object.fromEntries(Object.keys(profiles).map(name => [name, { level: 0, rawLevel: 0, audibility: 0, brightness: .5, low: 0, mid: 0, high: 0, midi: { ready: false, tracks: [], active: [], recent: [], level: 0, pulse: 0, position: 0, density: 0 } }]));

export default class TrackFeatures {
  constructor(context, name, output) {
    this.name = name;
    this.output = output;
    this.profile = profiles[name];
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0;
    this.samples = new Float32Array(this.analyser.fftSize);
    this.spectrum = new Float32Array(this.analyser.frequencyBinCount);
    this.binHz = context.sampleRate / this.analyser.fftSize;
    this.reset();
  }

  reset() {
    this.level = 0;
    this.brightness = .5;
    this.bands ||= [0, 0, 0];
    this.bands.fill(0);
    this.lastTime = null;
    this.output.level = 0;
    this.output.brightness = .5;
    this.output.rawLevel = this.output.audibility = 0;
    this.output.low = this.output.mid = this.output.high = 0;
  }

  sample(now, audibility, compact) {
    if (audibility < .001) { this.reset(); return; }
    const elapsed = this.lastTime === null ? 1 / 60 : now - this.lastTime;
    if (this.lastTime !== null && elapsed < (compact ? 1 / 30 : 1 / 60)) {
      this.publish(audibility);
      return;
    }
    const delta = Math.min(.05, Math.max(0, elapsed));
    this.lastTime = now;
    this.analyser.getFloatTimeDomainData(this.samples);
    this.analyser.getFloatFrequencyData(this.spectrum);
    let square = 0;
    for (let i = 0; i < this.samples.length; i++) square += this.samples[i] * this.samples[i];
    let rms = Math.sqrt(square / this.samples.length);
    let total = 0, low = 0, mid = 0, high = 0, weight = 0, centroid = 0, kickLow = 0;
    for (let i = 1; i < this.spectrum.length; i++) {
      const hz = i * this.binHz;
      const power = Number.isFinite(this.spectrum[i]) ? Math.pow(10, this.spectrum[i] / 10) : 0;
      total += power;
      if (hz >= 30 && hz <= 220) low += power;
      if (this.name === "kick" && hz >= 20 && hz <= 180) kickLow += power;
      if (hz > 220 && hz <= 1800) mid += power;
      if (hz > 1800 && hz <= 10000) high += power;
      if (hz >= 180 && hz <= 6500) { weight += power; centroid += power * hz; }
    }
    if (this.name === "bass") rms *= Math.sqrt(low / Math.max(total, 1e-12));
    if (this.name === "kick") rms *= Math.sqrt(kickLow / Math.max(total, 1e-12));
    const { floor, ceiling, attack, release } = this.profile;
    const level = Number.isFinite(rms) ? clamp((rms - floor) / (ceiling - floor)) : 0;
    this.level = follow(this.level, level, delta, attack, release);
    const bandTotal = Math.max(1e-12, low + mid + high);
    this.bands[0] = follow(this.bands[0], Math.sqrt(low / bandTotal), delta, .12, .3);
    this.bands[1] = follow(this.bands[1], Math.sqrt(mid / bandTotal), delta, .12, .3);
    this.bands[2] = follow(this.bands[2], Math.sqrt(high / bandTotal), delta, .12, .3);
    if (weight > 1e-10 && level > .03) {
      // Spectral brightness, not an invented pitch/note detector.
      const brightness = clamp(Math.log2(centroid / weight / 250) / 3.5);
      this.brightness = follow(this.brightness, brightness, delta, .16, .35);
    }
    // Kick deliberately has no onset/peak trigger: its smoothed low-frequency
    // RMS level carries both the volume crest and the natural reverberant tail.
    this.publish(audibility);
  }

  publish(audibility) {
    this.output.rawLevel = this.level;
    this.output.audibility = audibility;
    this.output.level = this.level * audibility;
    this.output.brightness = this.brightness;
    [this.output.low, this.output.mid, this.output.high] = this.bands;
  }
}
