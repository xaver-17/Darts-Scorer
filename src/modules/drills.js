// ===== Trainingsspiele: Around the Clock, Bob's 27, Doppel-Runde, Checkout-Leiter, Shanghai, Halve-It, Cricket-Training =====
// Jeder Modus liefert: name, short, describe, opts, start, view, act, entry, metric, series, ov, tip.
// trainer.js ruft diese Funktionen über window.DRILLS auf und übergibt Helfer in ctx
// (btn, f1, LV, footer, showRoute, input).
window.DRILLS = (function () {
  const R20 = Array.from({ length: 20 }, (_, i) => i + 1);
  const TOP_D = [20, 16, 18, 12, 10, 8, 4];
  const COMMON_D = [20, 16, 18, 12, 10, 8, 4, 14, 6, 2];
  const lbl = n => n === 25 ? 'Bull' : String(n);
  const dl = n => n === 25 ? 'Bull' : 'D' + n;
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const now = () => new Date().toISOString();
  const pct = (a, b) => b ? a / b * 100 : 0;
  const bar = (i, n) => `<div class="bar"><i style="width:${i / n * 100}%"></i></div>`;
  const top = (c, mode, L, right) => `<div class="tophead"><span>${mode} · ${c.LV[L]}</span><span>${right}</span></div>`;

  // ---------- Around the Clock ----------
  const ATC_T = [...R20, 25];
  // Was zählt als Treffer: m = 1 Single, 2 Doppel, 3 Triple (Bull: 1 = 25, 2 = 50)
  function atcButtons(L, n) {
    if (n === 25) {
      if (L === 4) return [[2, 'Bull 50']];
      return [[1, '25'], [2, 'Bull 50']];
    }
    if (L <= 1) return [[1, 'Single'], [2, 'Double'], [3, 'Treble']];
    if (L === 3) return [[3, 'T' + n]];
    return [[2, 'D' + n]];
  }
  function atcState(S) {
    let idx = 0, hits = 0; const per = ATC_T.map(() => 0);
    for (const m of S.d) {
      if (idx > 20) break;
      per[idx]++;
      if (m > 0) { hits++; idx = idx === 20 ? 21 : (S.level === 1 ? Math.min(20, idx + m) : idx + 1); }
    }
    return { idx, hits, per, darts: S.d.length, done: idx > 20 };
  }
  const ATC = {
    name: 'Around the Clock', short: 'ATC',
    describe: L => ['1 to 20, then bull · every ring counts',
      '1 to 20, then bull · every ring counts · jump: double = 2 fields ahead, treble = 3',
      '1 to 20, then bull · only doubles count · bull: 25 or 50',
      '1 to 20, then bull · only trebles count · bull: 25 or 50',
      '1 to 20, then bull · only doubles count · bull only as bullseye (50)'][L] + ' · goal: as few darts as possible',
    opts: () => '',
    start: s => ({ mode: 'atc', level: s.level, d: [], date: now() }),
    view(S, c) {
      const st = atcState(S), n = ATC_T[st.idx];
      let h = `<div class="card">` + top(c, 'Around the Clock', S.level, `Field ${st.idx + 1} / 21`) + bar(st.idx, 21);
      const sub = n === 25 ? (S.level === 4 ? 'Hit the bullseye (50)' : 'Hit the bull (25 or 50)')
        : S.level <= 1 ? `Die ${n} treffen – egal welcher Ring` : S.level === 3 ? `Triple ${n} treffen` : `Doppel ${n} treffen`;
      h += `<div class="target">${n === 25 ? 'Bull' : (S.level === 3 ? 'T' : S.level >= 2 ? 'D' : '') + n}</div><div class="tcap">${sub}</div>`;
      h += `<div class="tdarts">Dart ${st.darts + 1} · ${st.per[st.idx]} on this field</div>`;
      h += `<div class="setlabel c">What did you hit?</div><div class="okgrid">`;
      atcButtons(S.level, n).forEach(([m, l]) => { h += c.btn('drHit', l, m, 'okb'); });
      h += `</div><button class="big bad" data-a="drHit" data-v="0">✕ Miss</button>`;
      h += `<div class="live">Darts <b>${st.darts}</b> · hit rate <b>${c.f1(pct(st.hits, st.darts))} %</b></div>`;
      return h + c.footer() + `</div>`;
    },
    act(a, v, S) {
      if (a === 'drHit') { S.d.push(+v); return atcState(S).done ? 'finish' : ''; }
      if (a === 'undoTask') S.d.pop();
      return '';
    },
    entry(S) {
      if (!S.d.length) return null;
      const st = atcState(S);
      const worst = st.per.map((d, i) => [ATC_T[i], d]).filter((x, i) => i < st.idx).sort((a, b) => b[1] - a[1]).slice(0, 3);
      return { date: S.date, mode: 'atc', level: S.level, done: st.done, reached: Math.min(st.idx, 21), darts: st.darts, hits: st.hits,
               hitPct: pct(st.hits, st.darts), worst };
    },
    metric: (e, c) => ({ main: e.done ? e.darts + ' darts' : 'to ' + (e.reached ? lbl(ATC_T[e.reached - 1]) : '–'),
                         det: `${c.f1(e.hitPct)} % hits${e.done ? '' : ' · aborted'}${e.worst && e.worst.length ? ' · tough: ' + e.worst.map(w => lbl(w[0])).join(', ') : ''}` }),
    summary: (e, c) => `<div class="sumgrid"><div><b>${e.done ? e.darts : '–'}</b><small>darts to bull</small></div><div><b>${c.f1(e.hitPct)} %</b><small>hit rate</small></div><div><b>${e.reached}/21</b><small>fields done</small></div></div>`
      + (e.worst.length ? `<div class="hint">Cost the most darts: ${e.worst.map(w => `<b>${lbl(w[0])}</b> (${w[1]})`).join(', ')}</div>` : ''),
    series: [{ n: 'Darts to bull', c: '#ec4899', k: 'darts' }, { n: 'Hit rate %', c: '#a1a1aa', k: 'hitPct' }],
    list: h => h.filter(e => e.done),
    ov: { val: e => e.darts, unit: ' Darts', low: true, only: e => e.done, bar: v => Math.max(0, 100 - (v - 21) / 1.2) },
    tip(e) {
      if (!e.done) return 'Did not reach the bull – finish next time, then the dart count counts.';
      const goal = [60, 50, 70, 80, 70][e.level];
      if (e.darts <= goal && e.level < 4) return `Strong! Under ${goal} darts – try the next level.`;
      return `Goal at this level: under ${goal} darts to the bull.`;
    }
  };

  // ---------- Bob's 27 ----------
  const BOB_T = [...R20, 25];
  const BOB_GOAL = [0, 100, 200, 300, 500];
  const dv = n => n === 25 ? 50 : 2 * n;
  function bobState(S) {
    let score = 27, out = false;
    S.r.forEach((k, i) => { score += k ? k * dv(BOB_T[i]) : -dv(BOB_T[i]); if (score <= 0 && S.level >= 2) out = true; });
    return { score, out, round: S.r.length, hits: S.r.reduce((a, b) => a + b, 0), done: out || S.r.length >= 21 };
  }
  const BOB = {
    name: "Bob's 27", short: "Bob's 27",
    describe: L => `Start with 27 points · 21 rounds D1 to D20, then bull · 3 darts per double · hit = + value of the double, no hit = − value · `
      + (L < 2 ? 'you always play to the end' : 'at 0 or less the game ends') + (BOB_GOAL[L] ? ` · goal: ${BOB_GOAL[L]}+ points` : ''),
    opts: () => '',
    start: s => ({ mode: 'bob', level: s.level, r: [], date: now() }),
    view(S, c) {
      const st = bobState(S), n = BOB_T[st.round];
      let h = `<div class="card">` + top(c, "Bob's 27", S.level, `Round ${st.round + 1} / 21`) + bar(st.round, 21);
      h += `<div class="target">${dl(n)}</div><div class="tcap">3 darts · hit +${dv(n)}, none −${dv(n)}</div>`;
      h += `<div class="tdarts">Score <b class="${st.score > 0 ? 'gw' : 'gl'}">${st.score}</b></div>`;
      h += `<div class="setlabel c">How many hits?</div><div class="okgrid">`;
      for (let k = 0; k <= 3; k++) h += c.btn('drBob', k === 0 ? '0' : '✓ ' + k, k, k === 0 ? 'okb zero' : 'okb');
      h += `</div><div class="live">Doubles rate <b>${c.f1(pct(st.hits, st.round * 3))} %</b></div>`;
      if (S.r.length) h += `<div class="chips">${S.r.map((k, i) => `<span class="${k ? 'g' : ''}">${dl(BOB_T[i])}: ${k}</span>`).slice(-10).join('')}</div>`;
      return h + c.footer() + `</div>`;
    },
    act(a, v, S) {
      if (a === 'drBob') { S.r.push(+v); return bobState(S).done ? 'finish' : ''; }
      if (a === 'undoTask') S.r.pop();
      return '';
    },
    entry(S) {
      if (!S.r.length) return null;
      const st = bobState(S);
      return { date: S.date, mode: 'bob', level: S.level, score: st.score, round: st.round, out: st.out, done: st.done,
               hits: st.hits, darts: st.round * 3, hitPct: pct(st.hits, st.round * 3) };
    },
    metric: (e, c) => ({ main: e.score + ' pts', det: `${c.f1(e.hitPct)} % doubles · ${e.out ? 'out in round ' + e.round : e.done ? 'all 21 rounds' : 'aborted after ' + e.round}` }),
    summary: (e, c) => `<div class="sumgrid"><div><b class="${e.score > 0 ? '' : 'gl'}">${e.score}</b><small>final score</small></div><div><b>${c.f1(e.hitPct)} %</b><small>doubles rate</small></div><div><b>${e.round}/21</b><small>rounds</small></div></div>`,
    series: [{ n: 'Points', c: '#ec4899', k: 'score' }],
    ov: { val: e => e.score, unit: ' Pkt', bar: v => Math.max(0, v / 7) },
    tip(e) {
      const g = BOB_GOAL[e.level], ng = BOB_GOAL[Math.min(4, e.level + 1)];
      if (e.level < 4 && e.score >= Math.max(ng, 100)) return `Strong! ${e.score} points are enough for the next level: <b>${LVN[e.level + 1]}</b>.`;
      return g ? `Goal at this level: ${g}+ points.` : 'Play all 21 rounds and see which doubles cost you points.';
    }
  };
  const LVN = ['Beginner', 'Easy', 'Medium', 'Advanced', 'Hard'];

  // ---------- Doppel-Runde ----------
  const DR_POOL = L => L === 0 ? TOP_D : L === 1 ? COMMON_D : [...R20, 25];
  const DR_GOAL = [20, 25, 30, 35, 40];
  const DR = {
    name: 'Doubles Round', short: 'Doubles Round',
    describe: (L, cnt, s) => `${L === 0 ? 'top doubles (D20, D16, D18, D12, D10, D8, D4)' : L === 1 ? '10 common doubles' : 'all doubles D1–D20 + bull'} · 3 darts each · ${s.drOrder === 'rnd' ? 'random' : 'fixed'} order · goal: ${DR_GOAL[L]} % doubles rate`,
    opts: (s, c) => `<div class="setlabel">Order</div><div class="seg">${c.btn('drOrder', 'In order', 'seq', '', s.drOrder !== 'rnd')}${c.btn('drOrder', 'Random', 'rnd', '', s.drOrder === 'rnd')}</div>`,
    start(s) {
      const p = DR_POOL(s.level).slice();
      const t = s.drOrder === 'rnd' ? shuffle(p) : p.sort((a, b) => a - b);
      return { mode: 'dr', level: s.level, t, r: [], date: now() };
    },
    view(S, c) {
      const i = S.r.length, n = S.t[i], hits = S.r.reduce((a, b) => a + b, 0);
      let h = `<div class="card">` + top(c, 'Doubles Round', S.level, `Double ${i + 1} / ${S.t.length}`) + bar(i, S.t.length);
      h += `<div class="target">${dl(n)}</div><div class="tcap">${n === 25 ? 'Bullseye (50)' : 'Double ' + n} · 3 darts</div>`;
      h += `<div class="setlabel c">How many hits?</div><div class="okgrid">`;
      for (let k = 0; k <= 3; k++) h += c.btn('drDR', k === 0 ? '0' : '✓ ' + k, k, k === 0 ? 'okb zero' : 'okb');
      h += `</div><div class="live">Doubles rate <b>${c.f1(pct(hits, i * 3))} %</b> · ${hits} hits</div>`;
      if (i) h += `<div class="chips">${S.r.map((k, j) => `<span class="${k ? 'g' : ''}">${dl(S.t[j])}: ${k}</span>`).slice(-10).join('')}</div>`;
      return h + c.footer() + `</div>`;
    },
    act(a, v, S) {
      if (a === 'drDR') { S.r.push(+v); return S.r.length >= S.t.length ? 'finish' : ''; }
      if (a === 'undoTask') S.r.pop();
      return '';
    },
    entry(S) {
      if (!S.r.length) return null;
      const f = {}; S.r.forEach((k, i) => { f[S.t[i]] = k; });
      const hits = S.r.reduce((a, b) => a + b, 0);
      return { date: S.date, mode: 'dr', level: S.level, f, n: S.r.length, hits, darts: S.r.length * 3, hitPct: pct(hits, S.r.length * 3) };
    },
    metric: (e, c) => ({ main: c.f1(e.hitPct) + ' %', det: `${e.hits} hits · ${e.n} doubles` }),
    summary(e, c) {
      const fs = Object.entries(e.f).map(([n, k]) => [+n, k]);
      const best = fs.filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3), miss = fs.filter(x => x[1] === 0).map(x => dl(x[0]));
      return `<div class="sumgrid"><div><b>${c.f1(e.hitPct)} %</b><small>doubles rate</small></div><div><b>${e.hits}</b><small>hits</small></div><div><b>${e.darts}</b><small>Darts</small></div></div>`
        + `<div class="hint">${best.length ? 'Best: ' + best.map(x => `<b>${dl(x[0])}</b> (${x[1]}/3)`).join(', ') + '. ' : ''}${miss.length ? 'No hits: ' + miss.join(', ') + '.' : 'Hit every double at least once!'}</div>`;
    },
    series: [{ n: 'Doubles rate %', c: '#ec4899', k: 'hitPct' }], max: 100,
    ov: { val: e => e.hitPct, unit: ' %', bar: v => v },
    // Doppelquote pro Feld über alle Doppel-Runden
    extra(hist, c) {
      const agg = {}; hist.filter(e => e.mode === 'dr').forEach(e => Object.entries(e.f).forEach(([n, k]) => { const a = agg[n] = agg[n] || [0, 0]; a[0] += k; a[1] += 3; }));
      const rows = Object.entries(agg).map(([n, [h, d]]) => [+n, pct(h, d), d]);
      if (!rows.length) return '';
      rows.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      let h = `<h2 class="sec">Doubles rate per field</h2><div class="card"><div class="bars">`;
      rows.forEach(([n, r, d]) => { h += `<div class="br"><span>${dl(n)}</span><i><em class="${r >= 40 ? 'g' : r >= 20 ? 'y' : 'r'}" style="width:${r}%"></em></i><b>${Math.round(r)} %</b><small>${d}</small></div>`; });
      const best = rows[0], worst = rows[rows.length - 1];
      return h + `</div><div class="boardhint">From all doubles rounds · best: ${dl(best[0])} · weakest: ${dl(worst[0])}</div></div>`;
    },
    tip(e) {
      const g = DR_GOAL[e.level];
      if (e.hitPct >= g && e.level < 4) return `Strong! Over ${g} % – try the next level: <b>${LVN[e.level + 1]}</b>.`;
      return `Goal at this level: ${g} % doubles rate.`;
    }
  };

  // ---------- Checkout-Leiter ----------
  const LAD_START = [41, 61, 81, 101, 121];
  const ladState = S => {
    let cur = S.start, high = 0, ok = 0, dsum = 0;
    S.r.forEach(r => { if (r > 0) { ok++; dsum += r; high = Math.max(high, cur); cur++; } else cur = Math.max(S.start, cur - 1); });
    return { cur, high, ok, dsum, n: S.r.length };
  };
  const LAD = {
    name: 'Checkout Ladder', short: 'Ladder',
    describe: (L, cnt) => `${cnt} rounds · start at ${LAD_START[L]} · 9 darts (3 visits) per checkout · done = target +1, missed = −1 (never below ${LAD_START[L]}) · Double-Out · route ${L < 3 ? 'shown' : 'shown on request only'}`,
    opts: (s, c) => `<div class="setlabel">Rounds</div><div class="seg">${[10, 20, 30].map(n => c.btn('tasks', n, n, '', s.tasks === n)).join('')}</div>`,
    start: s => ({ mode: 'lad', level: s.level, start: LAD_START[s.level], n: s.tasks, r: [], date: now() }),
    view(S, c) {
      const st = ladState(S), rt = routeText(route(st.cur));
      let h = `<div class="card">` + top(c, 'Checkout Ladder', S.level, `Round ${st.n + 1} / ${S.n}`) + bar(st.n, S.n);
      h += `<div class="target">${st.cur}</div><div class="tcap">Checkout ${st.cur} (Double-Out) · 9 darts</div>`;
      if (rt) h += (S.level < 3 || c.showRoute) ? `<div class="route">Route: ${rt}</div>` : `<button class="link" data-a="route">Show route</button>`;
      else h += `<div class="route">No 3-dart finish – set it up first</div>`;
      h += `<div class="setlabel c">Done with dart …</div><div class="okgrid">`;
      for (let i = 1; i <= 9; i++) h += c.btn('drLad', `✓ ${i}`, i, 'okb');
      h += `</div><button class="big bad" data-a="drLad" data-v="0">✕ Nicht in 9 Darts geschafft</button>`;
      h += `<div class="live">Done <b>${st.ok}/${st.n}</b> · highest finish <b>${st.high || '–'}</b></div>`;
      return h + c.footer() + `</div>`;
    },
    act(a, v, S) {
      if (a === 'drLad') { S.r.push(+v); return S.r.length >= S.n ? 'finish' : ''; }
      if (a === 'undoTask') S.r.pop();
      return '';
    },
    entry(S) {
      if (!S.r.length) return null;
      const st = ladState(S);
      return { date: S.date, mode: 'lad', level: S.level, start: S.start, n: st.n, ok: st.ok, high: st.high, end: st.cur,
               rate: pct(st.ok, st.n), dpc: st.ok ? st.dsum / st.ok : 0 };
    },
    metric: (e, c) => ({ main: e.high ? 'to ' + e.high : '–', det: `${e.ok}/${e.n} · ${c.f1(e.rate)} % · ${e.ok ? c.f1(e.dpc) + ' darts/finish' : 'no finish'}` }),
    summary: (e, c) => `<div class="sumgrid"><div><b>${e.high || '–'}</b><small>highest finish</small></div><div><b>${c.f1(e.rate)} %</b><small>success rate</small></div><div><b>${e.ok ? c.f1(e.dpc) : '–'}</b><small>darts per checkout</small></div></div>`,
    series: [{ n: 'Highest finish', c: '#ec4899', k: 'high' }, { n: 'Success rate %', c: '#a1a1aa', k: 'rate' }],
    ov: { val: e => e.high, unit: '', bar: v => (v - 40) / 1.3 },
    tip(e) {
      if (e.rate >= 60 && e.level < 4) return `Strong! ${Math.round(e.rate)} % – on <b>${LVN[e.level + 1]}</b> you start at ${LAD_START[e.level + 1]}.`;
      return 'From a 60 % success rate the next level is worth it.';
    }
  };

  // ---------- Shanghai ----------
  const SH_T = L => L === 0 ? R20.slice(0, 7) : L === 1 ? R20.slice(0, 10) : L === 2 ? R20 : [...R20, 25];
  const SH_GOAL = [80, 120, 250, 280, 320];
  function shState(S) {
    const t = SH_T(S.level); let score = 0, hits = 0, sh = 0, out = false; const rs = [];
    for (let r = 0; r * 3 < S.d.length; r++) {
      const ds = S.d.slice(r * 3, r * 3 + 3), n = t[r];
      let pts = ds.reduce((a, m) => a + m * n, 0); hits += ds.filter(m => m > 0).length;
      if (ds.length === 3 && n !== 25 && [1, 2, 3].every(m => ds.includes(m))) { pts += 100; sh++; }
      score += pts; rs.push(pts);
      if (ds.length === 3 && pts === 0 && S.level === 4) { out = true; break; }
    }
    const round = Math.floor(S.d.length / 3);
    return { score, hits, sh, out, rs, round, darts: S.d.length, done: out || round >= t.length, t };
  }
  const SH = {
    name: 'Shanghai', short: 'Shanghai',
    describe: L => `${['numbers 1–7', 'numbers 1–10', 'numbers 1–20', 'numbers 1–20 + bull', 'numbers 1–20 + bull'][L]} · 3 darts at the number each round · single 1×, double 2×, treble 3× · single + double + treble in one round = Shanghai (+100)`
      + (L === 4 ? ' · round without a hit = game over' : '') + ` · goal: ${SH_GOAL[L]}+ points`,
    opts: () => '',
    start: s => ({ mode: 'sh', level: s.level, d: [], date: now() }),
    view(S, c) {
      const st = shState(S), n = st.t[st.round], k = S.d.length % 3, cur = S.d.slice(st.round * 3);
      let h = `<div class="card">` + top(c, 'Shanghai', S.level, `Round ${st.round + 1} / ${st.t.length}`) + bar(st.round, st.t.length);
      h += `<div class="target">${lbl(n)}</div><div class="tcap">Dart ${k + 1} of 3 · ${n === 25 ? 'bull: 25 or 50' : 'single, double and treble = Shanghai'}</div>`;
      h += `<div class="tdarts">Score <b>${st.score}</b>${cur.length ? ' · this round: ' + cur.map(m => m ? dlabel(n, m) : '–').join(' ') : ''}</div>`;
      h += `<div class="setlabel c">What did you hit?</div><div class="okgrid">`;
      (n === 25 ? [[1, '25'], [2, 'Bull 50']] : [[1, 'S' + n], [2, 'D' + n], [3, 'T' + n]]).forEach(([m, l]) => { h += c.btn('drSh', l, m, 'okb'); });
      h += `</div><button class="big bad" data-a="drSh" data-v="0">✕ Miss</button>`;
      h += `<div class="live">Hit rate <b>${c.f1(pct(st.hits, st.darts))} %</b> · Shanghais <b>${st.sh}</b></div>`;
      if (st.rs.length) h += `<div class="chips">${st.rs.slice(0, st.round).map((p, i) => `<span class="${p ? 'g' : ''}">${lbl(st.t[i])}: ${p}</span>`).slice(-10).join('')}</div>`;
      return h + c.footer() + `</div>`;
    },
    act(a, v, S) {
      if (a === 'drSh') { S.d.push(+v); return shState(S).done ? 'finish' : ''; }
      if (a === 'undoTask') S.d.pop();
      return '';
    },
    entry(S) {
      if (!S.d.length) return null;
      const st = shState(S);
      return { date: S.date, mode: 'sh', level: S.level, score: st.score, sh: st.sh, round: st.round, out: st.out, done: st.done,
               darts: st.darts, hits: st.hits, hitPct: pct(st.hits, st.darts) };
    },
    metric: (e, c) => ({ main: e.score + ' pts', det: `${c.f1(e.hitPct)} % hits${e.sh ? ' · ' + e.sh + '× Shanghai' : ''}${e.out ? ' · out in round ' + e.round : e.done ? '' : ' · aborted'}` }),
    summary: (e, c) => `<div class="sumgrid"><div><b>${e.score}</b><small>points</small></div><div><b>${c.f1(e.hitPct)} %</b><small>hit rate</small></div><div><b>${e.sh}</b><small>Shanghais</small></div></div>`,
    series: [{ n: 'Points', c: '#ec4899', k: 'score' }, { n: 'Hit rate %', c: '#a1a1aa', k: 'hitPct' }],
    ov: { val: e => e.score, unit: ' Pkt', bar: v => v / 4 },
    tip(e) {
      const g = SH_GOAL[e.level];
      if (e.score >= g && e.level < 4) return `Strong! Over ${g} points – try the next level: <b>${LVN[e.level + 1]}</b>.`;
      return `Goal at this level: ${g}+ points.`;
    }
  };

  // ---------- Halve-It ----------
  // Ziele: Zahl (nur diese Zahl, jeder Ring), 'D' beliebiges Doppel, 'T' beliebiges Triple, 'D16'/'T20' nur dieses Feld
  const HI_T = [
    [20, 19, 'D', 18, 'T'],
    [20, 19, 'D', 18, 'T', 17],
    [20, 19, 'D', 18, 'T', 17, 25],
    [15, 16, 'D', 17, 'T', 18, 19, 20, 25],
    [20, 19, 'D', 18, 'T', 17, 'D16', 'T20', 25]
  ];
  const HI_GOAL = [80, 120, 150, 200, 200];
  const hiName = t => t === 'D' ? 'Double' : t === 'T' ? 'Treble' : t === 25 ? 'Bull' : String(t);
  const hiCap = t => t === 'D' ? 'any double' : t === 'T' ? 'any treble' : t === 25 ? '25 or 50' : /^[DT]/.test(t) ? 'only exactly this field' : 'every ring counts';
  // Ist die Punktzahl mit 3 Darts auf dieses Ziel möglich?
  function hiValid(t, p) {
    const vals = t === 'D' ? R20.map(n => 2 * n).concat(50) : t === 'T' ? R20.map(n => 3 * n) : t === 25 ? [25, 50]
      : t === 'D16' ? [32] : t === 'T20' ? [60] : [t, 2 * t, 3 * t];
    const v = [0, ...vals];
    for (const a of v) for (const b of v) for (const x of v) if (a + b + x === p) return true;
    return false;
  }
  function hiState(S) {
    let score = 0, halves = 0; const rs = [];
    S.r.forEach(p => { if (p > 0) score += p; else { score = Math.floor(score / 2); halves++; } rs.push(score); });
    return { score, halves, rs, round: S.r.length };
  }
  const HI = {
    name: 'Halve-It', short: 'Halve-It',
    describe: L => `${HI_T[L].length} rounds: ${HI_T[L].map(hiName).join(' · ')} · 3 darts each · hits are added, a round without a hit halves your score · goal: ${HI_GOAL[L]}+ points`,
    opts: () => '',
    start: s => ({ mode: 'hi', level: s.level, t: HI_T[s.level].slice(), r: [], date: now() }),
    view(S, c) {
      const st = hiState(S), t = S.t[st.round];
      let h = `<div class="card">` + top(c, 'Halve-It', S.level, `Round ${st.round + 1} / ${S.t.length}`) + bar(st.round, S.t.length);
      h += `<div class="target${String(hiName(t)).length > 4 ? ' sm' : ''}">${hiName(t)}</div><div class="tcap">3 Darts · ${hiCap(t)}</div>`;
      h += `<div class="tdarts">Score <b>${st.score}</b>${st.halves ? ' · ' + st.halves + '× halved' : ''}</div>`;
      if (S.msg) h += `<div class="msg">${S.msg}</div>`;
      h += `<div class="disp">${c.input === '' ? '<span class="ph">Points on target (0 = halve)</span>' : c.input}</div><div class="pad">`;
      [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(k => { h += c.btn('key', k, k); });
      h += c.btn('back', '⌫') + c.btn('key', 0, 0) + c.btn('drHi', 'OK', undefined, 'okk') + `</div>`;
      if (st.round) h += `<div class="chips">${S.r.map((p, i) => `<span class="${p ? 'g' : ''}">${hiName(S.t[i])}: ${p || '½'}</span>`).slice(-10).join('')}</div>`;
      return h + c.footer() + `</div>`;
    },
    act(a, v, S) {
      if (a === 'drHi') {
        const t = S.t[S.r.length], p = v === '' || v === undefined ? NaN : +v;
        if (isNaN(p) || !hiValid(t, p)) { S.msg = `${isNaN(p) ? 'Please enter points' : p + ' is not possible with 3 darts on ' + hiName(t)}`; return 'keep'; }
        S.msg = ''; S.r.push(p); return S.r.length >= S.t.length ? 'finish' : '';
      }
      if (a === 'undoTask') { S.msg = ''; S.r.pop(); }
      return '';
    },
    entry(S) {
      if (!S.r.length) return null;
      const st = hiState(S);
      return { date: S.date, mode: 'hi', level: S.level, score: st.score, halves: st.halves, n: st.round, rounds: S.t.length, done: st.round >= S.t.length };
    },
    metric: e => ({ main: e.score + ' Pkt', det: `${e.halves}× halbiert · ${e.n}/${e.rounds} Runden` }),
    summary: e => `<div class="sumgrid"><div><b>${e.score}</b><small>final score</small></div><div><b>${e.halves}</b><small>× halved</small></div><div><b>${e.n}/${e.rounds}</b><small>rounds</small></div></div>`,
    series: [{ n: 'Final score', c: '#ec4899', k: 'score' }],
    ov: { val: e => e.score, unit: ' Pkt', bar: v => v / 4 },
    tip(e) {
      const g = HI_GOAL[e.level];
      if (e.score >= g && !e.halves && e.level < 4) return `Strong! Over ${g} and never halved – try the next level: <b>${LVN[e.level + 1]}</b>.`;
      return `Goal at this level: ${g}+ points${e.halves ? ' and no halving' : ''}.`;
    }
  };

  // ---------- Cricket-Training ----------
  const CR_F = [20, 19, 18, 17, 16, 15, 25];
  const CR_NEED = [1, 2, 3, 3, 3];
  const CR_GOAL = [15, 30, 45, 40, 50];
  function crState(S) {
    const need = CR_NEED[S.level], mk = {}; CR_F.forEach(f => { mk[f] = 0; });
    let marks = 0;
    S.d.forEach(([f, m]) => { if (f && mk[f] < need) { const add = Math.min(m, need - mk[f]); mk[f] += add; marks += add; } });
    const open = CR_F.filter(f => mk[f] < need);
    return { mk, marks, need, open, darts: S.d.length, done: !open.length };
  }
  const CR = {
    name: 'Cricket-Training', short: 'Cricket',
    describe: L => `Mark 20 to 15 and bull ${CR_NEED[L]}× each · single = 1 mark, double = 2, treble = 3 · goal: close everything with as few darts as possible`
      + (L === 4 ? ' · feste Reihenfolge 20 → Bull' : '') + ` · Richtwert: unter ${CR_GOAL[L]} Darts`,
    opts: () => '',
    start: s => ({ mode: 'cr', level: s.level, d: [], date: now() }),
    view(S, c) {
      const st = crState(S), fields = S.level === 4 ? st.open.slice(0, 1) : st.open;
      let h = `<div class="card">` + top(c, 'Cricket-Training', S.level, `Dart ${st.darts + 1}`) + bar(CR_F.length - st.open.length, CR_F.length);
      h += `<div class="crboard">${CR_F.map(f => `<div class="${st.mk[f] >= st.need ? 'cl' : ''}"><b>${lbl(f)}</b><span>${'●'.repeat(st.mk[f])}${'○'.repeat(st.need - st.mk[f])}</span></div>`).join('')}</div>`;
      h += `<div class="setlabel c">What did you hit?</div><div class="crgrid">`;
      fields.forEach(f => {
        (f === 25 ? [[1, '25'], [2, 'Bull']] : [[1, 'S' + f], [2, 'D' + f], [3, 'T' + f]]).forEach(([m, l]) => { h += c.btn('drCr', l, f + ':' + m, 'okb' + (f === 25 ? ' b' : '')); });
      });
      h += `</div><button class="big bad" data-a="drCr" data-v="0:0">✕ Miss / other field</button>`;
      h += `<div class="live">Marks <b>${st.marks}</b> · MPR <b>${c.f1(st.darts ? st.marks / st.darts * 3 : 0)}</b></div>`;
      return h + c.footer() + `</div>`;
    },
    act(a, v, S) {
      if (a === 'drCr') { S.d.push(String(v).split(':').map(Number)); return crState(S).done ? 'finish' : ''; }
      if (a === 'undoTask') S.d.pop();
      return '';
    },
    entry(S) {
      if (!S.d.length) return null;
      const st = crState(S);
      return { date: S.date, mode: 'cr', level: S.level, done: st.done, darts: st.darts, marks: st.marks, mpr: st.darts ? st.marks / st.darts * 3 : 0,
               closed: CR_F.length - st.open.length };
    },
    metric: (e, c) => ({ main: e.done ? e.darts + ' darts' : e.closed + '/7 closed', det: `MPR ${c.f1(e.mpr)}${e.done ? '' : ' · aborted'}` }),
    summary: (e, c) => `<div class="sumgrid"><div><b>${e.done ? e.darts : '–'}</b><small>darts to close all</small></div><div><b>${c.f1(e.mpr)}</b><small>marks per round</small></div><div><b>${e.closed}/7</b><small>fields closed</small></div></div>`,
    series: [{ n: 'Darts to close all', c: '#ec4899', k: 'darts' }],
    list: h => h.filter(e => e.done),
    ov: { val: e => e.darts, unit: ' Darts', low: true, only: e => e.done, bar: v => Math.max(0, 100 - v) },
    tip(e) {
      if (!e.done) return 'Not everything closed – finish next time, then the dart count counts.';
      const g = CR_GOAL[e.level];
      if (e.darts <= g && e.level < 4) return `Strong! Under ${g} darts – try the next level: <b>${LVN[e.level + 1]}</b>.`;
      return `Guide value at this level: under ${g} darts. Good players get over 2 marks per round (MPR).`;
    }
  };

  return { atc: ATC, bob: BOB, dr: DR, lad: LAD, sh: SH, hi: HI, cr: CR };
})();
