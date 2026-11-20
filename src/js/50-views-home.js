// Ansichten: Einstellungen (Spiel/Training) und Startseite
  // ---------- Ansichten ----------
  const btn = (a, label, v, cls = '', on = false) => `<button class="${cls}${on ? ' active' : ''}" data-a="${a}"${v !== undefined ? ` data-v="${v}"` : ''}>${label}</button>`;

  function phead(title, sub) { return `<div class="phead"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>`; }

  // Kacheln für Module, die sich über EXT.playLinks / EXT.trainLinks eintragen
  function extLinks(list, title) {
    if (!list.length) return '';
    return `<h2 class="sec">${title}</h2><div class="quickstart">` + list.map(x => btn('nav', `<b>${x.title}</b><small>${x.sub || ''}</small>`, x.route)).join('') + `</div>`;
  }
  function viewSetup() {
    const s = T.set;
    if (T.route === 'play') {
      s.mode = 'game';
      let h = phead('Spielen', 'Du gegen den Darts-Bot') + `<div class="card">`;
      h += `<div class="setlabel">Punkte</div><div class="seg">${btn('start', '301', 301, '', s.start === 301)}${btn('start', '501', 501, '', s.start === 501)}</div>`;
      h += `<div class="setlabel">Einwurf</div><div class="seg">${btn('din', 'Single-In', 0, '', !s.din)}${btn('din', 'Double-In', 1, '', s.din)}</div>`;
      h += `<div class="setlabel">Bot-Stärke</div><div class="lvl">`;
      BOT.forEach((b, i) => { h += btn('bot', `<b>${i + 1}</b><small>${b.n}</small><small>Ø ~${b.a}</small>`, i, '', s.bot === i); });
      h += `</div><div class="setlabel">Legs (First to)</div><div class="seg">${[1, 2, 3, 5].map(n => btn('legs', n, n, '', s.legs === n)).join('')}</div>`;
      h += `<div class="desc">${s.start} · ${s.din ? 'Double-In' : 'Single-In'} · Double-Out · gegen Bot „${BOT[s.bot].n}“ (Ø ~${BOT[s.bot].a}) · First to ${s.legs} Leg${s.legs > 1 ? 's' : ''}. Du trägst jeden Pfeil einzeln ein – per Tippen auf die Scheibe oder über Single/Double/Triple + Zahl. Nach deinen 3 Pfeilen wirft der Bot.</div>`;
      return h + `<button class="big go" data-a="go">Spiel starten</button></div>` + extLinks(EXT.playLinks, 'Weitere Spielmodi');
    }
    if (s.mode === 'game') s.mode = 'hit';
    let h = phead('Training', 'Wähle, was du heute üben willst') + `<div class="card"><div class="setlabel">Was willst du trainieren?</div><div class="tgrid">`;
    Object.entries(TM).forEach(([k, v]) => { if (k !== 'game' && !DR[k]) h += btn('mode', v, k, '', s.mode === k); });
    h += `</div><div class="setlabel">Trainingsspiele</div><div class="tgrid dgrid">`;
    Object.keys(DR).forEach(k => { h += btn('mode', DR[k].name, k, '', s.mode === k); });
    h += `</div><div class="setlabel">Schwierigkeit</div><div class="lvl">`;
    LV.forEach((l, i) => { h += btn('level', `<b>${i + 1}</b><small>${l}</small>`, i, '', s.level === i); });
    h += `</div>` + (DR[s.mode] ? DR[s.mode].opts(s, ctx) : `<div class="setlabel">${s.mode === 'score' ? 'Aufnahmen' : 'Aufgaben'}</div><div class="seg">${[10, 20, 30].map(n => btn('tasks', n, n, '', s.tasks === n)).join('')}</div>`);
    h += `<div class="desc">${describe(s.mode, s.level, s.tasks)}</div>`;
    return h + `<button class="big go" data-a="go">Training starten</button></div>` + extLinks(EXT.trainLinks, 'Weitere Trainings');
  }

  // ---------- Auswertung über alle Spiele ----------
  const games = () => T.hist.filter(e => e.mode === 'game');
  function lifetime(list) {
    const G = list.filter(e => e.P);
    const sum = k => G.reduce((a, e) => a + (e.P[k] || 0), 0);
    const pts = sum('pts'), darts = sum('darts');
    const avg = darts ? pts / darts * 3 : (list.length ? list.reduce((a, e) => a + e.avg, 0) / list.length : 0);
    const coHits = sum('coHits'), coAtt = sum('coAtt');
    const legs = G.filter(e => e.P.bestLeg).map(e => e.P.bestLeg);
    return {
      n: list.length, wins: list.filter(e => e.won).length, avg, darts, pts,
      f9: G.length ? G.reduce((a, e) => a + e.P.f9, 0) / G.length : 0,
      coPct: coAtt ? coHits / coAtt * 100 : 0, coHits, coAtt,
      hiCO: Math.max(0, ...G.map(e => e.P.hiCO || 0)), best: Math.max(0, ...G.map(e => e.P.best || 0)),
      bestLeg: legs.length ? Math.min(...legs) : 0,
      s100: sum('s100'), s120: sum('s120'), s140: sum('s140'), s180: sum('s180'), s40: sum('s40')
    };
  }

  function viewHome() {
    const L = lifetime(games()), trains = T.hist.filter(e => e.mode !== 'game').length;
    let h = `<div class="hero"><div class="logo">${LOGO}</div><div><h1>Darts-Scorer</h1><p>Was steht heute an?</p></div></div>`;
    h += `<div class="statstrip">
      <div><b>${L.n ? f1(L.avg) : '–'}</b><small>Average</small></div>
      <div><b>${L.n}</b><small>Spiele</small></div>
      <div><b>${L.n ? Math.round(L.wins / L.n * 100) + ' %' : '–'}</b><small>Siege</small></div>
      <div><b>${trains}</b><small>Trainings</small></div></div>`;
    if (T.game && T.game.phase !== 'over') h += `<button class="resume" data-a="nav" data-v="play"><span>🎯 Laufendes Spiel</span><b>${T.game.p.rem} : ${T.game.b.rem} ›</b></button>`;
    if (T.sess) h += `<button class="resume" data-a="nav" data-v="train"><span>💪 Laufendes Training</span><b>${TM[T.sess.mode]} ›</b></button>`;
    const tile = (route, cls, icon, t, sub) => `<button class="tile ${cls}" data-a="nav" data-v="${route}"><span class="ti">${icon}</span><b>${t}</b><small>${sub}</small></button>`;
    h += `<div class="tiles">
      ${tile('play', 't1', ICON.play, 'Spielen', '301 / 501 gegen den Bot')}
      ${tile('train', 't2', ICON.train, 'Trainieren', 'Doppel, Triple, Checkouts …')}
      ${tile('stats', 't3', ICON.stats, 'Meine Stats', 'Average & Trefferquote')}
      ${tile('counter', 't4', ICON.counter, 'Zähler', 'Felder abwerfen')}</div>`;
    h += `<h2 class="sec">Schnellstart</h2><div class="quickstart">
      ${btn('qs', '<b>501</b><small>vs. Bot Mittel</small>', '501')}
      ${btn('qs', '<b>301</b><small>Double-In</small>', '301di')}
      ${btn('qs', '<b>Doppel</b><small>Training</small>', 'double')}
      ${btn('qs', '<b>Checkouts</b><small>Training</small>', 'checkout')}
      ${btn('qs', '<b>Trainingsplan</b><small>Treffen</small>', 'hit')}
      ${btn('qs', '<b>Punkte</b><small>T20 Scoring</small>', 'score')}
      ${btn('qs', '<b>Around the Clock</b><small>1 bis Bull</small>', 'atc')}
      ${btn('qs', "<b>Bob's 27</b><small>Doppel-Spiel</small>", 'bob')}
      ${btn('qs', '<b>Leiter</b><small>Checkout ab 41+</small>', 'lad')}</div>`;
    const last = T.hist.slice(-3).reverse();
    if (last.length) {
      h += `<h2 class="sec">Zuletzt</h2><div class="card list">`;
      last.forEach(e => { const m = metric(e); h += `<div class="li"><span>${TM[e.mode]}<small>${new Date(e.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} · Stufe ${e.level + 1}</small></span><b class="${e.mode === 'game' && !e.won ? 'gl' : 'gw'}">${m.main}</b></div>`; });
      h += `</div>`;
    }
    return h;
  }

