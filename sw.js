/* Service worker de «Mis gastos».
   Guarda la app entera para que funcione sin internet.
   Los DATOS no pasan por aquí: viven en localStorage, dentro del móvil. */

/* La versión sube cada vez que cambia la app: al cambiar el nombre, «activate» borra la caché
   vieja y el móvil se queda con la nueva. Sin esto, un iPhone que ya tenga la app instalada
   podría seguir sirviendo la versión antigua desde su copia. */
const CACHE = "gastos-v3";
const FICHEROS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll falla entero si un solo fichero falta, así que se añaden de uno en uno.
      .then(c => Promise.all(FICHEROS.map(f => c.add(f).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;

  // Navegación: primero la red (para coger una versión nueva), con la copia como respaldo.
  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req)
        .then(r => {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copia));
          return r;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // El resto: primero la copia, y se refresca por detrás.
  e.respondWith(
    caches.match(req).then(hit => {
      const red = fetch(req).then(r => {
        if(r && r.status === 200 && r.type === "basic"){
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return r;
      }).catch(() => hit);
      return hit || red;
    })
  );
});
