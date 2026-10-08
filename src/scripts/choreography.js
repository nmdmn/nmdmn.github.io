import { ease } from "./tip-burst.js";

// Emphasis is spatial, audibility is musical. These weights never turn a
// preceding audible instrument off or apply its audio gain a second time.
export function chapterWeights(progress, target) {
  const sequence = ease(.18, .90, progress);
  const depth = ease(1.12, 1.95, progress);
  const overhead = ease(2.40, 3, progress);
  target.pads = (1 - sequence * .44) * (1 - depth * .50) + overhead * .06;
  target.sequence = sequence * (1 - depth * .55) * (1 - overhead * .12);
  target.lead = overhead;
  target.bass = overhead;
  target.pond = 1 - ease(2.08, 2.72, progress);
  // Permanent face ownership. Earlier audible sides do not crossfade away.
  target.padSide = 1;
  target.sequenceSide = sequence;
  target.bassSide = ease(1.30, 1.95, progress);
  return target;
}
