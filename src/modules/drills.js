// ===== Trainingsspiele: Around the Clock, Bob's 27, Doppel-Runde, Checkout-Leiter =====
// Jeder Modus liefert: name, short, describe, opts, start, view, act, entry, metric, series, ov, tip.
// trainer.js ruft diese Funktionen über window.DRILLS auf und übergibt Helfer in ctx
// (btn, f1, LV, footer, showRoute).
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
    if (L <= 1) return [[1, 'Single'], [2, 'Doppel'], [3, 'Triple']];
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
    describe: L => ['1 bis 20, dann Bull · jeder Ring zählt',
      '1 bis 20, dann Bull · jeder Ring zählt · Sprung: Doppel = 2 Felder weiter, Triple = 3',
      '1 bis 20, dann Bull · nur Doppel zählen · Bull: 25 oder 50',
      '1 bis 20, dann Bull · nur Triple zählen · Bull: 25 oder 50',
      '1 bis 20, dann Bull · nur Doppel zählen · Bull nur als Bullseye (50)'][L] + ' · Ziel: so wenige Darts wie möglich',
    opts: () => '',
    start: s => ({ mode: 'atc', level: s.level, d: [], date: now() }),
    view(S, c) {
      const st = atcState(S), n = ATC_T[st.idx];
      let h = `<div class="card">` + top(c, 'Around the Clock', S.level, `Feld ${st.idx + 1} / 21`) + bar(st.idx, 21);
      const sub = n === 25 ? (S.level === 4 ? 'Bullseye (50) treffen' : 'Bull treffen (25 oder 50)')
        : S.level <= 1 ? `Die ${n} treffen – egal welcher Ring` : S.level === 3 ? `Triple ${n} treffen` : `Doppel ${n} treffen`;
      h += `<div class="target">${n === 25 ? 'Bull' : (S.level === 3 ? 'T' : S.level >= 2 ? 'D' : '') + n}</div><div class="tcap">${sub}</div>`;
      h += `<div class="tdarts">Dart ${st.darts + 1} · ${st.per[st.idx]} auf dieses Feld</div>`;
      h += `<div class="setlabel c">Was hast du getroffen?</div><div class="okgrid">`;
      atcButtons(S.level, n).forEach(([m, l]) => { h += c.btn('drHit', l, m, 'okb'); });
      h += `</div><button class="big bad" data-a="drHit" data-v="0">✕ Daneben</button>`;
      h += `<div class="live">Darts <b>${st.darts}</b> · Trefferquote <b>${c.f1(pct(st.hits, st.darts))} %</b></div>`;
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
    metric: (e, c) => ({ main: e.done ? e.darts + ' Darts' : 'bis ' + (e.reached ? lbl(ATC_T[e.reached - 1]) : '–'),
                         det: `${c.f1(e.hitPct)} % Treffer${e.done ? '' : ' · abgebrochen'}${e.worst && e.worst.length ? ' · zäh: ' + e.worst.map(w => lbl(w[0])).join(', ') : ''}` }),
    summary: (e, c) => `<div class="sumgrid"><div><b>${e.done ? e.darts : '–'}</b><small>Darts bis Bull</small></div><div><b>${c.f1(e.hitPct)} %</b><small>Trefferquote</small></div><div><b>${e.reached}/21</b><small>Felder geschafft</small></div></div>`
      + (e.worst.length ? `<div class="hint">Am meisten Darts gekostet: ${e.worst.map(w => `<b>${lbl(w[0])}</b> (${w[1]})`).join(', ')}</div>` : ''),
    series: [{ n: 'Darts bis Bull', c: '#4ade80', k: 'darts' }, { n: 'Trefferquote %', c: '#60a5fa', k: 'hitPct' }],
    list: h => h.filter(e => e.done),
    ov: { val: e => e.darts, unit: ' Darts', low: true, only: e => e.done, bar: v => Math.max(0, 100 - (v - 21) / 1.2) },
    tip(e) {
      if (!e.done) return 'Nicht bis zum Bull gekommen – beim nächsten Mal durchziehen, dann zählt die Darts-Zahl.';
      const goal = [60, 50, 70, 80, 70][e.level];
      if (e.darts <= goal && e.level < 4) return `Stark! Unter ${goal} Darts – probier die nächste Stufe.`;
      return `Ziel auf dieser Stufe: unter ${goal} Darts bis zum Bull.`;
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
    describe: L => `Start mit 27 Punkten · 21 Runden D1 bis D20, dann Bull · 3 Darts pro Doppel · Treffer = + Wert des Doppels, keine Treffer = − Wert · `
      + (L < 2 ? 'du spielst immer bis zum Ende' : 'bei 0 oder weniger ist Schluss') + (BOB_GOAL[L] ? ` · Ziel: ${BOB_GOAL[L]}+ Punkte` : ''),
    opts: () => '',
    start: s => ({ mode: 'bob', level: s.level, r: [], date: now() }),
    view(S, c) {
      const st = bobState(S), n = BOB_T[st.round];
      let h = `<div class="card">` + top(c, "Bob's 27", S.level, `Runde ${st.round + 1} / 21`) + bar(st.round, 21);
      h += `<div class="target">${dl(n)}</div><div class="tcap">3 Darts · Treffer +${dv(n)}, keiner −${dv(n)}</div>`;
      h += `<div class="tdarts">Stand <b class="${st.score > 0 ? 'gw' : 'gl'}">${st.score}</b></div>`;
      h += `<div class="setlabel c">Wie oft getroffen?</div><div class="okgrid">`;
      for (let k = 0; k <= 3; k++) h += c.btn('drBob', k === 0 ? '0' : '✓ ' + k, k, k === 0 ? 'okb zero' : 'okb');
      h += `</div><div class="live">Doppelquote <b>${c.f1(pct(st.hits, st.round * 3))} %</b></div>`;
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
    metric: (e, c) => ({ main: e.score + ' Pkt', det: `${c.f1(e.hitPct)} % Doppel · ${e.out ? 'raus in Runde ' + e.round : e.done ? 'alle 21 Runden' : 'abgebrochen nach ' + e.round}` }),
    summary: (e, c) => `<div class="sumgrid"><div><b class="${e.score > 0 ? '' : 'gl'}">${e.score}</b><small>Endpunktzahl</small></div><div><b>${c.f1(e.hitPct)} %</b><small>Doppelquote</small></div><div><b>${e.round}/21</b><small>Runden</small></div></div>`,
    series: [{ n: 'Punkte', c: '#4ade80', k: 'score' }],
    ov: { val: e => e.score, unit: ' Pkt', bar: v => Math.max(0, v / 7) },
    tip(e) {
      const g = BOB_GOAL[e.level], ng = BOB_GOAL[Math.min(4, e.level + 1)];
      if (e.level < 4 && e.score >= Math.max(ng, 100)) return `Stark! ${e.score} Punkte reichen für die nächste Stufe: <b>${LVN[e.level + 1]}</b>.`;
      return g ? `Ziel auf dieser Stufe: ${g}+ Punkte.` : 'Spiel alle 21 Runden durch und schau, welche Doppel dir Punkte kosten.';
    }
  };
  const LVN = ['Beginner', 'Leicht', 'Mittel', 'Fortgeschritten', 'Hart'];

  // ---------- Doppel-Runde ----------
  const DR_POOL = L => L === 0 ? TOP_D : L === 1 ? COMMON_D : [...R20, 25];
  const DR_GOAL = [20, 25, 30, 35, 40];
  const DR = {
    name: 'Doppel-Runde', short: 'Doppel-Runde',
    describe: (L, cnt, s) => `${L === 0 ? 'Top-Doppel (D20, D16, D18, D12, D10, D8, D4)' : L === 1 ? '10 gängige Doppel' : 'alle Doppel D1–D20 + Bull'} · je 3 Darts · ${s.drOrder === 'rnd' ? 'zufällige' : 'feste'} Reihenfolge · Ziel: ${DR_GOAL[L]} % Doppelquote`,
    opts: (s, c) => `<div class="setlabel">Reihenfolge</div><div class="seg">${c.btn('drOrder', 'Der Reihe nach', 'seq', '', s.drOrder !== 'rnd')}${c.btn('drOrder', 'Zufällig', 'rnd', '', s.drOrder === 'rnd')}</div>`,
    start(s) {
      const p = DR_POOL(s.level).slice();
      const t = s.drOrder === 'rnd' ? shuffle(p) : p.sort((a, b) => a - b);
      return { mode: 'dr', level: s.level, t, r: [], date: now() };
    },
    view(S, c) {
      const i = S.r.length, n = S.t[i], hits = S.r.reduce((a, b) => a + b, 0);
      let h = `<div class="card">` + top(c, 'Doppel-Runde', S.level, `Doppel ${i + 1} / ${S.t.length}`) + bar(i, S.t.length);
      h += `<div class="target">${dl(n)}</div><div class="tcap">${n === 25 ? 'Bullseye (50)' : 'Doppel ' + n} · 3 Darts</div>`;
      h += `<div class="setlabel c">Wie oft getroffen?</div><div class="okgrid">`;
      for (let k = 0; k <= 3; k++) h += c.btn('drDR', k === 0 ? '0' : '✓ ' + k, k, k === 0 ? 'okb zero' : 'okb');
      h += `</div><div class="live">Doppelquote <b>${c.f1(pct(hits, i * 3))} %</b> · ${hits} Treffer</div>`;
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
    metric: (e, c) => ({ main: c.f1(e.hitPct) + ' %', det: `${e.hits} Treffer · ${e.n} Doppel` }),
    summary(e, c) {
      const fs = Object.entries(e.f).map(([n, k]) => [+n, k]);
      const best = fs.filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3), miss = fs.filter(x => x[1] === 0).map(x => dl(x[0]));
      return `<div class="sumgrid"><div><b>${c.f1(e.hitPct)} %</b><small>Doppelquote</small></div><div><b>${e.hits}</b><small>Treffer</small></div><div><b>${e.darts}</b><small>Darts</small></div></div>`
        + `<div class="hint">${best.length ? 'Beste: ' + best.map(x => `<b>${dl(x[0])}</b> (${x[1]}/3)`).join(', ') + '. ' : ''}${miss.length ? 'Ohne Treffer: ' + miss.join(', ') + '.' : 'Jedes Doppel mindestens einmal getroffen!'}</div>`;
    },
    series: [{ n: 'Doppelquote %', c: '#4ade80', k: 'hitPct' }], max: 100,
    ov: { val: e => e.hitPct, unit: ' %', bar: v => v },
    // Doppelquote pro Feld über alle Doppel-Runden
    extra(hist, c) {
      const agg = {}; hist.filter(e => e.mode === 'dr').forEach(e => Object.entries(e.f).forEach(([n, k]) => { const a = agg[n] = agg[n] || [0, 0]; a[0] += k; a[1] += 3; }));
      const rows = Object.entries(agg).map(([n, [h, d]]) => [+n, pct(h, d), d]);
      if (!rows.length) return '';
      rows.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      let h = `<h2 class="sec">Doppelquote pro Feld</h2><div class="card"><div class="bars">`;
      rows.forEach(([n, r, d]) => { h += `<div class="br"><span>${dl(n)}</span><i><em class="${r >= 40 ? 'g' : r >= 20 ? 'y' : 'r'}" style="width:${r}%"></em></i><b>${Math.round(r)} %</b><small>${d}</small></div>`; });
      const best = rows[0], worst = rows[rows.length - 1];
      return h + `</div><div class="boardhint">Aus allen Doppel-Runden · Bestes: ${dl(best[0])} · Schwächstes: ${dl(worst[0])}</div></div>`;
    },
    tip(e) {
      const g = DR_GOAL[e.level];
      if (e.hitPct >= g && e.level < 4) return `Stark! Über ${g} % – probier die nächste Stufe: <b>${LVN[e.level + 1]}</b>.`;
      return `Ziel auf dieser Stufe: ${g} % Doppelquote.`;
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
    name: 'Checkout-Leiter', short: 'Leiter',
    describe: (L, cnt) => `${cnt} Runden · Start bei ${LAD_START[L]} · 9 Darts (3 Aufnahmen) pro Checkout · geschafft = Ziel +1, nicht geschafft = −1 (nie unter ${LAD_START[L]}) · Double-Out · Weg wird ${L < 3 ? 'angezeigt' : 'nur auf Wunsch angezeigt'}`,
    opts: (s, c) => `<div class="setlabel">Runden</div><div class="seg">${[10, 20, 30].map(n => c.btn('tasks', n, n, '', s.tasks === n)).join('')}</div>`,
    start: s => ({ mode: 'lad', level: s.level, start: LAD_START[s.level], n: s.tasks, r: [], date: now() }),
    view(S, c) {
      const st = ladState(S), rt = routeText(route(st.cur));
      let h = `<div class="card">` + top(c, 'Checkout-Leiter', S.level, `Runde ${st.n + 1} / ${S.n}`) + bar(st.n, S.n);
      h += `<div class="target">${st.cur}</div><div class="tcap">Checkout ${st.cur} (Double-Out) · 9 Darts</div>`;
      if (rt) h += (S.level < 3 || c.showRoute) ? `<div class="route">Weg: ${rt}</div>` : `<button class="link" data-a="route">Weg anzeigen</button>`;
      else h += `<div class="route">Kein 3-Dart-Finish – erst stellen</div>`;
      h += `<div class="setlabel c">Geschafft mit Dart …</div><div class="okgrid">`;
      for (let i = 1; i <= 9; i++) h += c.btn('drLad', `✓ ${i}`, i, 'okb');
      h += `</div><button class="big bad" data-a="drLad" data-v="0">✕ Nicht in 9 Darts geschafft</button>`;
      h += `<div class="live">Geschafft <b>${st.ok}/${st.n}</b> · Höchstes Finish <b>${st.high || '–'}</b></div>`;
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
    metric: (e, c) => ({ main: e.high ? 'bis ' + e.high : '–', det: `${e.ok}/${e.n} · ${c.f1(e.rate)} % · ${e.ok ? c.f1(e.dpc) + ' Darts/Finish' : 'kein Finish'}` }),
    summary: (e, c) => `<div class="sumgrid"><div><b>${e.high || '–'}</b><small>Höchstes Finish</small></div><div><b>${c.f1(e.rate)} %</b><small>Erfolgsquote</small></div><div><b>${e.ok ? c.f1(e.dpc) : '–'}</b><small>Darts pro Checkout</small></div></div>`,
    series: [{ n: 'Höchstes Finish', c: '#4ade80', k: 'high' }, { n: 'Erfolgsquote %', c: '#60a5fa', k: 'rate' }],
    ov: { val: e => e.high, unit: '', bar: v => (v - 40) / 1.3 },
    tip(e) {
      if (e.rate >= 60 && e.level < 4) return `Stark! ${Math.round(e.rate)} % – auf <b>${LVN[e.level + 1]}</b> startest du bei ${LAD_START[e.level + 1]}.`;
      return 'Ab 60 % Erfolgsquote lohnt sich die nächste Stufe.';
    }
  };

  return { atc: ATC, bob: BOB, dr: DR, lad: LAD };
})();
