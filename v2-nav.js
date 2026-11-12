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
    ['โฆษณา', ['Alert', '#sb-fbdisabled', 'ติดตามผล', '#sb-budgetlog']],
    ['AI', ['#sb-adsai', '#sb-ai', '#sb-videoai']],
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
      '#sidebar.v2nav-on .sb-item small,#sidebar.v2nav-on .sb-item .sb-sub{color:#94A3B8!important}',
      '.v2nav-group{margin:2px 0 6px}',
      '.v2nav-head{display:flex;align-items:center;justify-content:space-between;width:100%;border:0;background:transparent;cursor:pointer;padding:12px 20px 4px;font:inherit;font-size:11.5px;font-weight:700;letter-spacing:.02em;color:#64748B;text-align:left}',
      '.v2nav-head:hover{color:#CBD5E1}.v2nav-head i{font-style:normal;transition:transform .15s;font-size:10px}.v2nav-group.fold .v2nav-head i{transform:rotate(-90deg)}.v2nav-group.fold .v2nav-items{display:none}',
      '.v2nav-items .sb-item{border-radius:8px!important}',
      '.v2nav-foot{padding:12px 14px 18px}.v2nav-foot button{width:100%;min-height:36px;border-radius:8px;border:1px solid rgba(148,163,184,.35);background:transparent;color:#94A3B8;font:inherit;font-size:12px;cursor:pointer}.v2nav-foot button:hover{color:#E2E8F0;border-color:#94A3B8}'
    ].join('\n');
    document.head.appendChild(st);
  }


  var IC = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    mega: '<path d="M3 11l15-6v14L3 13z"/><path d="M7 13v5h3"/>',
    bars: '<path d="M4 19V10M10 19V5M16 19v-6M22 19H2"/>',
    line: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    hist: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4"/><path d="M12 13v4M8 21h8M10 17h4"/>',
    cross: '<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    check: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 13l2 2 4-4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    down: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>'
  };
  var ICON_OF = { '#sb-fbv2': 'grid', '#sb-fb': 'mega', 'KPI Overview': 'bars', 'กราฟ': 'line', 'Alert': 'bell', '#sb-fbdisabled': 'ban', 'ติดตามผล': 'target', 'Campaign Log': 'list', '#sb-budgetlog': 'hist', '#sb-adsai': 'spark', '#sb-ai': 'bulb', '#sb-videoai': 'video', 'Content Intel': 'search', '#sb-chatpage': 'chat', '#sb-buyerdemo': 'users', 'Cohort': 'layers', '#sb-benchmark': 'gauge', '#sb-chartrank': 'trophy', 'กลุ่มเป้าหมาย': 'cross', 'Analyst Ranking': 'trophy', '#sb-comm': 'coins', '#sb-leave': 'cal', '#sb-daily': 'check', 'จัดการโปรไฟล์': 'user', 'รีเฟรชข้อมูล': 'refresh', '#sb-usermgmt': 'cog', 'Export': 'down' };
  function setIcon(it, key) {
    var ic = it.querySelector('.sb-icon'); var name = ICON_OF[key]; if (!ic || !name || !IC[name]) return;
    ic.setAttribute('data-emoji', ic.textContent);
    ic.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[name] + '</svg>';
  }

  function findItem(items, key, used) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i]; if (used.indexOf(it) >= 0) continue;
      if (key.charAt(0) === '#' ? it.id === key.slice(1) : label(it).indexOf(key) >= 0) return it;
    }
    return null;
  }


  /* ---------- ธีมทั้งเว็บ + แถบด้านบน (ตามมอคอัพ) ---------- */
  function themeCss() {
    if (document.getElementById('v2themecss')) return;
    var L = 'html.v2theme:not([data-theme="dark"])';
    var st = document.createElement('style'); st.id = 'v2themecss';
    st.textContent = [
      L + '{--bg:#F5F6FA;--bg3:#F8FAFC;--bg4:#EFF4FF;--panel:#FFFFFF;--panel2:#F8FAFC;--panel-border:#E5E7EB;--blue:#2563EB;--blue2:#1D4ED8;--blue-faint:#2563EB14;--r:8px;--r2:12px;--r3:14px}',
      'html.v2theme body{font-family:"IBM Plex Sans Thai","Sarabun",system-ui,sans-serif!important}',
      'html.v2theme body *:not(svg):not(svg *):not(code):not(pre){font-family:"IBM Plex Sans Thai","Sarabun",system-ui,sans-serif!important;letter-spacing:normal!important}',
      L + ' body{background:#F5F6FA!important}' + L + ' body::before,' + L + ' body::after{display:none!important}',
      'html.v2theme footer{display:none!important}',
      L + ' .stitle,' + L + ' th,' + L + ' .klbl,' + L + ' .dpill,' + L + ' .sb-section,' + L + ' .hsub{text-transform:none!important}',
      L + ' .stitle{font-size:16px!important;font-weight:600!important;color:#0F172A!important}' + L + ' .stitle-bar{display:none!important}',
      L + ' thead th,' + L + ' th{background:#FAFBFD!important;color:#475569!important;font-size:12px!important;font-weight:600!important;border-bottom:1px solid #E5E7EB!important}',
      L + ' table{font-size:13px!important}' + L + ' .tw{box-shadow:none!important;border:1px solid #E5E7EB!important;border-radius:12px!important}',
      L + ' .kpi{background:#fff!important;border:1px solid #E5E7EB!important;border-radius:12px!important;box-shadow:none!important}',
      L + ' .kpi .klbl{color:#475569!important;font-size:12px!important;font-weight:500!important}' + L + ' .kpi .kval{color:#0F172A!important;font-weight:700!important}' + L + ' .kpi .kunt{color:#475569!important}' + L + ' .kpi .kicon{display:none!important}',
      L + ' .card{border-radius:12px!important;box-shadow:none!important;border-color:#E5E7EB!important}',
      L + ' .dpill{border-radius:8px!important;font-size:13px!important}',
      'html.v2theme header{background:#fff!important;border-bottom:1px solid #E5E7EB!important;box-shadow:none!important;padding:12px 28px!important;min-height:0!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;flex-wrap:wrap}',
      'html.v2theme header .header-art,html.v2theme header .hlogo{display:none!important}',
      '.v2top-search{position:relative;flex:1 1 260px;max-width:440px}.v2top-search label{display:flex;align-items:center;gap:8px;height:40px;padding:0 12px;border:1px solid #D7DBE3;border-radius:10px;background:#fff;color:#475569}.v2top-search input{flex:1;border:0;outline:0;font:inherit;font-size:14px;background:transparent;color:#0F172A;min-width:0}',
      '.v2top-res{position:absolute;top:46px;left:0;right:0;background:#fff;border:1px solid #E5E7EB;border-radius:12px;box-shadow:0 12px 32px rgba(15,23,42,.14);max-height:360px;overflow:auto;z-index:500;display:none}.v2top-res button{display:block;width:100%;text-align:left;border:0;background:#fff;padding:9px 14px;font:inherit;font-size:13px;cursor:pointer;color:#0F172A}.v2top-res button:hover,.v2top-res button:focus{background:#EFF4FF}.v2top-res small{display:block;color:#475569;font-size:11px}',
      'html.v2theme .hright{gap:10px!important}html.v2theme .live-badge{border-radius:99px!important;background:#DCFCE7!important;border-color:#BBF7D0!important;color:#15803D!important}',
      '.v2top-bell{width:40px;height:40px;border-radius:10px;border:1px solid #E5E7EB;background:#fff;cursor:pointer;color:#334155;display:flex;align-items:center;justify-content:center}.v2top-user{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#0F172A}.v2top-user span:first-child{width:34px;height:34px;border-radius:50%;background:#EFF4FF;color:#1D4ED8;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}',
      '#sidebar.v2nav-on .sb-icon{display:flex!important;align-items:center;justify-content:center;width:18px!important;filter:none!important;opacity:.85!important}#sidebar.v2nav-on .sb-icon svg{display:block}#sidebar.v2nav-on .sb-item.active .sb-icon,#sidebar.v2nav-on .sb-item:hover .sb-icon{opacity:1!important}',
      '#sidebar.v2nav-on .sb-logo-icon{background:#2563EB!important;border:0!important;border-radius:9px!important;width:34px!important;height:34px!important}#sidebar.v2nav-on .sb-logo-icon svg{display:none!important}#sidebar.v2nav-on .sb-logo-icon::after{content:"";width:18px;height:18px;background:no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27white%27 stroke-width=%272.2%27%3E%3Cpath d=%27M4 19V10M10 19V5M16 19v-6M22 19H2%27/%3E%3C/svg%3E")}'
    ].join('\n');
    document.head.appendChild(st);
  }
  function logoText() {
    var n = document.querySelector('#sidebar .sb-logo-name'), sub = document.querySelector('#sidebar .sb-logo-sub');
    if (n) n.textContent = 'Richbiotech Ads'; if (sub) sub.textContent = 'Ads Analytics';
    if (n) { n.style.setProperty('font-size', '15px', 'important'); n.style.setProperty('text-transform', 'none', 'important'); }
  }
  function searchIndex() {
    var out = [];
    if (typeof FB_HIERARCHY === 'undefined') return out;
    FB_HIERARCHY.forEach(function (p, pi) {
      out.push({ t: p.product, s: 'สินค้า', go: [pi] });
      p.pages.forEach(function (pg, gi) {
        out.push({ t: pg.name, s: 'เพจ · ' + p.product, go: [pi, gi] });
        pg.accounts.forEach(function (h, hi) { (h.adAccounts || []).forEach(function (acc) { out.push({ t: h.displayName, s: 'บัญชี · ' + pg.name, k: acc, go: [pi, gi, hi, acc] }); }); });
      });
    });
    return out;
  }
  function goTo(g) {
    var item = document.getElementById('sb-fbv2'); if (!window.fbV2 || !item) return;
    fbV2.open(item); fbV2.product(g[0]); if (g.length > 1) fbV2.page(g[1]); if (g.length > 2) fbV2.acct(g[2], g[3]);
  }
  function topbar() {
    var hdr = document.querySelector('header'); if (!hdr || document.getElementById('v2top')) return;
    var wrap = document.createElement('div'); wrap.className = 'v2top-search'; wrap.id = 'v2top';
    wrap.innerHTML = '<label><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input type="search" aria-label="ค้นหา" placeholder="ค้นหาสินค้า เพจ บัญชีโฆษณา…"></label><div class="v2top-res" role="listbox"></div>';
    hdr.insertBefore(wrap, hdr.querySelector('.hright'));
    var inp = wrap.querySelector('input'), res = wrap.querySelector('.v2top-res'), idx = null;
    function show() {
      var q = inp.value.trim().toLowerCase(); if (!q) { res.style.display = 'none'; return; }
      idx = idx || searchIndex();
      var hits = idx.filter(function (x) { return x.t.toLowerCase().indexOf(q) >= 0 || (x.k && x.k.toLowerCase().indexOf(q) >= 0); }).slice(0, 12);
      res.innerHTML = hits.length ? '' : '<div style="padding:12px 14px;font-size:13px;color:#475569">ไม่พบ</div>';
      hits.forEach(function (x) { var b = document.createElement('button'); b.type = 'button'; b.innerHTML = '<span></span><small></small>'; b.firstChild.textContent = x.t; b.lastChild.textContent = x.s; b.onclick = function () { res.style.display = 'none'; inp.value = ''; goTo(x.go); }; res.appendChild(b); });
      res.style.display = 'block';
    }
    inp.addEventListener('input', show); inp.addEventListener('focus', show);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var b = res.querySelector('button'); if (b) b.click(); } if (e.key === 'Escape') res.style.display = 'none'; });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) res.style.display = 'none'; });
    var hr = hdr.querySelector('.hright');
    if (hr) {
      var bell = document.createElement('button'); bell.type = 'button'; bell.className = 'v2top-bell'; bell.setAttribute('aria-label', 'การแจ้งเตือน');
      bell.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
      bell.onclick = function () { var a = document.getElementById('sb-alert'); if (a) a.click(); };
      var name = ''; try { name = sessionStorage.getItem('rb_username') || ''; } catch (e) {}
      var u = document.createElement('div'); u.className = 'v2top-user';
      u.innerHTML = '<span></span><span></span>'; u.firstChild.textContent = (name || 'U').slice(0, 2).toUpperCase(); u.lastChild.textContent = name || 'ผู้ใช้';
      var tt = document.getElementById('theme-toggle');
      hr.insertBefore(bell, tt || null); hr.appendChild(u);
    }
  }
  function applyTheme() { document.documentElement.classList.add('v2theme'); themeCss(); logoText(); topbar(); }

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
    // เมนูที่เอาออกจากแถบซ้าย (ย้ายไปกล่องซ่อน ไม่ลบ เผื่อโค้ดเดิมอ้างถึง)
    var hid = document.createElement('div'); hid.id = 'v2nav-hidden'; hid.style.display = 'none';
    ['Campaign Log', 'Content Intel'].forEach(function (k) { var it = findItem(items, k, used); if (it) { used.push(it); hid.appendChild(it); } });
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
      gr[1].forEach(function (k) { var it = findItem(items, k, used); if (it) { used.push(it); list.push(it); setIcon(it, k); } });
      if (list.length) group(gr[0], list);
    });
    var rest = items.filter(function (it) { return used.indexOf(it) < 0; });
    if (rest.length) group('อื่น ๆ', rest);
    // ซ่อนหัวข้อ/เส้นคั่นเดิม (ไม่ลบ เผื่อโค้ดเดิมอ้างถึง)
    Array.prototype.slice.call(nav.children).forEach(function (el) { if (el.classList.contains('sb-section') || el.classList.contains('sb-sep')) el.style.display = 'none'; });
    nav.appendChild(frag); nav.appendChild(hid);
    // ชื่อเมนู Facebook Ads
    var v2 = document.getElementById('sb-fbv2'); if (v2) { var s2 = v2.querySelectorAll('span'); if (s2[1]) s2[1].textContent = 'Facebook Ads'; }
    var s1 = first.querySelectorAll('span'); if (s1[1]) s1[1].textContent = 'Facebook Ads (แบบเดิม)';
    var foot = document.createElement('div'); foot.className = 'v2nav-foot';
    foot.innerHTML = '<button type="button">ใช้เมนูแบบเดิม</button>';
    foot.querySelector('button').onclick = function () { set(KEY, 'off'); location.reload(); };
    nav.appendChild(foot);
    nav.setAttribute('data-v2nav', '1');
    var sbar = document.getElementById('sidebar'); if (sbar) sbar.classList.add('v2nav-on');
    try { applyTheme(); } catch (e) { console.warn('v2-theme:', e); }
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
