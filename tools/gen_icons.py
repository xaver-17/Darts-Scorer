"""Erzeugt die App-Icons in src/pwa/icons/ aus dem Logo (braucht Playwright + Chrome).
Aufruf: python3 tools/gen_icons.py   (nur nötig, wenn das Logo geändert wird)"""
import os
from playwright.sync_api import sync_playwright
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'pwa', 'icons')
LOGO = '<circle r="18.5" fill="#ec4899"/><circle r="13" fill="none" stroke="#fff" stroke-width="2"/><circle r="7" fill="none" stroke="#fff" stroke-width="2"/><circle r="2.4" fill="#fff"/>'
def page(size, scale):
    return f'''<html><body style="margin:0"><div style="width:{size}px;height:{size}px;background:#0a0a0c;display:flex;align-items:center;justify-content:center">
<svg viewBox="-20 -20 40 40" width="{size*scale}" height="{size*scale}">{LOGO}</svg></div></body></html>'''
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for name, size, scale in [('icon-192.png', 192, .78), ('icon-512.png', 512, .78), ('icon-maskable-512.png', 512, .6), ('apple-touch-icon.png', 180, .74)]:
        pg = b.new_page(viewport={'width': size, 'height': size}); pg.set_content(page(size, scale))
        pg.screenshot(path=os.path.join(OUT, name)); pg.close()
    b.close()
print('Icons geschrieben nach', os.path.abspath(OUT))
