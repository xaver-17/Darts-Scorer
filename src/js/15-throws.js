// Wurf-Datenbank: jede Session (Spiel oder Training) mit allen einzelnen Pfeilen.
// Gespeichert in IndexedDB 'darts-scorer' (Tabellen 'sessions' und 'throws'), ohne IndexedDB im localStorage 'dartsStatsDb'.
// Aufbau der Datensätze: docs/DATENMODELL.md. T.hist und 'dartsX01' bleiben unverändert erhalten.
  const TS = (function () {
    const DBN = 'darts-scorer', FB = 'dartsStatsDb';
    const S = new Map(), W = new Map();      // S: id -> Session, W: id -> Liste der Würfe
    let db = null, kind = 'mem', loaded = false;
    const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    function openDb() {
      return new Promise(res => {
        let rq; try { if (!window.indexedDB) return res(null); rq = indexedDB.open(DBN, 1); } catch (e) { return res(null); }
        rq.onupgradeneeded = () => {
          const d = rq.result;
          if (!d.objectStoreNames.contains('sessions')) d.createObjectStore('sessions', { keyPath: 'id' }).createIndex('startedAt', 'startedAt');
          if (!d.objectStoreNames.contains('throws')) d.createObjectStore('throws', { keyPath: 'sid' });
        };
        rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); rq.onblocked = () => res(null);
      });
    }
    function saveFallback() { try { localStorage.setItem(FB, JSON.stringify(dump())); } catch (e) {} }
    function tx(stores, fn) {
      if (!db) { saveFallback(); return Promise.resolve(); }
      return new Promise(res => {
        let t; try { t = db.transaction(stores, 'readwrite'); } catch (e) { return res(); }
        fn(t); t.oncomplete = () => res(); t.onerror = t.onabort = () => res();
      });
    }
    const ready = (async () => {
      db = await openDb();
      if (db) {
        try {
          const t = db.transaction(['sessions', 'throws']);
          const [ss, ws] = await Promise.all([req(t.objectStore('sessions').getAll()), req(t.objectStore('throws').getAll())]);
          ss.forEach(s => S.set(s.id, s)); ws.forEach(w => W.set(w.sid, w.list));
          kind = 'idb';
        } catch (e) { db = null; }
      }
      if (!db) {
        kind = 'ls';
        try { const d = JSON.parse(localStorage.getItem(FB) || 'null'); if (d) load(d); } catch (e) {}
      }
      loaded = true;
    })();
    function load(d) {
      (d.sessions || []).forEach(s => S.set(s.id, s));
      (d.throws || []).forEach(w => W.set(w.sid, w.list));
    }
    function dump() { return { sessions: [...S.values()], throws: [...W.entries()].map(([sid, list]) => ({ sid, list })) }; }
    function put(s, list) {
      S.set(s.id, s); if (list) W.set(s.id, list);
      return ready.then(() => tx(['sessions', 'throws'], t => { t.objectStore('sessions').put(s); if (list) t.objectStore('throws').put({ sid: s.id, list }); }));
    }
    function remove(id) {
      S.delete(id); W.delete(id);
      return ready.then(() => tx(['sessions', 'throws'], t => { t.objectStore('sessions').delete(id); t.objectStore('throws').delete(id); }));
    }
    async function clear() {
      await ready; S.clear(); W.clear(); try { localStorage.removeItem(FB); } catch (e) {}
      return db ? tx(['sessions', 'throws'], t => { t.objectStore('sessions').clear(); t.objectStore('throws').clear(); }) : Promise.resolve();
    }
    async function restore(d) {
      await clear(); load(d || {});
      if (!db) { saveFallback(); return; }
      await tx(['sessions', 'throws'], t => {
        S.forEach(s => t.objectStore('sessions').put(s));
        W.forEach((list, sid) => t.objectStore('throws').put({ sid, list }));
      });
    }
    return {
      ready, put, remove, clear, restore, dump,
      get loaded() { return loaded; }, get kind() { return kind; },
      session: id => S.get(id), throws: id => W.get(id) || [], has: id => S.has(id),
      sessions: () => [...S.values()].sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1))
    };
  })();

  // ---------- Hilfen für Sessions und Würfe ----------
  const STATS_V = 1;
  const nowIso = () => new Date().toISOString();
  const sidOf = e => e.sid || (e.mode === 'game' ? 'g_' : 't_' + e.mode + '_') + e.date;
  // Ein Wurf-Datensatz; Felder mit null/undefined werden weggelassen, damit die Datenbank klein bleibt
  function mkThrow(o) {
    const w = {}; Object.keys(o).forEach(k => { if (o[k] !== null && o[k] !== undefined) w[k] = o[k]; });
    if (w.t === undefined) w.t = Date.now();
    return w;
  }
  // Doppel-Chance: Rest lässt sich mit einem Pfeil beenden (Double-Out: Doppel/Bull, Single-Out: jedes Feld)
  const dblChance = (rem, out) => out === 'single' ? DARTS.some(d => d.v === rem) : !!(ROUTES[rem] && ROUTES[rem][1]);

  // Kennzahlen je Spieler aus den Würfen (siehe docs/DATENMODELL.md, Statistik-Definitionen)
  function totalsFrom(list, nPlayers) {
    const out = [];
    for (let who = 0; who < nPlayers; who++) {
      const ds = list.filter(w => (w.who || 0) === who && w.leg !== undefined);
      const vis = new Map();
      ds.forEach(w => { const k = w.leg + '/' + w.visit; if (!vis.has(k)) vis.set(k, []); vis.get(k).push(w); });
      let pts = 0, best = 0, hiCO = 0, s100 = 0, s140 = 0, s180 = 0;
      vis.forEach(v => {
        const bust = v.some(w => w.flag === 'bust');
        const sc = bust ? 0 : v.reduce((a, w) => a + (w.flag === 'noin' ? 0 : w.pts || 0), 0);
        pts += sc; best = Math.max(best, sc);
        if (sc === 180) s180++; else if (sc >= 140) s140++; else if (sc >= 100) s100++;
        if (v.some(w => w.flag === 'out')) hiCO = Math.max(hiCO, v[0].rem || 0);
      });
      const coAtt = ds.filter(w => w.dbl).length, coHits = ds.filter(w => w.flag === 'out').length;
      out.push({ darts: ds.length, pts, avg: ds.length ? pts / ds.length * 3 : 0, best, hiCO, s100, s140, s180, coAtt, coHits, coPct: coAtt ? coHits / coAtt * 100 : 0 });
    }
    return out;
  }

  // ---------- Übernahme vorhandener Daten (verlustfrei, Originale bleiben stehen) ----------
  function legacyGame(e) {
    // Feld aus dem gespeicherten Label (nicht neu aus x/y berechnet, damit nichts vom Original abweicht)
    const lab = l => l === 'Miss' || !l ? { n: 0, m: 0 } : l === 'Bull' ? { n: 25, m: 2 } : l === '25' ? { n: 25, m: 1 }
      : l[0] === 'T' ? { n: +l.slice(1), m: 3 } : l[0] === 'D' ? { n: +l.slice(1), m: 2 } : { n: +l, m: 1 };
    const list = (e.dots || []).map(d => {
      const h = lab(d[2]);
      return mkThrow({ who: 0, n: h.n, m: h.m, pts: h.n * h.m, x: d[0], y: d[1], rem: d[3], dbl: d[4] ? 1 : null, aim: d[5], t: 0 });
    });
    const tot = e.P && e.B ? [e.P, e.B] : null;
    return [{ id: sidOf(e), v: STATS_V, kind: 'game', mode: 'x01bot', level: e.level,
      players: [{ name: 'Du', me: true }, { name: 'Bot ' + (BOT[e.level] ? BOT[e.level].n : ''), bot: e.level }],
      cfg: { start: e.start, din: !!e.din, out: 'double' }, startedAt: e.date, endedAt: null,
      result: { winner: e.won ? 0 : 1, legs: [e.lp, e.lb] }, totals: tot, legacy: true }, list];
  }
  function legacyTraining(e) {
    const r = Object.assign({}, e); delete r.date; delete r.mode; delete r.level;
    return [{ id: sidOf(e), v: STATS_V, kind: 'training', mode: e.mode, level: e.level, players: [{ name: 'Du', me: true }],
      cfg: {}, startedAt: e.date, endedAt: null, result: r, legacy: true }, []];
  }
  function x01Session(e, list) {
    const names = e.players.map(p => p.name);
    return { id: e.sid || 'x_' + e.date, v: STATS_V, kind: 'game', mode: 'x01multi', level: null,
      players: names.map(n => ({ name: n })), cfg: { start: e.start, out: e.out, legsTo: e.legsTo },
      startedAt: e.date, endedAt: e.end || null,
      result: { winner: Math.max(0, names.indexOf(e.winner)), legs: e.players.map(p => p.legs) },
      totals: list && list.length ? totalsFrom(list, names.length) : e.players.map(p => ({ darts: p.darts, pts: p.pts, avg: p.avg, best: p.best, s180: p.s180, hiCO: p.hiCO })),
      legacy: !(list && list.length) };
  }
  // Läuft bei jedem Start: legt für jeden Eintrag ohne Session eine an (auch nach Import einer alten Sicherung)
  function syncLegacy() {
    T.hist.forEach(e => { if (!TS.has(sidOf(e))) { const [s, l] = e.mode === 'game' ? legacyGame(e) : legacyTraining(e); TS.put(s, l); } });
    const X = window.X01 && X01.history ? X01.history() : [];
    X.forEach(e => { const id = e.sid || 'x_' + e.date; if (!TS.has(id)) TS.put(x01Session(e, null), []); });
  }
  TS.ready.then(() => { syncLegacy(); if (T.route === 'stats') render(); });

  // X01-Mehrspieler meldet fertige Spiele mit allen Würfen (siehe src/modules/x01.js)
  window.DartsStats = {
    x01Done(e, list) { TS.put(x01Session(e, list), list); },
    x01Undo(e) { TS.remove(e.sid || 'x_' + e.date); }
  };
