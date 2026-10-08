import * as Three from "three";
import { courseHeight, masonrySize, tipOpening } from "./masonry-layout.js";
import { ease } from "./tip-burst.js";

const axes = ["x", "y", "z"];

const vertex = `
  varying vec2 vUv;
  varying vec3 vLocal;
  void main() {
    vUv = uv; vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fieldFragment = `
  uniform float uTime;
  uniform float uEmission;
  uniform float uMiddle;
  varying vec2 vUv;
  varying vec3 vLocal;
  void main() {
    float heightFade = 1.0 - smoothstep(.65, uMiddle, vLocal.y);
    float edges = smoothstep(0.0, .055, min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y)));
    float pockets = .5 + .5 * sin(vLocal.x * 13.0 + sin(vLocal.z * 11.0) + vLocal.y * 17.0 + uTime * .19);
    float grain = .82 + .18 * sin(vLocal.z * 37.0 - vLocal.x * 29.0 + vLocal.y * 31.0);
    float density = (.38 + .62 * pockets * pockets) * grain;
    // This lining is recessed behind the real blocks. Their depth, not a
    // painted emissive brick texture, exposes the field through open joints.
    gl_FragColor = vec4(vec3(.06, 2.6, .30) * (.68 + density * .32),
       min(.92, edges * heightFade * density * uEmission * .68));
  }
`;
const coreFragment = `
  uniform float uTime;
  uniform float uEmission;
  varying vec2 vUv;
  varying vec3 vLocal;
  void main() {
    float ends = smoothstep(0.0, .18, vUv.y) * (1.0 - smoothstep(.68, 1.0, vUv.y));
    float folds = .5 + .5 * sin(vUv.x * 18.85 + sin(vUv.y * 11.0 - uTime * .24) * 1.3);
    float pulse = .88 + .12 * sin(vUv.y * 7.0 - uTime * .31);
    gl_FragColor = vec4(vec3(.09, 2.7, .40) * pulse,
       min(.78, ends * (.13 + folds * .19) * uEmission));
  }
