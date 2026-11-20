// Rendern, Navigation, Start
  function render() {
    const cv = document.getElementById('viewCounter'), r = T.route || 'home';
    const panel = EXT.panels[r];   // eigenständiges Modul mit eigenem Container (z.B. X01)
    cv.style.display = r === 'counter' ? '' : 'none';
    el.style.display = r === 'counter' || panel ? 'none' : '';
    Object.entries(EXT.panels).forEach(([k, p]) => { p.el.style.display = k === r ? '' : 'none'; });
    if (panel) panel.render();
    else if (r !== 'counter') {
      let h;
      if (r === 'home') h = viewHome();
      else if (r === 'stats') h = viewStatsPage();
      else if (EXT.views[r]) h = EXT.views[r]();
      else if (r === 'play') h = T.game ? viewGame() : viewSetup();
      else h = T.sess ? (DR[T.sess.mode] ? DR[T.sess.mode].view(T.sess, ctx) : T.sess.mode === 'score' ? viewScore() : viewTask()) : T.summary ? viewSummary() : viewSetup();
      el.innerHTML = h;
      if (EXT.after[r]) EXT.after[r](el);
    }
    document.querySelectorAll('#nav [data-route]').forEach(b => b.classList.toggle('active', b.dataset.route === ((panel && panel.nav) || r)));
    save();
  }
  document.getElementById('nav').addEventListener('click', e => { const b = e.target.closest('[data-route]'); if (b) act('nav', b.dataset.route); });
  const NAV = [['home', 'Home', ICON.home], ['play', 'Spielen', ICON.play], ['train', 'Training', ICON.train], ['stats', 'Stats', ICON.stats], ['counter', 'Zähler', ICON.counter]];
  EXT.nav.forEach(x => NAV.splice(NAV.length - 1, 0, [x.route, x.label, x.icon || ICON.play]));
  document.getElementById('nav').innerHTML = NAV.map(([r, l, i]) => `<button data-route="${r}">${i}<span>${l}</span></button>`).join('');
  window.renderTrainer = render;
  // Unsichtbares Datei-Feld für den Import (liegt außerhalb von #viewTrainer, damit render() es nicht ersetzt)
  const imp = document.createElement('input');
  imp.type = 'file'; imp.accept = '.json,application/json'; imp.id = 'importFile'; imp.hidden = true;
  imp.addEventListener('change', () => { const f = imp.files[0]; imp.value = ''; if (f) f.text().then(importData); });
  document.body.appendChild(imp);
  if (T.game && T.game.busy) setTimeout(botMove, 500);
  render();
