import * as Three from "three";
import { wellReveal } from "./crown-well.js";

export function wellHazeUniforms() {
  return {
    tSceneDepth: { value: null },
    uHazeInverseProjection: { value: new Three.Matrix4() },
    uHazeViewToWell: { value: new Three.Matrix4() },
    uHazeOrigin: { value: new Three.Vector3() },
    uWellHazeDrift: { value: new Three.Vector2() },
    uWellHazeReveal: { value: 0 }, uWellHazeTime: { value: 0 },
    uWellHazePressure: { value: 0 }, uWellHazeSteps: { value: 12 },
    uWellHazeCoreRadius: { value: .43 },
  };
}

// A local, scene-depth-terminated volume integrated into the existing pre-bloom
// finite pass. No fog on the paper, extra scene render, or extra composer pass.
export default class WellHaze {
  constructor(app, group, core) {
    this.app = app;
    this.group = group;
    this.core = core;
    this.uniforms = app.finite.uniforms;
  }

  update(time, progress, features, ambient) {
    const uniforms = this.uniforms;
    uniforms.uWellHazeReveal.value = wellReveal(progress);
    if (uniforms.uWellHazeReveal.value < .0001) return;
    this.group.updateWorldMatrix(true, false);
    this.app.camera.updateWorldMatrix(true, false);
    // Compose the frame-constant camera transform once on CPU, not per pixel.
    uniforms.uHazeViewToWell.value.copy(this.group.matrixWorld).invert().multiply(this.app.camera.matrixWorld);
    uniforms.uHazeOrigin.value.setFromMatrixPosition(uniforms.uHazeViewToWell.value);
    uniforms.uHazeInverseProjection.value.copy(this.app.camera.projectionMatrixInverse);
    uniforms.uWellHazeTime.value = ambient ? time : 0;
    const phase = uniforms.uWellHazeTime.value;
    uniforms.uWellHazeDrift.value.set(Math.sin(phase*.13)*.06, Math.cos(phase*.11)*.06);
    uniforms.uWellHazePressure.value = ambient ? Three.MathUtils.clamp(features.lead.level, 0, 1) : 0;
    uniforms.uWellHazeCoreRadius.value = this.core.geometry.parameters.radius * this.core.group.scale.x;
    const detail = this.app.frameBudget.decorationScale;
    uniforms.uWellHazeSteps.value = this.app.compact || detail < .5 ? 6 : 8;
  }
}
