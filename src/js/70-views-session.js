// Ansichten: laufendes Training, laufendes Spiel, Zusammenfassung
  function viewTask() {
    const S = T.sess, task = S.tasks[S.idx], st = taskStats(S);
    let h = `<div class="card">`;
    h += `<div class="tophead"><span>${TM[S.mode]} · ${LV[S.level]}</span><span>Aufgabe ${S.idx + 1} / ${S.tasks.length}</span></div>`;
    h += `<div class="bar"><i style="width:${S.idx / S.tasks.length * 100}%"></i></div>`;
    if (task.block) h += `<div class="block">Block ${task.block.i}/${task.block.of} · ${task.block.name}</div>`;
    h += `<div class="target">${task.big}</div><div class="tcap">${task.cap}</div>`;
    h += `<div class="tdarts">${task.darts} Dart${task.darts > 1 ? 's' : ''}</div>`;
    if (task.type === 'C') {
      const showR = S.level < 3 || T.showRoute;
      h += showR ? `<div class="route">Weg: ${task.route}</div>` : `<button class="link" data-a="route">Weg anzeigen</button>`;
    }
    if (S.perDart && (S.phase === 'task' || S.phase === 'more')) {
      const k = S.cur || 0;
      h += `<div class="setlabel c">Pfeil ${k + 1}${S.phase === 'task' ? ' von ' + task.darts : ' (Zusatz)'}</div>`;
      h += `<div class="row2 pdrow">${btn('pdHit', '✓ Treffer', undefined, 'mid pdhit')}${btn('pdMiss', '✕ Daneben', undefined, 'mid pdmiss')}</div>`;
      if (S.phase === 'more') h += `<button class="link" data-a="skip">Aufgeben → nächste Aufgabe</button>`;
    } else if (S.phase === 'task') {
      h += `<div class="setlabel c">Geschafft mit …</div><div class="okgrid">`;
      for (let i = 1; i <= task.darts; i++) h += btn('ok', `✓ ${i}`, i, 'okb');
      h += `</div><button class="big bad" data-a="fail">✕ Nicht in ${task.darts} Darts geschafft</button>`;
    } else if (S.phase === 'fail') {
      h += `<div class="setlabel c">Nicht in ${task.darts} Darts geschafft – wie weiter?</div>`;
      h += `<div class="row2">${btn('cont', '🎯 Weiterwerfen', undefined, 'mid')}${btn('skip', 'Weiter →', undefined, 'mid')}</div>`;
    } else if (S.phase === 'more') {
      h += `<div class="setlabel c">Wirf weiter, bis du triffst. Wie viele Darts insgesamt?</div>`;
      h += `<div class="stepper">${btn('moreM', '−')}<span>${S.more}</span>${btn('moreP', '+')}</div>`;
      h += `<button class="big go" data-a="moreOk">✓ Geschafft mit ${S.more} Darts</button>`;
      h += `<button class="link" data-a="skip">Doch aufgeben → nächste Aufgabe</button>`;
    }
    h += `<div class="live">Erfolg <b>${st.ok}/${st.n}</b> · Trefferquote <b>${f1(st.hitPct)} %</b></div>`;
    h += footer();
    return h + `</div>`;
  }

  function keypad(quick) {
    let h = `<div class="disp">${T.input === '' ? '<span class="ph">Punkte eingeben</span>' : T.input}</div>`;
    if (quick) h += `<div class="quick">${quick.map(q => btn('quick', q, q)).join('')}</div>`;
    h += `<div class="pad">`;
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(k => { h += btn('key', k, k); });
    h += btn('back', '⌫') + btn('key', 0, 0) + btn('submit', 'OK', undefined, 'okk') + `</div>`;
    return h;
  }

  function viewScore() {
    const S = T.sess, st = scoreStats(S);
    let h = `<div class="card">`;
    h += `<div class="tophead"><span>Punkte · ${LV[S.level]}</span><span>Aufnahme ${S.visits.length + 1} / ${S.n}</span></div>`;
    h += `<div class="bar"><i style="width:${S.visits.length / S.n * 100}%"></i></div>`;
    h += `<div class="target sm">${S.level < 2 ? '20er' : 'T20'}</div><div class="tcap">3 Darts · Ziel: ${S.goal}+ Punkte</div>`;
    h += `<div class="live">Ø <b>${f1(st.avg)}</b> · Ziel erreicht <b>${f1(st.goalPct)} %</b> · Best <b>${st.best}</b></div>`;
    if (S.visits.length) h += `<div class="chips">${S.visits.slice(-12).map(v => `<span class="${v >= S.goal ? 'g' : ''}">${v}</span>`).join('')}</div>`;
    if (S.msg) h += `<div class="msg">${S.msg}</div>`;
    h += keypad([26, 41, 45, 60, 81, 85, 100, 140]);
    h += footer();
    return h + `</div>`;
  }

  function footer() {
    if (T.confirm === 'end') return `<div class="confirmbox"><p>Training beenden?</p><div class="row2">${btn('no', 'Weiter trainieren', undefined, 'mid')}${btn('endSave', 'Beenden & speichern', undefined, 'mid')}</div>${btn('endDrop', 'Verwerfen (nicht speichern)', undefined, 'link red')}</div>`;
    return `<div class="row2 foot">${btn('undoTask', '↶ Rückgängig', undefined, 'mid')}${btn('end', 'Training beenden', undefined, 'mid')}</div>`;
  }

  function cmpTable(P, B) {
    const rows = [
      ['Average', f1(P.avg), f1(B.avg)], ['Ø erste 9', f1(P.f9), f1(B.f9)], ['Ø erste 6', f1(P.f6), f1(B.f6)],
      ['Checkout %', `${f1(P.coPct)} % <small>(${P.coHits}/${P.coAtt})</small>`, `${f1(B.coPct)} % <small>(${B.coHits}/${B.coAtt})</small>`],
      ['Höchstes Finish', P.hiCO || '–', B.hiCO || '–'], ['Bestes Leg', P.bestLeg ? P.bestLeg + ' Darts' : '–', B.bestLeg ? B.bestLeg + ' Darts' : '–'],
      ['Höchste Aufnahme', P.best, B.best], ['40+', P.s40, B.s40], ['100+', P.s100, B.s100], ['120+', P.s120, B.s120],
      ['140+', P.s140, B.s140], ['180', P.s180, B.s180], ['Darts geworfen', P.darts, B.darts], ['Punkte gesamt', P.pts, B.pts]
    ];
    return `<table class="cmp"><tr><th></th><th>Du</th><th>Bot</th></tr>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>`;
  }

  function viewGame() {
    const g = T.game, P = pstats(g, 'p'), B = pstats(g, 'b');
    let h = `<div class="card">`;
    h += `<div class="tophead"><span>${g.start} · ${g.din ? 'Double-In' : 'Single-In'} · Double-Out</span><span>Leg ${g.legNo} · First to ${g.legsTo}</span></div>` + voiceBtn();
    const panel = (who, name, PL, avg, last, legs) => `<div class="gp ${g.turn === who && g.phase === 'play' ? 'act' : ''}">
        <div class="gn">${name}</div><div class="grem">${PL.rem}</div>
        <div class="gs">Ø ${f1(avg)} · Legs ${legs}${!PL.in ? ' · <span class="warn">nicht drin</span>' : ''}</div>
        <div class="glast">${last || '&nbsp;'}</div></div>`;
    h += `<div class="gboard">${panel('p', 'Du', g.p, P.avg, g.last.p, g.legs.p)}${panel('b', 'Bot · ' + BOT[g.bot].n, g.botPending ? { rem: g.bShowRem, in: g.bShowIn } : g.b, B.avg, g.botPending ? (g.botPop ? 'Pfeil ' + g.botPop.i + ': ' + g.botPop.txt : 'wirft …') : g.last.b, g.legs.b)}</div>`;

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
      if (g.busy) h += `<div class="botpop ${g.botPop ? 'on' : ''}">${g.botPop ? `<small>Bot · Pfeil ${g.botPop.i}</small>${g.botPop.txt}` : '<small>Bot</small>wirft …'}</div>`;
      h += `<div class="boardwrap">${boardSVG({ click: myTurn, zoom: T.zoom, dots })}</div>`;
      if (T.zoom) h += `<div class="zoombar"><span>Genau tippen, wo der Pfeil steckt · außerhalb des grauen Rings tippen = zurück</span>${btn('zoomOff', 'Abbrechen', undefined, 'zb')}</div>`;
      else if (myTurn) h += `<div class="boardhint">Auf die Scheibe tippen${T.set.zoom !== false ? ' (bei Triple, Doppel und Grenzen wird gezoomt)' : ''} oder unten das Feld wählen · grauer Ring = Daneben</div>`;
      h += `</div><div class="gright">`;

      if (g.busy) h += `<div class="wait">Du bist gleich wieder dran …</div>`;
      else {
        h += `<div class="slots">${[0, 1, 2].map(i => `<div class="${V[i] ? 'f' : ''}">${V[i] ? V[i].l : 'Pfeil ' + (i + 1)}</div>`).join('')}<div class="sum">${V.reduce((a, d) => a + d.v, 0)}</div></div>`;
        if (!g.p.in) h += `<div class="hint">Double-In: Erst ein Doppel bringt dich rein. Pfeile davor zählen 0.</div>`;
        else { const rt = route(g.p.rem, 3 - V.length); if (rt) h += `<div class="route">Checkout: ${routeText(rt)}</div>`; }
        if (g.msg) h += `<div class="msg">${g.msg}</div>`;
        const m = T.mult || 1;
        h += `<div class="mult">${btn('mult', 'Single', 1, 'm1', m === 1)}${btn('mult', 'Double', 2, 'm2', m === 2)}${btn('mult', 'Triple', 3, 'm3', m === 3)}</div>`;
        h += `<div class="numgrid">${R20.map(n => btn('dart', (m === 3 ? 'T' : m === 2 ? 'D' : '') + n, n, 'nb m' + m)).join('')}</div>`;
        h += `<div class="numrow">${btn('s25', '25', undefined, 'nb')}${btn('bull', 'Bull', undefined, 'nb bullb')}${btn('miss', 'Miss / 0', undefined, 'nb missb')}</div>`;
        h += `<button class="link" data-a="zoomSet" data-v="${T.set.zoom === false ? 1 : 0}">🔍 Zoom beim Tippen auf die Scheibe: ${T.set.zoom === false ? 'aus' : 'an'}</button>`;
      }
      h += `</div></div>`;
    } else if (g.phase === 'legover') {
      h += `<div class="celebrate"><div class="result ${g.legWinner === 'p' ? 'win' : 'lose'}">${g.legWinner === 'p' ? 'Leg gewonnen!' : 'Leg an den Bot'}</div>`;
      h += `<div class="live">Stand ${g.legs.p} : ${g.legs.b}</div><button class="big go" data-a="nextLeg">Nächstes Leg</button>`;
      h += `<div class="setlabel">Statistik bisher</div>${cmpTable(P, B)}</div>`;
    } else if (g.phase === 'over') {
      const won = g.legWinner === 'p';
      h += `<div class="celebrate"><div class="result ${won ? 'win' : 'lose'}">${won ? 'Spiel gewonnen!' : 'Spiel verloren'}</div>`;
      h += `<div class="live">Legs ${g.legs.p} : ${g.legs.b}</div>${cmpTable(P, B)}`;
      h += `<div class="row2">${btn('again', 'Revanche', undefined, 'mid')}${btn('close', 'Zu den Einstellungen', undefined, 'mid')}</div></div>`;
      return h + `</div>`;
    }
    if (T.confirm === 'quit') h += `<div class="confirmbox"><p>Spiel abbrechen? Es wird nicht gespeichert.</p><div class="row2">${btn('no', 'Weiterspielen', undefined, 'mid')}${btn('quitYes', 'Abbrechen', undefined, 'mid redb')}</div></div>`;
    else h += `<div class="row2 foot">${btn('gUndo', '↶ Letzten Pfeil zurück', undefined, 'mid')}${btn('quit', 'Spiel beenden', undefined, 'mid')}</div>`;
    return h + `</div>`;
  }

  function viewSummary() {
    const e = T.summary;
    let h = `<div class="card"><div class="result win">Training abgeschlossen ✓</div><div class="tcap">${TM[e.mode]} · ${LV[e.level]}</div>`;
    if (DR[e.mode]) h += DR[e.mode].summary(e, ctx);
    else if (e.mode === 'score') {
      h += `<div class="sumgrid"><div><b>${f1(e.avg)}</b><small>Ø pro Aufnahme</small></div><div><b>${f1(e.goalPct)} %</b><small>Ziel ${e.goal}+ erreicht</small></div><div><b>${e.best}</b><small>Beste Aufnahme</small></div><div><b>${e.c100}</b><small>100+</small></div><div><b>${e.c140}</b><small>140+</small></div><div><b>${e.c180}</b><small>180er</small></div></div>`;
    } else {
      h += `<div class="sumgrid"><div><b>${e.ok}/${e.n}</b><small>in der Vorgabe</small></div><div><b>${f1(e.rate)} %</b><small>Erfolgsquote</small></div><div><b>${f1(e.hitPct)} %</b><small>Trefferquote</small></div><div><b>${e.hits}</b><small>getroffen gesamt</small></div><div><b>${e.darts}</b><small>Darts geworfen</small></div><div><b>${e.hits ? f1(e.darts / e.hits) : '–'}</b><small>Darts pro Treffer</small></div></div>`;
    }
    const tip = nextTip(e);
    if (tip) h += `<div class="hint">${tip}</div>`;
    h += `<div class="row2">${btn('again', 'Nochmal', undefined, 'mid')}${btn('close', 'Zu den Einstellungen', undefined, 'mid')}</div></div>`;
    return h;
  }
  function nextTip(e) {
    if (DR[e.mode]) return DR[e.mode].tip(e);
    const val = e.mode === 'score' ? e.goalPct : e.rate;
    if (val >= 70 && e.level < 4) return `Stark! Ab 70 % lohnt sich die nächste Stufe: <b>${LV[e.level + 1]}</b>.`;
    if (val < 30 && e.level > 0) return `Unter 30 % – auf Stufe <b>${LV[e.level - 1]}</b> baust du die Sicherheit schneller auf.`;
    return 'Bleib auf dieser Stufe, bis du regelmäßig über 70 % kommst.';
  }

