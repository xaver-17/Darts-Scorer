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
    series: [{ n: 'Darts bis Bull', c: '#111', k: 'darts' }, { n: 'Trefferquote %', c: '#2563eb', k: 'hitPct' }],
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
    series: [{ n: 'Punkte', c: '#111', k: 'score' }],
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
    series: [{ n: 'Doppelquote %', c: '#111', k: 'hitPct' }], max: 100,
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
    series: [{ n: 'Höchstes Finish', c: '#111', k: 'high' }, { n: 'Erfolgsquote %', c: '#2563eb', k: 'rate' }],
    ov: { val: e => e.high, unit: '', bar: v => (v - 40) / 1.3 },
    tip(e) {
      if (e.rate >= 60 && e.level < 4) return `Stark! ${Math.round(e.rate)} % – auf <b>${LVN[e.level + 1]}</b> startest du bei ${LAD_START[e.level + 1]}.`;
      return 'Ab 60 % Erfolgsquote lohnt sich die nächste Stufe.';
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
    describe: L => `${['Zahlen 1–7', 'Zahlen 1–10', 'Zahlen 1–20', 'Zahlen 1–20 + Bull', 'Zahlen 1–20 + Bull'][L]} · je Runde 3 Darts auf die Zahl · Single 1×, Doppel 2×, Triple 3× · Single + Doppel + Triple in einer Runde = Shanghai (+100)`
      + (L === 4 ? ' · Runde ohne Treffer = Schluss' : '') + ` · Ziel: ${SH_GOAL[L]}+ Punkte`,
    opts: () => '',
    start: s => ({ mode: 'sh', level: s.level, d: [], date: now() }),
    view(S, c) {
      const st = shState(S), n = st.t[st.round], k = S.d.length % 3, cur = S.d.slice(st.round * 3);
      let h = `<div class="card">` + top(c, 'Shanghai', S.level, `Runde ${st.round + 1} / ${st.t.length}`) + bar(st.round, st.t.length);
      h += `<div class="target">${lbl(n)}</div><div class="tcap">Dart ${k + 1} von 3 · ${n === 25 ? 'Bull: 25 oder 50' : 'Single, Doppel und Triple = Shanghai'}</div>`;
      h += `<div class="tdarts">Stand <b>${st.score}</b>${cur.length ? ' · diese Runde: ' + cur.map(m => m ? dlabel(n, m) : '–').join(' ') : ''}</div>`;
      h += `<div class="setlabel c">Was hast du getroffen?</div><div class="okgrid">`;
      (n === 25 ? [[1, '25'], [2, 'Bull 50']] : [[1, 'S' + n], [2, 'D' + n], [3, 'T' + n]]).forEach(([m, l]) => { h += c.btn('drSh', l, m, 'okb'); });
      h += `</div><button class="big bad" data-a="drSh" data-v="0">✕ Daneben</button>`;
      h += `<div class="live">Trefferquote <b>${c.f1(pct(st.hits, st.darts))} %</b> · Shanghais <b>${st.sh}</b></div>`;
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
    metric: (e, c) => ({ main: e.score + ' Pkt', det: `${c.f1(e.hitPct)} % Treffer${e.sh ? ' · ' + e.sh + '× Shanghai' : ''}${e.out ? ' · raus in Runde ' + e.round : e.done ? '' : ' · abgebrochen'}` }),
    summary: (e, c) => `<div class="sumgrid"><div><b>${e.score}</b><small>Punkte</small></div><div><b>${c.f1(e.hitPct)} %</b><small>Trefferquote</small></div><div><b>${e.sh}</b><small>Shanghais</small></div></div>`,
    series: [{ n: 'Punkte', c: '#111', k: 'score' }, { n: 'Trefferquote %', c: '#2563eb', k: 'hitPct' }],
    ov: { val: e => e.score, unit: ' Pkt', bar: v => v / 4 },
    tip(e) {
      const g = SH_GOAL[e.level];
      if (e.score >= g && e.level < 4) return `Stark! Über ${g} Punkte – probier die nächste Stufe: <b>${LVN[e.level + 1]}</b>.`;
      return `Ziel auf dieser Stufe: ${g}+ Punkte.`;
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
  const hiName = t => t === 'D' ? 'Doppel' : t === 'T' ? 'Triple' : t === 25 ? 'Bull' : String(t);
  const hiCap = t => t === 'D' ? 'beliebiges Doppel' : t === 'T' ? 'beliebiges Triple' : t === 25 ? '25 oder 50' : /^[DT]/.test(t) ? 'nur genau dieses Feld' : 'jeder Ring zählt';
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
    describe: L => `${HI_T[L].length} Runden: ${HI_T[L].map(hiName).join(' · ')} · je 3 Darts · Treffer werden addiert, Runde ohne Treffer halbiert den Stand · Ziel: ${HI_GOAL[L]}+ Punkte`,
    opts: () => '',
    start: s => ({ mode: 'hi', level: s.level, t: HI_T[s.level].slice(), r: [], date: now() }),
    view(S, c) {
      const st = hiState(S), t = S.t[st.round];
      let h = `<div class="card">` + top(c, 'Halve-It', S.level, `Runde ${st.round + 1} / ${S.t.length}`) + bar(st.round, S.t.length);
      h += `<div class="target${String(hiName(t)).length > 4 ? ' sm' : ''}">${hiName(t)}</div><div class="tcap">3 Darts · ${hiCap(t)}</div>`;
      h += `<div class="tdarts">Stand <b>${st.score}</b>${st.halves ? ' · ' + st.halves + '× halbiert' : ''}</div>`;
      if (S.msg) h += `<div class="msg">${S.msg}</div>`;
      h += `<div class="disp">${c.input === '' ? '<span class="ph">Punkte auf das Ziel (0 = halbieren)</span>' : c.input}</div><div class="pad">`;
      [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(k => { h += c.btn('key', k, k); });
      h += c.btn('back', '⌫') + c.btn('key', 0, 0) + c.btn('drHi', 'OK', undefined, 'okk') + `</div>`;
      if (st.round) h += `<div class="chips">${S.r.map((p, i) => `<span class="${p ? 'g' : ''}">${hiName(S.t[i])}: ${p || '½'}</span>`).slice(-10).join('')}</div>`;
      return h + c.footer() + `</div>`;
    },
    act(a, v, S) {
      if (a === 'drHi') {
        const t = S.t[S.r.length], p = v === '' || v === undefined ? NaN : +v;
        if (isNaN(p) || !hiValid(t, p)) { S.msg = `${isNaN(p) ? 'Bitte Punkte eingeben' : p + ' geht mit 3 Darts auf ' + hiName(t) + ' nicht'}`; return 'keep'; }
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
    summary: e => `<div class="sumgrid"><div><b>${e.score}</b><small>Endstand</small></div><div><b>${e.halves}</b><small>× halbiert</small></div><div><b>${e.n}/${e.rounds}</b><small>Runden</small></div></div>`,
    series: [{ n: 'Endstand', c: '#111', k: 'score' }],
    ov: { val: e => e.score, unit: ' Pkt', bar: v => v / 4 },
    tip(e) {
      const g = HI_GOAL[e.level];
      if (e.score >= g && !e.halves && e.level < 4) return `Stark! Über ${g} und nie halbiert – probier die nächste Stufe: <b>${LVN[e.level + 1]}</b>.`;
      return `Ziel auf dieser Stufe: ${g}+ Punkte${e.halves ? ' und keine Halbierung' : ''}.`;
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
    describe: L => `20 bis 15 und Bull je ${CR_NEED[L]}× markieren · Single = 1 Marke, Doppel = 2, Triple = 3 · Ziel: alles mit möglichst wenig Darts schließen`
      + (L === 4 ? ' · feste Reihenfolge 20 → Bull' : '') + ` · Richtwert: unter ${CR_GOAL[L]} Darts`,
    opts: () => '',
    start: s => ({ mode: 'cr', level: s.level, d: [], date: now() }),
    view(S, c) {
      const st = crState(S), fields = S.level === 4 ? st.open.slice(0, 1) : st.open;
      let h = `<div class="card">` + top(c, 'Cricket-Training', S.level, `Dart ${st.darts + 1}`) + bar(CR_F.length - st.open.length, CR_F.length);
      h += `<div class="crboard">${CR_F.map(f => `<div class="${st.mk[f] >= st.need ? 'cl' : ''}"><b>${lbl(f)}</b><span>${'●'.repeat(st.mk[f])}${'○'.repeat(st.need - st.mk[f])}</span></div>`).join('')}</div>`;
      h += `<div class="setlabel c">Was hast du getroffen?</div><div class="crgrid">`;
      fields.forEach(f => {
        (f === 25 ? [[1, '25'], [2, 'Bull']] : [[1, 'S' + f], [2, 'D' + f], [3, 'T' + f]]).forEach(([m, l]) => { h += c.btn('drCr', l, f + ':' + m, 'okb' + (f === 25 ? ' b' : '')); });
      });
      h += `</div><button class="big bad" data-a="drCr" data-v="0:0">✕ Daneben / anderes Feld</button>`;
      h += `<div class="live">Marken <b>${st.marks}</b> · MPR <b>${c.f1(st.darts ? st.marks / st.darts * 3 : 0)}</b></div>`;
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
    metric: (e, c) => ({ main: e.done ? e.darts + ' Darts' : e.closed + '/7 zu', det: `MPR ${c.f1(e.mpr)}${e.done ? '' : ' · abgebrochen'}` }),
    summary: (e, c) => `<div class="sumgrid"><div><b>${e.done ? e.darts : '–'}</b><small>Darts bis alles zu</small></div><div><b>${c.f1(e.mpr)}</b><small>Marken pro Runde</small></div><div><b>${e.closed}/7</b><small>Felder zu</small></div></div>`,
    series: [{ n: 'Darts bis alles zu', c: '#111', k: 'darts' }],
    list: h => h.filter(e => e.done),
    ov: { val: e => e.darts, unit: ' Darts', low: true, only: e => e.done, bar: v => Math.max(0, 100 - v) },
    tip(e) {
      if (!e.done) return 'Nicht alles geschlossen – beim nächsten Mal durchziehen, dann zählt die Darts-Zahl.';
      const g = CR_GOAL[e.level];
      if (e.darts <= g && e.level < 4) return `Stark! Unter ${g} Darts – probier die nächste Stufe: <b>${LVN[e.level + 1]}</b>.`;
      return `Richtwert auf dieser Stufe: unter ${g} Darts. Gute Spieler schaffen über 2 Marken pro Runde (MPR).`;
    }
  };

  return { atc: ATC, bob: BOB, dr: DR, lad: LAD, sh: SH, hi: HI, cr: CR };
})();
