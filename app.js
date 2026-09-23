/* ---------- Utilities ---------- */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

function uniquePush(set, value, min, max) {
  let tries = 0;
  let v = value;
  while (set.has(v) && tries < 30) {
    v = value + rand(-3, 3);
    if (v < min) v = min;
    if (v > max) v = max;
    tries++;
  }
  set.add(v);
  return v;
}

// Build a 4-option (or fewer) multiple choice set from a correct value + a pool of possible wrong values.
function buildOptions(correct, pool, count = 4) {
  const seen = new Set([correct]);
  const distractors = [];
  const shuffledPool = shuffle(pool.filter((v) => v !== correct));
  for (const v of shuffledPool) {
    if (distractors.length >= count - 1) break;
    if (seen.has(v)) continue;
    seen.add(v);
    distractors.push(v);
  }
  const options = shuffle([correct, ...distractors]);
  return { options, correctIndex: options.indexOf(correct) };
}

function numberPool(center, min, max, spread = 5) {
  const pool = [];
  for (let d = -spread; d <= spread; d++) {
    const v = center + d;
    if (v >= min && v <= max) pool.push(v);
  }
  return pool;
}

const EMOJI_SET = ['🍎', '🍊', '🍇', '⭐', '🐶', '🐱', '🚗', '🎈', '🍪', '🌸', '🍓', '🐰', '🐠', '🦋', '🎁'];
const RIDGE_EMOJI = ['💎', '🍭', '🍬', '🌟', '🎈', '🧁', '🍓', '🎁'];

/* ---------- Difficulty / grade level ---------- */

