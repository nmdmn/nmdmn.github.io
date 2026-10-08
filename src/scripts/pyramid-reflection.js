import * as Three from "three";
import { masonrySize } from "./masonry-layout.js";
import ReflectionVertex from "./shaders/pyramid-reflection.vert.glsl";
import ReflectionFragment from "./shaders/pyramid-reflection.frag.glsl";

// A six-triangle stand-in, mirrored across Y=0. Small weighted screen-space
// copies wash out its edges in ONE draw, without a texture or second camera.
export default class PyramidReflection {
  constructor(app, source) {
    this.source = source;
    this.mirror = new Three.Matrix4().makeScale(1, -1, 1);
    const { halfWidth: w, tip, top } = masonrySize;
    const apex = [0, tip, 0];
    const corners = [[-w, top, w], [w, top, w], [w, top, -w], [-w, top, -w]];
    const vertices = [];
    for (let face = 0; face < 4; face++) vertices.push(...apex, ...corners[(face + 1) % 4], ...corners[face]);
    vertices.push(...corners[0], ...corners[1], ...corners[2], ...corners[0], ...corners[2], ...corners[3]);
    const base = new Three.BufferGeometry();
    base.setAttribute("position", new Three.Float32BufferAttribute(vertices, 3));
    base.computeVertexNormals();
    const samples = [];
    let total = 0;
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
      const weight = Math.exp(-(x * x + y * y) / 2);
      total += weight;
      samples.push([x, y, weight]);
    }
    const positions = [], normals = [], blur = [];
    for (const [x, y, weight] of samples) {
      positions.push(...vertices);
      normals.push(...base.attributes.normal.array);
      for (let vertex = 0; vertex < vertices.length / 3; vertex++) blur.push(x, y, weight / total);
    }
    base.dispose();
    this.geometry = new Three.BufferGeometry();
    this.geometry.setAttribute("position", new Three.Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute("normal", new Three.Float32BufferAttribute(normals, 3));
    this.geometry.setAttribute("aBlur", new Three.Float32BufferAttribute(blur, 3));
    this.uniforms = {
      uPixel: { value: new Three.Vector2() },
      uColor: { value: new Three.Color(0x626960) },
      uRange: { value: new Three.Vector2(tip, top) },
    };
    this.mesh = new Three.Mesh(this.geometry, new Three.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: ReflectionVertex, fragmentShader: ReflectionFragment,
      transparent: true, depthWrite: false, toneMapped: false,
    }));
    this.mesh.name = "Soft pyramid reflection";
    this.mesh.matrixAutoUpdate = false;
    // The shader's small pixel offsets lie outside the unshifted geometry.
    this.mesh.frustumCulled = false;
    app.scene.add(this.mesh);
    this.resize(app);
  }

  resize(app) {
    // Four CSS pixels per blur step; softness is independent of device DPR.
    this.uniforms.uPixel.value.set(8 / app.width, 8 / app.height);
  }

  update() {
    this.source.updateWorldMatrix(true, false);
    this.mesh.matrix.multiplyMatrices(this.mirror, this.source.matrixWorld);
    this.mesh.matrixWorldNeedsUpdate = true;
  }
}
