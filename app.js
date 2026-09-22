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
function randomEmoji() {
  return EMOJI_SET[rand(0, EMOJI_SET.length - 1)];
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

const SHAPE_FILL = '#3fa7f2';
const SHAPE_DEFS = {
  circle: () => `<circle cx="70" cy="70" r="55" fill="${SHAPE_FILL}"/>`,
  square: () => `<rect x="18" y="18" width="104" height="104" rx="10" fill="${SHAPE_FILL}"/>`,
  rectangle: () => `<rect x="6" y="35" width="128" height="70" rx="10" fill="${SHAPE_FILL}"/>`,
  triangle: () => `<polygon points="${regularPolygonPoints(70, 74, 62, 3)}" fill="${SHAPE_FILL}"/>`,
  pentagon: () => `<polygon points="${regularPolygonPoints(70, 70, 58, 5)}" fill="${SHAPE_FILL}"/>`,
  hexagon: () => `<polygon points="${regularPolygonPoints(70, 70, 58, 6)}" fill="${SHAPE_FILL}"/>`,
  star: () => `<polygon points="${starPoints(70, 70, 58, 26, 5)}" fill="${SHAPE_FILL}"/>`,
  oval: () => `<ellipse cx="70" cy="70" rx="60" ry="40" fill="${SHAPE_FILL}"/>`,
  diamond: () => `<polygon points="${regularPolygonPoints(70, 70, 58, 4)}" fill="${SHAPE_FILL}"/>`,
};
const SHAPE_SIDES = { triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6 };
const SHAPE_LABELS = {
  circle: 'Circle', square: 'Square', rectangle: 'Rectangle', triangle: 'Triangle',
  pentagon: 'Pentagon', hexagon: 'Hexagon', star: 'Star', oval: 'Oval', diamond: 'Diamond',
};

function shapeSVG(name) {
  return `<svg width="140" height="140" viewBox="0 0 140 140">${SHAPE_DEFS[name]()}</svg>`;
}

/* ---------- Question generators ---------- */

function genCounting(minN, maxN) {
  return () => {
    const n = rand(minN, maxN);
    const emoji = randomEmoji();
    const { options, correctIndex } = buildOptions(n, numberPool(n, 1, maxN + 2, 3));
    return {
      prompt: 'How many are there?',
      visual: `<span>${emoji.repeat(n)}</span>`,
      options: options.map(String),
      correctIndex,
    };
  };
}

function genBeforeAfter() {
  return () => {
    const isAfter = Math.random() < 0.5;
    const n = isAfter ? rand(1, 19) : rand(2, 20);
    const correct = isAfter ? n + 1 : n - 1;
    const { options, correctIndex } = buildOptions(correct, numberPool(correct, 0, 21, 3));
    return {
      prompt: isAfter ? `What number comes right after ${n}?` : `What number comes right before ${n}?`,
      visual: `<span style="font-size:56px;font-weight:800;">${n}</span>`,
      options: options.map(String),
      correctIndex,
    };
  };
}

function genMoreLess() {
  return () => {
    let a = rand(1, 20);
    let b = rand(1, 20);
    while (b === a) b = rand(1, 20);
    const wantBigger = Math.random() < 0.5;
    const correct = wantBigger ? Math.max(a, b) : Math.min(a, b);
    const options = shuffle([a, b]);
    return {
      prompt: wantBigger ? 'Which number is bigger?' : 'Which number is smaller?',
      visual: '',
      options: options.map(String),
      correctIndex: options.indexOf(correct),
    };
  };
}

function genAddition(maxSum) {
  return () => {
    const a = rand(1, Math.min(9, maxSum - 1));
    const b = rand(1, maxSum - a);
    const correct = a + b;
    const emoji = randomEmoji();
    const { options, correctIndex } = buildOptions(correct, numberPool(correct, 0, maxSum + 2, 3));
    return {
      prompt: `${a} + ${b} = ?`,
      visual: `<span>${emoji.repeat(a)}</span> <span style="color:#ff5c8a">+</span> <span>${emoji.repeat(b)}</span>`,
      options: options.map(String),
      correctIndex,
    };
  };
}

function genSubtraction(maxStart) {
  return () => {
    const a = rand(2, maxStart);
    const b = rand(1, a);
    const correct = a - b;
    const emoji = randomEmoji();
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

function genMixedAddSub(max) {
  const add = genAddition(max);
  const sub = genSubtraction(max);
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

const PATTERN_ICONS = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠'];

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
    id: 'counting',
    name: 'Counting Cove',
    emoji: '🏝️',
    color: '#3fa7f2',
    desc: 'Counting & numbers',
    levels: [
      { id: 'c1', name: 'Count to 10', gen: genCounting(1, 10) },
      { id: 'c2', name: 'Count to 20', gen: genCounting(11, 20) },
      { id: 'c3', name: 'Before & After', gen: genBeforeAfter() },
      { id: 'c4', name: 'More or Less', gen: genMoreLess() },
    ],
  },
  {
    id: 'addsub',
    name: 'Add & Subtract Summit',
    emoji: '⛰️',
    color: '#ff5c8a',
    desc: 'Adding & taking away',
    levels: [
      { id: 'a1', name: 'Adding to 10', gen: genAddition(10) },
      { id: 'a2', name: 'Adding to 20', gen: genAddition(20) },
      { id: 'a3', name: 'Subtracting to 10', gen: genSubtraction(10) },
      { id: 'a4', name: 'Subtracting to 20', gen: genSubtraction(20) },
      { id: 'a5', name: 'Mix It Up', gen: genMixedAddSub(20) },
    ],
  },
  {
    id: 'shapes',
    name: 'Shape Shore',
    emoji: '🔷',
    color: '#34c98f',
    desc: '2D shapes',
    levels: [
      { id: 's1', name: 'Name That Shape', gen: genShapeName(['circle', 'square', 'triangle', 'rectangle']) },
      { id: 's2', name: 'Tricky Shapes', gen: genShapeName(['pentagon', 'hexagon', 'star', 'oval', 'diamond']) },
      { id: 's3', name: 'Count the Sides', gen: genShapeSides() },
    ],
  },
  {
    id: 'patterns',
    name: 'Pattern Path',
    emoji: '🌈',
    color: '#ffc23c',
    desc: 'Patterns & sequences',
    levels: [
      { id: 'p1', name: 'AB Patterns', gen: genPatternAB() },
      { id: 'p2', name: 'ABC Patterns', gen: genPatternABC() },
      { id: 'p3', name: 'Number Patterns', gen: genNumberPattern() },
    ],
  },
];

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
      <div class="title">🧭 Math Quest</div>
      ${showStars ? `<div class="star-total">⭐ ${totalStars()}</div>` : '<div></div>'}
    </div>`;
}

function render() {
  if (state.screen === 'map') renderMap();
  else if (state.screen === 'levels') renderLevels();
  else if (state.screen === 'quiz') renderQuiz();
  else if (state.screen === 'complete') renderComplete();
}

function renderMap() {
  const nodes = WORLDS.map((w, i) => {
    const unlocked = isWorldUnlocked(i);
    const stars = w.levels.reduce((sum, l) => sum + getLevelStars(w.id, l.id), 0);
    const maxStars = w.levels.length * 3;
    return `
      <button class="world-node" data-locked="${!unlocked}" data-world="${w.id}">
        <div class="emoji-badge" style="background:${w.color}22">${w.emoji}</div>
        <div class="info">
          <h3>${w.name}</h3>
          <p>${w.desc}</p>
          <div class="stars-row">${starsMarkup(Math.min(3, Math.round((stars / maxStars) * 3)))}</div>
        </div>
        ${unlocked ? '' : '<div class="lock">🔒</div>'}
      </button>`;
  }).join('');

  app.innerHTML = `
    ${topbar()}
    <div class="screen">
      <h2 class="section-heading">Choose your adventure!</h2>
      <div class="map-path">${nodes}</div>
    </div>`;

  app.querySelectorAll('.world-node').forEach((btn) => {
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
        feedback.textContent = pick(['Great job! 🎉', 'Awesome! ⭐', 'You got it! 🙌', 'Super! ✨']);
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
  app.innerHTML = `
    ${topbar()}
    <div class="screen">
      <div class="complete-card">
        <h2>${stars === 3 ? 'Perfect!' : stars === 2 ? 'Well done!' : 'Level complete!'}</h2>
        <div class="complete-stars">${starsMarkup(stars)}</div>
        <p>${level.name} — ${world.name}</p>
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
  const colors = ['#ff5c8a', '#ffc23c', '#34c98f', '#3fa7f2', '#5b3fd6'];
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
