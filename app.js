// tabata-only first cut. work/rest/rounds hardcoded for now.

const ARC_R = 108;
const CIRC = 2 * Math.PI * ARC_R;

const cfg = { work: 20, rest: 10, rounds: 8 };

const els = {
  arc: document.getElementById('arc'),
  phase: document.getElementById('phase'),
  time: document.getElementById('time'),
  roundInfo: document.getElementById('roundInfo'),
  start: document.getElementById('startBtn'),
  pause: document.getElementById('pauseBtn'),
  reset: document.getElementById('resetBtn'),
};

els.arc.style.strokeDasharray = CIRC.toFixed(2);

let phase = 'ready'; // 'ready' | 'work' | 'rest' | 'done'
let roundIdx = 1;
let phaseTotal = cfg.work;
let remaining = cfg.work;
let running = false;
let raf = null;
let lastT = 0;

function fmt(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function paint() {
  els.time.textContent = fmt(remaining);
  els.roundInfo.textContent = `round ${Math.min(roundIdx, cfg.rounds)} of ${cfg.rounds}`;
  els.phase.textContent = phase;
  els.arc.classList.toggle('work', phase === 'work');
  els.arc.classList.toggle('rest', phase === 'rest');
  const pct = phaseTotal > 0 ? remaining / phaseTotal : 0;
  els.arc.style.strokeDashoffset = ((1 - pct) * CIRC).toFixed(2);
}

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
  if (phase === 'work') {
    if (roundIdx < cfg.rounds) {
      phase = 'rest';
      phaseTotal = cfg.rest;
      remaining = cfg.rest;
    } else {
      finish();
      return;
    }
  } else if (phase === 'rest') {
    roundIdx += 1;
    phase = 'work';
    phaseTotal = cfg.work;
    remaining = cfg.work;
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
  paint();
}

function start() {
  if (running) return;
  if (phase === 'done') hardReset();
  if (phase === 'ready') {
    phase = 'work';
    phaseTotal = cfg.work;
    remaining = cfg.work;
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
  if (raf) cancelAnimationFrame(raf);
  els.start.disabled = false;
  els.pause.disabled = true;
}

function hardReset() {
  if (raf) cancelAnimationFrame(raf);
  running = false;
  phase = 'ready';
  roundIdx = 1;
  phaseTotal = cfg.work;
  remaining = cfg.work;
  els.start.disabled = false;
  els.pause.disabled = true;
  paint();
}

els.start.addEventListener('click', start);
els.pause.addEventListener('click', pause);
els.reset.addEventListener('click', hardReset);

paint();