const GRADES = ['Prep', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'];
const GRADE_KEY = 'mathquest_grade_v1';

function getGrade() {
  const v = parseInt(localStorage.getItem(GRADE_KEY), 10);
  return Number.isInteger(v) && v >= 0 && v < GRADES.length ? v : 1;
}

function setGrade(i) {
  localStorage.setItem(GRADE_KEY, String(i));
}

// Pick the entry matching the current grade from a 7-item (Prep..Year6) array.
function gscale(arr) {
  return arr[getGrade()];
}

/* ---------- Shape drawing (inline SVG) ---------- */
function regularPolygonPoints(cx, cy, r, sides, rotationDeg = -90) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const angle = ((rotationDeg + (i * 360) / sides) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function starPoints(cx, cy, outerR, innerR, points = 5) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = ((-90 + (i * 180) / points) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const CRYSTAL_COLORS = ['#b48ce0', '#8b5fbf', '#c9a7f5', '#7fd8d1', '#ff9fc2'];
const SHAPE_DEFS = {
  circle: (fill) => `<circle cx="70" cy="70" r="55" fill="${fill}"/>`,
  square: (fill) => `<rect x="18" y="18" width="104" height="104" rx="10" fill="${fill}"/>`,
  rectangle: (fill) => `<rect x="6" y="35" width="128" height="70" rx="10" fill="${fill}"/>`,
  triangle: (fill) => `<polygon points="${regularPolygonPoints(70, 74, 62, 3)}" fill="${fill}"/>`,
  pentagon: (fill) => `<polygon points="${regularPolygonPoints(70, 70, 58, 5)}" fill="${fill}"/>`,
  hexagon: (fill) => `<polygon points="${regularPolygonPoints(70, 70, 58, 6)}" fill="${fill}"/>`,
  star: (fill) => `<polygon points="${starPoints(70, 70, 58, 26, 5)}" fill="${fill}"/>`,
  oval: (fill) => `<ellipse cx="70" cy="70" rx="60" ry="40" fill="${fill}"/>`,
  diamond: (fill) => `<polygon points="${regularPolygonPoints(70, 70, 58, 4)}" fill="${fill}"/>`,
};
const SHAPE_SIDES = { triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6 };
const SHAPE_LABELS = {
  circle: 'Circle', square: 'Square', rectangle: 'Rectangle', triangle: 'Triangle',
  pentagon: 'Pentagon', hexagon: 'Hexagon', star: 'Star', oval: 'Oval', diamond: 'Diamond',
};

function shapeSVG(name) {
  const fill = pick(CRYSTAL_COLORS);
  return `<svg width="140" height="140" viewBox="0 0 140 140">${SHAPE_DEFS[name](fill)}</svg>`;
}

/* ---------- Question generators ---------- */

// Max sum/start for +/- by grade: Prep, Y1, Y2, Y3, Y4, Y5, Y6.
const ADD_MAX_BY_GRADE = [5, 20, 100, 1000, 10000, 100000, 999999];

function genAddition(emojiPool = EMOJI_SET) {
  return () => {
    const maxSum = gscale(ADD_MAX_BY_GRADE);
    const a = rand(1, Math.max(1, maxSum - 1));
    const b = rand(1, Math.max(1, maxSum - a));
    const correct = a + b;
    const spread = Math.max(3, Math.round(maxSum * 0.08));
    const { options, correctIndex } = buildOptions(correct, numberPool(correct, 0, correct + spread * 2, spread));
    const visual =
      maxSum <= 20
        ? (() => {
            const emoji = pick(emojiPool);
            return `<span>${emoji.repeat(a)}</span> <span style="color:#ff5c8a">+</span> <span>${emoji.repeat(b)}</span>`;
          })()
        : `<span style="font-size:40px;font-weight:800;">${a} + ${b}</span>`;
    return { prompt: `${a} + ${b} = ?`, visual, options: options.map(String), correctIndex };
  };
}

function genSubtraction(emojiPool = EMOJI_SET) {
  return () => {
    const maxStart = gscale(ADD_MAX_BY_GRADE);
    const a = rand(2, Math.max(2, maxStart));
    const b = rand(1, a);
    const correct = a - b;
    const spread = Math.max(3, Math.round(maxStart * 0.08));
    const { options, correctIndex } = buildOptions(correct, numberPool(correct, 0, maxStart, spread));
    const visual =
      maxStart <= 20
        ? (() => {
            const emoji = pick(emojiPool);
            const kept = `<span>${emoji.repeat(a - b)}</span>`;
            const crossed = b > 0 ? `<span class="crossed">${emoji.repeat(b)}</span>` : '';
            return `${kept}${crossed}`;
          })()
        : `<span style="font-size:40px;font-weight:800;">${a} − ${b}</span>`;
    return { prompt: `${a} - ${b} = ?`, visual, options: options.map(String), correctIndex };
  };
}

// Multiplication factor ranges by grade.
const MUL_RANGE_BY_GRADE = [
  { aMax: 2, bMax: 2 },
  { aMax: 3, bMax: 3 },
  { aMax: 5, bMax: 5 },
  { aMax: 10, bMax: 10 },
  { aMax: 12, bMax: 20 },
  { aMin: 10, aMax: 99, bMax: 12 },
  { aMin: 10, aMax: 99, bMin: 10, bMax: 99 },
];

function genMultiplication(emojiPool = EMOJI_SET) {
  return () => {
    const r = gscale(MUL_RANGE_BY_GRADE);
    const a = rand(r.aMin || 1, r.aMax);
    const b = rand(r.bMin || 1, r.bMax);
    const correct = a * b;
    const spread = Math.max(3, Math.round(correct * 0.15));
    const { options, correctIndex } = buildOptions(correct, numberPool(correct, 0, correct + spread * 2, spread));
    const visual =
      a * b <= 30
        ? `<span style="font-size:30px; line-height:1.5;">${Array.from({ length: a })
            .map(() => pick(emojiPool).repeat(b))
            .join('<br>')}</span>`
        : `<span style="font-size:40px;font-weight:800;">${a} × ${b}</span>`;
    return { prompt: `${a} × ${b} = ?`, visual, options: options.map(String), correctIndex };
  };
}

function genDivision(emojiPool = EMOJI_SET) {
  return () => {
    const r = gscale(MUL_RANGE_BY_GRADE);
    const divisor = rand(Math.max(2, r.bMin || 1), Math.max(2, r.bMax));
    const quotient = rand(r.aMin || 1, r.aMax);
    const dividend = divisor * quotient;
    const spread = Math.max(3, Math.round(quotient * 0.25));
    const { options, correctIndex } = buildOptions(quotient, numberPool(quotient, 0, quotient + spread * 2, spread));
    const visual =
      dividend <= 30
        ? `<span style="font-size:30px;">${pick(emojiPool).repeat(dividend)}</span><div style="font-size:15px;margin-top:6px;color:#7a6a99;">shared into ${divisor} equal groups</div>`
        : `<span style="font-size:40px;font-weight:800;">${dividend} ÷ ${divisor}</span>`;
    return { prompt: `${dividend} ÷ ${divisor} = ?`, visual, options: options.map(String), correctIndex };
  };
}

function genMixedOps(emojiPool = EMOJI_SET) {
  const gens = [genAddition(emojiPool), genSubtraction(emojiPool), genMultiplication(emojiPool), genDivision(emojiPool)];
  return () => pick(gens)();
}

// 2D shape pool grows with grade.
const SHAPE_POOL_BY_GRADE = [
  ['circle', 'square', 'triangle'],
  ['circle', 'square', 'triangle', 'rectangle'],
  ['circle', 'square', 'triangle', 'rectangle', 'pentagon', 'hexagon'],
  ['circle', 'square', 'triangle', 'rectangle', 'pentagon', 'hexagon', 'oval', 'diamond', 'star'],
  ['circle', 'square', 'triangle', 'rectangle', 'pentagon', 'hexagon', 'oval', 'diamond', 'star'],
  ['circle', 'square', 'triangle', 'rectangle', 'pentagon', 'hexagon', 'oval', 'diamond', 'star'],
  ['circle', 'square', 'triangle', 'rectangle', 'pentagon', 'hexagon', 'oval', 'diamond', 'star'],
];

function genShapeName() {
  return () => {
    const pool = gscale(SHAPE_POOL_BY_GRADE);
    const name = pool[rand(0, pool.length - 1)];
    const opts = pool.filter((s) => s !== name).map((s) => SHAPE_LABELS[s]);
    const { options, correctIndex } = buildOptions(SHAPE_LABELS[name], opts, Math.min(4, pool.length));
    return { prompt: 'What shape is this?', visual: shapeSVG(name), options, correctIndex };
  };
}

function genShapeSides() {
  return () => {
    const pool = gscale(SHAPE_POOL_BY_GRADE).filter((s) => SHAPE_SIDES[s]);
    const name = pool[rand(0, pool.length - 1)];
    const correct = SHAPE_SIDES[name];
    const { options, correctIndex } = buildOptions(correct, [3, 4, 5, 6]);
    return { prompt: 'How many sides does this shape have?', visual: shapeSVG(name), options: options.map(String), correctIndex };
  };
}

// 3D shapes (simple pseudo-3D icons).
const SHAPE3D_POOL_BY_GRADE = [
  ['cube', 'sphere', 'cone'],
  ['cube', 'sphere', 'cone'],
  ['cube', 'sphere', 'cone', 'cylinder', 'pyramid'],
  ['cube', 'sphere', 'cone', 'cylinder', 'pyramid'],
  ['cube', 'sphere', 'cone', 'cylinder', 'pyramid'],
  ['cube', 'sphere', 'cone', 'cylinder', 'pyramid'],
  ['cube', 'sphere', 'cone', 'cylinder', 'pyramid'],
];
const SHAPE3D_LABELS = { cube: 'Cube', sphere: 'Sphere', cone: 'Cone', cylinder: 'Cylinder', pyramid: 'Pyramid' };
const SHAPE3D_DEFS = {
  cube: (fill) => `
    <polygon points="35,45 85,45 85,95 35,95" fill="${fill}"/>
    <polygon points="35,45 55,25 105,25 85,45" fill="${fill}" opacity="0.75"/>
    <polygon points="85,45 105,25 105,75 85,95" fill="${fill}" opacity="0.55"/>`,
  sphere: (fill) => `
    <circle cx="70" cy="70" r="45" fill="${fill}"/>
    <ellipse cx="58" cy="55" rx="16" ry="10" fill="#ffffff" opacity="0.35"/>`,
  cone: (fill) => `
    <polygon points="70,20 30,98 110,98" fill="${fill}"/>
    <ellipse cx="70" cy="98" rx="40" ry="12" fill="${fill}" opacity="0.65" stroke="${fill}" stroke-width="1"/>`,
  cylinder: (fill) => `
    <ellipse cx="70" cy="35" rx="38" ry="14" fill="${fill}"/>
    <rect x="32" y="35" width="76" height="55" fill="${fill}" opacity="0.85"/>
    <ellipse cx="70" cy="90" rx="38" ry="14" fill="${fill}" opacity="0.6"/>`,
  pyramid: (fill) => `
    <polygon points="70,15 20,100 120,100" fill="${fill}"/>
    <polygon points="70,15 70,100 120,100" fill="${fill}" opacity="0.6"/>`,
};

function shape3DSVG(name) {
  const fill = pick(CRYSTAL_COLORS);
  return `<svg width="140" height="140" viewBox="0 0 140 140">${SHAPE3D_DEFS[name](fill)}</svg>`;
}

function gen3DShape() {
  return () => {
    const pool = gscale(SHAPE3D_POOL_BY_GRADE);
    const name = pool[rand(0, pool.length - 1)];
    const opts = pool.filter((s) => s !== name).map((s) => SHAPE3D_LABELS[s]);
    const { options, correctIndex } = buildOptions(SHAPE3D_LABELS[name], opts, Math.min(4, pool.length));
    return { prompt: 'What 3D shape is this?', visual: shape3DSVG(name), options, correctIndex };
  };
}

// Perimeter / area, from simple tile-counting up to numeric-only problems at higher grades.
const GRID_MAX_BY_GRADE = [2, 3, 5, 6, 8, 10, 12];

function gridSVG(rows, cols) {
  const cell = Math.max(14, Math.min(28, Math.floor(200 / Math.max(rows, cols))));
  const w = cols * cell;
  const h = rows * cell;
  let rects = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects += `<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="${(r + c) % 2 === 0 ? '#c9a7f5' : '#e4d4fb'}" stroke="#8b5fbf" stroke-width="1.5"/>`;
    }
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${rects}</svg>`;
}

function genMeasurement() {
  return () => {
    const gradeIdx = getGrade();
    const maxDim = gscale(GRID_MAX_BY_GRADE);
    const rows = rand(2, maxDim);
    const cols = rand(2, maxDim);

    let mode = 'count';
    if (gradeIdx >= 5) mode = pick(['perimeter-numeric', 'area-numeric']);
    else if (gradeIdx >= 3) mode = pick(['perimeter-grid', 'area-grid']);

    if (mode === 'count' || mode === 'area-grid') {
      const correct = rows * cols;
      const spread = Math.max(2, Math.round(correct * 0.2));
      const { options, correctIndex } = buildOptions(correct, numberPool(correct, 1, correct + spread * 2, spread));
      return {
        prompt: mode === 'count' ? 'How many crystal tiles are there?' : 'What is the area (in tiles)?',
        visual: gridSVG(rows, cols),
        options: options.map(String),
        correctIndex,
      };
    }
    if (mode === 'perimeter-grid') {
      const correct = 2 * (rows + cols);
      const spread = Math.max(2, Math.round(correct * 0.2));
      const { options, correctIndex } = buildOptions(correct, numberPool(correct, 1, correct + spread * 2, spread));
      return {
        prompt: 'What is the perimeter (all the way around)?',
        visual: gridSVG(rows, cols),
        options: options.map(String),
        correctIndex,
      };
    }
    const w = rand(4, maxDim * 3);
    const h = rand(4, maxDim * 3);
    if (mode === 'perimeter-numeric') {
      const correct = 2 * (w + h);
      const spread = Math.max(3, Math.round(correct * 0.15));
      const { options, correctIndex } = buildOptions(correct, numberPool(correct, 1, correct + spread * 2, spread));
      return {
        prompt: `A crystal wall is ${w} by ${h}. What is its perimeter?`,
        visual: `<span style="font-size:32px;">📐</span>`,
        options: options.map(String),
        correctIndex,
      };
    }
    const correct = w * h;
    const spread = Math.max(3, Math.round(correct * 0.15));
    const { options, correctIndex } = buildOptions(correct, numberPool(correct, 1, correct + spread * 2, spread));
    return {
      prompt: `A crystal wall is ${w} by ${h}. What is its area?`,
      visual: `<span style="font-size:32px;">📐</span>`,
      options: options.map(String),
      correctIndex,
    };
  };
}

const PATTERN_ICONS = ['🌸', '🦋', '🌼', '🍄', '🌿', '🐝'];

// AB pattern for Prep/Year1, ABC pattern from Year2 up.
function genFlowerTrail() {
  return () => {
    const useABC = getGrade() >= 2;
    if (!useABC) {
      const [a, b] = sample(PATTERN_ICONS, 2);
      const seq = [a, b, a, b, a, b];
      const correct = a;
      const shown = seq.join(' ');
      const distractorPool = PATTERN_ICONS.filter((c) => c !== correct);
      const { options, correctIndex } = buildOptions(correct, [b, ...distractorPool]);
      return { prompt: 'What comes next in the pattern?', visual: `<span style="letter-spacing:8px">${shown} ❓</span>`, options, correctIndex };
    }
    const [a, b, c] = sample(PATTERN_ICONS, 3);
    const seq = [a, b, c, a, b, c, a];
    const correct = b;
    const shown = seq.join(' ');
    const distractorPool = PATTERN_ICONS.filter((x) => x !== correct);
    const { options, correctIndex } = buildOptions(correct, [a, c, ...distractorPool]);
    return { prompt: 'What comes next in the pattern?', visual: `<span style="letter-spacing:8px">${shown} ❓</span>`, options, correctIndex };
  };
}

const STEP_POOL_BY_GRADE = [
  [1],
  [1, 2, 5, 10],
  [1, 2, 3, 5, 10],
  [1, 2, 3, 4, 5, 10, 25],
  [2, 3, 4, 5, 10, 25, 50],
  [5, 10, 25, 50, 100],
  [10, 25, 50, 100, 1000],
];
const START_MAX_BY_GRADE = [10, 20, 50, 200, 1000, 5000, 20000];

function genNumberPattern() {
  return () => {
    const steps = gscale(STEP_POOL_BY_GRADE);
    const step = steps[rand(0, steps.length - 1)];
    const startMax = gscale(START_MAX_BY_GRADE);
    const start = rand(1, startMax);
    const seq = [start, start + step, start + step * 2, start + step * 3];
    const correct = start + step * 4;
    const spread = Math.max(3, step * 2);
    const { options, correctIndex } = buildOptions(correct, numberPool(correct, 0, correct + spread * 3, spread));
    return {
      prompt: 'What is the next number?',
      visual: `<span style="font-size:32px;font-weight:800;">${seq.join(', ')}, ❓</span>`,
      options: options.map(String),
      correctIndex,
    };
  };
}

// Fractions shown as a shaded flower/pie, denominators grow with grade.
const FRACTION_DENOMS_BY_GRADE = [[2], [2], [2, 3, 4], [2, 3, 4, 5, 6, 8], [2, 3, 4, 5, 6, 8, 10], [2, 3, 4, 5, 6, 8, 10], [2, 3, 4, 5, 6, 8, 10]];
const FRACTION_DISTRACTOR_POOL = ['1/2', '1/3', '2/3', '1/4', '2/4', '3/4', '1/5', '2/5', '1/6', '5/6', '1/8', '3/8', '1/10', '3/10'];

function pieSliceSVG(numerator, denominator, fill) {
  const cx = 70;
  const cy = 70;
  const r = 55;
  let paths = '';
  const anglePer = 360 / denominator;
  for (let i = 0; i < denominator; i++) {
    const startAngle = i * anglePer - 90;
    const endAngle = startAngle + anglePer;
    const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
    const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
    const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
    const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
    const largeArc = anglePer > 180 ? 1 : 0;
    const filled = i < numerator;
    paths += `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${largeArc} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${filled ? fill : '#f3edff'}" stroke="#8b5fbf" stroke-width="2"/>`;
  }
  return `<svg width="140" height="140" viewBox="0 0 140 140">${paths}</svg>`;
}

function genFraction() {
  return () => {
    const denomsPool = gscale(FRACTION_DENOMS_BY_GRADE);
    const denom = denomsPool[rand(0, denomsPool.length - 1)];
    const num = denom === 2 ? 1 : rand(1, denom - 1);
    const correct = `${num}/${denom}`;
    const fill = pick(CRYSTAL_COLORS);
    const { options, correctIndex } = buildOptions(correct, FRACTION_DISTRACTOR_POOL);
    return { prompt: 'What fraction of the flower is shaded?', visual: pieSliceSVG(num, denom, fill), options, correctIndex };
  };
}

/* ---------- World / level data ---------- */

const WORLDS = [
  {
    id: 'addsub',
    name: 'Rainbow Ridge',
    emoji: '🌈',
    icon: 'assets/badge-addsub.png',
    color: '#ff8fab',
    desc: 'Master numbers with Comet',
    companion: { name: 'Comet', emoji: '🦄' },
    levels: [
      { id: 'a1', name: 'Gem Gathering', gen: genAddition(RIDGE_EMOJI) },
      { id: 'a2', name: 'Treasure Take-Away', gen: genSubtraction(RIDGE_EMOJI) },
      { id: 'a3', name: 'Multiplying Magic', gen: genMultiplication(RIDGE_EMOJI) },
      { id: 'a4', name: 'Fair Shares', gen: genDivision(RIDGE_EMOJI) },
      { id: 'a5', name: 'Rainbow Mix-Up', gen: genMixedOps(RIDGE_EMOJI) },
    ],
  },
  {
    id: 'shapes',
    name: 'Crystal Caves',
    emoji: '💎',
    icon: 'assets/badge-shapes.png',
    color: '#b48ce0',
    desc: 'Discover 2D & 3D shapes with Crystal',
    companion: { name: 'Crystal', emoji: '🦄' },
    levels: [
      { id: 's1', name: 'Crystal Shapes', gen: genShapeName() },
      { id: 's2', name: 'Count the Facets', gen: genShapeSides() },
      { id: 's3', name: 'Space Crystals', gen: gen3DShape() },
      { id: 's4', name: 'Crystal Measurements', gen: genMeasurement() },
    ],
  },
  {
    id: 'patterns',
    name: 'Enchanted Meadow',
    emoji: '🌸',
    icon: 'assets/badge-patterns.png',
    color: '#ffd166',
    desc: 'Patterns & fractions with Blossom',
    companion: { name: 'Blossom', emoji: '🦄' },
    levels: [
      { id: 'p1', name: 'Flower Trail', gen: genFlowerTrail() },
      { id: 'p2', name: 'Magic Number Path', gen: genNumberPattern() },
      { id: 'p3', name: 'Fraction Flowers', gen: genFraction() },
    ],
  },
];

// Hand-placed spots on the island artwork (assets/island-map.jpg), as % of image width/height.
const ISLAND_POSITIONS = {
  addsub: { x: 32.5, y: 31 },
  shapes: { x: 56, y: 50 },
  patterns: { x: 55, y: 73 },
};

const QUESTIONS_PER_LEVEL = 6;

/* ---------- Progress persistence ---------- */

const STORAGE_KEY = 'mathquest_progress_v1';

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    /* ignore */
  }
}

