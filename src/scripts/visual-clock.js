// The output-device clock is for VISUAL evaluation only. Source scheduling,
// gain automation and the shared audio loop continue using currentTime.
export default class VisualClock {
  constructor() { this.reset(); }

  reset() { this.last = null; this.mode = "context"; this.delay = 0; }

  sample(context, stamp = performance.now()) {
    const now = context.currentTime;
    let audible = now;
    this.mode = "context";
    try {
      const output = context.getOutputTimestamp?.();
      const age = (stamp - output?.performanceTime) / 1000;
      const estimate = output?.contextTime + age;
      // Reject startup zeroes, stale output-device reports, clock changes and
      // unreasonable offsets. Never add outputLatency on top of a timestamp.
      if (output?.contextTime > 0 && output.performanceTime > 0 && age >= -.02 && age < .5
        && Number.isFinite(estimate) && estimate <= now + .02 && now - estimate < .5) {
        audible = Math.max(0, Math.min(now, estimate));
        this.mode = "output";
      }
    } catch { /* Older/interrupting devices retain the context-clock fallback. */ }
    // A briefly invalid timestamp must not rewind note attacks when it returns.
    this.last = Math.max(this.last ?? 0, audible);
    this.last = Math.min(now, this.last);
    this.delay = now - this.last;
    return this.last;
  }
}
