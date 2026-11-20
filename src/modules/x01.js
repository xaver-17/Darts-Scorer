// ===== X01 für mehrere Spieler =====
// Eigenständiges Modul. Braucht aus core.js: route, routeText, dlabel.
// Einhängen: X01.mount(element, { onBack }) und danach X01.render(). Daten in localStorage 'dartsX01'.
(function () {
  const KEY = 'dartsX01';
  const R20 = Array.from({ length: 20 }, (_, i) => i + 1);
  const MAXP = 8, MAXUNDO = 200;

  let X = { set: { start: 501, out: 'double', legs: 1, sets: 1, players: ['Player 1', 'Player 2'] }, game: null, hist: [], mult: 1, confirm: null };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) X = Object.assign(X, s, { confirm: null }); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(X)); } catch (e) {} };

  let el = null, opts = {};
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = x => (isFinite(x) ? x : 0).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const btn = (a, label, v, cls = '', on = false) => `<button class="${cls}${on ? ' active' : ''}" data-a="${a}"${v !== undefined ? ` data-v="${v}"` : ''}>${label}</button>`;

  // ---------- Spiellogik ----------
  function newGame() {
    const s = X.set;
    X.game = {
      start: s.start, out: s.out, legsTo: s.legs, setsTo: s.sets || 1, setNo: 1, legNo: 1, starter: 0, cur: 0, phase: 'play',
      players: s.players.map(n => ({ name: n.trim() || 'Player', rem: s.start, legs: 0, sets: 0, legTot: 0, darts: 0, pts: 0, legDarts: 0, best: 0, s180: 0, hiCO: 0, last: '' })),
      visit: [], undo: [], msg: '', legWinner: null, date: new Date().toISOString(), tl: []
    };
    X.mult = 1; X.confirm = null;
  }
  const G = () => X.game;
  const P = () => G().players[G().cur];
  const visitSum = () => G().visit.reduce((a, d) => a + d.v, 0);
  const remNow = () => P().rem - visitSum();

  function snapshot() {
    // tl (alle Würfe) nicht in jeden Schnappschuss kopieren, nur seine Länge merken
    const g = G(); g.undo.push(JSON.stringify(Object.assign({}, g, { undo: [], tl: undefined, tlLen: (g.tl || []).length })));
    if (g.undo.length > MAXUNDO) g.undo.shift();
  }
  function undo() {
    const g = G(); if (!g || !g.undo.length) return;
    const u = g.undo, prev = JSON.parse(u.pop()); prev.undo = u; prev.tl = (g.tl || []).slice(0, prev.tlLen); delete prev.tlLen; X.game = prev; X.mult = 1;
  }

  function isBust(after, d, out) {
    if (after < 0) return true;
    if (out === 'double') return after === 1 || (after === 0 && d.m !== 2);
    return false;
  }

  function dart(n, m) {
    const g = G(); if (!g || g.phase !== 'play') return;
    snapshot();
    const p = P(), d = { n, m, v: n * m, l: n === 0 ? 'Miss' : dlabel(n, m) };
    const rb = remNow(), after = rb - d.v;
    g.visit.push(d); g.msg = '';
    // Wurf für die Statistik (Felder wie in docs/DATENMODELL.md, leere weggelassen)
    const w = { who: g.cur, leg: g.legNo, visit: (p.vn || 0) + 1, dart: g.visit.length, n, m: n === 0 ? 0 : m, pts: d.v, rem: rb, t: Date.now() };
    if (g.out === 'double') { const rt = route(rb, 4 - g.visit.length); w.aim = rt ? dlabel(rt[0].n, rt[0].m) : 'T20'; }
    if (g.out === 'double' ? !!(ROUTES[rb] && ROUTES[rb][1]) : DARTS.some(x => x.v === rb)) w.dbl = 1;
    (g.tl = g.tl || []).push(w);
    if (isBust(after, d, g.out)) {
      w.flag = 'bust';
      p.darts += g.visit.length; p.legDarts += g.visit.length;
      p.last = 'Bust (' + g.visit.map(x => x.l).join(' ') + ')';
      g.msg = p.name + ': bust, stays on ' + p.rem;
      if (window.dartsCall) window.dartsCall(0, true, false);
      nextPlayer(); return;
    }
    if (after === 0) {
      w.flag = 'out';
      const sc = visitSum();
      p.darts += g.visit.length; p.legDarts += g.visit.length; p.pts += sc; p.rem = 0;
      p.best = Math.max(p.best, sc); p.hiCO = Math.max(p.hiCO, sc); p.last = 'Checkout ' + sc;
      g.visit = []; if (window.dartsCall) window.dartsCall(sc, false, true); legWon(); return;
    }
    if (g.visit.length === 3) closeVisit();
  }
  function closeVisit() {
    const g = G(), p = P(), sc = visitSum();
    p.rem -= sc; p.pts += sc; p.darts += g.visit.length; p.legDarts += g.visit.length;
    p.best = Math.max(p.best, sc); if (sc === 180) p.s180++;
    p.last = sc + ' (' + g.visit.map(x => x.l).join(' ') + ')';
    if (window.dartsCall) window.dartsCall(sc, false, false);
    nextPlayer();
  }
  function nextPlayer() { const g = G(); P().vn = (P().vn || 0) + 1; g.visit = []; g.cur = (g.cur + 1) % g.players.length; X.mult = 1; }

  function legWon() {
    const g = G(), w = P(); w.legs++; w.legTot = (w.legTot || 0) + 1; g.legWinner = g.cur; g.setWon = false;
    if ((g.setsTo || 1) > 1 && w.legs >= g.legsTo) { w.sets = (w.sets || 0) + 1; g.setWon = true; }
    g.phase = ((g.setsTo || 1) > 1 ? w.sets >= g.setsTo : w.legs >= g.legsTo) ? 'over' : 'legover';
    if (g.phase === 'over') recordGame();
  }
  function nextLeg() {
    const g = G(); if (g.phase !== 'legover') return;
    g.legNo++;
    if (g.setWon) { g.players.forEach(p => { p.legs = 0; }); g.setNo = (g.setNo || 1) + 1; g.setWon = false; }
    g.starter = (g.starter + 1) % g.players.length; g.cur = g.starter;
    g.players.forEach(p => { p.rem = g.start; p.legDarts = 0; p.last = ''; p.vn = 0; });
    g.visit = []; g.undo = []; g.msg = ''; g.phase = 'play'; g.legWinner = null;
  }
  function recordGame() {
    const g = G();
    const e = { type: 'x01', sid: 'x_' + g.date, date: g.date, end: new Date().toISOString(), start: g.start, out: g.out, legsTo: g.legsTo, setsTo: g.setsTo || 1,
      winner: g.players[g.legWinner].name,
      players: g.players.map(p => ({ name: p.name, legs: p.legTot || p.legs, sets: p.sets || 0, darts: p.darts, pts: p.pts, avg: p.darts ? p.pts / p.darts * 3 : 0, best: p.best, s180: p.s180, hiCO: p.hiCO })) };
    X.hist.push(e);
    if (window.DartsStats) DartsStats.x01Done(e, g.tl || []);   // Würfe in die Statistik-Datenbank
  }
  // Nach Rückgängig aus "over" das gespeicherte Ergebnis wieder entfernen
  function undoFromOver() {
    if (X.hist.length && X.hist[X.hist.length - 1].date === G().date) { const e = X.hist.pop(); if (window.DartsStats) DartsStats.x01Undo(e); }
    undo();
  }

  // ---------- Aktionen ----------
  function act(a, v) {
    const s = X.set, n = v !== undefined ? +v : NaN;
    switch (a) {
      case 'xStart': s.start = n; break;
      case 'xOut': s.out = v; break;
      case 'xLegs': s.legs = n; s.legsCustom = false; break;
      case 'xLegsCustom': s.legsCustom = true; if (s.legs <= 5 && s.legs !== 4) s.legs = 7; break;
      case 'xSets': s.sets = n; break;
      case 'xAdd': if (s.players.length < MAXP) s.players.push('Player ' + (s.players.length + 1)); break;
      case 'xDel': if (s.players.length > 1) s.players.splice(n, 1); break;
      case 'xUp': if (n > 0) s.players.splice(n - 1, 0, s.players.splice(n, 1)[0]); break;
      case 'xGo': newGame(); break;
      case 'xMult': X.mult = X.mult === n ? 1 : n; break;
      case 'xDart': dart(n, X.mult || 1); X.mult = 1; break;
      case 'x25': dart(25, 1); break;
      case 'xBull': dart(25, 2); break;
      case 'xMiss': dart(0, 1); break;
      case 'xUndo': if (G() && G().phase === 'over') undoFromOver(); else undo(); break;
      case 'xNextLeg': nextLeg(); break;
      case 'xQuit': X.confirm = 'quit'; break;
      case 'xQuitYes': X.confirm = null; X.game = null; break;
      case 'xNo': X.confirm = null; break;
      case 'xAgain': { const g = G(); s.players = g.players.map(p => p.name); s.players.push(s.players.shift()); newGame(); break; }
      case 'xClose': X.game = null; break;
      case 'xBack': if (opts.onBack) opts.onBack(); return;
      default: return;
    }
    render();
  }

  // ---------- Ansichten ----------
  function viewSetup() {
    const s = X.set;
    let h = `<div class="phead"><h1>Play</h1><p>Against the bot or with several players</p></div>` + (opts.onBack ? `<div class="seg oppseg">${btn('xBack', 'vs Bot')}${btn('xNo', 'Multiplayer', undefined, '', true)}</div>` : '') + `<div class="card">`;
    h += `<div class="setlabel">Points</div><div class="seg">${[301, 501, 701].map(v => btn('xStart', v, v, '', s.start === v)).join('')}</div>`;
    h += `<div class="setlabel">Check-out</div><div class="seg">${btn('xOut', 'Double-Out', 'double', '', s.out === 'double')}${btn('xOut', 'Single-Out', 'single', '', s.out === 'single')}</div>`;
    h += window.legsSetsHTML ? window.legsSetsHTML(s, 'xLegs', 'xLegsCustom', 'xSets', 'xlegs') : `<div class="setlabel">First to … Legs</div><div class="seg">${[1, 2, 3, 5].map(v => btn('xLegs', v, v, '', s.legs === v)).join('')}</div>`;
    h += `<div class="setlabel">Players (order = throwing order)</div><div class="xplist">`;
    s.players.forEach((p, i) => {
      h += `<div class="xprow"><span class="xpn">${i + 1}</span><input data-p="${i}" value="${esc(p)}" maxlength="20" aria-label="Name player ${i + 1}">`
        + (i > 0 ? btn('xUp', '↑', i, 'xsm') : '<span class="xsm"></span>')
        + (s.players.length > 1 ? btn('xDel', '✕', i, 'xsm') : '') + `</div>`;
    });
    h += `</div>`;
    if (s.players.length < MAXP) h += btn('xAdd', '+ Add player', undefined, 'link');
    h += `<div class="desc">${s.start} · ${s.out === 'double' ? 'Double-Out' : 'Single-Out'} · ${s.players.length} players · ${window.fmtFormat ? window.fmtFormat(s.sets || 1, s.legs) : 'First to ' + s.legs + ' Legs'}. Darts are entered one by one.</div>`;
    h += `<button class="big go" data-a="xGo">Start game</button>`;
    return h + `</div>`;
  }

  function scoreboard() {
    const g = G();
    return `<div class="xboard${g.players.length > 4 ? ' many' : ''}">${g.players.map((p, i) => {
      const act = i === g.cur && g.phase === 'play';
      const rem = act ? remNow() : p.rem;
      const avg = p.darts ? p.pts / p.darts * 3 : 0;
      return `<div class="xp${act ? ' act' : ''}${g.legWinner === i ? ' win' : ''}">
        <div class="xpname">${esc(p.name)}${(g.setsTo || 1) > 1 ? ` <small>· Sets ${p.sets || 0}</small>` : ''}${g.legsTo > 1 || (g.setsTo || 1) > 1 ? ` <small>· Legs ${p.legs}</small>` : ''}</div>
        <div class="xprem">${rem}</div>
        <div class="xpstat">avg ${f1(avg)} · ${p.legDarts} darts</div>
        <div class="xplast">${esc(p.last) || '&nbsp;'}</div></div>`;
    }).join('')}</div>`;
  }

  function viewGame() {
    const g = G(), p = P();
    let h = `<div class="card x01">`;
    h += `<div class="tophead"><span>${g.start} · ${g.out === 'double' ? 'Double-Out' : 'Single-Out'}</span><span>${(g.setsTo || 1) > 1 ? 'Set ' + (g.setNo || 1) + ' · ' : ''}Leg ${g.legNo}${g.legsTo > 1 || (g.setsTo || 1) > 1 ? ' · ' + (window.fmtFormat ? window.fmtFormat(g.setsTo || 1, g.legsTo) : 'First to ' + g.legsTo) : ''}</span></div>`;
    h += scoreboard();
    if (g.phase === 'play') {
      const V = g.visit, m = X.mult || 1, rem = remNow();
      h += `<div class="xturn"><b>${esc(p.name)}</b> to throw · ${rem} left</div>`;
      h += `<div class="slots">${[0, 1, 2].map(i => `<div class="${V[i] ? 'f' : ''}">${V[i] ? V[i].l : 'Dart ' + (i + 1)}</div>`).join('')}<div class="sum">${visitSum()}</div></div>`;
      if (g.out === 'double') { const rt = route(rem, 3 - V.length); if (rt) h += `<div class="route">Checkout: ${routeText(rt)}</div>`; }
      if (g.msg) h += `<div class="msg">${esc(g.msg)}</div>`;
      h += `<div class="mult">${btn('xMult', 'Double', 2, 'm2', m === 2)}${btn('xMult', 'Treble', 3, 'm3', m === 3)}</div>`;
      h += `<div class="numgrid">${R20.map(n => btn('xDart', (m === 3 ? 'T' : m === 2 ? 'D' : '') + n, n, 'nb m' + m)).join('')}</div>`;
      h += `<div class="numrow">${btn('x25', '25', undefined, 'nb')}${btn('xBull', 'Bull', undefined, 'nb bullb')}${btn('xMiss', 'Miss / 0', undefined, 'nb missb')}</div>`;
    } else {
      const w = g.players[g.legWinner];
      h += `<div class="result win">${esc(w.name)} ${g.phase === 'over' ? 'wins the game! 🏆' : g.setWon ? 'wins the set! 🎯' : 'wins the leg! 🎯'}</div>`;
      if (g.players.length > 1 && (g.setsTo || 1) > 1) h += `<div class="live">Sets: ${g.players.map(x => esc(x.name) + ' ' + (x.sets || 0)).join(' · ')}</div>`;
      if (g.players.length > 1 && g.legsTo > 1) h += `<div class="live">Legs: ${g.players.map(x => esc(x.name) + ' ' + x.legs).join(' · ')}</div>`;
      h += statsTable(g);
      if (g.phase === 'legover') h += `<button class="big go" data-a="xNextLeg">${g.setWon ? 'Next set' : 'Next leg'}</button>`;
      else h += `<div class="row2">${btn('xAgain', 'New game', undefined, 'mid')}${btn('xClose', 'Back to settings', undefined, 'mid')}</div>`;
    }
    if (X.confirm === 'quit') h += `<div class="confirmbox"><p>Quit the game? It will not be saved.</p><div class="row2">${btn('xNo', 'Keep playing', undefined, 'mid')}${btn('xQuitYes', 'Quit', undefined, 'mid redb')}</div></div>`;
    else h += `<div class="row2 foot">${btn('xUndo', '↶ Undo', undefined, 'mid')}${g.phase === 'over' ? '' : btn('xQuit', 'End game', undefined, 'mid')}</div>`;
    return h + `</div>`;
  }

  function statsTable(g) {
    const rows = [['Average', p => f1(p.darts ? p.pts / p.darts * 3 : 0)], ['Darts', p => p.darts], ['Highest visit', p => p.best], ['180s', p => p.s180], ['Highest finish', p => p.hiCO || '–']];
    return `<table class="cmp"><tr><th></th>${g.players.map(p => `<th>${esc(p.name)}</th>`).join('')}</tr>${rows.map(r => `<tr><td>${r[0]}</td>${g.players.map(p => `<td>${r[1](p)}</td>`).join('')}</tr>`).join('')}</table>`;
  }

  function render() {
    if (!el) return;
    el.innerHTML = X.game ? viewGame() : viewSetup();
    save();
  }

  // opts.onBack: optional, zeigt im Setup einen Zurück-Button
  function mount(container, o) {
    el = container; opts = o || {};
    el.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled) act(b.dataset.a, b.dataset.v); });
    el.addEventListener('input', e => { const i = e.target.closest('input[data-p]'); if (i) { X.set.players[+i.dataset.p] = i.value; save(); } });
    el.addEventListener('change', e => { const i = e.target.closest('input[data-set="xlegs"]'); if (i) { X.set.legs = Math.max(1, Math.min(99, Math.round(+i.value) || 1)); render(); } });
  }

  // Zum Testen und für Stats: reine Logik zugänglich machen
  window.X01 = { mount, render, act, state: () => X, history: () => X.hist };
})();
