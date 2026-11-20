// Trainingsspiele aus src/modules/drills.js (Around the Clock, Bob's 27, Doppel-Runde, Checkout-Leiter, Shanghai, Halve-It, Cricket-Training)
// Die Regeln und Ansichten stehen dort; hier werden sie in TM eingetragen und mit Helfern versorgt.
  const DR = window.DRILLS || {};
  delete TM.game; Object.keys(DR).forEach(k => { TM[k] = DR[k].name; }); TM.game = 'Game vs. bot';
  const ctx = { btn: (...a) => btn(...a), f1, LV, footer: () => footer(), get showRoute() { return T.showRoute; }, get input() { return T.input; } };
  // Eingaben während eines Trainingsspiels. drHi (Halve-It) nimmt die Zahl aus dem Tastenfeld (T.input).
  ['drHit', 'drBob', 'drDR', 'drLad', 'drSh', 'drHi', 'drCr'].forEach(a => {
    EXT.actions[a] = v => {
      const S = T.sess; if (!S || !DR[S.mode]) return;
      const r = DR[S.mode].act(a, a === 'drHi' ? T.input : v, S);
      if (a === 'drHi' && r !== 'keep') T.input = '';
      if (r === 'finish') finish();
    };
  });
