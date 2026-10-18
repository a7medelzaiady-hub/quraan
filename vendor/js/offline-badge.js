/* شارة صغيرة تُظهر حالة الاتصال */
(function () {
  function mk() {
    var b = document.createElement('div');
    b.id = 'offline-badge';
    b.style.cssText = 'position:fixed;bottom:10px;left:10px;z-index:99999;padding:6px 12px;border-radius:20px;font:600 12px Tajawal,Cairo,sans-serif;color:#fff;background:#b45309;box-shadow:0 2px 8px rgba(0,0,0,.3);display:none;direction:rtl;pointer-events:none';
    document.body.appendChild(b);
    function upd(showOnline) {
      if (navigator.onLine === false) { b.textContent = '📴 بدون إنترنت — الحفظ محلي وسيُرفع تلقائياً'; b.style.background = '#b45309'; b.style.display = 'block'; }
      else if (showOnline) { b.textContent = '✅ عاد الاتصال — جارٍ رفع البيانات'; b.style.background = '#047857'; b.style.display = 'block'; setTimeout(function () { b.style.display = 'none'; }, 4000); }
      else b.style.display = 'none';
    }
    window.addEventListener('offline', function () { upd(false); });
    window.addEventListener('online', function () { upd(true); });
    upd(false);
  }
  if (document.body) mk(); else document.addEventListener('DOMContentLoaded', mk);
})();
