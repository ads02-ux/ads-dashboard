/* v2-skin.js — ปรับหน้าเดิมทุกหน้าให้เป็นโทนแดชบอร์ดใหม่ (ทำงานเมื่อเปิดเมนูแบบใหม่ html.v2theme เท่านั้น) */
(function () {
  'use strict';
  var VIEWS = ['alertView', 'mainView', 'cohortView', 'commissionView', 'benchmarkView', 'chartrankView', 'aiView', 'adsaiView', 'videoaiView',
    'trackView', 'buyerDemoView', 'fbDisabledView', 'budgetLogView', 'userMgmtView', 'leaveView', 'dailyTaskView', 'chatPageView', 'fbView'];
  var L = 'html.v2theme:not([data-theme="dark"])';
  function sc(sel) { return VIEWS.map(function (v) { return L + ' #' + v + ' ' + sel; }).join(','); }
  function scSelf(extra) { return VIEWS.map(function (v) { return L + ' #' + v + (extra || ''); }).join(','); }

  function css() {
    if (document.getElementById('v2skincss')) return;
    var st = document.createElement('style'); st.id = 'v2skincss';
    st.textContent = [
      scSelf() + '{background:#F5F6FA!important;color:#0F172A}',
      // หัวข้อ / ตัวเลขใหญ่: เลิกตัวหนาพิเศษแบบเดิม
      sc('[style*="font-weight:900"]') + '{font-weight:700!important}',
      sc('[style*="font-weight:800"]') + '{font-weight:700!important}',
      sc('.v2s-title') + '{font-size:26px!important;font-weight:700!important;color:#0F172A!important;line-height:1.25!important;margin-bottom:4px!important}',
      // ตัวอักษรเล็กเกินอ่าน
      sc('[style*="font-size:.6"]') + ',' + sc('[style*="font-size:0.6"]') + '{font-size:12px!important}',
      sc('[style*="font-size:.5"]') + '{font-size:11px!important}',
      // การ์ด / กล่อง
      sc('div[style*="border-radius:12px"]') + ',' + sc('div[style*="border-radius:14px"]') + ',' + sc('div[style*="border-radius:16px"]') + ',' + sc('div[style*="border-radius:18px"]') + ',' + sc('div[style*="border-radius:20px"]') + '{border-radius:12px!important;box-shadow:none!important}',
      sc('div[style*="background:#f8fafc"][style*="border-radius"]') + ',' + sc('div[style*="background:#f8faff"][style*="border-radius"]') + ',' + sc('div[style*="background:#f4f7fe"][style*="border-radius"]') + ',' + sc('div[style*="background:#f1f5ff"][style*="border-radius"]') + '{background:#fff!important;border:1px solid #E5E7EB!important}',
      sc('div[style*="background:#fff"][style*="border-radius"]') + ',' + sc('div[style*="background:#ffffff"][style*="border-radius"]') + ',' + sc('div[style*="background:white"][style*="border-radius"]') + '{border-color:#E5E7EB!important;box-shadow:none!important}',
      sc('div[style*="box-shadow"]') + '{box-shadow:none!important}',
      // ปุ่ม
      sc('button') + '{border-radius:10px!important;font-family:inherit!important}',
      sc('button[style*="background:#0f172a"]') + ',' + sc('button[style*="background:#0F172A"]') + ',' + sc('button[style*="background:#1e293b"]') + ',' + sc('button[style*="background:#1565c0"]') + ',' + sc('button[style*="background:#4f46e5"]') + ',' + sc('button[style*="background:#6366f1"]') + ',' + sc('button[style*="background:#3b82f6"]') + ',' + sc('button[style*="background:#2563eb"]') + '{background:#2563EB!important;border-color:#2563EB!important;color:#fff!important}',
      sc('button[style*="linear-gradient"]') + '{background:#2563EB!important;border-color:#2563EB!important;color:#fff!important}',
      // แท็บกรองแบบเม็ดยา
      sc('button[style*="border-radius:20px"]') + ',' + sc('button[style*="border-radius:99px"]') + ',' + sc('button[style*="border-radius:999px"]') + '{border-radius:99px!important;border-width:1px!important}',
      sc('button[style*="border-radius:20px"][style*="color:#fff"]') + '{background:#2563EB!important;border-color:#2563EB!important}',
      sc('button[style*="border-radius:20px"]:not([style*="color:#fff"])') + '{background:#fff!important;border-color:#E5E7EB!important;color:#0F172A!important}',
      // ช่องกรอก
      sc('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color])') + ',' + sc('select') + ',' + sc('textarea') + '{border:1px solid #D7DBE3!important;border-radius:8px!important;background-color:#fff!important;color:#0F172A!important;font-family:inherit!important}',
      sc('input:focus') + ',' + sc('select:focus') + ',' + sc('textarea:focus') + '{outline:2px solid #2563EB!important;outline-offset:0;border-color:#93C5FD!important}',
      // ตาราง
      sc('table') + '{border-collapse:collapse!important}',
      sc('th') + '{background:#F8FAFC!important;color:#475569!important;font-size:12px!important;font-weight:600!important;text-transform:none!important;letter-spacing:normal!important;border-bottom:1px solid #E5E7EB!important}',
      sc('td') + '{border-color:#EEF1F6!important}',
      sc('tr[style*="background:#0f172a"] td') + ',' + sc('thead[style*="background:#0f172a"] th') + '{background:#F8FAFC!important;color:#475569!important}',
      // แถบหัวสีเข้ม/ไล่สีของหน้าเดิม ให้เป็นกล่องขาว
      sc('div[style*="linear-gradient(135deg,#0f172a"]') + ',' + sc('div[style*="linear-gradient(135deg, #0f172a"]') + ',' + sc('div[style*="background:#0f172a"][style*="border-radius"]') + ',' + sc('div[style*="background:#1e293b"][style*="border-radius"]') + '{background:#fff!important;border:1px solid #E5E7EB!important;color:#0F172A!important}',
      sc('div[style*="linear-gradient(135deg,#0f172a"] *') + ',' + sc('div[style*="background:#0f172a"][style*="border-radius"] *') + ',' + sc('div[style*="background:#1e293b"][style*="border-radius"] *') + '{color:inherit!important}',
      // ระยะขอบหน้า
      scSelf('[style*="padding:28px 32px"]') + '{padding:24px 28px 64px!important}',
      '@media (max-width:640px){' + scSelf() + '{padding:16px!important}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // หัวข้อหน้า: ตัดอิโมจิด้านหน้า + ใช้ขนาดเดียวกับหน้าใหม่
  var EMO = /^(?:\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+/u;
  function fix(root) {
    if (!document.documentElement.classList.contains('v2theme')) return;
    var els = root.querySelectorAll('[style*="font-size:1.4rem"],[style*="font-size:1.5rem"],[style*="font-size:1.6rem"],[style*="font-size:1.7rem"],[style*="font-size:1.8rem"],[style*="font-size:1.9rem"],[style*="font-size:2rem"]');
    for (var i = 0; i < els.length; i++) {
      var e = els[i], s = e.getAttribute('style') || '';
      if (e.getAttribute('data-v2s')) continue;
      e.setAttribute('data-v2s', '1');
      if (!/Rajdhani|font-weight:\s*(800|900)/.test(s)) continue;
      var t = (e.textContent || '').trim();
      if (!t || /^[\d฿,.%+\-–\s]+$/.test(t) || t.length > 80) continue; // ตัวเลข ไม่ใช่หัวข้อ
      e.classList.add('v2s-title');
      var tn = e.firstChild; while (tn && tn.nodeType !== 3) tn = tn.firstChild;
      if (tn && tn.nodeType === 3) { var nv = tn.nodeValue.replace(EMO, ''); if (nv !== tn.nodeValue && nv.trim()) tn.nodeValue = nv; }
    }
  }
  function watch() {
    VIEWS.forEach(function (id) {
      var el = document.getElementById(id); if (!el || el.getAttribute('data-v2skin')) return;
      el.setAttribute('data-v2skin', '1');
      var pend = false;
      new MutationObserver(function () { if (pend) return; pend = true; setTimeout(function () { pend = false; fix(el); }, 30); }).observe(el, { childList: true, subtree: true });
      fix(el);
    });
  }
  function start() {
    if (!document.documentElement.classList.contains('v2theme')) { if ((start.n = (start.n || 0) + 1) < 40) setTimeout(start, 500); return; }
    css(); watch(); setInterval(watch, 3000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
