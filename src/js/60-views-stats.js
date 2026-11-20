// Ansichten: Stats-Seite (Übersicht, Trefferquote, Verlauf)
  // ---------- Stats-Seite ----------
  function viewStatsPage() {
    const tab = T.stab || 'over';
    let h = phead('My stats', 'Everything from your games and trainings');
    h += `<div class="segtabs">${btn('stab', 'Overview', 'over', '', tab === 'over')}${btn('stab', 'Accuracy', 'acc', '', tab === 'acc')}${btn('stab', 'History', 'hist', '', tab === 'hist')}${btn('stab', 'Multiplayer', 'multi', '', tab === 'multi')}${btn('stab', 'Data', 'data', '', tab === 'data')}</div>`;
    if (tab === 'over') return h + viewOverview();
    if (tab === 'acc') return h + viewAccuracy();
    if (tab === 'data') return h + viewData();
    if (tab === 'multi') return h + viewMulti();
    return h + viewHistory();
  }

  function viewOverview() {
    const G = games(), L = lifetime(G), F = lifetime(G.slice(-5));
    let h = '';
    if (!G.length) h += `<div class="card empty">No games yet. Play a game against the bot – then you will see your average here.</div>`;
    else {
      const diff = F.avg - L.avg;
      h += `<div class="card bigavg"><small>Your average · from ${G.length} game${G.length > 1 ? 's' : ''}</small><div class="avgnum">${f1(L.avg)}</div>
        <div class="form">Form (last ${Math.min(5, G.length)}): <b>${f1(F.avg)}</b> <span class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '▲' : '▼'} ${f1(Math.abs(diff))}</span></div></div>`;
      h += `<div class="sumgrid">
        <div><b>${f1(L.f9)}</b><small>First 9 avg</small></div><div><b>${f1(L.coPct)} %</b><small>Checkout (${L.coHits}/${L.coAtt})</small></div><div><b>${L.wins}/${L.n}</b><small>Wins</small></div>
        <div><b>${L.hiCO || '–'}</b><small>Highest finish</small></div><div><b>${L.bestLeg || '–'}</b><small>Best leg (darts)</small></div><div><b>${L.best}</b><small>Highest visit</small></div>
        <div><b>${L.s100}</b><small>100+</small></div><div><b>${L.s140}</b><small>140+</small></div><div><b>${L.s180}</b><small>180s</small></div></div>`;
      let run = 0, rd = 0;
      const list = G.map(e => { if (e.P) { run += e.P.pts; rd += e.P.darts; } return Object.assign({}, e, { run: rd ? run / rd * 3 : e.avg }); });
      h += `<h2 class="sec">Progress</h2>` + chart(list, [{ n: 'Avg per game', c: '#ec4899', k: 'avg' }, { n: 'Overall average', c: '#a1a1aa', k: 'run' }], null, 'game no.');
    }
    // Trainings
    const modes = Object.keys(TM).filter(k => k !== 'game' && T.hist.some(e => e.mode === k));
    if (modes.length) {
      h += `<h2 class="sec">Training</h2><div class="trgrid">`;
      modes.forEach(k => {
        const O = DR[k] && DR[k].ov;
        const l = T.hist.filter(e => e.mode === k && (!O || !O.only || O.only(e))), last5 = l.slice(-5);
        if (!l.length) return;
        const val = O ? O.val : e => k === 'score' ? e.avg : e.rate;
        const avg = last5.reduce((a, e) => a + val(e), 0) / last5.length, best = (O && O.low ? Math.min : Math.max)(...l.map(val));
        const u = O ? O.unit : k === 'score' ? '' : ' %';
        const w = O ? O.bar(avg) : k === 'score' ? avg / 1.2 : avg;
        h += `<div class="trc"><small>${TM[k]}</small><b>${f1(avg)}${u}</b><span>avg last ${last5.length} · best ${f1(best)}${u} · ${l.length}×${trainTrend(l, val)}</span>${levelHint(k, l)}<i style="width:${Math.max(0, Math.min(100, w))}%"></i></div>`;
      });
      h += `</div>`;
    }
    h += viewDoubles();
    Object.values(DR).forEach(d => { if (d.extra) h += d.extra(T.hist, ctx); });
    return h;
  }

  // Treffer-Daten: [x, y, Feld, Rest davor, Checkout-Versuch, Ziel]
  const disp = l => /^\d+$/.test(l) ? 'S' + l : l;
  function inferAim(d) {
    const rb = d[3];
    if (d[4] === 1) { const r = route(rb, 1); return r ? dlabel(r[0].n, r[0].m) : null; }
    if (rb > 170) return 'T20';
    const r = route(rb, 3); return r ? dlabel(r[0].n, r[0].m) : 'T20';
  }
  function allDots() {
    return games().filter(e => e.dots).flatMap(e => e.dots.map(d => ({ x: d[0], y: d[1], l: d[2], aim: d[5] !== undefined ? d[5] : inferAim(d) })));
  }
  function parseLab(l) {
    if (l === 'Bull') return { n: 25, m: 2 }; if (l === '25') return { n: 25, m: 1 };
    const m = l[0] === 'T' ? 3 : l[0] === 'D' ? 2 : 1; return { n: +(m === 1 ? l : l.slice(1)), m };
  }
  function hl(r1, r2, a1, a2) {
    const [x1, y1] = pt(r2, a1), [x2, y2] = pt(r2, a2), [x3, y3] = pt(r1, a2), [x4, y4] = pt(r1, a1);
    return `<path d="M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z" fill="rgba(34,211,238,.18)" stroke="#22d3ee" stroke-width="2.5"/>`;
  }
  function targetShape(l) {
    const { n, m } = parseLab(l);
    if (n === 25) return m === 2 ? `<circle r="6.35" fill="rgba(34,211,238,.3)" stroke="#22d3ee" stroke-width="2.5"/>` : `<circle r="15.9" fill="rgba(34,211,238,.15)" stroke="#22d3ee" stroke-width="2.5"/>`;
    const i = ORDER.indexOf(n), a1 = i * 18 - 9, a2 = i * 18 + 9;
    return m === 3 ? hl(99, 107, a1, a2) : m === 2 ? hl(162, 170, a1, a2) : hl(15.9, 99, a1, a2) + hl(107, 162, a1, a2);
  }
  function tendency(ds, l) {
    const { n, m } = parseLab(l), N = ds.length;
    const mx = ds.reduce((a, d) => a + d.x, 0) / N, my = ds.reduce((a, d) => a + d.y, 0) / N;
    const rms = Math.sqrt(ds.reduce((a, d) => a + (d.x - mx) ** 2 + (d.y - my) ** 2, 0) / N);
    let txt = [];
    if (n === 25) {
      if (Math.abs(mx) > 2) txt.push(`${f1(Math.abs(mx))} mm too far ${mx < 0 ? 'left' : 'right'}`);
      if (Math.abs(my) > 2) txt.push(`${f1(Math.abs(my))} mm too ${my < 0 ? 'low' : 'high'}`);
    } else {
      const i = ORDER.indexOf(n), rt = m === 3 ? 103 : m === 2 ? 166 : 134;
      const rm = Math.hypot(mx, my), cwm = Math.atan2(mx, my) * 180 / Math.PI;
      let da = ((cwm - i * 18 + 540) % 360) - 180; const tang = rm * da * Math.PI / 180;
      if (m !== 1 && Math.abs(rm - rt) > 2) txt.push(`${f1(Math.abs(rm - rt))} mm too far ${rm > rt ? 'out' : 'in'}`);
      if (Math.abs(tang) > 2) txt.push(`${f1(Math.abs(tang))} mm towards ${ORDER[(i + (tang > 0 ? 1 : 19)) % 20]}`);
    }
    return { mean: { x: mx.toFixed(1), y: my.toFixed(1), r: Math.max(4, rms).toFixed(1) }, rms, txt: txt.length ? txt.join(', ') : 'very central – hardly any deviation' };
  }

  function viewAccuracy() {
    const D = allDots().filter(d => d.aim);
    if (!D.length) return `<div class="card empty">No dart data yet. Play a game against the bot and tap your hits on the board – then you will see where your darts land.</div>`;
    const cnt = {}; D.forEach(d => { cnt[d.aim] = (cnt[d.aim] || 0) + 1; });
    const targets = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
    const sel = T.tgt === '__all' ? '__all' : (T.tgt && cnt[T.tgt] ? T.tgt : targets[0]);
    const rate = t => D.filter(d => d.aim === t && d.l === t).length / cnt[t] * 100;
    let h = `<div class="card"><div class="setlabel">Choose target</div><div class="tchips">${btn('tgt', 'All darts', '__all', 'all', sel === '__all')}`;
    targets.slice(0, 16).forEach(t => { const r = rate(t); h += btn('tgt', `${disp(t)}<small class="${r >= 40 ? 'gw' : r >= 20 ? 'mid' : 'gl'}">${Math.round(r)} %</small>`, t, '', sel === t); });
    h += `</div>`;
    if (sel === '__all') {
      const dots = D.map(d => ({ x: d.x, y: d.y, c: '#facc15', o: .55, r: 3.5, s: '#000', sw: .4 }));
      h += `<div class="boardwrap">${boardSVG({ dots })}</div><div class="live">${D.length} darts – each dot is a throw you entered.</div>`;
      const lc = {}; D.forEach(d => { lc[d.l] = (lc[d.l] || 0) + 1; });
      h += fieldTable(lc, D.length, 'Where you hit most') + `</div>`;
      return h + targetList(targets, cnt, rate);
    }
    const ds = D.filter(d => d.aim === sel), N = ds.length, { n } = parseLab(sel);
    const hits = ds.filter(d => d.l === sel).length;
    const num = ds.filter(d => d.l !== 'Miss' && parseLab(d.l).n === n).length;
    const tdc = tendency(ds, sel);
    const dots = ds.map(d => ({ x: d.x, y: d.y, c: d.l === sel ? '#22c55e' : (d.l !== 'Miss' && parseLab(d.l).n === n) ? '#facc15' : '#ef4444', o: .85, r: 4, s: '#000', sw: .5 }));
    h += `<div class="boardwrap">${boardSVG({ dots, mean: tdc.mean, extra: targetShape(sel) })}</div>`;
    h += `<div class="legend2"><span style="--c:#22c55e">${disp(sel)} hit</span><span style="--c:#facc15">right number</span><span style="--c:#ef4444">miss</span></div>`;
    h += `<div class="sumgrid"><div><b>${N}</b><small>darts at ${disp(sel)}</small></div><div><b class="${hits / N >= .4 ? 'gw' : hits / N >= .2 ? '' : 'gl'}">${f1(hits / N * 100)} %</b><small>hit rate</small></div><div><b>${f1(num / N * 100)} %</b><small>right number</small></div></div>`;
    const miss = {}; ds.filter(d => d.l !== sel).forEach(d => { miss[d.l] = (miss[d.l] || 0) + 1; });
    const topMiss = Object.entries(miss).sort((a, b) => b[1] - a[1])[0];
    let tip = `<b>Tendency:</b> ${tdc.txt}. Spread ${f1(tdc.rms)} mm.`;
    if (topMiss) tip += `<br><b>Most common miss:</b> ${disp(topMiss[0])} (${f1(topMiss[1] / N * 100)} %).`;
    if (sel[0] === 'D' && hits / N < .25 && N >= 5) tip += `<br>👉 You are under 25 % on ${disp(sel)}. Practise it in doubles training.`;
    h += `<div class="hint">${tip}</div>`;
    h += fieldTable(miss, N, 'Where your misses go') + `</div>`;
    return h + targetList(targets, cnt, rate);
  }
  function fieldTable(c, N, title) {
    const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!top.length) return '';
    return `<div class="setlabel">${title}</div><div class="bars">${top.map(([l, k]) => `<div class="br"><span>${disp(l)}</span><i><em style="width:${k / N * 100}%"></em></i><b>${f1(k / N * 100)} %</b></div>`).join('')}</div>`;
  }
  function targetList(targets, cnt, rate) {
    let h = `<h2 class="sec">All targets</h2><div class="card"><div class="bars">`;
    targets.forEach(t => { const r = rate(t); h += `<div class="br clk" data-a="tgt" data-v="${t}"><span>${disp(t)}</span><i><em class="${r >= 40 ? 'g' : r >= 20 ? 'y' : 'r'}" style="width:${r}%"></em></i><b>${Math.round(r)} %</b><small>${cnt[t]}×</small></div>`; });
    return h + `</div><div class="boardhint">Target = your checkout route, otherwise T20. Hit = exactly this field.</div></div>`;
  }

  function viewHistory() {
    let h = `<div class="chipsel">${btn('filter', 'All', 'all', '', T.filter === 'all')}`;
    Object.entries(TM).forEach(([k, v]) => { h += btn('filter', v, k, '', T.filter === k); });
    h += `</div>`;
    const list = T.hist.map((e, i) => Object.assign({ i }, e)).filter(e => T.filter === 'all' || e.mode === T.filter);
    if (!list.length) return h + `<div class="card empty">No entries yet${T.filter !== 'all' ? ' for ' + TM[T.filter] : ''}.</div>`;
    if (T.filter !== 'all') { const cl = DR[T.filter] && DR[T.filter].list ? DR[T.filter].list(list) : list; if (cl.length) h += chart(cl); }
    if (T.filter === 'game') h += `<div class="boardhint">Tap a game for the full stats</div>`;
    h += `<div class="card tablecard"><table><tr><th>Date</th><th>Mode</th><th>Level</th><th>Result</th><th></th></tr>`;
    list.slice().reverse().forEach(e => {
      const d = new Date(e.date), m = metric(e);
      const ds = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) + '<br><small>' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '</small>';
      const ex = e.mode === 'game' && e.P;
      h += `<tr${ex ? ` data-a="exp" data-v="${e.i}" class="clk"` : ''}><td>${ds}</td><td>${TM[e.mode]}${ex ? ' ▾' : ''}</td><td>${e.level + 1}</td><td><b class="${e.mode === 'game' ? (e.won ? 'gw' : 'gl') : 'gw'}">${m.main}</b><br><small>${m.det}</small></td><td>${btn('del', '×', e.i, 'del')}</td></tr>`;
      if (ex && T.exp === e.i) h += `<tr><td colspan="5">${cmpTable(e.P, e.B)}</td></tr>`;
    });
    return h + `</table></div>`;
  }

