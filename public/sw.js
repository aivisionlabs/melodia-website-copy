// Dynamic cache version based on build time or deployment
// For Vercel, we can use the deployment timestamp or a build-time variable
const CACHE_VERSION = "v1.0.1753955113443"; // This will be updated by the build script
const CACHE_NAME = `melodia-cache-${CACHE_VERSION}`;

// Assets to cache
const urlsToCache = [
  "/",
  "/index.html",
  "/images/melodia-logo.jpeg",
  "/apple-touch-icon.png",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log(`Service Worker installing with cache: ${CACHE_NAME}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Fetch event - serve from cache when possible, but always check for updates
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip chrome-extension requests
  if (event.request.url.startsWith("chrome-extension://")) {
    return;
  }

  // Skip Vercel analytics and other external requests
  if (
    event.request.url.includes("vercel.com") ||
    event.request.url.includes("clarity.ms") ||
    event.request.url.includes("va.vercel-scripts.com")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Always fetch from network to check for updates
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // If we got a valid response, update the cache
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails, return cached version if available
          return cachedResponse;
        });

      // Return cached version immediately if available, then update
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetchPromise;
    })
  );
});

// Activate event - clean up old caches and take control immediately
self.addEventListener("activate", (event) => {
  console.log(`Service Worker activating with cache: ${CACHE_NAME}`);
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim(),
    ])
  );
});

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
