import * as Three from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import masonryLayout, { masonrySize, seededRandom, tipOpening } from "./masonry-layout.js";
import { prepareTip, tipPose } from "./tip-burst.js";
import { stoneMotionWeight, bindStoneMotion } from "./stone-motion.js";
import StoneSurface from "./stone-surface.js";
import SideSurface, { sideMotionWeights } from "./side-surface.js";
import SeamFlow, { bindSeamLight } from "./seam-flow.js";
import { bindWellClearance, wellRefines } from "./crown-well.js";

function stoneGeometry(variant, compact) {
  let geometry;
  if (variant >= 8) {
    // Each quarter has its apex on the INNER corner. Together these four
    // fragments reconstruct the small point; apart, none retains a whole cap.
    const [sx, sz] = [[-1, -1], [1, -1], [1, 1], [-1, 1]][variant - 8];
    const points = [new Three.Vector3(-sx * .49, -.49, -sz * .49), new Three.Vector3(-sx * .46, -.46, -sz * .49), new Three.Vector3(-sx * .49, -.46, -sz * .46)];
    [[-.44, .5], [.41, .5], [.5, .42], [.5, -.43], [.43, -.5], [-.41, -.5], [-.5, -.40], [-.5, .43]].forEach(([x, z], i) => points.push(new Three.Vector3(x, .5 - (i % 3) * .012, z)));
    geometry = new ConvexGeometry(points);
  } else if (compact && variant < 4) {
    const points = [];
    for (let x = -1; x <= 1; x += 2) for (let y = -1; y <= 1; y += 2) for (let z = -1; z <= 1; z += 2) {
      if (x === y && y === z) {
        for (let axis = 0; axis < 3; axis++) {
          const p = [x * .5, y * .5, z * .5];
          p[axis] *= .90 - variant * .008;
          points.push(new Three.Vector3(...p));
        }
      } else points.push(new Three.Vector3(x * .5, y * .5, z * .5));
    }
    geometry = new ConvexGeometry(points);
  } else {
    const random = seededRandom(variant * 1713 + 6821);
    const points = [];
    for (let x = -1; x <= 1; x += 2) for (let y = -1; y <= 1; y += 2) for (let z = -1; z <= 1; z += 2) {
      const bevel = (variant < 4 ? .025 : .08) + random() * (variant < 4 ? .025 : .075);
      for (let axis = 0; axis < 3; axis++) {
        const p = [x * (.5 - bevel), y * (.5 - bevel), z * (.5 - bevel)];
        p[axis] = [x, y, z][axis] * .5;
        points.push(new Three.Vector3(...p));
      }
    }
    geometry = new ConvexGeometry(points);
  }
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  const uv = [], color = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const nx = Math.abs(normals.getX(i)), ny = Math.abs(normals.getY(i)), nz = Math.abs(normals.getZ(i));
    const u = ny > nx && ny > nz ? x : nz > nx ? x : z;
    const v = ny > nx && ny > nz ? z : y;
    const angle = variant * Math.PI / 2;
    uv.push(u * Math.cos(angle) - v * Math.sin(angle) + .5 + variant * .137, u * Math.sin(angle) + v * Math.cos(angle) + .5 + variant * .173);
    // Worn chamfers expose slightly lighter stone; no emissive edge strokes.
    const wear = Math.max(nx, ny, nz) < .95 ? 1.045 : 1;
    color.push(wear, wear, wear * .985);
  }
  geometry.setAttribute("uv", new Three.Float32BufferAttribute(uv, 2));
  geometry.setAttribute("color", new Three.Float32BufferAttribute(color, 3));
  return geometry;
}

function stoneTextures() {
  const size = 128, random = seededRandom(70013);
  const height = new Float32Array(size * size);
  const color = new Uint8Array(size * size * 4), normal = new Uint8Array(size * size * 4), rough = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    const broad = Math.sin(x * Math.PI * 4 / size + Math.cos(y * Math.PI * 2 / size)) * Math.sin(y * Math.PI * 6 / size);
    height[i] = .5 + broad * .08 + (random() - .5) * .14;
    if (random() < .035) height[i] -= .16;
    const fissure = 34 + Math.sin(y * .08) * 2.8 + Math.sin(y * .021) * 4;
    if (y > 18 && y < 94 && Math.abs(x - fissure) < .65) height[i] -= .13;
  }
  const at = (x, y) => height[((y + size) % size) * size + (x + size) % size];
  const n = new Three.Vector3();
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, o = i * 4;
    const tone = Math.round(185 + height[i] * 56);
    color.set([tone, tone, tone - 4, 255], o);
    n.set((at(x - 1, y) - at(x + 1, y)) * 1.6, (at(x, y - 1) - at(x, y + 1)) * 1.6, 1).normalize();
    normal.set([Math.round((n.x * .5 + .5) * 255), Math.round((n.y * .5 + .5) * 255), Math.round((n.z * .5 + .5) * 255), 255], o);
    const r = Math.round(245 + height[i] * 8);
    rough.set([r, r, r, 255], o);
  }
  return [color, normal, rough].map((data, index) => {
    const texture = new Three.DataTexture(data, size, size);
    texture.wrapS = texture.wrapT = Three.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = Three.LinearMipmapLinearFilter;
    texture.magFilter = Three.LinearFilter;
    if (index === 0) texture.colorSpace = Three.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  });
}

