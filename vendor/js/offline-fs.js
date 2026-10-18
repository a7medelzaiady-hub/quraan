/* offline-fs.js — يجعل Firestore (النسخة compat) يعمل بدون إنترنت بالكامل
   1) الكتابة تُحفظ محلياً فوراً ولا تنتظر السيرفر (تُرفع تلقائياً عند عودة النت)
   2) القراءة تأتي من الذاكرة المحلية عند انقطاع النت أو بطء الشبكة
   3) مزامنة مستمرة لمجموعة students حتى تكون الذاكرة المحلية كاملة دائماً
   يجب تحميله بعد firebase-firestore-compat.js */
(function () {
  if (!window.firebase || !firebase.firestore) return;
  var FS = firebase.firestore;
  var READ_WAIT = 4000;
  function online() { return navigator.onLine !== false; }

  // الكتابة: تُطبَّق محلياً فوراً؛ نكمل بدون انتظار تأكيد السيرفر
  function localAck(p) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; resolve(); } }, online() ? 2500 : 150);
      p.then(function (v) { if (!done) { done = true; clearTimeout(t); resolve(v); } },
        function (e) {
          if (!done) { done = true; clearTimeout(t); reject(e); }
          else console.warn('تعذّر رفع التعديل للسيرفر لاحقاً:', e);
        });
    });
  }
  function patchWrite(proto, name) {
    var orig = proto && proto[name];
    if (!orig) return;
    proto[name] = function () { return localAck(orig.apply(this, arguments)); };
  }
  patchWrite(FS.DocumentReference && FS.DocumentReference.prototype, 'set');
  patchWrite(FS.DocumentReference && FS.DocumentReference.prototype, 'update');
  patchWrite(FS.DocumentReference && FS.DocumentReference.prototype, 'delete');
  patchWrite(FS.WriteBatch && FS.WriteBatch.prototype, 'commit');
  if (FS.CollectionReference) {
    FS.CollectionReference.prototype.add = function (data) {
      var ref = this.doc();
      return ref.set(data).then(function () { return ref; });
    };
  }

  // القراءة: من الكاش عند انقطاع النت، ومع بطء الشبكة نرجع للكاش
  function patchGet(proto) {
    var orig = proto && proto.get;
    if (!orig) return;
    proto.get = function (opts) {
      if (opts && opts.source) return orig.call(this, opts);
      var self = this;
      if (!online()) return orig.call(self, { source: 'cache' });
      return new Promise(function (resolve, reject) {
        var done = false;
        var t = setTimeout(function () {
          if (done) return;
          orig.call(self, { source: 'cache' }).then(function (s) {
            if (!done) { done = true; resolve(s); }
          }, function () { /* ننتظر السيرفر */ });
        }, READ_WAIT);
        orig.call(self).then(function (s) {
          if (!done) { done = true; clearTimeout(t); resolve(s); }
        }, function (e) {
          if (done) return;
          clearTimeout(t);
          orig.call(self, { source: 'cache' }).then(
            function (s) { done = true; resolve(s); },
            function () { done = true; reject(e); });
        });
      });
    };
  }
  patchGet(FS.Query && FS.Query.prototype);
  patchGet(FS.DocumentReference && FS.DocumentReference.prototype);

  // مزامنة صامتة لمجموعة الطلاب لتبقى النسخة المحلية كاملة
  if (FS.Firestore) {
    var origCollection = FS.Firestore.prototype.collection;
    var synced = {};
    FS.Firestore.prototype.collection = function (path) {
      var c = origCollection.apply(this, arguments);
      if (path === 'students' && !synced[path]) {
        synced[path] = true;
        try { c.onSnapshot(function () {}, function (e) { console.warn('sync:', e && e.code); }); } catch (e) {}
      }
      return c;
    };
  }
})();
