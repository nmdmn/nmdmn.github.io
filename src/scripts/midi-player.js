const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const padVoices = [
  { attack: .16, release: .48 }, { attack: .38, release: .80 },
  { attack: .28, release: .72 }, { attack: .50, release: 1 },
  { attack: .09, release: .30 }, { attack: .65, release: 1.05 },
];

export default class MidiPlayer {
  constructor(score, name, output) {
    this.score = score;
    this.output = output;
    this.state = output.midi = { ready: !!score, tracks: score?.tracks || [], active: [], recent: [], level: 0, pulse: 0, position: 0, density: 0 };
    this.echoDuration = name === "sequence" ? 1.6 : 0;
    this.notes = (score?.notes || []).map(note => {
      const profile = name === "pads" ? padVoices[note.track % padVoices.length] : name === "sequence" ? { attack: .028, release: .26 } : name === "bass" ? { attack: .018, release: .20 } : { attack: .14, release: 3.20 };
      const register = clamp((note.pitch - 40) / 36);
      // One fixed, logarithmic-pitch surface map for pads AND sequence. Voices
      // retain separate identities; unisons slightly overlap rather than merge.
      return { ...note, ...profile, velocityRoot: Math.sqrt(note.velocity), age: 0, envelope: 0, strength: 0, hit: 0, echo: 0,
        sideHeight: 0, sideAlong: 0, sideWidth: 0, sideBreadth: 0, sideStrength: 0,
        x: -1.5 + register * 3, z: (note.pitch % 12 / 11 - .5) * 2.35 + (name === "pads" ? (note.track - 2.5) * .065 : 0),
        radius: .55 - register * .24, register,
      };
    });
  }

  reset() {
    this.state.active.length = this.state.recent.length = 0;
    this.state.level = this.state.pulse = this.state.density = this.state.position = 0;
  }

  update(elapsed, loopDuration) {
    this.reset();
    if (!this.score || elapsed < 0 || this.output.audibility < .001) return;
    const position = elapsed % loopDuration;
    this.state.position = position;
    const phrases = this.score.phrases || [];
    for (let index = 0; index < phrases.length; index++) {
      const phrase = phrases[index];
      if (position >= phrase.time && position < phrase.end) {
        const previous = phrases[index - 1]?.density ?? phrase.density;
        this.state.density = previous + (phrase.density - previous) * smooth((position - phrase.time) / .8);
        break;
      }
    }
    const energy = Math.sqrt(this.output.rawLevel);
    for (const note of this.notes) {
      let age = position - note.time;
      // Only borrow a prior-cycle release after the first real loop. Starting
      // playback cannot fire future notes or replay a hidden-page event queue.
      if (age < 0) { if (elapsed < loopDuration) continue; age += loopDuration; }
      if (age > Math.max(note.duration + note.release, this.echoDuration)) continue;
      note.age = age;
      note.echo = this.echoDuration && age < this.echoDuration
        ? Math.exp(-age / .55) * (1 - smooth((age - 1.1) / .5)) * note.velocityRoot * energy * this.output.audibility : 0;
      if (note.echo > .0001) this.state.recent.push(note);
      if (age > note.duration + note.release) continue;
      const attack = smooth(age / Math.min(note.attack, Math.max(.012, note.duration * .45)));
      const release = 1 - smooth((age - note.duration) / note.release);
      note.envelope = attack * release;
      note.strength = note.envelope * note.velocityRoot * energy * this.output.audibility;
      note.hit = (1 - Math.exp(-age / .014)) * Math.exp(-age / .115) * note.velocityRoot * energy * this.output.audibility;
      if (note.strength < .0001 && note.hit < .0001) continue;
      this.state.active.push(note);
      this.state.level = Math.max(this.state.level, note.strength);
      this.state.pulse = Math.max(this.state.pulse, note.hit);
    }
  }
}
