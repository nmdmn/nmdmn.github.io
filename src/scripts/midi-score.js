// The supplied exports omit tempo events. Their common 32-bar arrangement is
// 172 BPM; never stretch each file to its own last note or end-of-track tick.
export const songBpm = 172;

export function parseMidi(buffer, defaultBpm = songBpm) {
  const bytes = new Uint8Array(buffer), view = new DataView(buffer);
  let offset = 0, limit = bytes.length;
  const requireBytes = count => { if (offset + count > limit) throw new Error("Truncated MIDI data."); };
  const byte = () => { requireBytes(1); return bytes[offset++]; };
  const word = () => { requireBytes(2); const value = view.getUint16(offset); offset += 2; return value; };
  const integer = () => { requireBytes(4); const value = view.getUint32(offset); offset += 4; return value; };
  const tag = () => String.fromCharCode(byte(), byte(), byte(), byte());
  const variable = () => {
    let value = 0;
    for (let i = 0; i < 4; i++) {
      const next = byte(); value = value * 128 + (next & 127);
      if (!(next & 128)) return value;
    }
    throw new Error("Invalid MIDI variable-length value.");
  };
  if (tag() !== "MThd") throw new Error("Invalid MIDI header.");
  const headerLength = integer(), headerEnd = offset + headerLength;
  if (headerLength < 6 || headerEnd > limit) throw new Error("Invalid MIDI header length.");
  const format = word(), trackCount = word(), division = word();
  if (format > 1 || division === 0 || division & 0x8000) throw new Error("MIDI requires a shared PPQN timeline.");
  offset = headerEnd;
  const tracks = [], notes = [], tempos = [];
  for (let index = 0; index < trackCount; index++) {
    if (tag() !== "MTrk") throw new Error("Invalid MIDI track.");
    const length = integer(), end = offset + length;
    if (end > bytes.length) throw new Error("Truncated MIDI track.");
    limit = end;
    const track = { index, name: `Voice ${index + 1}`, notes: [], endTick: 0 };
    const held = new Map(), sustained = Array.from({ length: 16 }, () => []), pedal = new Uint8Array(16);
    let tick = 0, running = 0, ordinal = 0;
    const finish = (note, at) => { note.endTick = Math.max(note.tick, at); track.notes.push(note); notes.push(note); };
    while (offset < end) {
      tick += variable();
      let status = byte();
      if (status < 128) { offset--; status = running; }
      if (!status) throw new Error("MIDI running status has no preceding event.");
      if (status === 255) {
        const type = byte(), size = variable(); requireBytes(size);
        if (type === 81 && size === 3) tempos.push({ tick, microseconds: bytes[offset] * 65536 + bytes[offset + 1] * 256 + bytes[offset + 2] });
        if (type === 3) track.name = new TextDecoder().decode(bytes.subarray(offset, offset + size));
        offset += size;
        if (type === 47) break;
      } else if (status === 240 || status === 247) {
        const size = variable(); requireBytes(size); offset += size; running = 0;
      } else {
        if (status >= 240) throw new Error("Unsupported MIDI system event.");
        running = status;
        const kind = status >> 4, channel = status & 15, a = byte(), b = kind === 12 || kind === 13 ? 0 : byte();
        if (a > 127 || b > 127) throw new Error("Invalid MIDI event data.");
        const key = channel * 128 + a;
        if (kind === 9 && b > 0) {
          const note = { id: `${index}:${channel}:${a}:${tick}:${ordinal++}`, track: index, channel, pitch: a, velocity: b / 127, tick };
          if (!held.has(key)) held.set(key, []);
          held.get(key).push(note);
        } else if (kind === 8 || kind === 9) {
          const note = held.get(key)?.shift();
          if (note) { if (pedal[channel]) sustained[channel].push(note); else finish(note, tick); }
        } else if (kind === 11 && a === 64) {
          pedal[channel] = b >= 64 ? 1 : 0;
          if (!pedal[channel]) { sustained[channel].forEach(note => finish(note, tick)); sustained[channel].length = 0; }
        } else if (kind === 11 && (a === 120 || a === 123)) {
          held.forEach((queue, noteKey) => { if (Math.floor(noteKey / 128) === channel) { queue.forEach(note => finish(note, tick)); queue.length = 0; } });
          sustained[channel].forEach(note => finish(note, tick)); sustained[channel].length = 0;
        }
      }
    }
    held.forEach(queue => queue.forEach(note => finish(note, tick)));
    sustained.forEach(queue => queue.forEach(note => finish(note, tick)));
    track.endTick = tick;
    tracks.push(track);
    offset = end; limit = bytes.length;
  }
  tempos.sort((a, b) => a.tick - b.tick);
  const segments = [{ tick: 0, time: 0, microseconds: 60000000 / defaultBpm }];
  tempos.forEach(event => {
    if (event.microseconds <= 0) throw new Error("Invalid MIDI tempo.");
    const previous = segments[segments.length - 1];
    segments.push({ ...event, time: previous.time + (event.tick - previous.tick) * previous.microseconds / (division * 1000000) });
  });
  const seconds = tick => {
    let segment = segments[0];
    for (const next of segments) { if (next.tick > tick) break; segment = next; }
    return segment.time + (tick - segment.tick) * segment.microseconds / (division * 1000000);
  };
  notes.forEach(note => { note.time = seconds(note.tick); note.end = seconds(note.endTick); note.duration = note.end - note.time; });
  notes.sort((a, b) => a.time - b.time || a.track - b.track || a.pitch - b.pitch);
  const endTick = Math.max(0, ...tracks.map(track => track.endTick));
  // Four-bar phrases in this 4/4 arrangement. Use the SAME tempo map as notes;
  // a sparse stem's final phrase is not a new loop boundary.
  const phraseTicks = division * 16;
  const phrases = Array.from({ length: Math.min(1024, Math.ceil(endTick / phraseTicks)) }, (_, i) => ({
    time: seconds(i * phraseTicks), end: seconds((i + 1) * phraseTicks), count: 0,
  }));
  notes.forEach(note => { if (phrases[Math.floor(note.tick / phraseTicks)]) phrases[Math.floor(note.tick / phraseTicks)].count++; });
  const density = Math.max(1, ...phrases.map(phrase => phrase.count));
  phrases.forEach(phrase => { phrase.density = phrase.count / density; });
  return { format, division, tracks, notes, tempos, phrases, defaultBpm, duration: seconds(endTick) };
}
