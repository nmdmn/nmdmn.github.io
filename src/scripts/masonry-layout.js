// All dimensions and IDs live in pyramid-local space. Generation never depends
// on the viewport or animation time, so damage survives resize and reversal.
export const masonrySize = { halfWidth: 2.05, tip: .16, top: 3.55, courses: 48, capCourses: 2, apertureCourse: 24, chamberLastCourse: 35 };
export const courseHeight = (masonrySize.top - masonrySize.tip) / masonrySize.courses;
export const tipOpening = { detachedCourses: 8, mouthY: masonrySize.tip + courseHeight * 8 - .022, middleY: (masonrySize.tip + masonrySize.top) / 2, halfMouth: .15 };

export function seededRandom(seed = 83129) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

function divisions(min, max, size, random, stagger = false) {
  const edges = [min];
  let next = min + size * (stagger ? .52 : .85 + random() * .25);
  while (next < max - size * .42) {
    edges.push(next);
    next += size * (.82 + random() * .36);
  }
  edges.push(max);
  return edges.slice(1).flatMap((end, i) => end - edges[i] > size * 1.35 ? [[edges[i], (edges[i] + end) / 2], [(edges[i] + end) / 2, end]] : [[edges[i], end]]);
}

// Subtract a square chamber from a cell, retaining real wall thickness rather
// than covering a solid underside with a black hole texture.
function outsideChamber(cell, half) {
  const [x0, x1, z0, z1] = cell;
  const left = Math.max(x0, -half), right = Math.min(x1, half);
  const front = Math.max(z0, -half), back = Math.min(z1, half);
  if (left >= right || front >= back) return [cell];
  return [[x0, left, z0, z1], [right, x1, z0, z1], [left, right, z0, front], [left, right, back, z1]]
    .filter(([a, b, c, d]) => b - a > .025 && d - c > .025);
}

