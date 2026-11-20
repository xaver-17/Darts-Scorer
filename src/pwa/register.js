// ===== PWA: Service Worker anmelden (nur über http/https, nicht bei file://) =====
window.APP_VERSION = '__APP_VERSION__';
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(e => console.warn('Service Worker nicht registriert:', e)); });
}
