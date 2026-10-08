import * as Three from "three";
import BeamVertex from "./shaders/beam.vert.glsl";
import BeamFragment from "./shaders/beam.frag.glsl";
import Masonry from "./masonry.js";
import { masonrySize, tipOpening } from "./masonry-layout.js";
import { ease } from "./tip-burst.js";
import TipEnergy from "./tip-energy.js";
import KickResonance from "./kick-resonance.js";
import PyramidReflection from "./pyramid-reflection.js";
import { surfaceLiftLimit } from "./stone-surface.js";
import WellCore from "./well-core.js";
import WellHaze from "./well-haze.js";
import WellLining from "./well-lining.js";
import WellMasonry from "./well-masonry.js";

// Broad, off-camera studio sources authored for each scroll composition.
// Positions transition with the chapter, not an endless orbit around edges.
const lighting = [
  { key: [-6, 8, 8], rim: [7, 5, -5], sweep: [-7, 6, 6], target: [0, 2.2, 0], intensity: 42 },
  { key: [6, 8, 8], rim: [-7, 5, -5], sweep: [7, 6, 6], target: [0, 2.2, 0], intensity: 42 },
  { key: [-5, 9, 5], rim: [6, 5, -6], sweep: [-3, 1.8, 5], target: [0, .5, 0], intensity: 24 },
  { key: [-5, 9, -3], rim: [5, 5, -6], sweep: [4, 9, 4], target: [-.5, 3.5, -.5], intensity: 38 },
];

