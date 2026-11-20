"""X01-Modul: Spielerverwaltung, Busts, Checkout, Rückgängig, Legs, Speicherung. Aufruf: python3 tests/test_x01.py"""
from playwright.sync_api import sync_playwright
import os,sys
errs=[]
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
URL='file://'+os.path.abspath(R+'/dist/index.html')
D=os.environ.get('SHOTS','/tmp')
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium'); pg=b.new_page(viewport={'width':400,'height':860})
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL)
    pg.evaluate("localStorage.clear()"); pg.reload()
    pg.click('#nav [data-route="play"]'); pg.click('#viewTrainer [data-v="x01"]')
    assert pg.is_visible('#viewX01 [data-a="xBack"]') and not pg.is_visible('#viewTrainer')
    A=lambda a,v=None: pg.click(f'#viewX01 [data-a="{a}"]'+(f'[data-v="{v}"]' if v is not None else ''))
    st=lambda: pg.evaluate("X01.state()")
    A('xAdd'); pg.fill('#viewX01 input[data-p="0"]','Xaver'); pg.fill('#viewX01 input[data-p="2"]','Anna')
    A('xStart',301); pg.screenshot(path=D+'/setup.png',full_page=True)
    A('xGo'); g=st()['game']; assert [x['name'] for x in g['players']]==['Xaver','Player 2','Anna'],g['players']
    def T(n): A('xMult',3); A('xDart',n)
    def S(n): A('xDart',n)
    def Dd(n): A('xMult',2); A('xDart',n)
    # Xaver: T20 T20 T20 = 180 -> 121
    T(20);T(20);T(20); g=st()['game']; assert g['players'][0]['rem']==121 and g['cur']==1
    # P2: 20 20 20 -> 241 ; Anna: miss x3
    S(20);S(20);S(20); A('xMiss');A('xMiss');A('xMiss')
    # undo last Anna dart -> cur back to Anna with 2 darts
    A('xUndo'); g=st()['game']; assert g['cur']==2 and len(g['visit'])==2, g
    A('xMiss'); g=st()['game']; assert g['cur']==0
    pg.screenshot(path=D+'/game.png',full_page=True)
    # Xaver 121: T20 (61) T15 (16) -> then S16 single on 16 -> bust? 16-16=0 not double -> bust
    T(20);T(15); assert 'D8' in pg.inner_text('#viewX01 .route'), pg.inner_text('#viewX01 .route')
    S(16); g=st()['game']; assert g['players'][0]['rem']==121 and g['cur']==1, 'bust'
    assert 'bust' in pg.inner_text('#viewX01 .msg')
    # bust to 1: P2 241, Anna 301 just do misses
    for _ in range(6): A('xMiss')
    # Xaver 121: T20 T11 D14 = 60+33+28=121 checkout
    T(20);T(11);Dd(14); g=st()['game']; assert g['phase']=='over' and g['legWinner']==0, g['phase']
    assert len(st()['hist'])==1
    pg.screenshot(path=D+'/over.png',full_page=True)
    A('xUndo'); g=st()['game']; assert g['phase']=='play' and len(st()['hist'])==0 and len(g['visit'])==2
    Dd(14); A('xAgain'); g=st()['game']; assert g['players'][0]['name']=='Player 2'
    # reload persistence
    S(5); pg.reload(); assert st()['game']['visit'][0]['v']==5
    # single-out + legs
    A('xQuit'); A('xQuitYes'); A('xOut','single'); A('xLegs',2); A('xDel',2); A('xDel',1); A('xGo')
    # 1 player, 301 single out: T20x5=300, then S1 -> checkout
    for _ in range(5): T(20)
    S(1); g=st()['game']; assert g['phase']=='legover', g['phase']
    A('xNextLeg'); g=st()['game']; assert g['players'][0]['rem']==301 and g['legNo']==2
    A('xQuit'); A('xQuitYes'); A('xBack'); assert pg.is_visible('#viewTrainer') and not pg.is_visible('#viewX01')
    b.close()
print('OK, errors:',errs)
