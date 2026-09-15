/* Service worker — Vestiaires La Table de Cana
   But : rendre l'appli installable (icône PC + téléphone) SANS jamais
   afficher une vieille version. Stratégie "réseau d'abord" : on prend
   toujours la dernière version en ligne ; le cache ne sert que de
   secours quand il n'y a pas de connexion. Ne touche qu'aux fichiers
   vestiaires -> n'affecte pas les autres applis du dépôt. */

const CACHE = "vestiaires-v1";
const FICHIERS = ["vestiaires.html", "manifest-vestiaires.json", "icon-responsable.png"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const cles = await caches.keys();
    await Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // On ne gère QUE les fichiers de l'appli vestiaires ; le reste garde
  // le comportement normal du navigateur.
  if (!/(vestiaires\.html|manifest-vestiaires\.json|icon-responsable\.png)$/.test(url.pathname)) return;

  e.respondWith((async () => {
    try {
      const reseau = await fetch(e.request, { cache: "no-store" });
      const c = await caches.open(CACHE);
      c.put(e.request, reseau.clone());
      return reseau;
    } catch (err) {
      const secours = await caches.match(e.request);
      return secours || Response.error();
    }
  })());
});
