/* แจ้งปัญหาทีม SA/ADS — เพิ่มโดย Claude 16 พ.ย. 2569
   เก็บเรื่อง + รูปใน Cloudflare Worker (/_auth/iss/*) ต้องล็อกอินระบบใหม่ (rb_auth_token) */
(function () {
  if (window.issV2) return;
  var API = 'https://richbiotech-fb-proxy.ads02.workers.dev/_auth/iss/';
  var DIR = { sa2ads: 'SA แจ้ง ADS', ads2sa: 'ADS แจ้ง SA' };
  var CAT = {
    sa2ads: ['ลูกค้าทักแต่ไม่ใช่กลุ่มเป้าหมาย', 'ข้อมูลในแอดไม่ตรง (ราคา/โปร/ของแถม)', 'คอนเทนต์ทำให้ลูกค้าเข้าใจผิด', 'คนทักน้อย / ทักไม่เข้า', 'เพจ/แชทมีปัญหา', 'อื่น ๆ'],
    ads2sa: ['ทักถูกแต่ปิดไม่ได้', 'ตอบแชทช้า / ไม่ได้ตอบ', 'ขอข้อมูลลูกค้า (คำถามที่เจอบ่อย)', 'อื่น ๆ']
  };
  var ST = { open: 'รอดำเนินการ', doing: 'กำลังแก้', done: 'แก้แล้ว' };
  var S = { list: [], loaded: false, loading: false, err: '', dir: '', st: 'active', prod: '', q: '', sel: null, form: null, pend: [], busy: false, lb: null };
  try { var s0 = JSON.parse(localStorage.getItem('rb_iss_v2') || 'null'); if (s0) { S.dir = s0.dir || ''; S.st = s0.st || 'active'; S.prod = s0.prod || ''; } } catch (e) {}
  var IMG = {}, IMGQ = {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jsq(s) { return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }
  function tok() { try { return localStorage.getItem('rb_auth_token') || ''; } catch (e) { return ''; } }
  function me() { try { return sessionStorage.getItem('rb_username') || ''; } catch (e) { return ''; } }
  function isAdmin() { try { return sessionStorage.getItem('rb_auth') === '1'; } catch (e) { return false; } }
  function readOnly() { try { return sessionStorage.getItem('rb_perm') === 'view'; } catch (e) { return false; } }
  function saOnly() { try { var a = JSON.parse(sessionStorage.getItem('rb_access') || 'null'); return Array.isArray(a) && a.length === 1 && a[0] === 'issues'; } catch (e) { return false; } }
  function post(path, body) {
    body = body || {}; body.token = tok();
    return fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error || ('HTTP ' + r.status)); e.code = j.error; throw e; } return j; }); });
  }
  function errMsg(e) { var c = e && e.code; return c === 'unauthorized' ? 'หมดเวลาเข้าสู่ระบบ ให้ออกแล้วเข้าสู่ระบบใหม่' : c === 'bad_image' ? 'รูปใหญ่เกินไป' : c === 'forbidden' ? 'เฉพาะผู้ดูแลระบบ' : 'เกิดข้อผิดพลาด: ' + (e && e.message || e); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function when(t) { if (!t) return ''; var d = new Date(t), now = new Date(), diff = (now - d) / 60000; if (diff < 1) return 'เมื่อสักครู่'; if (diff < 60) return Math.floor(diff) + ' นาทีที่แล้ว'; var s = pad(d.getHours()) + ':' + pad(d.getMinutes()); if (d.toDateString() === now.toDateString()) return 'วันนี้ ' + s; var y = new Date(now); y.setDate(y.getDate() - 1); if (d.toDateString() === y.toDateString()) return 'เมื่อวาน ' + s; return d.getDate() + '/' + (d.getMonth() + 1) + '/' + String(d.getFullYear() + 543).slice(2) + ' ' + s; }
  function dayShift(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
  function prods() { return (window.FB_HIERARCHY || []).filter(function (p) { return p && p.product; }); }
  function pagesOf(prod) { var p = prods().filter(function (x) { return x.product === prod; })[0]; return p ? (p.pages || []).map(function (g) { return g.name; }) : []; }
  function saveUi() { try { localStorage.setItem('rb_iss_v2', JSON.stringify({ dir: S.dir, st: S.st, prod: S.prod })); } catch (e) {} }
  function toast(t, bad) { var el = document.getElementById('issToast'); if (!el) { el = document.createElement('div'); el.id = 'issToast'; document.body.appendChild(el); } el.textContent = t; el.className = bad ? 'bad on' : 'on'; clearTimeout(el._t); el._t = setTimeout(function () { el.className = ''; }, 3500); }

  /* ---------- โหลด / บันทึก ---------- */
  function load(silent) {
    if (!tok() || S.loading) return Promise.resolve();
    S.loading = true; if (!silent) render();
    return post('list').then(function (j) { S.list = j.list || []; S.loaded = true; S.err = ''; })
      .catch(function (e) { S.err = errMsg(e); })
      .then(function () { S.loading = false; badge(); if (visible()) { if (S.sel) S.sel = byId(S.sel.id) || S.sel; render(); } });
  }
  function byId(id) { return S.list.filter(function (x) { return x.id === id; })[0] || null; }
  function upsert(it) { var i = -1; S.list.forEach(function (x, k) { if (x.id === it.id) i = k; }); if (i >= 0) S.list[i] = it; else S.list.unshift(it); }
  function shrink(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var m = 1400, w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, m / Math.max(w, h)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        var q = 0.8, d = c.toDataURL('image/jpeg', q); while (d.length > 450000 && q > 0.45) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
        res(d);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('อ่านรูปไม่ได้')); };
      img.src = url;
    });
  }
  function addFiles(files) {
    var arr = [].slice.call(files || []).filter(function (f) { return /^image\//.test(f.type); });
    if (!arr.length) return;
    var room = 6 - S.pend.length; if (room <= 0) { toast('แนบได้สูงสุด 6 รูปต่อข้อความ', true); return; }
    if (arr.length > room) toast('แนบได้อีก ' + room + ' รูป', true);
    Promise.all(arr.slice(0, room).map(shrink)).then(function (ds) { ds.forEach(function (d) { S.pend.push(d); }); drawPend(); }).catch(function (e) { toast(e.message, true); });
  }
  function drawPend() {
    var box = document.getElementById('issPend'); if (!box) return;
    box.innerHTML = S.pend.map(function (d, i) { return '<div class="iss-pi"><img src="' + d + '" alt="รูปแนบ ' + (i + 1) + '"><button type="button" aria-label="เอารูปออก" onclick="issV2.unpend(' + i + ')">×</button></div>'; }).join('') +
      (S.pend.length ? '<span class="iss-dim">' + S.pend.length + '/6 รูป · ย่อแล้วประมาณ ' + Math.round(S.pend.reduce(function (a, d) { return a + d.length * 0.75; }, 0) / 1024) + ' KB</span>' : '');
  }
  function uploadPend() {
    var ids = [], q = S.pend.slice();
    function next() { var d = q.shift(); if (!d) return Promise.resolve(ids); return post('img', { data: d }).then(function (j) { ids.push(j.id); IMG[j.id] = d; return next(); }); }
    return next();
  }
  function send(item, msg) {
    if (S.busy) return; S.busy = true; render();
    return uploadPend().then(function (ids) { if (msg) msg.imgs = ids; return post('save', { item: item, msg: msg }); })
      .then(function (j) { upsert(j.item); S.pend = []; S.form = null; S.sel = j.item; toast('บันทึกแล้ว'); })
      .catch(function (e) { toast(errMsg(e), true); })
      .then(function () { S.busy = false; badge(); render(); });
  }
  function loadImgs() {
    document.querySelectorAll('#issView img[data-img]').forEach(function (el) {
      var id = el.getAttribute('data-img');
      if (IMG[id]) { if (el.src !== IMG[id]) el.src = IMG[id]; return; }
      if (IMGQ[id]) return; IMGQ[id] = 1;
      post('getimg', { id: id }).then(function (j) { IMG[id] = j.data; }).catch(function () { IMG[id] = ''; })
        .then(function () { delete IMGQ[id]; document.querySelectorAll('#issView img[data-img="' + id + '"]').forEach(function (e2) { if (IMG[id]) e2.src = IMG[id]; else e2.parentNode.classList.add('gone'); }); });
    });
  }

  /* ---------- คอนเทนต์ทักถูกแต่ปิดไม่ได้ (7 วัน ถึงเมื่อวาน) ---------- */
  function suggest() {
    var W = []; for (var i = 1; i <= 7; i++) W.push(dayShift(i));
    var out = [];
    prods().forEach(function (p) {
      var camps = {};
      (p.pages || []).forEach(function (pg) { (pg.accounts || []).forEach(function (a) { (a.adAccounts || []).forEach(function (acc) {
        ((window.fbDataMap || {})[acc] || []).forEach(function (r) {
          if (W.indexOf(r.date) < 0) return;
          var k = acc + '|' + r.campaign, c = camps[k] || (camps[k] = { prod: p.product, page: pg.name, acc: acc, camp: r.campaign, s: 0, ch: 0, b: 0, d: {} });
          c.s += num(r.spend); c.ch += num(r.conversations); c.b += num(r.purchases); if (num(r.spend) > 0) c.d[r.date] = 1;
        });
      }); }); });
      var L = Object.keys(camps).map(function (k) { return camps[k]; }).filter(function (c) { return c.ch >= 5 && c.s > 0; });
      var ts = 0, tc = 0, tb = 0; L.forEach(function (c) { ts += c.s; tc += c.ch; tb += c.b; });
      if (!tc) return;
      var avgCpc = ts / tc, avgCl = tb / tc;
      L.forEach(function (c) {
        var cpc = c.s / c.ch, cl = c.b / c.ch;
        if (c.ch >= 15 && c.s >= 500 && cpc <= avgCpc && cl < Math.min(0.12, avgCl * 0.6)) out.push({ prod: c.prod, page: c.page, acc: c.acc, camp: c.camp, spend: c.s, chats: c.ch, buys: c.b, cpc: cpc, close: cl, avgCpc: avgCpc, avgClose: avgCl, days: Object.keys(c.d).length });
      });
    });
    out.sort(function (a, b) { return b.chats - a.chats; });
    return out;
  }
  function sentRecently(camp) { var lim = Date.now() - 7 * 86400000; return S.list.some(function (x) { return x.camp === camp && x.t >= lim; }); }

  /* ---------- หน้าจอ ---------- */
  function visible() { var v = document.getElementById('issView'); return v && v.style.display !== 'none'; }
  function filtered() {
    var q = S.q.toLowerCase();
    return S.list.filter(function (x) {
      if (S.dir && x.dir !== S.dir) return false;
      if (S.st === 'active' && x.status === 'done') return false;
      if (S.st === 'done' && x.status !== 'done') return false;
      if (S.prod && x.prod !== S.prod) return false;
      if (q) { var t = [x.title, x.prod, x.page, x.camp, x.cat, x.by].concat((x.msgs || []).map(function (m) { return m.txt; })).join(' ').toLowerCase(); if (t.indexOf(q) < 0) return false; }
      return true;
    }).sort(function (a, b) { var oa = a.status === 'done' ? 1 : 0, ob = b.status === 'done' ? 1 : 0; return oa - ob || (b.u || b.t) - (a.u || a.t); });
  }
  function pill(st) { return '<span class="iss-st ' + (st || 'open') + '">' + (ST[st] || ST.open) + '</span>'; }
  function dirTag(d) { return '<span class="iss-dir ' + d + '">' + (DIR[d] || d) + '</span>'; }
  function render() {
    var box = document.getElementById('issView'); if (!box) return;
    var h = '<div class="iss-wrap">';
    h += '<div class="iss-head"><div><h1>แจ้งปัญหาทีม SA/ADS</h1><div class="iss-sub">ทีม SA แจ้งปัญหาที่เจอให้ทีม ADS · ทีม ADS ตอบกลับพร้อมหลักฐาน หรือถามทีม SA เรื่องคอนเทนต์ที่ทักถูกแต่ปิดไม่ได้ · แนบรูปได้ (ย่อให้อัตโนมัติ · รูปเก็บ 90 วัน)</div></div>' +
      (tok() && !readOnly() ? '<button class="iss-btn pri" onclick="issV2.newForm()">+ แจ้งเรื่องใหม่</button>' : '') + '</div>';
    if (!tok()) { box.innerHTML = h + '<div class="iss-card iss-empty">หน้านี้ใช้ได้เมื่อเข้าสู่ระบบด้วยอีเมล/ชื่อผู้ใช้ + รหัสผ่านแบบใหม่ · ถ้าเข้าด้วยรหัสแบบเดิม ให้ออกจากระบบแล้วเข้าใหม่</div></div>'; return; }
    var act = S.list.filter(function (x) { return x.status !== 'done'; }), wk = Date.now() - 7 * 86400000;
    var k1 = act.filter(function (x) { return x.dir === 'sa2ads'; }).length, k2 = act.filter(function (x) { return x.dir === 'ads2sa'; }).length;
    var k3 = S.list.filter(function (x) { return x.status === 'done' && (x.u || 0) >= wk; }).length;
    h += '<div class="iss-kpis"><button class="iss-card iss-kpi" onclick="issV2.f(\'dir\',\'sa2ads\')"><div class="iss-lbl">SA แจ้ง ADS · ค้างอยู่</div><div class="iss-val">' + k1 + '</div><div class="iss-dim">ทีม ADS ต้องแก้/ตอบ</div></button>' +
      '<button class="iss-card iss-kpi" onclick="issV2.f(\'dir\',\'ads2sa\')"><div class="iss-lbl">ADS แจ้ง SA · ค้างอยู่</div><div class="iss-val">' + k2 + '</div><div class="iss-dim">ทีม SA ต้องตอบ</div></button>' +
      '<div class="iss-card iss-kpi"><div class="iss-lbl">แก้แล้ว · 7 วัน</div><div class="iss-val">' + k3 + '</div><div class="iss-dim">ทั้งหมด ' + S.list.length + ' เรื่อง</div></div></div>';
    h += '<div class="iss-bar"><div class="iss-seg" role="group" aria-label="ทิศทาง">' + [['', 'ทั้งหมด'], ['sa2ads', 'SA แจ้ง ADS'], ['ads2sa', 'ADS แจ้ง SA']].map(function (x) { return '<button class="' + (S.dir === x[0] ? 'on' : '') + '" onclick="issV2.f(\'dir\',\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="iss-seg" role="group" aria-label="สถานะ">' + [['active', 'ค้างอยู่'], ['done', 'แก้แล้ว'], ['all', 'ทั้งหมด']].map(function (x) { return '<button class="' + (S.st === x[0] ? 'on' : '') + '" onclick="issV2.f(\'st\',\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<select aria-label="สินค้า" onchange="issV2.f(\'prod\',this.value)"><option value="">ทุกสินค้า</option>' + prods().map(function (p) { return '<option' + (S.prod === p.product ? ' selected' : '') + '>' + esc(p.product) + '</option>'; }).join('') + '</select>' +
      '<input type="search" placeholder="ค้นหา หัวข้อ / เพจ / ข้อความ" aria-label="ค้นหา" value="' + esc(S.q) + '" oninput="issV2.q(this.value)">' +
      '<button class="iss-btn" onclick="issV2.reload()">' + (S.loading ? 'กำลังโหลด…' : 'โหลดใหม่') + '</button></div>';
    if (S.err) h += '<div class="iss-card iss-errbox">' + esc(S.err) + '</div>';
    var L = filtered();
    h += '<div class="iss-card iss-list">';
    if (!S.loaded && S.loading) h += '<div class="iss-empty">กำลังโหลด…</div>';
    else if (!L.length) h += '<div class="iss-empty">' + (S.list.length ? 'ไม่มีเรื่องตามตัวกรองนี้' : 'ยังไม่มีเรื่องแจ้ง · กด "+ แจ้งเรื่องใหม่" เพื่อเริ่ม') + '</div>';
    L.forEach(function (x) {
      var last = (x.msgs || [])[(x.msgs || []).length - 1] || {}, nImg = (x.msgs || []).reduce(function (a, m) { return a + (m.imgs || []).length; }, 0);
      h += '<button class="iss-row' + (x.status === 'done' ? ' done' : '') + '" onclick="issV2.open(' + jsq(x.id) + ')"><div class="iss-r1">' + pill(x.status) + dirTag(x.dir) + (x.cat ? '<span class="iss-cat">' + esc(x.cat) + '</span>' : '') + '<b class="iss-title">' + esc(x.title || '(ไม่มีหัวข้อ)') + '</b></div>' +
        '<div class="iss-r2"><span>' + esc([x.prod, x.page].filter(Boolean).join(' › ')) + '</span>' + (x.camp ? '<span class="iss-ell">แคมเปญ: ' + esc(x.camp) + '</span>' : '') + '</div>' +
        '<div class="iss-r3"><span>แจ้งโดย <b>' + esc(x.by) + '</b> · ' + when(x.t) + '</span><span>' + (x.msgs || []).length + ' ข้อความ' + (nImg ? ' · ' + nImg + ' รูป' : '') + ' · ล่าสุด ' + esc(last.by || x.ub || '') + ' ' + when(x.u || x.t) + '</span></div></button>';
    });
    h += '</div>';
    if (!saOnly() && (S.dir === '' || S.dir === 'ads2sa') && window.fbDataMap) {
      var sg = suggest().filter(function (c) { return !S.prod || c.prod === S.prod; }).slice(0, 15);
      h += '<div class="iss-card iss-pad"><h2>คอนเทนต์ทักถูกแต่ปิดไม่ได้ <span class="iss-dim">· 7 วันถึงเมื่อวาน · ระบบคัดให้</span></h2><div class="iss-dim" style="margin:2px 0 10px">เงื่อนไข: ทัก ≥ 15 · ค่าแอด ≥ ฿500 · ต้นทุนต่อทักไม่เกินค่าเฉลี่ยสินค้า · ปิดได้ (ซื้อ ÷ ทัก ตาม FB) ต่ำกว่า 12% และต่ำกว่า 60% ของค่าเฉลี่ยสินค้า</div>';
      if (!sg.length) h += '<div class="iss-empty">ไม่มีแคมเปญเข้าเงื่อนไข</div>';
      else {
        h += '<div class="iss-scroll"><table class="iss-t"><thead><tr><th>สินค้า / เพจ</th><th>แคมเปญ</th><th class="r">ทัก</th><th class="r">฿/ทัก</th><th class="r">ปิดได้</th><th class="r">ค่าแอด</th><th></th></tr></thead><tbody>';
        sg.forEach(function (c, i) {
          var sent = sentRecently(c.camp);
          h += '<tr><td><b>' + esc(c.prod) + '</b><div class="iss-dim">' + esc(c.page) + '</div></td><td class="iss-ell" title="' + esc(c.camp) + '">' + esc(c.camp) + '</td><td class="r">' + Math.round(c.chats) + '</td><td class="r">฿' + Math.round(c.cpc) + '<div class="iss-dim">เฉลี่ย ฿' + Math.round(c.avgCpc) + '</div></td><td class="r iss-bad">' + (c.close * 100).toFixed(1) + '%<div class="iss-dim">เฉลี่ย ' + (c.avgClose * 100).toFixed(1) + '%</div></td><td class="r">฿' + Math.round(c.spend).toLocaleString() + '</td><td>' +
            (sent ? '<span class="iss-dim">ส่งแล้ว</span>' : readOnly() ? '' : '<button class="iss-btn sm" onclick="issV2.ask(' + i + ')">ส่งถาม SA</button>') + '</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '</div>';
      S._sg = sg;
    }
    h += '</div>';
    if (S.form) h += formHtml();
    else if (S.sel) h += detailHtml(S.sel);
    if (S.lb) h += '<div class="iss-ov iss-lb" onclick="issV2.lb(null)"><img data-img="' + esc(S.lb) + '" alt="รูปหลักฐาน"></div>';
    var keep = document.activeElement && document.activeElement.id === 'issReply' ? document.activeElement.value : null;
    var keepT = document.getElementById('issTxt'); keepT = keepT ? keepT.value : null;
    box.innerHTML = h;
    if (keep != null) { var r = document.getElementById('issReply'); if (r) { r.value = keep; r.focus(); } }
    if (keepT != null) { var t2 = document.getElementById('issTxt'); if (t2 && !t2.value) t2.value = keepT; }
    drawPend(); loadImgs();
  }
  function imgs(ids) { return (ids || []).length ? '<div class="iss-imgs">' + ids.map(function (id) { return '<button type="button" class="iss-th" onclick="issV2.lb(' + jsq(id) + ')" aria-label="ดูรูปขนาดใหญ่"><img data-img="' + esc(id) + '" alt="รูปหลักฐาน"></button>'; }).join('') + '</div>' : ''; }
  function attachUi(id) { return '<div class="iss-att"><label class="iss-btn sm">แนบรูป<input type="file" accept="image/*" multiple hidden onchange="issV2.files(this.files);this.value=\'\'"></label><span class="iss-dim">หรือวางรูป (Ctrl+V) ในช่องข้อความ · สูงสุด 6 รูป</span></div><div id="issPend" class="iss-pend"></div>'; }
  function formHtml() {
    var f = S.form, cats = CAT[f.dir] || [];
    var h = '<div class="iss-ov" onclick="if(event.target===this)issV2.close()"><div class="iss-modal" role="dialog" aria-modal="true" aria-label="แจ้งเรื่องใหม่"><div class="iss-mh"><h2>แจ้งเรื่องใหม่</h2><button class="iss-x" aria-label="ปิด" onclick="issV2.close()">×</button></div>';
    h += '<div class="iss-fg"><span class="iss-lbl">ใครแจ้งใคร</span><div class="iss-seg">' + ['sa2ads', 'ads2sa'].map(function (d) { return '<button type="button" class="' + (f.dir === d ? 'on' : '') + '" onclick="issV2.ff(\'dir\',\'' + d + '\')">' + DIR[d] + '</button>'; }).join('') + '</div></div>';
    h += '<div class="iss-grid"><label class="iss-fg"><span class="iss-lbl">สินค้า</span><select onchange="issV2.ff(\'prod\',this.value)"><option value="">— เลือก —</option>' + prods().map(function (p) { return '<option' + (f.prod === p.product ? ' selected' : '') + '>' + esc(p.product) + '</option>'; }).join('') + '</select></label>' +
      '<label class="iss-fg"><span class="iss-lbl">เพจ (ถ้ามี)</span><select onchange="issV2.ff(\'page\',this.value)"><option value="">— ไม่ระบุ —</option>' + pagesOf(f.prod).map(function (n) { return '<option' + (f.page === n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></label></div>';
    h += '<label class="iss-fg"><span class="iss-lbl">ประเภทปัญหา</span><select onchange="issV2.ff(\'cat\',this.value)">' + cats.map(function (c) { return '<option' + (f.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></label>';
    h += '<label class="iss-fg"><span class="iss-lbl">หัวข้อ</span><input id="issTitle" maxlength="150" placeholder="สรุปปัญหาสั้น ๆ" value="' + esc(f.title || '') + '" oninput="issV2.ff(\'title\',this.value,1)"></label>';
    if (f.camp) h += '<div class="iss-fg"><span class="iss-lbl">แคมเปญ</span><div class="iss-camp">' + esc(f.camp) + '</div></div>';
    h += '<label class="iss-fg"><span class="iss-lbl">รายละเอียด</span><textarea id="issTxt" rows="5" placeholder="เล่าสิ่งที่เจอ เช่น ลูกค้าถามอะไร เห็นแอดตัวไหน เกิดกี่เคส" onpaste="issV2.paste(event)">' + esc(f.txt || '') + '</textarea></label>';
    h += attachUi();
    h += '<div class="iss-mf"><button class="iss-btn" onclick="issV2.close()">ยกเลิก</button><button class="iss-btn pri" ' + (S.busy ? 'disabled' : '') + ' onclick="issV2.create()">' + (S.busy ? 'กำลังส่ง…' : 'ส่งเรื่อง') + '</button></div></div></div>';
    return h;
  }
  function detailHtml(x) {
    var h = '<div class="iss-ov" onclick="if(event.target===this)issV2.close()"><div class="iss-modal wide" role="dialog" aria-modal="true" aria-label="รายละเอียดเรื่อง"><div class="iss-mh"><div><div class="iss-r1">' + pill(x.status) + dirTag(x.dir) + (x.cat ? '<span class="iss-cat">' + esc(x.cat) + '</span>' : '') + '</div><h2>' + esc(x.title || '(ไม่มีหัวข้อ)') + '</h2><div class="iss-dim">' + esc([x.prod, x.page].filter(Boolean).join(' › ')) + ' · แจ้งโดย ' + esc(x.by) + ' ' + when(x.t) + '</div></div><button class="iss-x" aria-label="ปิด" onclick="issV2.close()">×</button></div>';
    if (x.camp) h += '<div class="iss-camp">แคมเปญ: ' + esc(x.camp) + '</div>';
    if (x.meta && x.meta.chats) { var m = x.meta; h += '<div class="iss-meta">ตัวเลข 7 วัน (ตอนแจ้ง): ทัก <b>' + Math.round(m.chats) + '</b> · ฿/ทัก <b>' + Math.round(m.cpc) + '</b> (เฉลี่ยสินค้า ' + Math.round(m.avgCpc) + ') · ปิดได้ <b>' + (m.close * 100).toFixed(1) + '%</b> (เฉลี่ย ' + (m.avgClose * 100).toFixed(1) + '%) · ค่าแอด ฿' + Math.round(m.spend).toLocaleString() + '</div>'; }
    h += '<div class="iss-thread">';
    (x.msgs || []).forEach(function (m) {
      var mine = m.by === me();
      h += '<div class="iss-msg' + (mine ? ' mine' : '') + '"><div class="iss-mby"><b>' + esc(m.by) + '</b> · ' + when(m.t) + (m.st ? ' · เปลี่ยนสถานะเป็น ' + pill(m.st) : '') + '</div>' + (m.txt ? '<div class="iss-mtxt">' + esc(m.txt).replace(/\n/g, '<br>') + '</div>' : '') + imgs(m.imgs) + '</div>';
    });
    h += '</div>';
    if (!readOnly()) {
      h += '<label class="iss-fg"><span class="iss-lbl">ตอบกลับ / แนบหลักฐาน</span><textarea id="issReply" rows="3" placeholder="พิมพ์คำตอบ หรือสิ่งที่แก้ไปแล้ว" onpaste="issV2.paste(event)"></textarea></label>' + attachUi();
      h += '<div class="iss-mf">' + (isAdmin() ? '<button class="iss-btn danger" onclick="issV2.del(' + jsq(x.id) + ')">ลบเรื่อง</button>' : '') + '<span style="flex:1"></span>' +
        (x.status !== 'doing' && x.status !== 'done' ? '<button class="iss-btn" ' + (S.busy ? 'disabled' : '') + ' onclick="issV2.reply(\'doing\')">ส่ง + กำลังแก้</button>' : '') +
        (x.status !== 'done' ? '<button class="iss-btn ok" ' + (S.busy ? 'disabled' : '') + ' onclick="issV2.reply(\'done\')">ส่ง + แก้แล้ว</button>' : '<button class="iss-btn" ' + (S.busy ? 'disabled' : '') + ' onclick="issV2.reply(\'open\')">เปิดเรื่องใหม่</button>') +
        '<button class="iss-btn pri" ' + (S.busy ? 'disabled' : '') + ' onclick="issV2.reply(\'\')">' + (S.busy ? 'กำลังส่ง…' : 'ส่ง') + '</button></div>';
    }
    return h + '</div></div>';
  }

  /* ---------- เมนู + badge ---------- */
  function badge() {
    var it = document.getElementById('sb-issues'); if (!it) return;
    var b = it.querySelector('.iss-badge'); if (!b) { b = document.createElement('span'); b.className = 'iss-badge'; it.appendChild(b); }
    var mine = saOnly() ? 'ads2sa' : '', n = S.list.filter(function (x) { return x.status !== 'done' && (!mine || x.dir === mine); }).length;
    b.textContent = n > 99 ? '99+' : String(n); b.style.display = n ? '' : 'none';
    b.setAttribute('aria-label', n + ' เรื่องค้างอยู่');
  }
  function open(el) {
    document.querySelectorAll('[id$="View"]').forEach(function (v) { v.style.display = 'none'; });
    document.querySelectorAll('.sb-item').forEach(function (i) { i.classList.remove('active'); });
    var v = document.getElementById('issView'); if (v) v.style.display = '';
    var it = el || document.getElementById('sb-issues'); if (it) it.classList.add('active');
    render(); load(); window.scrollTo(0, 0);
  }
  var ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v4"/><path d="M12 14h.01"/></svg>';
  function css() {
    if (document.getElementById('isscss')) return;
    var s = document.createElement('style'); s.id = 'isscss';
    s.textContent = [
      '#issView{--ib:#E5E7EB;--it:#0F172A;--im:#64748B;--ip:#2563EB;--ic:#fff;--ibg:#F5F6FA;background:var(--ibg);min-height:100vh;color:var(--it)}',
      '#issView .iss-wrap{max-width:1280px;margin:0 auto;padding:28px 32px 60px}#issView h1{font-size:26px;font-weight:800;margin:0 0 4px}#issView h2{font-size:17px;font-weight:700;margin:0}',
      '#issView .iss-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px;flex-wrap:wrap}#issView .iss-sub,#issView .iss-dim{color:var(--im);font-size:13px}',
      '#issView .iss-card{background:var(--ic);border:1px solid var(--ib);border-radius:14px}#issView .iss-pad{padding:18px 20px;margin-top:16px}#issView .iss-empty{padding:28px;text-align:center;color:var(--im)}',
      '#issView .iss-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:16px}#issView .iss-kpi{padding:16px 18px;text-align:left;font:inherit;color:inherit;cursor:pointer}#issView div.iss-kpi{cursor:default}#issView .iss-lbl{font-size:13px;color:var(--im);display:block;margin-bottom:4px}#issView .iss-val{font-size:28px;font-weight:800}',
      '#issView .iss-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px}#issView .iss-bar select,#issView .iss-bar input{height:36px;border:1px solid var(--ib);border-radius:9px;padding:0 10px;font:inherit;font-size:14px;background:#fff}#issView .iss-bar input{flex:1;min-width:180px}',
      '#issView .iss-seg{display:inline-flex;background:#EEF0F4;border-radius:10px;padding:3px;gap:2px}#issView .iss-seg button{border:0;background:none;padding:6px 12px;border-radius:7px;font:inherit;font-size:14px;color:#334155;cursor:pointer}#issView .iss-seg button.on{background:#fff;color:var(--it);font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.08)}',
      '#issView .iss-btn{height:36px;padding:0 14px;border-radius:9px;border:1px solid var(--ib);background:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer;color:var(--it);display:inline-flex;align-items:center;gap:6px}#issView .iss-btn.pri{background:var(--ip);border-color:var(--ip);color:#fff}#issView .iss-btn.ok{background:#16A34A;border-color:#16A34A;color:#fff}#issView .iss-btn.danger{color:#DC2626;border-color:#FECACA}#issView .iss-btn.sm{height:30px;padding:0 10px;font-size:13px}#issView .iss-btn:disabled{opacity:.6;cursor:wait}',
      '#issView .iss-list{overflow:hidden}#issView .iss-row{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid var(--ib);background:#fff;padding:14px 18px;font:inherit;color:inherit;cursor:pointer}#issView .iss-row:last-child{border-bottom:0}#issView .iss-row:hover{background:#F8FAFC}#issView .iss-row.done{opacity:.72}',
      '#issView .iss-r1{display:flex;flex-wrap:wrap;gap:6px;align-items:center}#issView .iss-title{font-size:15px;margin-left:2px}#issView .iss-r2,#issView .iss-r3{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px;color:var(--im);margin-top:5px}#issView .iss-ell{max-width:520px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#issView .iss-st{font-size:12px;font-weight:700;padding:2px 9px;border-radius:99px;background:#FEF3C7;color:#92400E}#issView .iss-st.doing{background:#DBEAFE;color:#1E40AF}#issView .iss-st.done{background:#DCFCE7;color:#166534}',
      '#issView .iss-dir{font-size:12px;font-weight:600;padding:2px 9px;border-radius:99px;background:#F1F5F9;color:#334155}#issView .iss-dir.ads2sa{background:#EDE9FE;color:#5B21B6}#issView .iss-cat{font-size:12px;color:#475569;border:1px solid var(--ib);padding:1px 8px;border-radius:99px}',
      '#issView .iss-scroll{overflow-x:auto}#issView .iss-t{width:100%;border-collapse:collapse;font-size:14px}#issView .iss-t th{font-size:12px;color:var(--im);font-weight:600;text-align:left;padding:8px;border-bottom:1px solid var(--ib);background:#F8FAFC}#issView .iss-t td{padding:9px 8px;border-bottom:1px solid #F1F5F9;vertical-align:top}#issView .iss-t .r{text-align:right}#issView td.iss-ell{max-width:340px}#issView .iss-bad{color:#DC2626;font-weight:700}#issView .iss-errbox{padding:12px 16px;color:#B91C1C;background:#FEF2F2;border-color:#FECACA;margin-bottom:12px}',
      '#issView .iss-ov{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto}#issView .iss-modal{background:#fff;border-radius:16px;width:100%;max-width:560px;padding:20px 22px;box-shadow:0 20px 50px rgba(0,0,0,.25)}#issView .iss-modal.wide{max-width:760px}',
      '#issView .iss-mh{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}#issView .iss-mh h2{font-size:19px;margin:6px 0 2px}#issView .iss-x{border:0;background:#F1F5F9;width:34px;height:34px;border-radius:9px;font-size:20px;cursor:pointer;flex:none}',
      '#issView .iss-fg{display:block;margin-bottom:12px}#issView .iss-fg select,#issView .iss-fg input,#issView .iss-fg textarea{width:100%;box-sizing:border-box;border:1px solid #CBD5E1;border-radius:9px;padding:8px 10px;font:inherit;font-size:14px;background:#fff}#issView .iss-fg textarea{resize:vertical}#issView .iss-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '#issView .iss-att{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:-4px 0 8px}#issView .iss-pend{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}#issView .iss-pi{position:relative}#issView .iss-pi img{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--ib);display:block}#issView .iss-pi button{position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:0;background:#0F172A;color:#fff;cursor:pointer;line-height:1}',
      '#issView .iss-mf{display:flex;gap:8px;justify-content:flex-end;align-items:center;flex-wrap:wrap;margin-top:6px}#issView .iss-camp{font-size:13px;background:#F8FAFC;border:1px solid var(--ib);border-radius:8px;padding:6px 10px;margin-bottom:10px;word-break:break-all}#issView .iss-meta{font-size:13px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:8px 10px;margin-bottom:10px}',
      '#issView .iss-thread{display:flex;flex-direction:column;gap:10px;margin-bottom:14px;max-height:52vh;overflow:auto;padding-right:4px}#issView .iss-msg{background:#F8FAFC;border:1px solid var(--ib);border-radius:12px;padding:10px 12px;max-width:88%}#issView .iss-msg.mine{align-self:flex-end;background:#EFF6FF;border-color:#BFDBFE}#issView .iss-mby{font-size:12px;color:var(--im);margin-bottom:4px}#issView .iss-mtxt{font-size:14px;line-height:1.55;white-space:normal;word-break:break-word}',
      '#issView .iss-imgs{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}#issView .iss-th{border:0;padding:0;background:#E2E8F0;border-radius:8px;cursor:zoom-in;width:110px;height:110px;overflow:hidden}#issView .iss-th img{width:110px;height:110px;object-fit:cover;display:block}#issView .iss-th.gone::after{content:"รูปหมดอายุ";font-size:12px;color:var(--im)}',
      '#issView .iss-lb{align-items:center;z-index:9100;cursor:zoom-out}#issView .iss-lb img{max-width:96vw;max-height:92vh;border-radius:8px;background:#fff}',
      '.sb-item .iss-badge{margin-left:auto;background:#EF4444;color:#fff;font-size:11px;font-weight:700;min-width:18px;height:18px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;padding:0 5px}',
      '#issToast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:#0F172A;color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;opacity:0;pointer-events:none;transition:.2s;z-index:9500}#issToast.on{opacity:1;transform:translateX(-50%)}#issToast.bad{background:#B91C1C}',
      '@media (max-width:700px){#issView .iss-wrap{padding:18px 14px 40px}#issView .iss-grid{grid-template-columns:1fr}#issView .iss-msg{max-width:100%}}',
      'html[data-theme="dark"] #issView,body.dark #issView{--ib:#334155;--it:#E2E8F0;--im:#94A3B8;--ic:#1E293B;--ibg:#0F172A}'
    ].join('\n');
    document.head.appendChild(s);
  }
  var tries = 0;
  function install() {
    var anchor = document.getElementById('sb-chatpage'), wrap = document.querySelector('.content-wrap');
    if (!anchor || !wrap) return setTimeout(install, 500);
    var navOff = false; try { navOff = localStorage.getItem('rb_nav_v2') === 'off'; } catch (e) {}
    var grouped = anchor.parentNode && anchor.parentNode.classList && anchor.parentNode.classList.contains('v2nav-items');
    if (!grouped && !navOff && ++tries < 30) return setTimeout(install, 500);
    if (document.getElementById('sb-issues')) return;
    css();
    var it = document.createElement('div'); it.className = 'sb-item'; it.id = 'sb-issues';
    it.innerHTML = '<span class="sb-icon">' + ICON + '</span><span>แจ้งปัญหาทีม SA/ADS</span>';
    it.onclick = function () { open(it); };
    anchor.parentNode.insertBefore(it, anchor.nextSibling);
    var v = document.createElement('div'); v.id = 'issView'; v.style.display = 'none';
    wrap.appendChild(v);
    document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('.sb-item'); if (t && t.id !== 'sb-issues') { var iv = document.getElementById('issView'); if (iv) iv.style.display = 'none'; it.classList.remove('active'); } }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && visible()) { if (S.lb) issV2.lb(null); else if (S.form || S.sel) issV2.close(); } });
    setTimeout(function () { load(true); }, 3000);
    setInterval(function () { if (document.hidden) return; if (visible() && !S.form && !S.sel && !S.busy) load(true); else if (!visible()) load(true); }, 90000);
    if (saOnly()) setTimeout(function () { open(it); }, 1500);
  }

  window.issV2 = {
    open: function (id) { S.sel = byId(id); S.form = null; S.pend = []; render(); var th = document.querySelector('#issView .iss-thread'); if (th) th.scrollTop = th.scrollHeight; },
    close: function () { if ((S.pend.length || (document.getElementById('issTxt') || {}).value) && S.form && !confirm('ยังไม่ได้ส่ง จะปิดหน้าต่างนี้ไหม?')) return; S.sel = null; S.form = null; S.pend = []; render(); },
    f: function (k, v) { S[k] = v; saveUi(); render(); },
    q: function (v) { S.q = v; clearTimeout(S._qt); S._qt = setTimeout(function () { render(); var i = document.querySelector('#issView .iss-bar input[type=search]'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 250); },
    reload: function () { load(); },
    newForm: function (pre) { var d = (pre && pre.dir) || (saOnly() ? 'sa2ads' : (S.dir || 'sa2ads')); S.form = Object.assign({ dir: d, prod: S.prod || '', page: '', cat: CAT[d][0], title: '', txt: '' }, pre || {}); S.sel = null; S.pend = []; render(); var t = document.getElementById('issTitle'); if (t) t.focus(); },
    ff: function (k, v, quiet) { if (!S.form) return; var t = document.getElementById('issTxt'); if (t) S.form.txt = t.value; S.form[k] = v; if (k === 'dir') S.form.cat = CAT[v][0]; if (k === 'prod') S.form.page = ''; if (!quiet) render(); },
    files: function (fl) { addFiles(fl); },
    paste: function (e) { var it = (e.clipboardData && e.clipboardData.items) || [], fs = []; for (var i = 0; i < it.length; i++) if (it[i].kind === 'file' && /^image\//.test(it[i].type)) fs.push(it[i].getAsFile()); if (fs.length) { e.preventDefault(); addFiles(fs); } },
    unpend: function (i) { S.pend.splice(i, 1); drawPend(); },
    lb: function (id) { S.lb = id; render(); },
    create: function () {
      var f = S.form; if (!f) return; var t = document.getElementById('issTxt'); f.txt = t ? t.value : f.txt;
      var ti = document.getElementById('issTitle'); if (ti) f.title = ti.value;
      if (!f.prod) { toast('เลือกสินค้าก่อน', true); return; }
      if (!String(f.title || '').trim()) { toast('ใส่หัวข้อก่อน', true); return; }
      if (!String(f.txt || '').trim() && !S.pend.length) { toast('ใส่รายละเอียดหรือแนบรูปอย่างน้อย 1 อย่าง', true); return; }
      send({ dir: f.dir, title: String(f.title).trim(), prod: f.prod, page: f.page || '', camp: f.camp || '', cat: f.cat || '', status: 'open', meta: f.meta || null }, { txt: String(f.txt || '').trim() });
    },
    reply: function (st) {
      var x = S.sel; if (!x) return; var r = document.getElementById('issReply'), txt = r ? r.value.trim() : '';
      if (!txt && !S.pend.length && !st) { toast('พิมพ์ข้อความหรือแนบรูปก่อน', true); return; }
      var item = { id: x.id }; if (st) item.status = st;
      send(item, { txt: txt, st: st || '' });
    },
    ask: function (i) {
      var c = (S._sg || [])[i]; if (!c) return;
      issV2.newForm({ dir: 'ads2sa', prod: c.prod, page: c.page, camp: c.camp, cat: 'ทักถูกแต่ปิดไม่ได้', title: 'ทักถูกแต่ปิดไม่ได้ · ' + c.page,
        txt: 'คอนเทนต์นี้ 7 วันที่ผ่านมา มีคนทัก ' + Math.round(c.chats) + ' คน (฿' + Math.round(c.cpc) + '/ทัก ถูกกว่าค่าเฉลี่ย ฿' + Math.round(c.avgCpc) + ') แต่ปิดได้ ' + (c.close * 100).toFixed(1) + '% (เฉลี่ยสินค้า ' + (c.avgClose * 100).toFixed(1) + '%)\nรบกวนทีม SA ช่วยดูว่าลูกค้าที่ทักมาจากแอดนี้ถามอะไร / ทำไมไม่ซื้อ (เช่น ราคา, เข้าใจผิดเรื่องสินค้า, แค่สอบถาม)',
        meta: { chats: c.chats, cpc: c.cpc, avgCpc: c.avgCpc, close: c.close, avgClose: c.avgClose, spend: c.spend, buys: c.buys } });
    },
    del: function (id) {
      if (!confirm('ลบเรื่องนี้ถาวร? ลบแล้วกู้คืนไม่ได้')) return;
      post('delete', { id: id }).then(function () { S.list = S.list.filter(function (x) { return x.id !== id; }); S.sel = null; toast('ลบแล้ว'); render(); badge(); }).catch(function (e) { toast(errMsg(e), true); });
    },
    _S: S
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
