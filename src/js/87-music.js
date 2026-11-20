// Musik: Lieblings-Playlists speichern und mit einem Tipp in Spotify / Apple Music / YouTube Music öffnen.
// Die Musik läuft dann in der jeweiligen Musik-App weiter, während du hier spielst.
// Gespeichert in localStorage 'dartsMusic' (wird mit gesichert).
  const MUSIC_KEY = 'dartsMusic';
  let MU = { lists: [], adding: false, msg: '' };
  try { const s = JSON.parse(localStorage.getItem(MUSIC_KEY) || 'null'); if (s && Array.isArray(s.lists)) MU.lists = s.lists; } catch (e) {}
  const muSave = () => { try { localStorage.setItem(MUSIC_KEY, JSON.stringify({ lists: MU.lists })); } catch (e) {} };
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function muService(url) {
    if (/spotify\.com|^spotify:/.test(url)) return 'Spotify';
    if (/music\.apple\.com/.test(url)) return 'Apple Music';
    if (/music\.youtube\.com|youtube\.com|youtu\.be/.test(url)) return 'YouTube Music';
    if (/deezer\.com/.test(url)) return 'Deezer';
    if (/soundcloud\.com/.test(url)) return 'SoundCloud';
    return 'Link';
  }
  // spotify:playlist:ID → https://open.spotify.com/playlist/ID (öffnet auf dem Handy die Spotify-App)
  function muNormalize(url) {
    url = url.trim();
    const m = url.match(/^spotify:(playlist|album|track|artist):([A-Za-z0-9]+)/);
    if (m) return `https://open.spotify.com/${m[1]}/${m[2]}`;
    if (!/^https?:\/\//.test(url) && /\./.test(url)) url = 'https://' + url;
    return url;
  }
  const MU_ICON = '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';

  EXT.views.music = () => {
    let h = phead('Music', 'Your darts playlists – music keeps playing in your music app');
    if (MU.lists.length) {
      h += `<div class="rows">` + MU.lists.map((l, i) => `<div class="rowi murow">
        <a class="th muth" href="${esc(l.url)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24">${MU_ICON.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></a>
        <a class="mulink" href="${esc(l.url)}" target="_blank" rel="noopener"><b>${esc(l.name)}</b><small>${muService(l.url)} · tap to open</small></a>
        <span class="muact">${i > 0 ? btn('muUp', '↑', i, 'mubtn') : ''}${btn('muDel', '✕', i, 'mubtn')}</span></div>`).join('') + `</div>`;
    } else h += `<div class="card empty">No playlist yet. Add your first one below.</div>`;
    if (MU.adding) {
      h += `<div class="card mucard"><div class="setlabel">New playlist</div>
        <input id="muName" class="muin" placeholder="Name, e.g. Walk-on anthems" maxlength="60">
        <input id="muUrl" class="muin" placeholder="Link, e.g. https://open.spotify.com/playlist/…" inputmode="url" autocomplete="off">
        <div class="mumsg">${esc(MU.msg)}</div>
        <div class="row2">${btn('muCancel', 'Cancel', undefined, 'mid')}${btn('muSaveNew', 'Save', undefined, 'mid mugo')}</div></div>`;
    } else h += btn('muAdd', '+ Add playlist', undefined, 'big go');
    h += `<div class="card muhelp"><div class="setlabel">How to get the link</div>
      <p><b>Spotify:</b> open playlist → ··· → Share → <i>Copy link</i>.<br><b>Apple Music:</b> playlist → ··· → Share → <i>Copy link</i>.<br>Then paste it here. Tapping it opens the playlist in your app; start it and switch back to the game – the music keeps playing.</p></div>`;
    return h;
  };
  EXT.actions.muAdd = () => { MU.adding = true; MU.msg = ''; setTimeout(() => { const i = document.getElementById('muName'); if (i) i.focus(); }, 0); };
  EXT.actions.muCancel = () => { MU.adding = false; MU.msg = ''; };
  EXT.actions.muSaveNew = () => {
    const name = (document.getElementById('muName') || {}).value || '', raw = (document.getElementById('muUrl') || {}).value || '';
    const url = muNormalize(raw);
    if (!/^https:\/\/[^\s]+\.[^\s]+/.test(url)) { MU.msg = 'Please paste a valid link.'; render(); restore(name, raw); return; }
    MU.lists.push({ name: name.trim() || muService(url) + ' Playlist', url }); MU.adding = false; MU.msg = ''; muSave();
  };
  function restore(name, raw) { setTimeout(() => { const a = document.getElementById('muName'), b = document.getElementById('muUrl'); if (a) a.value = name; if (b) b.value = raw; }, 0); }
  EXT.actions.muDel = (v, n) => { MU.lists.splice(n, 1); muSave(); };
  EXT.actions.muUp = (v, n) => { if (n > 0) { const [x] = MU.lists.splice(n, 1); MU.lists.splice(n - 1, 0, x); muSave(); } };
  EXT.dataKeys.push(MUSIC_KEY);
  EXT.music = { icon: MU_ICON, first: () => MU.lists[0] || null };
