/* ===== เมนูด้านซ้ายแบบใหม่ (v2) — เพิ่มโดย Claude 12 พ.ย. 2569 =====
   ย้ายปุ่มเมนูเดิมไปจัดกลุ่มใหม่ (ไม่สร้างปุ่มใหม่ → ทุกปุ่มทำงานเหมือนเดิม รวมถึงระบบซ่อนเมนูตามสิทธิ์)
   ปิดได้จากปุ่ม "ใช้เมนูแบบเดิม" ท้ายเมนู (จำในเครื่อง) · ถอดออก: ลบบรรทัด <script src="v2-nav.js"> ใน index.html */
(function () {
  'use strict';
  var KEY = 'rb_nav_v2', FOLD = 'rb_nav_v2_fold';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function label(it) { var spans = it.querySelectorAll('span'); var t = ''; spans.forEach(function (s) { if (!s.classList.contains('sb-icon')) t += ' ' + s.textContent; }); return (t || it.textContent).replace(/\s+/g, ' ').trim(); }

  var GROUPS = [
    ['ภาพรวม', ['#sb-fbv2', '#sb-fb', 'KPI Overview', 'กราฟ']],
    ['โฆษณา', ['Alert', '#sb-fbdisabled', 'ติดตามผล', 'Campaign Log', '#sb-budgetlog']],
    ['AI', ['#sb-adsai', '#sb-ai', '#sb-videoai', 'Content Intel']],
    ['ยอดขาย / แชท', ['#sb-chatpage', '#sb-buyerdemo', 'Cohort']],
    ['วิเคราะห์', ['#sb-benchmark', '#sb-chartrank', 'กลุ่มเป้าหมาย']],
    ['ทีม', ['Analyst Ranking', '#sb-comm', '#sb-leave', '#sb-daily', 'จัดการโปรไฟล์']],
    ['ตั้งค่า', ['รีเฟรชข้อมูล', '#sb-usermgmt', 'Export']]
  ];

  function css() {
    if (document.getElementById('v2navcss')) return;
    if (!document.getElementById('v2font')) { var lk = document.createElement('link'); lk.id = 'v2font'; lk.rel = 'stylesheet'; lk.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap'; document.head.appendChild(lk); }
    var st = document.createElement('style'); st.id = 'v2navcss';
    st.textContent = [
      '#sidebar.v2nav-on{background:#0F172A!important;font-family:"IBM Plex Sans Thai","Sarabun",system-ui,sans-serif}',
      '#sidebar.v2nav-on .sb-logo{border-bottom:1px solid rgba(148,163,184,.15)!important}',
      '#sidebar.v2nav-on .sb-nav{padding:6px 0 0!important}',
      '#sidebar.v2nav-on .sb-item{margin:1px 10px!important;padding:8px 10px!important;border-radius:8px!important;border-left:0!important;font-size:13.5px!important;font-weight:500!important;color:#CBD5E1!important;background:transparent!important;gap:10px!important;font-family:inherit!important}',
      '#sidebar.v2nav-on .sb-item:hover{background:rgba(255,255,255,.07)!important;color:#fff!important}',
      '#sidebar.v2nav-on .sb-item.active{background:#2563EB!important;color:#fff!important;font-weight:600!important;box-shadow:0 1px 2px rgba(0,0,0,.2)}',
      '#sidebar.v2nav-on .sb-icon{font-size:14px!important;width:18px!important;filter:grayscale(1) brightness(1.7);opacity:.75}',
      '#sidebar.v2nav-on .sb-item:hover .sb-icon,#sidebar.v2nav-on .sb-item.active .sb-icon{filter:none;opacity:1}',
      '#sidebar.v2nav-on .sb-item small,#sidebar.v2nav-on .sb-item .sb-sub{color:#94A3B8!important}',
      '.v2nav-group{margin:2px 0 6px}',
      '.v2nav-head{display:flex;align-items:center;justify-content:space-between;width:100%;border:0;background:transparent;cursor:pointer;padding:12px 20px 4px;font:inherit;font-size:11.5px;font-weight:700;letter-spacing:.02em;color:#64748B;text-align:left}',
      '.v2nav-head:hover{color:#CBD5E1}.v2nav-head i{font-style:normal;transition:transform .15s;font-size:10px}.v2nav-group.fold .v2nav-head i{transform:rotate(-90deg)}.v2nav-group.fold .v2nav-items{display:none}',
      '.v2nav-items .sb-item{border-radius:8px!important}',
      '.v2nav-foot{padding:12px 14px 18px}.v2nav-foot button{width:100%;min-height:36px;border-radius:8px;border:1px solid rgba(148,163,184,.35);background:transparent;color:#94A3B8;font:inherit;font-size:12px;cursor:pointer}.v2nav-foot button:hover{color:#E2E8F0;border-color:#94A3B8}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function findItem(items, key, used) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i]; if (used.indexOf(it) >= 0) continue;
      if (key.charAt(0) === '#' ? it.id === key.slice(1) : label(it).indexOf(key) >= 0) return it;
    }
    return null;
  }

  function addTry(nav) {
    if (document.getElementById('v2nav-try')) return;
    var f = document.createElement('div'); f.className = 'v2nav-foot'; f.id = 'v2nav-try';
    f.innerHTML = '<button type="button">✨ ลองเมนูแบบใหม่</button>';
    f.querySelector('button').onclick = function () { set(KEY, 'on'); location.reload(); };
    nav.appendChild(f);
  }

  function build() {
    var first = document.getElementById('sb-fb'); if (!first) return false;
    var nav = first.parentNode;
    if (get(KEY) === 'off') { css(); addTry(nav); return true; }
    if (nav.getAttribute('data-v2nav')) return true;
    var items = Array.prototype.slice.call(nav.querySelectorAll(':scope > .sb-item'));
    if (items.length < 10) return false;
    css();
    var fold = {}; try { fold = JSON.parse(get(FOLD) || '{}') || {}; } catch (e) {}
    var used = [], frag = document.createDocumentFragment();
    function group(title, list) {
      var g = document.createElement('div'); g.className = 'v2nav-group' + (fold[title] ? ' fold' : '');
      var h = document.createElement('button'); h.type = 'button'; h.className = 'v2nav-head'; h.innerHTML = '<span>' + title + '</span><i aria-hidden="true">▾</i>';
      h.setAttribute('aria-expanded', fold[title] ? 'false' : 'true');
      h.onclick = function () { var f = g.classList.toggle('fold'); h.setAttribute('aria-expanded', f ? 'false' : 'true'); fold[title] = f; set(FOLD, JSON.stringify(fold)); };
      var box = document.createElement('div'); box.className = 'v2nav-items';
      list.forEach(function (it) { box.appendChild(it); });
      g.appendChild(h); g.appendChild(box); frag.appendChild(g); return g;
    }
    GROUPS.forEach(function (gr) {
      var list = [];
      gr[1].forEach(function (k) { var it = findItem(items, k, used); if (it) { used.push(it); list.push(it); } });
      if (list.length) group(gr[0], list);
    });
    var rest = items.filter(function (it) { return used.indexOf(it) < 0; });
    if (rest.length) group('อื่น ๆ', rest);
    // ซ่อนหัวข้อ/เส้นคั่นเดิม (ไม่ลบ เผื่อโค้ดเดิมอ้างถึง)
    Array.prototype.slice.call(nav.children).forEach(function (el) { if (el.classList.contains('sb-section') || el.classList.contains('sb-sep')) el.style.display = 'none'; });
    nav.appendChild(frag);
    // ชื่อเมนู Facebook Ads
    var v2 = document.getElementById('sb-fbv2'); if (v2) { var s2 = v2.querySelectorAll('span'); if (s2[1]) s2[1].textContent = 'Facebook Ads'; }
    var s1 = first.querySelectorAll('span'); if (s1[1]) s1[1].textContent = 'Facebook Ads (แบบเดิม)';
    var foot = document.createElement('div'); foot.className = 'v2nav-foot';
    foot.innerHTML = '<button type="button">ใช้เมนูแบบเดิม</button>';
    foot.querySelector('button').onclick = function () { set(KEY, 'off'); location.reload(); };
    nav.appendChild(foot);
    nav.setAttribute('data-v2nav', '1');
    var sbar = document.getElementById('sidebar'); if (sbar) sbar.classList.add('v2nav-on');
    // ซ่อนหัวข้อกลุ่มที่ทุกเมนูถูกซ่อน (ระบบสิทธิ์)
    setInterval(function () {
      nav.querySelectorAll('.v2nav-group').forEach(function (g) {
        var vis = Array.prototype.some.call(g.querySelectorAll('.sb-item'), function (it) { return it.style.display !== 'none'; });
        g.style.display = vis ? '' : 'none';
      });
    }, 1500);
    return true;
  }

  var tries = 0;
  (function wait() {
    tries++;
    var ready = document.getElementById('sb-fb') && (document.getElementById('sb-fbv2') || tries > 20) && document.getElementById('sb-chatpage');
    if (ready) { try { if (build()) return; } catch (e) { console.warn('v2-nav:', e); return; } }
    if (tries < 60) setTimeout(wait, 500);
  })();
})();
