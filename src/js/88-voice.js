// Ansage („Caller“): liest nach jeder Aufnahme im Spiel gegen den Bot kurz die Punktzahl vor.
// Nutzt die Sprachausgabe des Geräts (Web Speech API), kein Internet nötig. Ein/Aus: T.set.voice.
  if (T.set.voice === undefined) T.set.voice = true;
  const VOICE_OK = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
  let enVoice = null, voiceList = [];
  // Natürlich klingende Stimmen bevorzugen (Premium/Enhanced/Neural), Roboter- und Spaß-Stimmen meiden
  const NOVELTY = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Ralph|Kathy|Princess|Grandma|Grandpa|Rocko|Shelley|Flo|Eddy|Reed|Sandy/i;
  function voiceScore(v) {
    let s = 0;
    if (/^en(-|_)GB/i.test(v.lang)) s += 6; else if (/^en(-|_)(US|AU|IE|CA)/i.test(v.lang)) s += 5; else if (/^en/i.test(v.lang)) s += 3; else return -99;
    if (/Premium|Enhanced|Erweitert|Natural|Neural|Online/i.test(v.name)) s += 30;
    if (/Siri/i.test(v.name)) s += 25;
    if (/^(Ava|Zoe|Evan|Nathan|Samantha|Daniel|Serena|Kate|Oliver|Jamie|Stephanie|Allison|Susan|Tom|Karen|Moira|Libby|Ryan|Sonia|Aria|Jenny|Guy|Emma|Brian)\b/i.test(v.name.replace(/^Microsoft\s+/i, ''))) s += 12;
    if (/Google UK English|Google US English/i.test(v.name)) s += 10;
    if (/compact|eSpeak/i.test(v.name)) s -= 20;
    if (NOVELTY.test(v.name)) s -= 60;
    if (v.localService === false) s += 2;   // Online-Stimmen (Edge/Chrome) klingen meist natürlicher
    return s;
  }
  function pickVoice() {
    if (!VOICE_OK) return;
    voiceList = speechSynthesis.getVoices().filter(v => voiceScore(v) > -50).sort((a, b) => voiceScore(b) - voiceScore(a));
    enVoice = (T.set.voiceName && voiceList.find(v => v.name === T.set.voiceName)) || voiceList[0] || null;
  }
  if (VOICE_OK) { pickVoice(); speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', () => { pickVoice(); if (T.route === 'play' && !T.game) render(); }); }

  function say(text) {
    if (!VOICE_OK || !T.set.voice || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = enVoice ? enVoice.lang : 'en-GB'; if (enVoice) u.voice = enVoice;
      u.rate = 0.98; u.pitch = 1; u.volume = 1;
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
  // Stimme wählen (beste natürliche Stimme ist vorausgewählt) und anhören
  EXT.actions.voiceTest = () => { const was = T.set.voice; T.set.voice = true; say('One hundred and eighty!'); T.set.voice = was; };
  el.addEventListener('change', e => { const sel = e.target.closest('select[data-voice]'); if (!sel) return; T.set.voiceName = sel.value || null; pickVoice(); save(); say('Game shot, and the leg!'); });
  const voiceToggle = () => {
    if (!VOICE_OK) return '';
    let h = `<div class="setlabel">Score caller</div><div class="seg">${btn('voice', 'On', 1, '', T.set.voice)}${btn('voice', 'Off', 0, '', !T.set.voice)}</div>`;
    if (T.set.voice && voiceList.length) {
      const cur = enVoice ? enVoice.name : '';
      h += `<div class="setlabel">Voice</div><div class="voicerow"><select data-voice aria-label="Voice">${voiceList.slice(0, 25).map((v, i) => `<option value="${v.name.replace(/"/g, '&quot;')}"${v.name === cur ? ' selected' : ''}>${v.name.replace(/</g, '&lt;')}${i === 0 ? ' (best)' : ''}</option>`).join('')}</select>${btn('voiceTest', '▶ Test')}</div>`;
      h += `<div class="voicehint">Tip: for the most natural voice, download a "Premium" or "Enhanced" English voice (iPhone/Mac: Settings → Accessibility → Spoken Content → Voices → English), then pick it here.</div>`;
    }
    return h;
  };
  const SPK = '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/></svg>';
  const voiceBtn = () => VOICE_OK ? `<button class="vbtn${T.set.voice ? ' on' : ''}" data-a="voice" data-v="${T.set.voice ? 0 : 1}" aria-label="Turn caller ${T.set.voice ? 'off' : 'on'}">${T.set.voice ? SPK.replace('</svg>', '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>') : SPK.replace('</svg>', '<path d="m16 9 5 6m0-6-5 6"/></svg>')}${T.set.voice ? 'Caller on' : 'Caller off'}</button>` : '';
  // Schnittstelle für eigenständige Module (z.B. X01 Mehrspieler)
  window.dartsCall = (score, bust, checked) => callVisit('x', score, bust, checked);
