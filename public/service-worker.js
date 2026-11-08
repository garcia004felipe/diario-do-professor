const CACHE_NAME = 'diario-professor-v7';
const STATIC_CACHE = 'static-v7';
const DYNAMIC_CACHE = 'dynamic-v7';

// Arquivos essenciais para cache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon.svg'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                    .map((name) => caches.delete(name))
            );
        })
    );
    return self.clients.claim();
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar requisições não-GET, APIs de backend e Supabase (deixar a rede cuidar)
    if (
        request.method !== 'GET' ||
        url.pathname.startsWith('/api') ||
        url.pathname.startsWith('/.netlify') ||
        url.origin.includes('supabase.co')
    ) {
        return;
    }

    // Estratégia: Network First, fallback para Cache
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    if (request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});

// Sincronização em background
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    console.log('[SW] Syncing offline data...');
}

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