export default class Sculpture {
  constructor(app) {
    this.app = app;
    this.group = new Three.Group();
    app.scene.add(this.group);

    this.masonry = new Masonry(app);
    this.kickResonance = new KickResonance();
    this.group.add(this.masonry.group);
    this.wellCore = new WellCore(app);
    this.group.add(this.wellCore.group);
    this.wellHaze = new WellHaze(app, this.group, this.wellCore);
    this.wellLining = new WellLining();
    this.group.add(this.wellLining.mesh);
    this.wellMasonry = new WellMasonry(this.masonry, app);
    this.group.add(this.wellMasonry.group);
    this.boundAnchors = [];
    const anchor = (position, binding) => {
      const object = new Three.Object3D();
      if (binding) {
        this.masonry.resolveAnchor(binding, object.position);
        this.boundAnchors.push({ object, binding });
      } else object.position.copy(position);
      this.group.add(object);
      return object;
    };
    this.anchors = {
      tip: anchor(new Three.Vector3(0, tipOpening.mouthY, 0)),
      // Reserve a fixed reading plane above ALL possible stone travel. Musical
      // maxima must never translate or rescale the inscription on each attack.
      top: anchor(new Three.Vector3(0, masonrySize.top + surfaceLiftLimit, 0)),
      topCorners: Array.from({ length: 4 }, (_, corner) => {
        const point = new Three.Vector3((corner % 2 === 0 ? -1 : 1) * 1.92, masonrySize.top, (corner < 2 ? -1 : 1) * 1.92);
        point.applyAxisAngle(new Three.Vector3(0, 1, 0), Math.PI * 1.5);
        return anchor(null, this.masonry.topBinding(point));
      }),
      faces: Array.from({ length: 4 }, (_, face) => {
        const direction = face === 0 ? -1 : 1;
        return [
          new Three.Vector3(direction * 1.45, 3.22, 1.89), new Three.Vector3(direction * .8, 1.83, 1.06),
          new Three.Vector3(-1.25, 2.95, 1.725), new Three.Vector3(1.25, 2.95, 1.725),
        ].map(point => anchor(null, this.masonry.faceBinding(face, point)));
      }),
    };

    app.scene.add(new Three.HemisphereLight(0xffffff, 0x727970, 1.35));
    const key = new Three.DirectionalLight(0xfff9ed, 3.6);
    key.position.set(-5, 9, 6);
    this.key = key;
    key.castShadow = true;
    key.shadow.camera.left = key.shadow.camera.bottom = -4.5;
    key.shadow.camera.right = key.shadow.camera.top = 4.5;
    key.shadow.camera.near = .1;
    key.shadow.camera.far = 32;
    key.shadow.bias = -.00008;
    key.shadow.normalBias = .012;
    key.shadow.radius = 2;
    key.shadow.camera.updateProjectionMatrix();
    app.scene.add(key.target);
    app.scene.add(key);
    const rim = new Three.DirectionalLight(0xd8e4e1, 1.5);
    rim.position.set(5, 4, -5);
    this.rim = rim;
    app.scene.add(rim.target);
    app.scene.add(rim);
    const fill = new Three.DirectionalLight(0xffffff, .85);
    fill.position.set(-7, 3, 10);
    app.scene.add(fill);
    this.sweep = new Three.SpotLight(0xe9f4ed, 42, 30, .85, 1, 2);
    app.scene.add(this.sweep, this.sweep.target);

    this.uniforms = { uTime: { value: 0 }, uEmission: { value: 0 }, uProjectionEmission: { value: 0 }, uBeamReveal: { value: 0 } };
    this.beam = new Three.Mesh(new Three.CylinderGeometry(.28, 2.6, 4.2, 48, 24, true), new Three.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: BeamVertex, fragmentShader: BeamFragment,
      transparent: true, depthWrite: false, side: Three.DoubleSide,
    }));
    this.beam.rotation.y = Math.PI / 4;
    this.beam.position.y = this.anchors.tip.position.y - 2.1;
    this.group.add(this.beam);
    this.energy = new TipEnergy(this.masonry, app.camera, this.uniforms);
    this.group.add(this.energy.group);
    this.reflection = new PyramidReflection(app, this.group);
    app.scene.fog = new Three.Fog(0xfafaf8, 32, 90);
    this.resize();
  }

  resize() {
    this.masonry.resize(this.app.compact);
    this.wellMasonry.resize(this.app.compact);
    const shadowSize = this.app.compact ? 1024 : 2048;
    if (this.key.shadow.mapSize.x !== shadowSize) {
      this.key.shadow.mapSize.set(shadowSize, shadowSize);
      this.key.shadow.map?.dispose();
      this.key.shadow.map = null;
    }
    this.app.renderer.shadowMap.needsUpdate = true;
    this.reflection.resize(this.app);
  }

  update(time, state, progress, ambient, features) {
    // Tip pulses are exclusively the isolated kick's measured low end. Bass
    // MIDI/energy remains on the casing and paving, never this opened mechanism.
    const pressure = Math.min(1, features.kick.level);
    const kickWindow = ease(1.55, 1.98, progress) * (1 - ease(2.12, 2.48, progress));
    const kick = pressure * kickWindow;
    const kickModes = this.kickResonance.update(pressure, kickWindow, ambient);
    const topChanged = this.masonry.surface.update(features, progress);
    const sidesChanged = this.masonry.sides.update(features, progress);
    this.wellLining.update(progress);
    this.wellCore.update(time, progress, features, ambient && !document.hidden && !this.app.contextLost);
    this.wellMasonry.update(progress);
    this.masonry.seams.update(features, progress, ambient && !document.hidden && !this.app.contextLost);
    const motionChanged = topChanged || sidesChanged;
    this.motionDirty ||= motionChanged;
    const stonesChanged = this.masonry.update(state.opening, time, ambient, ambient ? kick : 0, kickModes);
    // Bound corner guides follow the paving; the reading plane stays fixed.
    this.boundAnchors.forEach(({ object, binding }) => this.masonry.resolveAnchor(binding, object.position));
    const clearance = ease(.065, .125, this.masonry.clearance);
    state.emission *= clearance;
    state.reveal *= clearance;
    const { emission } = state;
    const lift = this.group.position.y;
    const index = Math.min(2, Math.floor(progress));
    const mix = Three.MathUtils.smoothstep(progress - index, 0, 1);
    const from = lighting[index];
    const to = lighting[index + 1];
    const place = (object, key) => {
      const a = from[key], b = to[key];
      object.position.set(Three.MathUtils.lerp(a[0], b[0], mix), Three.MathUtils.lerp(a[1], b[1], mix), Three.MathUtils.lerp(a[2], b[2], mix));
      object.position.y += lift;
    };
    place(this.key, "key");
    place(this.rim, "rim");
    place(this.sweep, "sweep");
    this.key.target.position.set(0, lift + 2.1, 0);
    this.rim.target.position.set(0, lift + 2.1, 0);
    place(this.sweep.target, "target");
    // Matte studio lighting stays stable: the new musical gesture is geometry.
    this.reactiveGlow = Math.min(1, kick * 1.5) * emission;
    // Barely perceptible intensity breathing, without chasing the silhouette.
    this.sweep.intensity = Three.MathUtils.lerp(from.intensity, to.intensity, mix) * (1 + Math.sin(time * .18) * .025);
    this.uniforms.uTime.value = time;
    // Core radiance keeps its approved intensity. The broad DOM projector has
    // its own quieter response; it no longer amplifies with the internal glow.
    const radiance = emission * (1 + Math.min(1, kick * 1.5) * .95);
    this.uniforms.uEmission.value = radiance;
    this.uniforms.uBeamReveal.value = emission;
    this.uniforms.uProjectionEmission.value = emission * .60 * (1 + Math.min(1, kick * 1.5) * .30);
    this.beam.scale.x = this.beam.scale.z = 1 + Math.min(1, kick * 1.5) * .05;
    this.beam.visible = emission > .001;
    this.energy.update(time, state.opening, radiance);
    // Preserve the original scroll/tip shadow refresh policy.
    const now = performance.now() / 1000;
    const active = this.masonry.surface.active || this.masonry.sides.active;
    const refresh = this.motionDirty && (!ambient || !active || now - (this.motionShadowTime || 0) >= (this.app.compact ? 1 / 15 : 1 / 30));
    if (stonesChanged || progress !== this.shadowProgress || lift !== this.shadowLift || refresh) {
      this.app.renderer.shadowMap.needsUpdate = true;
      this.motionDirty = false;
      this.motionShadowTime = now;
    }
    this.shadowProgress = progress;
    this.shadowLift = lift;
    this.reflection.update();
  }
}
