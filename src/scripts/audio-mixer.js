import TrackFeatures, { quietFeatures } from "./audio-features.js";
import { parseMidi } from "./midi-score.js";
import MidiPlayer from "./midi-player.js";
import VisualClock from "./visual-clock.js";
import FeatureHistory from "./feature-history.js";
import warmOutput, { guardIntro } from "./audio-warmup.js";

const stems = [
  { name: "pads", chapter: 0, url: new URL("../../assets/audio/pads.mp3", import.meta.url), midi: new URL("../../assets/midi/pads.mid", import.meta.url) },
  { name: "sequence", chapter: 1, url: new URL("../../assets/audio/sequence.mp3", import.meta.url), midi: new URL("../../assets/midi/sequence.mid", import.meta.url) },
  { name: "bass", chapter: 2, url: new URL("../../assets/audio/bass.mp3", import.meta.url), midi: new URL("../../assets/midi/bass.mid", import.meta.url) },
  { name: "lead", chapter: 3, gainLimit: .20, url: new URL("../../assets/audio/lead.mp3", import.meta.url), midi: new URL("../../assets/midi/lead.mid", import.meta.url) },
  // A fifth physical channel belongs to the existing bass layer, not a new
  // chapter. No score is requested or fabricated for the supplied kick.
  { name: "kick", chapter: 2, gainLimit: .20, url: new URL("../../assets/audio/kick.mp3", import.meta.url) },
];

const channelGain = .25;
const channelFade = .55;
const masterFade = .18;
const startLead = .12;

function peak(buffer) {
  let maximum = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const samples = buffer.getChannelData(channel);
    for (let i = 0; i < samples.length; i++) maximum = Math.max(maximum, Math.abs(samples[i]));
  }
  return maximum;
}

function gainState(node, value = 0) {
  // Set both the intrinsic value (before the first render quantum) and its
  // audio-clock event. Safari can still report a fresh GainNode's default 1
  // while an event at the suspended clock's current time is pending.
  node.gain.value = value;
  node.gain.setValueAtTime(value, node.context.currentTime);
  return { node, from: value, target: value, start: 0, end: 0 };
}

function resetGain(state, now) {
  state.node.gain.cancelScheduledValues(now);
  state.node.gain.value = 0;
  state.node.gain.setValueAtTime(0, now);
  Object.assign(state, { from: 0, target: 0, start: now, end: now });
}

function gainValue(state, now) {
  const position = state.end > state.start ? Math.max(0, Math.min(1, (now - state.start) / (state.end - state.start))) : 1;
  return state.from + (state.target - state.from) * position;
}

function ramp(state, target, now, duration) {
  const held = gainValue(state, now);
  // Explicitly hold the interrupted ramp, so fast reverse scrolling never
  // jumps gain, stacks automation events, or exceeds the quarter-gain ceiling.
  state.node.gain.cancelScheduledValues(now);
  state.node.gain.setValueAtTime(held, now);
  state.node.gain.linearRampToValueAtTime(target, now + duration);
  Object.assign(state, { from: held, target, start: now, end: now + duration });
}

export default class AudioMixer {
  constructor(timeline) {
    this.chapter = Math.max(0, timeline.active);
    this.channels = [];
    this.sources = [];
    this.available = false;
    this.started = false;
    this.muted = false;
    this.outputConnected = false;
    this.features = quietFeatures();
    this.visualClock = new VisualClock();
    this.button = document.querySelector(".audio-toggle");
    this.button.addEventListener("click", () => {
      this.toggleSound().catch(error => {
        console.warn("Sound could not resume. Try the sound control again.", error);
        this.updateControl();
      });
    });
    timeline.onChange(() => this.setChapter(timeline.active));
    this.visibilityChanged = () => {
      if (!this.started) return;
      if (document.hidden) {
        this.visibilityPaused = true;
        this.disconnectOutput();
        resetGain(this.master, this.context.currentTime);
        this.resetFeatures();
        this.context.suspend().catch(() => { });
      } else if (this.visibilityPaused) {
        this.visibilityPaused = false;
        this.resumePlayback().catch(() => this.updateControl());
      }
    };
    document.addEventListener("visibilitychange", this.visibilityChanged);
    window.addEventListener("pagehide", event => { if (!event.persisted) this.dispose(); });
  }

