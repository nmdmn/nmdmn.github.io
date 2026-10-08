// Collision-prepared spatial support shared by the kick's smooth pressure.
// Historical bass registers remain the geometry basis, not MIDI selectors.
export const bassRegions = [
  { pitch: 31, name: "G1", height: -.22, width: .34, travel: .065 },
  { pitch: 38, name: "D2", height: .14, width: .27, travel: .060 },
  { pitch: 40, name: "E2", height: .49, width: .23, travel: .055 },
  { pitch: 42, name: "F♯2", height: .85, width: .19, travel: .050 },
  { pitch: 43, name: "G2", height: 1.13, width: .16, travel: .045 },
];

export function bassRegionWeight(height, region) {
  const distance = Math.abs(height - region.height) / region.width;
  if (distance >= 2.5) return 0;
  // Compact support keeps the intact upper masonry absolutely still.
  const taper = Math.max(0, Math.min(1, (2.5 - distance) / .5));
  return Math.exp(-distance * distance * 1.6) * taper * taper * (3 - 2 * taper);
}
