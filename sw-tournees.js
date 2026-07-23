/* Service worker de l'application « Répartition des tournées ».
   Il ne s'occupe QUE de ses propres fichiers : les autres applications
   du dépôt (App Chauffeur, Planning, Vestiaires…) ne sont pas touchées. */
const VERSION = "tournees-v1";
const FICHIERS = [
  "./TOURNEES.html",
  "./manifest-tournees.json",
  "./icone-repartition-192.png",
  "./icone-repartition-512.png"
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
  if(e.request.method !== "GET" || url.origin !== location.origin) return;

  // On ne répond que pour les fichiers de cette application.
  const aMoi = ["TOURNEES.html","manifest-tournees.json",
                "icone-repartition-192.png","icone-repartition-512.png"]
               .some(f => url.pathname.endsWith(f));
  if(!aMoi) return;

  e.respondWith(
    fetch(e.request)
      .then(rep=>{
        const copie = rep.clone();
        caches.open(VERSION).then(c=>c.put(e.request, copie));
        return rep;
      })
      .catch(()=>caches.match(e.request).then(r=>r || caches.match("./TOURNEES.html")))
  );
});
