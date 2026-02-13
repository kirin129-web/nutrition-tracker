// =====================================================
// Service Worker - 1日の栄養素チェッカー
// オフライン対応・高速キャッシュ
// =====================================================

const CACHE_NAME = 'nutrition-checker-v1';

// キャッシュするファイル一覧
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// ── インストール時：全アセットをキャッシュ ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] キャッシュを保存中...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      console.log('[SW] インストール完了');
      return self.skipWaiting();
    })
  );
});

// ── アクティベート時：古いキャッシュを削除 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] 古いキャッシュを削除:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      console.log('[SW] アクティベート完了');
      return self.clients.claim();
    })
  );
});

// ── フェッチ時：キャッシュ優先、なければネットワーク ──
self.addEventListener('fetch', event => {
  // chrome-extension などは無視
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse; // キャッシュから返す（オフラインでも動作）
      }
      // キャッシュにない場合はネットワークから取得してキャッシュに追加
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }
        const cloned = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return networkResponse;
      }).catch(() => {
        // オフラインでHTMLリクエストが来た場合はindex.htmlを返す
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
