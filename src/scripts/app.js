import * as Three from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { FXAAPass } from "three/examples/jsm/postprocessing/FXAAPass.js";
import FiniteFragment from "./shaders/finite.frag.glsl";
import FinishFragment from "./shaders/finish.frag.glsl";
import BloomExtractFragment from "./shaders/bloom-extract.frag.glsl";
import BloomBlendFragment from "./shaders/bloom-blend.frag.glsl";
import WellHazeFragment from "./shaders/well-haze.glsl";
import { wellHazeUniforms } from "./well-haze.js";
import FrameBudget from "./frame-budget.js";
import { readViewport } from "./viewport.js";

const screenVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export class App {
  constructor(canvas, camera) {
    this.canvas = document.querySelector(canvas);
    this.camera = camera;
    this.scene = new Three.Scene();
    this.scene.background = new Three.Color(0xfafaf8);
    this.updateCallbacks = [];
    this.resizeCallbacks = [];
    this.contextCallbacks = [];
    this.detailCallbacks = [];
    this.frameBudget = new FrameBudget();
    this.animate = true;
    this.started = false;
    this.frame = null;
    this.time = 0;
    this.previousTime = performance.now();
    this.renderer = new Three.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0xfafaf8);
    this.renderer.outputColorSpace = Three.SRGBColorSpace;
    this.renderer.toneMapping = Three.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = Three.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    // Paper is below the HDR threshold: only emissive details bloom, not the
    // entire white scene. Sanitize BEFORE convolution, not only afterwards.
    const target = new Three.WebGLRenderTarget(1, 1, { type: Three.HalfFloatType, samples: 0 });
    // Both composer buffers own separate depth attachments. The finite/haze
    // pass reads only the scene input's depth while writing the OTHER buffer.
    target.depthTexture = new Three.DepthTexture(1, 1, Three.UnsignedIntType);
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.finite = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, ...wellHazeUniforms() }, vertexShader: screenVertex,
      fragmentShader: FiniteFragment.replace("#include <well_haze>", WellHazeFragment),
    });
    this.finite.material.depthTest = this.finite.material.depthWrite = false;
    const renderFinite = this.finite.render.bind(this.finite);
    this.finite.render = (renderer, writeBuffer, readBuffer, ...args) => {
      this.finite.uniforms.tSceneDepth.value = readBuffer.depthTexture;
      renderFinite(renderer, writeBuffer, readBuffer, ...args);
    };
    this.composer.addPass(this.finite);
    this.bloom = new UnrealBloomPass(new Three.Vector2(1, 1), .32, .18, 1.18);
    // Soft HDR-only extraction. Paper remains below the entire knee, while
    // musical fades enter bloom smoothly instead of crossing a hard cutoff.
    this.bloom.highPassUniforms.smoothWidth.value = .24;
    this.bloom.materialHighPassFilter.fragmentShader = BloomExtractFragment;
    this.bloom.compositeMaterial.uniforms.bloomFactors.value = [1, .82, .40, .14, .04];
    this.bloom.blendMaterial.fragmentShader = BloomBlendFragment;
    this.bloom.blendMaterial.blending = Three.NormalBlending;
    this.bloom.blendMaterial.premultipliedAlpha = false;
    this.bloom.copyUniforms.tScene = { value: null };
    const renderBloom = this.bloom.render.bind(this.bloom);
    this.bloom.render = (...args) => {
      // The pre-finite scene lives in the OTHER composer buffer until the
      // finish pass. Sample it without copying or reading our write target.
      this.bloom.copyUniforms.tScene.value = this.finite.uniforms.tDiffuse.value;
      renderBloom(...args);
    };
    this.composer.addPass(this.bloom);
    this.finish = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGlow: { value: 0 } },
      vertexShader: screenVertex, fragmentShader: FinishFragment,
    });
    this.composer.addPass(this.finish);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new FXAAPass());
    this.tick = this.tick.bind(this);
    this.onResize();

    window.addEventListener("resize", () => this.onResize());
    document.addEventListener("visibilitychange", () => {
      this.frameBudget.reset();
      if (document.hidden) {
        cancelAnimationFrame(this.frame);
        this.frame = null;
      } else {
        this.previousTime = performance.now();
        this.invalidate();
      }
    });
    this.canvas.addEventListener("webglcontextlost", event => {
      event.preventDefault();
      this.contextLost = true;
      this.frameBudget.reset();
      cancelAnimationFrame(this.frame);
      this.frame = null;
      document.body.classList.add("webgl-unavailable");
      this.contextCallbacks.forEach(callback => callback(false));
    });
    this.canvas.addEventListener("webglcontextrestored", () => {
      this.contextLost = false;
      document.body.classList.remove("webgl-unavailable");
      this.contextCallbacks.forEach(callback => callback(true));
      this.onResize(true);
    });
  }

  addUpdateCallback(callback) { this.updateCallbacks.push(callback); }
  addResizeCallback(callback) { this.resizeCallbacks.push(callback); }
  addContextCallback(callback) { this.contextCallbacks.push(callback); }
  addDetailCallback(callback) { this.detailCallbacks.push(callback); }

  async waitForGPU() {
    const gl = this.renderer.getContext();
    const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!fence) throw new Error("Could not complete GPU preparation.");
    gl.flush();
    try {
      await new Promise((resolve, reject) => {
        const check = () => {
          if (this.contextLost || window.__startup?.expired) {
            reject(new Error("GPU preparation interrupted."));
            return;
          }
          const status = gl.clientWaitSync(fence, 0, 0);
          if (status === gl.WAIT_FAILED) reject(new Error("GPU preparation failed."));
          else if (status === gl.TIMEOUT_EXPIRED) setTimeout(check, 8);
          else resolve();
        };
        check();
      });
    } finally {
      gl.deleteSync(fence);
    }
  }

  onResize(force = false) {
    const { width, height } = readViewport();
    const compact = width / height < 1.15;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.5);
    if (!force && width === this.width && height === this.height && pixelRatio === this.pixelRatio) return;
    this.frameBudget.reset();
    this.width = width;
    this.height = height;
    this.compact = compact;
    document.documentElement.dataset.layout = this.compact ? "compact" : "wide";
    // Bound device density without forcing large viewports below native
    // resolution to fit a fixed pixel-area budget.
    const ratioChanged = pixelRatio !== this.pixelRatio;
    this.pixelRatio = pixelRatio;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    if (ratioChanged) this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height);
    if (ratioChanged) this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(this.width, this.height);
    this.resizeCallbacks.forEach(callback => callback());
    this.invalidate();
  }

  setAnimation(enabled) {
    if (this.animate !== enabled) {
      this.frameBudget.reset();
      this.previousTime = performance.now();
    }
    this.animate = enabled;
    this.invalidate();
  }

  invalidate() {
    if (this.started && this.frame === null && !document.hidden && !this.contextLost) this.frame = requestAnimationFrame(this.tick);
  }

  tick(now) {
    this.frame = null;
    const interval = (now - this.previousTime) / 1000;
    if (this.animate && this.started && this.frameBudget.sample(interval)) {
      this.detailCallbacks.forEach(callback => callback(this.frameBudget.decorationScale));
    }
    const delta = Math.max(0, Math.min(interval, .05));
    this.previousTime = now;
    if (this.animate) this.time += delta;
    this.updateCallbacks.forEach(callback => callback(delta, this.time));
    this.finish.uniforms.uTime.value = this.time;
    const grainFrame = Math.floor(this.time * 8);
    if (grainFrame !== this.grainFrame) {
      this.grainFrame = grainFrame;
      document.documentElement.style.setProperty("--grain-x", `${grainFrame * 37 % 173}px`);
      document.documentElement.style.setProperty("--grain-y", `${grainFrame * 53 % 191}px`);
    }
    this.composer.render(delta);
    if (this.animate) this.invalidate();
  }

  start() { this.started = true; this.previousTime = performance.now(); this.invalidate(); }
}
