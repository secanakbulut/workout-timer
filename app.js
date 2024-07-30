// interval timer for hiit / tabata / emom + custom.
// phases tick on rAF, beep on transitions, last custom set is in localStorage.

const ARC_R = 108;
const CIRC = 2 * Math.PI * ARC_R; // ~678.58

const PRESETS = {
  tabata: { work: 20, rest: 10, rounds: 8, label: 'tabata' },
  hiit:   { work: 30, rest: 30, rounds: 10, label: 'classic hiit' },
  emom:   { work: 60, rest: 0,  rounds: 10, label: 'emom' },
};

const els = {
  presets: document.querySelectorAll('.preset'),
  custom: document.getElementById('customPanel'),
  workSec: document.getElementById('workSec'),
  restSec: document.getElementById('restSec'),
  rounds: document.getElementById('rounds'),
  applyCustom: document.getElementById('applyCustom'),
  arc: document.getElementById('arc'),
  phase: document.getElementById('phase'),
  time: document.getElementById('time'),
  roundInfo: document.getElementById('roundInfo'),
  next: document.getElementById('nextLine'),
  start: document.getElementById('startBtn'),
  pause: document.getElementById('pauseBtn'),
  reset: document.getElementById('resetBtn'),
};

els.arc.style.strokeDasharray = CIRC.toFixed(2);

// ---- config + persistence ----
const LS_KEY = 'wt_custom';

function loadCustom() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (typeof c.work !== 'number' || typeof c.rest !== 'number' || typeof c.rounds !== 'number') return null;
    return c;
  } catch (e) {
    return null;
  }
}

function saveCustom(c) {
  localStorage.setItem(LS_KEY, JSON.stringify(c));
}

// hydrate the custom inputs from last saved
const savedCustom = loadCustom();
if (savedCustom) {
  els.workSec.value = savedCustom.work;
  els.restSec.value = savedCustom.rest;
  els.rounds.value = savedCustom.rounds;
}

// ---- state ----
let cfg = { work: 20, rest: 10, rounds: 8, label: 'tabata' };
let phase = 'ready';   // 'ready' | 'work' | 'rest' | 'done'
let roundIdx = 1;
let remaining = cfg.work;
let phaseTotal = cfg.work;
let running = false;
let raf = null;
let lastT = 0;

function setPreset(name) {
  els.presets.forEach(b => b.classList.toggle('on', b.dataset.preset === name));
  if (name === 'custom') {
    els.custom.classList.add('open');
    return;
  }
  els.custom.classList.remove('open');
  const p = PRESETS[name];
  cfg = { ...p };
  hardReset();
}

function applyCustomCfg() {
  const w = clamp(parseInt(els.workSec.value, 10), 5, 600);
  const r = clamp(parseInt(els.restSec.value, 10), 0, 600);
  const n = clamp(parseInt(els.rounds.value, 10), 1, 50);
  cfg = { work: w, rest: r, rounds: n, label: 'custom' };
  saveCustom({ work: w, rest: r, rounds: n });
  hardReset();
}

