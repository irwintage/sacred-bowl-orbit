const CACHE_NAME = "sacred-bowl-cache-v5";

const ASSETS = [
  "./",
  "./index.html",
  "./tone.js",
  "./sacred-bowl-audio.js",

  "./fonts/cinzel-v26-latin-regular.woff2",
  "./fonts/cinzel-v26-latin-500.woff2",
  "./fonts/inter-v20-latin-300.woff2",
  "./fonts/inter-v20-latin-regular.woff2",
  "./fonts/inter-v20-latin-500.woff2"
];

/* INSTALL */

self.addEventListener("install", event => {

  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );

});

/* ACTIVATE */

self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();

});

/* FETCH */

self.addEventListener("fetch", event => {

  event.respondWith(
    fetch(event.request)
      .then(response => {

        const clone = response.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });

        return response;

      })
      .catch(() => caches.match(event.request))
  );

});