let progress = loadProgress();

function getLevelStars(worldId, levelId) {
  return progress[worldId]?.[levelId]?.stars || 0;
}

function setLevelStars(worldId, levelId, stars) {
  progress[worldId] = progress[worldId] || {};
  const prev = progress[worldId][levelId]?.stars || 0;
  progress[worldId][levelId] = { stars: Math.max(prev, stars) };
  saveProgress(progress);
}

function totalStars() {
  let total = 0;
  for (const w of WORLDS) for (const l of w.levels) total += getLevelStars(w.id, l.id);
  return total;
}

// All worlds and levels are always open so kids of any age/skill can jump anywhere on the island.
function isWorldUnlocked() {
  return true;
}

function isLevelUnlocked() {
  return true;
}

/* ---------- Rendering ---------- */

const app = document.getElementById('app');

let state = { screen: 'map' };

function starsMarkup(count, max = 3, cls = 'star') {
  let html = '';
  for (let i = 0; i < max; i++) html += `<span class="${cls} ${i < count ? 'on' : ''}">★</span>`;
  return html;
}

function topbar(showStars = true) {
  return `
    <div class="topbar">
      <div class="title">🦄 Unicorn Island</div>
      <div class="topbar-right">
        <label class="grade-picker-wrap">
          <span class="grade-picker-label">Grade</span>
          <select id="gradePicker" class="grade-picker">
            ${GRADES.map((g, i) => `<option value="${i}"${i === getGrade() ? ' selected' : ''}>${g}</option>`).join('')}
          </select>
        </label>
        ${showStars ? `<div class="star-total">⭐ ${totalStars()}</div>` : ''}
      </div>
    </div>`;
}

