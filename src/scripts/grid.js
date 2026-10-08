import * as Three from "three";
import { createNoise3D } from "simplex-noise";
import FragmentShader from "./shaders/grid/fGrid.glsl";
import VertexShader from "./shaders/grid/vGrid.glsl";

export class Grid {
  constructor(app, ui) {
    this.app = app;
    this.ui = ui;
    this.shader = this.initShader();
    this.geometry = this.initGeometry(100, 100);

    this.mesh = new Three.Points(this.geometry, this.shader);
    this.app.scene.add(this.mesh);

    this.app.addUpdateCallback((deltaTime, time) => {
      this.shader.uniforms["time"].value = time;
      this.shader.uniforms["deltaTime"].value = deltaTime;
      this.shader.uniforms["scroll"].value = window.scrollY;
      this.shader.uniforms["alpha"].value = ui.alpha.value;
    });
  }

  initShader() {
    return new Three.ShaderMaterial({
      side: Three.DoubleSide,
      blending: Three.AdditiveBlending,
      clipping: false,
      fog: false,
      wireframe: true,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      extensions: {
        derivates: "#extensions GL_OES_standard_derivates : enable",
        //fragDepth : true,
        //drawBuffers : true,
        //shaderTextureLOD : true,
      },
      uniforms: {
        time: { type: "f", value: this.app.timer.getElapsed() },
        deltaTime: { type: "f", value: this.app.timer.getDelta() },
        scroll: { type: "f", value: window.scrollY },
        alpha: { type: "f", value: this.ui.alpha.value },
      },
      vertexShader: VertexShader,
      fragmentShader: FragmentShader,
    });
  }

  initGeometry(size, resolution) {
    const geometry = new Three.PlaneGeometry(size, size, resolution, resolution);
    const posArrayLen = geometry.attributes.position.array.length;
    const numVertices = posArrayLen / 3;
    const noisePerVertex = new Float32Array(numVertices);
    const sampler = new createNoise3D();
    sampler.perlin_octaves = 8;
    for (let i = 0; i < posArrayLen; i += 3) {
      const scale = .3;
      const noise =
        sampler(geometry.attributes.position.array[i] * scale,
          geometry.attributes.position.array[i + 1] * scale,
          geometry.attributes.position.array[i + 2] * scale);
      noisePerVertex.set([noise], i / 3);
    }

    geometry.setAttribute("noise", new Three.BufferAttribute(noisePerVertex, 1));
    return geometry;
  }
}
