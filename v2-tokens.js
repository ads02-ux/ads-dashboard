/* v2-tokens.js — หน้า "ปัญหา TOKEN" (Claude 19 พ.ย. 2569)
   - ไม่แสดงกล่องแดง "❌ FB API: ..." ด้านบนอีก → เก็บไว้ในหน้านี้แทน
   - ปุ่มตรวจทุกบัญชี: ดึง account_status / user_tasks ของทุกบัญชีในแดชบอร์ดด้วย token ของบัญชีนั้น
     แล้วบอกว่าบัญชีไหนดึงข้อมูลไม่ได้ / แก้งบไม่ได้ / ถูกปิด พร้อมสาเหตุและวิธีแก้ */
(function () {
  if (window.tokV2) return;
  var ERR = {}, SCAN = null, SCANNING = false, PROG = 0, TOTAL = 0;
  try { var c = JSON.parse(localStorage.getItem('rb_tok_scan') || 'null'); if (c && c.at && Date.now() - c.at < 864e5) SCAN = c; } catch (e) {}

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function visible() { var v = document.getElementById('tokView'); return v && v.style.display !== 'none'; }
  function ago(t) { var m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'เมื่อสักครู่' : m < 60 ? m + ' นาทีที่แล้ว' : Math.round(m / 60) + ' ชม.ที่แล้ว'; }

  // ---------- ซ่อนกล่องแดง FB API แล้วเก็บไว้ ----------
  function hook() {
    var orig = window.showBanner;
    if (typeof orig !== 'function' || orig._tok) return false;
    var f = function (msg) {
      var m = /^❌ FB API: ([\s\S]*) \(([^()]+)\)\s*$/.exec(String(msg));
      if (m) { ERR[m[2]] = { msg: m[1], at: Date.now() }; badge(); if (visible()) render(); return; }
      return orig.apply(this, arguments);
    };
    f._tok = true; window.showBanner = f;
    var b = document.getElementById('err-banner'); if (b && /FB API:/.test(b.textContent) && !/ชนลิมิต/.test(b.textContent)) b.remove();
    return true;
  }
  if (!hook()) { var hi = setInterval(function () { if (hook()) clearInterval(hi); }, 200); setTimeout(function () { clearInterval(hi); }, 20000); }

  // ---------- สาเหตุ + วิธีแก้ ----------
  var STATUS = { 2: 'บัญชีโฆษณาถูกปิดใช้งาน', 3: 'ค้างชำระเงิน', 7: 'รอ Facebook ตรวจสอบ', 8: 'รอชำระเงิน', 9: 'อยู่ในช่วงผ่อนผัน (ใกล้ถูกปิด)', 100: 'รอปิดบัญชี', 101: 'บัญชีถูกปิดแล้ว' };
  function why(msg, tokName) {
    msg = String(msg || '');
    if (/has NOT grant ads_management or ads_read/i.test(msg)) return {
      k: 'perm', t: 'token ไม่มีสิทธิ์ในบัญชีนี้',
      w: 'ผู้ใช้ระบบของ token "' + tokName + '" ไม่ได้ถูกกำหนดบัญชีโฆษณานี้ หรือเจ้าของบัญชียกเลิกสิทธิ์ — มักเกิดหลังเปลี่ยน token ใหม่',
      f: 'Business Settings → ผู้ใช้ → ผู้ใช้ระบบ → กำหนดสินทรัพย์ → บัญชีโฆษณา → เลือกบัญชีนี้ → ควบคุมเต็ม · ถ้าเลิกใช้บัญชีนี้แล้ว กด "โดนปิด / ติดยืนยัน" ที่การ์ดบัญชีในหน้าเพจ' };
    if (/Error validating access token|Session has expired|has expired|invalid OAuth|access token.*(invalid|expired)|code.?190/i.test(msg)) return {
      k: 'exp', t: 'token หมดอายุ / ถูกยกเลิก',
      w: 'token "' + tokName + '" ใช้ไม่ได้แล้ว (หมดอายุ ผู้ใช้เปลี่ยนรหัสผ่าน หรือถูกยกเลิก) — ทุกบัญชีที่ใช้ token นี้จะดึงข้อมูลไม่ได้',
      f: 'ออก token ใหม่ แล้ววางแทนใน Cloudflare → richbiotech-fb-proxy → Settings → Variables and Secrets → FB_TOKEN_' + tokName };
    if (/no_token_configured/i.test(msg)) return {
      k: 'none', t: 'ยังไม่ได้ตั้ง token ให้บัญชีนี้',
      w: 'ระบบหลังบ้านไม่มี token ชื่อ "' + tokName + '"',
      f: 'เพิ่ม secret FB_TOKEN_' + tokName + ' ใน Cloudflare หรือแจ้ง Claude ให้ผูกบัญชีกับ token ที่มีอยู่' };
    if (/does not exist|cannot be loaded due to missing permissions|Unsupported get request/i.test(msg)) return {
      k: 'perm', t: 'token มองไม่เห็นบัญชีนี้',
      w: 'เลขบัญชีผิด หรือผู้ใช้ระบบของ token "' + tokName + '" ไม่มีสิทธิ์ในบัญชีนี้เลย',
      f: 'เช็กเลขบัญชีโฆษณา แล้วกำหนดบัญชีให้ผู้ใช้ระบบใน Business Settings' };
    if (/request limit|too many calls|rate limit|#613|#17|#4\b/i.test(msg)) return {
      k: 'rate', t: 'ชนลิมิตการเรียก Facebook ชั่วคราว',
      w: 'Facebook จำกัดจำนวนครั้งที่เรียกข้อมูลบัญชีนี้ในช่วงสั้น ๆ',
      f: 'รอสักครู่แล้วกดตรวจใหม่ ไม่ต้องแก้อะไร' };
    return { k: 'other', t: 'Facebook ตอบ error', w: msg.slice(0, 220), f: 'ส่งรูปหน้านี้ให้ Claude ดู' };
  }

  // ---------- รายชื่อบัญชีในแดชบอร์ด ----------
  function accounts() {
    var out = [], seen = {}, marked = {};
    try {
      (window.FB_HIERARCHY || []).forEach(function (p) {
        (p.pages || []).forEach(function (g) {
          (g.accounts || []).forEach(function (h) {
            var mk = false;
            try { mk = typeof _fbAcctStatus !== 'undefined' && !!_fbAcctStatus[_fbAcctKey(p.product, g.name, h.displayName)]; } catch (e) {}
            (h.adAccounts || []).forEach(function (a) {
              if (seen[a]) return; seen[a] = 1; if (mk) { marked[a] = 1; return; }
              out.push({ acc: a, prod: p.product, page: g.name, holder: h.displayName });
            });
          });
        });
      });
    } catch (e) {}
    return { list: out, marked: marked };
  }
  function meta(a) { return (window.FB_ACCOUNTS_META || []).filter(function (m) { return m.name === a; })[0]; }
  function tok(a) { return (window.FB_TOKENS && FB_TOKENS[a]) || (typeof FB_TOKEN !== 'undefined' ? FB_TOKEN : '') || ''; }
  function tokLabel(a) { return (window.FB_TOKENS && FB_TOKENS[a]) || 'ค่าเริ่มต้น (FB_TOKEN)'; }
  function where(a) { var r = null; accounts().list.forEach(function (x) { if (x.acc === a) r = x; }); return r; }

  function scan() {
    if (SCANNING) return; SCANNING = true;
    var L = accounts().list, res = [], i = 0; TOTAL = L.length; PROG = 0; render();
    function one(x) {
      var m = meta(x.acc), t = tok(x.acc);
      if (!m) { res.push({ x: x, kind: 'issue', r: { k: 'none', t: 'ไม่พบเลขบัญชีในระบบ', w: 'บัญชีนี้ไม่มีใน FB_ACCOUNTS_META', f: 'แจ้ง Claude ให้เพิ่มเลขบัญชีโฆษณา' } }); return Promise.resolve(); }
      return fetch(FB_API + m.id + '?fields=name,account_status,disable_reason,user_tasks&account=' + encodeURIComponent(t))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.error) { res.push({ x: x, kind: 'issue', r: why((j.error.error_user_msg || j.error.message || '') + (j.error.code ? ' code ' + j.error.code : ''), t) }); return; }
          if (j.account_status && j.account_status !== 1) { res.push({ x: x, kind: 'acct', r: { k: 'acct', t: STATUS[j.account_status] || ('สถานะบัญชี ' + j.account_status), w: 'ปัญหาที่ตัวบัญชีโฆษณา ไม่ใช่ token', f: 'เข้าไปดูใน Ads Manager · ถ้าเลิกใช้แล้ว กด "โดนปิด / ติดยืนยัน" ที่การ์ดบัญชี' } }); return; }
          var tasks = j.user_tasks || [];
          if (tasks.indexOf('MANAGE') < 0 && tasks.indexOf('ADVERTISE') < 0) res.push({ x: x, kind: 'issue', r: { k: 'ro', t: 'ดูยอดได้ แต่แก้งบ / เปิดปิดไม่ได้', w: 'token "' + t + '" มีสิทธิ์แค่ดูข้อมูลในบัญชีนี้ (เช่น บัญชีส่วนตัวที่ไม่ได้อยู่ใน Business)', f: 'Business Settings → บัญชีโฆษณา → ขอสิทธิ์เข้าถึงบัญชีนี้ แล้วกำหนดให้ผู้ใช้ระบบเป็น "ควบคุมเต็ม"' } });
        })
        .catch(function (e) { res.push({ x: x, kind: 'issue', r: { k: 'other', t: 'เชื่อมต่อไม่ได้', w: e.message, f: 'ลองกดตรวจใหม่' } }); })
        .then(function () { PROG++; if (PROG % 8 === 0 && visible()) render(); });
    }
    function worker() { if (i >= L.length) return Promise.resolve(); var x = L[i++]; return one(x).then(worker); }
    var ws = []; for (var k = 0; k < 6; k++) ws.push(worker());
    Promise.all(ws).then(function () {
      SCANNING = false; SCAN = { at: Date.now(), total: L.length, res: res };
      try { localStorage.setItem('rb_tok_scan', JSON.stringify(SCAN)); } catch (e) {}
      badge(); render();
    });
  }

  function issues() {
    var map = {};
    if (SCAN) SCAN.res.forEach(function (r) { map[r.x.acc] = r; });
    Object.keys(ERR).forEach(function (a) {
      if (map[a]) return; var w = where(a); if (!w) return;
      map[a] = { x: w, kind: 'issue', r: why(ERR[a].msg, tok(a)), live: 1 };
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }
  function badge() {
    var it = document.getElementById('sb-tokens'); if (!it) return;
    var n = issues().filter(function (r) { return r.kind === 'issue' && r.r.k !== 'rate'; }).length;
    var b = it.querySelector('.tok-badge');
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = 'tok-badge'; it.querySelector('.sb-icon').appendChild(b); }
    b.textContent = n > 99 ? '99+' : n;
  }

  function row(r) {
    var x = r.x;
    return '<tr><td><b>' + esc(x.holder) + '</b><div class="tk-dim">' + esc(x.acc) + '</div></td>' +
      '<td>' + esc(x.prod) + '<div class="tk-dim">' + esc(x.page) + '</div></td>' +
      '<td><code>' + esc(tokLabel(x.acc)) + '</code></td>' +
      '<td><span class="tk-pill tk-' + r.r.k + '">' + esc(r.r.t) + '</span><div class="tk-why">' + esc(r.r.w) + '</div></td>' +
      '<td class="tk-fix">' + esc(r.r.f) + '</td></tr>';
  }
  function table(list) {
    return '<div class="tk-card"><table class="tk-tb"><thead><tr><th>บัญชี</th><th>สินค้า / เพจ</th><th>token</th><th>ปัญหา · สาเหตุ</th><th>วิธีแก้</th></tr></thead><tbody>' + list.map(row).join('') + '</tbody></table></div>';
  }
  function render() {
    var box = document.getElementById('tokView'); if (!box || !visible()) return;
    var all = issues(), tokI = all.filter(function (r) { return r.kind === 'issue'; }), acct = all.filter(function (r) { return r.kind === 'acct'; });
    var nMarked = Object.keys(accounts().marked).length;
    var h = '<div class="tk-wrap"><div class="tk-head"><div><h1>ปัญหา TOKEN</h1><div class="tk-sub">บัญชีที่แดชบอร์ดดึงข้อมูลหรือแก้งบไม่ได้ และสาเหตุ · แทนกล่องแดงด้านบนเดิม</div></div>' +
      '<button class="tk-btn"' + (SCANNING ? ' disabled' : '') + ' onclick="tokV2.scan()">' + (SCANNING ? 'กำลังตรวจ ' + PROG + '/' + TOTAL + '…' : 'ตรวจทุกบัญชีอีกครั้ง') + '</button></div>';
    h += '<div class="tk-kpis"><div class="tk-kpi"><small>token มีปัญหา</small><b class="' + (tokI.length ? 'bad' : 'good') + '">' + tokI.length + '</b><span>บัญชี</span></div>' +
      '<div class="tk-kpi"><small>บัญชีโฆษณาถูกปิด / ค้างชำระ</small><b class="' + (acct.length ? 'warn' : 'good') + '">' + acct.length + '</b><span>บัญชี</span></div>' +
      '<div class="tk-kpi"><small>ตรวจแล้ว</small><b>' + (SCAN ? SCAN.total : '–') + '</b><span>' + (SCAN ? ago(SCAN.at) : 'ยังไม่ได้ตรวจ') + '</span></div>' +
      '<div class="tk-kpi"><small>ทำเครื่องหมายโดนปิดแล้ว (ไม่ตรวจ)</small><b>' + nMarked + '</b><span>บัญชี</span></div></div>';
    if (!SCAN && !SCANNING && !tokI.length) h += '<div class="tk-card tk-empty">กด "ตรวจทุกบัญชีอีกครั้ง" เพื่อเช็กสิทธิ์ token ของทุกบัญชี</div>';
    if (tokI.length) h += '<h2>token ใช้กับบัญชีเหล่านี้ไม่ได้</h2>' + table(tokI);
    else if (SCAN) h += '<div class="tk-card tk-empty tk-ok">✓ ทุกบัญชีที่ตรวจ token ใช้งานได้ปกติ</div>';
    if (acct.length) h += '<details class="tk-det"><summary>บัญชีโฆษณาถูกปิด / ค้างชำระ (ไม่ใช่ปัญหา token) · ' + acct.length + ' บัญชี — กดเพื่อดู</summary>' + table(acct) + '</details>';
    h += '<div class="tk-foot tk-dim">ตรวจโดยเรียกข้อมูลบัญชีด้วย token ของบัญชีนั้น 1 ครั้งต่อบัญชี · ไม่แก้ไขอะไรใน Facebook · ผลล่าสุดจำไว้ในเครื่อง 24 ชม.</div></div>';
    box.innerHTML = h;
  }
  function open(el) {
    document.querySelectorAll('[id$="View"]').forEach(function (v) { v.style.display = 'none'; });
    document.querySelectorAll('.sb-item').forEach(function (i) { i.classList.remove('active'); });
    var v = document.getElementById('tokView'); if (v) v.style.display = '';
    var it = el || document.getElementById('sb-tokens'); if (it) it.classList.add('active');
    render(); window.scrollTo(0, 0);
    if (!SCAN && !SCANNING) scan();
  }
  function css() {
    if (document.getElementById('tokcss')) return;
    var s = document.createElement('style'); s.id = 'tokcss';
    s.textContent = [
      '#tokView{background:#F5F6FA;min-height:100vh;color:#0F172A;font-family:"IBM Plex Sans Thai","Sarabun",system-ui,sans-serif}#tokView .tk-wrap{max-width:1280px;margin:0 auto;padding:28px 32px 60px}',
      '#tokView h1{font-size:26px;font-weight:800;margin:0 0 4px}#tokView h2{font-size:16px;font-weight:700;margin:22px 0 10px}#tokView .tk-sub,#tokView .tk-dim{color:#64748B;font-size:13px}',
      '#tokView .tk-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:16px}',
      '#tokView .tk-btn{border:0;background:#2563EB;color:#fff;border-radius:10px;padding:9px 16px;font:inherit;font-size:14px;font-weight:700;cursor:pointer}#tokView .tk-btn:disabled{opacity:.6;cursor:default}',
      '#tokView .tk-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}#tokView .tk-kpi{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:14px 16px}#tokView .tk-kpi small{display:block;font-size:12px;color:#64748B}#tokView .tk-kpi b{font-size:26px;font-weight:800;margin-right:6px}#tokView .tk-kpi span{font-size:12px;color:#64748B}',
      '#tokView b.bad{color:#B91C1C}#tokView b.warn{color:#B45309}#tokView b.good{color:#15803D}',
      '#tokView .tk-card{background:#fff;border:1px solid #E5E7EB;border-radius:14px;overflow:auto}#tokView .tk-empty{padding:28px;text-align:center;color:#64748B;margin-top:16px}#tokView .tk-ok{color:#15803D;font-weight:600}',
      '#tokView .tk-tb{width:100%;border-collapse:collapse;font-size:13.5px;min-width:760px;table-layout:fixed}#tokView .tk-tb th:nth-child(1){width:16%}#tokView .tk-tb th:nth-child(2){width:18%}#tokView .tk-tb th:nth-child(3){width:13%}#tokView .tk-tb th:nth-child(4){width:28%}#tokView .tk-why{margin-top:5px;color:#334155;font-size:12.5px}#tokView .tk-fix{font-size:12.5px;color:#334155}#tokView code{word-break:break-all}#tokView .tk-det{margin-top:22px}#tokView .tk-det summary{cursor:pointer;font-size:15px;font-weight:700;margin-bottom:10px}#tokView .tk-tb th{font-size:12px;color:#64748B;font-weight:600;text-align:left;padding:10px 12px;border-bottom:1px solid #E5E7EB;background:#F8FAFC}#tokView .tk-tb td{padding:10px 12px;border-bottom:1px solid #F1F5F9;vertical-align:top;line-height:1.45}#tokView .tk-tb tr:last-child td{border-bottom:0}',
      '#tokView code{font-size:12px;background:#F1F5F9;border-radius:6px;padding:1px 6px}',
      '#tokView .tk-pill{display:inline-block;font-size:12px;font-weight:700;border-radius:99px;padding:2px 9px;white-space:nowrap}#tokView .tk-perm,#tokView .tk-exp,#tokView .tk-none{background:#FEF2F2;color:#B91C1C}#tokView .tk-ro{background:#FFFBEB;color:#B45309}#tokView .tk-acct{background:#F1F5F9;color:#475569}#tokView .tk-rate,#tokView .tk-other{background:#EFF6FF;color:#1D4ED8}',
      '#tokView .tk-foot{margin-top:16px}',
      '#sb-tokens .sb-icon{position:relative}#sb-tokens .tok-badge{position:absolute;top:-6px;right:-8px;background:#DC2626;color:#fff;font-size:10px;font-weight:700;min-width:16px;height:16px;line-height:16px;border-radius:99px;text-align:center;padding:0 4px}',
      'html.v2dark #tokView,html[data-theme="dark"] #tokView{background:#0B1220;color:#E5E7EB}html.v2dark #tokView .tk-card,html.v2dark #tokView .tk-kpi,html[data-theme="dark"] #tokView .tk-card,html[data-theme="dark"] #tokView .tk-kpi{background:#111827;border-color:#1F2937}',
      '@media (max-width:700px){#tokView .tk-wrap{padding:18px 14px 40px}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  var ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 20 3"/><path d="m16 7 3 3"/><path d="m18.5 4.5 2 2"/></svg>';
  var tries = 0;
  function install() {
    var anchor = document.getElementById('sb-promo') || document.getElementById('sb-ideas'), wrap = document.querySelector('.content-wrap');
    if (!anchor || !wrap) { if (++tries < 80) setTimeout(install, 500); return; }
    if (document.getElementById('sb-tokens')) return;
    css();
    var it = document.createElement('div'); it.className = 'sb-item'; it.id = 'sb-tokens';
    it.innerHTML = '<span class="sb-icon">' + ICON + '</span><span>ปัญหา TOKEN</span>';
    it.onclick = function () { open(it); };
    anchor.parentNode.insertBefore(it, anchor.nextSibling);
    var v = document.createElement('div'); v.id = 'tokView'; v.style.display = 'none';
    wrap.appendChild(v);
    document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('.sb-item'); if (t && t.id !== 'sb-tokens') { var tv = document.getElementById('tokView'); if (tv) tv.style.display = 'none'; it.classList.remove('active'); } }, true);
    badge();
  }
  window.tokV2 = { open: open, scan: scan, render: render, issues: issues };
  install();
})();
