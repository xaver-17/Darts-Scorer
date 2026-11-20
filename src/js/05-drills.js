// Trainingsspiele aus src/modules/drills.js (Around the Clock, Bob's 27, Doppel-Runde, Checkout-Leiter)
// Die Regeln und Ansichten stehen dort; hier werden sie in TM eingetragen und mit Helfern versorgt.
  const DR = window.DRILLS || {};
  delete TM.game; Object.keys(DR).forEach(k => { TM[k] = DR[k].name; }); TM.game = 'Spiel vs. Bot';
  const ctx = { btn: (...a) => btn(...a), f1, LV, footer: () => footer(), get showRoute() { return T.showRoute; } };
  // Eingaben während eines Trainingsspiels (drHit, drBob, drDR, drLad)
  ['drHit', 'drBob', 'drDR', 'drLad'].forEach(a => {
    EXT.actions[a] = v => { const S = T.sess; if (S && DR[S.mode] && DR[S.mode].act(a, v, S) === 'finish') finish(); };
  });
