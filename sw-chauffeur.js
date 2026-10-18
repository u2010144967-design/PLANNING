/* CANA LIVRAISONS — app chauffeur : ouverture même sans internet.
   Réseau d'abord (toujours la dernière version), copie de secours si pas de réseau.
   Ne touche qu'à l'app chauffeur et à ses bibliothèques, jamais aux autres applis du dépôt. */
const CACHE = 'cana-chauffeur-v1';
const MOI = ['index.html', 'manifest-chauffeur.json', 'icon-chauffeur.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./index.html']).catch(() => {})));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('cana-chauffeur-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const page = u.origin === location.origin && (u.pathname.endsWith('/') || MOI.some(f => u.pathname.endsWith('/' + f)));
  const lib = u.hostname === 'cdnjs.cloudflare.com';
  if (!page && !lib) return;               // base de données, autres applis : on ne touche pas
  e.respondWith((async () => {
    try {
      const r = await fetch(e.request, page ? { cache: 'no-store' } : {});
      if (r && (r.ok || r.type === 'opaque')) { const c = await caches.open(CACHE); c.put(e.request, r.clone()).catch(() => {}); }
      return r;
    } catch (err) {
      const c = await caches.match(e.request, { ignoreSearch: true });
      if (c) return c;
      if (page) { const p = await caches.match('./index.html'); if (p) return p; }
      throw err;
    }
  })());
});
