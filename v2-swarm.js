/* แนะนำตัวรุมยิง — เพิ่มโดย Claude 17 พ.ย. 2569
   คัดแคมเปญที่น่าเอาไปรุมยิงของแต่ละสินค้า วันละ 4–6 ตัว (ตัวใหม่ + ตัวเก่า) จากข้อมูลแอดในแดชบอร์ด (fbDataMap)
   ติ๊ก "รุมแล้ว" เก็บใน Worker /_auth/swarm/* (KV swarm:list) → ไม่แนะนำคลิปเดิมซ้ำ 3 วัน */
(function () {
  if (window.swarmV2) return;
  var API = 'https://richbiotech-fb-proxy.ads02.workers.dev/_auth/swarm/';
  var HIDE_DAYS = 3;
  var S = { prod: '', marks: [], loaded: false, busy: {}, err: '', mv: null, open: {} };
  try { var s0 = JSON.parse(localStorage.getItem('rb_swarm_v2') || 'null'); if (s0) S.prod = s0.prod || ''; } catch (e) {}
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jsq(s) { return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }
  function fmt(n) { return Math.round(n).toLocaleString('th-TH'); }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function ago(n) { var d = new Date(); d.setDate(d.getDate() - n); return ymd(d); }
  function tok() { try { return localStorage.getItem('rb_auth_token') || ''; } catch (e) { return ''; } }
  function me() { try { return sessionStorage.getItem('rb_username') || ''; } catch (e) { return ''; } }
  function isAdmin() { try { return sessionStorage.getItem('rb_auth') === '1'; } catch (e) { return false; } }
  function post(path, body) {
    body = body || {}; body.token = tok();
    return fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error || ('HTTP ' + r.status)); e.code = j.error; throw e; } return j; }); });
  }
  function errMsg(e) { var c = e && e.code; return c === 'unauthorized' ? 'หมดเวลาเข้าสู่ระบบ ให้ออกแล้วเข้าสู่ระบบใหม่' : c === 'forbidden' ? 'ยกเลิกได้เฉพาะคนที่ติ๊กไว้ หรือแอดมิน' : 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'; }
  function toast(t, bad) { var el = document.getElementById('swToast'); if (!el) { el = document.createElement('div'); el.id = 'swToast'; document.body.appendChild(el); } el.textContent = t; el.className = bad ? 'bad on' : 'on'; clearTimeout(el._t); el._t = setTimeout(function () { el.className = ''; }, 3000); }
  // คลิปเดียวกัน = เลขโพสต์เดียวกัน (ถ้ามีในชื่อ) ไม่งั้นใช้ชื่อที่ตัดเลขลำดับ/วันที่/ver ออก
  function clipKey(n) {
    var m = String(n).match(/12\d{13,17}/); if (m) return 'p' + m[0];
    return String(n).replace(/(ลุมยิง|รุมยิง).*$/, '').replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '').replace(/ver\s*\d+/ig, '')
      .replace(/[*()]+/g, ' ').replace(/(^|\s|-)\d{1,3}\.\s*/g, ' ').replace(/-{2,}/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50);
  }
  function loadingCount() { var n = 0; try { for (var k in _fbLoadingMap) if (_fbLoadingMap[k]) n++; } catch (e) {} return n; }
  function accInfo() {
    var A = {}, mv = S.mv || {};
    (window.FB_HIERARCHY || []).forEach(function (p) { (p.pages || []).forEach(function (pg) { (pg.accounts || []).forEach(function (ac) { var m = mv[ac.displayName]; (ac.adAccounts || []).forEach(function (a) { A[a] = { prod: (m && m.product) || p.product, page: (m && m.page) || pg.name }; }); }); }); });
    return A;
  }
  function campaigns() {
    var A = accInfo(), T = ago(0), Y = ago(1), D3 = ago(3), D7 = ago(7), C = {};
    Object.keys(window.fbDataMap || {}).forEach(function (a) {
      var rows = fbDataMap[a]; if (!Array.isArray(rows) || !A[a]) return;
      rows.forEach(function (r) {
        var k = a + '|' + r.campaign, c = C[k];
        if (!c) c = C[k] = { a: a, camp: r.campaign, prod: A[a].prod, page: A[a].page, first: '9', last: '0', y: [0, 0, 0, 0], d3: [0, 0, 0, 0], d7: [0, 0, 0, 0], t: [0, 0, 0, 0], all: [0, 0, 0, 0] };
        if (r.spend > 0) { if (r.date < c.first) c.first = r.date; if (r.date > c.last) c.last = r.date; }
        function add(x) { x[0] += r.spend || 0; x[1] += r.revenue || 0; x[2] += r.purchases || 0; x[3] += r.conversations || 0; }
        if (r.date === T) add(c.t); if (r.date === Y) add(c.y);
        if (r.date >= D3 && r.date < T) add(c.d3); if (r.date >= D7 && r.date < T) add(c.d7); if (r.date < T) add(c.all);
      });
    });
    return Object.keys(C).map(function (k) { return C[k]; }).filter(function (c) { return c.last >= Y; });
  }
  function R(x) { return x[0] > 0 ? x[1] / x[0] : 0; }
  function marked(prod) { var lim = ago(HIDE_DAYS - 1); return S.marks.filter(function (m) { return m.prod === prod && m.meta && m.meta.date >= lim; }); }
  function pick(L) {
    var D7 = ago(7), P = {};
    L.forEach(function (c) { var p = P[c.prod] = P[c.prod] || { s: 0, v: 0, b: 0, n: 0 }; p.s += c.d7[0]; p.v += c.d7[1]; p.b += c.d7[2]; p.n++; });
    var out = {};
    Object.keys(P).forEach(function (prod) {
      var p = P[prod], pr = p.s ? p.v / p.s : 1, pc = p.b ? p.s / p.b : 1e9, hide = {}, cnt = {};
      marked(prod).forEach(function (m) { hide[m.meta.k] = m; });
      L.filter(function (c) { return c.prod === prod; }).forEach(function (c) { var k = clipKey(c.camp); cnt[k] = (cnt[k] || 0) + 1; });
      var cs = L.filter(function (c) { return c.prod === prod; }).map(function (c) {
        var isNew = c.first >= D7, base = isNew ? c.all : c.d7, r7 = R(base), r3 = R(c.d3), ry = R(c.y), b = base[2], cpa = b ? base[0] / b : 1e9, tier = 0, why = [];
        if (isNew) { if (b >= 3 && r7 >= Math.max(1.8, 1.25 * pr) && r3 >= Math.max(1.4, pr)) tier = 1; }
        else if (b >= 5 && r7 >= Math.max(1.6, 1.15 * pr) && r3 >= Math.max(1.3, 0.95 * pr) && cpa <= 1.25 * pc) tier = 1;
        if (!tier && b >= 3 && r7 >= Math.max(1.3, pr) && r3 >= 1.2) tier = 2;
        if (r7 >= 1.5 * pr) why.push('ROAS สูงกว่าค่าเฉลี่ยสินค้า ' + (r7 / pr).toFixed(1) + ' เท่า'); else if (r7 > pr) why.push('ROAS ดีกว่าค่าเฉลี่ยสินค้า');
        if (r3 > r7 * 1.1) why.push('3 วันล่าสุดกำลังขึ้น');
        if (cpa < 0.8 * pc) why.push('ต้นทุนต่อซื้อถูกกว่าค่าเฉลี่ย');
        if (isNew) why.push('ตัวใหม่ (เริ่ม ' + c.first.slice(8) + '/' + c.first.slice(5, 7) + ') ขายแล้ว ' + b + ' ครั้ง'); else if (b >= 20) why.push('ขายสม่ำเสมอ ' + b + ' ครั้ง/7 วัน');
        var score = 0.45 * Math.min(r7 / pr, 3) + 0.35 * Math.min(r3 / pr, 3) + 0.2 * Math.min(ry / pr, 3) + 0.15 * Math.log(1 + b) / Math.LN10 - 0.2 * Math.max(0, cpa / pc - 1);
        return { c: c, isNew: isNew, r7: r7, r3: r3, ry: ry, b: b, cpa: cpa, chat: base[3] ? base[0] / base[3] : 0, spend: base[0], tier: tier, score: score, k: clipKey(c.camp), why: why };
      }).filter(function (x) { return x.tier; });
      cs.sort(function (a, b) { return a.tier - b.tier || b.score - a.score; });
      var seen = {}, res = [], nn = 0, hid = 0;
      cs.forEach(function (x) {
        if (seen[x.k]) return; seen[x.k] = 1;
        if (hide[x.k]) { hid++; return; }
        if (res.length >= 6 || (x.isNew && nn >= 3) || (x.tier === 2 && res.length >= 4)) return;
        if (x.isNew) nn++; x.dup = cnt[x.k] || 1; res.push(x);
      });
      out[prod] = { pr: pr, pc: pc, n: p.n, list: res, hidden: hid };
    });
    return out;
  }
  function loadMarks(quiet) {
    if (!tok()) return;
    post('list').then(function (j) { S.marks = (j.list || []).filter(function (x) { return x.dir === 'swarm'; }); S.loaded = true; S.err = ''; if (visible()) render(); })
      .catch(function (e) { if (!quiet) S.err = errMsg(e); S.loaded = true; if (visible()) render(); });
  }
  function visible() { var v = document.getElementById('swarmView'); return v && v.style.display !== 'none'; }

  function render() {
    var box = document.getElementById('swarmView'); if (!box) return;
    var h = '<div class="sw-wrap"><div class="sw-head"><div><h1>แนะนำตัวรุมยิง</h1><div class="sw-sub">AI คัดแคมเปญที่น่าเอาไปรุมยิงของแต่ละสินค้า (ตัวใหม่ + ตัวเก่า) จากข้อมูลถึงเมื่อวาน · ' + esc(ago(0).split('-').reverse().join('/')) + ' · ติ๊ก "รุมแล้ว" แล้วคลิปนั้นจะไม่ถูกแนะนำซ้ำ ' + HIDE_DAYS + ' วัน</div></div>' +
      '<button class="sw-btn" onclick="swarmV2.reload()">โหลดใหม่</button></div>';
    if (!tok()) { box.innerHTML = h + '<div class="sw-card sw-empty">หน้านี้ใช้ได้เมื่อเข้าสู่ระบบแบบใหม่</div></div>'; return; }
    var nl = loadingCount(), L = campaigns();
    if (!L.length) { box.innerHTML = h + '<div class="sw-card sw-empty">กำลังโหลดข้อมูลแอด… (' + nl + ' บัญชี)</div></div>'; setTimeout(function () { if (visible()) render(); }, 1500); return; }
    if (nl > 5) setTimeout(function () { if (visible()) render(); }, 2000);
    var R0 = pick(L), prods = Object.keys(R0).sort(function (a, b) { return R0[b].n - R0[a].n; });
    var CH = window.CHAT_SUP_MAP || {}, order = []; Object.keys(CH).forEach(function (t) { (CH[t] || []).forEach(function (p) { if (R0[p] && order.indexOf(p) < 0) order.push(p); }); }); prods.forEach(function (p) { if (order.indexOf(p) < 0) order.push(p); });
    if (S.prod && !R0[S.prod]) S.prod = '';
    h += '<div class="sw-bar"><div class="sw-seg" role="group" aria-label="สินค้า">' + [''].concat(order).map(function (p) { var n = p ? R0[p].list.length : 0; return '<button class="' + (S.prod === p ? 'on' : '') + '" onclick="swarmV2.prod(' + esc(jsq(p)) + ')">' + (p ? esc(p) + ' <span class="sw-n">' + n + '</span>' : 'ทุกสินค้า') + '</button>'; }).join('') + '</div></div>';
    if (nl > 5) h += '<div class="sw-note">ข้อมูลแอดยังโหลดไม่ครบ (' + nl + ' บัญชี) รายการอาจเปลี่ยนเล็กน้อย</div>';
    if (S.err) h += '<div class="sw-card sw-err">' + esc(S.err) + '</div>';
    (S.prod ? [S.prod] : order).forEach(function (p) {
      var g = R0[p], mk = marked(p);
      h += '<section class="sw-card sw-prod"><div class="sw-ph"><h2>' + esc(p) + '</h2><span class="sw-dim">ROAS เฉลี่ยสินค้า 7 วัน ' + g.pr.toFixed(2) + ' · ต้นทุน/ซื้อเฉลี่ย ฿' + fmt(g.pc) + ' · แคมเปญที่วิ่งอยู่ ' + g.n + '</span></div>';
      if (!g.list.length) h += '<div class="sw-empty2">วันนี้ยังไม่มีตัวที่ผ่านเกณฑ์' + (g.hidden ? ' (ซ่อนตัวที่รุมแล้ว ' + g.hidden + ' ตัว)' : '') + '</div>';
      else {
        h += '<div class="sw-tw"><table class="sw-tb"><thead><tr><th>#</th><th>แคมเปญ</th><th class="num">ROAS<br><span>เมื่อวาน / 3 วัน / 7 วัน</span></th><th class="num">ซื้อ</th><th class="num">ต้นทุน/ซื้อ</th><th class="num">ค่าแอด</th><th class="num">คลิปนี้วิ่งอยู่</th><th>รุมแล้ว</th></tr></thead><tbody>';
        g.list.forEach(function (x, i) {
          var c = x.c, id = c.a + '|' + c.camp;
          h += '<tr><td class="sw-rank">' + (i + 1) + '</td><td><div class="sw-cn"><span class="sw-tag ' + (x.isNew ? 'new' : 'old') + '">' + (x.isNew ? 'ตัวใหม่' : 'ตัวเก่า') + '</span>' + (x.tier === 2 ? '<span class="sw-tag t2">ตัวสำรอง</span>' : '') + '<b title="' + esc(c.camp) + '">' + esc(c.camp) + '</b></div>' +
            '<div class="sw-dim">' + esc(c.a) + ' · ' + esc(c.page) + '</div><div class="sw-why">' + esc(x.why.join(' · ')) + '</div></td>' +
            '<td class="num"><span class="' + (x.ry >= g.pr ? 'g' : 'r') + '">' + x.ry.toFixed(2) + '</span> / <b>' + x.r3.toFixed(2) + '</b> / <b>' + x.r7.toFixed(2) + '</b></td>' +
            '<td class="num">' + x.b + '</td><td class="num">฿' + fmt(x.cpa) + '</td><td class="num">฿' + fmt(x.spend) + '</td><td class="num">' + x.dup + ' ตัว</td>' +
            '<td><label class="sw-chk"><input type="checkbox" ' + (S.busy[id] ? 'disabled ' : '') + 'onchange="swarmV2.mark(' + esc(jsq(p)) + ',' + esc(jsq(c.a)) + ',' + esc(jsq(c.camp)) + ',this)"> รุมแล้ว</label></td></tr>';
        });
        h += '</tbody></table></div>';
      }
      if (mk.length) {
        h += '<div class="sw-done"><div class="sw-dim">รุมแล้ว (ไม่แนะนำซ้ำ ' + HIDE_DAYS + ' วัน)</div>' + mk.map(function (m) {
          var can = isAdmin() || m.by === me();
          return '<div class="sw-dr"><span class="sw-tag done">✓ รุมแล้ว</span> <span title="' + esc(m.camp) + '">' + esc(String(m.camp || '').slice(0, 70)) + '</span> <span class="sw-dim">· ' + esc(m.by) + ' · ' + esc((m.meta.date || '').split('-').reverse().slice(0, 2).join('/')) + '</span>' + (can ? ' <button class="sw-undo" onclick="swarmV2.undo(' + esc(jsq(m.id)) + ')">ยกเลิก</button>' : '') + '</div>';
        }).join('') + '</div>';
      }
      h += '</section>';
    });
    h += '<div class="sw-foot sw-dim"><b>เกณฑ์:</b> ตัวเก่า = ซื้อ ≥ 5 ครั้งใน 7 วัน · ROAS 7 วัน ≥ 1.6 และ ≥ 1.15 เท่าของค่าเฉลี่ยสินค้า · 3 วันล่าสุดยังดี · ต้นทุน/ซื้อไม่เกิน 1.25 เท่าของค่าเฉลี่ย ' +
      '· ตัวใหม่ (เริ่มไม่เกิน 7 วัน) = ซื้อ ≥ 3 ครั้ง · ROAS ≥ 1.8 และ ≥ 1.25 เท่าของค่าเฉลี่ย · คลิปเดียวกันเลือกแค่ตัวที่ดีที่สุด · ไม่ครบ 4 ตัวจะเติม "ตัวสำรอง" (ROAS ≥ ค่าเฉลี่ยสินค้า) · ROAS = ยอดขายใน FB ÷ ค่าแอด</div></div>';
    box.innerHTML = h;
  }
  function open(el) {
    document.querySelectorAll('[id$="View"]').forEach(function (v) { v.style.display = 'none'; });
    document.querySelectorAll('.sb-item').forEach(function (i) { i.classList.remove('active'); });
    var v = document.getElementById('swarmView'); if (v) v.style.display = '';
    var it = el || document.getElementById('sb-swarm'); if (it) it.classList.add('active');
    if (!S.mv) fetch('https://richbiotech-fb-proxy.ads02.workers.dev/_acctmove').then(function (r) { return r.json(); }).then(function (j) { S.mv = j.map || {}; render(); }).catch(function () { S.mv = {}; });
    render(); loadMarks(); window.scrollTo(0, 0);
  }
  function css() {
    if (document.getElementById('swcss')) return;
    var s = document.createElement('style'); s.id = 'swcss';
    s.textContent = [
      '#swarmView{background:#F5F6FA;min-height:100vh;color:#0F172A}#swarmView .sw-wrap{max-width:1320px;margin:0 auto;padding:28px 32px 60px}#swarmView h1{font-size:26px;font-weight:800;margin:0 0 4px}#swarmView h2{font-size:18px;font-weight:800;margin:0}',
      '#swarmView .sw-head{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px}#swarmView .sw-head>div{flex:1;min-width:260px}#swarmView .sw-sub,#swarmView .sw-dim{color:#64748B;font-size:13px}',
      '#swarmView .sw-btn{border:1px solid #CBD5E1;background:#fff;border-radius:9px;padding:8px 14px;font:inherit;font-size:14px;cursor:pointer}',
      '#swarmView .sw-bar{margin-bottom:12px}#swarmView .sw-seg{display:inline-flex;background:#EEF0F4;border-radius:10px;padding:3px;gap:2px;flex-wrap:wrap}#swarmView .sw-seg button{border:0;background:none;padding:6px 12px;border-radius:7px;font:inherit;font-size:14px;color:#334155;cursor:pointer}#swarmView .sw-seg button.on{background:#fff;color:#0F172A;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.08)}#swarmView .sw-n{font-size:12px;color:#64748B}',
      '#swarmView .sw-card{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:16px 18px;margin-bottom:14px;box-shadow:0 1px 2px rgba(15,23,42,.04)}#swarmView .sw-empty{text-align:center;color:#64748B;padding:40px}#swarmView .sw-empty2{color:#64748B;padding:10px 0}#swarmView .sw-err{color:#B91C1C}',
      '#swarmView .sw-note{background:#FFFBEB;border:1px solid #FDE68A;color:#92400E;border-radius:10px;padding:8px 12px;font-size:13px;margin-bottom:12px}',
      '#swarmView .sw-ph{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;margin-bottom:8px}#swarmView .sw-tw{overflow-x:auto}',
      '#swarmView .sw-tb{width:100%;border-collapse:collapse;font-size:14px;min-width:820px}#swarmView .sw-tb th{font-size:12px;color:#64748B;font-weight:600;text-align:left;padding:6px;border-bottom:1px solid #E5E7EB;vertical-align:bottom}#swarmView .sw-tb th span{font-weight:400;font-size:11px}#swarmView .sw-tb td{padding:9px 6px;border-bottom:1px solid #F1F5F9;vertical-align:top}#swarmView .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}',
      '#swarmView .sw-rank{font-weight:800;color:#94A3B8;width:22px}#swarmView .sw-cn{display:flex;gap:6px;align-items:center;flex-wrap:wrap}#swarmView .sw-cn b{font-weight:600;max-width:520px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#swarmView .sw-why{font-size:12px;color:#0F766E;margin-top:3px}',
      '#swarmView .sw-tag{font-size:11px;font-weight:700;border-radius:99px;padding:1px 8px;white-space:nowrap}#swarmView .sw-tag.new{background:#EFF6FF;color:#1D4ED8}#swarmView .sw-tag.old{background:#F1F5F9;color:#334155}#swarmView .sw-tag.t2{background:#FEF3C7;color:#92400E}#swarmView .sw-tag.done{background:#DCFCE7;color:#166534}',
      '#swarmView .g{color:#15803D;font-weight:700}#swarmView .r{color:#B91C1C}#swarmView .sw-chk{display:inline-flex;gap:6px;align-items:center;white-space:nowrap;cursor:pointer;font-size:13px}#swarmView .sw-chk input{width:18px;height:18px;cursor:pointer}',
      '#swarmView .sw-done{margin-top:10px;padding-top:8px;border-top:1px dashed #E5E7EB;display:flex;flex-direction:column;gap:4px;font-size:13px}#swarmView .sw-undo{border:0;background:none;color:#B91C1C;cursor:pointer;font:inherit;font-size:12px;text-decoration:underline}',
      '#swarmView .sw-foot{margin-top:8px;line-height:1.6}',
      '#swToast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0F172A;color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;opacity:0;pointer-events:none;transition:.2s;z-index:9500}#swToast.on{opacity:1}#swToast.bad{background:#B91C1C}',
      '@media (max-width:700px){#swarmView .sw-wrap{padding:18px 14px 40px}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  var ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>';
  var tries = 0;
  function install() {
    var anchor = document.getElementById('sb-ai') || document.getElementById('sb-adsai'), wrap = document.querySelector('.content-wrap');
    if (!anchor || !wrap) { if (++tries < 80) setTimeout(install, 500); return; }
    var grouped = anchor.parentNode && anchor.parentNode.classList && anchor.parentNode.classList.contains('v2nav-items');
    var navOff = false; try { navOff = localStorage.getItem('rb_nav_v2') === 'off'; } catch (e) {}
    if (!grouped && !navOff && ++tries < 40) { setTimeout(install, 500); return; }
    if (document.getElementById('sb-swarm')) return;
    css();
    var it = document.createElement('div'); it.className = 'sb-item'; it.id = 'sb-swarm';
    it.innerHTML = '<span class="sb-icon">' + ICON + '</span><span>แนะนำตัวรุมยิง</span>';
    it.onclick = function () { open(it); };
    anchor.parentNode.insertBefore(it, anchor.nextSibling);
    var v = document.createElement('div'); v.id = 'swarmView'; v.style.display = 'none';
    wrap.appendChild(v);
    document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('.sb-item'); if (t && t.id !== 'sb-swarm') { var sv = document.getElementById('swarmView'); if (sv) sv.style.display = 'none'; it.classList.remove('active'); } }, true);
  }
  window.swarmV2 = {
    prod: function (p) { S.prod = p; try { localStorage.setItem('rb_swarm_v2', JSON.stringify({ prod: p })); } catch (e) {} render(); },
    reload: function () { S.mv = null; open(); },
    mark: function (prod, acc, camp, el) {
      var id = acc + '|' + camp; if (S.busy[id]) return; S.busy[id] = 1; if (el) el.disabled = true;
      var x = (pick(campaigns())[prod] || { list: [] }).list.filter(function (y) { return y.c.a === acc && y.c.camp === camp; })[0];
      var meta = { k: clipKey(camp), acc: acc, date: ago(0), r7: x ? +x.r7.toFixed(2) : null, r3: x ? +x.r3.toFixed(2) : null, b: x ? x.b : null };
      post('save', { item: { dir: 'swarm', title: meta.k, prod: prod, page: x ? x.c.page : '', camp: camp, status: 'done', meta: meta } })
        .then(function (j) { S.marks.unshift(j.item); delete S.busy[id]; toast('บันทึกแล้ว · ไม่แนะนำคลิปนี้ซ้ำ ' + HIDE_DAYS + ' วัน'); render(); })
        .catch(function (e) { delete S.busy[id]; toast(errMsg(e), true); render(); });
    },
    undo: function (mid) {
      post('delete', { id: mid }).then(function () { S.marks = S.marks.filter(function (m) { return m.id !== mid; }); toast('ยกเลิกแล้ว'); render(); }).catch(function (e) { toast(errMsg(e), true); });
    },
    _S: S, _pick: function () { return pick(campaigns()); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
