import * as Three from "three";
import { seededRandom } from "./masonry-layout.js";
import { wellRefines, wellReveal, wellBrickCutout } from "./crown-well.js";

// The well is excavated BRICK MASS, not a smooth circular cup. Smaller crown
// cells and four supporting courses expose real chipped blocks at the steps.
// The continuous matte lining seals the joints and the cleared central circle.
export default class WellMasonry {
  constructor(masonry, app) {
    this.matrix = new Three.Matrix4();
    this.color = new Three.Color();
    this.group = new Three.Group();
    this.records = [];
    const random = seededRandom(72183);
    const add = (parent, x, z, y, width, height, depth, crown) => {
      const position = new Three.Vector3(x, 0, z).applyQuaternion(parent.restQuaternion).add(parent.restPosition);
      position.y = y;
      const variant = Math.floor(random()*4);
      const tone = parent.tone*(crown ? .93+random()*.12 : .78+random()*.12);
      // Permanently omit the circular center from all five interior courses.
      // Consume its seeded variation first so surviving bricks stay identical.
      // Original exterior crown records and the continuous backing are untouched.
      if (Math.hypot(position.x, position.z) < wellBrickCutout) return;
      this.records.push({ position, dimensions: new Three.Vector3(width, height, depth),
        quaternion: parent.restQuaternion, variant, tone, crown });
    };
    for (const parent of masonry.blocks) {
      if (parent.motionWeight < .5 || Math.hypot(parent.position[0], parent.position[2]) > 1.55) continue;
      const r = Math.hypot(parent.position[0], parent.position[2]);
      const refine = wellRefines(parent);
      const size = .040 + .105*Three.MathUtils.smoothstep(r, .14, 1.03);
      const nx = refine ? Math.max(2, Math.ceil(parent.dimensions[0]/size)) : 1;
      const nz = refine ? Math.max(2, Math.ceil(parent.dimensions[2]/size)) : 1;
      const width = parent.dimensions[0]/nx, depth = parent.dimensions[2]/nz;
      const joint = refine ? .0014 : 0;
      const height = refine ? Math.min(parent.dimensions[1], Math.max(.026, Math.min(width, depth)*.85)) : parent.dimensions[1];
      const top = parent.position[1] + parent.dimensions[1]/2;
      const courseHeight = Math.max(.05, Math.min(.12, Math.max(width, depth)*.90));
      for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) {
        const localX = (x+.5)*width-parent.dimensions[0]/2;
        const localZ = (z+.5)*depth-parent.dimensions[2]/2;
        if (refine) add(parent, localX, localZ, top-height/2, width-joint, height, depth-joint, true);
        for (let layer = 0; layer < 4; layer++) {
          add(parent, localX, localZ, top-height-(layer+.5)*courseHeight-.0015,
            width-joint, courseHeight-.0015, depth-joint, false);
        }
      }
    }
    this.highGeometry = []; this.lowGeometry = [];
    this.batchRecords = Array.from({ length: 4 }, (_, variant) => this.records.filter(record => record.variant === variant));
    this.batches = Array.from({ length: 4 }, (_, variant) => {
      const records = this.batchRecords[variant];
      // Reuse immutable stone buffers, not cloned exterior instance attributes.
      const geometryFrom = source => {
        const geometry = new Three.BufferGeometry().setIndex(source.index);
        for (const [name, attribute] of Object.entries(source.attributes)) {
          if (!attribute.isInstancedBufferAttribute) geometry.setAttribute(name, attribute);
        }
        return geometry;
      };
      const high = geometryFrom(masonry.highGeometry[variant]), low = geometryFrom(masonry.lowGeometry[variant]);
      const weights = new Three.InstancedBufferAttribute(new Float32Array(records.length).fill(1), 1);
      const sides = new Three.InstancedBufferAttribute(new Float32Array(records.length*3), 3);
      const refined = new Three.InstancedBufferAttribute(new Float32Array(records.length), 1);
      const seams = new Three.InstancedBufferAttribute(new Float32Array(records.length).fill(-1), 1);
      for (const geometry of [high, low]) {
        geometry.setAttribute("aStoneCrown", weights); geometry.setAttribute("aStoneSides", sides);
        geometry.setAttribute("aWellRefined", refined); geometry.setAttribute("aSeamStone", seams);
      }
      this.highGeometry.push(high); this.lowGeometry.push(low);
      const batch = new Three.InstancedMesh(high, masonry.material, records.length);
      batch.customDepthMaterial = masonry.depthMaterial;
      batch.castShadow = batch.receiveShadow = true;
      batch.frustumCulled = false;
      records.forEach((record, index) => {
        this.setInstance(batch, record, index);
      });
      this.group.add(batch);
      return batch;
    });

    this.resize(app.compact);
    this.update(0);
  }

  resize(compact) {
    this.batches.forEach((batch, variant) => { batch.geometry = (compact ? this.lowGeometry : this.highGeometry)[variant]; });
  }

  setInstance(batch, record, index) {
    this.matrix.compose(record.position, record.quaternion, record.dimensions);
    batch.setMatrixAt(index, this.matrix);
    this.color.setRGB(record.tone, record.tone*.99, record.tone*.98);
    batch.setColorAt(index, this.color);
  }

  update(progress) {
    this.group.visible = wellReveal(progress) > .0001;
  }
}
