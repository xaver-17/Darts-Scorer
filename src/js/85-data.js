// Daten-Sicherung: Export als JSON-Datei, Import, alles löschen.
// Gesichert werden die localStorage-Schlüssel ('dartsTrainer', 'zaehler3', EXT.dataKeys) und die
// Wurf-Datenbank (Sessions + Würfe aus IndexedDB, Feld 'statsDb'). Format 2; Format-1-Sicherungen lassen sich weiter importieren.
  const DATA_KEYS = ['dartsTrainer', 'zaehler3'];
  const dataKeys = () => DATA_KEYS.concat(EXT.dataKeys);
  T.dataMsg = null;

  function exportData() {
    save();
    const data = { app: 'darts-scorer', format: 2, exported: new Date().toISOString(), version: window.APP_VERSION || '' };
    dataKeys().forEach(k => { data[k] = localStorage.getItem(k); });
    data.statsDb = TS.dump();
    const name = 'darts-scorer-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const file = typeof File === 'function' ? new File([blob], name, { type: 'application/json' }) : null;
    // Auf dem Handy: Teilen-Menü (Dateien, AirDrop, Mail …); sonst normaler Download
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Darts-Scorer Sicherung' }).catch(() => {});
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    T.dataMsg = { ok: true, t: 'Sicherung erstellt: ' + name };
  }

  function importData(text) {
    let d;
    try { d = JSON.parse(text); } catch (e) { d = null; }
    if (!d || d.app !== 'darts-scorer' || typeof d.dartsTrainer !== 'string') {
      T.dataMsg = { ok: false, t: 'Das ist keine gültige Darts-Scorer-Sicherung.' }; render(); return;
    }
    try { JSON.parse(d.dartsTrainer); } catch (e) { T.dataMsg = { ok: false, t: 'Sicherung ist beschädigt.' }; render(); return; }
    dataKeys().forEach(k => { if (typeof d[k] === 'string') localStorage.setItem(k, d[k]); else localStorage.removeItem(k); });
    // Alte Sicherung ohne Wurf-Datenbank: Sessions werden nach dem Neuladen aus den Einträgen neu angelegt
    TS.restore(d.statsDb && Array.isArray(d.statsDb.sessions) ? d.statsDb : null).then(() => location.reload());
  }

  function wipeData() {
    dataKeys().forEach(k => localStorage.removeItem(k));
    TS.clear().then(() => location.reload());
  }

  function viewData() {
    const G = games().length, Tr = T.hist.length - G, xn = x01Hist().length;
    const wn = TS.sessions().reduce((a, s) => a + TS.throws(s.id).length, 0);
    let h = `<div class="card datacard"><div class="setlabel">Sicherung</div>
      <p>Deine Daten liegen nur auf diesem Gerät (im Browser). Sichere sie ab und zu – vor allem, bevor du den Browser-Verlauf löschst oder das Handy wechselst.<br>Aktuell gespeichert: <b>${G}</b> Spiel${G === 1 ? '' : 'e'} und <b>${Tr}</b> Training${Tr === 1 ? '' : 's'}${xn ? `, <b>${xn}</b> Mehrspieler-Spiel${xn === 1 ? '' : 'e'}` : ''} · <b>${wn.toLocaleString('de-DE')}</b> einzelne Würfe.</p>
      ${btn('export', '⤓ Sicherung exportieren', undefined, 'big go')}
      ${btn('importPick', '⤒ Sicherung importieren', undefined, 'big ghost')}
      <div class="datamsg${T.dataMsg && !T.dataMsg.ok ? ' err' : ''}">${T.dataMsg ? T.dataMsg.t : ''}</div></div>`;
    h += `<div class="card datacard"><div class="setlabel">Zurücksetzen</div><p>Löscht alle Spiele, Trainings, Einstellungen und den Zähler auf diesem Gerät.</p>`;
    h += T.confirm === 'wipe'
      ? `<div class="confirmbox"><p>Wirklich alles löschen? Das lässt sich nicht rückgängig machen.</p><div class="row2">${btn('no', 'Abbrechen', undefined, 'mid')}${btn('wipeYes', 'Alles löschen', undefined, 'mid redb')}</div></div>`
      : btn('wipe', 'Alle Daten löschen', undefined, 'big danger');
    h += `</div><div class="appver">Darts-Scorer · Version ${window.APP_VERSION || 'dev'}</div>`;
    return h;
  }
