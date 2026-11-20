"""Prüft das neue Statistik-Datenmodell: Migration alter Daten, Würfe aus Bot-Spiel, X01-Mehrspieler, Training (Einzelpfeil), Export/Import."""
import functools, http.server, json, os, sys, threading, random, math
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
DIST = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'dist')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=DIST))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/index.html'
errs, ok = [], []
def check(n, c, info=''):
    (ok if c else errs).append(n); print(('OK   ' if c else 'FAIL ') + n, info if not c else '')
LEG_GAME = {'date': '2026-11-01T10:00:00.000Z', 'mode': 'game', 'level': 2, 'won': True, 'lp': 1, 'lb': 0, 'avg': 50.1, 'botAvg': 45, 'start': 501, 'din': False, 'best': 100, 'hiCO': 32,
  'P': {'avg': 50.1, 'f9': 55, 'darts': 30, 'pts': 501, 'coPct': 50, 'coHits': 1, 'coAtt': 2, 'hiCO': 32, 'best': 100, 'bestLeg': 30, 's40': 5, 's100': 1, 's120': 0, 's140': 0, 's180': 0},
  'B': {'avg': 45, 'darts': 27, 'pts': 400}, 'dots': [[0.5, 103.2, 'T20', 501, 0, 'T20'], [-170.1, 20.0, 'D11', 32, 1, 'D16'], [5, 166, 'D20', 40, 1, 'D20']]}
