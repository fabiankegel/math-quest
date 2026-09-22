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

function genAddition(maxSum, emojiPool = EMOJI_SET) {
  return () => {
    const a = rand(1, Math.min(9, maxSum - 1));
    const b = rand(1, maxSum - a);
    const correct = a + b;
    const emoji = pick(emojiPool);
    const { options, correctIndex } = buildOptions(correct, numberPool(correct, 0, maxSum + 2, 3));
    return {
      prompt: `${a} + ${b} = ?`,
      visual: `<span>${emoji.repeat(a)}</span> <span style="color:#ff5c8a">+</span> <span>${emoji.repeat(b)}</span>`,
      options: options.map(String),
      correctIndex,
    };
  };
}

function genSubtraction(maxStart, emojiPool = EMOJI_SET) {
  return () => {
    const a = rand(2, maxStart);
    const b = rand(1, a);
    const correct = a - b;
    const emoji = pick(emojiPool);
    const kept = `<span>${emoji.repeat(a - b)}</span>`;
    const crossed = b > 0 ? `<span class="crossed">${emoji.repeat(b)}</span>` : '';
    const { options, correctIndex } = buildOptions(correct, numberPool(correct, 0, maxStart, 3));
    return {
      prompt: `${a} - ${b} = ?`,
      visual: `${kept}${crossed}`,
      options: options.map(String),
      correctIndex,
    };
  };
}

function genMixedAddSub(max, emojiPool = EMOJI_SET) {
  const add = genAddition(max, emojiPool);
  const sub = genSubtraction(max, emojiPool);
  return () => (Math.random() < 0.5 ? add() : sub());
}

function genShapeName(shapeList) {
  return () => {
    const name = shapeList[rand(0, shapeList.length - 1)];
    const pool = shapeList.filter((s) => s !== name).map((s) => SHAPE_LABELS[s]);
    const { options, correctIndex } = buildOptions(SHAPE_LABELS[name], pool, Math.min(4, shapeList.length));
    return {
      prompt: 'What shape is this?',
      visual: shapeSVG(name),
      options,
      correctIndex,
    };
  };
}

function genShapeSides() {
  const shapes = Object.keys(SHAPE_SIDES);
  return () => {
    const name = shapes[rand(0, shapes.length - 1)];
    const correct = SHAPE_SIDES[name];
    const { options, correctIndex } = buildOptions(correct, [3, 4, 5, 6]);
    return {
      prompt: 'How many sides does this shape have?',
      visual: shapeSVG(name),
      options: options.map(String),
      correctIndex,
    };
  };
}

const PATTERN_ICONS = ['🌸', '🦋', '🌼', '🍄', '🌿', '🐝'];

function genPatternAB() {
  return () => {
    const [a, b] = sample(PATTERN_ICONS, 2);
    const seqLen = 6;
    const seq = [];
    for (let i = 0; i < seqLen; i++) seq.push(i % 2 === 0 ? a : b);
    const correct = seqLen % 2 === 0 ? a : b;
    const shown = seq.join(' ');
    const distractorPool = PATTERN_ICONS.filter((c) => c !== correct);
    const { options, correctIndex } = buildOptions(correct, [b === correct ? a : b, ...distractorPool]);
    return {
      prompt: 'What comes next in the pattern?',
      visual: `<span style="letter-spacing:8px">${shown} ❓</span>`,
      options,
      correctIndex,
    };
  };
}

function genPatternABC() {
  return () => {
    const [a, b, c] = sample(PATTERN_ICONS, 3);
    const seq = [a, b, c, a, b, c, a];
    const correct = b;
    const shown = seq.join(' ');
    const distractorPool = PATTERN_ICONS.filter((x) => x !== correct);
    const { options, correctIndex } = buildOptions(correct, [a, c, ...distractorPool]);
    return {
      prompt: 'What comes next in the pattern?',
      visual: `<span style="letter-spacing:8px">${shown} ❓</span>`,
      options,
      correctIndex,
    };
  };
}

