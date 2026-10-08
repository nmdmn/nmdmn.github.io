import ScrollTimeline from "./scroll.js";
import Startup, { paint, waitForStyles, waitForFonts } from "./startup.js";
import AudioMixer from "./audio-mixer.js";

async function main() {
  if (window.__startup?.expired) { new ScrollTimeline(); return; }
  const startup = new Startup();
  const timeline = new ScrollTimeline();
  const audio = new AudioMixer(timeline);
  let sketch;
  const fallback = error => {
    audio.dispose();
    sketch?.app.setAnimation(false);
    sketch?.projections.setEnabled(false);
    document.body.classList.remove("scene-ready");
    document.body.classList.add("webgl-unavailable");
    startup.reveal(false);
    console.warn("The live sculpture is unavailable. Showing the static artwork instead.", error);
  };
  const timedOut = () => fallback(new Error("Scene startup timed out."));
  window.addEventListener("startup-timeout", timedOut, { once: true });
  try {
    // Let the dependency-free loader paint BEFORE downloading/building Three.
    await paint();
    let sceneProgress = .12, audioProgress = 0;
    const report = (label, progress = sceneProgress) => {
      sceneProgress = Math.max(sceneProgress, progress);
      startup.stage(label, sceneProgress * .65 + audioProgress * .35);
    };
    report("Loading scene and sound assets.");
    const audioReady = audio.prepare((progress, completed, total) => {
      audioProgress = progress;
      report(`Preparing sound channels: ${completed} of ${total}.`);
    }).then(() => { audioProgress = 1; report("Preparing the experience."); });
    const [{ default: Sketch }] = await Promise.all([import("./sketch.js"), waitForStyles()]);
    if (window.__startup?.expired) return;
    const fonts = waitForFonts();
    report("Preparing stone and textures.", .45);
    await paint();
    sketch = new Sketch("canvas", timeline, audio);
    await fonts;
    if (window.__startup?.expired) return;
    timeline.measure();
    // Restore deep links after stylesheet/font layout, not only during the
    // bootstrap's provisional, potentially unstyled section measurements.
    timeline.goToHash();
    timeline.read();
    sketch.projections.measure();
    report("Preparing all compositions.", .8);
    await paint();
    await sketch.prepare((chapter, total) => {
      report(`Preparing composition ${chapter} of ${total}: shaders, shadows and reflection.`, .8 + .15 * chapter / total);
    });
    report("Waiting for sound channels.", 1);
    await audioReady;
    sketch.sculpture.masonry.seams.prepare(audio.channels);
    if (window.__startup?.expired) return;
    startup.stage("Scene ready.", 1);
    await paint();
    await startup.waitForEntry(async withSound => {
      if (withSound) await audio.start();
      else audio.enterSilently();
      await startup.reveal();
      sketch.app.start();
    }, audio.available);
  } catch (error) {
    // The text, navigation, and scroll choreography still work without WebGL.
    fallback(error);
  } finally {
    window.removeEventListener("startup-timeout", timedOut);
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main, { once: true });
else main();