  async prepare(progress) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return false;
    this.abort = new AbortController();
    const timeout = setTimeout(() => this.abort.abort(), 15000);
    try {
      // Decode while suspended; only an explicit entry click resumes audio.
      // Avoid the larger device prefill used by the playback-latency preset.
      this.context = new Context({ sampleRate: 48000, latencyHint: "interactive" });
      this.context.addEventListener("statechange", () => {
        if (this.context?.state !== "running") {
          this.disconnectOutput();
          if (this.master) resetGain(this.master, this.context.currentTime);
          this.resetFeatures();
        }
        this.updateControl();
      });
      const context = this.context;
      const cancelled = new Promise((_, reject) => this.abort.signal.addEventListener("abort", () => {
        reject(new Error("Audio preparation cancelled or timed out."));
      }, { once: true }));
      if (context.state === "running") await Promise.race([context.suspend(), cancelled]);
      let completed = 0;
      const decoded = await Promise.race([cancelled, Promise.all(stems.map(async stem => {
        const midiReady = stem.midi ? fetch(stem.midi, { signal: this.abort.signal }).then(async response => {
          if (!response.ok) throw new Error(`Could not load ${stem.name} MIDI.`);
          return parseMidi(await response.arrayBuffer());
        }).catch(error => {
          if (!this.abort.signal.aborted) console.warn(`The ${stem.name} score is unavailable; audio playback is unchanged.`, error);
          return null;
        }) : Promise.resolve(null);
        const response = await fetch(stem.url, { signal: this.abort.signal });
        if (!response.ok) throw new Error(`Could not load the ${stem.name} channel.`);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        if (this.abort.signal.aborted) throw new Error("Audio preparation cancelled.");
        const maximum = peak(buffer);
        if (!Number.isFinite(maximum)) throw new Error(`Invalid samples in the ${stem.name} channel.`);
        guardIntro(buffer, masterFade);
        const score = await midiReady;
        progress(++completed / stems.length, completed, stems.length);
        return { ...stem, gainLimit: stem.gainLimit ?? channelGain, buffer, maximum, score };
      }))]);
      if (this.abort.signal.aborted) throw new Error("Audio preparation cancelled.");
      const durations = decoded.map(stem => stem.buffer.duration);
      this.playbackDuration = Math.min(...durations);
      if (Math.max(...durations) - this.playbackDuration > .002) throw new Error("The audio channels have mismatched playback lengths.");
      // One intro half, followed naturally by the repeating half. Native source
      // looping wraps only at the full file's end, back to its exact midpoint.
      this.loopStart = this.playbackDuration / 2;
      this.loopEnd = this.playbackDuration;
      this.loopDuration = this.loopEnd - this.loopStart;
      // Pads/sequence/bass: 25%; lead/kick: 20%. Include all FIVE decoded peaks,
      // including MP3 overshoot; reserve 10% headroom without a pumping limiter.
      const bound = decoded.reduce((sum, stem) => sum + stem.maximum * stem.gainLimit, 0);
      this.headroom = .9 / Math.max(1, bound);
      // The audible route stays disconnected during preparation and wake-up.
      this.master = gainState(this.context.createGain());
      // A permanently silent pull path keeps existing source clocks advancing
      // while the audible route is closed on resume. Its gain is NEVER raised
      // or automated: it cannot cache an earlier audible block or bypass a fade.
      this.silentSink = this.context.createGain();
      this.silentSink.gain.value = 0;
      this.silentSink.gain.setValueAtTime(0, this.context.currentTime);
      this.master.node.connect(this.silentSink);
      this.silentSink.connect(this.context.destination);
      this.channels = decoded.map(stem => {
        const gain = gainState(this.context.createGain());
        const analysis = new TrackFeatures(this.context, stem.name, this.features[stem.name]);
        analysis.analyser.connect(gain.node);
        gain.node.connect(this.master.node);
        let midi = stem.score;
        if (midi && midi.duration > this.loopDuration + .002) {
          console.warn(`The ${stem.name} MIDI exceeds the common audio loop; leaving its note visuals inactive.`);
          midi = null;
        }
        const score = new MidiPlayer(midi, stem.name, this.features[stem.name]);
        const history = new FeatureHistory(this.features[stem.name]);
        return { ...stem, gain, analysis, score, history };
      });
      this.available = true;
      return true;
    } catch (error) {
      this.abort.abort();
      this.available = false;
      this.channels = [];
      if (this.context) await this.context.close().catch(() => { });
      this.context = null;
      console.warn("Audio unavailable. The experience can still be entered silently.", error);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  start() {
    if (!this.available || this.started) return Promise.resolve();
    if (!this.starting) this.starting = this.startTogether().finally(() => { this.starting = null; });
    return this.starting;
  }

  async resumeContext() {
    // This call happens synchronously inside the play button's click handler,
    // before awaiting anything, to satisfy Safari's user-gesture requirement.
    const resumed = this.context.resume();
    let timeout;
    try {
      await Promise.race([resumed, new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Audio is interrupted. Try play again or enter silently.")), 4000);
      })]);
    } finally { clearTimeout(timeout); }
    if (this.context.state !== "running") throw new Error("Audio playback needs another play gesture.");
  }

  async startTogether() {
    try {
      this.disconnectOutput();
      const now = this.context.currentTime;
      resetGain(this.master, now);
      this.channels.forEach(channel => resetGain(channel.gain, now));
      // Build the entire silent graph BEFORE waking the device. This also
      // keeps Safari activation synchronous with the play/sound-button click.
      this.sources = this.channels.map(channel => {
        const source = this.context.createBufferSource();
        source.buffer = channel.buffer;
        source.loop = true;
        source.loopStart = this.loopStart;
        source.loopEnd = this.loopEnd;
        source.connect(channel.analysis.analyser);
        return source;
      });
      await this.resumeContext();
      await warmOutput(this.context);
      if (!this.available) throw new Error("Audio startup was cancelled.");
      // Re-anchor AFTER the audio engine has actually rendered silence. Events
      // prepared against the suspended clock are not the only zero guard.
      const ready = this.context.currentTime;
      resetGain(this.master, ready);
      this.channels.forEach(channel => resetGain(channel.gain, ready));
      const when = ready + startLead;
      // Schedule BOTH envelopes before starting any source. Master and stem
      // gains rise together from exact zero, smoothing the very first samples.
      this.mix(when);
      ramp(this.master, this.headroom, when, masterFade);
      // One hardware clock, identical start time/offset and loop boundary.
      // Muted channels KEEP PLAYING: section changes never seek or restart.
      // Offset zero deliberately precedes loopStart: play the intro once, then
      // the second half, then repeat that second half without recreating sources.
      this.sources.forEach(source => source.start(when, 0));
      this.connectOutput();
      this.startedAt = when;
      this.started = true;
      this.updateControl();
    } catch (error) {
      this.disconnectOutput();
      this.started = false;
      this.sources.forEach(source => {
        try { source.stop(); } catch { }
        source.disconnect();
      });
      this.sources = [];
      if (this.master) resetGain(this.master, this.context.currentTime);
      this.channels.forEach(channel => resetGain(channel.gain, this.context.currentTime));
      throw error;
    }
  }

  connectOutput() {
    if (this.outputConnected) return;
    this.master.node.connect(this.context.destination);
    this.outputConnected = true;
  }

  disconnectOutput() {
    if (!this.outputConnected) return;
    this.master.node.disconnect(this.context.destination);
    this.outputConnected = false;
  }

  resumePlayback() {
    if (!this.resuming) this.resuming = this.resumeTogether().finally(() => {
      this.resuming = null;
      this.updateControl();
    });
    return this.resuming;
  }

  async resumeTogether() {
    const context = this.context;
    this.disconnectOutput();
    resetGain(this.master, context.currentTime);
    this.resetFeatures();
    try {
      // resumeContext still runs synchronously within an explicit sound click.
      await this.resumeContext();
      await warmOutput(context);
      if (!this.available || this.context !== context) throw new Error("Audio resume was cancelled.");
      const ready = context.currentTime;
      resetGain(this.master, ready);
      ramp(this.master, this.muted ? 0 : this.headroom, ready + startLead, masterFade);
      this.connectOutput();
      // Existing sources and startedAt are untouched: resume cannot replay the
      // intro, seek a stem, or disturb the repeating-half alignment.
    } catch (error) {
      this.disconnectOutput();
      if (this.master) resetGain(this.master, context.currentTime);
      throw error;
    }
  }

  setChapter(chapter) {
    const next = Math.max(0, Math.min(3, chapter));
    if (next === this.chapter) return;
    this.chapter = next;
    if (this.started) this.mix(this.context.currentTime);
  }

  mix(now) {
    this.channels.forEach(channel => {
      const target = channel.chapter <= this.chapter ? channel.gainLimit : 0;
      if (target !== channel.gain.target) ramp(channel.gain, target, now, channelFade);
    });
  }

  updateFeatures(enabled, compact = false) {
    const running = enabled && this.started && this.context?.state === "running" && !document.hidden;
    if (!running) { this.resetFeatures(); return this.features; }
    const now = this.context?.currentTime || 0;
    const audible = this.visualClock.sample(this.context);
    const master = now >= this.startedAt ? gainValue(this.master, now) / this.headroom : 0;
    this.channels.forEach(channel => {
      channel.analysis.sample(now, master * gainValue(channel.gain, now) / channelGain, compact);
      channel.history.publish(now, audible);
      // The existing score repeats once per half through BOTH musical phases.
      channel.score.update(audible - this.startedAt, this.loopDuration);
    });
    return this.features;
  }

  resetFeatures() {
    this.visualClock.reset();
    this.channels.forEach(channel => { channel.analysis.reset(); channel.history.reset(); channel.score.reset(); });
  }

  async toggleSound() {
    if (!this.started) { this.muted = false; await this.start(); return; }
    if (this.context.state !== "running" || (!this.outputConnected && !this.resuming)) {
      this.muted = false;
      await this.resumePlayback();
      return;
    }
    this.muted = !this.muted;
    // A click during wake-up changes the requested state, not the closed gate.
    if (!this.resuming) ramp(this.master, this.muted ? 0 : this.headroom, this.context.currentTime, masterFade);
    this.updateControl();
  }

  updateControl() {
    this.button.hidden = !this.available || (!this.started && !this.enteredSilently);
    if (!this.started) {
      if (this.enteredSilently && this.available) {
        document.documentElement.dataset.sound = "off";
        this.button.setAttribute("aria-pressed", "true");
        this.button.title = "Start sound";
        this.button.querySelector("[data-audio-label]").textContent = "Sound off";
      }
      return;
    }
    const paused = this.context.state !== "running" || !!this.resuming || !this.outputConnected;
    document.documentElement.dataset.sound = paused ? "paused" : this.muted ? "off" : "on";
    this.button.setAttribute("aria-pressed", String(this.muted));
    this.button.title = paused ? "Resume sound" : this.muted ? "Unmute sound" : "Mute sound";
    this.button.querySelector("[data-audio-label]").textContent = paused ? "Resume sound" : this.muted ? "Sound off" : "Sound on";
  }

  enterSilently() { this.enteredSilently = true; this.updateControl(); }

  dispose() {
    this.abort?.abort();
    this.disconnectOutput();
    this.started = false;
    this.available = false;
    this.sources.forEach(source => {
      try { source.stop(); } catch { }
      source.disconnect();
    });
    this.sources = [];
    this.channels.forEach(channel => {
      channel.analysis.reset();
      channel.score.reset();
      channel.analysis.analyser.disconnect();
      channel.gain.node.disconnect();
    });
    this.channels = [];
    this.master?.node.disconnect();
    this.master = null;
    this.silentSink?.disconnect();
    this.silentSink = null;
    this.context?.close().catch(() => { });
    document.removeEventListener("visibilitychange", this.visibilityChanged);
    this.button.hidden = true;
  }
}
