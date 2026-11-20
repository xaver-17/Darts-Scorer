// ===== X01 für mehrere Spieler =====
// Eigenständiges Modul. Braucht aus core.js: route, routeText, dlabel.
// Einhängen: X01.mount(element, { onBack }) und danach X01.render(). Daten in localStorage 'dartsX01'.
(function () {
  const KEY = 'dartsX01';
  const R20 = Array.from({ length: 20 }, (_, i) => i + 1);
  const MAXP = 8, MAXUNDO = 200;

  let X = { set: { start: 501, out: 'double', legs: 1, players: ['Spieler 1', 'Spieler 2'] }, game: null, hist: [], mult: 1, confirm: null };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) X = Object.assign(X, s, { confirm: null }); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(X)); } catch (e) {} };

  let el = null, opts = {};
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = x => (isFinite(x) ? x : 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const btn = (a, label, v, cls = '', on = false) => `<button class="${cls}${on ? ' active' : ''}" data-a="${a}"${v !== undefined ? ` data-v="${v}"` : ''}>${label}</button>`;

  // ---------- Spiellogik ----------
  function newGame() {
    const s = X.set;
    X.game = {
      start: s.start, out: s.out, legsTo: s.legs, legNo: 1, starter: 0, cur: 0, phase: 'play',
      players: s.players.map(n => ({ name: n.trim() || 'Spieler', rem: s.start, legs: 0, darts: 0, pts: 0, legDarts: 0, best: 0, s180: 0, hiCO: 0, last: '' })),
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
      p.last = 'Überworfen (' + g.visit.map(x => x.l).join(' ') + ')';
      g.msg = p.name + ': überworfen, bleibt auf ' + p.rem;
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
    const g = G(), w = P(); w.legs++; g.legWinner = g.cur;
    g.phase = w.legs >= g.legsTo ? 'over' : 'legover';
    if (g.phase === 'over') recordGame();
  }
  function nextLeg() {
    const g = G(); if (g.phase !== 'legover') return;
    g.legNo++; g.starter = (g.starter + 1) % g.players.length; g.cur = g.starter;
    g.players.forEach(p => { p.rem = g.start; p.legDarts = 0; p.last = ''; p.vn = 0; });
    g.visit = []; g.undo = []; g.msg = ''; g.phase = 'play'; g.legWinner = null;
  }
  function recordGame() {
    const g = G();
    const e = { type: 'x01', sid: 'x_' + g.date, date: g.date, end: new Date().toISOString(), start: g.start, out: g.out, legsTo: g.legsTo,
      winner: g.players[g.legWinner].name,
      players: g.players.map(p => ({ name: p.name, legs: p.legs, darts: p.darts, pts: p.pts, avg: p.darts ? p.pts / p.darts * 3 : 0, best: p.best, s180: p.s180, hiCO: p.hiCO })) };
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
      case 'xLegs': s.legs = n; break;
      case 'xAdd': if (s.players.length < MAXP) s.players.push('Spieler ' + (s.players.length + 1)); break;
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
    let h = (opts.onBack ? btn('xBack', '← Zurück', undefined, 'link xback') : '') + `<div class="phead"><h1>X01</h1><p>Mehrere Spieler an einem Gerät</p></div><div class="card">`;
    h += `<div class="setlabel">Punkte</div><div class="seg">${[301, 501, 701].map(v => btn('xStart', v, v, '', s.start === v)).join('')}</div>`;
    h += `<div class="setlabel">Check-out</div><div class="seg">${btn('xOut', 'Double-Out', 'double', '', s.out === 'double')}${btn('xOut', 'Single-Out', 'single', '', s.out === 'single')}</div>`;
    h += `<div class="setlabel">First to … Legs</div><div class="seg">${[1, 2, 3, 5].map(v => btn('xLegs', v, v, '', s.legs === v)).join('')}</div>`;
    h += `<div class="setlabel">Spieler (Reihenfolge = Wurfreihenfolge)</div><div class="xplist">`;
    s.players.forEach((p, i) => {
      h += `<div class="xprow"><span class="xpn">${i + 1}</span><input data-p="${i}" value="${esc(p)}" maxlength="20" aria-label="Name Spieler ${i + 1}">`
        + (i > 0 ? btn('xUp', '↑', i, 'xsm') : '<span class="xsm"></span>')
        + (s.players.length > 1 ? btn('xDel', '✕', i, 'xsm') : '') + `</div>`;
    });
    h += `</div>`;
    if (s.players.length < MAXP) h += btn('xAdd', '+ Spieler hinzufügen', undefined, 'link');
    h += `<div class="desc">${s.start} · ${s.out === 'double' ? 'Double-Out' : 'Single-Out'} · ${s.players.length} Spieler · First to ${s.legs} Leg${s.legs > 1 ? 's' : ''}. Pfeile werden einzeln eingetragen.</div>`;
    h += `<button class="big go" data-a="xGo">Spiel starten</button>`;
    return h + `</div>`;
  }

  function scoreboard() {
    const g = G();
    return `<div class="xboard">${g.players.map((p, i) => {
      const act = i === g.cur && g.phase === 'play';
      const rem = act ? remNow() : p.rem;
      const avg = p.darts ? p.pts / p.darts * 3 : 0;
      return `<div class="xp${act ? ' act' : ''}${g.legWinner === i ? ' win' : ''}">
        <div class="xpname">${esc(p.name)}${g.legsTo > 1 ? ` <small>· Legs ${p.legs}</small>` : ''}</div>
        <div class="xprem">${rem}</div>
        <div class="xpstat">Ø ${f1(avg)} · ${p.legDarts} Darts</div>
        <div class="xplast">${esc(p.last) || '&nbsp;'}</div></div>`;
    }).join('')}</div>`;
  }

  function viewGame() {
    const g = G(), p = P();
    let h = `<div class="card x01">`;
    h += `<div class="tophead"><span>${g.start} · ${g.out === 'double' ? 'Double-Out' : 'Single-Out'}</span><span>Leg ${g.legNo}${g.legsTo > 1 ? ' · First to ' + g.legsTo : ''}</span></div>`;
    h += scoreboard();
    if (g.phase === 'play') {
      const V = g.visit, m = X.mult || 1, rem = remNow();
      h += `<div class="xturn"><b>${esc(p.name)}</b> ist dran · Rest ${rem}</div>`;
      h += `<div class="slots">${[0, 1, 2].map(i => `<div class="${V[i] ? 'f' : ''}">${V[i] ? V[i].l : 'Pfeil ' + (i + 1)}</div>`).join('')}<div class="sum">${visitSum()}</div></div>`;
      if (g.out === 'double') { const rt = route(rem, 3 - V.length); if (rt) h += `<div class="route">Checkout: ${routeText(rt)}</div>`; }
      if (g.msg) h += `<div class="msg">${esc(g.msg)}</div>`;
      h += `<div class="mult">${btn('xMult', 'Double', 2, 'm2', m === 2)}${btn('xMult', 'Triple', 3, 'm3', m === 3)}</div>`;
      h += `<div class="numgrid">${R20.map(n => btn('xDart', (m === 3 ? 'T' : m === 2 ? 'D' : '') + n, n, 'nb m' + m)).join('')}</div>`;
      h += `<div class="numrow">${btn('x25', '25', undefined, 'nb')}${btn('xBull', 'Bull', undefined, 'nb bullb')}${btn('xMiss', 'Miss / 0', undefined, 'nb missb')}</div>`;
    } else {
      const w = g.players[g.legWinner];
      h += `<div class="result win">${esc(w.name)} ${g.phase === 'over' ? 'gewinnt das Spiel! 🏆' : 'gewinnt das Leg! 🎯'}</div>`;
      if (g.players.length > 1 && g.legsTo > 1) h += `<div class="live">Legs: ${g.players.map(x => esc(x.name) + ' ' + x.legs).join(' · ')}</div>`;
      h += statsTable(g);
      if (g.phase === 'legover') h += `<button class="big go" data-a="xNextLeg">Nächstes Leg</button>`;
      else h += `<div class="row2">${btn('xAgain', 'Neues Spiel', undefined, 'mid')}${btn('xClose', 'Zu den Einstellungen', undefined, 'mid')}</div>`;
    }
    if (X.confirm === 'quit') h += `<div class="confirmbox"><p>Spiel abbrechen? Es wird nicht gespeichert.</p><div class="row2">${btn('xNo', 'Weiterspielen', undefined, 'mid')}${btn('xQuitYes', 'Abbrechen', undefined, 'mid redb')}</div></div>`;
    else h += `<div class="row2 foot">${btn('xUndo', '↶ Rückgängig', undefined, 'mid')}${g.phase === 'over' ? '' : btn('xQuit', 'Spiel beenden', undefined, 'mid')}</div>`;
    return h + `</div>`;
  }

  function statsTable(g) {
    const rows = [['Average', p => f1(p.darts ? p.pts / p.darts * 3 : 0)], ['Darts', p => p.darts], ['Höchste Aufnahme', p => p.best], ['180er', p => p.s180], ['Höchstes Finish', p => p.hiCO || '–']];
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
  }

  // Zum Testen und für Stats: reine Logik zugänglich machen
  window.X01 = { mount, render, act, state: () => X, history: () => X.hist };
})();