`;
const rayVertex = `
  attribute float strength;
  varying float vStrength;
  varying vec2 vUv;
  void main() {
    vStrength = strength; vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const rayFragment = `
  uniform float uTime;
  uniform float uEmission;
  varying float vStrength;
  varying vec2 vUv;
  void main() {
    float crossFade = exp(-pow((vUv.x - .5) * 5.0, 2.0));
    float along = smoothstep(0.0, .06, vUv.y) * (1.0 - smoothstep(.2, 1.0, vUv.y));
    float pulse = .90 + .10 * sin(uTime * .27 + vStrength * 13.0);
     vec3 radiance = vec3(.05, 1.8, .25) * (1.0 + max(0.0, uEmission - 1.0) * .45);
     gl_FragColor = vec4(radiance, min(.78, crossFade * along * vStrength * pulse * uEmission * .42));
  }
`;

function material(uniforms, fragmentShader, vertexShader = vertex) {
  return new Three.ShaderMaterial({ uniforms, vertexShader, fragmentShader,
    transparent: true, depthTest: true, depthWrite: false, side: Three.DoubleSide });
}

// An energy lining, not another pyramid shell: four recessed walls and a
// horizontal layer per loosened course. Opaque masonry masks both the lining
// and the core in the main camera. All of this is excluded from reflection.
export default class TipEnergy {
  constructor(masonry, camera, uniforms) {
    this.masonry = masonry;
    this.camera = camera;
    this.uniforms = { ...uniforms, uMiddle: { value: tipOpening.middleY } };
    this.group = new Three.Group();
    this.courses = [];
    for (let course = tipOpening.detachedCourses; course < masonrySize.apertureCourse; course++) {
      const stones = masonry.moving.filter(block => block.course === course);
      if (!stones.length) continue;
      this.courses.push({ course, stones, influence: stones[0].burst.influence });
    }
    this.fieldGeometry = new Three.BufferGeometry();
    const count = this.courses.length * 5 * 4;
    this.fieldPositions = new Float32Array(count * 3);
    const uv = [], indices = [];
    for (let i = 0; i < count / 4; i++) {
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      const base = i * 4;
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    this.fieldGeometry.setAttribute("position", new Three.BufferAttribute(this.fieldPositions, 3).setUsage(Three.DynamicDrawUsage));
    this.fieldGeometry.setAttribute("uv", new Three.Float32BufferAttribute(uv, 2));
    this.fieldGeometry.setIndex(indices);
    this.field = new Three.Mesh(this.fieldGeometry, material(this.uniforms, fieldFragment));
    this.field.frustumCulled = false;
    this.group.add(this.field);

    const height = tipOpening.middleY + .2;
    const coreGeometry = new Three.CylinderGeometry(.10, .24, height, 32, 20, true);
    coreGeometry.translate(0, height / 2 - .25, 0);
    this.core = new Three.Mesh(coreGeometry, material(this.uniforms, coreFragment));
    this.group.add(this.core);

    // Joint bindings follow actual neighbouring exterior stones, including
    // their deterministic separation. Not screen-space spokes or a starburst.
    this.bindings = [];
    this.courses.filter(item => item.course % 2 === 0).forEach(({ course, stones, influence }) => {
      for (let face = 0; face < 4; face++) {
        const along = face % 2 === 0 ? "x" : "z";
        const wall = stones.filter(block => block.faces.includes(face)).sort((a, b) => a.restPosition[along] - b.restPosition[along]);
        if (wall.length < 2) continue;
        const index = Math.min(wall.length - 2, Math.floor((wall.length - 1) * (.28 + ((course + face * 3) % 5) * .11)));
        this.bindings.push({ a: wall[index], b: wall[index + 1], face, along, influence, seed: wall[index].seed });
      }
    });
    this.rayCount = this.bindings.length + 7;
    this.rayPositions = new Float32Array(this.rayCount * 12);
    this.rayStrength = new Float32Array(this.rayCount * 4);
    const rayUv = [], rayIndices = [];
    for (let i = 0; i < this.rayCount; i++) {
      rayUv.push(0, 0, 1, 0, 1, 1, 0, 1);
      const base = i * 4;
      rayIndices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    this.rayGeometry = new Three.BufferGeometry();
    this.rayGeometry.setAttribute("position", new Three.BufferAttribute(this.rayPositions, 3).setUsage(Three.DynamicDrawUsage));
    this.rayGeometry.setAttribute("uv", new Three.Float32BufferAttribute(rayUv, 2));
    this.rayGeometry.setAttribute("strength", new Three.BufferAttribute(this.rayStrength, 1).setUsage(Three.DynamicDrawUsage));
    this.rayGeometry.setIndex(rayIndices);
    this.rays = new Three.Mesh(this.rayGeometry, material(this.uniforms, rayFragment, rayVertex));
    this.rays.frustumCulled = false;
    this.group.add(this.rays);

    // Short-range diffuse spill; these lights have no specular workaround or
    // extra shadow cubemaps. The solid depth-masked field supplies the cracks.
    this.lights = [[.48, 1.35, 1.8], [.98, .60, 1.35], [1.43, .18, 1.05]].map(([y, intensity, range]) => {
      const light = new Three.PointLight(0x56ef81, 0, range, 2);
      light.position.y = y;
      light.energyIntensity = intensity;
      this.group.add(light);
      return light;
    });
    this.blockers = masonry.moving.map(block => ({ block, inverse: new Three.Quaternion(), radius: block.scale.length() / 2 }));
    this.localCamera = new Three.Vector3();
    this.inverseWorld = new Three.Matrix4();
    this.start = new Three.Vector3(); this.end = new Three.Vector3();
    this.edgeA = new Three.Vector3(); this.edgeB = new Three.Vector3();
    this.normal = new Three.Vector3(); this.direction = new Three.Vector3();
    this.side = new Three.Vector3(); this.view = new Three.Vector3();
    this.localOrigin = new Three.Vector3(); this.localDirection = new Three.Vector3();
    this.lastOpening = -1;
    this.group.visible = false;
  }

  updateField(opening) {
    if (opening === this.lastOpening) return;
    const travel = ease(0, 1, opening);
    let offset = 0;
    const quad = points => { points.forEach(point => { this.fieldPositions.set(point, offset); offset += 3; }); };
    this.courses.forEach(({ course, influence }) => {
      const radius = masonrySize.halfWidth * (course + 1) / masonrySize.courses + .18 * influence * travel * Math.SQRT1_2 - .045;
      const lower = masonrySize.tip + course * courseHeight - .022 * influence * travel;
      const upper = lower + courseHeight;
      quad([[-radius, lower, radius], [radius, lower, radius], [radius, upper, radius], [-radius, upper, radius]]);
      quad([[radius, lower, radius], [radius, lower, -radius], [radius, upper, -radius], [radius, upper, radius]]);
      quad([[radius, lower, -radius], [-radius, lower, -radius], [-radius, upper, -radius], [radius, upper, -radius]]);
      quad([[-radius, lower, -radius], [-radius, lower, radius], [-radius, upper, radius], [-radius, upper, -radius]]);
      // Keep the horizontal lining tucked within the narrower lower course.
      const inner = radius - masonrySize.halfWidth / masonrySize.courses;
      quad([[-inner, lower, inner], [inner, lower, inner], [inner, lower, -inner], [-inner, lower, -inner]]);
    });
    this.fieldGeometry.attributes.position.needsUpdate = true;
    this.lastOpening = opening;
  }

  // Clip each shaft against the actual current stone boxes. Camera depth also
  // masks its soft edges, so an escaping ray cannot run through a fragment.
  clearLength(start, direction, length) {
    for (const { block, inverse, radius } of this.blockers) {
      const position = block.currentPosition;
      this.localOrigin.copy(start).sub(position);
      const along = this.localOrigin.dot(direction);
      if (along > radius || along < -length - radius || this.localOrigin.lengthSq() - along * along > radius * radius) continue;
      this.localOrigin.applyQuaternion(inverse);
      this.localDirection.copy(direction).applyQuaternion(inverse);
      let near = 0, far = length, missed = false;
      for (const axis of axes) {
        const origin = this.localOrigin[axis], ray = this.localDirection[axis], half = block.scale[axis] / 2 + .001;
        if (Math.abs(ray) < .000001) { if (Math.abs(origin) > half) { missed = true; break; } continue; }
        const a = (-half - origin) / ray, b = (half - origin) / ray;
        near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
        if (near > far) { missed = true; break; }
      }
      if (!missed) length = Math.min(length, Math.max(0, near - .003));
    }
    return length;
  }

  writeRay(index, start, direction, length, strength, width) {
    length = strength > .001 ? this.clearLength(start, direction, length) : 0;
    this.end.copy(start).addScaledVector(direction, length);
    this.view.copy(this.localCamera).sub(start).addScaledVector(direction, -length / 2);
    this.side.crossVectors(direction, this.view);
    if (this.side.lengthSq() < .000001) this.side.set(1, 0, 0);
    this.side.normalize();
    const offset = index * 12, taper = .0025;
    const data = this.rayPositions;
    for (let axis = 0; axis < 3; axis++) {
      const a = start.getComponent(axis), b = this.end.getComponent(axis), side = this.side.getComponent(axis);
      data[offset + axis] = a - side * taper; data[offset + 3 + axis] = a + side * taper;
      data[offset + 6 + axis] = b + side * width; data[offset + 9 + axis] = b - side * width;
    }
    this.rayStrength.fill(length > .035 ? strength : 0, index * 4, index * 4 + 4);
  }

  update(time, opening, emission) {
    this.group.visible = emission > .001;
    this.lights.forEach(light => { light.intensity = emission * light.energyIntensity * (.95 + .05 * Math.sin(time * .23 + light.position.y * 3)); });
    if (!this.group.visible) return;
    this.updateField(opening);
    this.group.updateWorldMatrix(true, false);
    this.localCamera.copy(this.camera.position).applyMatrix4(this.inverseWorld.copy(this.group.matrixWorld).invert());
    this.blockers.forEach(record => { record.inverse.copy(record.block.currentQuaternion).invert(); });
    this.bindings.forEach(({ a, b, face, along, influence, seed }, index) => {
      const normalAxis = face % 2 === 0 ? "z" : "x", sign = face < 2 ? 1 : -1;
      this.edgeA.set(0, 0, 0); this.edgeB.set(0, 0, 0);
      this.edgeA[along] = a.scale[along] / 2; this.edgeB[along] = -b.scale[along] / 2;
      this.edgeA[normalAxis] = sign * a.scale[normalAxis] / 2;
      this.edgeB[normalAxis] = sign * b.scale[normalAxis] / 2;
      this.edgeA.applyQuaternion(a.currentQuaternion).add(a.currentPosition);
      this.edgeB.applyQuaternion(b.currentQuaternion).add(b.currentPosition);
      const gap = this.edgeB[along] - this.edgeA[along];
      this.normal.set(0, 0, 0); this.normal[normalAxis] = sign;
      this.start.copy(this.edgeA).lerp(this.edgeB, .5).addScaledVector(this.normal, .004);
      this.direction.copy(this.normal); this.direction.y = -.4 - seed * .7;
      this.direction[along] = (seed - .5) * .35; this.direction.normalize();
      this.writeRay(index, this.start, this.direction, (.45 + seed * .60) * influence,
        ease(.006, .025, gap) * Math.pow(influence, .7), .035 + seed * .035);
    });
    // A few oblique shafts traverse the free lower cloud and merge with the
    // broad downward field. Their lengths are clipped by floating fragments.
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.39996 + .27, y = .12 + i * .075;
      this.start.set(Math.cos(angle) * .075, y, Math.sin(angle) * .075);
      this.direction.set(Math.cos(angle) * .65, -1.0 - (i % 3) * .22, Math.sin(angle) * .65).normalize();
      this.writeRay(this.bindings.length + i, this.start, this.direction, .9 + (i % 3) * .12, .65, .07);
    }
    this.rayGeometry.attributes.position.needsUpdate = true;
    this.rayGeometry.attributes.strength.needsUpdate = true;
  }
}
