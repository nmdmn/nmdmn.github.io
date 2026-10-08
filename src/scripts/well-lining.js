import * as Three from "three";
import { wellClearanceFloor, wellOuter, wellReveal, wellWeight } from "./crown-well.js";

// A continuous, matte inner backing underneath the retained supporting stones.
// The cutaway must open depth, not a sightline all the way to the white floor.
// No crown tile, damage record, or early-chapter exterior is filled/overwritten.
export default class WellLining {
  constructor() {
    const segments = 72, rings = 20, radius = wellOuter + .015;
    const positions = [0, 0, 0], indices = [];
    this.samples = [[0, 0, false]];
    for (let ring = 1; ring <= rings + 1; ring++) {
      const rim = ring > rings;
      const r = rim ? radius : radius * ring / rings;
      for (let segment = 0; segment < segments; segment++) {
        const angle = segment / segments * Math.PI * 2;
        const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
        positions.push(x, 0, z);
        this.samples.push([x, z, rim]);
      }
    }
    for (let segment = 0; segment < segments; segment++) {
      const next = (segment + 1) % segments;
      indices.push(0, 1 + next, 1 + segment);
      for (let ring = 1; ring <= rings; ring++) {
        const a = 1 + (ring - 1) * segments + segment;
        const b = 1 + (ring - 1) * segments + next;
        const c = 1 + ring * segments + segment;
        const d = 1 + ring * segments + next;
        indices.push(a, d, c, a, b, d);
      }
    }
    this.geometry = new Three.BufferGeometry();
    this.geometry.setAttribute("position", new Three.Float32BufferAttribute(positions, 3).setUsage(Three.DynamicDrawUsage));
    this.geometry.setIndex(indices);
    this.weights = Float64Array.from(this.samples, ([x, z]) => wellWeight(x, z));
    this.geometry.setAttribute("normal", new Three.BufferAttribute(new Float32Array(positions.length), 3).setUsage(Three.DynamicDrawUsage));
    // Only Y changes. Cache the fixed X/Z edges and the raw normal Y sums;
    // retain the same face order and Float32 accumulation as Three's normals.
    const data = this.geometry.attributes.position.array;
    const faces = this.geometry.index.array;
    this.edges = new Float64Array(faces.length / 3 * 4);
    this.normalY = new Float32Array(this.samples.length);
    let radialSquared = 0;
    for (let i = 0; i < data.length; i += 3) radialSquared = Math.max(radialSquared, data[i] * data[i] + data[i + 2] * data[i + 2]);
    for (let i = 0, edge = 0; i < faces.length; i += 3, edge += 4) {
      const a = faces[i] * 3, b = faces[i + 1] * 3, c = faces[i + 2] * 3;
      const cx = data[c] - data[b], cz = data[c + 2] - data[b + 2];
      const ax = data[a] - data[b], az = data[a + 2] - data[b + 2];
      this.edges.set([cx, cz, ax, az], edge);
      const y = cz * ax - cx * az;
      this.normalY[faces[i]] += y;
      this.normalY[faces[i + 1]] += y;
      this.normalY[faces[i + 2]] += y;
    }
    // A conservative sphere covers the entire reversible descent. No need to
    // rescan all vertices for bounds on every intermediate scroll position.
    const low = Math.fround(wellClearanceFloor(0, 0, 1) - .025), high = Math.fround(3.46);
    const halfHeight = (high - low) / 2;
    this.geometry.boundingSphere = new Three.Sphere(new Three.Vector3(0, (high + low) / 2, 0),
      Math.sqrt(radialSquared + halfHeight * halfHeight) + .000001);
    this.mesh = new Three.Mesh(this.geometry, new Three.MeshPhysicalMaterial({
      color: 0x151c17, roughness: 1, metalness: 0, specularIntensity: .08,
      side: Three.DoubleSide,
    }));
    this.mesh.receiveShadow = true;
    this.update(0);
  }

  update(progress) {
    const reveal = wellReveal(progress);
    this.mesh.visible = reveal > .0001;
    if (reveal === this.reveal) return;
    this.reveal = reveal;
    const positions = this.geometry.attributes.position;
    this.samples.forEach(([x, z, rim], index) => {
      // Sit just BELOW the shader clearance floor. Retained brick faces win
      // depth tests; the backing is visible only through their small openings.
      positions.setY(index, rim ? 3.46 : wellClearanceFloor(x, z, reveal, this.weights[index]) - .025);
    });
    positions.needsUpdate = true;
    this.updateNormals();
  }

  updateNormals() {
    const positions = this.geometry.attributes.position.array;
    const attribute = this.geometry.attributes.normal, normals = attribute.array;
    const faces = this.geometry.index.array, edges = this.edges;
    normals.fill(0);
    for (let i = 0; i < this.normalY.length; i++) normals[i * 3 + 1] = this.normalY[i];
    for (let i = 0, edge = 0; i < faces.length; i += 3, edge += 4) {
      const a = faces[i] * 3, b = faces[i + 1] * 3, c = faces[i + 2] * 3;
      const cy = positions[c + 1] - positions[b + 1], ay = positions[a + 1] - positions[b + 1];
      const x = cy * edges[edge + 3] - edges[edge + 1] * ay;
      const z = edges[edge] * ay - cy * edges[edge + 2];
      normals[a] += x; normals[b] += x; normals[c] += x;
      normals[a + 2] += z; normals[b + 2] += z; normals[c + 2] += z;
    }
    for (let i = 0; i < normals.length; i += 3) {
      const x = normals[i], y = normals[i + 1], z = normals[i + 2];
      const inverse = 1 / (Math.sqrt(x * x + y * y + z * z) || 1);
      normals[i] = x * inverse; normals[i + 1] = y * inverse; normals[i + 2] = z * inverse;
    }
    attribute.needsUpdate = true;
  }
}
