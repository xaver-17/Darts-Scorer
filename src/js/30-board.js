// Dartscheibe: SVG zeichnen, Tippen auswerten
  // ---------- Dartscheibe ----------
  const pt = (r, a) => [(r * Math.sin(a * Math.PI / 180)).toFixed(2), (-r * Math.cos(a * Math.PI / 180)).toFixed(2)];
  function sector(r1, r2, a1, a2, fill) {
    const [x1, y1] = pt(r2, a1), [x2, y2] = pt(r2, a2), [x3, y3] = pt(r1, a2), [x4, y4] = pt(r1, a1);
    return `<path d="M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z" fill="${fill}" stroke="#94a3b8" stroke-width=".5"/>`;
  }
  let BOARD_BASE = '';
  (function () {
    let s = `<circle r="198" fill="#0b1220"/><circle r="172" fill="#111"/>`;
    ORDER.forEach((n, i) => {
      const a1 = i * 18 - 9, a2 = i * 18 + 9, dark = i % 2 === 0;
      const sg = dark ? '#111111' : '#f5f5f5', rg = dark ? '#ec4899' : '#f9a8d4';
      s += sector(15.9, 99, a1, a2, sg) + sector(99, 107, a1, a2, rg) + sector(107, 162, a1, a2, sg) + sector(162, 170, a1, a2, rg);
      const [tx, ty] = pt(185, i * 18);
      s += `<text x="${tx}" y="${(+ty + 6).toFixed(1)}" fill="#e2e8f0" font-size="17" font-weight="700" text-anchor="middle">${n}</text>`;
    });
    s += `<circle r="15.9" fill="#f9a8d4" stroke="#94a3b8" stroke-width=".5"/><circle r="6.35" fill="#db2777" stroke="#94a3b8" stroke-width=".5"/>`;
    BOARD_BASE = s;
  })();
  // dots: [{x,y,c,r,o,t}] in mm (y nach oben)
  function boardSVG(o) {
    const vb = o.zoom ? `${(o.zoom.x - 50).toFixed(1)} ${(o.zoom.y - 50).toFixed(1)} 100 100` : '-200 -200 400 400';
    const k = o.zoom ? 0.3 : 1;
    let s = `<svg ${o.click ? 'data-board="1"' : ''} viewBox="${vb}" width="100%" style="display:block;touch-action:manipulation">${BOARD_BASE}${o.extra || ''}`;
    (o.dots || []).forEach(d => {
      s += `<circle cx="${d.x}" cy="${-d.y}" r="${(d.r || 4) * k}" fill="${d.c}" fill-opacity="${d.o || 1}" stroke="${d.s || '#000'}" stroke-width="${(d.sw || 1) * k}"/>`;
      if (d.t) s += `<text x="${d.x}" y="${(-d.y + 3.5 * k).toFixed(2)}" font-size="${10 * k}" font-weight="800" text-anchor="middle" fill="${d.tc || '#000'}">${d.t}</text>`;
    });
    if (o.mean) {
      const m = o.mean;
      s += `<circle cx="${m.x}" cy="${-m.y}" r="${m.r}" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="5 4"/>`;
      s += `<path d="M${m.x - 8} ${-m.y}h16M${m.x} ${-m.y - 8}v16" stroke="#38bdf8" stroke-width="3"/>`;
    }
    return s + `</svg>`;
  }
  function boardTap(e, svg) {
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM().inverse());
    if (T.set.zoom !== false && !T.zoom) { T.zoom = { x: q.x, y: q.y }; render(); return; }
    T.zoom = null;
    const x = Math.round(q.x * 10) / 10, y = Math.round(-q.y * 10) / 10;
    playerDart(Object.assign(scoreAt(x, y), { x, y }));
    render();
  }
  function buttonDart(n, m) {
    if (n === 0) { playerDart({ n: 0, m: 0, v: 0, l: 'Miss', x: null, y: null }); return; }
    let x, y;
    if (n === 25) { if (m === 2) { x = 0; y = 0; } else { x = 0; y = 11; } }
    else { [x, y] = aimPoint(n, m); x = Math.round(x * 10) / 10; y = Math.round(y * 10) / 10; }
    playerDart({ n, m, v: n * m, l: dlabel(n, m), x, y });
  }

