// One shared frame for native chapter spacing, the camera and projected HTML.
// Mobile browser chrome changes innerHeight without changing the device/layout.
// Do not turn those changes into moving snap targets or GPU target reallocations.
let frame, tail;

export function readViewport() {
  const width = window.innerWidth;
  const mobile = window.matchMedia("(pointer: coarse)").matches;
  const orientation = window.screen?.orientation?.angle ?? window.orientation ?? null;
  if (!frame || mobile !== frame.mobile || width !== frame.width || orientation !== frame.orientation
    || (!mobile && window.innerHeight !== frame.height)) {
    let height = window.innerHeight;
    let largeHeight = height;
    if (mobile && CSS.supports("height", "100svh")) {
      // Measure the small viewport once per width/orientation, even if entry
      // happens with the toolbar hidden. Keep all captions in the safe frame.
      const probe = document.createElement("div");
      probe.style.cssText = "position:fixed;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none;contain:strict";
      document.body.append(probe);
      height = probe.getBoundingClientRect().height || height;
      if (CSS.supports("height", "100lvh")) {
        probe.style.height = "100lvh";
        largeHeight = probe.getBoundingClientRect().height || largeHeight;
      }
      probe.remove();
    }
    height = Math.max(1, Math.round(height));
    frame = { width, height, mobile, orientation, largeHeight: Math.max(height, largeHeight) };
    document.documentElement.style.setProperty("--stage-height", `${height}px`);
  }
  // Reserve the FULL toolbar-hidden scroll room before the gesture begins.
  // Safari can update its visible scrollport before reporting innerHeight;
  // growing a tail only then causes a boundary stall followed by a late snap.
  // Keep the reserve on toolbar reappearance too, so scroll extent stays fixed.
  if (mobile) frame.largeHeight = Math.max(frame.largeHeight, window.innerHeight, window.visualViewport?.height || 0);
  const nextTail = Math.max(0, (mobile ? frame.largeHeight : window.innerHeight) - frame.height);
  if (nextTail !== tail) {
    document.documentElement.style.setProperty("--scroll-tail", `${nextTail}px`);
    tail = nextTail;
  }
  return frame;
}
