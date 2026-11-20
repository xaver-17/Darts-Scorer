// Dartscheibe: SVG zeichnen, Tippen auswerten
  // ---------- Dartscheibe ----------
  const pt = (r, a) => [(r * Math.sin(a * Math.PI / 180)).toFixed(2), (-r * Math.cos(a * Math.PI / 180)).toFixed(2)];
  function sector(r1, r2, a1, a2, fill) {
    const [x1, y1] = pt(r2, a1), [x2, y2] = pt(r2, a2), [x3, y3] = pt(r1, a2), [x4, y4] = pt(r1, a1);
    return `<path d="M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z" fill="${fill}" stroke="#3a3a3e" stroke-width=".5"/>`;
  }
  let BOARD_BASE = '';
  (function () {
    let s = `<circle r="198" fill="#0a0a0a"/><circle r="172" fill="#151515"/>`;
    ORDER.forEach((n, i) => {
      const a1 = i * 18 - 9, a2 = i * 18 + 9, dark = i % 2 === 0;
      const sg = dark ? '#141416' : '#2a2a30', rg = dark ? '#ff2d87' : '#f5f5f7';
      s += sector(15.9, 99, a1, a2, sg) + sector(99, 107, a1, a2, rg) + sector(107, 162, a1, a2, sg) + sector(162, 170, a1, a2, rg);
      const [tx, ty] = pt(185, i * 18);
      s += `<text x="${tx}" y="${(+ty + 6).toFixed(1)}" fill="#f4f4f5" font-size="17" font-weight="700" text-anchor="middle">${n}</text>`;
    });
    s += `<circle r="15.9" fill="#f5f5f7" stroke="#3a3a3e" stroke-width=".5"/><circle r="6.35" fill="#ff2d87" stroke="#3a3a3e" stroke-width=".5"/>`;
    BOARD_BASE = s;
  })();
  // „Daneben“-Ring rund um die Scheibe: Tipp dort = Fehlwurf (0). Tipp außerhalb = Zoom schließen, nichts eintragen.
  const MISS_R = 240;
  const MISS_RING = `<circle r="${MISS_R}" fill="#16161b" stroke="#3f3f46" stroke-width="1.5" stroke-dasharray="6 5"/>` +
    `<text y="${-(MISS_R - 26)}" fill="#71717a" font-size="15" font-weight="600" text-anchor="middle" letter-spacing="2">MISS</text>` +
    `<text y="${MISS_R - 14}" fill="#71717a" font-size="15" font-weight="600" text-anchor="middle" letter-spacing="2">MISS</text>`;
  // Gezoomt: ganz dezent die Feldnamen in jedem Feld, damit man nicht daneben tippt
  const ZOOM_LABELS = (function () {
    let s = '<g class="zl" fill="#fff" fill-opacity=".38" font-size="4.2" font-weight="700" text-anchor="middle" dominant-baseline="central">';
    ORDER.forEach((n, i) => {
      [[62, String(n)], [103, 'T' + n], [134, String(n)], [166, 'D' + n]].forEach(([r, t]) => {
        const [x, y] = pt(r, i * 18); s += `<text x="${x}" y="${y}">${t}</text>`;
      });
    });
    return s + '<text x="0" y="-11">25</text><text x="0" y="0">BULL</text><text x="0" y="203" font-size="5">MISS</text></g>';
  })();
  // Nur zoomen, wenn der Tipp mehrdeutig ist: Triple/Doppel/Bull oder nah an einer Ring- bzw. Feldgrenze
  const RINGS = [6.35, 15.9, 99, 107, 162, 170];
  function needsZoom(x, y) {
    const r = Math.hypot(x, y);
    if (r <= 15.9 + 6) return true;                                   // Bull-Bereich
    if ((r >= 99 && r <= 107) || (r >= 162 && r <= 170)) return true; // Triple- oder Doppelring
    if (RINGS.some(b => Math.abs(r - b) < 6)) return true;            // nah an einem Ring
    const deg = ((Math.atan2(x, y) * 180 / Math.PI) + 369) % 18;      // Abstand zur Feldgrenze
    const dTan = Math.min(deg, 18 - deg) * Math.PI / 180 * r;
    return dTan < 5;
  }
  // dots: [{x,y,c,r,o,t}] in mm (y nach oben)
  function boardSVG(o) {
    const R = o.click ? MISS_R + 6 : 200;   // Eingabe-Scheiben zeigen außen den „Daneben“-Ring
    const vb = o.zoom ? `${(o.zoom.x - 50).toFixed(1)} ${(o.zoom.y - 50).toFixed(1)} 100 100` : `${-R} ${-R} ${2 * R} ${2 * R}`;
    const k = o.zoom ? 0.3 : 1;
    let s = `<svg ${o.click ? 'data-board="1"' : ''} viewBox="${vb}" width="100%" class="${o.zoom ? 'bzoom' : ''}" style="display:block;touch-action:manipulation">${o.click ? MISS_RING : ''}${BOARD_BASE}${o.zoom ? ZOOM_LABELS : ''}${o.extra || ''}`;
    (o.dots || []).forEach(d => {
      s += `<circle cx="${d.x}" cy="${-d.y}" r="${(d.r || 4) * k}" fill="${d.c}" fill-opacity="${d.o || 1}" stroke="${d.s || '#000'}" stroke-width="${(d.sw || 1) * k}"/>`;
      if (d.t) s += `<text x="${d.x}" y="${(-d.y + 3.5 * k).toFixed(2)}" font-size="${10 * k}" font-weight="800" text-anchor="middle" fill="${d.tc || '#000'}">${d.t}</text>`;
    });
    if (o.mean) {
      const m = o.mean;
      s += `<circle cx="${m.x}" cy="${-m.y}" r="${m.r}" fill="none" stroke="#a3e635" stroke-width="2" stroke-dasharray="5 4"/>`;
      s += `<path d="M${m.x - 8} ${-m.y}h16M${m.x} ${-m.y - 8}v16" stroke="#a3e635" stroke-width="3"/>`;
    }
    return s + `</svg>`;
  }
  function boardTap(e, svg) {
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM().inverse());
    const r = Math.hypot(q.x, q.y);
    if (r > MISS_R) { if (T.zoom) { T.zoom = null; render(); } return; }   // außerhalb: nur Zoom schließen
    if (r <= 170 && T.set.zoom !== false && !T.zoom && needsZoom(q.x, -q.y)) { T.zoom = { x: q.x, y: q.y }; render(); return; }
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

