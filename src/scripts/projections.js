import * as Three from "three";

const clamp = value => Math.max(0, Math.min(1, value));
export const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// A CSS pixel is a point on a world-space plane. Project its homogeneous
// coordinates through the SAME camera as the mesh, retaining perspective W.
// No CSS camera, independent tween, or screen-space approximation is involved.
export default class Projections {
  constructor(app, pyramid, anchors) {
    this.app = app;
    this.pyramid = pyramid;
    this.anchors = anchors;
    this.enabled = true;
    this.viewProjection = new Three.Matrix4();
    this.pixelToWorld = new Three.Matrix4();
    this.screen = new Three.Matrix4();
    this.transform = new Three.Matrix4();
    this.normal = new Three.Vector3();
    this.eye = new Three.Vector3();
    this.position = new Three.Vector3();
    this.clipPoint = new Three.Vector4();
    this.items = [...document.querySelectorAll("[data-projection]")].map((element, index) => {
      const face = new Three.Group();
      face.rotation.y = [0, Math.PI / 2, Math.PI, Math.PI * 1.5][index];
      pyramid.add(face);
      const plane = new Three.Object3D();
      face.add(plane);
      const section = element.closest("section");
      return { element, section, inner: element.firstElementChild, face, plane, index, width: 720, height: 450 };
    });
    document.body.classList.add("scene-ready");
    this.observer = new ResizeObserver(() => { this.measure(); app.invalidate(); });
    this.items.forEach(item => this.observer.observe(item.element));
    this.measure();
    document.fonts.ready.then(() => { this.measure(); app.invalidate(); });
    app.addResizeCallback(() => this.measure());
    app.addContextCallback(enabled => this.setEnabled(enabled));
  }

  measure() {
    this.dirty = true;
    this.items.forEach(item => {
      // offset dimensions are untransformed: do not measure projected bounds.
      item.width = item.element.offsetWidth;
      item.height = item.element.offsetHeight;
    });
  }

  setEnabled(enabled) {
    this.dirty = true;
    this.enabled = enabled;
    document.body.classList.toggle("scene-ready", enabled);
    this.items.forEach(({ element, section, inner }) => {
      element.removeAttribute("style");
      inner.removeAttribute("style");
      section.inert = false;
      section.removeAttribute("aria-hidden");
    });
    this.items.forEach(item => { item.interactive = undefined; });
    if (enabled) this.measure();
  }

