// Aktionen: alle Klicks (data-a) laufen über act()
  // ---------- Aktionen ----------
  function act(a, v) {
    const s = T.set, S = T.sess, g = T.game;
    const n = v !== undefined ? +v : NaN;
    switch (a) {
      case 'mode': s.mode = v; break;
      case 'level': s.level = n; break;
      case 'tasks': s.tasks = n; break;
      case 'bot': s.bot = n; break;
      case 'start': s.start = n; break;
      case 'din': s.din = v === '1'; break;
      case 'legs': s.legs = n; s.legsCustom = false; break;
      case 'legsCustom': s.legsCustom = true; if (s.legs <= 5 && s.legs !== 4) s.legs = 7; break;
      case 'sets': s.sets = n; break;
      case 'perDart': s.perDart = v === '1'; break;
      case 'pdHit': taskDart(true); break;
      case 'pdMiss': taskDart(false); break;
      case 'go': unlockVoice(); start(); break;
      case 'ok': record({ ok: true, done: true, darts: n }); break;
      case 'fail': S.phase = 'fail'; break;
      case 'cont': S.phase = 'more'; S.more = S.tasks[S.idx].darts + 1; break;
      case 'moreM': S.more = Math.max(S.tasks[S.idx].darts + 1, S.more - 1); break;
      case 'moreP': S.more = Math.min(99, S.more + 1); break;
      case 'moreOk': record({ ok: false, done: true, darts: S.more }); break;
      case 'skip': record({ ok: false, done: false, darts: Math.max(S.cur || 0, S.tasks[S.idx].darts) }); break;
      case 'route': T.showRoute = !T.showRoute; break;
      case 'undoTask':
        if (DR[S.mode]) DR[S.mode].act(a, v, S);
        else if (S.mode === 'score') { S.visits.pop(); }
        else if (S.perDart) taskDartUndo();
        else if (S.phase !== 'task') S.phase = 'task';
        else if (S.log.length) { S.log.pop(); S.idx--; }
        break;
      case 'end': T.confirm = 'end'; break;
      case 'endSave': T.confirm = null; finish(); break;
      case 'endDrop': T.confirm = null; T.sess = null; break;
      case 'quit': T.confirm = 'quit'; break;
      case 'quitYes': T.confirm = null; T.game = null; break;
      case 'no': T.confirm = null; break;
      case 'key': if (T.input.length < 3) T.input = (T.input === '0' ? '' : T.input) + v; break;
      case 'quick': T.input = v; break;
      case 'back': T.input = T.input.slice(0, -1); break;
      case 'submit': {
        const val = T.input === '' ? NaN : +T.input;
        if (S && S.mode === 'score') {
          if (isNaN(val) || val > 180 || IMPOSSIBLE.includes(val)) { S.msg = 'Ungültige Punktzahl'; }
          else { S.msg = ''; S.visits.push(val); T.input = ''; if (S.visits.length >= S.n) finish(); }
        }
        break;
      }
      case 'mult': T.mult = n; break;
      case 'dart': buttonDart(n, T.mult || 1); T.mult = 1; T.zoom = null; break;
      case 's25': buttonDart(25, 1); T.mult = 1; T.zoom = null; break;
      case 'bull': buttonDart(25, 2); T.mult = 1; T.zoom = null; break;
      case 'miss': buttonDart(0, 0); T.mult = 1; T.zoom = null; break;
      case 'inp': T.set.inp = v; T.zoom = null; break;
      case 'zoomOff': T.zoom = null; break;
      case 'zoomSet': T.set.zoom = v === '1'; T.zoom = null; break;
      case 'hm': T.hm = v; break;
      case 'exp': T.exp = T.exp === n ? null : n; break;
      case 'nav': T.route = v; T.confirm = null; T.zoom = null; window.scrollTo(0, 0); break;
      case 'stab': T.stab = v; T.dataMsg = null; T.confirm = null; break;
      case 'tgt': T.tgt = v; break;
      case 'qs':
        unlockVoice();
        if (v === '501' || v === '301di') {
          T.route = 'play';
          if (!T.game) { Object.assign(s, { mode: 'game', start: v === '501' ? 501 : 301, din: v === '301di', bot: 2, legs: 1, sets: 1 }); start(); }
        } else {
          T.route = 'train';
          if (!T.sess) { s.mode = v; T.summary = null; start(); }
        }
        window.scrollTo(0, 0); break;
      case 'nextLeg': nextLeg(); break;
      case 'gUndo': gameUndo(); break;
      case 'again': unlockVoice(); start(); break;
      case 'close': T.game = null; T.summary = null; break;
      case 'filter': T.filter = v; break;
      case 'del': { const e = T.hist.splice(n, 1)[0]; if (e) TS.remove(sidOf(e)); break; }
      case 'drOrder': s.drOrder = v; break;
      case 'homeData': T.route = 'stats'; T.stab = 'data'; window.scrollTo(0, 0); break;
      case 'export': exportData(); break;
      case 'importPick': document.getElementById('importFile').click(); break;
      case 'wipe': T.confirm = 'wipe'; break;
      case 'wipeYes': wipeData(); return;
      default: if (EXT.actions[a]) EXT.actions[a](v, n); else console.warn('Unbekannte Aktion:', a); break;
    }
    render();
  }
  // Freie Zahl-Eingaben (z.B. Legs > 5): data-set="legs" schreibt in T.set
  el.addEventListener('change', e => {
    const i = e.target.closest('input[data-set]'); if (!i) return;
    const v = Math.max(1, Math.min(99, Math.round(+i.value) || 1)); T.set[i.dataset.set] = v; render();
  });
  el.addEventListener('click', e => {
    const svg = e.target.closest('svg[data-board]'); if (svg) { boardTap(e, svg); return; }
    const b = e.target.closest('[data-a]'); if (b && !b.disabled) { act(b.dataset.a, b.dataset.v); return; }
    if (T.zoom) { T.zoom = null; render(); }   // Tipp neben die vergrößerte Scheibe: Zoom schließen
  });

