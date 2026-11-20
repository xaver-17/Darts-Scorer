// Ansichten: laufendes Training, laufendes Spiel, Zusammenfassung
  function viewTask() {
    const S = T.sess, task = S.tasks[S.idx], st = taskStats(S);
    let h = `<div class="card">`;
    h += `<div class="tophead"><span>${TM[S.mode]} · ${LV[S.level]}</span><span>Task ${S.idx + 1} / ${S.tasks.length}</span></div>`;
    h += `<div class="bar"><i style="width:${S.idx / S.tasks.length * 100}%"></i></div>`;
    if (task.block) h += `<div class="block">Block ${task.block.i}/${task.block.of} · ${task.block.name}</div>`;
    h += `<div class="target">${task.big}</div><div class="tcap">${task.cap}</div>`;
    h += `<div class="tdarts">${task.darts} Dart${task.darts > 1 ? 's' : ''}</div>`;
    if (task.type === 'C') {
      const showR = S.level < 3 || T.showRoute;
      h += showR ? `<div class="route">Route: ${task.route}</div>` : `<button class="link" data-a="route">Show route</button>`;
    }
    if (S.perDart && (S.phase === 'task' || S.phase === 'more')) {
      const k = S.cur || 0;
      h += `<div class="setlabel c">Dart ${k + 1}${S.phase === 'task' ? ' of ' + task.darts : ' (extra)'}</div>`;
      h += `<div class="row2 pdrow">${btn('pdHit', '✓ Hit', undefined, 'mid pdhit')}${btn('pdMiss', '✕ Miss', undefined, 'mid pdmiss')}</div>`;
      if (S.phase === 'more') h += `<button class="link" data-a="skip">Give up → next task</button>`;
    } else if (S.phase === 'task') {
      h += `<div class="setlabel c">Done with …</div><div class="okgrid">`;
      for (let i = 1; i <= task.darts; i++) h += btn('ok', `✓ ${i}`, i, 'okb');
      h += `</div><button class="big bad" data-a="fail">✕ Not done in ${task.darts} darts</button>`;
    } else if (S.phase === 'fail') {
      h += `<div class="setlabel c">Not done in ${task.darts} darts – what next?</div>`;
      h += `<div class="row2">${btn('cont', '🎯 Keep throwing', undefined, 'mid')}${btn('skip', 'Next →', undefined, 'mid')}</div>`;
    } else if (S.phase === 'more') {
      h += `<div class="setlabel c">Keep throwing until you hit. How many darts in total?</div>`;
      h += `<div class="stepper">${btn('moreM', '−')}<span>${S.more}</span>${btn('moreP', '+')}</div>`;
      h += `<button class="big go" data-a="moreOk">✓ Done with ${S.more} darts</button>`;
      h += `<button class="link" data-a="skip">Give up after all → next task</button>`;
    }
    h += `<div class="live">Success <b>${st.ok}/${st.n}</b> · Hit rate <b>${f1(st.hitPct)} %</b></div>`;
    h += footer();
    return h + `</div>`;
  }

  function keypad(quick) {
    let h = `<div class="disp">${T.input === '' ? '<span class="ph">Enter score</span>' : T.input}</div>`;
    if (quick) h += `<div class="quick">${quick.map(q => btn('quick', q, q)).join('')}</div>`;
    h += `<div class="pad">`;
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(k => { h += btn('key', k, k); });
    h += btn('back', '⌫') + btn('key', 0, 0) + btn('submit', 'OK', undefined, 'okk') + `</div>`;
    return h;
  }

  function viewScore() {
    const S = T.sess, st = scoreStats(S);
    let h = `<div class="card">`;
    h += `<div class="tophead"><span>Scoring · ${LV[S.level]}</span><span>Visit ${S.visits.length + 1} / ${S.n}</span></div>`;
    h += `<div class="bar"><i style="width:${S.visits.length / S.n * 100}%"></i></div>`;
    h += `<div class="target sm">${S.level < 2 ? '20s' : 'T20'}</div><div class="tcap">3 darts · goal: ${S.goal}+ points</div>`;
    h += `<div class="live">Avg <b>${f1(st.avg)}</b> · goal reached <b>${f1(st.goalPct)} %</b> · Best <b>${st.best}</b></div>`;
    if (S.visits.length) h += `<div class="chips">${S.visits.slice(-12).map(v => `<span class="${v >= S.goal ? 'g' : ''}">${v}</span>`).join('')}</div>`;
    if (S.msg) h += `<div class="msg">${S.msg}</div>`;
    h += keypad([26, 41, 45, 60, 81, 85, 100, 140]);
    h += footer();
    return h + `</div>`;
  }

  function footer() {
    if (T.confirm === 'end') return `<div class="confirmbox"><p>End training?</p><div class="row2">${btn('no', 'Keep training', undefined, 'mid')}${btn('endSave', 'End & save', undefined, 'mid')}</div>${btn('endDrop', 'Discard (do not save)', undefined, 'link red')}</div>`;
    return `<div class="row2 foot">${btn('undoTask', '↶ Undo', undefined, 'mid')}${btn('end', 'End training', undefined, 'mid')}</div>`;
  }

  function cmpTable(P, B) {
    const rows = [
      ['Average', f1(P.avg), f1(B.avg)], ['First 9 avg', f1(P.f9), f1(B.f9)], ['First 6 avg', f1(P.f6), f1(B.f6)],
      ['Checkout %', `${f1(P.coPct)} % <small>(${P.coHits}/${P.coAtt})</small>`, `${f1(B.coPct)} % <small>(${B.coHits}/${B.coAtt})</small>`],
      ['Highest finish', P.hiCO || '–', B.hiCO || '–'], ['Best leg', P.bestLeg ? P.bestLeg + ' darts' : '–', B.bestLeg ? B.bestLeg + ' darts' : '–'],
      ['Highest visit', P.best, B.best], ['40+', P.s40, B.s40], ['100+', P.s100, B.s100], ['120+', P.s120, B.s120],
      ['140+', P.s140, B.s140], ['180', P.s180, B.s180], ['Darts thrown', P.darts, B.darts], ['Total points', P.pts, B.pts]
    ];
    return `<table class="cmp"><tr><th></th><th>You</th><th>Bot</th></tr>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>`;
  }

  function viewGame() {
    const g = T.game, P = pstats(g, 'p'), B = pstats(g, 'b'), inp = T.set.inp === 'keys' ? 'keys' : 'board';
    let h = `<div class="card gamecard inp-${inp}${g.busy ? ' busy' : ''}">`;
    h += `<div class="tophead"><span>${voiceBtn()}${g.start} · ${g.din ? 'Double-In' : 'Single-In'}</span><span>${(g.setsTo || 1) > 1 ? `Set ${g.setNo || 1} · ` : ''}Leg ${g.legNo} · ${fmtFormat(g.setsTo || 1, g.legsTo)}</span></div>`;
    const panel = (who, name, PL, avg, last, legs) => `<div class="gp ${g.turn === who && g.phase === 'play' ? 'act' : ''}">
        <div class="gn">${name}</div><div class="grem">${PL.rem}</div>
        <div class="gs">avg ${f1(avg)} · ${(g.setsTo || 1) > 1 ? `Sets ${g.sets[who]} · ` : ''}Legs ${legs}${!PL.in ? ' · <span class="warn">not in</span>' : ''}</div>
        <div class="glast">${last || '&nbsp;'}</div></div>`;
    h += `<div class="gboard">${panel('p', 'You', g.p, P.avg, g.last.p, g.legs.p)}${panel('b', 'Bot · ' + BOT[g.bot].n, g.botPending ? { rem: g.bShowRem, in: g.bShowIn } : g.b, B.avg, g.botPending ? (g.botPop ? 'Dart ' + g.botPop.i + ': ' + g.botPop.txt : 'throwing …') : g.last.b, g.legs.b)}</div>`;

    if (g.phase === 'play') {
      const V = g.visit ? g.visit.darts : [];
      const myTurn = !g.busy && g.turn === 'p';
      // Scheibe
      const dots = [];
      g.pdots.filter(d => d.leg === g.legNo && d.x !== null && d.x !== undefined).forEach(d => dots.push({ x: d.x, y: d.y, c: '#facc15', o: .35, r: 3.5, s: '#000', sw: .5 }));
      if (g.busy) g.bLast.forEach((d, i) => dots.push({ x: d.x, y: d.y, c: '#3b82f6', r: 8, t: i + 1, s: '#fff', sw: 1.5, tc: '#fff' }));
      else if (!V.length) g.bLast.forEach((d, i) => dots.push({ x: d.x, y: d.y, c: '#3b82f6', o: .5, r: 5, s: '#fff', sw: .8 }));
      V.forEach((d, i) => { if (d.x !== null && d.x !== undefined) dots.push({ x: d.x, y: d.y, c: '#facc15', r: 7, t: i + 1 }); });
      h += `<div class="gsplit"><div class="gleft">`;
      if (g.busy) h += `<div class="botpop ${g.botPop ? 'on' : ''}">${g.botPop ? `<small>Bot · dart ${g.botPop.i}</small>${g.botPop.txt}` : '<small>Bot</small>throwing …'}</div>`;
      h += `<div class="boardwrap">${boardSVG({ click: myTurn, zoom: T.zoom, dots })}</div>`;
      if (T.zoom) h += `<div class="zoombar"><span>Tap exactly where the dart landed · tap outside the grey ring = back</span>${btn('zoomOff', 'Cancel', undefined, 'zb')}</div>`;
      else if (myTurn) h += `<div class="boardhint">Tap the board${T.set.zoom !== false ? ' (zooms in on trebles, doubles and borders)' : ''} or pick the field below · grey ring = miss</div>`;
      h += `</div><div class="gright">`;

      if (g.busy) h += `<div class="wait">You are up next …</div>`;
      else {
        h += `<div class="seg inpseg">${btn('inp', 'Board', 'board', '', inp === 'board')}${btn('inp', 'Keypad', 'keys', '', inp === 'keys')}</div>`;
        h += `<div class="slots">${[0, 1, 2].map(i => `<div class="${V[i] ? 'f' : ''}">${V[i] ? V[i].l : 'Dart ' + (i + 1)}</div>`).join('')}<div class="sum">${V.reduce((a, d) => a + d.v, 0)}</div></div>`;
        if (!g.p.in) h += `<div class="hint">Double-in: only a double gets you in. Darts before that score 0.</div>`;
        else { const rt = route(g.p.rem, 3 - V.length); if (rt) h += `<div class="route">Checkout: ${routeText(rt)}</div>`; }
        if (g.msg) h += `<div class="msg">${g.msg}</div>`;
        const m = T.mult || 1;
        h += `<div class="mult">${btn('mult', 'Single', 1, 'm1', m === 1)}${btn('mult', 'Double', 2, 'm2', m === 2)}${btn('mult', 'Treble', 3, 'm3', m === 3)}</div>`;
        h += `<div class="numgrid">${R20.map(n => btn('dart', (m === 3 ? 'T' : m === 2 ? 'D' : '') + n, n, 'nb m' + m)).join('')}</div>`;
        h += `<div class="numrow">${btn('s25', '25', undefined, 'nb')}${btn('bull', 'Bull', undefined, 'nb bullb')}${btn('miss', 'Miss / 0', undefined, 'nb missb')}</div>`;
        h += `<button class="link zoomlink" data-a="zoomSet" data-v="${T.set.zoom === false ? 1 : 0}">🔍 Zoom when tapping the board: ${T.set.zoom === false ? 'off' : 'on'}</button>`;
      }
      h += `</div></div>`;
    } else if (g.phase === 'legover') {
      h += `<div class="celebrate"><div class="result ${g.legWinner === 'p' ? 'win' : 'lose'}">${g.legWinner === 'p' ? 'Leg won!' : 'Leg to the bot'}</div>`;
      if (g.setWon) h += `<div class="result ${g.legWinner === 'p' ? 'win' : 'lose'}">${g.legWinner === 'p' ? 'Set won!' : 'Set to the bot'}</div>`;
      h += `<div class="live">${(g.setsTo || 1) > 1 ? `Sets ${g.sets.p} : ${g.sets.b} · ` : ''}Legs ${g.legs.p} : ${g.legs.b}</div><button class="big go" data-a="nextLeg">${g.setWon ? 'Next set' : 'Next leg'}</button>`;
      h += `<div class="setlabel">Stats so far</div>${cmpTable(P, B)}</div>`;
    } else if (g.phase === 'over') {
      const won = g.legWinner === 'p';
      h += `<div class="celebrate"><div class="result ${won ? 'win' : 'lose'}">${won ? 'Game won!' : 'Game lost'}</div>`;
      h += `<div class="live">${(g.setsTo || 1) > 1 ? `Sets ${g.sets.p} : ${g.sets.b} · ` : ''}Legs ${(g.legTot || g.legs).p} : ${(g.legTot || g.legs).b}</div>${cmpTable(P, B)}`;
      h += `<div class="row2">${btn('again', 'Rematch', undefined, 'mid')}${btn('close', 'Back to settings', undefined, 'mid')}</div></div>`;
      return h + `</div>`;
    }
    if (T.confirm === 'quit') h += `<div class="confirmbox"><p>Quit the game? It will not be saved.</p><div class="row2">${btn('no', 'Keep playing', undefined, 'mid')}${btn('quitYes', 'Quit', undefined, 'mid redb')}</div></div>`;
    else h += `<div class="row2 foot">${btn('gUndo', '↶ Undo last dart', undefined, 'mid')}${btn('quit', 'End game', undefined, 'mid')}</div>`;
    return h + `</div>`;
  }

  function viewSummary() {
    const e = T.summary;
    let h = `<div class="card"><div class="result win">Training complete ✓</div><div class="tcap">${TM[e.mode]} · ${LV[e.level]}</div>`;
    if (DR[e.mode]) h += DR[e.mode].summary(e, ctx);
    else if (e.mode === 'score') {
      h += `<div class="sumgrid"><div><b>${f1(e.avg)}</b><small>avg per visit</small></div><div><b>${f1(e.goalPct)} %</b><small>goal ${e.goal}+ reached</small></div><div><b>${e.best}</b><small>best visit</small></div><div><b>${e.c100}</b><small>100+</small></div><div><b>${e.c140}</b><small>140+</small></div><div><b>${e.c180}</b><small>180s</small></div></div>`;
    } else {
      h += `<div class="sumgrid"><div><b>${e.ok}/${e.n}</b><small>within target</small></div><div><b>${f1(e.rate)} %</b><small>success rate</small></div><div><b>${f1(e.hitPct)} %</b><small>hit rate</small></div><div><b>${e.hits}</b><small>total hits</small></div><div><b>${e.darts}</b><small>darts thrown</small></div><div><b>${e.hits ? f1(e.darts / e.hits) : '–'}</b><small>darts per hit</small></div></div>`;
    }
    const tip = nextTip(e);
    if (tip) h += `<div class="hint">${tip}</div>`;
    h += `<div class="row2">${btn('again', 'Again', undefined, 'mid')}${btn('close', 'Back to settings', undefined, 'mid')}</div></div>`;
    return h;
  }
  function nextTip(e) {
    if (DR[e.mode]) return DR[e.mode].tip(e);
    const val = e.mode === 'score' ? e.goalPct : e.rate;
    if (val >= 70 && e.level < 4) return `Strong! From 70 % the next level is worth it: <b>${LV[e.level + 1]}</b>.`;
    if (val < 30 && e.level > 0) return `Under 30 % – at level <b>${LV[e.level - 1]}</b> you build confidence faster.`;
    return 'Stay at this level until you regularly get over 70 %.';
  }