function bindTopbar() {
  const picker = document.getElementById('gradePicker');
  if (picker) {
    picker.addEventListener('change', (e) => {
      setGrade(Number(e.target.value));
      render();
    });
  }
}

function render() {
  if (state.screen === 'map') renderMap();
  else if (state.screen === 'levels') renderLevels();
  else if (state.screen === 'quiz') renderQuiz();
  else if (state.screen === 'complete') renderComplete();
}

/* ---------- Island illustration ---------- */

function getRiderWorldId() {
  let lastUnlocked = WORLDS[0].id;
  for (let i = 0; i < WORLDS.length; i++) {
    const w = WORLDS[i];
    if (!isWorldUnlocked(i)) break;
    lastUnlocked = w.id;
    const mastered = w.levels.every((l) => getLevelStars(w.id, l.id) === 3);
    if (!mastered) return w.id;
  }
  return lastUnlocked;
}

function renderMap() {
  const riderId = getRiderWorldId();
  const riderPos = ISLAND_POSITIONS[riderId];

  const pins = WORLDS.map((w, i) => {
    const unlocked = isWorldUnlocked(i);
    const stars = w.levels.reduce((sum, l) => sum + getLevelStars(w.id, l.id), 0);
    const maxStars = w.levels.length * 3;
    const pos = ISLAND_POSITIONS[w.id];
    return `
      <button class="quest-pin" data-locked="${!unlocked}" data-world="${w.id}"
        style="left:${pos.x}%; top:${pos.y}%; --pin-color:${w.color}">
        <div class="badge">${unlocked ? `<img src="${w.icon}" alt="${w.name}">` : '🔒'}</div>
        <div class="pin-label">${w.name}</div>
        <div class="pin-stars stars-row">${starsMarkup(Math.min(3, Math.round((stars / maxStars) * 3)))}</div>
      </button>`;
  }).join('');

  const rider = `<div class="unicorn-rider" style="left:${riderPos.x}%; top:${riderPos.y}%;">🦄</div>`;

  app.innerHTML = `
    ${topbar()}
    <div class="screen">
      <h2 class="section-heading">Explore Unicorn Island! ✨</h2>
      <div class="island-wrap">
        <img class="island-bg" src="assets/island-map.jpg" alt="Map of Unicorn Island">
        ${pins}
        ${rider}
      </div>
    </div>`;

  bindTopbar();
  app.querySelectorAll('.quest-pin').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.locked === 'true') return;
      state = { screen: 'levels', worldId: btn.dataset.world };
      render();
    });
  });
}

