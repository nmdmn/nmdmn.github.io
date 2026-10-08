import * as Three from "three";
import { App } from "./app.js";
import Sculpture from "./sculpture.js";
import Projections, { smooth } from "./projections.js";
import Atmosphere from "./atmosphere.js";
import { tipState } from "./tip-burst.js";
import { paint } from "./startup.js";

// Yaw and orbit are unwrapped, so reversing scroll retraces the same path.
const poses = [
  { yaw: -.42, orbit: .22, elevation: .28, offset: -3.2, targetY: 2.1, lift: 0 },
  { yaw: -Math.PI / 2 + .42, orbit: -.22, elevation: .28, offset: 3.2, targetY: 2.1, lift: 0 },
  { yaw: -Math.PI + .32, orbit: .12, elevation: -.16, offset: 0, targetY: 3.8, lift: 4.3 },
  { yaw: -Math.PI * 1.5 + .78, orbit: .78, elevation: 1.36, offset: 0, targetY: 7.85, lift: 4.3 },
];

export default class Sketch {
  constructor(canvas, timeline, audio) {
    this.timeline = timeline;
    this.audio = audio;
    this.camera = new Three.PerspectiveCamera(38, window.innerWidth / window.innerHeight, .1, 180);
    this.app = new App(canvas, this.camera);
    try {
      this.sculpture = new Sculpture(this.app);
      this.projections = new Projections(this.app, this.sculpture.group, this.sculpture.anchors);
      this.atmosphere = new Atmosphere(this.app, this.projections);
      this.target = new Three.Vector3();
      this.app.addResizeCallback(() => this.sculpture.resize());
      this.app.addContextCallback(enabled => { if (!enabled) this.audio.updateFeatures(false); });
      this.app.addUpdateCallback((delta, time) => this.update(delta, time));
      timeline.onChange(() => {
        this.app.setAnimation(timeline.motionEnabled);
        this.app.invalidate();
      });
      this.app.setAnimation(timeline.motionEnabled);
    } catch (error) {
      this.projections?.setEnabled(false);
      document.body.classList.remove("scene-ready");
      throw error;
    }
  }

  async prepare(report = () => {}) {
    const { renderer, scene, composer } = this.app;
    try {
      // Hidden objects are compiled, but only VISIBLE lights participate in
      // compileAsync. The opened tip and well introduce different light counts.
      // Real draws also upload buffers/textures and warm depth + composer passes.
      for (let chapter = 0; chapter < poses.length; chapter++) {
        if (window.__startup?.expired || this.app.contextLost) throw new Error("Scene preparation interrupted.");
        report(chapter + 1, poses.length);
        this.update(0, 0, chapter);
        const overrides = [];
        scene.traverse(object => {
          if (!object.isMesh && !object.isPoints && !object.isLine) return;
          overrides.push([object, object.visible, object.frustumCulled]);
          // Draw silent music-only effects too. Do not force groups/lights on:
          // their authored chapter visibility determines the shader variants.
          object.visible = true;
          object.frustumCulled = false;
        });
        const target = renderer.getRenderTarget();
        try {
          // Match RenderPass's linear HDR destination, not the default sRGB
          // canvas; otherwise compileAsync prepares the wrong color variant.
          renderer.setRenderTarget(composer.readBuffer);
          await renderer.compileAsync(scene, this.camera);
          if (window.__startup?.expired || this.app.contextLost) throw new Error("Scene preparation interrupted.");
          renderer.setRenderTarget(target);
          composer.render(0);
        } finally {
          renderer.setRenderTarget(target);
          overrides.forEach(([object, visible, culled]) => {
            object.visible = visible;
            object.frustumCulled = culled;
          });
        }
        await paint();
      }
    } finally {
      // No scrolling, chapter/audio changes or animation time was
      // advanced. Restore the visitor's real entry pose (including deep links).
      this.update(0, this.app.time);
      if (!this.app.contextLost) composer.render(0);
    }
    // Include the restored entry frame. Do not reveal while the GPU still has
    // warmup draws/uploads queued; the asynchronous fence keeps the loader live.
    await this.app.waitForGPU();
  }

