// Spiel X01 vs. Bot: Ablauf, Bot-Züge, Leg-/Spielende, Spieler-Stats
  // ---------- Spiel ----------
  function newGame() {
    const s = T.set;
    T.zoom = null; T.mult = 1;
    T.game = { start: s.start, din: s.din, bot: s.bot, legsTo: s.legs, legs: { p: 0, b: 0 }, legNo: 1, starter: 'p', turn: 'p',
               p: { rem: s.start, in: !s.din }, b: { rem: s.start, in: !s.din },
               visit: null, vis: { p: [], b: [] }, att: { p: 0, b: 0 }, pdots: [], bLast: [], legWins: [],
               last: { p: '', b: '' }, phase: 'play', undo: [], busy: false, msg: '', date: new Date().toISOString(), tl: [] };
  }
  function snapshot() { const g = T.game; g.undo.push(JSON.stringify(Object.assign({}, g, { undo: [] }))); if (g.undo.length > 15) g.undo.shift(); }
  const visitText = ds => ds.map(d => d.l).join(' · ');

  // Ein Pfeil des Spielers: d = { n, m, v, l, x, y }
  function playerDart(d) {
    const g = T.game; g.msg = '';
    if (!g || g.busy || g.turn !== 'p' || g.phase !== 'play') return;
    snapshot();
    const P = g.p;
    if (!g.visit) g.visit = { start: P.rem, startIn: P.in, darts: [] };
    const V = g.visit;
    d.rb = P.rem; d.att = P.in && !!(ROUTES[P.rem] && ROUTES[P.rem][1]);
    let aim = null;
    if (P.in) { const rt = P.rem <= 170 ? route(P.rem, 3 - V.darts.length) : null; aim = rt ? dlabel(rt[0].n, rt[0].m) : 'T20'; }
    if (d.att) g.att.p++;
    V.darts.push(d);
    // Wurf für die Statistik-Datenbank (tl = throw log, wird mit dem Spiel gespeichert)
    const w = mkThrow({ who: 0, leg: g.legNo, visit: g.vis.p.filter(v => v.leg === g.legNo).length + 1, dart: V.darts.length,
      n: d.n, m: d.m, pts: d.v, x: d.x, y: d.y, aim, rem: P.rem, dbl: d.att ? 1 : null, flag: P.in ? null : d.m === 2 ? 'in' : 'noin' });
    (g.tl = g.tl || []).push(w);
    g.pdots.push({ x: d.x, y: d.y, l: d.l, leg: g.legNo, rb: P.rem, att: d.att, din: !P.in, aim });
    if (!P.in) {
      if (d.m === 2) P.in = true;
      else { if (V.darts.length === 3) closeVisit(false, false); return; }
    }
    const nr = P.rem - d.v;
    if (nr < 0 || nr === 1 || (nr === 0 && d.m !== 2)) { w.flag = 'bust'; P.rem = V.start; closeVisit(true, false); return; }
    P.rem = nr;
    if (nr === 0) { w.flag = 'out'; closeVisit(false, true); legWon('p'); return; }
    if (V.darts.length === 3) closeVisit(false, false);
  }
  function closeVisit(bust, checked) {
    const g = T.game, P = g.p, V = g.visit;
    const score = bust ? 0 : V.start - P.rem;
    g.vis.p.push({ leg: g.legNo, score, n: V.darts.length, bust, co: checked ? V.start : 0 });
    g.last.p = visitText(V.darts) + (bust ? ' → Überworfen' : (g.din && !P.in) ? ' → nicht drin' : ' = ' + score) + (checked ? ' ✓' : '');
    g.lastVisit = V.darts; g.visit = null;
    callVisit('p', score, bust, checked);
    if (!checked) endPlayerTurn();
  }
  function endPlayerTurn() { const g = T.game; T.zoom = null; g.turn = 'b'; g.busy = true; setTimeout(botMove, 900); }
  function botMove() {
    const g = T.game; if (!g || !g.busy) return;
    if (g.botPending) { finishBot(); render(); return; }   // nach Neuladen: direkt abschließen
    const r = botTurn(g.b.rem, g.b.in, BOT[g.bot].s, g.din);
    g.botPending = r; g.bLast = []; g.botPop = null; g.bShowRem = g.b.rem; g.bShowIn = g.b.in || !g.din;
    render(); animateBot(g, r, 0);
  }
  function animateBot(g, r, i) {
    if (i >= r.darts.length) { setTimeout(() => { if (T.game === g && g.botPending === r) { finishBot(); render(); } }, 900); return; }
    setTimeout(() => {
      if (T.game !== g || g.botPending !== r) return;
      const d = r.darts[i];
      g.bLast.push({ x: d.x, y: d.y });
      let txt = d.l === 'Miss' ? 'Daneben (0)' : (d.m === 1 && d.n < 25 ? 'S' + d.n : d.l) + ' = ' + d.v;
      if (!g.bShowIn) { if (d.m === 2) g.bShowIn = true; else txt += ' · nicht drin'; }
      if (g.bShowIn && !(r.bust && i === r.darts.length - 1)) g.bShowRem -= (g.bShowIn ? d.v : 0);
      if (r.bust && i === r.darts.length - 1) txt += ' → Überworfen!';
      if (r.checked && i === r.darts.length - 1) { g.bShowRem = 0; txt += ' → Checkout! ✓'; }
      g.botPop = { i: i + 1, txt };
      render(); animateBot(g, r, i + 1);
    }, i === 0 ? 600 : 1100);
  }
  function finishBot() {
    const g = T.game, r = g.botPending; if (!r) return;
    const scored = r.bust ? 0 : g.b.rem - r.rem;
    g.att.b += r.darts.filter(d => d.att).length;
    let inn = g.b.in || !g.din; const vn = g.vis.b.filter(v => v.leg === g.legNo).length + 1;
    r.darts.forEach((d, i) => {
      let flag = null;
      if (!inn) { if (d.m === 2) { inn = true; flag = 'in'; } else flag = 'noin'; }
      if (i === r.darts.length - 1) { if (r.bust) flag = 'bust'; else if (r.checked) flag = 'out'; }
      (g.tl = g.tl || []).push(mkThrow({ who: 1, leg: g.legNo, visit: vn, dart: i + 1, n: d.n, m: d.m, pts: d.v, x: d.x, y: d.y, rem: d.rb, dbl: d.att ? 1 : null, flag }));
    });
    g.vis.b.push({ leg: g.legNo, score: scored, n: r.darts.length, bust: !!r.bust, co: r.checked ? g.b.rem : 0 });
    g.last.b = visitText(r.darts) + (r.bust ? ' → Überworfen' : (g.din && !r.isIn) ? ' → nicht drin' : ' = ' + scored) + (r.checked ? ' ✓' : '');
    g.bLast = r.darts.map(d => ({ x: d.x, y: d.y }));
    g.b.rem = r.rem; g.b.in = r.isIn; g.busy = false; g.botPending = null; g.botPop = null;
    T.zoom = null;
    callVisit('b', scored, !!r.bust, !!r.checked);
    if (r.checked) legWon('b'); else g.turn = 'p';
  }
  function legWon(w) {
    const g = T.game; g.legs[w]++; g.legWinner = w; g.legWins.push({ leg: g.legNo, w });
    if (g.legs[w] >= g.legsTo) {
      g.phase = 'over';
      const P = pstats(g, 'p'), B = pstats(g, 'b'), sid = 'g_' + g.date, list = g.tl || [];
      TS.put({ id: sid, v: STATS_V, kind: 'game', mode: 'x01bot', level: g.bot,
        players: [{ name: 'Du', me: true }, { name: 'Bot ' + BOT[g.bot].n, bot: g.bot }],
        cfg: { start: g.start, din: g.din, out: 'double', legsTo: g.legsTo }, startedAt: g.date, endedAt: nowIso(),
        result: { winner: w === 'p' ? 0 : 1, legs: [g.legs.p, g.legs.b] }, totals: totalsFrom(list, 2) }, list);
      T.hist.push({ sid, date: g.date, mode: 'game', level: g.bot, won: w === 'p', lp: g.legs.p, lb: g.legs.b, avg: P.avg, botAvg: B.avg,
                    start: g.start, din: g.din, best: P.best, hiCO: P.hiCO, P, B,
                    dots: g.pdots.filter(d => d.x !== null && d.x !== undefined).map(d => [d.x, d.y, d.l, d.rb, d.att ? 1 : 0, d.aim === undefined ? null : d.aim]) });
      T.filter = 'game';
    } else g.phase = 'legover';
  }
  function nextLeg() {
    const g = T.game; g.legNo++; g.starter = g.starter === 'p' ? 'b' : 'p';
    g.p = { rem: g.start, in: !g.din }; g.b = { rem: g.start, in: !g.din };
    g.turn = g.starter; g.phase = 'play'; g.last = { p: '', b: '' }; g.undo = []; g.bLast = []; g.lastVisit = null; g.visit = null;
    if (g.turn === 'b') { g.busy = true; setTimeout(botMove, 900); }
  }
  function gameUndo() {
    const g = T.game; if (!g || g.busy || g.phase === 'over' || !g.undo.length) return;
    const u = g.undo; const prev = JSON.parse(u.pop()); prev.undo = u; T.game = prev; T.zoom = null;
  }
  // Statistik eines Spielers aus den Aufnahmen
  function pstats(g, who) {
    const V = g.vis[who], darts = V.reduce((a, v) => a + v.n, 0), pts = V.reduce((a, v) => a + v.score, 0);
    const legs = [...new Set(V.map(v => v.leg))];
    const firstN = k => { let p = 0, d = 0; legs.forEach(l => V.filter(v => v.leg === l).slice(0, k).forEach(v => { p += v.score; d += v.n; })); return d ? p / d * 3 : 0; };
    const sc = V.map(v => v.score), coHits = V.filter(v => v.co > 0).length;
    const won = g.legWins.filter(x => x.w === who).map(x => x.leg);
    const legDarts = won.map(l => V.filter(v => v.leg === l).reduce((a, v) => a + v.n, 0));
    return {
      avg: darts ? pts / darts * 3 : 0, f9: firstN(3), f6: firstN(2), darts, pts,
      coPct: g.att[who] ? coHits / g.att[who] * 100 : 0, coHits, coAtt: g.att[who],
      hiCO: Math.max(0, ...V.map(v => v.co)), best: Math.max(0, ...sc), bestLeg: legDarts.length ? Math.min(...legDarts) : 0,
      s40: sc.filter(x => x >= 40 && x < 100).length, s100: sc.filter(x => x >= 100 && x < 120).length,
      s120: sc.filter(x => x >= 120 && x < 140).length, s140: sc.filter(x => x >= 140 && x < 180).length, s180: sc.filter(x => x === 180).length
    };
  }

