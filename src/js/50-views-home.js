// Ansichten: Einstellungen (Spiel/Training) und Startseite
  // ---------- Ansichten ----------
  const btn = (a, label, v, cls = '', on = false) => `<button class="${cls}${on ? ' active' : ''}" data-a="${a}"${v !== undefined ? ` data-v="${v}"` : ''}>${label}</button>`;

  function phead(title, sub) { return `<div class="phead"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>`; }

  // Kacheln für Module, die sich über EXT.playLinks / EXT.trainLinks eintragen
  function extLinks(list, title) {
    if (!list.length) return '';
    return `<h2 class="sec">${title}</h2><div class="quickstart">` + list.map(x => btn('nav', `<b>${x.title}</b><small>${x.sub || ''}</small>`, x.route)).join('') + `</div>`;
  }
  // Legs: 1/2/3/5 oder eigene Zahl; Sets 1–5. Wird auch vom Mehrspieler-Modul genutzt (window.legsSetsHTML)
  function legsSetsHTML(s, aLegs, aCustom, aSets, field) {
    const custom = s.legsCustom || ![1, 2, 3, 5].includes(s.legs);
    let h = `<div class="setlabel">Sets (First to)</div><div class="seg">${[1, 2, 3, 4, 5].map(n => btn(aSets, n, n, '', (s.sets || 1) === n)).join('')}</div>`;
    h += `<div class="setlabel">Legs${(s.sets || 1) > 1 ? ' per set' : ''} (First to)</div><div class="seg">${[1, 2, 3, 5].map(n => btn(aLegs, n, n, '', !custom && s.legs === n)).join('')}${btn(aCustom, 'Custom', undefined, '', custom)}</div>`;
    if (custom) h += `<div class="numin"><input type="number" inputmode="numeric" min="1" max="99" data-set="${field}" value="${s.legs}" aria-label="Legs"><span>legs to win${(s.sets || 1) > 1 ? ' a set' : ''}</span></div>`;
    return h;
  }
  window.legsSetsHTML = legsSetsHTML;
  const fmtFormat = (sets, legs) => sets > 1 ? `First to ${sets} sets · ${legs} leg${legs > 1 ? 's' : ''} per set` : `First to ${legs} leg${legs > 1 ? 's' : ''}`;
  window.fmtFormat = fmtFormat;
  function viewSetup() {
    const s = T.set;
    if (T.route === 'play') {
      s.mode = 'game';
      let h = phead('Play', 'Against the bot or with several players') + `<div class="seg oppseg">${btn('nav', 'vs Bot', 'play', '', true)}${window.X01 ? btn('nav', 'Multiplayer', 'x01') : ''}</div><div class="card">`;
      h += `<div class="setlabel">Points</div><div class="seg">${btn('start', '301', 301, '', s.start === 301)}${btn('start', '501', 501, '', s.start === 501)}</div>`;
      h += `<div class="setlabel">Check-in</div><div class="seg">${btn('din', 'Single-In', 0, '', !s.din)}${btn('din', 'Double-In', 1, '', s.din)}</div>`;
      h += `<div class="setlabel">Bot strength</div><div class="lvl">`;
      BOT.forEach((b, i) => { h += btn('bot', `<b>${i + 1}</b><small>${b.n}</small><small>Ø ~${b.a}</small>`, i, '', s.bot === i); });
      h += `</div>` + legsSetsHTML(s, 'legs', 'legsCustom', 'sets', 'legs');
      h += voiceToggle();
      h += `<div class="desc">${s.start} · ${s.din ? 'Double-In' : 'Single-In'} · Double-Out · vs bot "${BOT[s.bot].n}" (avg ~${BOT[s.bot].a}) · ${fmtFormat(s.sets || 1, s.legs)}. Enter every dart by tapping the board or with Single/Double/Treble + number. After your 3 darts the bot throws.</div>`;
      return h + `<button class="big go" data-a="go">Start game</button></div>` + extLinks(EXT.playLinks, 'More game modes');
    }
    if (s.mode === 'game') s.mode = 'hit';
    let h = phead('Training', 'Choose what you want to practise today') + `<div class="card"><div class="setlabel">What do you want to train?</div><div class="tgrid">`;
    Object.entries(TM).forEach(([k, v]) => { if (k !== 'game' && !DR[k]) h += btn('mode', v, k, '', s.mode === k); });
    h += `</div><div class="setlabel">Training games</div><div class="tgrid dgrid">`;
    Object.keys(DR).forEach(k => { h += btn('mode', DR[k].name, k, '', s.mode === k); });
    h += `</div><div class="setlabel">Difficulty</div><div class="lvl">`;
    LV.forEach((l, i) => { h += btn('level', `<b>${i + 1}</b><small>${l}</small>`, i, '', s.level === i); });
    h += `</div>` + (DR[s.mode] ? DR[s.mode].opts(s, ctx) : `<div class="setlabel">${s.mode === 'score' ? 'Visits' : 'Tasks'}</div><div class="seg">${[10, 20, 30].map(n => btn('tasks', n, n, '', s.tasks === n)).join('')}</div>`);
    if (PERDART_MODES.includes(s.mode)) h += `<div class="setlabel">Input</div><div class="seg">${btn('perDart', 'Quick', 0, '', !s.perDart)}${btn('perDart', 'Every dart', 1, '', !!s.perDart)}</div>`;
    h += `<div class="desc">${describe(s.mode, s.level, s.tasks)}</div>`;
    return h + `<button class="big go" data-a="go">Start training</button></div>` + extLinks(EXT.trainLinks, 'More trainings');
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
    let h = `<div class="topbar"><h1>${LOGO}Darts</h1><div class="tb">${EXT.music ? `<button data-a="nav" data-v="music" aria-label="Music"><svg class="i" viewBox="0 0 24 24">${EXT.music.icon.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></button>` : ''}<button data-a="homeData" aria-label="Settings and data"><svg class="i" viewBox="0 0 24 24">${HICON.data.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></button></div></div>`;
    const cat = (a, v, icon, t) => `<button data-a="${a}" data-v="${v}"><span class="ci"><svg class="i" viewBox="0 0 24 24">${icon.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></span>${t}</button>`;
    h += `<div class="cats">${cat('nav', 'play', HICON.play, 'Play')}${cat('nav', 'train', HICON.train, 'Training')}${window.X01 ? cat('nav', 'x01', HICON.x01, 'Multiplayer') : ''}${cat('nav', 'counter', HICON.counter, 'Counter')}${cat('nav', 'stats', HICON.stats, 'Stats')}${EXT.music ? cat('nav', 'music', EXT.music.icon, 'Music') : ''}${cat('homeData', '', HICON.data, 'Data')}</div>`;
    h += `<div class="statstrip">
      <div><b>${L.n ? f1(L.avg) : '–'}</b><small>Average</small></div>
      <div><b>${L.n}</b><small>Games</small></div>
      <div><b>${L.n ? Math.round(L.wins / L.n * 100) + ' %' : '–'}</b><small>Wins</small></div>
      <div><b>${trains}</b><small>Trainings</small></div></div>`;
    if (T.game && T.game.phase !== 'over') h += `<button class="resume" data-a="nav" data-v="play"><span>Resume current game</span><b>${T.game.p.rem} : ${T.game.b.rem} ›</b></button>`;
    if (T.sess) h += `<button class="resume" data-a="nav" data-v="train"><span>Resume current training</span><b>${TM[T.sess.mode]} ›</b></button>`;
    const QS = [['501', '501 vs Bot', 'Level Medium'], ['301di', '301 Double-In', 'vs Bot'], ['double', 'Doubles', 'Training'], ['checkout', 'Checkouts', 'Training'],
                ['atc', 'Around the Clock', '1 to bull'], ['bob', "Bob's 27", 'Doubles game'], ['lad', 'Checkout Ladder', 'from 41'], ['score', 'Scoring', 'T20 scoring'], ['hit', 'Training plan', 'Hit everything']]
      .filter(q => q[0] === '501' || q[0] === '301di' || TM[q[0]]);
    h += `<h2 class="sec">Quick start</h2><div class="carousel">` + QS.map(([k, t, sub]) => `<button class="ccard" data-a="qs" data-v="${k}"><span class="thumb">${thumb(k)}<b>${t}</b></span><small>${sub}</small></button>`).join('') + `</div>`;
    const last = T.hist.slice(-5).reverse();
    if (last.length) {
      h += `<h2 class="sec">Recent</h2><div class="rows">`;
      last.forEach(e => {
        const m = metric(e), d = new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
        h += `<button class="rowi" data-a="nav" data-v="stats"><span class="th">${thumb(e.mode)}</span><span><b>${TM[e.mode] || e.mode}</b><small>${d} · ${m.det || 'Level ' + (e.level + 1)}</small></span><span class="res ${e.mode === 'game' ? (e.won ? 'gw' : 'gl') : ''}">${m.main}</span></button>`;
      });
      h += `</div>`;
    } else h += `<h2 class="sec">Recent</h2><div class="card empty">Nothing played yet. Start a game or training above.</div>`;
    return h;
  }