  update(progress, camera, burst) {
    if (!this.enabled) return;
    const { width, height, compact } = this.app;
    // Camera and reading planes are scroll/layout-authored, never musical.
    // Only the tip reveal can additionally change with moving-stone clearance.
    if (!this.dirty && progress === this.lastProgress && burst.reveal === this.lastReveal
      && width === this.lastWidth && height === this.lastHeight && compact === this.lastCompact) return;
    this.dirty = false;
    this.lastProgress = progress; this.lastReveal = burst.reveal;
    this.lastWidth = width; this.lastHeight = height; this.lastCompact = compact;
    camera.updateMatrixWorld();
    this.pyramid.updateWorldMatrix(true, false);
    this.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    // Keep a tiny, nonzero projected Z so the matrix stays invertible. A
    // singular CSS matrix causes incorrect clip-path edges in WebKit.
    // Facing masks, not CSS Z, manage visibility against the WebGL scene.
    this.screen.set(width / 2, 0, 0, width / 2, 0, -height / 2, 0, height / 2, 0, 0, .001, 0, 0, 0, 0, 1);

    this.items.forEach(item => {
      const { index, plane, element, inner, section } = item;
      const distance = progress - index;
      const baseReveal = distance < 0 ? smooth((distance + .48) / .48) : 1 - smooth(distance / .38);
      const reveal = baseReveal * (index === 2 ? burst.reveal : 1);
      const finalSpan = Math.max(4.9, 4.9 / camera.aspect);
      // The last section is a light inscription on the square top. Keep its
      // entire rectangle inside both the face and the header/footer safe area.
      const topWidth = Math.min(3.35, finalSpan * camera.aspect * .8, finalSpan * .72 * item.width / item.height);
      const worldWidth = index === 3 ? topWidth : compact ? 6.4 : index === 2 ? 6.2 : 6.5;
      const unit = worldWidth / item.width;
      const worldHeight = item.height * unit;
      const direction = index === 0 ? -1 : 1;

      if (index === 2) {
        // The beam originates at the broken tip's mouth, and the panel extends
        // BELOW it. Both lift with the pyramid rather than with the camera.
        plane.position.set(0, -.4 - worldHeight / 2 - .28 * reveal, 1.25);
        plane.rotation.set(.035, -.06, 0);
      } else if (index === 3) {
        // The stable reading anchor is independent of audio and motion state.
        // Continue following the real scroll-driven pyramid/camera transform.
        plane.position.copy(this.anchors.top.position);
        plane.position.y += .040;
        plane.rotation.set(-Math.PI / 2, 0, 0);
      } else if (compact) {
        // Raise only the first two phone panels clear of the journey/footer.
        // Keep their face registration and all larger-screen poses unchanged.
        plane.position.set(-direction * Math.sin(.64) * 3.1, (width <= 700 ? 1.5 : .1) - worldHeight / 2 - .35 * reveal, Math.cos(.64) * 3.1);
        plane.rotation.set(.035, -direction * .56, 0);
      } else {
        plane.position.set(direction * (2.4 + worldWidth / 2 + .35 * reveal), 2.1, 2.55);
        // A face-local projection can fan outward rather than being pasted
        // flush to the triangular skin. This angle stays attached to its face.
        plane.rotation.set(.035, -direction * .62, 0);
      }
      plane.updateWorldMatrix(true, false);
      plane.getWorldPosition(this.position);
      this.normal.set(0, 0, 1).transformDirection(plane.matrixWorld);
      this.eye.copy(camera.position).sub(this.position).normalize();
      this.clipPoint.set(this.position.x, this.position.y, this.position.z, 1).applyMatrix4(this.viewProjection);
      const facing = this.normal.dot(this.eye);
      const visible = reveal > .002 && facing > .12 && this.clipPoint.w > camera.near;
      const interactive = visible && reveal > .92 && Math.abs(distance) < .12;
      // Scene effects consume the exact same plane and visibility, including
      // the authored mobile pose and the final top-face inscription.
      item.visible = visible;
      item.reveal = reveal;
      item.worldWidth = worldWidth;
      item.worldHeight = worldHeight;
      if (item.interactive !== interactive) {
        section.inert = !interactive;
        element.style.pointerEvents = interactive ? "auto" : "none";
        item.interactive = interactive;
      }
      // Compare DOM values too: setEnabled restores the static markup.
      const hidden = String(!visible), visibility = visible ? "visible" : "hidden";
      if (section.getAttribute("aria-hidden") !== hidden) section.setAttribute("aria-hidden", hidden);
      if (element.style.visibility !== visibility) element.style.visibility = visibility;
      element.style.opacity = visible ? smooth(reveal * 1.5) : 0;
      if (!visible) return;

      // CSS top-left -> plane-centred world units, with CSS Y inverted.
      this.pixelToWorld.set(unit, 0, 0, -worldWidth / 2, 0, -unit, 0, worldHeight / 2, 0, 0, unit, 0, 0, 0, 0, 1);
      this.transform.copy(this.screen).multiply(this.viewProjection).multiply(plane.matrixWorld).multiply(this.pixelToWorld);
      const values = this.transform.elements;
      // Keep homogeneous magnitudes close to one for Safari's CSS compositor.
      const divisor = values[15];
      if (!Number.isFinite(divisor) || divisor <= 0 || values.some(value => !Number.isFinite(value))) {
        element.style.visibility = "hidden";
        return;
      }
      element.style.transform = `matrix3d(${values.map(value => (value / divisor).toFixed(10)).join(",")})`;
      const clipped = (1 - reveal) * 100;
      inner.style.clipPath = reveal > .999 ? "none" : index === 2 ? `inset(0 0 ${clipped}% 0)` : direction < 0 ? `inset(0 0 0 ${clipped}%)` : `inset(0 ${clipped}% 0 0)`;
    });
  }
}
