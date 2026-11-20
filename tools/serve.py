"""Lokaler Entwicklungs-Server: baut dist/ bei jedem Seitenaufruf neu und liefert es aus.
Aufruf: python3 tools/serve.py [port]   → http://localhost:8000
Hinweis: Auf localhost läuft auch der Service Worker. Wenn du eine alte Version siehst:
Entwicklertools → Application → Service Workers → "Update on reload" anhaken."""
import functools, http.server, os, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0] in ('/', '/index.html'):
            r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build.py')], capture_output=True, text=True)
            print((r.stdout or r.stderr).strip())
        super().do_GET()
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache'); super().end_headers()
subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build.py')])
print(f'Darts-Scorer läuft auf http://localhost:{PORT}  (Strg+C beendet)')
http.server.ThreadingHTTPServer(('', PORT), functools.partial(Handler, directory=os.path.join(ROOT, 'dist'))).serve_forever()
