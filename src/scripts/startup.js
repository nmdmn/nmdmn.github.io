// DOM-only startup UI. The actual sculpture is deliberately a lazy import.
export const paint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

export function waitForStyles() {
  const stylesheet = document.querySelector("#experience-styles");
  if (stylesheet.media === "all" && stylesheet.sheet) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      stylesheet.removeEventListener("load", loaded);
      stylesheet.removeEventListener("error", failed);
    };
    const loaded = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("The experience stylesheet could not load.")); };
    stylesheet.addEventListener("load", loaded, { once: true });
    stylesheet.addEventListener("error", failed, { once: true });
  });
}

export function waitForFonts() {
  // Blocked font hosts must not leave an otherwise prepared scene trapped.
  return new Promise(resolve => {
    const timeout = setTimeout(resolve, 5000);
    document.fonts.ready.then(() => { clearTimeout(timeout); resolve(); });
  });
}

export default class Startup {
  constructor() {
    this.loader = document.querySelector(".startup-loader");
    this.status = this.loader.querySelector(".startup-loader__status");
    this.main = document.querySelector("main");
    this.main.setAttribute("aria-busy", "true");
    this.locked = [...document.body.children]
      .filter(element => element !== this.loader && !["SCRIPT", "NOSCRIPT"].includes(element.tagName))
      .map(element => ({ element, inert: element.inert }));
    this.locked.forEach(({ element }) => { element.inert = true; });
    this.finished = false;
  }

  stage(label, progress) {
    if (this.finished) return;
    this.status.textContent = label;
    this.loader.style.setProperty("--load-progress", progress);
  }

  async waitForEntry(enter, soundAvailable) {
    // Loading is finished. Waiting for consent must never hit the watchdog,
    // even when the visitor leaves this ready screen in a background tab.
    clearTimeout(window.__startup?.timer);
    if (window.__startup) window.__startup.ready = true;
    this.main.removeAttribute("aria-busy");
    this.loader.setAttribute("role", "dialog");
    this.loader.setAttribute("aria-modal", "true");
    this.loader.setAttribute("aria-live", "off");
    this.loader.setAttribute("aria-label", "Enter the experience");
    this.status.setAttribute("role", "status");
    const button = this.loader.querySelector(".startup-play");
    const silent = this.loader.querySelector(".startup-loader__silent");
    const label = this.loader.querySelector(".startup-loader__label");
    const hint = this.loader.querySelector(".startup-loader__hint");
    label.textContent = soundAvailable ? "PLAY & ENTER" : "ENTER THE EXPERIENCE";
    hint.textContent = soundAvailable ? "Click to start the music" : "Continue without sound";
    this.status.textContent = soundAvailable ? "Ready. Play to enter with sound, or enter silently." : "Audio unavailable. Enter without sound.";
    button.setAttribute("aria-label", soundAvailable ? "Play music and enter the experience" : "Enter the experience without sound");
    button.removeAttribute("aria-hidden");
    button.disabled = false;
    silent.hidden = !soundAvailable;
    this.loader.classList.add("is-ready");
    button.focus({ preventScroll: true });
    return new Promise(resolve => {
      const request = async withSound => {
        button.disabled = true;
        silent.disabled = true;
        try {
          // Call directly from the native click, retaining audio activation.
          await enter(withSound && soundAvailable);
          button.removeEventListener("click", play);
          silent.removeEventListener("click", skip);
          this.loader.removeEventListener("keydown", keyboard);
          resolve();
        } catch (error) {
          this.status.textContent = "Sound could not start. Try play again, or enter silently.";
          label.textContent = "TRY PLAY AGAIN";
          hint.textContent = "Click to retry, or enter silently";
          button.disabled = false;
          silent.disabled = false;
          silent.hidden = false;
          button.focus({ preventScroll: true });
          console.warn("The play gesture could not start audio.", error);
        }
      };
      const play = () => request(true);
      const skip = () => request(false);
      const keyboard = event => {
        if (event.key !== "Tab") return;
        const controls = [button, silent].filter(control => !control.hidden && !control.disabled);
        if (!controls.length) { event.preventDefault(); return; }
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      };
      button.addEventListener("click", play);
      silent.addEventListener("click", skip);
      this.loader.addEventListener("keydown", keyboard);
    });
  }

  async reveal(flash = true) {
    if (this.finished) return;
    this.finished = true;
    clearTimeout(window.__startup?.timer);
    document.documentElement.removeAttribute("data-loading");
    this.loader.setAttribute("aria-hidden", "true");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      if (flash && !reduced && document.documentElement.dataset.motion !== "off") {
        // One full-white flash: a short hold, then a fast afterimage-like release.
        // No repeated strobe, extra WebGL pass or scene-exposure manipulation.
        this.loader.classList.add("is-revealing");
        const animation = this.loader.animate([
          { opacity: 1 }, { opacity: 1, offset: .18, easing: "cubic-bezier(.2,.7,.3,1)" }, { opacity: 0 },
        ], { duration: 280, fill: "forwards" });
        await animation.finished.catch(() => {});
      }
    } finally {
      this.loader.remove();
      this.locked.forEach(({ element, inert }) => { element.inert = inert; });
      this.main.removeAttribute("aria-busy");
    }
  }
}