  update(delta, time, previewProgress) {
    // WebKit can coalesce scroll events during native touch momentum/snapping.
    // Use the real current position for this frame, not the last delivered event.
    // Skip silent startup previews and unchanged frames (including motion-off).
    if (previewProgress === undefined && this.timeline.container.scrollTop !== this.timeline.scrollTop) this.timeline.read();
    const motion = this.timeline.motionEnabled && previewProgress === undefined;
    const progress = previewProgress ?? (motion ? this.timeline.progress : Math.round(this.timeline.progress));
    const index = Math.min(2, Math.floor(progress));
    const t = smooth(progress - index);
    const from = poses[index];
    const to = poses[index + 1];
    const mix = key => Three.MathUtils.lerp(from[key], to[key], t);
    const compact = this.app.compact;
    const signalPanel = this.projections.items[2];
    const sourceLift = Math.max(4.3, signalPanel.height * (compact ? 6.4 : 6.2) / signalPanel.width + .95);
    const orbit = mix("orbit");
    const elevation = mix("elevation");
    const offset = compact ? 0 : mix("offset");
    const signalWeight = smooth(1 - Math.abs(progress - 2));
    const overheadWeight = smooth(progress - 2);
    const targetY = compact ? Three.MathUtils.lerp(Three.MathUtils.lerp(-1.7, (sourceLift + 4) / 2, signalWeight), sourceLift + 3.55, overheadWeight) : mix("targetY") + (sourceLift - 4.3) * mix("lift") / 4.3;
    // Frame the WORLD composition, not independently screen-positioned DOM.
    const journeySpan = compact ? Math.max(12, 8.5 / this.camera.aspect) : Three.MathUtils.lerp(Math.max(9.4, 18.4 / this.camera.aspect), Math.max(13.6, 12 / this.camera.aspect), signalWeight);
    // Leave a white border around the complete square instead of diving into
    // the surface. Portrait framing fits the face's width as well as height.
    const finalSpan = Math.max(4.9, 4.9 / this.camera.aspect, 4.1 / Math.max(.4, 1 - 208 / this.app.height));
    const verticalSpan = Three.MathUtils.lerp(journeySpan, finalSpan, overheadWeight);
    const distance = verticalSpan / (2 * Math.tan(Three.MathUtils.degToRad(this.camera.fov / 2)));
    this.target.set(Math.cos(orbit) * offset, targetY, -Math.sin(orbit) * offset);
    this.camera.position.set(
      this.target.x + Math.sin(orbit) * Math.cos(elevation) * distance,
      targetY + Math.sin(elevation) * distance,
      this.target.z + Math.cos(orbit) * Math.cos(elevation) * distance,
    );
    // Looking up at the inverted tip must not send tall-phone cameras
    // underneath the reflection plane.
    this.camera.position.y = Math.max(.45, this.camera.position.y);
    this.camera.lookAt(this.target);
    this.sculpture.group.rotation.y = mix("yaw");
    this.sculpture.group.position.y = mix("lift") * sourceLift / 4.3;
    const mouthY = this.sculpture.anchors.tip.position.y;
    const mouthWorldY = this.sculpture.group.position.y + mouthY;
    this.sculpture.beam.scale.y = Math.max(.001, mouthWorldY - .1) / 4.2;
    this.sculpture.beam.position.y = mouthY - 2.1 * this.sculpture.beam.scale.y;
    const burst = tipState(progress);
    const features = this.audio.updateFeatures(motion && !this.app.contextLost, compact);
    this.sculpture.update(motion ? time : 0, burst, progress, motion, features);
    this.sculpture.wellHaze.update(motion ? time : 0, progress, features, motion);
    // Both renderers consume this frame's final transforms. No pointer lag.
    this.projections.update(progress, this.camera, burst);
    this.atmosphere.update(motion ? time : 0, overheadWeight);
    const glow = this.sculpture.reactiveGlow;
    this.app.bloom.strength = Three.MathUtils.lerp(.32, .18, overheadWeight) + glow * .30;
    this.app.finish.uniforms.uGlow.value = glow;
    const focusTarget = this.timeline.pendingFocus;
    if (previewProgress === undefined && focusTarget && !focusTarget.inert) {
      focusTarget.focus({ preventScroll: true });
      this.timeline.pendingFocus = null;
    }
  }
}
