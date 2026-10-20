/* CANA LIVRAISONS â€” app chauffeur : ouverture mÃªme sans internet.
   RÃ©seau d'abord (toujours la derniÃ¨re version), copie de secours si pas de rÃ©seau.
   Ne touche qu'Ã  l'app chauffeur et Ã  ses bibliothÃ¨ques, jamais aux autres applis du dÃ©pÃ´t. */
const CACHE = 'hb-logistique-v2';
const MOI = ['index.html', 'installer.html', 'manifest-chauffeur.json', 'icon-chauffeur.png', 'icon-chauffeur-192.png', 'icon-chauffeur-maskable.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./index.html']).catch(() => {})));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => (k.startsWith('cana-chauffeur-') || k.startsWith('hb-logistique-')) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const page = u.origin === location.origin && (u.pathname.endsWith('/') || MOI.some(f => u.pathname.endsWith('/' + f)));
  const lib = u.hostname === 'cdnjs.cloudflare.com';
  if (!page && !lib) return;               // base de donnÃ©es, autres applis : on ne touche pas
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
