// ===== PWA: Service Worker + Update-Prüfung (nur über http/https, nicht bei file://) =====
window.APP_VERSION = '__APP_VERSION__';
(function () {
  if (!/^https?:$/.test(location.protocol)) return;
  let shown = false;
  function banner() {
    if (shown) return; shown = true;
    const b = document.createElement('button');
    b.id = 'updbar'; b.type = 'button';
    b.innerHTML = '<b>New version available</b><span>Tap to update</span>';
    b.onclick = () => { b.disabled = true; reloadFresh(); };
    document.body.appendChild(b);
  }
  // Neu laden, ohne alte Kopien aus Cache oder Service Worker zu nehmen
  async function reloadFresh() {
    try {
      if ('caches' in window) { const ks = await caches.keys(); await Promise.all(ks.filter(k => k.startsWith('darts-')).map(k => caches.delete(k))); }
      if (navigator.serviceWorker) { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update(); }
    } catch (e) {}
    location.reload();
  }
  // Version auf dem Server mit der laufenden vergleichen (ohne Browser-Cache)
  async function check() {
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const v = (await r.json()).version;
      if (v && v !== window.APP_VERSION) banner();
    } catch (e) {}   // offline: nichts tun
  }
  // Übernimmt ein neuer Service Worker die Seite (= Update angekommen), einmal automatisch neu laden
  if ('serviceWorker' in navigator) {
    const had = !!navigator.serviceWorker.controller; let done = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !done) { done = true; location.reload(); } });
  }
  window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(reg => { reg.update().catch(() => {}); }).catch(e => console.warn('Service Worker nicht registriert:', e));
    setTimeout(check, 2500);
  });
  // Beim Zurückkehren in die App (Dock, Home-Bildschirm) erneut prüfen
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  setInterval(check, 15 * 60 * 1000);
})();
