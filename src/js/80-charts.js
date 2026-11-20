// Statistik-Helfer: Kennzahl pro Eintrag, Liniendiagramm
  // ---------- Statistik ----------
  function metric(e) {
    if (DR[e.mode]) return DR[e.mode].metric(e, ctx);
    if (e.mode === 'game') return { main: (e.won ? 'Sieg ' : 'Niederl. ') + e.lp + ':' + e.lb, det: `${e.start} ${e.din ? 'DI' : 'SI'} · Bot ${BOT[e.level].n} · Ø ${f1(e.avg)} / ${f1(e.botAvg)}` };
    if (e.mode === 'score') return { main: 'Ø ' + f1(e.avg), det: `${f1(e.goalPct)} % ≥ ${e.goal} · Best ${e.best}` };
    return { main: f1(e.rate) + ' %', det: `${e.ok}/${e.n} · ${f1(e.hitPct)} % Treffer` };
  }
  function niceMax(v) { if (v <= 0) return 10; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p; return 10 * p; }
  function chart(list, ser, mx, xl) {
    let series = ser, max = mx;
    if (series) {}
    else if (DR[list[0].mode]) { series = DR[list[0].mode].series; max = DR[list[0].mode].max; }
    else if (list[0].mode === 'game') series = [{ n: 'Dein Ø', c: '#111', k: 'avg' }, { n: 'Bot Ø', c: '#a1a1aa', k: 'botAvg' }];
    else if (list[0].mode === 'score') series = [{ n: 'Ø pro Aufnahme', c: '#111', k: 'avg' }, { n: '% Ziel erreicht', c: '#2563eb', k: 'goalPct' }];
    else { series = [{ n: 'Erfolgsquote %', c: '#111', k: 'rate' }, { n: 'Trefferquote %', c: '#2563eb', k: 'hitPct' }]; max = 100; }
    max = max || niceMax(Math.max(...list.flatMap(e => series.map(s => e[s.k] || 0))));
    const W = 400, H = 220, L = 34, R = 12, Tp = 12, B = 24, pw = W - L - R, ph = H - Tp - B, n = list.length;
    const x = i => L + (n === 1 ? pw / 2 : i * pw / (n - 1)), y = v => Tp + ph - (v / max) * ph;
    let s = `<div class="chartbox"><div class="legend">${series.map(se => `<span style="--c:${se.c}">${se.n}</span>`).join('')}</div><svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block">`;
    for (let gi = 0; gi <= 4; gi++) { const v = max * gi / 4; s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#ececef"/><text x="${L - 5}" y="${y(v) + 4}" fill="#a1a1aa" font-size="11" text-anchor="end">${f1(v)}</text>`; }
    const every = Math.ceil(n / 10);
    list.forEach((e, i) => { if (i % every === 0 || i === n - 1) s += `<text x="${x(i)}" y="${H - 6}" fill="#a1a1aa" font-size="11" text-anchor="middle">${i + 1}</text>`; });
    series.forEach(se => {
      if (n > 1) s += `<polyline points="${list.map((e, i) => x(i).toFixed(1) + ',' + y(e[se.k] || 0).toFixed(1)).join(' ')}" fill="none" stroke="${se.c}" stroke-width="2" stroke-linejoin="round"/>`;
      list.forEach((e, i) => { s += `<circle cx="${x(i)}" cy="${y(e[se.k] || 0)}" r="4" fill="${se.c}" stroke="#fff" stroke-width="2"><title>${se.n}: ${f1(e[se.k] || 0)}</title></circle>`; });
    });
    return s + `</svg><div class="chartnote">${DR[list[0].mode] && DR[list[0].mode].ov.low && !ser ? 'Darts: weniger ist besser' : 'Je höher, desto besser'} · x-Achse = ${xl || 'Training Nr.'}</div></div>`;
  }

