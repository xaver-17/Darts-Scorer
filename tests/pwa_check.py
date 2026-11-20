"""PWA-Test: startet einen lokalen Server für dist/, prüft Manifest, Service Worker, Offline-Start
und Export/Import der Daten. Aufruf: python3 tests/pwa_check.py"""
import functools, http.server, json, os, threading
from playwright.sync_api import sync_playwright
DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=DIST))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'
errs, ok = [], []
def check(name, cond):
    (ok if cond else errs).append(name); print(('OK   ' if cond else 'FAIL ') + name)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx = b.new_context(viewport={'width': 400, 'height': 860}, accept_downloads=True)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.goto(URL)
    man = pg.evaluate("fetch('manifest.webmanifest').then(r=>r.json())")
    check('Manifest lädt', man.get('display') == 'standalone' and len(man['icons']) >= 2)
    for ic in man['icons']:
        check('Icon ' + ic['src'], pg.evaluate(f"fetch('{ic['src']}').then(r=>r.ok)"))
    check('Service Worker aktiv', pg.evaluate("navigator.serviceWorker.ready.then(r=>!!r.active)"))
    pg.reload(); pg.wait_for_timeout(500)
    ctx.set_offline(True); pg.reload(); pg.wait_for_selector('#nav [data-route="home"]')
    check('Startet offline', 'Darts' in pg.locator('.topbar h1').inner_text())
    ctx.set_offline(False)
    # Export / Import
    pg.evaluate("""localStorage.setItem('dartsTrainer', JSON.stringify({hist:[{date:new Date().toISOString(),mode:'score',level:0,goal:30,n:3,avg:55,best:60,goalPct:100,c100:0,c140:0,c180:0}]}))""")
    pg.reload(); pg.click('#nav [data-route="stats"]'); pg.click('#viewTrainer [data-a="stab"][data-v="data"]')
    with pg.expect_download() as dl: pg.click('#viewTrainer [data-a="export"]')
    path = dl.value.path(); data = json.load(open(path))
    check('Export enthält Daten', data['app'] == 'darts-scorer' and len(json.loads(data['dartsTrainer'])['hist']) == 1)
    pg.click('#viewTrainer [data-a="wipe"]'); pg.click('#viewTrainer [data-a="wipeYes"]'); pg.wait_for_load_state()
    check('Löschen leert Daten', pg.evaluate("localStorage.getItem('dartsTrainer')") in (None, 'null') or len(json.loads(pg.evaluate("localStorage.getItem('dartsTrainer')"))['hist']) == 0)
    pg.click('#nav [data-route="stats"]'); pg.click('#viewTrainer [data-a="stab"][data-v="data"]')
    with pg.expect_navigation(): pg.set_input_files('#importFile', path)
    check('Import stellt Daten wieder her', len(json.loads(pg.evaluate("localStorage.getItem('dartsTrainer')"))['hist']) == 1)
    pg.set_input_files('#importFile', files=[{'name': 'x.json', 'mimeType': 'application/json', 'buffer': b'{"foo":1}'}]); pg.wait_for_timeout(300)
    check('Ungültige Datei wird abgelehnt', 'not a valid' in pg.locator('.datamsg').inner_text())
    b.close()
srv.shutdown()
print('FEHLER:', errs) if errs else print(f'Alle {len(ok)} Prüfungen bestanden')
raise SystemExit(1 if errs else 0)
