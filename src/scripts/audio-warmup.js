// Wake the output engine with literal zero samples, not a potentially stale
// gain value. Resolution is driven by the AUDIO engine, not a guessed UI delay.
// The music bus remains disconnected until this short source has ended.
export default function warmOutput(context) {
  return new Promise((resolve, reject) => {
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 256, context.sampleRate);
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      context.removeEventListener("statechange", interrupted);
      source.onended = null;
      if (error) { try { source.stop(); } catch {} }
      source.disconnect();
      if (error) reject(error); else resolve();
    };
    const interrupted = () => {
      if (context.state !== "running") finish(new Error("Audio wake-up was interrupted. Try sound again."));
    };
    const timeout = setTimeout(() => finish(new Error("Audio wake-up timed out. Try sound again.")), 4000);
    context.addEventListener("statechange", interrupted);
    source.onended = () => finish();
    try {
      if (context.state !== "running") throw new Error("Audio output is not running.");
      source.connect(context.destination);
      source.start();
    } catch (error) { finish(error); }
  });
}

// The initial PCM is also soft-started, independently of AudioParam automation.
// A startup render-block/gain glitch must not expose a full-amplitude first
// sample. This only changes the decoded intro head, never the files or loop half.
export function guardIntro(buffer, duration) {
  const length = Math.min(buffer.length, Math.ceil(buffer.sampleRate * duration));
  const hold = Math.min(length - 1, Math.ceil(buffer.sampleRate * .02));
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  for (let frame = 0; frame < length; frame++) {
    const t = frame <= hold ? 0 : (frame - hold) / Math.max(1, length - 1 - hold);
    const gain = t * t * (3 - 2 * t);
    for (const samples of channels) samples[frame] *= gain;
  }
}
