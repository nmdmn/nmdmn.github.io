import * as Three from "three";
import { seededRandom } from "./masonry-layout.js";
import Vertex from "./shaders/well-orbit.vert.glsl";
import Fragment from "./shaders/well-orbit.frag.glsl";

// Six curved shell strips, not a complete accretion disk or point-particle
// carpet. All vertices remain on small spherical orbits within the well's
// sampled stone clearance, including the black hole's maximum lead swell.
export default class WellOrbits {
  constructor(app, core) {
    this.app = app;
    this.core = core;
    this.specs = [];
    const random = seededRandom(90417);
    const tilts = [.08, -.25, .35, -.42, .18, -.32];
    const u = [], v = [], shape = [], rates = [], phases = [];
    for (let i = 0; i < 6; i++) {
      const rotation = new Three.Quaternion().setFromEuler(new Three.Euler(tilts[i], random() * Math.PI * 2, (random()-.5)*.18));
      const basisU = new Three.Vector3(1, 0, 0).applyQuaternion(rotation);
      const basisV = new Three.Vector3(0, 0, 1).applyQuaternion(rotation);
      const radius = .458 + (i % 3) * .003;
      const span = .42 + random() * .30;
      const width = .026 + random() * .015;
      const rate = (.86 + i*.065) * Math.pow(.46 / radius, 1.5);
      const phase = i / 6 * Math.PI * 2 + random() * .35;
      this.specs.push({ basisU, basisV, radius, span, width, rate, phase });
      u.push(...basisU.toArray()); v.push(...basisV.toArray());
      shape.push(radius, span, width); rates.push(rate); phases.push(phase);
    }
    const positions = [], indices = [], segments = 32;
    for (let segment = 0; segment <= segments; segment++) {
      for (const across of [-1, 0, 1]) positions.push(segment / segments, across, 0);
      if (segment === segments) continue;
      for (let row = 0; row < 2; row++) {
        const at = segment * 3 + row;
        indices.push(at, at + 3, at + 1, at + 1, at + 3, at + 4);
      }
    }
    this.geometry = new Three.InstancedBufferGeometry();
    this.geometry.setAttribute("position", new Three.Float32BufferAttribute(positions, 3));
    this.geometry.setIndex(indices);
    this.geometry.setAttribute("aOrbitU", new Three.InstancedBufferAttribute(new Float32Array(u), 3));
    this.geometry.setAttribute("aOrbitV", new Three.InstancedBufferAttribute(new Float32Array(v), 3));
    this.geometry.setAttribute("aOrbitShape", new Three.InstancedBufferAttribute(new Float32Array(shape), 3));
    this.geometry.setAttribute("aOrbitRate", new Three.InstancedBufferAttribute(new Float32Array(rates), 1));
    this.phaseAttribute = new Three.InstancedBufferAttribute(new Float32Array(phases), 1).setUsage(Three.DynamicDrawUsage);
    this.geometry.setAttribute("aOrbitPhase", this.phaseAttribute);
    this.geometry.boundingSphere = new Three.Sphere(new Three.Vector3(), .4641);
    this.uniforms = { ...core.uniforms, uOrbitShutter: { value: 0 } };
    this.mesh = new Three.Mesh(this.geometry, new Three.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: Vertex, fragmentShader: Fragment,
      transparent: true, blending: Three.AdditiveBlending, premultipliedAlpha: true,
      depthTest: true, depthWrite: false, side: Three.DoubleSide,
    }));
    this.update(false);
  }

  update(ambient) {
    const delta = this.core.uniforms.uRimExposure.value;
    const speed = this.core.uniforms.uRimSpeed.value;
    const phases = this.phaseAttribute.array;
    for (let i = 0; i < this.specs.length; i++) {
      if (!ambient) phases[i] = this.specs[i].phase;
      else if (this.core.group.visible) phases[i] = (phases[i] + delta * speed * this.specs[i].rate) % (Math.PI * 2);
    }
    this.phaseAttribute.needsUpdate = true;
    // A short integrated shutter turns high speed into curved streaks instead
    // of hard white flashes. Motion-off leaves the same static fragment seeds.
    this.uniforms.uOrbitShutter.value = ambient ? Math.min(.04, Math.max(1 / 45, delta)) : 0;
    this.geometry.instanceCount = this.app.frameBudget.decorationScale < .5 ? 3 : this.app.compact ? 4 : 6;
    this.mesh.visible = this.core.group.visible;
  }
}
