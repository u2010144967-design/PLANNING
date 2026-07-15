/* ═══════════════════════════════════════════════════════════
   SERVICE WORKER — La Table de Cana
   Rôle : rendre les applications INSTALLABLES (critère Chrome)
          et utilisables hors connexion.

   RÈGLES DE SÉCURITÉ (important) :
   1. STRATÉGIE "RÉSEAU D'ABORD" → quand il y a du réseau, on prend
      TOUJOURS la version fraîche de GitHub. Les mises à jour
      continuent donc de fonctionner exactement comme avant.
      Le cache ne sert QUE si le téléphone est hors connexion.
   2. Supabase et les CDN ne sont JAMAIS interceptés (autre domaine).
      Aucun risque pour les données (planning, livraisons, positions).
   3. Seules les requêtes GET du même domaine sont gérées.
═══════════════════════════════════════════════════════════ */

var CACHE = 'cana-v1';

/* Fichiers mis en cache pour le mode hors connexion */
var SHELL = [
  'index.html',
  'PLANNING_MOBILE.html',
  'icon-chauffeur.png',
  'icon-responsable.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      /* addAll échoue en bloc si UN fichier manque → on met en cache
         un par un, en ignorant les erreurs, pour rester robuste */
      return Promise.all(SHELL.map(function(url){
        return c.add(url).catch(function(){ return null; });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(noms){
      return Promise.all(noms.map(function(n){
        if(n !== CACHE) return caches.delete(n);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;

  /* On ne touche QUE les GET */
  if(req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch(err){ return; }

  /* On ne touche PAS Supabase, ni les CDN, ni aucun autre domaine.
     → les données passent en direct, comme si le SW n'existait pas. */
  if(url.origin !== self.location.origin) return;

  /* RÉSEAU D'ABORD, cache en secours uniquement si hors connexion */
  e.respondWith(
    fetch(req).then(function(rep){
      if(rep && rep.status === 200 && rep.type === 'basic'){
        var copie = rep.clone();
        caches.open(CACHE).then(function(c){
          c.put(req, copie).catch(function(){});
        });
      }
      return rep;
    }).catch(function(){
      /* Hors connexion → on sert la version en cache */
      return caches.match(req).then(function(cache){
        if(cache) return cache;
        /* Page non trouvée en cache : on renvoie l'app chauffeur */
        if(req.mode === 'navigate') return caches.match('index.html');
        return new Response('Hors connexion', {
          status: 503,
          headers: {'Content-Type':'text/plain; charset=utf-8'}
        });
      });
    })
  );
});