function genNumberPattern() {
  return () => {
    const step = [1, 2, 5, 10][rand(0, 3)];
    const start = rand(1, 20);
    const seq = [start, start + step, start + step * 2, start + step * 3];
    const correct = start + step * 4;
    const { options, correctIndex } = buildOptions(correct, numberPool(correct, 0, correct + 20, step * 2));
    return {
      prompt: 'What is the next number?',
      visual: `<span style="font-size:34px;font-weight:800;">${seq.join(', ')}, ❓</span>`,
      options: options.map(String),
      correctIndex,
    };
  };
}

/* ---------- World / level data ---------- */

const WORLDS = [
  {
    id: 'addsub',
    name: 'Rainbow Ridge',
    emoji: '🌈',
    color: '#ff8fab',
    desc: 'Add & subtract gems with Comet',
    companion: { name: 'Comet', emoji: '🦄' },
    levels: [
      { id: 'a1', name: 'Gem Gathering (to 10)', gen: genAddition(10, RIDGE_EMOJI) },
      { id: 'a2', name: 'Gem Gathering (to 20)', gen: genAddition(20, RIDGE_EMOJI) },
      { id: 'a3', name: 'Sharing Treasure (to 10)', gen: genSubtraction(10, RIDGE_EMOJI) },
      { id: 'a4', name: 'Sharing Treasure (to 20)', gen: genSubtraction(20, RIDGE_EMOJI) },
      { id: 'a5', name: 'Rainbow Mix-Up', gen: genMixedAddSub(20, RIDGE_EMOJI) },
    ],
  },
  {
    id: 'shapes',
    name: 'Crystal Caves',
    emoji: '💎',
    color: '#b48ce0',
    desc: 'Discover shapes with Crystal',
    companion: { name: 'Crystal', emoji: '🦄' },
    levels: [
      { id: 's1', name: 'Crystal Shapes', gen: genShapeName(['circle', 'square', 'triangle', 'rectangle']) },
      { id: 's2', name: 'Rare Crystals', gen: genShapeName(['pentagon', 'hexagon', 'star', 'oval', 'diamond']) },
      { id: 's3', name: 'Count the Facets', gen: genShapeSides() },
    ],
  },
  {
    id: 'patterns',
    name: 'Enchanted Meadow',
    emoji: '🌸',
    color: '#ffd166',
    desc: 'Spot patterns with Blossom',
    companion: { name: 'Blossom', emoji: '🦄' },
    levels: [
      { id: 'p1', name: 'Flower Trail (AB)', gen: genPatternAB() },
      { id: 'p2', name: 'Flower Trail (ABC)', gen: genPatternABC() },
      { id: 'p3', name: 'Magic Number Path', gen: genNumberPattern() },
    ],
  },
];