function renderLevels() {
  const world = WORLDS.find((w) => w.id === state.worldId);
  const nodes = world.levels.map((l, i) => {
    const unlocked = isLevelUnlocked(world, i);
    const stars = getLevelStars(world.id, l.id);
    return `
      <button class="level-node" data-locked="${!unlocked}" data-level="${l.id}" style="--world-color:${world.color}">
        <div class="num">${unlocked ? i + 1 : '🔒'}</div>
        <div class="name">${l.name}</div>
        <div class="stars-row">${starsMarkup(stars)}</div>
      </button>`;
  }).join('');

  app.innerHTML = `
    ${topbar()}
    <div class="screen">
      <button class="back-btn">⬅ Map</button>
      <div class="world-crest-row">
        <div class="world-crest"><img src="${world.icon}" alt="${world.name}"></div>
        <div class="world-crest-text">
          <h2 class="section-heading">${world.name}</h2>
          <p class="world-greeting">${world.companion.emoji} ${world.companion.name} is ready to play!</p>
        </div>
      </div>
      <div class="level-grid">${nodes}</div>
    </div>`;

  bindTopbar();
  app.querySelector('.back-btn').addEventListener('click', () => {
    state = { screen: 'map' };
    render();
  });

  app.querySelectorAll('.level-node').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.locked === 'true') return;
      startLevel(world, world.levels.find((l) => l.id === btn.dataset.level));
    });
  });
}

