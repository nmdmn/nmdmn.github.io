import * as Three from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import FieldVertex from "./shaders/field.vert.glsl";
import FieldFragment from "./shaders/field.frag.glsl";
import { seededRandom } from "./masonry-layout.js";

const segments = 48;

function strokes(count, material) {
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(new Float32Array(count * 6));
  geometry.attributes.instanceStart.data.setUsage(Three.DynamicDrawUsage);
  const lines = new LineSegments2(geometry, material);
  lines.frustumCulled = false;
  return lines;
}

function stroke(lines, index, ax, ay, bx, by) {
  lines.geometry.attributes.instanceStart.setXYZ(index, ax, ay, .025);
  lines.geometry.attributes.instanceEnd.setXYZ(index, bx, by, .025);
}

export default class Atmosphere {
  constructor(app, projections) {
    this.app = app;
    this.projections = projections;
    this.group = new Three.Group();
    app.scene.add(this.group);
    this.point = new Three.Vector3();
    const random = seededRandom(42017);
    this.rigs = projections.items.map(item => {
      const group = new Three.Group();
      this.group.add(group);
      const inverse = item.index === 3;
      const ink = inverse ? 0xaabfaf : 0x4c6355;
      const frame = new Three.Group();
      frame.matrixAutoUpdate = false;
      group.add(frame);
      const cornerMaterial = new LineMaterial({ color: ink, linewidth: 1.65, transparent: true, opacity: .85, depthWrite: false });
      const rimMaterial = new LineMaterial({ color: ink, linewidth: .7, transparent: true, opacity: .18, depthWrite: false });
      const corners = strokes(8, cornerMaterial);
      const perimeter = strokes(4, rimMaterial);
      frame.add(corners, perimeter);

      // A stratified sheet, not particles running along the connectors. Its
      // real depth and tiny drift make a soft, scene-linked projection backing.
      const fieldPositions = [];
      const fieldSeeds = [];
      for (let i = 0; i < 960; i++) {
        const cell = i * 37 % 960; // distributes mobile's prefix over the sheet
        fieldPositions.push((cell % 40 + .5) / 40 - .5 + (random() - .5) * .006, (Math.floor(cell / 40) + .5) / 24 - .5 + (random() - .5) * .006, random());
        fieldSeeds.push(random());
      }
      const fieldGeometry = new Three.BufferGeometry();
      fieldGeometry.setAttribute("position", new Three.Float32BufferAttribute(fieldPositions, 3));
      fieldGeometry.setAttribute("aSeed", new Three.Float32BufferAttribute(fieldSeeds, 1));
      const fieldUniforms = {
        uTime: { value: 0 }, uReveal: { value: 0 }, uInverse: { value: inverse ? 1 : 0 },
        uPixelRatio: { value: app.pixelRatio }, uSize: { value: new Three.Vector2() },
      };
      const field = new Three.Points(fieldGeometry, new Three.ShaderMaterial({ uniforms: fieldUniforms, vertexShader: FieldVertex, fragmentShader: FieldFragment, transparent: true, depthWrite: false }));
      field.frustumCulled = false;
      frame.add(field);
      const backing = new Three.Mesh(new Three.PlaneGeometry(1, 1), new Three.ShaderMaterial({
        uniforms: fieldUniforms,
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform float uReveal; uniform float uInverse; varying vec2 vUv;
          void main() {
            vec2 edge = smoothstep(vec2(0.0), vec2(.12), vUv) * (1.0 - smoothstep(vec2(.88), vec2(1.0), vUv));
            vec3 color = mix(vec3(.28, .37, .31), vec3(.38, .49, .41), uInverse);
            gl_FragColor = vec4(color, edge.x * edge.y * uReveal * .035);
          }
        `,
        transparent: true, depthWrite: false, side: Three.DoubleSide,
      }));
      backing.position.z = inverse ? .006 : -.26;
      frame.add(backing);
      const links = Array.from({ length: item.index === 3 ? 4 : 2 }, (_, lane) => {
        const uniforms = {
          uStart: { value: new Three.Vector3() }, uControlA: { value: new Three.Vector3() },
          uControlB: { value: new Three.Vector3() }, uEnd: { value: new Three.Vector3() },
        };
        const geometry = new LineGeometry();
        geometry.setPositions(new Float32Array((segments + 1) * 3));
        geometry.attributes.instanceStart.data.setUsage(Three.DynamicDrawUsage);
        const material = new LineMaterial({ color: ink, linewidth: 1.15, transparent: true, opacity: .62, depthWrite: false });
        const line = new Line2(geometry, material);
        line.frustumCulled = false;
        group.add(line);
        const markerMaterial = new Three.MeshBasicMaterial({ color: inverse ? 0xd4e3d6 : 0xb6cbbc, transparent: true, opacity: 0, depthWrite: false });
        const source = new Three.Mesh(new Three.SphereGeometry(.018, 10, 8), markerMaterial);
        group.add(source);
        const curve = new Three.CubicBezierCurve3(uniforms.uStart.value, uniforms.uControlA.value, uniforms.uControlB.value, uniforms.uEnd.value);
        return { lane, uniforms, curve, line, source, markerMaterial,
          lastStart: new Three.Vector3(Infinity, Infinity, Infinity), lastEnd: new Three.Vector3(Infinity, Infinity, Infinity) };
      });
      return { item, group, links, frame, corners, perimeter, field, fieldUniforms, backing };
    });

    const dustCount = 180;
    const dustPositions = [];
    const seeds = [];
    const sizes = [];
    for (let i = 0; i < dustCount; i++) {
      dustPositions.push((random() - .5) * 26, .4 + random() * 11, (random() - .5) * 16);
      seeds.push(random());
      sizes.push(.7 + random() * 1.2);
    }
    const dustGeometry = new Three.BufferGeometry();
    dustGeometry.setAttribute("position", new Three.Float32BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute("aSeed", new Three.Float32BufferAttribute(seeds, 1));
    dustGeometry.setAttribute("aSize", new Three.Float32BufferAttribute(sizes, 1));
    this.dustUniforms = { uTime: { value: 0 }, uReveal: { value: 1 }, uPixelRatio: { value: app.pixelRatio } };
    this.dust = new Three.Points(dustGeometry, new Three.ShaderMaterial({
      uniforms: this.dustUniforms,
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        attribute float aSeed;
        attribute float aSize;
        varying float vFade;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * .13 + aSeed * 40.0) * .18;
          p.y += sin(uTime * .09 + aSeed * 27.0) * .14;
          vec4 view = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * view;
          gl_PointSize = clamp(aSize * uPixelRatio, 1.0, 3.0);
          vFade = 1.0 - smoothstep(15.0, 35.0, -view.z);
        }
      `,
      fragmentShader: `
        uniform float uReveal;
        varying float vFade;
        void main() {
          float core = 1.0 - smoothstep(.04, .49, length(gl_PointCoord - .5));
          gl_FragColor = vec4(.16, .21, .18, core * vFade * uReveal * .24);
        }
      `,
      transparent: true, depthWrite: false,
    }));
    this.group.add(this.dust);
    app.addResizeCallback(() => this.resize());
    app.addDetailCallback(() => this.resize());
    this.resize();
  }

  resize() {
    const scale = this.app.frameBudget.decorationScale;
    this.dust.geometry.setDrawRange(0, Math.floor((this.app.compact ? 72 : 180) * scale));
    this.dust.visible = scale > 0;
    this.dustUniforms.uPixelRatio.value = this.app.pixelRatio;
    this.rigs.forEach(({ field, fieldUniforms, links, corners, perimeter }) => {
      field.geometry.setDrawRange(0, Math.floor((this.app.compact ? 320 : 960) * scale));
      field.visible = scale > 0;
      fieldUniforms.uPixelRatio.value = this.app.pixelRatio;
      [corners, perimeter, ...links.map(link => link.line)].forEach(line => line.material.resolution.set(this.app.width, this.app.height));
    });
  }

  update(time, overheadWeight) {
    this.dustUniforms.uTime.value = time;
    this.dustUniforms.uReveal.value = 1 - overheadWeight * .88;
    this.rigs.forEach(rig => {
      const { item, group, links, frame, corners, perimeter, fieldUniforms, backing } = rig;
      group.visible = item.visible && this.projections.enabled;
      if (!group.visible) return;
      const direction = item.index === 0 ? -1 : 1;
      frame.matrix.copy(item.plane.matrixWorld);
      const halfWidth = item.worldWidth / 2;
      const halfHeight = item.worldHeight / 2;
      const arm = item.index === 3 ? .16 : .24;
      if (rig.width !== item.worldWidth || rig.height !== item.worldHeight) {
        rig.width = item.worldWidth; rig.height = item.worldHeight;
        for (let corner = 0; corner < 4; corner++) {
          const x = corner % 2 === 0 ? -1 : 1;
          const y = corner < 2 ? 1 : -1;
          stroke(corners, corner * 2, x * (halfWidth - arm), y * halfHeight, x * halfWidth, y * halfHeight);
          stroke(corners, corner * 2 + 1, x * halfWidth, y * halfHeight, x * halfWidth, y * (halfHeight - arm));
        }
        stroke(perimeter, 0, -halfWidth, halfHeight, halfWidth, halfHeight);
        stroke(perimeter, 1, -halfWidth, -halfHeight, halfWidth, -halfHeight);
        stroke(perimeter, 2, -halfWidth, -halfHeight, -halfWidth, halfHeight);
        stroke(perimeter, 3, halfWidth, -halfHeight, halfWidth, halfHeight);
        corners.geometry.attributes.instanceStart.data.needsUpdate = true;
        perimeter.geometry.attributes.instanceStart.data.needsUpdate = true;
      }
      corners.material.opacity = item.reveal * .88;
      perimeter.material.opacity = item.reveal * (item.index === 3 ? .3 : .18);
      fieldUniforms.uSize.value.set(item.worldWidth, item.worldHeight);
      fieldUniforms.uReveal.value = item.reveal;
      fieldUniforms.uTime.value = time;
      backing.scale.set(item.worldWidth, item.worldHeight, 1);
      links.forEach(link => {
        const { lane, uniforms, curve } = link;
        const start = uniforms.uStart.value;
        const end = uniforms.uEnd.value;
        const upper = lane === 0;
        if (item.index === 3) {
          const x = lane % 2 === 0 ? -1 : 1;
          const y = lane < 2 ? 1 : -1;
          start.copy(this.projections.anchors.topCorners[lane].position).applyMatrix4(this.projections.pyramid.matrixWorld);
          end.set(x * halfWidth, y * halfHeight, .025).applyMatrix4(item.plane.matrixWorld);
        } else if (item.index === 2) {
          start.copy(this.projections.anchors.tip.position);
          start.x += upper ? -.035 : .035;
          start.z += .08;
          start.applyMatrix4(item.face.matrixWorld);
          end.set((upper ? -1 : 1) * halfWidth, halfHeight, .025).applyMatrix4(item.plane.matrixWorld);
        } else if (this.app.compact) {
          start.copy(this.projections.anchors.faces[item.index][lane + 2].position).applyMatrix4(this.projections.pyramid.matrixWorld);
          end.set((upper ? -1 : 1) * halfWidth, halfHeight, .025).applyMatrix4(item.plane.matrixWorld);
        } else {
          start.copy(this.projections.anchors.faces[item.index][lane].position).applyMatrix4(this.projections.pyramid.matrixWorld);
          end.set(-direction * halfWidth, (upper ? 1 : -1) * halfHeight, .025).applyMatrix4(item.plane.matrixWorld);
        }
        if (!link.lastStart.equals(start) || !link.lastEnd.equals(end)) {
          link.lastStart.copy(start); link.lastEnd.copy(end);
          uniforms.uControlA.value.copy(start).lerp(end, .34);
          uniforms.uControlB.value.copy(start).lerp(end, .74);
          if (item.index !== 3) {
            uniforms.uControlA.value.y += item.index === 2 ? -.12 : upper ? .28 : -.13;
            uniforms.uControlB.value.y += item.index === 2 ? .04 : upper ? .12 : -.08;
          }
          for (let i = 0; i <= segments; i++) {
            curve.getPoint(i / segments, this.point);
            if (i < segments) link.line.geometry.attributes.instanceStart.setXYZ(i, this.point.x, this.point.y, this.point.z);
            if (i > 0) link.line.geometry.attributes.instanceEnd.setXYZ(i - 1, this.point.x, this.point.y, this.point.z);
          }
          link.line.geometry.attributes.instanceStart.data.needsUpdate = true;
        }
        link.line.material.opacity = item.reveal * (item.index === 3 ? .7 : item.index === 2 ? .35 : .62);
        link.source.position.copy(start);
        link.markerMaterial.opacity = item.reveal * (item.index === 2 ? .5 : .8);
      });
    });
  }
}
