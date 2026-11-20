// Trainer-Coach: Trainingsvorschlag „Heute empfohlen“, Einstufungstest, Wochenziel und Lernmodus (Lektionen + Tipps)
// Alles wird über EXT eingehängt (after-Hooks, eigene Seite 'learn', eigene Aktionen co*). Zustand in T.coach.
  T.coach = Object.assign({ level: null, learn: null, plan: null, done: [], lessons: {}, tipSeen: null, weekGoal: 3 }, T.coach || {});
  const CO = T.coach;
  const coLearn = () => CO.learn === null ? (CO.level === null || CO.level === 0) : CO.learn;

  // ---------- Bereiche und Zielwerte pro Stufe ----------
  // Jeder Bereich: Wert aus den letzten Ergebnissen (Ø der letzten 5) und Ziel pro Stufe 0..4
  const CO_AREAS = {
    acc: { n: 'Treffsicherheit', u: ' %', goal: [35, 45, 55, 65, 75], modes: ['atc', 'hit', 'single'],
           val: e => e.mode === 'atc' ? e.hitPct : e.mode === 'hit' || e.mode === 'single' ? e.hitPct : null,
           why: v => `Deine Trefferquote auf einzelne Zahlen liegt bei ${f1(v)} %` },
    score: { n: 'Punkte', u: '', goal: [30, 40, 50, 60, 75], modes: ['score', 'sh'],
             val: e => e.mode === 'score' ? e.avg : e.mode === 'game' ? e.avg : null,
             why: v => `Dein Schnitt pro Aufnahme liegt bei ${f1(v)}` },
    dbl: { n: 'Doppel', u: ' %', goal: [10, 15, 22, 28, 35], modes: ['dr', 'bob', 'double'],
           val: e => e.mode === 'dr' || e.mode === 'bob' || e.mode === 'double' ? e.hitPct : null,
           why: v => `Deine Doppelquote liegt bei ${f1(v)} %` },
    co: { n: 'Checkouts', u: ' %', goal: [20, 30, 40, 50, 60], modes: ['lad', 'checkout'],
          val: e => e.mode === 'lad' || e.mode === 'checkout' ? e.rate : e.mode === 'game' && e.P && e.P.coAtt ? e.P.coHits / e.P.coAtt * 100 : null,
          why: v => `Deine Checkout-Quote liegt bei ${f1(v)} %` }
  };
  function coArea(k) {
    const A = CO_AREAS[k], vals = T.hist.map(A.val).filter(v => v !== null && v !== undefined && isFinite(v)).slice(-5);
    const L = CO.level || 0;
    if (!vals.length) return { k, A, v: null, goal: A.goal[L], ratio: -1 };
    const v = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { k, A, v, goal: A.goal[L], ratio: v / A.goal[L] };
  }
  // Stufe, die ein Wert in einem Bereich erreicht
  const coLevelOf = (k, v) => { let l = 0; CO_AREAS[k].goal.forEach((g, i) => { if (v >= g) l = i; }); return l; };

  // ---------- Stufe pro Modus vorschlagen ----------
  // +1 = nächste Stufe, -1 = eine tiefer, 0 = bleiben
  function coTrend(e) {
    if (!e) return 0;
    if (['hit', 'single', 'double', 'triple', 'checkout'].includes(e.mode)) return e.rate >= 70 ? 1 : e.rate < 30 ? -1 : 0;
    if (e.mode === 'score') return e.goalPct >= 70 ? 1 : e.goalPct < 30 ? -1 : 0;
    if (e.mode === 'lad') return e.rate >= 60 ? 1 : e.rate < 25 ? -1 : 0;
    const tip = DR[e.mode] ? DR[e.mode].tip(e) : '';
    return /Stark!/.test(tip) ? 1 : 0;
  }
  function coSuggestLevel(mode) {
    const l = T.hist.filter(e => e.mode === mode), last = l[l.length - 1];
    if (!last) return Math.min(CO.level || 0, 4);
    return Math.max(0, Math.min(4, last.level + coTrend(last)));
  }

  // ---------- Plan bauen ----------
  const CO_FUN = ['sh', 'hi', 'cr', 'atc', 'bob'];
  const coDay = () => new Date().toISOString().slice(0, 10);
  function coPick(list, avoid) { const day = new Date().getDate(); const c = list.filter(m => !avoid.includes(m)); return c[day % c.length] || list[0]; }
  function coBuild() {
    if (CO.level === null) {
      return { day: coDay(), test: true, idx: 0, items: [
        { mode: 'atc', level: 0, why: 'Einstufung: Wie sicher triffst du einzelne Zahlen?' },
        { mode: 'score', level: 0, tasks: 10, why: 'Einstufung: Wie viele Punkte machst du pro Aufnahme?' },
        { mode: 'dr', level: 0, why: 'Einstufung: Wie gut triffst du die Doppel?' }] };
    }
    const areas = Object.keys(CO_AREAS).map(coArea).sort((a, b) => a.ratio - b.ratio);
    const items = [];
    areas.slice(0, 2).forEach(a => {
      const m = coPick(a.A.modes, items.map(i => i.mode));
      items.push({ mode: m, level: coSuggestLevel(m), area: a.k,
                   why: a.v === null ? `${a.A.n}: dazu gibt es noch keine Daten` : `${a.A.why(a.v)}, Ziel auf deiner Stufe: ${a.goal}${a.A.u}` });
    });
    const f = coPick(CO_FUN, items.map(i => i.mode));
    items.push({ mode: f, level: coSuggestLevel(f), why: 'Zur Abwechslung ein Trainingsspiel' });
    return { day: coDay(), idx: 0, items };
  }
  function coPlan() { if (!CO.plan || CO.plan.day !== coDay()) CO.plan = coBuild(); return CO.plan; }

  // Woche (Montag bis Sonntag)
  function coWeekStart() { const d = new Date(); const w = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - w); return d; }
  const coWeekDone = () => CO.done.filter(x => new Date(x) >= coWeekStart()).length;

  // Einstufung auswerten
  function coPlace(dates) {
    const es = T.hist.filter(e => dates.includes(e.date));
    const ls = [];
    const atc = es.find(e => e.mode === 'atc'); if (atc) ls.push(coLevelOf('acc', atc.hitPct));
    const sc = es.find(e => e.mode === 'score'); if (sc) ls.push(coLevelOf('score', sc.avg));
    const dr = es.find(e => e.mode === 'dr'); if (dr) ls.push(coLevelOf('dbl', dr.hitPct));
    return ls.length ? Math.round(ls.reduce((a, b) => a + b, 0) / ls.length) : 0;
  }

  // Einheit starten
  function coStart(i) {
    const P = coPlan(), it = P.items[i]; if (!it) return;
    P.idx = i; T.route = 'train'; T.summary = null;
    Object.assign(T.set, { mode: it.mode, level: it.level, tasks: it.tasks || (it.mode === 'lad' ? 10 : T.set.tasks || 10) });
    start(); P.cur = T.sess ? T.sess.date : null; CO.tipSeen = null;
    window.scrollTo(0, 0);
  }
  // Nach jedem abgeschlossenen Training prüfen, ob es die laufende Plan-Einheit war
  function coCheckDone() {
    const P = CO.plan; if (!P || !P.cur || !T.summary || T.summary.date !== P.cur) return;
    const it = P.items[P.idx]; it.done = true; (P.dates = P.dates || []).push(P.cur); P.cur = null;
    if (P.items.every(x => x.done)) {
      CO.done.push(new Date().toISOString());
      if (P.test) { CO.level = coPlace(P.dates); P.placed = CO.level; }
    }
  }

  EXT.actions.coGo = (v, n) => coStart(n);
  EXT.actions.coNext = () => { const P = coPlan(); const i = P.items.findIndex(x => !x.done); if (i >= 0) coStart(i); };
  EXT.actions.coNew = () => { CO.plan = coBuild(); };
  EXT.actions.coLearn = () => { CO.learn = !coLearn(); };
  EXT.actions.coLevel = (v, n) => { CO.level = n; CO.plan = coBuild(); };
  EXT.actions.coTip = () => { CO.tipSeen = T.sess ? T.sess.date : null; };
  EXT.actions.coLesson = v => { T.lesson = v; T.route = 'learn'; window.scrollTo(0, 0); };
  EXT.actions.coLessonDone = v => { CO.lessons[v] = true; const L = CO_LESSONS.find(x => x.id === v); if (L && L.ex) { Object.assign(T.set, L.ex); T.route = 'train'; T.summary = null; start(); CO.tipSeen = null; } };

  // ---------- Karte „Heute empfohlen“ ----------
  function coCard() {
    const P = coPlan(), wd = coWeekDone(), next = P.items.findIndex(x => !x.done);
    let h = `<div class="card coach"><div class="cohead"><b>${P.test ? 'Einstufung' : 'Heute empfohlen'}</b><span>Woche ${Math.min(wd, CO.weekGoal)}/${CO.weekGoal}</span></div>`;
    if (P.test && !P.placed) h += `<p class="cosub">Drei kurze Einheiten, danach kennt die App deine Stufe und schlägt dir passende Trainings vor.</p>`;
    if (P.placed !== undefined && next < 0) h += `<p class="cosub">Einstufung fertig: Deine Stufe ist <b>${LV[P.placed]}</b>. Ab morgen gibt es hier deinen Trainingsplan.</p>`;
    h += `<div class="coitems">`;
    P.items.forEach((it, i) => {
      h += `<button class="coit${it.done ? ' done' : ''}${i === next ? ' next' : ''}" data-a="coGo" data-v="${i}"><span class="con">${it.done ? '✓' : i + 1}</span><span class="cot"><b>${TM[it.mode]} · ${LV[it.level]}</b><small>${it.why}</small></span></button>`;
    });
    h += `</div>`;
    if (next >= 0) h += btn('coNext', next === 0 ? 'Plan starten' : `Weiter mit Einheit ${next + 1}`, undefined, 'big go');
    else if (!P.test) h += `<p class="cosub">Plan für heute geschafft. ${wd >= CO.weekGoal ? 'Wochenziel erreicht!' : `Noch ${CO.weekGoal - wd} bis zum Wochenziel.`}</p>`;
    h += `<div class="corow">${btn('coLearn', `Lernen: <b>${coLearn() ? 'an' : 'aus'}</b>`, undefined, 'cochip' + (coLearn() ? ' on' : ''))}`;
    h += `${btn('coLesson', `Grundlagen ${Object.keys(CO.lessons).length}/${CO_LESSONS.length}`, 'list', 'cochip')}`;
    if (!P.test) h += btn('coNew', 'Anderer Plan', undefined, 'cochip');
    h += `</div>`;
    if (CO.level !== null) h += `<div class="colv"><span>Deine Stufe</span>${LV.map((l, i) => btn('coLevel', i + 1, i, '', CO.level === i)).join('')}</div>`;
    return h + `</div>`;
  }

  // ---------- Lernmodus: Lektionen ----------
  const CO_LESSONS = [
    { id: 'stand', t: 'Stand', p: [
      'Stell dich seitlich zur Scheibe: Rechtshänder mit dem rechten Fuß vorne an der Abwurflinie, Linkshänder umgekehrt.',
      'Der vordere Fuß zeigt etwa 45 bis 90 Grad zur Scheibe, das Gewicht liegt zu etwa 70 % vorne. Der hintere Fuß hält nur das Gleichgewicht.',
      'Lehn dich leicht nach vorne, aber so, dass du ruhig stehst. Wichtig ist, dass du jedes Mal genau gleich stehst – markier dir den Platz.'],
      ex: { mode: 'single', level: 0, tasks: 10 } },
    { id: 'grip', t: 'Griff', p: [
      'Halt den Dart locker mit drei Fingern: Daumen, Zeige- und Mittelfinger. So fest, dass er nicht wegrutscht, aber ohne Druck.',
      'Die Spitze zeigt beim Ausholen leicht nach oben. Zeigt sie nach unten, fliegt der Dart unruhig.',
      'Probier zwei, drei Griffe aus und bleib dann bei einem. Ein gleichbleibender Griff ist wichtiger als der „perfekte“.'],
      ex: { mode: 'single', level: 0, tasks: 10 } },
    { id: 'align', t: 'Ausrichtung', p: [
      'Auge, Dart und Ziel bilden eine Linie. Die meisten zielen mit dem Auge auf der Wurfseite.',
      'Der Ellbogen zeigt Richtung Ziel und bleibt beim Wurf möglichst an derselben Stelle. Er ist der Drehpunkt.',
      'Wenn deine Darts immer auf einer Seite landen: nicht nachzielen, sondern den Stand ein kleines Stück verschieben.'],
      ex: { mode: 'atc', level: 0 } },
    { id: 'throw', t: 'Wurfbewegung', p: [
      'Der Wurf kommt aus dem Unterarm: Ausholen zum Gesicht, dann gerade nach vorne Richtung Ziel. Oberarm und Schulter bleiben ruhig.',
      'Lass den Arm nach dem Loslassen weiter Richtung Ziel durchschwingen, als würdest du auf das Feld zeigen.',
      'Nicht werfen wie einen Ball: kein Schwung aus der Schulter, kein Ruck aus dem Handgelenk am Ende.'],
      ex: { mode: 'atc', level: 0 } },
    { id: 'aim', t: 'Wohin zielen', p: [
      'Als Anfänger zielst du auf die große Single-20 statt auf T20: Du triffst sie viel öfter, und Fehlwürfe landen trotzdem oft in der 20.',
      'Landen deine Darts oft links von der 20 (in der 5 und 1)? Dann zieh auf die 19: Ihre Nachbarn 7 und 3 sind etwas besser, und viele Spieler streuen dort weniger.',
      'Beim Doppel zielst du auf die Mitte des Doppels, nicht auf die Innenkante. Lieblingsdoppel sind D16 und D20: D16 lässt sich nach einem Fehlwurf gut halbieren (32 → 16 → 8 → 4).',
      'Beim Checkout gilt: Stell dir einen geraden Rest, der mit einem Doppel geht (z. B. 32 oder 40), und meide das Bull, solange es einen anderen Weg gibt.'],
      ex: { mode: 'score', level: 0, tasks: 10 } },
    { id: 'rhythm', t: 'Rhythmus', p: [
      'Wirf alle drei Darts im gleichen Tempo, ohne lange Pausen dazwischen. Zu langes Zielen macht unsicher.',
      'Atme vor der Aufnahme einmal ruhig aus, dann wirf. Nach jedem Dart nicht ärgern, sofort den nächsten vorbereiten.',
      'Übe lieber 15 Minuten täglich als einmal pro Woche zwei Stunden. Kurze, regelmäßige Einheiten bringen am meisten.'],
      ex: { mode: 'dr', level: 0 } }
  ];
  EXT.views.learn = () => {
    const id = T.lesson;
    if (!id || id === 'list') {
      let h = phead('Grundlagen', 'Kurze Lektionen zu Stand, Griff und Wurf') + `<div class="card list">`;
      CO_LESSONS.forEach((L, i) => { h += `<button class="coit${CO.lessons[L.id] ? ' done' : ''}" data-a="coLesson" data-v="${L.id}"><span class="con">${CO.lessons[L.id] ? '✓' : i + 1}</span><span class="cot"><b>${L.t}</b><small>${L.p[0].slice(0, 70)} …</small></span></button>`; });
      return h + `</div>` + btn('nav', '← Zurück zum Training', 'train', 'link');
    }
    const i = CO_LESSONS.findIndex(x => x.id === id), L = CO_LESSONS[i];
    let h = phead(`${i + 1}. ${L.t}`, `Lektion ${i + 1} von ${CO_LESSONS.length}`) + `<div class="card lesson">`;
    L.p.forEach(p => { h += `<p>${p}</p>`; });
    h += btn('coLessonDone', `Verstanden · Übung starten (${TM[L.ex.mode]})`, L.id, 'big go');
    if (CO_LESSONS[i + 1]) h += btn('coLesson', `Nächste Lektion: ${CO_LESSONS[i + 1].t} →`, CO_LESSONS[i + 1].id, 'link');
    return h + `</div>` + btn('coLesson', '← Alle Lektionen', 'list', 'link');
  };

  // ---------- Lernmodus: Tipps vor und während des Trainings ----------
  const CO_INTRO = {
    hit: 'Ein gemischter Plan: erst Zahlen, dann Single, Triple und Doppel. Steh bei jedem Wurf gleich und zieh nicht nach, wenn ein Dart danebengeht.',
    single: 'Ziel auf die Mitte des großen Single-Felds, nicht auf den Rand. Dort ist am meisten Platz.',
    double: 'Ziel auf die Mitte des Doppels. Fällt ein Dart knapp darüber ins Aus, ist das normal – lieber etwas tiefer ansetzen als zu hoch.',
    triple: 'Triple sind schmal. Ziel genau auf die Mitte, und wirf in ruhigem Rhythmus. Ein Single daneben ist kein Fehler, sondern normale Streuung.',
    checkout: 'Lies erst den Weg, dann wirf. Merk dir die Wege für deine Lieblingsdoppel – mit der Zeit brauchst du die Anzeige nicht mehr.',
    score: 'Auf deiner Stufe zielst du auf die große Single-20 (bzw. T20 ab Mittel). Landen viele Darts links in der 5 und 1, probier die 19.',
    atc: 'Ein Feld nach dem anderen. Schau vor jedem Dart kurz auf das neue Ziel und richte Stand und Blick neu aus.',
    bob: 'Jedes Doppel zählt. Ziel auf die Mitte des Doppels. Die erste Runde (D1) ist am schwersten – keine Sorge, wenn sie danebengeht.',
    dr: 'Ziel immer auf die Mitte des Doppels. Merk dir, welche Doppel dir liegen – die werden deine Checkout-Doppel.',
    lad: 'Plane 9 Darts als drei Aufnahmen: erst Punkte, dann einen geraden Rest stellen, zum Schluss das Doppel.',
    sh: 'Pro Runde eine Zahl. Versuch bewusst einmal Triple, dann Doppel – ein Shanghai bringt 100 Bonuspunkte.',
    hi: 'Wichtiger als viele Punkte ist, jede Runde wenigstens einmal zu treffen – sonst wird halbiert. Lieber sicher auf die Single zielen.',
    cr: 'Triple bringen drei Marken auf einmal. Auf den hohen Zahlen (20, 19) lohnt sich der Triple-Versuch am meisten.'
  };
  function coLiveTip(S) {
    const m = S.mode;
    if (['atc', 'sh', 'cr'].includes(m) && S.d && S.d.length >= 6) {
      const last = S.d.slice(-6), miss = last.filter(x => Array.isArray(x) ? !x[0] : !x).length;
      if (miss >= 5) return 'Viele Fehlwürfe hintereinander: kurz durchatmen, Stand prüfen und den Wurf ruhig zu Ende führen. Nicht schneller werfen.';
    }
    if (m === 'double' || m === 'dr' || m === 'bob') return 'Tipp: D16 und D20 sind beliebte Lieblingsdoppel. D16 lässt sich nach einem Fehlwurf gut halbieren: 32 → 16 → 8.';
    if (m === 'checkout' || m === 'lad') return 'Tipp: Stell dir einen geraden Rest, der mit einem Doppel geht (z. B. 32, 40, 36). Meide das Bull, wenn es einen anderen Weg gibt.';
    if (m === 'score') return 'Tipp: Zähl nicht mit, sondern konzentrier dich nur auf den nächsten Dart. Gleicher Stand, gleicher Rhythmus.';
    return '';
  }
  EXT.after.train = box => {
    coCheckDone();
    if (!T.sess && !T.summary) {
      box.insertAdjacentHTML('afterbegin', coCard());
      const ph = box.querySelector('.phead'); const c = box.querySelector('.coach'); if (ph && c) ph.after(c);
    } else if (T.summary && CO.plan && CO.plan.items.some(x => x.done)) {
      const P = CO.plan, next = P.items.findIndex(x => !x.done);
      const html = `<div class="card coach"><div class="cohead"><b>${P.test ? 'Einstufung' : 'Heute empfohlen'}</b><span>${P.items.filter(x => x.done).length}/${P.items.length}</span></div>`
        + (next >= 0 ? btn('coNext', `Weiter mit Einheit ${next + 1}: ${TM[P.items[next].mode]}`, undefined, 'big go')
          : `<p class="cosub">${P.placed !== undefined ? `Einstufung fertig: Deine Stufe ist <b>${LV[P.placed]}</b>.` : 'Plan für heute geschafft!'}</p>`) + `</div>`;
      box.insertAdjacentHTML('beforeend', html);
    } else if (T.sess && coLearn()) {
      const S = T.sess, card = box.querySelector('.card'); if (!card) return;
      if (CO.tipSeen !== S.date && CO_INTRO[S.mode]) {
        card.insertAdjacentHTML('afterbegin', `<div class="cotip intro"><b>So gehst du es an</b><p>${CO_INTRO[S.mode]}</p>${btn('coTip', 'Verstanden', undefined, 'cochip on')}</div>`);
      } else { const t = coLiveTip(S); if (t) { const f = card.querySelector('.foot, .row2.foot'); (f || card).insertAdjacentHTML(f ? 'beforebegin' : 'beforeend', `<div class="cotip">${t}</div>`); } }
    }
  };

  // ---------- Lernmodus: Tipps im Spiel gegen den Bot ----------
  function coGameTip(g) {
    const rem = g.p.rem, V = g.visit ? g.visit.darts : [], left = 3 - V.length;
    if (!g.p.in) return 'Double-In: Ziel auf ein Doppel, das du gut triffst – D20 oder D16. Erst danach zählen die Punkte.';
    if (rem > 170) return (CO.level || 0) < 2 ? 'Ziel auf die große Single-20. Landen deine Darts oft links, nimm die 19.' : 'Ziel auf T20. Wenn die 20 zugestellt ist oder du links streust, wechsel auf T19.';
    const rt = route(rem, left);
    if (rt) return rt.length === 1 ? `Jetzt das Doppel: ${routeText(rt)}. Ziel auf die Mitte des Doppels.` : `Du kannst checken: ${routeText(rt)}. Triffst du den ersten Dart nicht genau, rechne neu.`;
    if (rem % 2 && left === 1) {
      const s = rem - 32 >= 1 && rem - 32 <= 20 ? [rem - 32, 'D16'] : rem - 40 >= 1 && rem - 40 <= 20 ? [rem - 40, 'D20'] : [1, (rem - 1) <= 40 ? 'D' + (rem - 1) / 2 : 'einen geraden Rest'];
      return `Ungerader Rest: Wirf eine S${s[0]}, dann bleibt ${s[1]} für die nächste Aufnahme.`;
    }
    if (rem <= 100) return 'Kein Checkout mehr in dieser Aufnahme: stell dir einen geraden Rest wie 32 oder 40 für die nächste Aufnahme.';
    return 'Punkte machen und einen Rest unter 100 stellen, der mit zwei Darts geht (z. B. 60 oder 80).';
  }
  EXT.after.play = box => {
    if (!coLearn() || !T.game || T.game.phase !== 'play' || T.game.turn !== 'p' || T.game.busy) return;
    const r = box.querySelector('.gright'); if (r) r.insertAdjacentHTML('afterbegin', `<div class="cotip">💡 ${coGameTip(T.game)}</div>`);
  };

  // ---------- Stats: Wochenziel und Bereiche ----------
  EXT.after.stats = box => {
    if ((T.stab || 'over') !== 'over' || CO.level === null) return;
    const wd = coWeekDone();
    let h = `<h2 class="sec">Trainingsziele · Stufe ${LV[CO.level]}</h2><div class="card"><div class="bars">`;
    h += `<div class="br"><span>Woche</span><i><em class="${wd >= CO.weekGoal ? 'g' : 'y'}" style="width:${Math.min(100, wd / CO.weekGoal * 100)}%"></em></i><b>${wd}/${CO.weekGoal}</b><small>Pläne</small></div>`;
    Object.keys(CO_AREAS).forEach(k => {
      const a = coArea(k), r = a.v === null ? 0 : Math.min(100, a.ratio * 100);
      h += `<div class="br"><span>${a.A.n}</span><i><em class="${r >= 100 ? 'g' : r >= 70 ? 'y' : 'r'}" style="width:${r}%"></em></i><b>${a.v === null ? '–' : f1(a.v) + a.A.u}</b><small>Ziel ${a.goal}${a.A.u}</small></div>`;
    });
    box.insertAdjacentHTML('beforeend', h + `</div><div class="boardhint">Ø der letzten 5 Ergebnisse je Bereich. Der schwächste Bereich kommt in deinen Tagesplan.</div></div>`);
  };
