/* =====================================
   Control Operativo – Service Worker
   Next.js Static Export
   Cache Strategies: Intelligent & Explicit
   ===================================== */

const SW_VERSION = 'v1.0.0';
const CACHE_PREFIX = 'control-operativo';

const SHELL_CACHE = `${CACHE_PREFIX}-shell-${SW_VERSION}`;
const DATA_CACHE = `${CACHE_PREFIX}-data-${SW_VERSION}`;

/* ===== SHELL =====
   Archivos mínimos para ARRANCAR la app
*/
const SHELL_ASSETS = [
    '/',
    '/manifest.json',
    '/favicon.ico',
];

/* ===== HELPERS ===== */

function isNavigation(req) {
    return req.mode === 'navigate';
}

function isShellAsset(request) {
    return (
        request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'font' ||
        request.destination === 'image'
    );
}

function isViewRoute(url) {
    return (
        url.pathname.startsWith('/planning') ||
        url.pathname.startsWith('/stats') ||
        url.pathname.startsWith('/settings') ||
        url.pathname.startsWith('/logs')
    );
}

/* ===== INSTALL ===== */

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => {
            return cache.addAll(SHELL_ASSETS);
        })
    );
    // NO skipWaiting() - nueva versión espera reload natural
});

/* ===== ACTIVATE ===== */

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (
                        key.startsWith(CACHE_PREFIX) &&
                        ![SHELL_CACHE, DATA_CACHE].includes(key)
                    ) {
                        return caches.delete(key);
                    }
                })
            )
        )
    );
    self.clients.claim();
});

/* ===== FETCH ===== */

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Solo same-origin
    if (url.origin !== self.location.origin) return;

    /* 1️⃣ Shell assets → Cache First */
    if (isShellAsset(request)) {
        event.respondWith(
            caches.match(request).then((cached) => cached || fetch(request))
        );
        return;
    }

    /* 2️⃣ SPA navigation → Cache First (index.html) */
    if (isNavigation(request)) {
        event.respondWith(
            caches.match('/index.html').then((cached) => cached || fetch(request))
        );
        return;
    }

    /* 3️⃣ Vistas pesadas → Stale While Revalidate */
    if (isViewRoute(url)) {
        event.respondWith(
            caches.open(SHELL_CACHE).then(async (cache) => {
                const cached = await cache.match(request);
                const networkPromise = fetch(request)
                    .then((response) => {
                        cache.put(request, response.clone());
                        return response;
                    })
                    .catch(() => cached);

                return cached || networkPromise;
            })
        );
        return;
    }

    /* 4️⃣ Todo lo demás → Network only */
    // Acciones, mutaciones, etc.
    event.respondWith(fetch(request));
});
