"""Baut die App aus src/ nach dist/.

Aufruf: python3 tools/build.py

Ergebnis in dist/:
  index.html             komplette App in einer Datei (läuft auch per Doppelklick, dann ohne Offline-Modus)
  manifest.webmanifest   App-Name, Icons, Farben für "Zum Home-Bildschirm"
  sw.js                  Service Worker: macht die App offline-fähig
  icons/                 App-Icons (aus src/pwa/icons/)
"""
import glob, hashlib, json, os, shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC, DIST = os.path.join(ROOT, 'src'), os.path.join(ROOT, 'dist')
rd = lambda *p: open(os.path.join(SRC, *p), encoding='utf-8').read()

# ---------- JS-Module zu einem Block zusammensetzen ----------
# Alle Dateien in src/js/ werden in Namensreihenfolge (00-, 10-, …) aneinandergehängt und
# gemeinsam in eine Funktion gepackt. Sie teilen sich also Variablen wie T, act(), render().
mods = sorted(glob.glob(os.path.join(SRC, 'js', '*.js')))
tr = '// ===== Darts-Trainer =====\n(function () {\n' + ''.join(
    f'\n  // ===== {os.path.basename(m)} =====\n' + open(m, encoding='utf-8').read() for m in mods) + '})();\n'

s = rd('counter.html')
core = rd('core.js')
# Eigenständige Module (eigene globale Objekte, z.B. X01 = {...}) aus src/modules/: werden nach core.js geladen,
# ihr CSS wird angehängt. Eingehängt werden sie über ein kleines Hook-Modul in src/js/ (siehe docs/ENTWICKLUNG.md).
ext_js = sorted(glob.glob(os.path.join(SRC, 'modules', '*.js')))
ext_css = sorted(glob.glob(os.path.join(SRC, 'modules', '*.css')))
core += ''.join(f'\n// ===== modules/{os.path.basename(m)} =====\n' + open(m, encoding='utf-8').read() for m in ext_js)
css = rd('trainer.css') + rd('app.css') + rd('pwa', 'pwa.css') + ''.join(open(c, encoding='utf-8').read() for c in ext_css)
s = s.replace('</style>', css + '</style>', 1)
s = s.replace('<div class="app">', '<div class="app">\n  <div id="viewCounter" style="display:none">\n  <div class="phead"><h1>Zähler</h1><p>Felder abwerfen, Summe wird geteilt</p></div>', 1)
s = s.replace('<meta name="viewport" content="width=device-width, initial-scale=1">',
              '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">', 1)
s = s.replace('<title>Zähler</title>', '<title>Darts-Scorer</title>\n' + rd('pwa', 'head.html').strip() +
              '', 1)
i = s.index('\n<script>'); j = s.rindex('</div>', 0, i)
s = s[:j] + '</div>\n  <div id="viewTrainer"></div>\n' + s[j:]
s = s.replace('<body>', '<body>\n' + rd('pwa', 'splash.html').strip() + '\n<nav id="nav"></nav>', 1)
s = s.replace('\n<script>', '\n<script>\n' + core + '\n</script>\n<script>', 1)
s = s.replace('</body>', '<script>\n' + tr + '\n</script>\n<script>\n' + rd('pwa', 'register.js') + '</script>\n</body>', 1)
# ---------- dist/ schreiben ----------
os.makedirs(DIST, exist_ok=True)
shutil.rmtree(os.path.join(DIST, 'icons'), ignore_errors=True)
shutil.copytree(os.path.join(SRC, 'pwa', 'icons'), os.path.join(DIST, 'icons'))
icons = sorted(os.listdir(os.path.join(DIST, 'icons')))
version = hashlib.sha1((s + rd('pwa', 'manifest.webmanifest')).encode()).hexdigest()[:10]
s = s.replace('__APP_VERSION__', version)
open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8').write(s)
shutil.copy(os.path.join(SRC, 'pwa', 'manifest.webmanifest'), DIST)
sw = rd('pwa', 'sw.js').replace('__APP_VERSION__', version).replace(
    '__PRECACHE__', json.dumps(['./', './index.html', './manifest.webmanifest'] + ['./icons/' + i for i in icons]))
open(os.path.join(DIST, 'sw.js'), 'w', encoding='utf-8').write(sw)
print(f'dist/ gebaut · Version {version} · {len(mods)} JS-Module · index.html {len(s.encode()) // 1024} KB')
