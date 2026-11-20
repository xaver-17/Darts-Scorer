// Training: Aufgaben erzeugen, Sitzung, Auswertung
  // ---------- Aufgaben ----------
  function mk(type, n, darts, block) {
    let big, cap;
    if (type === 'A') { big = String(n); cap = 'Die ' + n + ' treffen – egal welcher Ring'; }
    else if (type === 'B') { big = 'Bull'; cap = 'Bull treffen (25 oder 50)'; }
    else if (n === 25) { big = type === 'D' ? 'Bull' : '25'; cap = type === 'D' ? 'Bullseye (50)' : 'Single Bull (25)'; }
    else { big = (type === 'S' ? '' : type) + n; cap = { S: 'Single', D: 'Doppel', T: 'Triple' }[type] + ' ' + n; }
    return { type, n, darts, big, cap, block };
  }
  function checkoutPool(L) {
    const [lo, hi] = [[2, 40], [2, 60], [41, 100], [61, 130], [100, 170]][L];
    const p = []; for (let r = lo; r <= hi; r++) if (minDarts(r) <= 3 && (L > 0 || r % 2 === 0)) p.push(r);
    return p;
  }
  function genTasks(mode, L, count) {
    const t = [];
    if (mode === 'single') { const d = [4, 3, 2, 2, 1][L]; pickSeq(L >= 3 ? [...R20, 25] : R20, count).forEach(n => t.push(mk('S', n, d))); }
    if (mode === 'double') { const d = [6, 5, 4, 3, 2][L]; pickSeq([FAV_D, TOP_D, R20, [...R20, 25], [...R20, 25]][L], count).forEach(n => t.push(mk('D', n, d))); }
    if (mode === 'triple') { const d = [9, 6, 5, 4, 3][L]; pickSeq([[20, 19], [20, 19, 18, 17], [20, 19, 18, 17, 16, 15], R20, R20][L], count).forEach(n => t.push(mk('T', n, d))); }
    if (mode === 'checkout') {
      const d = [9, 9, 6, 6, 3][L];
      pickSeq(checkoutPool(L), count).forEach(r => t.push({ type: 'C', n: r, darts: d, big: String(r), cap: 'Checkout ' + r + ' (Double-Out)', route: routeText(route(r)) }));
    }
    if (mode === 'hit') {
      const bl = HIT[L], base = Math.floor(count / bl.length), extra = count % bl.length;
      bl.forEach(([type, d], i) => {
        const c = base + (i < extra ? 1 : 0);
        const pool = type === 'B' ? [25] : (type === 'D' && L < 2) ? TOP_D : (type === 'T' && L < 2) ? [20, 19, 18, 17] : R20;
        const seq = type === 'A' && L === 0 ? R20.slice(0, c).concat(pickSeq(R20, Math.max(0, c - 20))) : pickSeq(pool, c);
        seq.forEach(n => t.push(mk(type, n, d, { i: i + 1, of: bl.length, name: BLOCKNAME[type] })));
      });
    }
    return t;
  }
  function describe(mode, L, c) {
    if (DR[mode]) return DR[mode].describe(L, c, T.set);
    if (mode === 'single') return `${c} Aufgaben · Single-Felder ${L >= 3 ? '1–20 + Bull' : '1–20'} · ${[4, 3, 2, 2, 1][L]} Darts pro Feld`;
    if (mode === 'double') return `${c} Aufgaben · ${['D20, D16, D10, D8', 'Top-Doppel (D20, D16, D18, D12, D10, D8, D4)', 'alle Doppel', 'alle Doppel + Bull', 'alle Doppel + Bull'][L]} · ${[6, 5, 4, 3, 2][L]} Darts pro Feld`;
    if (mode === 'triple') return `${c} Aufgaben · ${['T20, T19', 'T20–T17', 'T20–T15', 'alle Triple', 'alle Triple'][L]} · ${[9, 6, 5, 4, 3][L]} Darts pro Feld`;
    if (mode === 'checkout') { const r = [[2, 40], [2, 60], [41, 100], [61, 130], [100, 170]][L]; return `${c} Checkouts von ${r[0]} bis ${r[1]} · ${[9, 9, 6, 6, 3][L]} Darts pro Checkout · Weg wird ${L < 3 ? 'angezeigt' : 'nur auf Wunsch angezeigt'}`; }
    if (mode === 'score') return `${c} Aufnahmen à 3 Darts auf ${L < 2 ? 'das 20er-Segment' : 'die T20'} · Ziel pro Aufnahme: ${SCORE_GOAL[L]} Punkte`;
    if (mode === 'hit') return `Kompletter Trainingsplan, ${c} Aufgaben in Blöcken: ` + HIT[L].map(([t, d]) => `${BLOCKNAME[t]} (${d} Darts)`).join(' → ');
    return '';
  }

  // Modi, in denen jeder Pfeil einzeln als Treffer/Daneben eingetragen werden kann (Einstellung T.set.perDart)
  const PERDART_MODES = ['hit', 'single', 'double', 'triple'];
  // Ziel einer Aufgabe in der Schreibweise der Würfe (T20, D16, 20, Bull; Typ A = Zahl in jedem Ring)
  const taskAim = t => t.type === 'B' ? 'Bull' : t.type === 'A' ? String(t.n) : dlabel(t.n, t.type === 'T' ? 3 : t.type === 'D' ? 2 : 1);
  function taskDart(hit) {
    const S = T.sess, task = S.tasks[S.idx], fixed = task.type === 'S' || task.type === 'D' || task.type === 'T';
    const m = task.type === 'T' ? 3 : task.type === 'D' ? 2 : 1;
    S.tl.push(mkThrow({ task: S.idx, dart: (S.cur || 0) + 1, aim: taskAim(task), hit: hit ? 1 : 0,
      n: hit ? task.n : null, m: hit && fixed ? (task.n === 25 && task.type === 'S' ? 1 : m) : null, pts: hit && fixed ? task.n * m : null }));
    if (hit) { record({ ok: S.phase === 'task', done: true, darts: (S.cur || 0) + 1 }); return; }
    S.cur = (S.cur || 0) + 1;
    if (S.phase === 'task' && S.cur >= task.darts) S.phase = 'fail';
    if (S.cur >= 99) record({ ok: false, done: false, darts: S.cur });
  }
  function taskDartUndo() {
    const S = T.sess, task = S.tasks[S.idx];
    if (S.cur > 0) {
      S.tl.pop(); S.cur--;
      if (S.cur < task.darts) S.phase = 'task'; else if (S.cur === task.darts && S.phase === 'more') S.phase = 'fail';
    } else if (S.log.length) {
      S.log.pop(); S.idx--; S.phase = 'task';
      S.tl = S.tl.filter(w => w.task !== S.idx);
    }
  }

  // ---------- Sitzung ----------
  function start() {
    const s = T.set; T.summary = null; T.input = ''; T.showRoute = false;
    if (s.mode === 'game') { newGame(); return; }
    if (DR[s.mode]) { T.sess = DR[s.mode].start(s); return; }
    if (s.mode === 'score') { T.sess = { mode: 'score', level: s.level, n: s.tasks, goal: SCORE_GOAL[s.level], visits: [], date: new Date().toISOString() }; return; }
    T.sess = { mode: s.mode, level: s.level, tasks: genTasks(s.mode, s.level, s.tasks), idx: 0, log: [], phase: 'task', more: 0, date: new Date().toISOString(),
               perDart: !!s.perDart && PERDART_MODES.includes(s.mode), cur: 0, tl: [] };
  }
  function taskStats(S) {
    const ok = S.log.filter(l => l.ok).length, hits = S.log.filter(l => l.done).length, darts = S.log.reduce((a, l) => a + l.darts, 0);
    return { n: S.log.length, ok, hits, darts, rate: S.log.length ? ok / S.log.length * 100 : 0, hitPct: darts ? hits / darts * 100 : 0 };
  }
  function scoreStats(S) {
    const v = S.visits, n = v.length, sum = v.reduce((a, b) => a + b, 0);
    return { n, avg: n ? sum / n : 0, best: n ? Math.max(...v) : 0, goalPct: n ? v.filter(x => x >= S.goal).length / n * 100 : 0,
             c100: v.filter(x => x >= 100).length, c140: v.filter(x => x >= 140).length, c180: v.filter(x => x === 180).length };
  }
  function finish() {
    const S = T.sess; if (!S) return;
    let entry;
    if (DR[S.mode]) { entry = DR[S.mode].entry(S); if (!entry) { T.sess = null; return; } }
    else if (S.mode === 'score') { if (!S.visits.length) { T.sess = null; return; } entry = Object.assign({ date: S.date, mode: 'score', level: S.level, goal: S.goal }, scoreStats(S)); }
    else { if (!S.log.length) { T.sess = null; return; } entry = Object.assign({ date: S.date, mode: S.mode, level: S.level, planned: S.tasks.length }, taskStats(S)); }
    entry.sid = sidOf(entry);
    const r = Object.assign({}, entry); delete r.date; delete r.mode; delete r.level; delete r.sid;
    TS.put({ id: entry.sid, v: STATS_V, kind: 'training', mode: S.mode, level: S.level, players: [{ name: 'Du', me: true }],
      cfg: { perDart: !!S.perDart }, tasks: S.tasks ? S.tasks.map(t => ({ type: t.type, n: t.n, darts: t.darts })) : undefined,
      log: S.log, visits: S.visits, startedAt: S.date, endedAt: nowIso(), result: r }, S.tl || []);
    T.hist.push(entry); T.summary = entry; T.sess = null; T.filter = entry.mode;
  }
  function record(r) {
    const S = T.sess, task = S.tasks[S.idx];
    S.log.push(Object.assign({ allowed: task.darts }, r));
    S.idx++; S.phase = 'task'; S.cur = 0; T.showRoute = false;
    if (S.idx >= S.tasks.length) finish();
  }

