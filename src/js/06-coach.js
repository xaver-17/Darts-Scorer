// Trainer-Coach: Trainingsvorschlag „Heute empfohlen“, Einstufungstest, Wochenziel und Lernmodus (Lektionen + Tipps)
// Alles wird über EXT eingehängt (after-Hooks, eigene Seite 'learn', eigene Aktionen co*). Zustand in T.coach.
  T.coach = Object.assign({ level: null, learn: null, plan: null, done: [], lessons: {}, tipSeen: null, weekGoal: 3 }, T.coach || {});
  const CO = T.coach;
  const coLearn = () => CO.learn === null ? (CO.level === null || CO.level === 0) : CO.learn;

  // ---------- Bereiche und Zielwerte pro Stufe ----------
  // Jeder Bereich: Wert aus den letzten Ergebnissen (Ø der letzten 5) und Ziel pro Stufe 0..4
  const CO_AREAS = {
    acc: { n: 'Accuracy', u: ' %', goal: [35, 45, 55, 65, 75], modes: ['atc', 'hit', 'single'],
           val: e => e.mode === 'atc' ? e.hitPct : e.mode === 'hit' || e.mode === 'single' ? e.hitPct : null,
           why: v => `Your hit rate on single numbers is ${f1(v)} %` },
    score: { n: 'Scoring', u: '', goal: [30, 40, 50, 60, 75], modes: ['score', 'sh'],
             val: e => e.mode === 'score' ? e.avg : e.mode === 'game' ? e.avg : null,
             why: v => `Your average per visit is ${f1(v)}` },
    dbl: { n: 'Doubles', u: ' %', goal: [10, 15, 22, 28, 35], modes: ['dr', 'bob', 'double'],
           val: e => e.mode === 'dr' || e.mode === 'bob' || e.mode === 'double' ? e.hitPct : null,
           why: v => `Your doubles rate is ${f1(v)} %` },
    co: { n: 'Checkouts', u: ' %', goal: [20, 30, 40, 50, 60], modes: ['lad', 'checkout'],
          val: e => e.mode === 'lad' || e.mode === 'checkout' ? e.rate : e.mode === 'game' && e.P && e.P.coAtt ? e.P.coHits / e.P.coAtt * 100 : null,
          why: v => `Your checkout rate is ${f1(v)} %` }
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
    return /Strong!/.test(tip) ? 1 : 0;
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
        { mode: 'atc', level: 0, why: 'Placement: how reliably do you hit single numbers?' },
        { mode: 'score', level: 0, tasks: 10, why: 'Placement: how many points do you score per visit?' },
        { mode: 'dr', level: 0, why: 'Placement: how well do you hit doubles?' }] };
    }
    const areas = Object.keys(CO_AREAS).map(coArea).sort((a, b) => a.ratio - b.ratio);
    const items = [];
    areas.slice(0, 2).forEach(a => {
      const m = coPick(a.A.modes, items.map(i => i.mode));
      items.push({ mode: m, level: coSuggestLevel(m), area: a.k,
                   why: a.v === null ? `${a.A.n}: no data yet` : `${a.A.why(a.v)}, goal at your level: ${a.goal}${a.A.u}` });
    });
    const f = coPick(CO_FUN, items.map(i => i.mode));
    items.push({ mode: f, level: coSuggestLevel(f), why: 'A training game for some variety' });
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
    let h = `<div class="card coach"><div class="cohead"><b>${P.test ? 'Placement' : 'Recommended today'}</b><span>Week ${Math.min(wd, CO.weekGoal)}/${CO.weekGoal}</span></div>`;
    if (P.test && !P.placed) h += `<p class="cosub">Three short sessions, then the app knows your level and suggests matching trainings.</p>`;
    if (P.placed !== undefined && next < 0) h += `<p class="cosub">Placement done: your level is <b>${LV[P.placed]}</b>. From tomorrow your training plan appears here.</p>`;
    h += `<div class="coitems">`;
    P.items.forEach((it, i) => {
      h += `<button class="coit${it.done ? ' done' : ''}${i === next ? ' next' : ''}" data-a="coGo" data-v="${i}"><span class="con">${it.done ? '✓' : i + 1}</span><span class="cot"><b>${TM[it.mode]} · ${LV[it.level]}</b><small>${it.why}</small></span></button>`;
    });
    h += `</div>`;
    if (next >= 0) h += btn('coNext', next === 0 ? 'Start plan' : `Continue with session ${next + 1}`, undefined, 'big go');
    else if (!P.test) h += `<p class="cosub">Today's plan done. ${wd >= CO.weekGoal ? 'Weekly goal reached!' : `${CO.weekGoal - wd} more to your weekly goal.`}</p>`;
    h += `<div class="corow">${btn('coLearn', `Learn mode: <b>${coLearn() ? 'on' : 'off'}</b>`, undefined, 'cochip' + (coLearn() ? ' on' : ''))}`;
    h += `${btn('coLesson', `Basics ${Object.keys(CO.lessons).length}/${CO_LESSONS.length}`, 'list', 'cochip')}`;
    if (!P.test) h += btn('coNew', 'Different plan', undefined, 'cochip');
    h += `</div>`;
    if (CO.level !== null) h += `<div class="colv"><span>Your level</span>${LV.map((l, i) => btn('coLevel', i + 1, i, '', CO.level === i)).join('')}</div>`;
    return h + `</div>`;
  }

  // ---------- Lernmodus: Lektionen ----------
  const CO_LESSONS = [
    { id: 'stand', t: 'Stance', p: [
      'Stand side-on to the board: right-handers with the right foot forward at the oche, left-handers the other way round.',
      'Your front foot points about 45 to 90 degrees to the board, with about 70 % of your weight on it. The back foot just keeps your balance.',
      'Lean slightly forward, but stay steady. What matters is standing exactly the same way every time – mark your spot.'],
      ex: { mode: 'single', level: 0, tasks: 10 } },
    { id: 'grip', t: 'Grip', p: [
      'Hold the dart loosely with three fingers: thumb, index and middle finger. Firm enough that it does not slip, but without pressure.',
      'The tip points slightly upwards as you draw back. If it points down, the dart flies unsteadily.',
      'Try two or three grips, then stick with one. A consistent grip matters more than the "perfect" one.'],
      ex: { mode: 'single', level: 0, tasks: 10 } },
    { id: 'align', t: 'Alignment', p: [
      'Eye, dart and target form one line. Most players aim with the eye on their throwing side.',
      'Your elbow points at the target and stays in the same place during the throw. It is the pivot.',
      'If your darts always land on one side: do not re-aim, move your stance a little instead.'],
      ex: { mode: 'atc', level: 0 } },
    { id: 'throw', t: 'Throwing motion', p: [
      'The throw comes from the forearm: draw back towards your face, then straight forward to the target. Upper arm and shoulder stay still.',
      'After releasing, let your arm follow through towards the target, as if you were pointing at the field.',
      'Do not throw it like a ball: no swing from the shoulder, no flick of the wrist at the end.'],
      ex: { mode: 'atc', level: 0 } },
    { id: 'aim', t: 'Where to aim', p: [
      'As a beginner, aim at the big single 20 instead of T20: you hit it far more often, and misses still often land in the 20.',
      'Do your darts often land left of the 20 (in the 5 and 1)? Then switch to the 19: its neighbours 7 and 3 are a bit better, and many players scatter less there.',
      'On doubles, aim at the middle of the double, not the inner edge. Favourite doubles are D16 and D20: D16 halves nicely after a miss (32 → 16 → 8 → 4).',
      'For checkouts: leave yourself an even number that finishes on a double (e.g. 32 or 40), and avoid the bull as long as there is another way.'],
      ex: { mode: 'score', level: 0, tasks: 10 } },
    { id: 'rhythm', t: 'Rhythm', p: [
      'Throw all three darts at the same pace, without long pauses. Aiming too long makes you unsure.',
      'Breathe out calmly before the visit, then throw. Do not get annoyed after a dart, get ready for the next one right away.',
      'Practise 15 minutes a day rather than two hours once a week. Short, regular sessions help the most.'],
      ex: { mode: 'dr', level: 0 } }
  ];
  EXT.views.learn = () => {
    const id = T.lesson;
    if (!id || id === 'list') {
      let h = phead('Basics', 'Short lessons on stance, grip and throw') + `<div class="card list">`;
      CO_LESSONS.forEach((L, i) => { h += `<button class="coit${CO.lessons[L.id] ? ' done' : ''}" data-a="coLesson" data-v="${L.id}"><span class="con">${CO.lessons[L.id] ? '✓' : i + 1}</span><span class="cot"><b>${L.t}</b><small>${L.p[0].slice(0, 70)} …</small></span></button>`; });
      return h + `</div>` + btn('nav', '← Back to training', 'train', 'link');
    }
    const i = CO_LESSONS.findIndex(x => x.id === id), L = CO_LESSONS[i];
    let h = phead(`${i + 1}. ${L.t}`, `Lesson ${i + 1} of ${CO_LESSONS.length}`) + `<div class="card lesson">`;
    L.p.forEach(p => { h += `<p>${p}</p>`; });
    h += btn('coLessonDone', `Got it · start exercise (${TM[L.ex.mode]})`, L.id, 'big go');
    if (CO_LESSONS[i + 1]) h += btn('coLesson', `Next lesson: ${CO_LESSONS[i + 1].t} →`, CO_LESSONS[i + 1].id, 'link');
    return h + `</div>` + btn('coLesson', '← All lessons', 'list', 'link');
  };

  // ---------- Lernmodus: Tipps vor und während des Trainings ----------
  const CO_INTRO = {
    hit: 'A mixed plan: numbers first, then singles, trebles and doubles. Stand the same way for every throw and do not adjust when a dart misses.',
    single: 'Aim at the middle of the big single field, not the edge. That is where there is most room.',
    double: 'Aim at the middle of the double. A dart just outside is normal – better aim a little low than too high.',
    triple: 'Trebles are narrow. Aim right at the middle and throw in a calm rhythm. A single next to it is not a mistake, just normal spread.',
    checkout: 'Read the route first, then throw. Learn the routes to your favourite doubles – over time you will not need the hint.',
    score: 'At your level you aim at the big single 20 (or T20 from Medium). If many darts land left in the 5 and 1, try the 19.',
    atc: 'One field after another. Before each dart, look at the new target and realign stance and eyes.',
    bob: 'Every double counts. Aim at the middle of the double. The first round (D1) is the hardest – do not worry if it misses.',
    dr: 'Always aim at the middle of the double. Note which doubles suit you – they become your checkout doubles.',
    lad: 'Plan 9 darts as three visits: score first, then leave an even number, finally the double.',
    sh: 'One number per round. Deliberately go for a treble, then a double – a Shanghai gives 100 bonus points.',
    hi: 'Hitting at least once every round matters more than big scores – otherwise you are halved. Better aim safely at the single.',
    cr: 'Trebles give three marks at once. On the high numbers (20, 19) going for the treble pays off most.'
  };
  function coLiveTip(S) {
    const m = S.mode;
    if (['atc', 'sh', 'cr'].includes(m) && S.d && S.d.length >= 6) {
      const last = S.d.slice(-6), miss = last.filter(x => Array.isArray(x) ? !x[0] : !x).length;
      if (miss >= 5) return 'Lots of misses in a row: take a breath, check your stance and follow through calmly. Do not throw faster.';
    }
    if (m === 'double' || m === 'dr' || m === 'bob') return 'Tip: D16 and D20 are popular favourite doubles. D16 halves nicely after a miss: 32 → 16 → 8.';
    if (m === 'checkout' || m === 'lad') return 'Tip: leave an even number that finishes on a double (e.g. 32, 40, 36). Avoid the bull if there is another way.';
    if (m === 'score') return 'Tip: do not count along, just focus on the next dart. Same stance, same rhythm.';
    return '';
  }
  EXT.after.train = box => {
    coCheckDone();
    if (!T.sess && !T.summary) {
      box.insertAdjacentHTML('afterbegin', coCard());
      const ph = box.querySelector('.phead'); const c = box.querySelector('.coach'); if (ph && c) ph.after(c);
    } else if (T.summary && CO.plan && CO.plan.items.some(x => x.done)) {
      const P = CO.plan, next = P.items.findIndex(x => !x.done);
      const html = `<div class="card coach"><div class="cohead"><b>${P.test ? 'Placement' : 'Recommended today'}</b><span>${P.items.filter(x => x.done).length}/${P.items.length}</span></div>`
        + (next >= 0 ? btn('coNext', `Continue with session ${next + 1}: ${TM[P.items[next].mode]}`, undefined, 'big go')
          : `<p class="cosub">${P.placed !== undefined ? `Placement done: your level is <b>${LV[P.placed]}</b>.` : 'Today\'s plan done!'}</p>`) + `</div>`;
      box.insertAdjacentHTML('beforeend', html);
    } else if (T.sess && coLearn()) {
      const S = T.sess, card = box.querySelector('.card'); if (!card) return;
      if (CO.tipSeen !== S.date && CO_INTRO[S.mode]) {
        card.insertAdjacentHTML('afterbegin', `<div class="cotip intro"><b>How to approach it</b><p>${CO_INTRO[S.mode]}</p>${btn('coTip', 'Got it', undefined, 'cochip on')}</div>`);
      } else { const t = coLiveTip(S); if (t) { const f = card.querySelector('.foot, .row2.foot'); (f || card).insertAdjacentHTML(f ? 'beforebegin' : 'beforeend', `<div class="cotip">${t}</div>`); } }
    }
  };

  // ---------- Lernmodus: Tipps im Spiel gegen den Bot ----------
  function coGameTip(g) {
    const rem = g.p.rem, V = g.visit ? g.visit.darts : [], left = 3 - V.length;
    if (!g.p.in) return 'Double-in: aim at a double you hit well – D20 or D16. Only then do points count.';
    if (rem > 170) return (CO.level || 0) < 2 ? 'Aim at the big single 20. If your darts often land left, take the 19.' : 'Aim at T20. If the 20 is blocked or you scatter left, switch to T19.';
    const rt = route(rem, left);
    if (rt) return rt.length === 1 ? `Now the double: ${routeText(rt)}. Aim at the middle of the double.` : `You can check out: ${routeText(rt)}. If the first dart misses, recalculate.`;
    if (rem % 2 && left === 1) {
      const s = rem - 32 >= 1 && rem - 32 <= 20 ? [rem - 32, 'D16'] : rem - 40 >= 1 && rem - 40 <= 20 ? [rem - 40, 'D20'] : [1, (rem - 1) <= 40 ? 'D' + (rem - 1) / 2 : 'an even number'];
      return `Odd number left: throw S${s[0]} to leave ${s[1]} for the next visit.`;
    }
    if (rem <= 100) return 'No checkout this visit: leave an even number like 32 or 40 for the next visit.';
    return 'Score and leave a number under 100 that finishes with two darts (e.g. 60 or 80).';
  }
  EXT.after.play = box => {
    if (!coLearn() || !T.game || T.game.phase !== 'play' || T.game.turn !== 'p' || T.game.busy) return;
    const r = box.querySelector('.gright'); if (r) r.insertAdjacentHTML('afterbegin', `<div class="cotip">💡 ${coGameTip(T.game)}</div>`);
  };

  // ---------- Stats: Wochenziel und Bereiche ----------
  EXT.after.stats = box => {
    if ((T.stab || 'over') !== 'over' || CO.level === null) return;
    const wd = coWeekDone();
    let h = `<h2 class="sec">Training goals · level ${LV[CO.level]}</h2><div class="card"><div class="bars">`;
    h += `<div class="br"><span>Week</span><i><em class="${wd >= CO.weekGoal ? 'g' : 'y'}" style="width:${Math.min(100, wd / CO.weekGoal * 100)}%"></em></i><b>${wd}/${CO.weekGoal}</b><small>plans</small></div>`;
    Object.keys(CO_AREAS).forEach(k => {
      const a = coArea(k), r = a.v === null ? 0 : Math.min(100, a.ratio * 100);
      h += `<div class="br"><span>${a.A.n}</span><i><em class="${r >= 100 ? 'g' : r >= 70 ? 'y' : 'r'}" style="width:${r}%"></em></i><b>${a.v === null ? '–' : f1(a.v) + a.A.u}</b><small>goal ${a.goal}${a.A.u}</small></div>`;
    });
    box.insertAdjacentHTML('beforeend', h + `</div><div class="boardhint">Avg. of the last 5 results per area. Your weakest area goes into your daily plan.</div></div>`);
  };
