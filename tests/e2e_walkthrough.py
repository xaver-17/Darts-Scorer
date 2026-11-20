"""End-to-End-Durchlauf im Headless-Chrome (Playwright): 2 Spiele 501 vs. Bot, alle Seiten mit Screenshots."""
from playwright.sync_api import sync_playwright
import os, random
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'out'); os.makedirs(OUT, exist_ok=True)
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg=b.new_page(viewport={'width':400,'height':860})
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and 'fonts' not in m.text else None)
    pg.goto('file://'+os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','dist','index.html'))
    pg.screenshot(path=os.path.join(OUT,'h0.png'))
    A=lambda a,v=None: pg.click(f'#viewTrainer [data-a="{a}"]'+(f'[data-v="{v}"]' if v is not None else ''))
    def tap(mx,my):
        if not pg.locator('svg[data-board]').count():
            pg.screenshot(path=os.path.join(OUT,'fail.png'), full_page=True); print('STATE', pg.evaluate("JSON.stringify(JSON.parse(localStorage.getItem('dartsTrainer')).game).slice(0,600)")); raise SystemExit
        box=pg.locator('svg[data-board]').bounding_box()
        pg.mouse.click(box['x']+(mx+200)/400*box['width'], box['y']+(-my+200)/400*box['height'])
    for game in range(2):
        pg.click('#nav [data-route="home"]')
        A('qs','501')
        for step in range(2500):
            g=pg.evaluate("JSON.parse(localStorage.getItem('dartsTrainer')).game")
            if g is None or g['phase']=='over': break
            if g['phase']=='legover': A('nextLeg'); continue
            if g['busy'] or g['turn']!='p': pg.wait_for_timeout(700); continue
            rem=g['p']['rem']
            if rem<=40 and rem%2==0:
                d=rem//2; ang=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5].index(d)*18
                import math
                r=166+random.gauss(0,7); a=math.radians(ang+random.gauss(0,4))
                pg.evaluate("JSON.parse(localStorage.getItem('dartsTrainer')).set.zoom")
                tap(r*math.sin(a), r*math.cos(a))
                pg.wait_for_timeout(50)
                if not pg.locator('svg[data-board]').count(): continue  # Tipp war ein Miss -> kein Zoom, Pfeil ist schon gezählt
                box=pg.locator('svg[data-board]').bounding_box(timeout=3000); pg.mouse.click(box['x']+box['width']/2, box['y']+box['height']/2)
                continue
            if rem>60:
                tap(random.gauss(0,10), 103+random.gauss(0,10))
                pg.wait_for_timeout(50)
                if not pg.locator('svg[data-board]').count(): continue  # Tipp war ein Miss -> kein Zoom, Pfeil ist schon gezählt
                box=pg.locator('svg[data-board]').bounding_box(timeout=3000); pg.mouse.click(box['x']+box['width']/2, box['y']+box['height']/2)
                continue
            if rem-20>=2 and rem-20!=1: A('dart',20)
            else: A('dart',1)
        print('game', game, g and g['phase'], g and g['p']['rem'], g and g['b']['rem']); A('close')
    pg.click('#nav [data-route="home"]'); pg.screenshot(path=os.path.join(OUT,'h1.png'), full_page=True)
    pg.click('#nav [data-route="stats"]'); pg.screenshot(path=os.path.join(OUT,'st1.png'), full_page=True)
    A('stab','acc'); pg.screenshot(path=os.path.join(OUT,'st2.png'), full_page=True)
    # pick a double target if present
    dbl=pg.locator('#viewTrainer .tchips [data-v^="D"]')
    if dbl.count(): dbl.first.click(); pg.screenshot(path=os.path.join(OUT,'st3.png'), full_page=True)
    A('stab','hist'); pg.screenshot(path=os.path.join(OUT,'st4.png'), full_page=True)
    pg.click('#nav [data-route="train"]'); pg.screenshot(path=os.path.join(OUT,'tr.png'), full_page=True)
    pg.click('#nav [data-route="counter"]'); pg.screenshot(path=os.path.join(OUT,'ct.png'), full_page=True)
    pg.click('#nav [data-route="play"]'); pg.screenshot(path=os.path.join(OUT,'pl.png'), full_page=True)
    pg.click('#nav [data-route="stats"]'); A('stab','data'); pg.screenshot(path=os.path.join(OUT,'data.png'), full_page=True)
    b.close()
print('ERRORS', errs)
