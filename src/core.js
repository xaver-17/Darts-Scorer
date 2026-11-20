// ===== Darts-Kern: Board, Checkouts, Bot =====
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const dlabel = (n, m) => n === 25 ? (m === 2 ? 'Bull' : '25') : (m === 3 ? 'T' : m === 2 ? 'D' : '') + n;

function scoreAt(x, y) {
  const r = Math.hypot(x, y);
  if (r <= 6.35) return { v: 50, m: 2, n: 25, l: 'Bull' };
  if (r <= 15.9) return { v: 25, m: 1, n: 25, l: '25' };
  if (r > 170) return { v: 0, m: 0, n: 0, l: 'Miss' };
  const deg = Math.atan2(y, x) * 180 / Math.PI;
  const cw = ((90 - deg) % 360 + 360) % 360;
  const n = ORDER[Math.floor(((cw + 9) % 360) / 18)];
  const m = (r >= 99 && r <= 107) ? 3 : (r >= 162) ? 2 : 1;
  return { v: n * m, m, n, l: dlabel(n, m) };
}
function aimPoint(n, m) {
  if (n === 25) return [0, 0];
  const rad = (90 - ORDER.indexOf(n) * 18) * Math.PI / 180;
  const r = m === 3 ? 103 : m === 2 ? 165 : 134;
  return [r * Math.cos(rad), r * Math.sin(rad)];
}
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function throwDart(n, m, sigma) { const [ax, ay] = aimPoint(n, m); const x = ax + gauss() * sigma, y = ay + gauss() * sigma; return Object.assign(scoreAt(x, y), { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }); }

// Alle Darts
const DARTS = [];
for (let n = 1; n <= 20; n++) for (const m of [1, 2, 3]) DARTS.push({ n, m, v: n * m });
DARTS.push({ n: 25, m: 1, v: 25 }, { n: 25, m: 2, v: 50 });
const DPREF = [20, 16, 18, 12, 10, 8, 14, 6, 4, 2, 17, 19, 15, 13, 11, 9, 7, 5, 3, 1, 25];
const FINISH = DARTS.filter(d => d.m === 2);
const setupCost = d => d.m === 1 ? (d.n === 25 ? 3 : (20 - d.n) * 0.01) : d.m === 3 ? 1 + (20 - d.n) * 0.05 : d.n === 25 ? 3.5 : 5;
const finCost = d => DPREF.indexOf(d.n) * 0.3;

// best[r] = { k1, k2, k3 } beste Route mit genau 1/2/3 Darts
const ROUTES = {};
(function build() {
  const fin = {}; FINISH.forEach(d => { fin[d.v] = d; });
  for (let r = 2; r <= 170; r++) {
    const res = {};
    if (fin[r]) res[1] = { darts: [fin[r]], c: finCost(fin[r]) };
    let b2 = null;
    for (const a of DARTS) { const f = fin[r - a.v]; if (f) { const c = setupCost(a) + finCost(f); if (!b2 || c < b2.c) b2 = { darts: [a, f], c }; } }
    if (b2) res[2] = b2;
    let b3 = null;
    for (const a of DARTS) for (const b of DARTS) {
      const f = fin[r - a.v - b.v]; if (f) { const c = 2 * setupCost(a) + setupCost(b) + finCost(f) + (a.v < b.v ? 0.5 : 0); if (!b3 || c < b3.c) b3 = { darts: [a, b, f], c }; }
    }
    if (b3) res[3] = b3;
    ROUTES[r] = res;
  }
})();
// Kürzester Weg mit höchstens k Darts
function route(r, k = 3) {
  const R = ROUTES[r]; if (!R) return null;
  for (let i = 1; i <= k; i++) if (R[i]) return R[i].darts;
  return null;
}
const routeText = ds => ds ? ds.map(d => dlabel(d.n, d.m)).join(' · ') : '';
const minDarts = r => { const R = ROUTES[r]; if (!R) return 99; for (let i = 1; i <= 3; i++) if (R[i]) return i; return 99; };

// Bot: wohin zielen?
function botAim(rem, left, isIn) {
  if (!isIn) return { n: 20, m: 2 };
  if (rem <= 170) {
    const rt = route(rem, left);
    if (rt) return rt[0];
  }
  if (rem > 100) {
    // Nicht auf 1 oder in schlechte Reste stellen
    if (rem - 60 >= 2 || rem > 170) return { n: 20, m: 3 };
  }
  // Stellen: Rest auf einen guten Wert bringen
  let best = null;
  for (const d of DARTS.filter(d => d.m !== 2)) {
    const lo = rem - d.v; if (lo < 2) continue;
    const md = minDarts(lo);
    const c = md * 100 + (ROUTES[lo] && ROUTES[lo][md] ? ROUTES[lo][md].c : 50) - d.v * 0.01 + (d.m === 3 ? 2 : 0);
    if (!best || c < best.c) best = { d, c };
  }
  return best ? best.d : { n: 20, m: 3 };
}
// Ein Bot-Zug: gibt Darts, neuen Rest, in-Status, checked zurück
function botTurn(rem, isIn, sigma, doubleIn) {
  const start = rem, startIn = isIn, darts = [];
  for (let i = 0; i < 3; i++) {
    const aim = botAim(rem, 3 - i, isIn || !doubleIn);
    const h = throwDart(aim.n, aim.m, sigma);
    h.rb = rem; h.att = (isIn || !doubleIn) && !!(ROUTES[rem] && ROUTES[rem][1]);
    darts.push(h);
    if (doubleIn && !isIn) { if (h.m === 2) isIn = true; else continue; }
    isIn = true;
    const nr = rem - h.v;
    if (nr < 0 || nr === 1 || (nr === 0 && h.m !== 2)) return { darts, rem: start, isIn: startIn || (doubleIn ? isIn : true), bust: true, scored: 0 };
    rem = nr;
    if (rem === 0) return { darts, rem: 0, isIn, checked: true, scored: start };
  }
  return { darts, rem, isIn, scored: start - rem };
}

