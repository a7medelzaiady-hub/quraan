const CACHE_NAME = 'quran-center-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manage.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Amiri:ital,wght@0,700;1,700&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js'
];

// تثبيت ملفات التطبيق بالذاكرة المؤقتة
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// تفعيل وتحديث الذاكرة
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// استرجاع الملفات المخزنة عند قطع الشبكة (Cache First with Network Fallback)
self.addEventListener('fetch', (e) => {
  // تجاهل طلبات المزامنة الخاصة بـ Firebase Firestore
  if (e.request.url.includes('firestore.googleapis.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(e.request).then((netResponse) => {
        // تخزين أية ملفات جديدة تلقائياً
        if (e.request.method === 'GET' && netResponse.status === 200) {
          const resClone = netResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return netResponse;
      });
    }).catch(() => {
      // إرجاع صفحة index.html الأساسية عند فتح أية صفحة بدون إنترنت
      if (e.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