function startLevel(world, level) {
  const questions = [];
  for (let i = 0; i < QUESTIONS_PER_LEVEL; i++) questions.push(level.gen());
  state = {
    screen: 'quiz',
    world,
    level,
    questions,
    qIndex: 0,
    firstTryCorrectCount: 0,
    attempted: false,
  };
  render();
}

function renderQuiz() {
  const { world, level, questions, qIndex } = state;
  const q = questions[qIndex];
  const optClass = q.options.length === 3 ? 'opt-3' : '';

  app.innerHTML = `
    ${topbar()}
    <div class="screen quiz-wrap">
      <button class="back-btn">⬅ Levels</button>
      <div class="progress-bar"><div class="fill" style="width:${(qIndex / questions.length) * 100}%"></div></div>
      <div class="quiz-card">
        <div class="quiz-prompt">${q.prompt}</div>
        <div class="quiz-visual">${q.visual}</div>
        <div class="options-grid ${optClass}">
          ${q.options.map((opt, i) => `<button class="opt-btn" data-i="${i}">${opt}</button>`).join('')}
        </div>
        <div class="feedback-banner" id="feedback"></div>
        <button class="next-btn" id="nextBtn" style="display:none">Next ➜</button>
      </div>
    </div>`;

  bindTopbar();
  app.querySelector('.back-btn').addEventListener('click', () => {
    state = { screen: 'levels', worldId: world.id };
    render();
  });

  const feedback = document.getElementById('feedback');
  const nextBtn = document.getElementById('nextBtn');
  let solved = false;
  let attempted = false;

  app.querySelectorAll('.opt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (solved || btn.disabled) return;
      const i = Number(btn.dataset.i);
      const isCorrect = i === q.correctIndex;
      if (!attempted) {
        attempted = true;
        if (isCorrect) state.firstTryCorrectCount++;
      }
      if (isCorrect) {
        btn.classList.add('correct');
        solved = true;
        app.querySelectorAll('.opt-btn').forEach((b) => (b.disabled = true));
        feedback.textContent = pick(['Great job! 🦄✨', 'Awesome! 🌈', 'You got it! 🙌', 'Magical! ✨']);
        feedback.className = 'feedback-banner good';
        nextBtn.style.display = 'inline-block';
      } else {
        btn.classList.add('wrong');
        btn.disabled = true;
        feedback.textContent = pick(['Not quite, try again!', 'Almost! Give it another go.', 'Keep trying!']);
        feedback.className = 'feedback-banner bad';
      }
    });
  });

  nextBtn.addEventListener('click', nextQuestion);
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function nextQuestion() {
  state.qIndex++;
  if (state.qIndex >= state.questions.length) {
    finishLevel();
  } else {
    render();
  }
}

