const CACHE_NAME = "sacred-bowl-cache-v1";

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

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );

});

self.addEventListener("fetch", event => {

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );

});