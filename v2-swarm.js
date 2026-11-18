/* แนะนำตัวรุมยิง — เพิ่มโดย Claude 17 พ.ย. 2569 · v2 18 พ.ย.: ปุ่มสั่งรุมยิง (สร้างแคมเปญใหม่ใช้โพสต์เดิม เลือกบัญชีในเพจเดียวกันได้)
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
            '<td><button class="sw-go" onclick="swarmV2.dlg(' + esc(jsq(p)) + ',' + esc(jsq(c.a)) + ',' + esc(jsq(c.camp)) + ')">รุมยิง</button><br><label class="sw-chk"><input type="checkbox" ' + (S.busy[id] ? 'disabled ' : '') + 'onchange="swarmV2.mark(' + esc(jsq(p)) + ',' + esc(jsq(c.a)) + ',' + esc(jsq(c.camp)) + ',this)"> รุมแล้ว</label></td></tr>';
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
  // ── สั่งรุมยิงจากหน้านี้ (สร้างแคมเปญใหม่ที่ใช้โพสต์เดิม) ──
  function accsOfPage(page) { var A = accInfo(), out = []; Object.keys(A).forEach(function (a) { if (A[a].page === page) out.push(a); }); return out; }
  function spendOf(a) { var rows = (window.fbDataMap || {})[a], Y = ago(1), T = ago(0), s = 0; if (Array.isArray(rows)) rows.forEach(function (r) { if (r.date === Y || r.date === T) s += r.spend || 0; }); return s; }
  function spendAccs(page, src) { return accsOfPage(page).filter(function (a) { return a === src || spendOf(a) > 0; }); }
  function markFb() {
    var rows = document.querySelectorAll('table.v2-camp tbody tr[data-camp]'); if (!rows.length) return;
    rows.forEach(function (tr) {
      var td = tr.querySelector('td.v2-btns'); if (!td || td.querySelector('.sw-fbb')) return;
      var b = document.createElement('button'); b.className = 'sw-fbb'; b.textContent = 'รุม'; b.title = 'สั่งรุมยิงแคมเปญนี้ (ใช้โพสต์เดิม เลือกบัญชีในเพจเดียวกันได้)';
      b.onclick = function (e) { e.stopPropagation(); var acc = window.fbAccount, A = accInfo()[acc] || {}; swarmV2.dlg(A.prod || '', acc, tr.getAttribute('data-camp')); };
      td.appendChild(b);
    });
  }
  function beDate() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + String(d.getFullYear() + 543).slice(-2); }
  function baseName(n) {
    var b = String(n).replace(/^[\s*().\-\d]+/, '').trim(), re = /(ลุมยิง|รุมยิง)\s*\d{1,2}\/\d{1,2}\/\d{2,4}/;
    return re.test(b) ? b.replace(re, 'ลุมยิง ' + beDate()) : b + ' ลุมยิง ' + beDate();
  }
  function names(d) { var out = []; for (var i = 1; i <= d.n; i++) out.push((d.prefix.replace(/\{n\}/g, String(i)) + ' ' + d.base).trim()); return out; }
  function metaOf(a) { return (window.FB_ACCOUNTS_META || []).filter(function (m) { return m.name === a; })[0]; }
  function fbErr(j) { var e = j.error; return new Error((e.error_user_title ? e.error_user_title + ': ' : '') + (e.error_user_msg || e.message)); }
  function fbGet(path, acc) { return fetch(FB_API + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'account=' + encodeURIComponent(FB_TOKENS[acc] || acc)).then(function (r) { return r.json(); }).then(function (j) { if (j.error) throw fbErr(j); return j; }); }
  function fbPost(path, acc, body) { return fetch(FB_API + path + '?access_token=' + encodeURIComponent(FB_TOKENS[acc] || FB_TOKEN), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (j) { if (j.error) throw fbErr(j); return j; }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function renderDlg() {
    var el = document.getElementById('swDlg'), d = S.d;
    if (!d) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'swDlg'; document.body.appendChild(el); }
    var accs = spendAccs(d.page, d.acc), nm = names(d), dis = d.busy || d.done ? ' disabled' : '';
    if (accs.indexOf(d.acc) < 0) accs.unshift(d.acc);
    el.innerHTML = '<div class="swd-ov" onclick="if(event.target===this)swarmV2.dclose()"><div class="swd" role="dialog" aria-modal="true" aria-label="สั่งรุมยิง">' +
      '<div class="swd-h"><div><div class="sw-dim">สั่งรุมยิง · ' + esc(d.prod) + ' · ' + esc(d.page) + '</div><h2>' + esc(d.camp) + '</h2></div><button class="swd-x" aria-label="ปิด" onclick="swarmV2.dclose()">×</button></div>' +
      '<div class="swd-g"><label>จำนวนตัว<select' + dis + ' onchange="swarmV2.dset(\'n\',+this.value)">' + [2, 3, 4, 5, 6].map(function (k) { return '<option' + (k === d.n ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select></label>' +
      '<label>งบต่อตัว (บาท)<input' + dis + ' type="number" min="100" step="100" value="' + d.budget + '" onchange="swarmV2.dset(\'budget\',+this.value)"></label>' +
      '<label>ยิงในบัญชี (เพจเดียวกัน ที่ใช้เงินอยู่)<select' + dis + ' onchange="swarmV2.dset(\'target\',this.value)">' + accs.map(function (a) { return '<option value="' + esc(a) + '"' + (a === d.target ? ' selected' : '') + '>' + esc(a) + (a === d.acc ? ' (บัญชีต้นแบบ)' : '') + ' · ใช้ ฿' + fmt(spendOf(a)) + ' เมื่อวาน–วันนี้</option>'; }).join('') + '</select></label>' +
      '<label>หลังสร้างเสร็จ<select' + dis + ' onchange="swarmV2.dset(\'status\',this.value)"><option value="PAUSED"' + (d.status === 'PAUSED' ? ' selected' : '') + '>ปิดไว้ก่อน (ไปกดเปิดเองใน Ads Manager)</option><option value="ACTIVE"' + (d.status === 'ACTIVE' ? ' selected' : '') + '>เปิดวิ่งทันที</option></select></label>' +
      '<label class="full">เลขนำหน้า ({n} = ลำดับ)<input' + dis + ' value="' + esc(d.prefix) + '" onchange="swarmV2.dset(\'prefix\',this.value)"></label>' +
      '<label class="full">ชื่อแคมเปญ (ต่อจากเลขนำหน้า)<input' + dis + ' value="' + esc(d.base) + '" onchange="swarmV2.dset(\'base\',this.value)"></label></div>' +
      '<div class="swd-prev"><div class="sw-dim">จะสร้าง ' + d.n + ' แคมเปญในบัญชี ' + esc(d.target) + ' · งบตลอดชีพตัวละ ฿' + fmt(d.budget) + ' จบวันนี้ 23:59 · ใช้โพสต์เดิม กลุ่มเป้าหมายเดิม' + (d.status === 'ACTIVE' ? ' · <b class="r">เริ่มใช้เงินทันที</b>' : '') + '</div>' + nm.map(function (x) { return '<div>• ' + esc(x) + '</div>'; }).join('') + '</div>' +
      (d.log.length ? '<div class="swd-log">' + d.log.map(function (l) { return '<div class="' + (l.bad ? 'r' : l.ok ? 'g' : '') + '">' + esc(l.t) + '</div>'; }).join('') + '</div>' : '') +
      '<div class="swd-f">' + (d.done ? '<button class="sw-btn pri" onclick="swarmV2.dclose()">เสร็จแล้ว</button>' : '<button class="sw-btn" onclick="swarmV2.dclose()"' + (d.busy ? ' disabled' : '') + '>ยกเลิก</button><button class="sw-btn pri" onclick="swarmV2.run()"' + (d.busy ? ' disabled' : '') + '>' + (d.busy ? 'กำลังสร้าง…' : 'สร้าง ' + d.n + ' แคมเปญ') + '</button>') + '</div></div></div>';
  }
  function runSwarm() {
    var d = S.d; if (!d || d.busy || d.done) return;
    if (!(d.budget >= 100)) { toast('งบต่อตัวต้องอย่างน้อย 100', true); return; }
    var src = ((window.fbCampaignsMap || {})[d.acc] || {})[d.camp], tm = metaOf(d.target);
    if (!src || !src.id) { toast('หา ID แคมเปญต้นแบบไม่เจอ ลองกดโหลดหน้าใหม่', true); return; }
    if (!tm) { toast('ไม่พบบัญชีปลายทางในแดชบอร์ด', true); return; }
    d.busy = true; d.log = []; renderDlg();
    var nm = names(d), created = [];
    function log(t, ok, bad) { d.log.push({ t: t, ok: ok, bad: bad }); renderDlg(); }
    (async function () {
      try {
        log('อ่านแคมเปญต้นแบบ…');
        var c = await fbGet(src.id + '?fields=objective,special_ad_categories,buying_type', d.acc);
        var ss = await fbGet(src.id + '/adsets?fields=optimization_goal,billing_event,bid_strategy,bid_amount,destination_type,promoted_object,targeting,attribution_spec&limit=5', d.acc);
        var aa = await fbGet(src.id + '/ads?fields=creative{object_story_id,effective_object_story_id}&limit=5', d.acc);
        var s = ss.data && ss.data[0], ad = aa.data && aa.data[0], story = ad && ad.creative && (ad.creative.object_story_id || ad.creative.effective_object_story_id);
        if (!s || !story) throw new Error('แคมเปญต้นแบบไม่มีชุดโฆษณาหรือโพสต์ที่ใช้ซ้ำได้');
        log('ใช้โพสต์ ' + story.split('_').pop() + ' · ' + (s.optimization_goal || ''));
        var end = new Date(); end.setHours(23, 59, 0, 0);
        for (var i = 0; i < nm.length; i++) {
          var name = nm[i], cid = null;
          try {
            var cc = await fbPost(tm.id + '/campaigns', d.target, { name: name, objective: c.objective, special_ad_categories: c.special_ad_categories || [], buying_type: c.buying_type || 'AUCTION', status: d.status });
            cid = cc.id;
            var body = { name: name, campaign_id: cid, optimization_goal: s.optimization_goal, billing_event: s.billing_event, bid_strategy: s.bid_strategy || 'LOWEST_COST_WITHOUT_CAP', destination_type: s.destination_type, promoted_object: s.promoted_object, targeting: s.targeting, lifetime_budget: Math.round(d.budget * 100), end_time: Math.floor(end.getTime() / 1000), status: d.status };
            if (s.bid_amount) body.bid_amount = s.bid_amount;
            if (s.attribution_spec) body.attribution_spec = s.attribution_spec;
            var as = await fbPost(tm.id + '/adsets', d.target, body);
            var cr = await fbPost(tm.id + '/adcreatives', d.target, { name: name, object_story_id: story });
            await fbPost(tm.id + '/ads', d.target, { name: name, adset_id: as.id, creative: { creative_id: cr.id }, status: d.status });
            created.push(name); log('✓ ' + name, true);
          } catch (e) {
            log('✗ ' + name + ' — ' + e.message, false, true);
            if (cid) { try { await fbPost(cid, d.target, { status: 'DELETED' }); log('  ลบแคมเปญที่สร้างไม่ครบทิ้งแล้ว'); } catch (e2) { log('  ⚠️ ลบแคมเปญที่สร้างไม่ครบไม่ได้ ให้ลบเองใน Ads Manager', false, true); } }
          }
          await sleep(800);
        }
      } catch (e) { log('✗ ' + e.message, false, true); }
      if (created.length) {
        var prev = window.fbAccount, prevChk = window._fbNotesSkipCheck;
        try {
          window._fbNotesSkipCheck = true; window.fbAccount = d.target;
          for (var k = 0; k < created.length; k++) { await _fbNotesSave(ago(0), created[k], 'old', String(d.budget)); await sleep(400); await _fbNotesSave(ago(0), created[k], 'new', String(d.budget)); await sleep(400); }
          log('กรอกยอดเก่า/ยอดใหม่ ' + d.budget + ' ให้ ' + created.length + ' ตัวแล้ว', true);
        } catch (e) { log('กรอกยอดเก่า/ยอดใหม่ไม่สำเร็จ ให้กรอกเอง', false, true); }
        finally { window._fbNotesSkipCheck = prevChk; window.fbAccount = prev; }
        try { fetch('https://richbiotech-fb-proxy.ads02.workers.dev/_camplog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor: me() || 'Unknown', campaignId: d.target, campaignName: d.camp + ' → ' + created.join(' ; '), action: 'swarm:' + d.status, oldValue: d.acc, newValue: String(created.length) }) }); } catch (e) {}
        var already = marked(d.prod).some(function (m) { return m.meta && m.meta.k === clipKey(d.camp); });
        if (!already) {
          try { var j = await post('save', { item: { dir: 'swarm', title: clipKey(d.camp), prod: d.prod, page: d.page, camp: d.camp, status: 'done', meta: { k: clipKey(d.camp), acc: d.acc, date: ago(0), target: d.target, n: created.length, created: true } } }); S.marks.unshift(j.item); } catch (e) {}
        }
        log(d.status === 'PAUSED' ? 'สร้างแบบปิดไว้ ' + created.length + ' ตัว — ไปตรวจแล้วกดเปิดใน Ads Manager' : 'เปิดวิ่งแล้ว ' + created.length + ' ตัว', true);
      }
      d.busy = false; d.done = true; renderDlg(); render();
    })();
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
      '#swarmView .sw-go{border:1px solid #2563EB;background:#2563EB;color:#fff;border-radius:8px;padding:4px 10px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:6px}#swarmView .sw-go:hover{background:#1D4ED8}',
      '#swDlg .swd-ov{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto}#swDlg .swd{background:#fff;color:#0F172A;border-radius:16px;width:100%;max-width:680px;padding:20px 22px;box-shadow:0 20px 50px rgba(0,0,0,.25)}',
      '#swDlg .swd-h{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}#swDlg h2{font-size:16px;margin:4px 0 0;font-weight:700;word-break:break-word}#swDlg .sw-dim{color:#64748B;font-size:13px}#swDlg .swd-x{border:0;background:#F1F5F9;width:34px;height:34px;border-radius:9px;font-size:20px;cursor:pointer;flex:none}',
      '#swDlg .swd-g{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}#swDlg .swd-g label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#334155}#swDlg .swd-g .full{grid-column:1/-1}#swDlg .swd-g select,#swDlg .swd-g input{border:1px solid #CBD5E1;border-radius:9px;padding:8px 10px;font:inherit;font-size:14px;background:#fff}',
      '#swDlg .swd-prev{background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;padding:10px 12px;font-size:13px;display:flex;flex-direction:column;gap:3px;word-break:break-word}#swDlg .swd-log{margin-top:10px;font-size:13px;display:flex;flex-direction:column;gap:3px;max-height:200px;overflow:auto}#swDlg .g{color:#15803D}#swDlg .r{color:#B91C1C}',
      '#swDlg .swd-f{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}#swDlg .sw-btn{border:1px solid #CBD5E1;background:#fff;border-radius:9px;padding:8px 14px;font:inherit;font-size:14px;cursor:pointer}#swDlg .sw-btn.pri{background:#2563EB;border-color:#2563EB;color:#fff;font-weight:700}#swDlg .sw-btn:disabled{opacity:.6;cursor:default}',
      '@media (max-width:600px){#swDlg .swd-g{grid-template-columns:1fr}}',
      '.sw-fbb{color:#1D4ED8!important;border-color:#BFDBFE!important;font-weight:700}',
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
    if (!S.mv) fetch('https://richbiotech-fb-proxy.ads02.workers.dev/_acctmove').then(function (r) { return r.json(); }).then(function (j) { S.mv = j.map || {}; }).catch(function () {});
    var mo = new MutationObserver(function () { clearTimeout(mo._t); mo._t = setTimeout(markFb, 150); }); mo.observe(document.body, { childList: true, subtree: true });
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
    dlg: function (prod, acc, camp) {
      if (!tok()) { toast('ต้องเข้าสู่ระบบก่อน', true); return; }
      var A = accInfo()[acc] || {};
      S.d = { prod: prod, acc: acc, camp: camp, page: A.page || '', target: acc, n: 4, budget: 200, status: 'PAUSED', prefix: '(0{n}.)', base: baseName(camp), log: [], busy: false, done: false };
      renderDlg();
    },
    dset: function (k, v) { if (!S.d || S.d.busy || S.d.done) return; S.d[k] = v; renderDlg(); },
    dclose: function () { if (S.d && S.d.busy) return; S.d = null; renderDlg(); },
    run: function () { runSwarm(); },
    _S: S, _pick: function () { return pick(campaigns()); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