export default function masonryLayout() {
  const random = seededRandom();
  const { halfWidth, tip, top, courses, capCourses, apertureCourse, chamberLastCourse } = masonrySize;
  const blocks = [];
  // One weathered pyramidion completes the inverted point; the neighbouring
  // courses are separate stones, not a texture over a smooth shell.
  blocks.push({ id: "apex", course: 0, faces: [0, 1, 2, 3], variant: 8,
    position: [0, tip + courseHeight * capCourses / 2, 0], dimensions: [halfWidth * 2 * capCourses / courses, courseHeight * capCourses, halfWidth * 2 * capCourses / courses],
    rotation: [0, 0, 0], seed: random(), tone: .86, missing: false });

  for (let course = capCourses; course < courses; course++) {
    const lower = tip + course * courseHeight;
    const upper = lower + courseHeight;
    const radius = halfWidth * (upper - tip) / (top - tip);
    const chamber = course >= apertureCourse && course <= chamberLastCourse ? .45 - (course - apertureCourse) * .009 : 0;
    const rows = divisions(-radius, radius, .235 + random() * .025, random, course % 2 === 0);
    rows.forEach(([z0, z1], row) => {
      divisions(-radius, radius, .21 + random() * .055, random, (course + row) % 2 === 0).forEach(([x0, x1], column) => {
        const cells = chamber ? outsideChamber([x0, x1, z0, z1], chamber) : [[x0, x1, z0, z1]];
        cells.forEach(([left, right, front, back], part) => {
          const faces = [];
          if (back > radius - .001) faces.push(0);
          if (right > radius - .001) faces.push(1);
          if (front < -radius + .001) faces.push(2);
          if (left < -radius + .001) faces.push(3);
          const variant = random();
          blocks.push({ id: `${course}:${row}:${column}:${part}`, course, faces,
            position: [(left + right) / 2 + (random() - .5) * .0007, (lower + upper) / 2, (front + back) / 2 + (random() - .5) * .0007],
            dimensions: [right - left - .0025, courseHeight - .0015, back - front - .0025],
            rotation: [0, (random() - .5) * .004, 0], variant: faces.length && variant > .86 ? 4 + Math.floor(random() * 4) : Math.floor(random() * 4),
            seed: random(), tone: .78 + random() * .28, missing: false,
          });
        });
      });
    });
  }

  // Cut a small real recess immediately above the broken tip. Do this AFTER
  // seeded generation so unrelated stones, IDs and weathering remain unchanged.
  for (let index = blocks.length - 1; index >= 0; index--) {
    const block = blocks[index];
    if (block.course < tipOpening.detachedCourses || block.course > 15) continue;
    const half = tipOpening.halfMouth - (block.course - tipOpening.detachedCourses) * .007;
    const [x, , z] = block.position, [width, , depth] = block.dimensions;
    const cell = [x - width / 2, x + width / 2, z - depth / 2, z + depth / 2];
    const pieces = outsideChamber(cell, half);
    if (pieces.length === 1 && pieces[0] === cell) continue;
    blocks.splice(index, 1, ...pieces.map(([left, right, front, back], part) => ({
      ...block, id: `${block.id}:recess:${part}`,
      position: [(left + right) / 2, block.position[1], (front + back) / 2],
      dimensions: [right - left - .0015, block.dimensions[1], back - front - .0015],
      faces: block.faces.filter(face => [back === cell[3], right === cell[1], front === cell[2], left === cell[0]][face]),
    })));
  }

  // Four physical quarter-pyramid fragments fit together at rest. There is no
  // hidden intact pyramidion left behind when these pieces leave the tip.
  const cap = blocks.shift();
  const signs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  blocks.unshift(...signs.map(([x, z], part) => ({
    ...cap, id: `apex:${part}`, variant: 8 + part, seed: (cap.seed + part * .173) % 1,
    position: [x * cap.dimensions[0] / 4, cap.position[1], z * cap.dimensions[2] / 4],
    dimensions: [cap.dimensions[0] / 2 - .001, cap.dimensions[1], cap.dimensions[2] / 2 - .001],
  })));

  // The broad square is a weathered paving surface, not a perfectly flat
  // plate. Its lower faces remain seated on the course beneath it.
  blocks.filter(block => block.course === courses - 1).forEach(block => {
    const [x, , z] = block.position;
    const heightOffset = (block.seed - .5) * .036 + Math.sin(x * 2.1 + z * 1.3) * .009;
    block.dimensions[1] += heightOffset;
    block.position[1] += heightOffset / 2;
    if (block.variant < 4 && block.seed > .66) block.variant = 4 + Math.floor(block.seed * 4);
  });

  // Curated wounds, not independent random holes. The upper two courses stay
  // intact to protect the square-top inscription in the final composition.
  const wounds = [
    { face: 0, along: -1.24, y: 2.66 }, { face: 0, along: .73, y: 1.89 },
    { face: 1, along: .83, y: 2.96 }, { face: 2, along: -.72, y: 2.72 },
    { face: 3, along: -.60, y: 2.12 },
  ];
  wounds.forEach(wound => {
    const candidates = blocks.filter(block => block.faces.includes(wound.face) && block.course > 14 && block.course < courses - 2 && !block.missing);
    const alongAxis = wound.face % 2 === 0 ? 0 : 2;
    const distance = block => Math.hypot(block.position[alongAxis] - wound.along, (block.position[1] - wound.y) * 1.3);
    candidates.sort((a, b) => distance(a) - distance(b));
    candidates.slice(0, 7).filter(block => distance(block) < .31).forEach(block => { block.missing = true; });
    candidates.filter(block => !block.missing && distance(block) < .5).forEach(block => {
      block.variant = 4 + Math.floor(block.seed * 4);
      block.tone *= .88;
      const axis = wound.face % 2 === 0 ? 2 : 0;
      const recess = Math.min(.004 + block.seed * .010, block.dimensions[axis] * .12);
      block.position[axis] -= (wound.face < 2 ? 1 : -1) * recess;
      // Keep the back face in place: a recessed casing stone must not push
      // into its interior neighbour when the smaller joints are this fine.
      block.dimensions[axis] -= recess * 2;
    });
  });
  return blocks;
}
