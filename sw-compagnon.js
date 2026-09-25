/* Service worker â€” Mon Compagnon
   Rend l'appli installable (PC + tÃ©lÃ©phone) SANS jamais afficher une vieille
   version : on prend toujours la version en ligne, le cache ne sert qu'en
   secours sans connexion. Ne touche qu'aux fichiers du Compagnon. */
const CACHE = "compagnon-v3";
const FICHIERS = ["compagnon.html", "manifest-compagnon.json", "icon-compagnon-192.png", "icon-compagnon-512.png"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const cles = await caches.keys();
    await Promise.all(cles.filter((k) => k.startsWith("compagnon-") && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (!/(compagnon\.html|manifest-compagnon\.json|icon-compagnon[\w-]*\.png)$/.test(url.pathname)) return;
  e.respondWith((async () => {
    try {
      const reseau = await fetch(e.request, { cache: "no-store" });
      const c = await caches.open(CACHE);
      c.put(e.request, reseau.clone());
      return reseau;
    } catch (err) {
      const secours = await caches.match(e.request, { ignoreSearch: true });
      return secours || Response.error();
    }
  })());
});

/* Toucher une notification de rappel -> ouvre l'appli */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const fen = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of fen) { if (c.url.includes("compagnon.html")) return c.focus(); }
    return self.clients.openWindow("compagnon.html");
  })());
});