export default class Masonry {
  constructor(app) {
    this.group = new Three.Group();
    this.records = masonryLayout();
    this.blocks = this.records.filter(block => !block.missing);
    this.highGeometry = Array.from({ length: 12 }, (_, i) => stoneGeometry(i, false));
    // Only intact variants 0–3 have a different compact mesh. Share the others.
    this.lowGeometry = this.highGeometry.map((geometry, i) => i < 4 ? stoneGeometry(i, true) : geometry);
    const [map, normalMap, roughnessMap] = stoneTextures();
    // Dry, porous charcoal stone: diffuse light reveals its form, while weak
    // dielectric reflection avoids silver highlights on these dark surfaces.
    this.material = new Three.MeshPhysicalMaterial({ color: 0x343a37, metalness: 0, roughness: 1, specularIntensity: .12, ior: 1.45, clearcoat: 0, map, normalMap, normalScale: new Three.Vector2(.40, .40), roughnessMap, vertexColors: true });
    this.surface = new StoneSurface();
    this.sides = new SideSurface();
    this.motionOffset = new Three.Vector3();
    this.depthMaterial = new Three.MeshDepthMaterial({ depthPacking: Three.RGBADepthPacking });
    this.depthMaterial.onBeforeCompile = shader => {
      bindStoneMotion(shader, this.surface, this.sides);
      bindWellClearance(shader, this.surface);
    };
    this.depthMaterial.customProgramCacheKey = () => "layered-stone-refined-well-depth";
    // Fine joints are smaller than a shadow texel. A little face-edge contact
    // shading keeps them legible without adding a full-screen AO pass.
    this.material.onBeforeCompile = shader => {
      bindStoneMotion(shader, this.surface, this.sides);
      bindWellClearance(shader, this.surface);
      shader.vertexShader = `varying vec3 vStoneLocal; varying vec3 vStoneNormal;\n${shader.vertexShader}`.replace("#include <begin_vertex>", "#include <begin_vertex>\nvStoneLocal = position; vStoneNormal = normal;");
      shader.fragmentShader = `varying vec3 vStoneLocal; varying vec3 vStoneNormal;\n${shader.fragmentShader}`.replace("#include <color_fragment>", `
        #include <color_fragment>
        vec3 stoneN = abs(vStoneNormal);
        vec2 stoneFace = stoneN.y > stoneN.x && stoneN.y > stoneN.z ? vStoneLocal.xz : stoneN.z > stoneN.x ? vStoneLocal.xy : vStoneLocal.zy;
        float joint = min(.5 - abs(stoneFace.x), .5 - abs(stoneFace.y));
        diffuseColor.rgb *= mix(.80, 1.0, smoothstep(.005, .045, joint));
      `);
      bindSeamLight(shader, this.seams);
    };
    this.material.customProgramCacheKey = () => "matte-weathered-layered-seam-refined-well";
    this.matrix = new Three.Matrix4();
    this.blocks.forEach(block => {
      block.restPosition = new Three.Vector3(...block.position);
      block.restQuaternion = new Three.Quaternion().setFromEuler(new Three.Euler(...block.rotation));
      block.scale = new Three.Vector3(...block.dimensions);
      block.motionWeight = stoneMotionWeight(block);
      block.sideWeights = sideMotionWeights(block);
    });
    this.moving = prepareTip(this.blocks);
    this.clearance = 0;
    this.lastOpening = -1;
    const color = new Three.Color();
    this.batches = this.highGeometry.map((geometry, variant) => {
      const records = this.blocks.filter(block => block.variant === variant).sort((a, b) => Number(!!b.burst) - Number(!!a.burst));
      const weights = new Three.InstancedBufferAttribute(new Float32Array(records.map(block => block.motionWeight)), 1);
      const sideWeights = new Three.InstancedBufferAttribute(new Float32Array(records.flatMap(block => block.sideWeights)), 3);
      const refined = new Three.InstancedBufferAttribute(new Float32Array(records.map(block => wellRefines(block) ? 1 : 0)), 1);
      geometry.setAttribute("aStoneCrown", weights);
      geometry.setAttribute("aStoneSides", sideWeights);
      geometry.setAttribute("aWellRefined", refined);
      this.lowGeometry[variant].setAttribute("aStoneCrown", weights);
      this.lowGeometry[variant].setAttribute("aStoneSides", sideWeights);
      this.lowGeometry[variant].setAttribute("aWellRefined", refined);
      const batch = new Three.InstancedMesh(geometry, this.material, records.length);
      batch.movingCount = records.filter(block => block.burst).length;
      if (batch.movingCount) batch.instanceMatrix.setUsage(Three.DynamicDrawUsage);
      batch.castShadow = batch.receiveShadow = true;
      batch.customDepthMaterial = this.depthMaterial;
      // Keep shared course batches visible in both the main and water cameras.
      batch.frustumCulled = false;
      records.forEach((block, slot) => {
        block.batch = batch;
        block.slot = slot;
        this.matrix.compose(block.restPosition, block.restQuaternion, block.scale);
        batch.setMatrixAt(slot, this.matrix);
        color.setRGB(block.tone, block.tone * .99, block.tone * .98);
        // Interior walls stay darker than the exterior casing.
        if (block.faces.length === 0 && block.course >= masonrySize.apertureCourse && block.course <= masonrySize.chamberLastCourse + 1) color.multiplyScalar(.68);
        batch.setColorAt(slot, color);
      });
      this.group.add(batch);
      return batch;
    });
    this.seams = new SeamFlow(this, app);
    this.group.add(this.seams.mesh);
  }

