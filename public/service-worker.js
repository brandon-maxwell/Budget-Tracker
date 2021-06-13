const FILES_TO_CACHE = [
  "/",
  "/db.js",
  "/index.js",
  "/manifest.json",
  "/styles.css",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png"
];

const CACHE_NAME = "site-cache-v2";
const DATA_CACHE_NAME = "data-cache-v1";

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches
    .open(CACHE_NAME)
    .then(cache => {
      cache.addAll(FILES_TO_CACHE)
    })
  );
  self.skipWaiting();

});

// The activate handler takes care of cleaning up old caches.
self.addEventListener("activate", function (evt) {
  evt.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            console.log("Removing old cache data", key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  // non GET requests are not cached and requests to other origins are not cached
  if (
    event.request.method !== "GET" ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

 // handle DATA_CACHE_NAME GET requests for data from /api routes
 if (event.request.url.includes("/api/")) {
  // make network request and fallback to cache if network request fails (offline)
  event.respondWith(
    caches.open(DATA_CACHE_NAME).then(async cache => {
      let responseResolved = await fetch(event.request)
        .then(response => {
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => caches.match(event.request));
      return responseResolved;
    })
  );
  return;
}

  // use cache first for all other requests for performance
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // request is not in cache. make network request and cache the response
      return caches.open(DATA_CACHE_NAME).then(cache => {
        return fetch(event.request).then(response => {
          return cache.put(event.request, response.clone()).then(() => {
            return response;
          });
        });
      });
    })
  );
});


// self.addEventListener("fetch", function (evt) {
//   if (evt.request.url.includes("/api/")) {
//     evt.respondWith(
//       caches.open(DATA_CACHE_NAME).then(async cache => {
//         try {
//           const response = await fetch(evt.request);
//           // If the response was good, clone it and store it in the cache.
//           if (response.status === 200) {
//             cache.put(evt.request.url, response.clone());
//           }
//           return response;
//         } catch (err) {
//           return await cache.match(evt.request);
//         }
//       }).catch(err => console.log(err))
//     );

//     return;
//   }

//   evt.respondWith(
//     caches.open(CACHE_NAME).then(cache => {
//       return cache.match(evt.request).then(response => {
//         return response || fetch(evt.request);
//       });
//     })
//   );

//   if (
//     evt.request.method === 'GET' && evt.request.headers.get('accept').includes('text/html')) {
//     console.log('Handling fetch event for', evt.request.url);
//     evt.respondWith(
//       fetch(evt.request.url).catch(error => {
//         // Return the offline page
//         return caches.match('/');
//       })
//     );
//   } else {
//     evt.respondWith(caches.match(evt.request)
//       .then(function (response) {
//         return response || fetch(evt.request);
//       })
//     );
//   }

//   evt.respondWith(
//     caches.open(CACHE_NAME).then( cache => {
//       return cache.match(evt.request).then(response => {
//         return response || fetch(evt.request);
//       });
//     })
//   );
// });