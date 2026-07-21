// メロ出〜た サービスワーカー
// PWAとして「ホーム画面に追加」できるようにするための必須要件（マニフェスト＋Service Worker）を満たすためのもの。
// 方針：アプリ本体（HTML/CSS/JS一式）だけをキャッシュし、
//       iTunes検索・楽天CD検索・YouTube・Wikipedia・RSSニュース等の外部通信は一切キャッシュせず、
//       常に最新のデータを取得できるようにする。

const CACHE_VERSION = 'melodata-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './img/icon-192.png',
  './img/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn('[SW] キャッシュ初期化に失敗:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // 自分自身のドメイン（アプリ本体）以外は素通し（キャッシュしない）
  if (url.origin !== self.location.origin) return;

  // Network-first、失敗時はキャッシュにフォールバック（オフライン起動用）
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
