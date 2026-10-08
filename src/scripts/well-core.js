import * as Three from "three";
import { wellReveal, wellCoreRadius, wellCoreHeight } from "./crown-well.js";
import Vertex from "./shaders/well-core.vert.glsl";
import Fragment from "./shaders/well-core.frag.glsl";
import WellOrbits from "./well-orbits.js";

// An opaque black horizon and tiny grazing-angle atmosphere, not a fullscreen
// lensing pass. The isolated lead breathes its radius and thin light skin;
// fast light advection never distorts the spherical silhouette.
export default class WellCore {
  constructor(app) {
    this.app = app;
    this.group = new Three.Group();
    this.group.position.y = wellCoreHeight;
    this.uniforms = {
      uChaosTime: { value: 0 }, uWellReveal: { value: 0 }, uLeadEnergy: { value: 0 },
      uRimExposure: { value: 0 }, uRimPhase: { value: 0 }, uRimSpeed: { value: 10 },
      uShellRatio: { value: 1.025 }, uLeadBrightness: { value: 0 },
    };
    this.rimPhase = 0;
    // Even the full-lead swell plus atmosphere remains inside the former
    // .64-radius horizon, leaving more room between the core and stepped stone.
    this.highGeometry = new Three.SphereGeometry(wellCoreRadius, 64, 40);
    this.lowGeometry = new Three.SphereGeometry(wellCoreRadius, 40, 24);
    this.geometry = app.compact ? this.lowGeometry : this.highGeometry;
    this.layers = [0, 1].map(shell => {
      const material = new Three.ShaderMaterial({
        uniforms: { ...this.uniforms, uShell: { value: shell } }, vertexShader: Vertex, fragmentShader: Fragment,
        transparent: !!shell, depthTest: true, depthWrite: !shell,
        blending: shell ? Three.AdditiveBlending : Three.NormalBlending,
      });
      const mesh = new Three.Mesh(this.geometry, material);
      mesh.scale.setScalar(shell ? 1.035 : 1);
      this.group.add(mesh);
      return mesh;
    });
    this.light = new Three.PointLight(0x39ff84, 0, 2.7, 2);
    this.group.add(this.light);
    this.group.visible = false;
    this.orbits = new WellOrbits(app, this);
    this.group.add(this.orbits.mesh);
  }

  update(time, progress, features, ambient) {
    const reveal = wellReveal(progress);
    const phase = ambient ? time : 0;
    const elapsed = this.lastPhase === undefined ? 1 / 60 : phase - this.lastPhase;
    this.uniforms.uRimExposure.value = ambient ? Math.min(.05, Math.max(0, elapsed)) : 0;
    this.lastPhase = phase;
    this.group.visible = reveal > .0001;
    this.uniforms.uWellReveal.value = reveal;
    this.uniforms.uChaosTime.value = phase;
    // The mixer already follows the actual long-lead RMS (90 ms attack / 400 ms
    // release) and aligns it with output time. Do not invent a beat or onset.
    const energy = ambient ? Three.MathUtils.clamp(features.lead.level, 0, 1) : 0;
    const brightness = energy * Three.MathUtils.clamp(features.lead.brightness, 0, 1);
    const speed = 10 + energy * 18;
    if (ambient) this.rimPhase = (this.rimPhase + this.uniforms.uRimExposure.value * speed) % (Math.PI * 2);
    else this.rimPhase = 0;
    this.uniforms.uLeadEnergy.value = energy;
    this.uniforms.uLeadBrightness.value = brightness;
    this.uniforms.uRimPhase.value = this.rimPhase;
    this.uniforms.uRimSpeed.value = speed;
    this.group.scale.setScalar(1 + energy * .22);
    const shellRatio = 1.025 + energy * .025 + brightness * .006;
    this.layers[1].scale.setScalar(shellRatio);
    this.uniforms.uShellRatio.value = shellRatio;
    const geometry = this.app.compact ? this.lowGeometry : this.highGeometry;
    if (geometry !== this.geometry) {
      this.geometry = geometry;
      this.layers.forEach(mesh => { mesh.geometry = geometry; });
    }
    this.layers[1].visible = this.app.frameBudget.decorationScale > 0;
    this.light.intensity = reveal * (1.65 + energy * 1.15);
    this.orbits.update(ambient);
  }
}