  resize(compact) {
    this.surface.resize(compact);
    this.sides.resize(compact);
    this.batches.forEach((batch, variant) => { batch.geometry = (compact ? this.lowGeometry : this.highGeometry)[variant]; });
  }

  update(opening, time, ambient, pulsePressure = 0, pulseModes = null) {
    pulsePressure = ambient ? Three.MathUtils.clamp(pulsePressure, 0, 1) : 0;
    if (opening === this.lastOpening && ambient === this.lastAmbient && pulsePressure === this.lastPulsePressure && (!ambient || opening === 0)) return false;
    this.clearance = tipOpening.halfMouth;
    this.moving.forEach(block => {
      tipPose(block, opening, time, ambient, block.currentPosition, block.currentQuaternion, pulsePressure, pulseModes);
      this.matrix.compose(block.currentPosition, block.currentQuaternion, block.scale);
      block.batch.setMatrixAt(block.slot, this.matrix);
      if (block.burst.detached) {
        // A circumscribed sphere conservatively gates the narrow beam even
        // when each fragment pitches, rocks or circulates around the source.
        const radius = block.scale.length() / 2;
        this.clearance = Math.min(this.clearance, Math.hypot(block.currentPosition.x, block.currentPosition.z) - radius);
      }
    });
    this.batches.forEach(batch => {
      if (!batch.movingCount) return;
      batch.instanceMatrix.clearUpdateRanges();
      batch.instanceMatrix.addUpdateRange(0, batch.movingCount * 16);
      batch.instanceMatrix.needsUpdate = true;
    });
    this.lastOpening = opening;
    this.lastAmbient = ambient;
    this.lastPulsePressure = pulsePressure;
    return true;
  }

  // Resolve guides to a surviving block, never a procedural damage hole.
  faceBinding(face, desired) {
    const turn = new Three.Matrix4().makeRotationY(face * Math.PI / 2);
    const target = desired.clone().applyMatrix4(turn);
    let nearest, distance = Infinity;
    this.blocks.filter(block => block.faces.includes(face)).forEach(block => {
      const d = block.restPosition.distanceToSquared(target);
      if (d < distance) { distance = d; nearest = block; }
    });
    const offset = new Three.Vector3();
    const axis = face % 2 === 0 ? "z" : "x";
    offset[axis] = (face < 2 ? 1 : -1) * (nearest.scale[axis] * .5 + .0015);
    return { block: nearest, offset };
  }

  topBinding(desired) {
    let nearest, distance = Infinity;
    this.blocks.forEach(block => {
      if (!block.motionWeight) return;
      const d = Math.hypot(block.restPosition.x - desired.x, block.restPosition.z - desired.z);
      if (d < distance) { distance = d; nearest = block; }
    });
    return { block: nearest, offset: new Three.Vector3(0, nearest.scale.y / 2 + .012, 0) };
  }

  resolveAnchor(binding, position) {
    position.copy(binding.offset).applyQuaternion(binding.block.currentQuaternion || binding.block.restQuaternion).add(binding.block.currentPosition || binding.block.restPosition);
    if (binding.block.motionWeight) position.add(this.surface.sample(binding.block.restPosition, this.motionOffset).multiplyScalar(binding.block.motionWeight));
    position.add(this.sides.sample(binding.block, this.motionOffset));
  }
}