function clamp(n, lo, hi) {
  if (isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function hardReset() {
  cancel();
  running = false;
  phase = 'ready';
  roundIdx = 1;
  phaseTotal = cfg.work;
  remaining = cfg.work;
  els.start.disabled = false;
  els.pause.disabled = true;
  paint();
}

// ---- rendering ----
function fmt(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function paint() {
  els.time.textContent = fmt(remaining);
  els.roundInfo.textContent = `round ${Math.min(roundIdx, cfg.rounds)} of ${cfg.rounds}`;

  if (phase === 'ready') {
    els.phase.textContent = 'ready';
    els.arc.classList.remove('work', 'rest');
    els.next.textContent = `first up: work ${cfg.work}s`;
  } else if (phase === 'work') {
    els.phase.textContent = 'work';
    els.arc.classList.add('work');
    els.arc.classList.remove('rest');
    if (cfg.rest > 0 && roundIdx < cfg.rounds) {
      els.next.textContent = `next: rest ${cfg.rest}s`;
    } else if (roundIdx < cfg.rounds) {
      els.next.textContent = `next: round ${roundIdx + 1}`;
    } else {
      els.next.textContent = 'next: done';
    }
  } else if (phase === 'rest') {
    els.phase.textContent = 'rest';
    els.arc.classList.add('rest');
    els.arc.classList.remove('work');
    els.next.textContent = `next: round ${roundIdx + 1} work ${cfg.work}s`;
  } else if (phase === 'done') {
    els.phase.textContent = 'done';
    els.arc.classList.remove('work', 'rest');
    els.next.textContent = 'nice work';
  }

  // arc progress: phase fraction of remaining/phaseTotal
  const pct = phaseTotal > 0 ? remaining / phaseTotal : 0;
  els.arc.style.strokeDashoffset = ((1 - pct) * CIRC).toFixed(2);

  document.title = phase === 'ready' || phase === 'done'
    ? 'workout timer'
    : `${fmt(remaining)} ${phase} - workout timer`;
}

// ---- audio ----
let actx = null;
function beep(kind) {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    // work-start higher, rest-start lower, finish a small two-note flourish
    const freq = kind === 'work' ? 880 : kind === 'rest' ? 523 : 660;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain).connect(actx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
    if (kind === 'done') {
      // little second tone
      const o2 = actx.createOscillator();
      const g2 = actx.createGain();
      o2.type = 'sine';
      o2.frequency.value = 990;
      g2.gain.setValueAtTime(0, t + 0.3);
      g2.gain.linearRampToValueAtTime(0.18, t + 0.32);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
      o2.connect(g2).connect(actx.destination);
      o2.start(t + 0.3);
      o2.stop(t + 0.8);
    }
  } catch (e) {
    // autoplay policy can block until first gesture, ignore
  }
}

// ---- ticking ----
function tick(now) {
  if (!running) return;
  const dt = (now - lastT) / 1000;
  lastT = now;
  remaining -= dt;
  if (remaining <= 0) {
    advance();
    return;
  }
  paint();
  raf = requestAnimationFrame(tick);
}

function advance() {
  // figure out what comes next
  if (phase === 'ready') {
    phase = 'work';
    phaseTotal = cfg.work;
    remaining = cfg.work;
    beep('work');
  } else if (phase === 'work') {
    if (cfg.rest > 0 && roundIdx < cfg.rounds) {
      phase = 'rest';
      phaseTotal = cfg.rest;
      remaining = cfg.rest;
      beep('rest');
    } else if (roundIdx < cfg.rounds) {
      // no rest configured (emom-ish). roll straight into next work.
      roundIdx += 1;
      phase = 'work';
      phaseTotal = cfg.work;
      remaining = cfg.work;
      beep('work');
    } else {
      finish();
      return;
    }
  } else if (phase === 'rest') {
    roundIdx += 1;
    if (roundIdx > cfg.rounds) {
      finish();
      return;
    }
    phase = 'work';
    phaseTotal = cfg.work;
    remaining = cfg.work;
    beep('work');
  }
  paint();
  lastT = performance.now();
  raf = requestAnimationFrame(tick);
}

function finish() {
  running = false;
  phase = 'done';
  remaining = 0;
  phaseTotal = 1;
  els.start.disabled = true;
  els.pause.disabled = true;
  beep('done');
  paint();
}

function start() {
  if (running) return;
  if (phase === 'done') hardReset();
  if (phase === 'ready') {
    phase = 'work';
    phaseTotal = cfg.work;
    remaining = cfg.work;
    beep('work');
  }
  running = true;
  els.start.disabled = true;
  els.pause.disabled = false;
  lastT = performance.now();
  raf = requestAnimationFrame(tick);
  paint();
}

function pause() {
  if (!running) return;
  running = false;
  cancel();
  els.start.disabled = false;
  els.pause.disabled = true;
}

function cancel() {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
}

// ---- helpers exposed for tinkering ----
// total expected runtime in seconds. handy for the page title or future stats.
function totalRuntime() {
  return cfg.rounds * cfg.work + Math.max(0, cfg.rounds - 1) * cfg.rest;
}
// TODO: surface this somewhere on screen, maybe under round info.

// ---- wire up ----
els.presets.forEach(btn => {
  btn.addEventListener('click', () => setPreset(btn.dataset.preset));
});
els.applyCustom.addEventListener('click', applyCustomCfg);
els.start.addEventListener('click', start);
els.pause.addEventListener('click', pause);
els.reset.addEventListener('click', hardReset);

// keyboard: space toggles run, r resets
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') {
    e.preventDefault();
    running ? pause() : start();
  } else if (e.key === 'r' || e.key === 'R') {
    hardReset();
  }
});

// init: start with tabata selected
setPreset('tabata');
console.log('workout timer ready, total seconds:', totalRuntime());
