// Konstanten, Zustand (T), Speichern, Hilfsfunktionen
  const KEY = 'dartsTrainer';
  const LV = ['Beginner', 'Easy', 'Medium', 'Advanced', 'Hard'];
  const BOT = [
    { n: 'Beginner', a: 25, s: 38 }, { n: 'Easy', a: 40, s: 23 }, { n: 'Medium', a: 55, s: 15.5 },
    { n: 'Advanced', a: 70, s: 11.5 }, { n: 'Pro', a: 90, s: 8 }
  ];
  const TM = { hit: 'Hitting', single: 'Singles', double: 'Doubles', triple: 'Trebles', checkout: 'Checkouts', score: 'Scoring', game: 'Game vs. bot' };
  const IMPOSSIBLE = [163, 166, 169, 172, 173, 175, 176, 178, 179];
  const R20 = Array.from({ length: 20 }, (_, i) => i + 1);
  const FAV_D = [20, 16, 10, 8], TOP_D = [20, 16, 18, 12, 10, 8, 4];
  const SCORE_GOAL = [30, 45, 60, 75, 90];
  const HIT = [
    [['A', 3], ['S', 4], ['D', 9]],
    [['A', 2], ['S', 3], ['T', 9], ['D', 6]],
    [['S', 2], ['T', 6], ['D', 4]],
    [['S', 2], ['T', 4], ['D', 3], ['B', 3]],
    [['S', 1], ['T', 3], ['D', 2], ['B', 2]]
  ];
  const ICON = {
    play: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
    train: '<svg viewBox="0 0 24 24"><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/></svg>',
    stats: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    counter: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h6M12 9v6M9 15h6"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>'
  };
  const LOGO = '<svg viewBox="-20 -20 40 40"><circle r="18.5" fill="#ec4899"/><circle r="13" fill="none" stroke="#fff" stroke-width="2"/><circle r="7" fill="none" stroke="#fff" stroke-width="2"/><circle r="2.4" fill="#fff"/></svg>';
  const BLOCKNAME = { A: 'Hit numbers', S: 'Singles', T: 'Trebles', D: 'Doubles', B: 'Bull' };

  let T = { set: { mode: 'hit', level: 0, tasks: 10, bot: 2, start: 501, din: false, legs: 1 },
            sess: null, game: null, hist: [], filter: 'all', input: '', summary: null, confirm: null, showRoute: false, route: 'home', stab: 'over', tgt: null };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) T = Object.assign(T, s, { confirm: null }); } catch (e) {}
  // Erweiterungen: neue Module tragen sich hier ein, statt zentrale Dateien zu ändern (siehe docs/ENTWICKLUNG.md)
  //   EXT.views[route]  = () => html         eigene Seite unter T.route === route
  //   EXT.actions[name] = (v, n) => {}        Klick auf data-a="name" (v = data-v als Text, n = als Zahl)
  //   EXT.nav.push({ route, label, icon })    Eintrag in der unteren Navigation (sparsam, Platz ist knapp)
  //   EXT.playLinks / EXT.trainLinks.push({ route, title, sub })   Kachel auf der Spielen- bzw. Training-Seite
  //   EXT.after[route] = container => {}     läuft nach jedem Rendern der Seite (z.B. eigenständiges Modul einhängen)
  //   EXT.panels[route] = { el, render }    eigenständiges Modul mit eigenem Container neben #viewTrainer (eigene Klick-Logik)
  //   EXT.dataKeys.push('meinKey')            eigener localStorage-Schlüssel, wird mit gesichert/gelöscht
  const EXT = { views: {}, after: {}, panels: {}, actions: {}, nav: [], playLinks: [], trainLinks: [], dataKeys: [] };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(T)); } catch (e) {} };

  const el = document.getElementById('viewTrainer');
  const f1 = x => (isFinite(x) ? x : 0).toLocaleString('en-GB', { maximumFractionDigits: 1 });
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const pickSeq = (pool, count) => { const out = []; let prev = null; for (let i = 0; i < count; i++) { let c, g = 0; do { c = rnd(pool); } while (pool.length > 1 && c === prev && g++ < 20); out.push(c); prev = c; } return out; };

