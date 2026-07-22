/* Service worker — permet d'ouvrir l'application sans connexion.
   Changez le numéro de version après chaque modification du fichier index.html. */
const VERSION = "repartition-v1";
const FICHIERS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icone-192.png",
  "./icone-512.png"
];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FICHIERS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys()
      .then(cles=>Promise.all(cles.filter(k=>k!==VERSION).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", e=>{
  const url = new URL(e.request.url);
  // Les appels à Supabase ne sont jamais mis en cache.
  if(e.request.method !== "GET" || url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(rep=>{
        const copie = rep.clone();
        caches.open(VERSION).then(c=>c.put(e.request, copie));
        return rep;
      })
      .catch(()=>caches.match(e.request).then(r=>r || caches.match("./index.html")))
  );
});
