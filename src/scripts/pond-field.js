import * as Three from "three";
import { seededRandom } from "./masonry-layout.js";
import { chapterWeights } from "./choreography.js";
import PondMotion from "./shaders/pond-motion.glsl";
import ParticleVertex from "./shaders/pond-particles.vert.glsl";
import ParticleFragment from "./shaders/pond-particles.frag.glsl";

export const pondNoteCapacity = 4;
export { PondMotion };

// Analytic, audio-clock consequences of the instrument. Random pond drops
// remain an entirely separate system with their original visible-time clock.
export default class PondField {
  constructor(app) {
    this.app = app;
    this.weights = {};
    this.rank = new Float32Array(pondNoteCapacity);
    this.point = new Three.Vector3();
    this.frustum = new Three.Frustum();
    this.viewProjection = new Three.Matrix4();
    this.bounds = new Three.Box3();
    this.uniforms = {
      uMusicChord: { value: new Three.Vector4(0, 0, 0, 1) },
      uMusicBass: { value: 0 },
      uMusicNotes: { value: Array.from({ length: pondNoteCapacity }, () => new Three.Vector4()) },
      uMusicNoteCount: { value: 0 }, uMusicReveal: { value: 0 },
      uMusicCenter: { value: new Three.Vector2() }, uMusicTurn: { value: new Three.Vector2(1, 0) },
      uMusicPanels: { value: Array.from({ length: 4 }, () => new Three.Vector4(2, 2, 2, 2)) },
      uMusicSafeArea: { value: new Three.Vector4(0, 0, 1, 1) },
      uPixelRatio: { value: app.pixelRatio },
    };
    const random = seededRandom(62081), positions = [], seeds = [];
    for (let i = 0; i < 576; i++) {
      const cell = i * 37 % 576;
      positions.push(((cell % 24 + random()) / 24 - .5) * 5.4,
        .025 + random() * .10, ((Math.floor(cell / 24) + random()) / 24 - .5) * 5.4);
      seeds.push(random());
    }
    const geometry = new Three.BufferGeometry();
    geometry.setAttribute("position", new Three.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new Three.Float32BufferAttribute(seeds, 1));
    geometry.computeBoundingBox();
    geometry.boundingBox.expandByVector(new Three.Vector3(.12, .04, .12));
    geometry.computeBoundingSphere();
    geometry.boundingSphere.radius += .18;
    this.points = new Three.Points(geometry, new Three.ShaderMaterial({
      uniforms: this.uniforms, defines: { POND_NOTE_CAPACITY: pondNoteCapacity },
      vertexShader: `${PondMotion}\n${ParticleVertex}`, fragmentShader: ParticleFragment,
      transparent: true, depthWrite: false, depthTest: true,
    }));
    this.points.visible = false;
    app.scene.add(this.points);
    app.addDetailCallback(() => this.resize());
    this.resize();
  }

  resize() {
    this.count = Math.floor((this.app.compact ? 192 : 576) * this.app.frameBudget.decorationScale);
    this.points.geometry.setDrawRange(0, this.count);
    if (!this.count) this.points.visible = false;
    this.uniforms.uPixelRatio.value = this.app.pixelRatio;
    const header = document.querySelector(".header").getBoundingClientRect();
    const footer = document.querySelector(".status-bar").getBoundingClientRect();
    this.uniforms.uMusicSafeArea.value.set(header.left / this.app.width, footer.height / this.app.height,
      header.right / this.app.width, 1 - header.height / this.app.height);
  }

  update(features, progress, pyramid, enabled) {
    const weights = chapterWeights(progress, this.weights);
    const uniforms = this.uniforms;
    uniforms.uMusicCenter.value.set(pyramid.position.x, pyramid.position.z);
    uniforms.uMusicTurn.value.set(Math.cos(pyramid.rotation.y), Math.sin(pyramid.rotation.y));
    this.points.position.set(pyramid.position.x, 0, pyramid.position.z);
    this.points.rotation.y = pyramid.rotation.y;
    let inView = false;
    if (enabled && weights.pond > .0001) {
      this.app.camera.updateMatrixWorld();
      this.points.updateWorldMatrix(true, false);
      this.frustum.setFromProjectionMatrix(this.viewProjection.multiplyMatrices(this.app.camera.projectionMatrix, this.app.camera.matrixWorldInverse));
      this.bounds.copy(this.points.geometry.boundingBox).applyMatrix4(this.points.matrixWorld);
      inView = this.frustum.intersectsBox(this.bounds);
    }
    uniforms.uMusicReveal.value = inView ? weights.pond : 0;
    uniforms.uMusicNoteCount.value = 0;
    uniforms.uMusicChord.value.set(0, 0, 0, 1);
    uniforms.uMusicBass.value = 0;
    uniforms.uMusicNotes.value.forEach(note => note.set(0, 0, 0, 0));
    this.rank.fill(0);
    if (uniforms.uMusicReveal.value > .0001) {
      let x = 0, z = 0, total = 0, spread = 0;
      for (const note of features.pads.midi.active) {
        const strength = note.strength * weights.pads;
        x += note.x * strength; z += note.z * strength;
        spread += note.radius * strength; total += strength;
      }
      if (total > .0001) uniforms.uMusicChord.value.set(x / total, z / total, Math.min(.65, total * .35), 1.1 + spread / total);
      // Retain the four strongest recent audible note consequences, without an
      // event queue, changing sources, or borrowing future/past startup notes.
      for (const note of features.sequence.midi.recent) {
        const strength = note.echo * weights.sequence;
        for (let i = 0; i < pondNoteCapacity; i++) {
          if (strength <= this.rank[i]) continue;
          for (let j = pondNoteCapacity - 1; j > i; j--) {
            this.rank[j] = this.rank[j - 1];
            uniforms.uMusicNotes.value[j].copy(uniforms.uMusicNotes.value[j - 1]);
          }
          this.rank[i] = strength;
          uniforms.uMusicNotes.value[i].set(note.x, note.z, note.age, strength);
          break;
        }
      }
      uniforms.uMusicNoteCount.value = this.rank.reduce((count, strength) => count + Number(strength > .0001), 0);
      // The isolated bass supplies its own low-end envelope. No fabricated
      // pitch or additional audio channel is introduced for it.
      uniforms.uMusicBass.value = features.bass.level * .55 + features.bass.midi.pulse * .15;
    }
    const active = uniforms.uMusicReveal.value > .001 &&
      (uniforms.uMusicChord.value.z + uniforms.uMusicBass.value + this.rank[0]) > .001;
    // Silence also takes the water shader's zero-work branch, not just the
    // particles' visibility branch. The independent drop field is untouched.
    if (!active) uniforms.uMusicReveal.value = 0;
    // Reducing optional motes never suppresses the musical reflection field.
    this.points.visible = active && this.count > 0;
  }

  updateMasks(projections, camera) {
    if (!this.points.visible) return;
    projections.items.forEach((item, index) => {
      const bounds = this.uniforms.uMusicPanels.value[index];
      bounds.set(2, 2, 2, 2);
      if (!projections.enabled || !item.visible) return;
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      for (let corner = 0; corner < 4; corner++) {
        this.point.set((corner % 2 ? 1 : -1) * item.worldWidth / 2,
          (corner < 2 ? 1 : -1) * item.worldHeight / 2, 0).applyMatrix4(item.plane.matrixWorld).project(camera);
        const x = this.point.x * .5 + .5, y = this.point.y * .5 + .5;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      bounds.set(minX, minY, maxX, maxY);
    });
  }
}
