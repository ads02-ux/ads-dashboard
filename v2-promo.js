/* โปรโมชั่นแต่ละสินค้า — เพิ่มโดย Claude 17 พ.ย. 2569
   ข้อมูลโปรอยู่ในไฟล์นี้ (PROMO) · ทุกคนที่ล็อกอินเห็นเมนูนี้ (v2-auth ยกเว้น sb-promo) */
(function () {
  if (window.promoV2) return;
  var UPD = '17 พ.ย. 2569';
  // p = ชื่อสินค้าในแดชบอร์ด (ใช้หาทีม SA) · u = หน่วย · t = [ชื่อโปร, จำนวนรวม (หน่วย), ราคา, หมายเหตุ]
  var PROMO = [
    { n: 'เจ้าขุน (JK)', p: ['เจ้าขุน'], u: 'กล่อง', ship: true, t: [
      ['เซต 1 เดือน · 1 แถม 1', 2, 350], ['เซต 2 เดือน · 2 แถม 2', 4, 650], ['เซต 3 เดือน · 3 แถม 3', 6, 900], ['เซต 4 เดือน · 4 แถม 4', 8, 1150],
      ['เซต 5 เดือน · 5 แถม 5', 10, 1400], ['เซต 8 เดือน · 8 แถม 8', 16, 2150], ['เซต 10 เดือน · 10 แถม 10', 20, 2500], ['เซต 20 เดือน · 20 แถม 20', 40, 4500]],
      txt: '👉 เซต 1 เดือน 1 แถม 1 ราคา 350 ส่งฟรี\n👉 เซต 2 เดือน 2 แถม 2 ราคา 650 ส่งฟรี\n👉 เซต 3 เดือน 3 แถม 3 ราคา 900 ส่งฟรี\n👉 เซต 4 เดือน 4 แถม 4 ราคา 1,150 ส่งฟรี\n👉 เซต 5 เดือน 5 แถม 5 ราคา 1,400 ส่งฟรี\n👉 เซต 8 เดือน 8 แถม 8 ราคา 2,150 ส่งฟรี\n👉 เซต 10 เดือน 10 แถม 10 ราคา 2,500 ส่งฟรี\n👉 เซต 20 เดือน 20 แถม 20 ราคา 4,500 ส่งฟรี' },
    { n: 'THE LORD', p: ['THE LORD'], u: 'กล่อง', t: [
      ['1 กล่อง', 1, 199], ['3 แถม 1', 4, 589], ['4 แถม 2', 6, 759], ['5 แถม 3', 8, 999], ['8 แถม 4', 12, 1399], ['10 แถม 8', 18, 1999]],
      txt: '🛒 1 กล่อง 199 บาท\n🎁 3 แถม 1 เพียง 589.-\n🎁 4 แถม 2 แค่ 759.-\n🎁 5 แถม 3 เพียง 999.-\n🎁 8 แถม 4 แค่ 1,399.-\n👑 10 แถม 8 เพียง 1,999.-' },
    { n: 'Heaven Plus+', p: ['Heavenplus+'], u: 'กล่อง', t: [
      ['โปรเริ่มต้นทดลอง · 5 เม็ด', 0, 199], ['โปรเฉพาะกิจ · 1 แถม 1', 2, 529, 'ส่งฟรี'], ['โปรมัดใจภรรยา · 2 แถม 2', 4, 999, 'ส่งฟรี'],
      ['โปรฟื้นฟูสมรรถภาพ · 4 แถม 4', 8, 1899, 'ส่งฟรี'], ['โปรเห็นผลถาวร · 8 แถม 8', 16, 3199, 'ส่งฟรี'], ['โปรสุดคุ้มระยะยาว · 10 แถม 10', 20, 3799, 'ส่งฟรี']],
      txt: '☕ 🌱 โปรเริ่มต้นทดลอง 5 เม็ด เพียง 199 บาท\n☕ 💥 โปรเฉพาะกิจ 1 แถม 1 เพียง 529.- (ส่งฟรี)\n☕ 🔥 โปรมัดใจภรรยา 2 แถม 2 เพียง 999.- (ส่งฟรี)\n☕ 🌟 โปรฟื้นฟูสมรรถภาพ 4 แถม 4 เพียง 1,899.- (ส่งฟรี)\n☕ 👑 โปรเห็นผลถาวร 8 แถม 8 เพียง 3,199.- (ส่งฟรี)\n☕ 🧡 โปรสุดคุ้มระยะยาว 10 แถม 10 เพียง 3,799.- (ส่งฟรี)' },
    { n: 'WOLF+', p: ['Wolf'], u: 'กล่อง', t: [
      ['1 กล่อง (5 ซอง)', 1, 199], ['3 แถม 1 (รวม 20 ซอง)', 4, 589], ['4 แถม 2 (รวม 30 ซอง)', 6, 759], ['5 แถม 3 (รวม 40 ซอง)', 8, 999], ['8 แถม 4 (รวม 60 ซอง)', 12, 1399], ['10 แถม 8 (รวม 90 ซอง)', 18, 1999]],
      txt: '▪️ 1 กล่อง (5 ซอง) ➔ 199.-\n▪️ 3 แถม 1 (รวม 20 ซอง) ➔ 589.-\n▪️ 4 แถม 2 (รวม 30 ซอง) ➔ 759.-\n▪️ 5 แถม 3 (รวม 40 ซอง) ➔ 999.-\n▪️ 8 แถม 4 (รวม 60 ซอง) ➔ 1,399.-\n▪️ 10 แถม 8 (รวม 90 ซอง) ➔ 1,999.-' },
    { n: 'Olymplus / ขุนแผน', p: ['Olymplus', 'ขุนแผน'], u: 'กล่อง', t: [
      ['1 กล่อง', 1, 199, 'ส่งฟรี'], ['3 แถม 1', 4, 589, 'ส่งฟรี'], ['4 แถม 2', 6, 759, 'ส่งฟรี'], ['5 แถม 3', 8, 999, 'ส่งฟรี'], ['8 แถม 4', 12, 1399, 'ส่งฟรี'], ['10 แถม 8', 18, 1999]],
      txt: '👉 1 กล่อง ราคา 199.- ส่งฟรี\n👉 3 แถม 1 ราคา 589.- ส่งฟรี\n👉 4 แถม 2 ราคา 759.- ส่งฟรี\n👉 5 แถม 3 ราคา 999.- ส่งฟรี\n👉 8 แถม 4 ราคา 1,399.- ส่งฟรี\n👉 10 แถม 8 ราคา 1,999.-' },
    { n: 'OlymplusMax', p: ['OlymplusMax'], u: 'กล่อง', ship: true, t: [
      ['1 กล่อง', 1, 249], ['3 แถม 1', 4, 749], ['4 แถม 2', 6, 899], ['5 แถม 3', 8, 1179], ['8 แถม 4', 12, 1649], ['10 แถม 8', 18, 2299]],
      txt: '👉 1 กล่อง ราคา 249.- ส่งฟรี\n👉 3 แถม 1 ราคา 749.- ส่งฟรี\n👉 4 แถม 2 ราคา 899.- ส่งฟรี\n👉 5 แถม 3 ราคา 1,179.- ส่งฟรี\n👉 8 แถม 4 ราคา 1,649.- ส่งฟรี\n👉 10 แถม 8 ราคา 2,299.- ส่งฟรี' },
    { n: 'JUDO', p: ['JUDO'], u: 'กล่อง', ship: true, t: [
      ['1 แถม 1', 2, 538], ['2 แถม 2', 4, 998], ['3 แถม 3', 6, 1398], ['4 แถม 4', 8, 1898], ['8 แถม 8', 16, 3198], ['10 แถม 10', 20, 3798]],
      txt: '👉 1 แถม 1 ราคา 538.- ส่งฟรี\n👉 2 แถม 2 ราคา 998.- ส่งฟรี\n👉 3 แถม 3 ราคา 1,398.- ส่งฟรี\n👉 4 แถม 4 ราคา 1,898.- ส่งฟรี\n👉 8 แถม 8 ราคา 3,198.- ส่งฟรี\n👉 10 แถม 10 ราคา 3,798.- ส่งฟรี' },
    { n: 'Dragon Blood (DB)', p: ['Dragon Blood'], u: 'กล่อง', ship: true, t: [
      ['1 กล่อง', 1, 290], ['3 แถม 1', 4, 859], ['6 แถม 2', 8, 1599], ['12 แถม 4', 16, 2799]],
      txt: '👉 1 กล่อง ราคา 290.- ส่งฟรี\n👉 3 แถม 1 ราคา 859.- ส่งฟรี\n👉 6 แถม 2 ราคา 1,599.- ส่งฟรี\n👉 12 แถม 4 ราคา 2,799.- ส่งฟรี' },
    { n: 'Liv Care', p: ['LIV CARE'], u: 'กล่อง', t: [
      ['1 กล่อง (10 เม็ด)', 1, 350], ['3 แถม 1 (40 เม็ด)', 4, 999, 'โปรแนะนำ'], ['4 แถม 2 (60 เม็ด)', 6, 1399], ['6 แถม 3 (90 เม็ด)', 9, 1899], ['10 แถม 8 (180 เม็ด)', 18, 3499]],
      txt: '✅ 1 กล่อง (10 เม็ด) = 350.-\n✅ 3 แถม 1 (40 เม็ด) = 999.- (โปรแนะนำ)\n✅ 4 แถม 2 (60 เม็ด) = 1,399.-\n✅ 6 แถม 3 (90 เม็ด) = 1,899.-\n✅ 10 แถม 8 (180 เม็ด) = 3,499.-' },
    { n: 'So Pink', p: ['Sopink'], u: 'กระปุก', t: [
      ['1 กระปุก (20 เม็ด)', 1, 199], ['2 แถม 1 (60 เม็ด)', 3, 399, 'โปรแนะนำ'], ['4 แถม 2 (120 เม็ด)', 6, 759], ['6 แถม 4 (200 เม็ด)', 10, 1159], ['8 แถม 4 (240 เม็ด)', 12, 1399], ['10 แถม 6 (320 เม็ด)', 16, 1799, 'โปรคุ้มที่สุด']],
      txt: '✅ 1 กระปุก (20 เม็ด) 199 บาท\n✅ 2 แถม 1 (60 เม็ด) 399 บาท (โปรแนะนำ)\n✅ 4 แถม 2 (120 เม็ด) 759 บาท\n✅ 6 แถม 4 (200 เม็ด) 1,159 บาท\n✅ 8 แถม 4 (240 เม็ด) 1,399 บาท\n✅ 10 แถม 6 (320 เม็ด) 1,799 บาท 💝 โปรคุ้มที่สุด' },
    { n: 'Bling Blink + Syn Biome', p: ['BLING&SYN'], u: 'กระสอบ', t: [
      ['1 กระสอบ (30 ซอง)', 1, 249], ['2 กระสอบ (60 ซอง)', 2, 449, 'โปรแนะนำ'], ['4 กระสอบ (120 ซอง)', 4, 849], ['6 กระสอบ (180 ซอง)', 6, 1199], ['12 กระสอบ (360 ซอง)', 12, 2290]],
      txt: '✅ 1 กระสอบ (30 ซอง) 249 บาท\n✅ 2 กระสอบ (60 ซอง) 449 บาท (โปรแนะนำ)\n✅ 4 กระสอบ (120 ซอง) 849 บาท\n✅ 6 กระสอบ (180 ซอง) 1,199 บาท\n✅ 12 กระสอบ (360 ซอง) 2,290 บาท' }
  ];
  var S = { q: '', team: '' };
  try { var s0 = JSON.parse(localStorage.getItem('rb_promo_v2') || 'null'); if (s0) S.team = s0.team || ''; } catch (e) {}
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Number(n).toLocaleString('th-TH'); }
  function teamOf(prod) { var M = window.CHAT_SUP_MAP || {}, r = ''; Object.keys(M).forEach(function (k) { if (!r && (M[k] || []).indexOf(prod) >= 0) r = k; }); return r; }
  function teamsOf(x) { var t = []; x.p.forEach(function (p) { var k = teamOf(p); if (k && t.indexOf(k) < 0) t.push(k); }); return t; }
  function visible() { var v = document.getElementById('promoView'); return v && v.style.display !== 'none'; }
  function toast(t) { var el = document.getElementById('promoToast'); if (!el) { el = document.createElement('div'); el.id = 'promoToast'; document.body.appendChild(el); } el.textContent = t; el.className = 'on'; clearTimeout(el._t); el._t = setTimeout(function () { el.className = ''; }, 2500); }

  function card(x, i) {
    var tm = teamsOf(x), free = x.ship;
    var rows = x.t.map(function (r) {
      var per = r[1] ? Math.round(r[2] / r[1]) : 0, note = r[3] || '';
      return '<tr><td>' + esc(r[0]) + (note ? ' <span class="pr-tag' + (/แนะนำ|คุ้ม/.test(note) ? ' hot' : '') + '">' + esc(note) + '</span>' : '') + '</td><td class="num"><b>฿' + fmt(r[2]) + '</b></td><td class="num pr-dim">' + (per ? '฿' + fmt(per) + '/' + esc(x.u) : '–') + '</td></tr>';
    }).join('');
    return '<article class="pr-card"><div class="pr-ch"><div><h2>' + esc(x.n) + '</h2><div class="pr-meta">' + tm.map(function (t) { return '<span class="pr-team">' + esc(t) + '</span>'; }).join('') + (free ? '<span class="pr-free">ส่งฟรีทุกโปร</span>' : '') + '</div></div>' +
      '<button class="pr-copy" onclick="promoV2.copy(' + i + ')" title="คัดลอกข้อความโปรไปวางในแชท">คัดลอก</button></div>' +
      '<table class="pr-tb"><thead><tr><th>โปร</th><th class="num">ราคา</th><th class="num">ตกชิ้นละ</th></tr></thead><tbody>' + rows + '</tbody></table></article>';
  }
  function render() {
    var box = document.getElementById('promoView'); if (!box) return;
    var q = S.q.trim().toLowerCase(), teams = Object.keys(window.CHAT_SUP_MAP || {});
    var L = PROMO.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) {
      if (S.team && teamsOf(o.x).indexOf(S.team) < 0) return false;
      if (q && (o.x.n + ' ' + o.x.p.join(' ') + ' ' + o.x.txt).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var h = '<div class="pr-wrap"><div class="pr-head"><div><h1>โปรโมชั่นแต่ละสินค้า</h1><div class="pr-sub">ราคาโปรที่ใช้ขายอยู่ตอนนี้ · อัปเดต ' + UPD + ' · กด "คัดลอก" เพื่อเอาข้อความโปรไปวางในแชทลูกค้า</div></div>' +
      '<input class="pr-q" type="search" placeholder="ค้นหาสินค้า…" aria-label="ค้นหาสินค้า" value="' + esc(S.q) + '" oninput="promoV2.q(this.value)"></div>' +
      '<div class="pr-bar"><div class="pr-seg" role="group" aria-label="ทีม SA">' + [''].concat(teams).map(function (t) { return '<button class="' + (S.team === t ? 'on' : '') + '" onclick="promoV2.team(' + JSON.stringify(t).replace(/"/g, '&quot;') + ')">' + (t ? esc(t) : 'ทุกทีม') + '</button>'; }).join('') + '</div><span class="pr-dim">' + L.length + ' สินค้า</span></div>';
    h += L.length ? '<div class="pr-grid">' + L.map(function (o) { return card(o.x, o.i); }).join('') + '</div>' : '<div class="pr-card pr-empty">ไม่พบสินค้าที่ค้นหา</div>';
    h += '<div class="pr-foot pr-dim">"ตกชิ้นละ" = ราคา ÷ จำนวนที่ได้รวมของแถม · โปรเปลี่ยนเมื่อไหร่ แจ้งให้แก้ไฟล์ v2-promo.js</div></div>';
    box.innerHTML = h;
  }
  function open(el) {
    document.querySelectorAll('[id$="View"]').forEach(function (v) { v.style.display = 'none'; });
    document.querySelectorAll('.sb-item').forEach(function (i) { i.classList.remove('active'); });
    var v = document.getElementById('promoView'); if (v) v.style.display = '';
    var it = el || document.getElementById('sb-promo'); if (it) it.classList.add('active');
    render(); window.scrollTo(0, 0);
  }
  function css() {
    if (document.getElementById('promocss')) return;
    var s = document.createElement('style'); s.id = 'promocss';
    s.textContent = [
      '#promoView{background:#F5F6FA;min-height:100vh;color:#0F172A}#promoView .pr-wrap{max-width:1280px;margin:0 auto;padding:28px 32px 60px}#promoView h1{font-size:26px;font-weight:800;margin:0 0 4px}#promoView h2{font-size:17px;font-weight:800;margin:0}',
      '#promoView .pr-head{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px}#promoView .pr-head>div{flex:1;min-width:260px}#promoView .pr-sub,#promoView .pr-dim{color:#64748B;font-size:13px}',
      '#promoView .pr-q{border:1px solid #CBD5E1;border-radius:10px;padding:9px 12px;font:inherit;font-size:14px;min-width:220px;background:#fff}',
      '#promoView .pr-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}#promoView .pr-seg{display:inline-flex;background:#EEF0F4;border-radius:10px;padding:3px;gap:2px;flex-wrap:wrap}#promoView .pr-seg button{border:0;background:none;padding:6px 12px;border-radius:7px;font:inherit;font-size:14px;color:#334155;cursor:pointer}#promoView .pr-seg button.on{background:#fff;color:#0F172A;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.08)}',
      '#promoView .pr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px}#promoView .pr-card{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(15,23,42,.04)}#promoView .pr-empty{text-align:center;color:#64748B;padding:40px}',
      '#promoView .pr-ch{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px}#promoView .pr-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}',
      '#promoView .pr-team{font-size:12px;font-weight:700;background:#ECFEFF;color:#155E75;border:1px solid #A5F3FC;padding:2px 9px;border-radius:99px}#promoView .pr-free{font-size:12px;font-weight:700;background:#F0FDF4;color:#166534;border:1px solid #BBF7D0;padding:2px 9px;border-radius:99px}',
      '#promoView .pr-copy{border:1px solid #BFDBFE;background:#EFF6FF;color:#1D4ED8;border-radius:9px;padding:6px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;flex:none}#promoView .pr-copy:hover{background:#DBEAFE}',
      '#promoView .pr-tb{width:100%;border-collapse:collapse;font-size:14px}#promoView .pr-tb th{font-size:12px;color:#64748B;font-weight:600;text-align:left;padding:6px 4px;border-bottom:1px solid #E5E7EB}#promoView .pr-tb td{padding:7px 4px;border-bottom:1px solid #F1F5F9;vertical-align:top}#promoView .pr-tb tr:last-child td{border-bottom:0}#promoView .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}',
      '#promoView .pr-tag{font-size:11px;font-weight:700;color:#475569;background:#F1F5F9;border-radius:99px;padding:1px 7px;white-space:nowrap}#promoView .pr-tag.hot{color:#9A3412;background:#FFEDD5}#promoView .pr-foot{margin-top:16px}',
      '#promoToast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0F172A;color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;opacity:0;pointer-events:none;transition:.2s;z-index:9500}#promoToast.on{opacity:1}',
      'html.v2dark #promoView,html[data-theme="dark"] #promoView{background:#0B1220;color:#E5E7EB}html.v2dark #promoView .pr-card,html[data-theme="dark"] #promoView .pr-card{background:#111827;border-color:#1F2937}',
      '@media (max-width:700px){#promoView .pr-wrap{padding:18px 14px 40px}#promoView .pr-grid{grid-template-columns:1fr}#promoView .pr-q{width:100%}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  var ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>';
  var tries = 0;
  function install() {
    var anchor = document.getElementById('sb-ideas') || document.getElementById('sb-issues'), wrap = document.querySelector('.content-wrap');
    if (!anchor || !wrap) { if (++tries < 80) setTimeout(install, 500); return; }
    if (!document.getElementById('sb-ideas') && ++tries < 40) { setTimeout(install, 500); return; }
    if (document.getElementById('sb-promo')) return;
    css();
    var it = document.createElement('div'); it.className = 'sb-item'; it.id = 'sb-promo';
    it.innerHTML = '<span class="sb-icon">' + ICON + '</span><span>โปรโมชั่นแต่ละสินค้า</span>';
    it.onclick = function () { open(it); };
    anchor.parentNode.insertBefore(it, anchor.nextSibling);
    var v = document.createElement('div'); v.id = 'promoView'; v.style.display = 'none';
    wrap.appendChild(v);
    document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('.sb-item'); if (t && t.id !== 'sb-promo') { var pv = document.getElementById('promoView'); if (pv) pv.style.display = 'none'; it.classList.remove('active'); } }, true);
  }
  function save() { try { localStorage.setItem('rb_promo_v2', JSON.stringify({ team: S.team })); } catch (e) {} }
  window.promoV2 = {
    q: function (v) { S.q = v; var pos = document.activeElement && document.activeElement.selectionStart; render(); var i = document.querySelector('#promoView .pr-q'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) {} } },
    team: function (t) { S.team = t; save(); render(); },
    copy: function (i) {
      var x = PROMO[i]; if (!x) return; var t = x.txt;
      var done = function () { toast('คัดลอกโปร ' + x.n + ' แล้ว'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { fb(t); done(); }); else { fb(t); done(); }
      function fb(s) { var a = document.createElement('textarea'); a.value = s; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); }
    },
    open: function () { open(); },
    data: PROMO
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
