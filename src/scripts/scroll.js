import { readViewport } from "./viewport.js";

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

// The native scroll position is the source of truth for both HTML and WebGL.
export default class ScrollTimeline {
  constructor() {
    this.main = document.querySelector("main");
    // Fixed projections participate in the viewport's native scroll chain.
    // Keep one document scroller rather than intercepting wheel/touch input.
    this.container = document.scrollingElement;
    this.sections = [...this.main.querySelectorAll("section")];
    this.names = this.sections.map(section => section.dataset.name);
    this.links = [...document.querySelectorAll(".chapter-nav a, .chapter-rail a")];
    this.label = document.querySelector("[data-chapter-label]");
    this.indicator = document.querySelector(".journey-line");
    this.motionButton = document.querySelector(".motion-toggle");
    this.preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.motionOverride = null;
    this.listeners = [];
    this.progress = 0;
    this.active = -1;

    this.measure();
    this.updateMotion();
    window.addEventListener("scroll", () => this.read(), { passive: true });
    this.motionButton.addEventListener("click", () => {
      this.motionOverride = !this.motionEnabled;
      this.updateMotion();
    });
    this.preference.addEventListener("change", () => this.updateMotion());
    window.addEventListener("resize", () => this.measure());
    window.visualViewport?.addEventListener("resize", () => this.measure());
    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe(this.main);
    this.sections.forEach(section => this.resizeObserver.observe(section));
    this.main.querySelectorAll("[data-projection]").forEach(panel => this.resizeObserver.observe(panel));

    document.querySelectorAll('a[href^="#section-"]').forEach(link => {
      link.addEventListener("click", event => {
        const target = document.querySelector(link.getAttribute("href"));
        if (!target) return;
        event.preventDefault();
        history.replaceState(null, "", link.getAttribute("href"));
        // Projected sections are inert until their face settles into view.
        if (document.body.classList.contains("scene-ready")) this.pendingFocus = target;
        else target.focus({ preventScroll: true });
        this.container.scrollTo({ top: target.offsetTop, behavior: this.motionEnabled ? "smooth" : "instant" });
      });
    });
    window.addEventListener("hashchange", () => this.goToHash());
    this.goToHash();
  }

  onChange(callback) { this.listeners.push(callback); }

  goToHash() {
    const target = this.sections.find(section => `#${section.id}` === location.hash);
    if (target) this.container.scrollTo({ top: target.offsetTop, behavior: "instant" });
  }

  updateMotion() {
    this.motionEnabled = this.motionOverride ?? !this.preference.matches;
    document.documentElement.dataset.motion = this.motionEnabled ? "on" : "off";
    this.motionButton.setAttribute("aria-pressed", String(!this.motionEnabled));
    this.motionButton.querySelector("[data-motion-label]").textContent = this.motionEnabled ? "Motion on" : "Motion off";
    this.motionButton.title = this.motionEnabled ? "Pause ambient motion" : "Resume ambient motion";
    this.read();
  }

  measure() {
    readViewport();
    const previousAnchors = this.anchors;
    const previousProgress = this.progress;
    this.height = this.container.clientHeight;
    this.anchors = this.sections.map(section => section.offsetTop);
    this.maxScroll = this.anchors[this.anchors.length - 1] || 0;
    if (previousAnchors && this.anchors.some((anchor, index) => anchor !== previousAnchors[index])) {
      // Real rotation/window resizing changes the shared frame. Preserve the
      // current chapter rather than retaining an obsolete pixel scroll target.
      const index = Math.min(this.anchors.length - 1, Math.floor(previousProgress));
      const from = this.anchors[index], to = this.anchors[index + 1] ?? from;
      this.container.scrollTo({ top: from + (to - from) * (previousProgress - index), behavior: "instant" });
    }
    this.read();
  }

  read() {
    const top = this.container.scrollTop;
    this.scrollTop = top;
    let index = 0;
    while (index < this.anchors.length - 1 && top >= this.anchors[index + 1]) index++;
    const next = this.anchors[index + 1];
    this.progress = index + (next === undefined ? 0 : clamp((top - this.anchors[index]) / (next - this.anchors[index])));
    const active = Math.min(3, Math.floor(this.progress + .5));
    if (active !== this.active) {
      this.active = active;
      this.label.textContent = `0${active + 1} / ${this.names[active]}`;
      this.links.forEach(link => {
        if (link.hash === `#section-${active}`) link.setAttribute("aria-current", "step");
        else link.removeAttribute("aria-current");
      });
    }
    // Scope this inherited property to its only consumer, not the whole page.
    // Scroll range is measured on layout changes, not after every DOM transform.
    const journey = this.maxScroll > 0 ? clamp(top / this.maxScroll) : 0;
    if (this.indicator && journey !== this.journey) {
      this.indicator.style.setProperty("--journey", journey);
      this.journey = journey;
    }
    this.listeners.forEach(callback => callback());
  }

}
