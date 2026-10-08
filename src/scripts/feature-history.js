const fields = ["rawLevel", "level", "audibility", "brightness", "low", "mid", "high"];
const capacity = 64;
const stride = fields.length + 1;

// About one second at at most 60 Hz, including gain envelopes. Align strength
// with the output-clock MIDI without changing the analyser's internal followers.
// Fixed storage, no event replay and no per-frame allocation.
export default class FeatureHistory {
  constructor(output) {
    this.output = output;
    this.data = new Float64Array(capacity * stride);
    this.live = new Float64Array(stride);
    this.reset();
  }

  reset() { this.count = this.cursor = 0; }

  publish(now, audible) {
    this.live[0] = now;
    for (let i = 0; i < fields.length; i++) this.live[i + 1] = this.output[fields[i]];
    const latest = ((this.cursor - 1 + capacity) % capacity) * stride;
    // High-refresh displays must not consume the history faster than its
    // supported output delay. The live endpoint still interpolates gain fades
    // on every frame rather than adding a 60 Hz staircase.
    if (!this.count || now - this.data[latest] >= 1 / 60) {
      this.data.set(this.live, this.cursor * stride);
      this.cursor = (this.cursor + 1) % capacity;
      this.count = Math.min(capacity, this.count + 1);
    }
    let newerData = this.live, newer = 0;
    for (let step = 0; step < this.count; step++) {
      const older = ((this.cursor - 1 - step + capacity) % capacity) * stride;
      const time = this.data[older];
      if (time <= audible) {
        const span = newerData[newer] - time;
        const blend = span > 0 ? Math.max(0, Math.min(1, (audible - time) / span)) : 0;
        for (let i = 0; i < fields.length; i++) {
          this.output[fields[i]] = this.data[older + i + 1] * (1 - blend) + newerData[newer + i + 1] * blend;
        }
        return;
      }
      newerData = this.data;
      newer = older;
    }
    // No historical measurement yet: never borrow a future attack at startup
    // or immediately after a hidden page / motion pause.
    for (const field of fields) this.output[field] = field === "brightness" ? .5 : 0;
  }
}
