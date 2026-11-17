/* v2-fastload.js — โหลดหน้า Facebook Ads เร็วขึ้น (Claude 17 พ.ย. 2569)
   - เก็บข้อมูลแอด 90 วันของแต่ละบัญชีไว้ในเครื่อง (IndexedDB)
   - เปิดเว็บ: แสดงข้อมูลที่เก็บไว้ทันที แล้วดึงจาก FB ใหม่แค่ 8 วันล่าสุด (ยอดซื้อย้อนหลังยังอัปเดตได้ใน 7 วัน)
   - ไม่มีข้อมูลในเครื่อง / เก่าเกิน 3 วัน → ดึง 90 วันแบบเดิม
   ใช้คู่กับบรรทัดแรกใน _loadFBFromAPI ของ index.html: if(window._fbFastLoad&&window._fbFastLoad(accMeta,accName))return; */
(function () {
  if (window._fbFastLoad) return;
  var DB = 'rbfast', ST = 'acc', RECENT = 8, MAXAGE = 3 * 864e5;
  var cache = null, ready = false, waiting = [], savedRef = {}, db = null, rTimer = null;
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return ymd(d); }
  function finish() { if (ready) return; ready = true; var q = waiting; waiting = []; q.forEach(function (a) { go(a[0], a[1]); }); }
  try {
    var rq = indexedDB.open(DB, 1);
    rq.onupgradeneeded = function () { rq.result.createObjectStore(ST); };
    rq.onsuccess = function () {
      db = rq.result; cache = {};
      try {
        var tx = db.transaction(ST, 'readonly'), s = tx.objectStore(ST), ks = s.getAllKeys(), vs = s.getAll();
        tx.oncomplete = function () { (ks.result || []).forEach(function (k, i) { cache[k] = vs.result[i]; }); finish(); };
        tx.onerror = tx.onabort = function () { cache = {}; finish(); };
      } catch (e) { finish(); }
    };
    rq.onerror = rq.onblocked = function () { finish(); };
  } catch (e) { ready = true; }
  setTimeout(finish, 2500); // อย่ารอนานเกิน ถ้า IndexedDB ช้า/ใช้ไม่ได้

  function url(accMeta, accName, since) {
    var tr = encodeURIComponent('{"since":"' + since + '","until":"' + ymd(new Date()) + '"}');
    return FB_API + accMeta.id + '/insights?fields=campaign_name,adset_name,spend,impressions,reach,clicks,actions,action_values'
      + '&level=adset&time_range=' + tr + '&time_increment=1&limit=500&access_token=' + (FB_TOKENS[accName] || FB_TOKEN);
  }
  function render() { clearTimeout(rTimer); rTimer = setTimeout(function () { try { renderFB(); } catch (e) {} }, 60); }
  function go(accMeta, accName) {
    var c = cache && cache[accName], since90 = daysAgo(89);
    if (c && c.rows && c.rows.length && Date.now() - (c.savedAt || 0) < MAXAGE) {
      var cut = daysAgo(RECENT - 1);
      // แสดงของเดิมทันที
      fbDataMap[accName] = c.rows; savedRef[accName] = c.rows; fbLoadedMap[accName] = true;
      try { var u = document.getElementById('upd'); if (u && !/กำลังอัปเดต/.test(u.textContent)) u.textContent = 'กำลังอัปเดตข้อมูลล่าสุด…'; } catch (e) {}
      render();
      // ดึงเฉพาะ 8 วันล่าสุด แล้วต่อท้ายข้อมูลเก่า (_fetchFBPage จะตั้ง fbDataMap = old + ใหม่ เมื่อเสร็จ)
      var old = c.rows.filter(function (r) { return r.date >= since90 && r.date < cut; });
      _fetchFBPage(url(accMeta, accName, cut), old, accName);
    } else {
      _fetchFBPage(url(accMeta, accName, since90), [], accName);
    }
  }
  window._fbFastLoad = function (accMeta, accName) {
    if (!accMeta || !accName || typeof _fetchFBPage !== 'function') return false;
    if (!ready) { waiting.push([accMeta, accName]); return true; }
    go(accMeta, accName); return true;
  };
  // บันทึกบัญชีที่โหลดเสร็จแล้วลงเครื่อง (ทุก 3 วิ เฉพาะที่เปลี่ยน)
  setInterval(function () {
    if (!db || typeof fbDataMap === 'undefined') return;
    var put = [];
    Object.keys(fbDataMap).forEach(function (k) {
      var d = fbDataMap[k];
      if (Array.isArray(d) && d.length && fbLoadedMap[k] && !_fbLoadingMap[k] && savedRef[k] !== d) put.push(k);
    });
    if (!put.length) return;
    try {
      var tx = db.transaction(ST, 'readwrite'), s = tx.objectStore(ST), now = Date.now();
      put.forEach(function (k) { s.put({ rows: fbDataMap[k], savedAt: now }, k); savedRef[k] = fbDataMap[k]; });
    } catch (e) {}
  }, 3000);
  window._fbFastClear = function () { try { indexedDB.deleteDatabase(DB); } catch (e) {} cache = {}; };
})();
