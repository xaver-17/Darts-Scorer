// Ansichten: Stats-Seite (Übersicht, Trefferquote, Verlauf)
  // ---------- Stats-Seite ----------
  function viewStatsPage() {
    const tab = T.stab || 'over';
    let h = phead('Meine Stats', 'Alles aus deinen Spielen und Trainings');
    h += `<div class="segtabs">${btn('stab', 'Übersicht', 'over', '', tab === 'over')}${btn('stab', 'Trefferquote', 'acc', '', tab === 'acc')}${btn('stab', 'Verlauf', 'hist', '', tab === 'hist')}${btn('stab', 'Daten', 'data', '', tab === 'data')}</div>`;
    if (tab === 'over') return h + viewOverview();
    if (tab === 'acc') return h + viewAccuracy();
    if (tab === 'data') return h + viewData();
    return h + viewHistory();
  }

  function viewOverview() {
    const G = games(), L = lifetime(G), F = lifetime(G.slice(-5));
    let h = '';
    if (!G.length) h += `<div class="card empty">Noch keine Spiele. Spiel ein Spiel gegen den Bot – dann siehst du hier deinen Average.</div>`;
    else {
      const diff = F.avg - L.avg;
      h += `<div class="card bigavg"><small>Dein Average · aus ${G.length} Spiel${G.length > 1 ? 'en' : ''}</small><div class="avgnum">${f1(L.avg)}</div>
        <div class="form">Form (letzte ${Math.min(5, G.length)}): <b>${f1(F.avg)}</b> <span class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '▲' : '▼'} ${f1(Math.abs(diff))}</span></div></div>`;
      h += `<div class="sumgrid">
        <div><b>${f1(L.f9)}</b><small>Ø erste 9</small></div><div><b>${f1(L.coPct)} %</b><small>Checkout (${L.coHits}/${L.coAtt})</small></div><div><b>${L.wins}/${L.n}</b><small>Siege</small></div>
        <div><b>${L.hiCO || '–'}</b><small>Höchstes Finish</small></div><div><b>${L.bestLeg || '–'}</b><small>Bestes Leg (Darts)</small></div><div><b>${L.best}</b><small>Höchste Aufnahme</small></div>
        <div><b>${L.s100}</b><small>100+</small></div><div><b>${L.s140}</b><small>140+</small></div><div><b>${L.s180}</b><small>180er</small></div></div>`;
      let run = 0, rd = 0;
      const list = G.map(e => { if (e.P) { run += e.P.pts; rd += e.P.darts; } return Object.assign({}, e, { run: rd ? run / rd * 3 : e.avg }); });
      h += `<h2 class="sec">Entwicklung</h2>` + chart(list, [{ n: 'Ø pro Spiel', c: '#111', k: 'avg' }, { n: 'Gesamt-Average', c: '#2563eb', k: 'run' }], null, 'Spiel Nr.');
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
        h += `<div class="trc"><small>${TM[k]}</small><b>${f1(avg)}${u}</b><span>Ø letzte ${last5.length} · Best ${f1(best)}${u} · ${l.length}×</span><i style="width:${Math.max(0, Math.min(100, w))}%"></i></div>`;
      });
      h += `</div>`;
    }
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
      if (Math.abs(mx) > 2) txt.push(`${f1(Math.abs(mx))} mm zu weit ${mx < 0 ? 'links' : 'rechts'}`);
      if (Math.abs(my) > 2) txt.push(`${f1(Math.abs(my))} mm zu ${my < 0 ? 'tief' : 'hoch'}`);
    } else {
      const i = ORDER.indexOf(n), rt = m === 3 ? 103 : m === 2 ? 166 : 134;
      const rm = Math.hypot(mx, my), cwm = Math.atan2(mx, my) * 180 / Math.PI;
      let da = ((cwm - i * 18 + 540) % 360) - 180; const tang = rm * da * Math.PI / 180;
      if (m !== 1 && Math.abs(rm - rt) > 2) txt.push(`${f1(Math.abs(rm - rt))} mm zu weit ${rm > rt ? 'außen' : 'innen'}`);
      if (Math.abs(tang) > 2) txt.push(`${f1(Math.abs(tang))} mm Richtung ${ORDER[(i + (tang > 0 ? 1 : 19)) % 20]}`);
    }
    return { mean: { x: mx.toFixed(1), y: my.toFixed(1), r: Math.max(4, rms).toFixed(1) }, rms, txt: txt.length ? txt.join(', ') : 'sehr zentral – kaum Abweichung' };
  }

  function viewAccuracy() {
    const D = allDots().filter(d => d.aim);
    if (!D.length) return `<div class="card empty">Noch keine Pfeil-Daten. Spiel ein Spiel gegen den Bot und tipp deine Treffer auf der Scheibe an – dann siehst du hier, wo du hinwirfst.</div>`;
    const cnt = {}; D.forEach(d => { cnt[d.aim] = (cnt[d.aim] || 0) + 1; });
    const targets = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
    const sel = T.tgt === '__all' ? '__all' : (T.tgt && cnt[T.tgt] ? T.tgt : targets[0]);
    const rate = t => D.filter(d => d.aim === t && d.l === t).length / cnt[t] * 100;
    let h = `<div class="card"><div class="setlabel">Ziel wählen</div><div class="tchips">${btn('tgt', 'Alle Pfeile', '__all', 'all', sel === '__all')}`;
    targets.slice(0, 16).forEach(t => { const r = rate(t); h += btn('tgt', `${disp(t)}<small class="${r >= 40 ? 'gw' : r >= 20 ? 'mid' : 'gl'}">${Math.round(r)} %</small>`, t, '', sel === t); });
    h += `</div>`;
    if (sel === '__all') {
      const dots = D.map(d => ({ x: d.x, y: d.y, c: '#facc15', o: .55, r: 3.5, s: '#000', sw: .4 }));
      h += `<div class="boardwrap">${boardSVG({ dots })}</div><div class="live">${D.length} Pfeile – jeder Punkt ist ein Wurf, den du eingetragen hast.</div>`;
      const lc = {}; D.forEach(d => { lc[d.l] = (lc[d.l] || 0) + 1; });
      h += fieldTable(lc, D.length, 'Wo du am meisten hintriffst') + `</div>`;
      return h + targetList(targets, cnt, rate);
    }
    const ds = D.filter(d => d.aim === sel), N = ds.length, { n } = parseLab(sel);
    const hits = ds.filter(d => d.l === sel).length;
    const num = ds.filter(d => d.l !== 'Miss' && parseLab(d.l).n === n).length;
    const tdc = tendency(ds, sel);
    const dots = ds.map(d => ({ x: d.x, y: d.y, c: d.l === sel ? '#22c55e' : (d.l !== 'Miss' && parseLab(d.l).n === n) ? '#facc15' : '#ef4444', o: .85, r: 4, s: '#000', sw: .5 }));
    h += `<div class="boardwrap">${boardSVG({ dots, mean: tdc.mean, extra: targetShape(sel) })}</div>`;
    h += `<div class="legend2"><span style="--c:#22c55e">${disp(sel)} getroffen</span><span style="--c:#facc15">richtige Zahl</span><span style="--c:#ef4444">daneben</span></div>`;
    h += `<div class="sumgrid"><div><b>${N}</b><small>Würfe auf ${disp(sel)}</small></div><div><b class="${hits / N >= .4 ? 'gw' : hits / N >= .2 ? '' : 'gl'}">${f1(hits / N * 100)} %</b><small>Trefferquote</small></div><div><b>${f1(num / N * 100)} %</b><small>richtige Zahl</small></div></div>`;
    const miss = {}; ds.filter(d => d.l !== sel).forEach(d => { miss[d.l] = (miss[d.l] || 0) + 1; });
    const topMiss = Object.entries(miss).sort((a, b) => b[1] - a[1])[0];
    let tip = `<b>Tendenz:</b> ${tdc.txt}. Streuung ${f1(tdc.rms)} mm.`;
    if (topMiss) tip += `<br><b>Häufigster Fehlwurf:</b> ${disp(topMiss[0])} (${f1(topMiss[1] / N * 100)} %).`;
    if (sel[0] === 'D' && hits / N < .25 && N >= 5) tip += `<br>👉 Auf ${disp(sel)} liegst du unter 25 %. Übe ihn gezielt im Doppel-Training.`;
    h += `<div class="hint">${tip}</div>`;
    h += fieldTable(miss, N, 'Wohin deine Fehlwürfe gehen') + `</div>`;
    return h + targetList(targets, cnt, rate);
  }
  function fieldTable(c, N, title) {
    const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!top.length) return '';
    return `<div class="setlabel">${title}</div><div class="bars">${top.map(([l, k]) => `<div class="br"><span>${disp(l)}</span><i><em style="width:${k / N * 100}%"></em></i><b>${f1(k / N * 100)} %</b></div>`).join('')}</div>`;
  }
  function targetList(targets, cnt, rate) {
    let h = `<h2 class="sec">Alle Ziele</h2><div class="card"><div class="bars">`;
    targets.forEach(t => { const r = rate(t); h += `<div class="br clk" data-a="tgt" data-v="${t}"><span>${disp(t)}</span><i><em class="${r >= 40 ? 'g' : r >= 20 ? 'y' : 'r'}" style="width:${r}%"></em></i><b>${Math.round(r)} %</b><small>${cnt[t]}×</small></div>`; });
    return h + `</div><div class="boardhint">Ziel = dein Checkout-Weg, sonst T20. Treffer = genau dieses Feld.</div></div>`;
  }

  function viewHistory() {
    let h = `<div class="chipsel">${btn('filter', 'Alle', 'all', '', T.filter === 'all')}`;
    Object.entries(TM).forEach(([k, v]) => { h += btn('filter', v, k, '', T.filter === k); });
    h += `</div>`;
    const list = T.hist.map((e, i) => Object.assign({ i }, e)).filter(e => T.filter === 'all' || e.mode === T.filter);
    if (!list.length) return h + `<div class="card empty">Noch keine Einträge${T.filter !== 'all' ? ' für ' + TM[T.filter] : ''}.</div>`;
    if (T.filter !== 'all') { const cl = DR[T.filter] && DR[T.filter].list ? DR[T.filter].list(list) : list; if (cl.length) h += chart(cl); }
    if (T.filter === 'game') h += `<div class="boardhint">Tippe auf ein Spiel für die komplette Statistik</div>`;
    h += `<div class="card tablecard"><table><tr><th>Datum</th><th>Modus</th><th>Stufe</th><th>Ergebnis</th><th></th></tr>`;
    list.slice().reverse().forEach(e => {
      const d = new Date(e.date), m = metric(e);
      const ds = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + '<br><small>' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + '</small>';
      const ex = e.mode === 'game' && e.P;
      h += `<tr${ex ? ` data-a="exp" data-v="${e.i}" class="clk"` : ''}><td>${ds}</td><td>${TM[e.mode]}${ex ? ' ▾' : ''}</td><td>${e.level + 1}</td><td><b class="${e.mode === 'game' ? (e.won ? 'gw' : 'gl') : 'gw'}">${m.main}</b><br><small>${m.det}</small></td><td>${btn('del', '×', e.i, 'del')}</td></tr>`;
      if (ex && T.exp === e.i) h += `<tr><td colspan="5">${cmpTable(e.P, e.B)}</td></tr>`;
    });
    return h + `</table></div>`;
  }