function finishLevel() {
  const total = state.questions.length;
  const correct = state.firstTryCorrectCount;
  let stars;
  if (correct === total) stars = 3;
  else if (correct >= Math.ceil(total * 0.6)) stars = 2;
  else stars = 1;

  const prevStars = getLevelStars(state.world.id, state.level.id);
  setLevelStars(state.world.id, state.level.id, stars);

  state = {
    screen: 'complete',
    world: state.world,
    level: state.level,
    stars,
    improved: stars > prevStars,
  };
  render();
  if (stars === 3) spawnConfetti();
}

function renderComplete() {
  const { world, level, stars } = state;
  const cheer =
    stars === 3
      ? `${world.companion.name} ${world.companion.emoji} is doing a happy dance for you!`
      : stars === 2
      ? `${world.companion.name} ${world.companion.emoji} says great effort!`
      : `${world.companion.name} ${world.companion.emoji} says keep practicing, you'll get there!`;
  app.innerHTML = `
    ${topbar()}
    <div class="screen">
      <div class="complete-card">
        <h2>${stars === 3 ? '✨ Magical! ✨' : stars === 2 ? 'Sparkling!' : 'Nice Try!'}</h2>
        <div class="complete-stars">${starsMarkup(stars)}</div>
        <p>${level.name} — ${world.name}</p>
        <p>${cheer}</p>
        <div class="complete-actions">
          <button class="pill-btn primary" id="playAgain">Play Again</button>
          <button class="pill-btn secondary" id="toLevels">Levels</button>
          <button class="pill-btn secondary" id="toMap">Map</button>
        </div>
      </div>
    </div>`;

  bindTopbar();
  document.getElementById('playAgain').addEventListener('click', () => startLevel(world, level));
  document.getElementById('toLevels').addEventListener('click', () => {
    state = { screen: 'levels', worldId: world.id };
    render();
  });
  document.getElementById('toMap').addEventListener('click', () => {
    state = { screen: 'map' };
    render();
  });
}

function spawnConfetti() {
  const colors = ['#ff8fab', '#ffd166', '#b8f2c9', '#a0c4ff', '#c8b6ff', '#4fd1c5'];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[rand(0, colors.length - 1)];
    piece.style.animationDuration = `${1.2 + Math.random() * 1.2}s`;
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3000);
  }
}

render();