LEG_TR = {'date': '2026-11-02T10:00:00.000Z', 'mode': 'double', 'level': 0, 'planned': 10, 'n': 10, 'ok': 6, 'hits': 8, 'darts': 40, 'rate': 60, 'hitPct': 20}
LEG_X = {'type': 'x01', 'date': '2026-11-03T10:00:00.000Z', 'end': '2026-11-03T10:20:00.000Z', 'start': 501, 'out': 'double', 'legsTo': 1, 'winner': 'Anna',
  'players': [{'name': 'Anna', 'legs': 1, 'darts': 24, 'pts': 501, 'avg': 62.6, 'best': 140, 's180': 0, 'hiCO': 40}, {'name': 'Ben', 'legs': 0, 'darts': 24, 'pts': 380, 'avg': 47.5, 'best': 100, 's180': 0, 'hiCO': 0}]}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome')); ctx = b.new_context(viewport={'width': 400, 'height': 860}, accept_downloads=True, device_scale_factor=2)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
    pg.goto(URL)
    pg.evaluate("([a,b]) => { localStorage.clear(); localStorage.setItem('dartsTrainer', a); localStorage.setItem('dartsX01', b); }",
                [json.dumps({'hist': [LEG_GAME, LEG_TR]}), json.dumps({'hist': [LEG_X]})])
    orig = pg.evaluate("[localStorage.getItem('dartsTrainer'), localStorage.getItem('dartsX01')]")
    pg.reload(); pg.wait_for_timeout(800)
    dbq = """() => new Promise(r => { const q = indexedDB.open('darts-scorer'); q.onsuccess = () => { const t = q.result.transaction(['sessions','throws']);
      const a = t.objectStore('sessions').getAll(), w = t.objectStore('throws').getAll(); t.oncomplete = () => { r({s: a.result, w: w.result}); q.result.close(); }; }; })"""
    d = pg.evaluate(dbq)
    ids = sorted(s['id'] for s in d['s'])
    check('Migration: 3 Sessions angelegt', len(ids) == 3, ids)
    g = next((s for s in d['s'] if s['mode'] == 'x01bot'), None)
    gw = next((w['list'] for w in d['w'] if g and w['sid'] == g['id']), [])
    check('Migration: Bot-Spiel mit 3 Würfen und Feldern', len(gw) == 3 and gw[1]['n'] == 11 and gw[1]['m'] == 2 and gw[1].get('dbl') == 1, gw)
    check('Migration: Originaldaten unverändert', pg.evaluate("[localStorage.getItem('dartsTrainer'), localStorage.getItem('dartsX01')]")[1] == orig[1]
          and json.loads(pg.evaluate("localStorage.getItem('dartsTrainer')"))['hist'] == json.loads(orig[0])['hist'])
    pg.reload(); pg.wait_for_timeout(500)
    check('Migration läuft nur einmal', len(pg.evaluate(dbq)['s']) == 3)
    # X01 Mehrspieler: 2 Spieler, 301, Single-Out, über X01.act
    pg.evaluate("""() => { const a = X01.act; a('xStart', '301'); a('xOut', 'single'); a('xLegs', '1'); a('xGo');
      for (let i = 0; i < 200; i++) { const g = X01.state().game; if (!g || g.phase !== 'play') break; const p = g.players[g.cur];
        const rem = p.rem - g.visit.reduce((s, d) => s + d.v, 0);
        if (rem >= 60) { a('xMult', '3'); a('xDart', '20'); } else if (rem > 20) { a('xDart', '20'); } else a('xDart', String(rem)); } }""")
    pg.wait_for_timeout(400)
    d = pg.evaluate(dbq); xs = [s for s in d['s'] if s['mode'] == 'x01multi' and not s.get('legacy')]
    xw = next((w['list'] for w in d['w'] if xs and w['sid'] == xs[0]['id']), [])
    check('X01: Spiel mit Einzelwürfen gespeichert', len(xs) == 1 and len(xw) > 5 and any(w.get('flag') == 'out' for w in xw), (len(xs), len(xw)))
    check('X01: Kennzahlen aus Würfen', xs and xs[0]['totals'][0]['darts'] > 0 and xs[0]['totals'][0]['coAtt'] >= 1, xs and xs[0]['totals'])
    # Undo nach Spielende entfernt die Session wieder, erneutes Beenden legt sie wieder an
    pg.evaluate("() => { X01.act('xUndo'); }"); pg.wait_for_timeout(300)
    check('X01: Rückgängig nach Spielende entfernt Session', len([s for s in pg.evaluate(dbq)['s'] if s['mode'] == 'x01multi' and not s.get('legacy')]) == 0)
    pg.evaluate("() => { const g = X01.state().game, p = g.players[g.cur]; const rem = p.rem - g.visit.reduce((s, d) => s + d.v, 0); X01.act('xDart', String(rem)); }")
    pg.wait_for_timeout(300)
    check('X01: erneut beendet', len([s for s in pg.evaluate(dbq)['s'] if s['mode'] == 'x01multi' and not s.get('legacy')]) == 1)
    pg.evaluate("() => X01.act('xClose')")
    A = lambda a, v=None: pg.click(f'#viewTrainer [data-a="{a}"]' + (f'[data-v="{v}"]' if v is not None else ''))
    # Training Doppel mit Einzelpfeil-Eingabe
    pg.click('#nav [data-route="train"]'); A('mode', 'double'); A('tasks', '10'); A('perDart', '1')
    pg.screenshot(path=os.path.join(OUT, 'train_setup.png'), full_page=True)
    A('go'); A('pdMiss'); pg.screenshot(path=os.path.join(OUT, 'train_perdart.png'), full_page=True)
    A('pdHit')                      # Aufgabe 1: Treffer mit Pfeil 2
    for _ in range(6): A('pdMiss')  # Aufgabe 2: alle 6 daneben -> fail
    A('cont'); A('pdMiss'); A('pdHit')   # weitergeworfen, Treffer mit Pfeil 8
    A('pdMiss'); A('undoTask'); A('pdHit')  # Aufgabe 3: Undo, dann Treffer mit 1
    A('end'); A('endSave'); pg.wait_for_timeout(400)
    d = pg.evaluate(dbq); ts = [s for s in d['s'] if s['kind'] == 'training' and not s.get('legacy')]
    tw = next((w['list'] for w in d['w'] if ts and w['sid'] == ts[0]['id']), [])
    log = ts[0]['log'] if ts else []
    check('Training: Session mit Einzelpfeilen', len(ts) == 1 and len(tw) == 2 + 8 + 1 and ts[0]['cfg']['perDart'], (len(tw), tw))
    check('Training: Aufgaben-Ergebnis stimmt', [ (l['ok'], l['darts']) for l in log] == [(True, 2), (False, 8), (True, 1)], log)
    # Bot-Spiel: ein paar Aufnahmen, dann über Zustand prüfen, dass Würfe im Spiel gesammelt werden
    pg.click('#nav [data-route="home"]'); A('qs', '501')
    for _ in range(3): A('dart', '20')
    pg.wait_for_timeout(7000)
    gm = pg.evaluate("JSON.parse(localStorage.getItem('dartsTrainer')).game")
    check('Bot-Spiel: Würfe von Spieler und Bot im Spiel', gm and sum(1 for w in gm['tl'] if w['who'] == 0) == 3 and sum(1 for w in gm['tl'] if w['who'] == 1) == 3, gm and gm['tl'])
    # Stats ansehen
    pg.click('#nav [data-route="stats"]'); A('stab', 'over'); pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(OUT, 'stats_over.png'), full_page=True)
    check('Stats: Doppel-Tabelle Spiel/Training', 'Doppel: Spiel und Training' in pg.inner_text('#viewTrainer'))
    A('stab', 'multi'); pg.screenshot(path=os.path.join(OUT, 'stats_multi.png'), full_page=True)
    txt = pg.inner_text('#viewTrainer')
    check('Stats: Mehrspieler zeigt Spieler und Spiele', 'Anna' in txt and 'Spieler 1' in txt, txt[:300])
    # Export / Löschen / Import
    A('stab', 'data'); pg.screenshot(path=os.path.join(OUT, 'stats_data.png'), full_page=True)
    with pg.expect_download() as dl: A('export')
    path = dl.value.path(); data = json.load(open(path))
    n_s = len(pg.evaluate(dbq)['s'])
    check('Export: Format 2 mit Wurf-Datenbank', data['format'] == 2 and len(data['statsDb']['sessions']) == n_s, (data.get('format'), n_s))
    A('wipe')
    with pg.expect_navigation(): A('wipeYes')
    pg.wait_for_timeout(500)
    check('Löschen leert die Wurf-Datenbank', len(pg.evaluate(dbq)['s']) == 0)
    pg.click('#nav [data-route="stats"]'); A('stab', 'data')
    with pg.expect_navigation(): pg.set_input_files('#importFile', path)
    pg.wait_for_timeout(600)
    d2 = pg.evaluate(dbq)
    check('Import stellt Sessions und Würfe her', len(d2['s']) == n_s and sum(len(w['list']) for w in d2['w']) == sum(len(w['list']) for w in data['statsDb']['throws']))
    # Alte Sicherung (Format 1) importieren: Sessions werden aus den Einträgen neu angelegt
    old = {'app': 'darts-scorer', 'format': 1, 'dartsTrainer': json.dumps({'hist': [LEG_GAME, LEG_TR]}), 'dartsX01': json.dumps({'hist': [LEG_X]})}
    pg.click('#nav [data-route="stats"]'); A('stab', 'data')
    with pg.expect_navigation(): pg.set_input_files('#importFile', files=[{'name': 'old.json', 'mimeType': 'application/json', 'buffer': json.dumps(old).encode()}])
    pg.wait_for_timeout(800)
    check('Import Format 1: Sessions neu aufgebaut', len(pg.evaluate(dbq)['s']) == 3)
    b.close()
srv.shutdown()
print('FEHLER:', errs) if errs else print(f'Alle {len(ok)} Prüfungen bestanden')
raise SystemExit(1 if errs else 0)
