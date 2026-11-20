// Ansage („Caller“): liest nach jeder Aufnahme im Spiel gegen den Bot kurz die Punktzahl vor.
// Nutzt die Sprachausgabe des Geräts (Web Speech API), kein Internet nötig. Ein/Aus: T.set.voice.
  if (T.set.voice === undefined) T.set.voice = true;
  const VOICE_OK = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
  let enVoice = null;
  function pickVoice() {
    if (!VOICE_OK) return;
    const vs = speechSynthesis.getVoices();
    enVoice = vs.find(v => /^en(-|_)GB/i.test(v.lang) && /Daniel|Arthur|Google UK English Male|Serena|Kate/i.test(v.name)) || vs.find(v => /^en(-|_)GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
  }
  if (VOICE_OK) { pickVoice(); speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', pickVoice); }

  function say(text) {
    if (!VOICE_OK || !T.set.voice || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-GB'; if (enVoice) u.voice = enVoice;
      u.rate = 1.05; u.pitch = 1; u.volume = 1;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  // iOS spricht erst, nachdem einmal innerhalb eines Tipps gesprochen wurde: beim Spielstart „freischalten“
  function unlockVoice() { if (VOICE_OK && T.set.voice) { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) {} } }

  // Wird aus 20-game.js nach jeder Aufnahme aufgerufen
  function callVisit(who, score, bust, checked) {
    if (bust) return say('Bust');
    if (checked) return say('Game shot! ' + score);
    if (score === 0) return say('No Score');
    say(score === 180 ? 'One hundred and eighty!' : String(score));
  }

  EXT.actions.voice = v => { T.set.voice = v === '1'; if (T.set.voice) say('Caller on'); else if (VOICE_OK) speechSynthesis.cancel(); };
  const voiceToggle = () => VOICE_OK ? `<div class="setlabel">Score caller</div><div class="seg">${btn('voice', 'On', 1, '', T.set.voice)}${btn('voice', 'Off', 0, '', !T.set.voice)}</div>` : '';
  const SPK = '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/></svg>';
  const voiceBtn = () => VOICE_OK ? `<button class="vbtn${T.set.voice ? ' on' : ''}" data-a="voice" data-v="${T.set.voice ? 0 : 1}" aria-label="Turn caller ${T.set.voice ? 'off' : 'on'}">${T.set.voice ? SPK.replace('</svg>', '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>') : SPK.replace('</svg>', '<path d="m16 9 5 6m0-6-5 6"/></svg>')}${T.set.voice ? 'Caller on' : 'Caller off'}</button>` : '';
  // Schnittstelle für eigenständige Module (z.B. X01 Mehrspieler)
  window.dartsCall = (score, bust, checked) => callVisit('x', score, bust, checked);