// Hand-placed spots on the island illustration's 400x700 viewBox, one per world.
const ISLAND_POSITIONS = {
  addsub: { x: 116, y: 572 },
  shapes: { x: 258, y: 372 },
  patterns: { x: 150, y: 156 },
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

function isWorldUnlocked(worldIndex) {
  if (worldIndex === 0) return true;
  const prevWorld = WORLDS[worldIndex - 1];
  return prevWorld.levels.every((l) => getLevelStars(prevWorld.id, l.id) > 0);
}

function isLevelUnlocked(world, levelIndex) {
  if (levelIndex === 0) return true;
  const prevLevel = world.levels[levelIndex - 1];
  return getLevelStars(world.id, prevLevel.id) > 0;
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
      ${showStars ? `<div class="star-total">⭐ ${totalStars()}</div>` : '<div></div>'}
    </div>`;
}

function render() {
  if (state.screen === 'map') renderMap();
  else if (state.screen === 'levels') renderLevels();
  else if (state.screen === 'quiz') renderQuiz();
  else if (state.screen === 'complete') renderComplete();
}

/* ---------- Island illustration ---------- */

function treeSVG(x, y, scale = 1, hue = 140) {
  return `
    <g transform="translate(${x},${y}) scale(${scale})">
      <rect x="-3" y="0" width="6" height="16" rx="2" fill="#8a5a34"/>
      <circle cx="0" cy="-10" r="15" fill="hsl(${hue},45%,42%)"/>
      <circle cx="-10" cy="-2" r="11" fill="hsl(${hue},45%,46%)"/>
      <circle cx="10" cy="-2" r="11" fill="hsl(${hue},45%,46%)"/>
    </g>`;
}

function crystalCluster(x, y, scale = 1) {
  const c = CRYSTAL_COLORS;
  return `
    <g transform="translate(${x},${y}) scale(${scale})">
      <polygon points="0,-26 9,0 0,7 -9,0" fill="${c[1]}"/>
      <polygon points="16,-12 23,4 16,11 9,4" fill="${c[3]}"/>
      <polygon points="-16,-8 -9,6 -16,13 -23,6" fill="${c[0]}"/>
    </g>`;
}

function cloudSVG(x, y, scale = 1, opacity = 0.9) {
  return `
    <g transform="translate(${x},${y}) scale(${scale})" opacity="${opacity}">
      <ellipse cx="0" cy="0" rx="28" ry="15" fill="#ffffff"/>
      <ellipse cx="-19" cy="5" rx="17" ry="11" fill="#ffffff"/>
      <ellipse cx="19" cy="5" rx="19" ry="12" fill="#ffffff"/>
    </g>`;
}

function critter(emoji, x, y, size = 22, opacity = 1) {
  return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" opacity="${opacity}">${emoji}</text>`;
}

function buildIslandSVG() {
  return `
<svg class="island-svg" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#b7ecf2"/>
      <stop offset="100%" stop-color="#2f8fd1"/>
    </linearGradient>
    <linearGradient id="islandGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#bce89a"/>
      <stop offset="100%" stop-color="#6fae52"/>
    </linearGradient>
    <linearGradient id="mountainGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d9c9f5"/>
      <stop offset="100%" stop-color="#9a7fc4"/>
    </linearGradient>
    <radialGradient id="caveGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f3d9ff"/>
      <stop offset="100%" stop-color="#5c3d82"/>
    </radialGradient>
  </defs>

  <rect x="0" y="0" width="400" height="700" fill="url(#seaGrad)"/>
  <path d="M0,60 Q40,50 80,60 T160,60 T240,60 T320,60 T400,58" stroke="#ffffff" stroke-width="2.5" fill="none" opacity="0.5"/>
  <path d="M0,650 Q40,642 80,650 T160,650 T240,650 T320,650 T400,648" stroke="#ffffff" stroke-width="2.5" fill="none" opacity="0.4"/>

  ${cloudSVG(60, 45, 1, 0.9)}
  ${cloudSVG(330, 70, 0.8, 0.85)}
  ${cloudSVG(210, 30, 0.65, 0.8)}

  <!-- island landmass -->
  <path d="M70,430 C45,350 75,230 135,165 C168,128 222,100 262,118
           C308,138 322,185 312,232 C358,262 378,320 352,378
           C390,418 380,500 332,558 C300,606 252,646 192,658
           C132,670 82,642 62,582 C34,522 46,470 70,430 Z"
        fill="#f5e2ae" stroke="#f5e2ae" stroke-width="22" stroke-linejoin="round"/>
  <path d="M70,430 C45,350 75,230 135,165 C168,128 222,100 262,118
           C308,138 322,185 312,232 C358,262 378,320 352,378
           C390,418 380,500 332,558 C300,606 252,646 192,658
           C132,670 82,642 62,582 C34,522 46,470 70,430 Z"
        fill="url(#islandGrad)"/>

  <!-- river: from the highland meadow down through the valley to the sea -->
  <path d="M168,230 C148,284 196,318 176,368 C156,420 214,458 196,516
           C178,574 258,588 300,640 C316,658 334,652 348,648"
        fill="none" stroke="#3fa7f2" stroke-width="13" stroke-linecap="round" opacity="0.85"/>
  <path d="M168,230 C148,284 196,318 176,368 C156,420 214,458 196,516
           C178,574 258,588 300,640 C316,658 334,652 348,648"
        fill="none" stroke="#bfe9ff" stroke-width="4" stroke-linecap="round" opacity="0.8"/>

  <!-- Enchanted Meadow (top) -->
  <ellipse cx="150" cy="185" rx="95" ry="52" fill="#d7f2a3" opacity="0.9"/>
  <ellipse cx="95" cy="210" rx="55" ry="30" fill="#e7f7c2" opacity="0.8"/>
  ${treeSVG(70, 150, 1.1, 140)}
  ${treeSVG(215, 140, 0.9, 150)}
  ${treeSVG(210, 205, 1, 130)}
  ${critter('🌸', 120, 175, 18)}
  ${critter('🌼', 165, 200, 16)}
  ${critter('🌸', 185, 155, 15)}
  ${critter('🦋', 100, 130, 20)}
  ${critter('🦊', 235, 175, 22)}
  ${critter('✨', 145, 120, 14, 0.9)}

  <!-- Crystal Caves (middle) -->
  <polygon points="215,395 250,318 285,395" fill="url(#mountainGrad)"/>
  <polygon points="235,395 268,335 300,395" fill="url(#mountainGrad)"/>
  <polygon points="240,340 250,318 262,342" fill="#ffffff" opacity="0.9"/>
  <polygon points="258,354 268,335 280,357" fill="#ffffff" opacity="0.85"/>
  <ellipse cx="258" cy="398" rx="30" ry="22" fill="url(#caveGlow)"/>
  <ellipse cx="258" cy="402" rx="20" ry="14" fill="#2c1f42"/>
  ${crystalCluster(212, 400, 0.8)}
  ${crystalCluster(302, 392, 0.75)}
  ${critter('🐲', 258, 396, 22)}
  ${critter('🐿️', 195, 415, 20)}
  ${critter('✨', 285, 350, 13, 0.9)}

  <!-- Rainbow Ridge (bottom) -->
  <ellipse cx="118" cy="600" rx="90" ry="48" fill="#f5b8c9"/>
  <ellipse cx="118" cy="600" rx="90" ry="48" fill="#ffffff" opacity="0.15"/>
  <path d="M55,585 A70,70 0 0 1 195,585" fill="none" stroke="#ff6b6b" stroke-width="7"/>
  <path d="M62,590 A62,62 0 0 1 188,590" fill="none" stroke="#ffb648" stroke-width="7"/>
  <path d="M69,595 A54,54 0 0 1 181,595" fill="none" stroke="#ffe066" stroke-width="7"/>
  <path d="M76,600 A46,46 0 0 1 174,600" fill="none" stroke="#5fd68a" stroke-width="7"/>
  <path d="M83,605 A38,38 0 0 1 167,605" fill="none" stroke="#5ab8f2" stroke-width="7"/>
  ${critter('🐚', 75, 622, 18)}
  ${critter('🐦', 165, 570, 20)}
  ${critter('🐢', 155, 630, 20)}
  ${critter('✨', 118, 560, 14, 0.9)}

  <!-- winding quest trail -->
  <path d="M200,660 C165,625 140,605 116,572 C158,515 205,470 258,372
           C232,300 190,230 150,156"
        fill="none" stroke="#fffdfb" stroke-width="6" stroke-linecap="round"
        stroke-dasharray="2 14" opacity="0.95"/>

  <!-- starting dock -->
  <g transform="translate(200,662)">
    <rect x="-5" y="-24" width="3" height="24" fill="#8a5a34"/>
    <path d="M-2,-24 L20,-17 L-2,-10 Z" fill="#fff6e0"/>
  </g>
</svg>`;
}

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
        style="left:${((pos.x / 400) * 100).toFixed(2)}%; top:${((pos.y / 700) * 100).toFixed(2)}%; --pin-color:${w.color}">
        <div class="badge">${unlocked ? w.emoji : '🔒'}</div>
        <div class="pin-label">${w.name}</div>
        <div class="pin-stars stars-row">${starsMarkup(Math.min(3, Math.round((stars / maxStars) * 3)))}</div>
      </button>`;
  }).join('');

  const rider = `<div class="unicorn-rider" style="left:${((riderPos.x / 400) * 100).toFixed(2)}%; top:${((riderPos.y / 700) * 100).toFixed(2)}%;">🦄</div>`;

  app.innerHTML = `
    ${topbar()}
    <div class="screen">
      <h2 class="section-heading">Explore Unicorn Island! ✨</h2>
      <div class="island-wrap">
        ${buildIslandSVG()}
        ${pins}
        ${rider}
      </div>
    </div>`;

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
      <h2 class="section-heading">${world.emoji} ${world.name}</h2>
      <p class="world-greeting">${world.companion.emoji} ${world.companion.name} is ready to play!</p>
      <div class="level-grid">${nodes}</div>
    </div>`;

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
