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
      h += voiceToggle();
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

  // Kleine Vorschaubilder: Ausschnitt der Dartscheibe, je Modus ein anderes Ziel
  const THUMB = { '501': [20, 3, 120], '301di': [20, 2, 110], double: [16, 2, 90], checkout: [25, 2, 80], hit: [25, 1, 400], score: [20, 3, 70],
                  atc: [25, 1, 250], bob: [1, 2, 100], lad: [19, 3, 110], game: [20, 3, 120], single: [6, 1, 110], triple: [19, 3, 80], dr: [13, 2, 100], x01: [5, 3, 140] };
  function thumb(k) {
    const [n, m, sz] = THUMB[k] || THUMB.hit, [x, y] = aimPoint(n, m);
    return `<svg viewBox="${(x - sz / 2).toFixed(1)} ${(-y - sz / 2).toFixed(1)} ${sz} ${sz}" preserveAspectRatio="xMidYMid slice">${BOARD_BASE}</svg>`;
  }
  const HICON = {
    play: ICON.play, train: ICON.train, stats: ICON.stats, counter: ICON.counter,
    x01: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14.5 14.6c.8-.4 1.6-.6 2.5-.6 2.8 0 5 2.2 5 5"/></svg>',
    data: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
  };

  function viewHome() {
    const L = lifetime(games()), trains = T.hist.filter(e => e.mode !== 'game').length;
    let h = `<div class="topbar"><h1>${LOGO}Darts</h1><div class="tb">${EXT.music ? `<button data-a="nav" data-v="music" aria-label="Musik"><svg class="i" viewBox="0 0 24 24">${EXT.music.icon.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></button>` : ''}<button data-a="homeData" aria-label="Einstellungen und Daten"><svg class="i" viewBox="0 0 24 24">${HICON.data.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></button></div></div>`;
    const cat = (a, v, icon, t) => `<button data-a="${a}" data-v="${v}"><span class="ci"><svg class="i" viewBox="0 0 24 24">${icon.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></span>${t}</button>`;
    h += `<div class="cats">${cat('nav', 'play', HICON.play, 'Spielen')}${cat('nav', 'train', HICON.train, 'Training')}${window.X01 ? cat('nav', 'x01', HICON.x01, 'Mehrspieler') : ''}${cat('nav', 'stats', HICON.stats, 'Statistik')}${cat('nav', 'counter', HICON.counter, 'Zähler')}${EXT.music ? cat('nav', 'music', EXT.music.icon, 'Musik') : ''}${cat('homeData', '', HICON.data, 'Daten')}</div>`;
    h += `<div class="statstrip">
      <div><b>${L.n ? f1(L.avg) : '–'}</b><small>Average</small></div>
      <div><b>${L.n}</b><small>Spiele</small></div>
      <div><b>${L.n ? Math.round(L.wins / L.n * 100) + ' %' : '–'}</b><small>Siege</small></div>
      <div><b>${trains}</b><small>Trainings</small></div></div>`;
    if (T.game && T.game.phase !== 'over') h += `<button class="resume" data-a="nav" data-v="play"><span>Laufendes Spiel fortsetzen</span><b>${T.game.p.rem} : ${T.game.b.rem} ›</b></button>`;
    if (T.sess) h += `<button class="resume" data-a="nav" data-v="train"><span>Laufendes Training fortsetzen</span><b>${TM[T.sess.mode]} ›</b></button>`;
    const QS = [['501', '501 gegen Bot', 'Stufe Mittel'], ['301di', '301 Double-In', 'gegen Bot'], ['double', 'Doppel', 'Training'], ['checkout', 'Checkouts', 'Training'],
                ['atc', 'Around the Clock', '1 bis Bull'], ['bob', "Bob's 27", 'Doppel-Spiel'], ['lad', 'Checkout-Leiter', 'ab 41'], ['score', 'Punkte', 'T20 Scoring'], ['hit', 'Trainingsplan', 'Alles treffen']]
      .filter(q => q[0] === '501' || q[0] === '301di' || TM[q[0]]);
    h += `<h2 class="sec">Schnellstart</h2><div class="carousel">` + QS.map(([k, t, sub]) => `<button class="ccard" data-a="qs" data-v="${k}"><span class="thumb">${thumb(k)}<b>${t}</b></span><small>${sub}</small></button>`).join('') + `</div>`;
    const last = T.hist.slice(-5).reverse();
    if (last.length) {
      h += `<h2 class="sec">Zuletzt</h2><div class="rows">`;
      last.forEach(e => {
        const m = metric(e), d = new Date(e.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        h += `<button class="rowi" data-a="nav" data-v="stats"><span class="th">${thumb(e.mode)}</span><span><b>${TM[e.mode] || e.mode}</b><small>${d} · ${m.det || 'Stufe ' + (e.level + 1)}</small></span><span class="res ${e.mode === 'game' ? (e.won ? 'gw' : 'gl') : ''}">${m.main}</span></button>`;
      });
      h += `</div>`;
    } else h += `<h2 class="sec">Zuletzt</h2><div class="card empty">Noch nichts gespielt. Starte oben ein Spiel oder Training.</div>`;
    return h;
  }


