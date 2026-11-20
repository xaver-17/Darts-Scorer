// Stats aus der Wurf-Datenbank (15-throws.js): X01-Mehrspieler, Doppelquote je Feld (Spiel + Training), Trainingstrend
  const x01Hist = () => (window.X01 && X01.history ? X01.history() : []);
  const escH = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- X01 Mehrspieler ----------
  function viewMulti() {
    const H = x01Hist();
    if (!H.length) return `<div class="card empty">No multiplayer games yet. Start one under Play → Multiplayer – then you will see how everyone throws.</div>`;
    // Pro Spielername zusammenfassen; Checkout-Quote nur aus Spielen mit Einzelwürfen
    const P = {};
    H.forEach(e => {
      const s = TS.session(e.sid || 'x_' + e.date), tot = s && s.totals;
      e.players.forEach((p, i) => {
        const a = P[p.name] = P[p.name] || { name: p.name, games: 0, wins: 0, darts: 0, pts: 0, s180: 0, hiCO: 0, best: 0, coAtt: 0, coHits: 0, legs: 0 };
        a.games++; if (e.winner === p.name) a.wins++;
        a.darts += p.darts; a.pts += p.pts; a.s180 += p.s180 || 0; a.legs += p.legs || 0;
        a.hiCO = Math.max(a.hiCO, p.hiCO || 0); a.best = Math.max(a.best, p.best || 0);
        if (tot && tot[i] && tot[i].coAtt !== undefined) { a.coAtt += tot[i].coAtt; a.coHits += tot[i].coHits; }
      });
    });
    const rows = Object.values(P).sort((a, b) => b.wins - a.wins || b.pts / (b.darts || 1) - a.pts / (a.darts || 1));
    let h = `<div class="card tablecard"><div class="setlabel">Players · ${H.length} game${H.length > 1 ? 's' : ''}</div><table class="multi"><tr><th>Player</th><th>Wins</th><th>Avg</th><th>Checkout</th><th>180s</th><th>Finish</th></tr>`;
    rows.forEach(a => {
      h += `<tr><td><b>${escH(a.name)}</b><br><small>${a.games} game${a.games > 1 ? 's' : ''}</small></td><td>${a.wins}</td><td><b>${f1(a.darts ? a.pts / a.darts * 3 : 0)}</b></td>`
        + `<td>${a.coAtt ? f1(a.coHits / a.coAtt * 100) + ' %<br><small>' + a.coHits + '/' + a.coAtt + '</small>' : '–'}</td><td>${a.s180}</td><td>${a.hiCO || '–'}</td></tr>`;
    });
    h += `</table><div class="boardhint">Checkout rate = checkouts / darts at a checkout. Counted from this version on (older games have no single darts).</div></div>`;
    h += `<h2 class="sec">Games</h2><div class="card tablecard"><table><tr><th>Date</th><th>Game</th><th>Result</th></tr>`;
    H.slice().reverse().forEach(e => {
      const d = new Date(e.date);
      const ds = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) + '<br><small>' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '</small>';
      const ps = e.players.map(p => `${p.name === e.winner ? '<b class="gw">' + escH(p.name) + ' ' + p.legs + '</b>' : escH(p.name) + ' ' + p.legs} <small>avg ${f1(p.avg)}</small>`).join('<br>');
      h += `<tr><td>${ds}</td><td>${e.start}<br><small>${e.out === 'double' ? 'Double-Out' : 'Single-Out'}</small></td><td>${ps}</td></tr>`;
    });
    return h + `</table></div>`;
  }

  // ---------- Doppelquote je Feld: Spiel und Training nebeneinander ----------
  function doubleRates() {
    const F = {};
    const add = (f, src, hit, n = 1) => { const a = F[f] = F[f] || { g: [0, 0], t: [0, 0] }; a[src][0] += hit; a[src][1] += n; };
    TS.sessions().forEach(s => {
      const list = TS.throws(s.id);
      if (s.kind === 'game') {
        const me = (s.players || []).findIndex(p => p.me);
        if (me < 0) return;
        list.forEach(w => { if ((w.who || 0) === me && w.aim && (w.aim[0] === 'D' || w.aim === 'Bull')) add(w.aim, 'g', dlabel(w.n, w.m) === w.aim && w.m === 2 ? 1 : 0); });
      } else if (s.mode === 'double' || s.mode === 'hit') {
        const isD = i => s.tasks && s.tasks[i] && s.tasks[i].type === 'D';
        if (s.cfg && s.cfg.perDart) list.forEach(w => { if (isD(w.task)) add(w.aim, 't', w.hit ? 1 : 0); });
        else if (s.log) s.log.forEach((l, i) => { if (isD(i)) add(dlabel(s.tasks[i].n, 2), 't', l.done ? 1 : 0, l.darts); });
      }
    });
    return F;
  }
  function viewDoubles() {
    const F = doubleRates(), keys = Object.keys(F).sort((a, b) => (F[b].g[1] + F[b].t[1]) - (F[a].g[1] + F[a].t[1])).slice(0, 10);
    if (!keys.length) return '';
    const pc = a => a[1] ? `${f1(a[0] / a[1] * 100)} %<br><small>${a[0]}/${a[1]}</small>` : '–';
    let h = `<h2 class="sec">Doubles: game and training</h2><div class="card tablecard"><table class="multi"><tr><th>Field</th><th>In games</th><th>In training</th></tr>`;
    keys.forEach(k => { h += `<tr><td><b>${k}</b></td><td>${pc(F[k].g)}</td><td>${pc(F[k].t)}</td></tr>`; });
    return h + `</table><div class="boardhint">Hits / darts at this double. In games, darts count whose checkout route went to this double.</div></div>`;
  }

  // ---------- Trainingsfortschritt: Trend und Stufen-Empfehlung ----------
  const LEVEL_UP = 70, LEVEL_DOWN = 30;   // % in 3 Einheiten nacheinander (leicht änderbar)
  function trainTrend(l, val) {
    if (l.length < 6) return '';
    const a = l.slice(-5), b = l.slice(-10, -5), m = x => x.reduce((s, e) => s + val(e), 0) / x.length, d = m(a) - m(b);
    return ` · <span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${f1(Math.abs(d))}</span>`;
  }
  function levelHint(k, l) {
    if (DR[k] || k === 'score' || l.length < 3) return '';
    const last = l.slice(-3), L = last[0].level;
    if (!last.every(e => e.level === L)) return '';
    if (L < 4 && last.every(e => e.rate >= LEVEL_UP)) return `<em class="lvhint">Ready for level ${LV[L + 1]}</em>`;
    if (L > 0 && last.every(e => e.rate <= LEVEL_DOWN)) return `<em class="lvhint">Tip: try level ${LV[L - 1]}</em>`;
    return '';
  }
