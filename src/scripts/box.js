import * as Three from "three";
import { createNoise3D } from "simplex-noise";
import FragmentShader from "./shaders/box/fBox.glsl";
import VertexShader from "./shaders/box/vBox.glsl";
import { BufferObject } from "./app.js"

export class Box {
  constructor(app, ui) {
    this.app = app;
    this.ui = ui;
    this.shader = this.initShader();
    this.geometry = this.initGeometry(5, 4);

    this.mesh = new Three.Points(this.geometry, this.shader);
    this.app.scene.add(this.mesh);

    this.app.addUpdateCallback((deltaTime, time) => {
      this.mesh.rotation.x = ((time % 20) / 20) * (Math.PI * 2);
      this.mesh.rotation.z = ((time % 30) / 30) * (Math.PI * 2);
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
      wireframe: false,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      extensions: {
        derivates: "#extensions GL_OES_standard_derivates : enable",
        //fragDepth : false,
        //drawBuffers : true,
        //haderTextureLOD : false,
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
    const unit = size / resolution;
    const numVertices = resolution ** 3;                  // NOTE its a cube
    const positionVBO = new BufferObject(numVertices, 3); // NOTE 3d positions, num of comps per vertex is 3
    const noiseVBO = new BufferObject(numVertices, 1);    // NOTE its a single float normalized
    const sampler = new createNoise3D();
    sampler.perlin_octaves = 8;
    const offset = 3.;
    for (let nY = 0; nY < resolution; nY++) {
      for (let nZ = 0; nZ < resolution; nZ++) {
        for (let nX = 0; nX < resolution; nX++) {
          const x = (nX + .5) * unit - size / 2;
          const y = (nY + .5) * unit - size / 2;
          const z = (nZ + .5) * unit - size / 2;
          positionVBO.add([x, y, z]);
          noiseVBO.add([sampler(x * offset, y * offset, z * offset)]);
        }
      }
    }
    return new Three.BufferGeometry()
      .setAttribute("position", new Three.BufferAttribute(positionVBO.dataArray, positionVBO.numComponents))
      .setAttribute("noise", new Three.BufferAttribute(noiseVBO.dataArray, noiseVBO.numComponents));
  }
}
