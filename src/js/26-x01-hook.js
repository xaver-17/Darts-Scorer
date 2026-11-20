// Hook: hängt das eigenständige Mehrspieler-X01 (src/modules/x01.js, global X01) in die App ein.
  if (window.X01) {
    const box = document.createElement('div');
    box.id = 'viewX01'; box.style.display = 'none';
    el.after(box);
    X01.mount(box, { onBack: () => act('nav', 'play') });
    EXT.panels.x01 = { el: box, render: () => X01.render(), nav: 'play' };
    EXT.playLinks.push({ route: 'x01', title: 'X01 Mehrspieler', sub: 'Mehrere Spieler, ein Gerät' });
    EXT.dataKeys.push('dartsX01');
  }
