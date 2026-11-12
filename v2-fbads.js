/* ===== Facebook Ads (หน้าตาใหม่ v2) — เพิ่มโดย Claude 12 พ.ย. 2569 =====
   ไฟล์แยก ไม่แก้โค้ดเดิม · ใช้ข้อมูลชุดเดียวกับหน้าเดิม (FB_HIERARCHY, fbDataMap, fbCampaignsMap, _fbNotes)
   ปุ่มแก้งบ / เปิด-ปิด / รายละเอียด เรียกฟังก์ชันเดิมของแดชบอร์ด
   ถ้าต้องการถอดออก: ลบบรรทัด <script src="v2-fbads.js"> ใน index.html */
(function () {
  'use strict';
  var S = { lvl: 'root', p: null, pg: null, h: null, acc: null, period: 'today', sort: 'spend', owner: '' };
  var PERIODS = [['today', 'วันนี้'], ['yesterday', 'เมื่อวาน'], ['3d', '3 วัน'], ['7d', '7 วัน'], ['14d', '14 วัน'], ['30d', '30 วัน']];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jsq(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' '); }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function today() { return ymd(new Date()); }
  function dayShift(n) { var d = new Date(); d.setDate(d.getDate() - n); return ymd(d); }
  function inPeriod(date) {
    var t = today();
    if (S.period === 'today') return date === t;
    if (S.period === 'yesterday') return date === dayShift(1);
    var n = parseInt(S.period, 10) || 7;
    return date < t && date >= dayShift(n);
  }
  function num(v) { return +v || 0; }
  function agg(rows) {
    var a = { spend: 0, rev: 0, buy: 0, chat: 0, imp: 0, clk: 0 };
    rows.forEach(function (r) { a.spend += num(r.spend); a.rev += num(r.revenue); a.buy += num(r.purchases); a.chat += num(r.conversations); a.imp += num(r.impressions); a.clk += num(r.clicks); });
    a.roas = a.spend ? a.rev / a.spend : 0; a.cpc = a.chat ? a.spend / a.chat : 0; a.cpa = a.buy ? a.spend / a.buy : 0; a.ctr = a.imp ? a.clk / a.imp * 100 : 0; a.close = a.chat ? a.buy / a.chat * 100 : 0;
    return a;
  }
  function rowsOfAccs(accs) { var out = []; accs.forEach(function (acc) { (window.fbDataMap && fbDataMap[acc] || []).forEach(function (r) { if (inPeriod(r.date)) out.push(r); }); }); return out; }
  function accsOfPage(pg) { var a = []; pg.accounts.forEach(function (h) { (h.adAccounts || []).forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); }); return a; }
  function accsOfProduct(p) { var a = []; p.pages.forEach(function (pg) { accsOfPage(pg).forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); }); return a; }
  function baht(n) { return '฿' + Math.round(n).toLocaleString(); }
  function int(n) { return Math.round(n).toLocaleString(); }
  function tone(roas, spend) { if (!spend) return 'mute'; return roas >= 1.3 ? 'good' : roas >= 1 ? 'warn' : 'bad'; }
  function pill(text, t) { return '<span class="v2-pill v2-' + t + '">' + esc(text) + '</span>'; }
  function roasPill(a) { return a.spend ? pill(a.roas.toFixed(2), tone(a.roas, a.spend)) : pill('–', 'mute'); }
  function cpaPill(a) { if (!a.buy || !a.rev) return '<span class="v2-dim">–</span>'; return pill(baht(a.cpa), a.cpa <= 200 ? 'good' : a.cpa <= 300 ? 'warn' : 'bad'); }

  function kpis(a, extra) {
    var items = [['ค่าแอด', baht(a.spend), ''], ['ยอดขาย (FB)', baht(a.rev), ''], ['ROAS', a.spend ? a.roas.toFixed(2) : '–', 'v2-t-' + tone(a.roas, a.spend)], ['คนทัก', int(a.chat), a.chat ? 'ต้นทุน ' + baht(a.cpc) + '/ทัก' : ''], ['ซื้อ', int(a.buy), a.chat ? 'ปิด ' + a.close.toFixed(1) + '% ของทัก' : ''], ['ต้นทุน/ซื้อ', a.buy && a.rev ? baht(a.cpa) : '–', a.buy && a.rev && a.cpa <= 200 ? 'ต่ำกว่า ฿200 → เพิ่มงบได้' : '']].concat(extra || []);
    return '<div class="v2-kpis">' + items.map(function (k) { var cls = k[2] && k[2].indexOf('v2-t-') === 0 ? k[2] : ''; var note = cls ? '' : k[2]; return '<div class="v2-card v2-kpi"><div class="v2-lbl">' + k[0] + '</div><div class="v2-val ' + cls + '">' + k[1] + '</div><div class="v2-note">' + esc(note) + '</div></div>'; }).join('') + '</div>';
  }
  function crumbs() {
    var c = ['<button class="v2-link" onclick="fbV2.go(\'root\')">Facebook Ads</button>'];
    if (S.p) c.push(S.lvl === 'product' ? '<b>' + esc(S.p.product) + '</b>' : '<button class="v2-link" onclick="fbV2.go(\'product\')">' + esc(S.p.product) + '</button>');
    if (S.pg) c.push(S.lvl === 'page' ? '<b>' + esc(S.pg.name) + '</b>' : '<button class="v2-link" onclick="fbV2.go(\'page\')">' + esc(S.pg.name) + '</button>');
    if (S.h) c.push('<b>' + esc(S.h.displayName) + '</b>');
    return '<nav class="v2-crumbs" aria-label="ตำแหน่ง">' + c.join('<span aria-hidden="true">›</span>') + '</nav>';
  }
  function header(title, sub) {
    var per = PERIODS.map(function (p) { return '<button class="' + (S.period === p[0] ? 'on' : '') + '" onclick="fbV2.period(\'' + p[0] + '\')">' + p[1] + '</button>'; }).join('');
    return crumbs() + '<div class="v2-head"><div><h1>' + esc(title) + '</h1><div class="v2-sub">' + sub + '</div></div><div class="v2-seg" role="group" aria-label="ช่วงเวลา">' + per + '</div></div>';
  }
  function sortBar(opts) { return '<div class="v2-seg v2-seg-sm" role="group" aria-label="เรียง">' + opts.map(function (o) { return '<button class="' + (S.sort === o[0] ? 'on' : '') + '" onclick="fbV2.sort(\'' + o[0] + '\')">' + o[1] + '</button>'; }).join('') + '</div>'; }
  function sorter(list) {
    var k = S.sort;
    return list.sort(function (x, y) {
      if (k === 'roas') return y.a.roas - x.a.roas;
      if (k === 'chat') return y.a.chat - x.a.chat;
      if (k === 'cpa') { var cx = x.a.buy && x.a.rev ? x.a.cpa : 1e9, cy = y.a.buy && y.a.rev ? y.a.cpa : 1e9; return cx - cy; }
      return y.a.spend - x.a.spend;
    });
  }

  /* ---------- ชั้น 1: ทุกสินค้า ---------- */
  function renderRoot() {
    var list = FB_HIERARCHY.map(function (p, i) { return { i: i, p: p, a: agg(rowsOfAccs(accsOfProduct(p))), n: accsOfProduct(p).length }; });
    var all = agg(rowsOfAccs(FB_HIERARCHY.reduce(function (acc, p) { return acc.concat(accsOfProduct(p)); }, [])));
    var good = 0, mid = 0, bad = 0; list.forEach(function (x) { if (!x.a.spend) return; var t = tone(x.a.roas, 1); if (t === 'good') good++; else if (t === 'warn') mid++; else bad++; });
    sorter(list);
    var h = header('Facebook Ads', FB_HIERARCHY.length + ' กลุ่มสินค้า · อัปเดตอัตโนมัติ');
    h += kpis(all);
    h += '<div class="v2-row3"><div class="v2-flag v2-good"><b>' + good + '</b><span>สินค้า ROAS ≥ 1.3<br>เพิ่มงบได้</span></div><div class="v2-flag v2-warn"><b>' + mid + '</b><span>ROAS 1.0–1.3<br>เฝ้าดู</span></div><div class="v2-flag v2-bad"><b>' + bad + '</b><span>ROAS ต่ำกว่า 1<br>ควรลดงบ</span></div></div>';
    h += '<section class="v2-card v2-tablecard"><div class="v2-tablehead"><h2>กลุ่มสินค้า</h2>' + sortBar([['spend', 'ค่าแอด'], ['roas', 'ROAS'], ['chat', 'คนทัก'], ['cpa', 'ต้นทุน/ซื้อต่ำ']]) + '</div><div class="v2-scroll"><table class="v2-table"><thead><tr><th>สินค้า</th><th class="c">ROAS</th><th>ค่าแอด (สัดส่วน)</th><th class="r">ยอดขาย</th><th class="r">คนทัก</th><th class="r">ซื้อ</th><th class="r">ต้นทุน/ทัก</th><th class="r">ปิด/ทัก</th><th class="r">ต้นทุน/ซื้อ</th><th></th></tr></thead><tbody>';
    list.forEach(function (x) {
      var share = all.spend ? x.a.spend / all.spend * 100 : 0;
      h += '<tr class="v2-click" onclick="fbV2.product(' + x.i + ')"><td><span class="v2-dot" style="background:' + esc(x.p.color || '#64748b') + '"></span><b>' + esc(x.p.product) + '</b><div class="v2-dim">' + x.n + ' บัญชี</div></td><td class="c">' + roasPill(x.a) + '</td><td><div class="v2-share"><span>' + baht(x.a.spend) + '</span><i><em style="width:' + share.toFixed(1) + '%"></em></i><small>' + share.toFixed(0) + '%</small></div></td><td class="r">' + baht(x.a.rev) + '</td><td class="r">' + int(x.a.chat) + '</td><td class="r">' + int(x.a.buy) + '</td><td class="r">' + (x.a.chat ? baht(x.a.cpc) : '–') + '</td><td class="r">' + (x.a.chat ? x.a.close.toFixed(0) + '%' : '–') + '</td><td class="r">' + cpaPill(x.a) + '</td><td class="r"><span class="v2-chev" aria-hidden="true">›</span></td></tr>';
    });
    h += '</tbody></table></div><div class="v2-foot">ROAS = ยอดขายที่ Facebook นับ ÷ ค่าแอด · ปิด/ทัก = ซื้อ ÷ คนทัก · กดแถวเพื่อดูรายเพจ</div></section>';
    return h;
  }

  /* ---------- ชั้น 2: สินค้า ---------- */
  function campList(accs) {
    var m = {};
    rowsOfAccs(accs).forEach(function (r) { var k = r.campaign; (m[k] = m[k] || { name: k, rows: [] }).rows.push(r); });
    return Object.keys(m).map(function (k) { return { name: k, a: agg(m[k].rows), acc: m[k].rows[0] && m[k].rows[0]._acc }; });
  }
  function pageOfAcc(p, acc) { for (var i = 0; i < p.pages.length; i++) { if (accsOfPage(p.pages[i]).indexOf(acc) >= 0) return p.pages[i].name; } return ''; }
  function topCampaigns(accs, p) {
    var out = [];
    accs.forEach(function (acc) { var m = {}; (fbDataMap[acc] || []).forEach(function (r) { if (inPeriod(r.date)) (m[r.campaign] = m[r.campaign] || []).push(r); }); Object.keys(m).forEach(function (k) { var a = agg(m[k]); if (a.spend >= 100) out.push({ name: k, acc: acc, a: a }); }); });
    out.sort(function (x, y) { return y.a.roas - x.a.roas; });
    var h = '<section class="v2-card v2-tablecard"><div class="v2-tablehead"><h2>Top 5 แคมเปญ ROAS ดีที่สุด</h2><span class="v2-dim">งบ ≥ ฿100</span></div><div class="v2-scroll"><table class="v2-table"><thead><tr><th>#</th><th>แคมเปญ</th><th class="r">ค่าแอด</th><th class="r">ยอดขาย</th><th class="c">ROAS</th><th class="r">ซื้อ</th><th class="r">ทัก</th></tr></thead><tbody>';
    if (!out.length) h += '<tr><td colspan="7" class="c v2-dim">ยังไม่มีแคมเปญที่ใช้เงินถึง ฿100 ในช่วงนี้</td></tr>';
    out.slice(0, 5).forEach(function (c, i) {
      h += '<tr><td><b>' + (i + 1) + '</b></td><td><div class="v2-ell">' + esc(c.name) + '</div><div class="v2-tags">' + (p ? '<span class="v2-tag">' + esc(pageOfAcc(p, c.acc)) + '</span>' : '') + '<span class="v2-tag v2-tag-mute">' + esc(c.acc) + '</span></div></td><td class="r">' + baht(c.a.spend) + '</td><td class="r">' + baht(c.a.rev) + '</td><td class="c">' + roasPill(c.a) + '</td><td class="r">' + int(c.a.buy) + '</td><td class="r">' + int(c.a.chat) + '</td></tr>';
    });
    return h + '</tbody></table></div></section>';
  }
  function renderProduct() {
    var p = S.p, accs = accsOfProduct(p), a = agg(rowsOfAccs(accs));
    var owners = []; p.pages.forEach(function (pg) { var m = pg.manager || '-'; if (owners.indexOf(m) < 0) owners.push(m); });
    var h = header(p.product, accs.length + ' บัญชี · ' + p.pages.length + ' เพจ');
    h += kpis(a);
    h += topCampaigns(accs, p);
    h += '<div class="v2-head2"><h2>เพจทั้งหมด</h2><div class="v2-chips"><span class="v2-dim">ผู้ดูแล</span>' + [''].concat(owners).map(function (o) { return '<button class="' + (S.owner === o ? 'on' : '') + '" onclick="fbV2.owner(\'' + jsq(o) + '\')">' + (o === '' ? 'ทั้งหมด' : o === '-' ? 'ไม่ระบุ' : esc(o)) + '</button>'; }).join('') + '</div></div>';
    var pages = p.pages.map(function (pg, i) { return { i: i, pg: pg, a: agg(rowsOfAccs(accsOfPage(pg))) }; }).filter(function (x) { return !S.owner || (x.pg.manager || '-') === S.owner; });
    pages.sort(function (x, y) { return y.a.spend - x.a.spend; });
    h += '<div class="v2-grid">';
    pages.forEach(function (x) {
      var n = accsOfPage(x.pg).length;
      h += '<button class="v2-card v2-pagecard" onclick="fbV2.page(' + x.i + ')"><div class="v2-pc-top"><div><b>' + esc(x.pg.name) + '</b><div class="v2-dim">' + esc(x.pg.manager && x.pg.manager !== '-' ? x.pg.manager : 'ไม่ระบุผู้ดูแล') + ' · ' + n + ' บัญชี' + (x.pg.phone && x.pg.phone !== '-' ? ' · ' + esc(x.pg.phone) : '') + '</div></div>' + roasPill(x.a) + '</div><div class="v2-pc-nums"><div><small>ค่าแอด</small>' + baht(x.a.spend) + '</div><div><small>ยอดขาย</small>' + baht(x.a.rev) + '</div><div><small>ทัก</small>' + int(x.a.chat) + '</div><div><small>ซื้อ</small>' + int(x.a.buy) + '</div></div><span class="v2-more">ดูบัญชีในเพจ ›</span></button>';
    });
    return h + '</div>';
  }

  /* ---------- ชั้น 3: เพจ ---------- */
  function renderPage() {
    var pg = S.pg, accs = accsOfPage(pg), a = agg(rowsOfAccs(accs));
    var h = header(pg.name, esc(S.p.product) + ' · ' + (pg.manager && pg.manager !== '-' ? 'ผู้ดูแล ' + esc(pg.manager) + ' · ' : '') + accs.length + ' บัญชีโฆษณา');
    h += kpis(a, [['CTR', a.imp ? a.ctr.toFixed(2) + '%' : '–', '']]);
    h += topCampaigns(accs, null);
    h += '<h2 class="v2-h2">บัญชีโฆษณาในเพจนี้</h2><div class="v2-list">';
    pg.accounts.forEach(function (holder, hi) {
      (holder.adAccounts || []).forEach(function (acc) {
        var x = agg(rowsOfAccs([acc]));
        var cm = (window.fbCampaignsMap && fbCampaignsMap[acc]) || {};
        var nActive = Object.keys(cm).filter(function (k) { return cm[k] && cm[k].status === 'ACTIVE'; }).length;
        var initials = String(holder.displayName || acc).replace(/[^A-Za-z\u0E00-\u0E7F ]/g, '').split(' ').filter(Boolean).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
        h += '<button class="v2-card v2-acct" onclick="fbV2.acct(' + hi + ',\'' + jsq(acc) + '\')"><span class="v2-av">' + esc(initials || 'AC') + '</span><span class="v2-acct-name"><b>' + esc(holder.displayName) + '</b><small>' + (x.spend ? 'ใช้เงินอยู่' : 'ช่วงนี้ยังไม่ใช้เงิน') + ' · แคมเปญเปิด ' + nActive + '</small></span><span class="v2-acct-nums"><span><small>ค่าแอด</small>' + baht(x.spend) + '</span><span><small>ROAS</small>' + (x.spend ? x.roas.toFixed(2) : '–') + '</span><span><small>ทัก</small>' + int(x.chat) + '</span><span><small>ซื้อ</small>' + int(x.buy) + '</span></span><span class="v2-chev" aria-hidden="true">›</span></button>';
      });
      if (!(holder.adAccounts || []).length) h += '<div class="v2-card v2-acct v2-empty">' + esc(holder.displayName) + ' — ยังไม่ได้ผูกบัญชีโฆษณา</div>';
    });
    return h + '</div>';
  }

  /* ---------- ชั้น 4: บัญชี + แคมเปญ + กรอกยอด ---------- */
  function renderAcct() {
    var acc = S.acc, rows = rowsOfAccs([acc]), a = agg(rows), T = today();
    var cm = (window.fbCampaignsMap && fbCampaignsMap[acc]) || {};
    var m = {}; rows.forEach(function (r) { (m[r.campaign] = m[r.campaign] || []).push(r); });
    Object.keys(cm).forEach(function (k) { if (!m[k] && cm[k] && cm[k].status === 'ACTIVE') m[k] = []; });
    var camps = Object.keys(m).map(function (k) { return { name: k, a: agg(m[k]), info: cm[k] || {} }; });
    camps.sort(function (x, y) { return y.a.spend - x.a.spend || (x.info.status === 'ACTIVE' ? -1 : 1); });
    var h = header(S.h.displayName, esc(S.pg.name) + ' · ' + esc(acc));
    if (!a.spend) h += '<div class="v2-banner v2-b-mute"><b>ช่วงนี้ยังไม่มีค่าใช้จ่าย</b> — แคมเปญเปิดอยู่ ' + camps.filter(function (c) { return c.info.status === 'ACTIVE'; }).length + ' ตัว · ลองเลือกช่วง 7 วัน</div>';
    else if (a.roas < 1) h += '<div class="v2-banner v2-b-bad"><b>ROAS ' + a.roas.toFixed(2) + ' — ขาดทุนในช่วงนี้</b> · ดูแคมเปญที่ใช้เงินมากแต่ยังไม่มีคนซื้อด้านล่าง</div>';
    h += kpis(a, [['CTR', a.imp ? a.ctr.toFixed(2) + '%' : '–', ''], ['การแสดงผล', int(a.imp), '']]);
    h += '<div class="v2-actions"><button onclick="fbV2.old()">ย้ายไปเพจอื่น / สถานะบัญชี / Ad Creatives (หน้าเดิม)</button></div>';
    h += '<section class="v2-card v2-tablecard"><div class="v2-tablehead"><h2>แคมเปญ (' + camps.length + ')</h2><span class="v2-dim">ช่องสีเหลือง = แผนงบวันนี้ ' + T + '</span></div><div class="v2-scroll"><table class="v2-table v2-camp"><thead><tr><th>สถานะ</th><th>แคมเปญ</th><th class="r">ค่าแอด</th><th class="r">CTR</th><th class="r">ทัก</th><th class="r">฿/ทัก</th><th class="r">ซื้อ</th><th class="c">ROAS</th><th class="r">฿/ซื้อ</th><th class="v2-plan c" colspan="3">ยอดเก่า → ยอดใหม่</th><th class="c">จัดการ</th></tr></thead><tbody>';
    if (!camps.length) h += '<tr><td colspan="13" class="c v2-dim">ไม่มีแคมเปญในช่วงนี้</td></tr>';
    camps.forEach(function (c) {
      var st = c.info.status || '', on = st === 'ACTIVE', id = c.info.id || '';
      var note = (window._fbNotes && _fbNotes[T] && _fbNotes[T][c.name]) || { old: '', new: '' };
      var o = parseFloat(note.old), n = parseFloat(note['new']), chg = '', ct = 'mute';
      if (note['new'] !== undefined && note['new'] !== '') { if (isNaN(n)) { chg = 'ปิด'; } else if (isNaN(o)) { chg = 'ใหม่'; ct = 'good'; } else if (n > o) { chg = '+' + (n - o); ct = 'good'; } else if (n < o) { chg = '−' + (o - n); ct = 'bad'; } else chg = 'คงเดิม'; }
      var stLabel = on ? (c.a.spend ? 'ใช้งาน' : 'เปิด · ยังไม่ใช้เงิน') : (st === 'PAUSED' ? 'ปิดอยู่' : (st || '–'));
      var stTone = on ? (c.a.spend ? 'good' : 'warn') : 'mute';
      var nm = jsq(c.name);
      h += '<tr data-camp="' + esc(c.name) + '"><td>' + pill(stLabel, stTone) + '</td><td class="v2-cname"><button class="v2-link v2-ell" title="' + esc(c.name) + '" onclick="fbV2.detail(\'' + nm + '\',\'' + id + '\')">' + esc(c.name) + '</button></td><td class="r"><b>' + (c.a.spend ? baht(c.a.spend) : '–') + '</b></td><td class="r">' + (c.a.imp ? c.a.ctr.toFixed(2) + '%' : '–') + '</td><td class="r">' + (c.a.chat ? int(c.a.chat) : '–') + '</td><td class="r">' + (c.a.chat ? baht(c.a.cpc) : '–') + '</td><td class="r">' + (c.a.buy ? int(c.a.buy) : '–') + '</td><td class="c">' + roasPill(c.a) + '</td><td class="r">' + cpaPill(c.a) + '</td>';
      h += '<td class="v2-plan"><input aria-label="ยอดเก่า" data-field="old" value="' + esc(note.old || '') + '" placeholder="เก่า" onchange="fbV2.note(\'' + nm + '\',\'old\',this.value)"></td><td class="v2-plan"><input aria-label="ยอดใหม่" data-field="new" value="' + esc(note['new'] || '') + '" placeholder="ใหม่" onchange="fbV2.note(\'' + nm + '\',\'new\',this.value)"></td><td class="v2-plan">' + (chg ? pill(chg, ct) : '') + '</td>';
      h += '<td class="c v2-btns">' + (id ? '<button onclick="fbV2.budget(\'' + nm + '\',\'' + id + '\')">งบ</button><button onclick="fbV2.toggle(\'' + nm + '\',\'' + id + '\',' + on + ')">' + (on ? 'ปิด' : 'เปิด') + '</button>' : '') + '</td></tr>';
    });
    h += '</tbody></table></div><div class="v2-foot">กดชื่อแคมเปญ = แผงรายละเอียด + AI + ครีเอทีฟ · ปุ่ม "งบ" / "ปิด" ทำงานกับ Facebook จริง (ใช้ระบบเดิม) · ยอดใหม่ปัดหลักร้อย ขั้นต่ำ 200</div></section>';
    return h;
  }

  function render() {
    var box = document.getElementById('fbV2Inner'); if (!box) return;
    if (typeof FB_HIERARCHY === 'undefined' || !window.fbDataMap) { box.innerHTML = '<p class="v2-dim" style="padding:32px">กำลังโหลดข้อมูล…</p>'; return; }
    var h;
    try { h = S.lvl === 'acct' ? renderAcct() : S.lvl === 'page' ? renderPage() : S.lvl === 'product' ? renderProduct() : renderRoot(); }
    catch (e) { h = '<div class="v2-banner v2-b-bad">หน้าใหม่แสดงผลไม่ได้: ' + esc(e.message) + ' — ใช้เมนู Facebook Ads เดิมไปก่อน</div>'; }
    box.innerHTML = h;
  }

  function open(el) {
    document.querySelectorAll('[id$="View"]').forEach(function (v) { v.style.display = 'none'; });
    document.querySelectorAll('.sb-item').forEach(function (i) { i.classList.remove('active'); });
    var v = document.getElementById('fbV2View'); if (v) v.style.display = '';
    if (el) el.classList.add('active');
    render(); window.scrollTo(0, 0);
  }

  window.fbV2 = {
    open: open, render: render,
    go: function (l) { if (l === 'root') { S.p = S.pg = S.h = S.acc = null; } if (l === 'product') { S.pg = S.h = S.acc = null; } if (l === 'page') { S.h = S.acc = null; } S.lvl = l; render(); window.scrollTo(0, 0); },
    product: function (i) { S.p = FB_HIERARCHY[i]; S.pg = S.h = S.acc = null; S.owner = ''; S.lvl = 'product'; render(); window.scrollTo(0, 0); },
    page: function (i) { S.pg = S.p.pages[i]; S.h = S.acc = null; S.lvl = 'page'; render(); window.scrollTo(0, 0); },
    acct: function (hi, acc) { S.h = S.pg.accounts[hi]; S.acc = acc; S.lvl = 'acct'; window.fbAccount = acc; try { fbAccount = acc; } catch (e) {} render(); window.scrollTo(0, 0); },
    period: function (p) { S.period = p; render(); },
    sort: function (k) { S.sort = k; render(); },
    owner: function (o) { S.owner = o; render(); },
    note: function (name, field, val) { try { fbAccount = S.acc; _fbNotesSave(today(), name, field, String(val).trim()); } catch (e) { alert('บันทึกไม่สำเร็จ: ' + e.message); } setTimeout(render, 300); },
    detail: function (name, id) { try { fbAccount = S.acc; fbOpenCampDetail(name, id); } catch (e) { alert(e.message); } },
    budget: function (name, id) { try { fbAccount = S.acc; fbUpdateBudget(name, id); } catch (e) { alert(e.message); } },
    toggle: function (name, id, on) { try { fbAccount = S.acc; Promise.resolve(fbToggleStatus(name, id, on)).then(function () { setTimeout(render, 1500); }); } catch (e) { alert(e.message); } },
    old: function () {
      var sb = document.getElementById('sb-fb');
      try { switchView('fb', sb); fbNavProduct = S.p; fbNavPage = S.pg; fbNavHolder = S.h; fbAccount = S.acc; renderFB(); } catch (e) { alert(e.message); }
    }
  };

  function install() {
    if (document.getElementById('sb-fbv2')) return;
    var sb = document.getElementById('sb-fb'), wrap = document.querySelector('.content-wrap');
    if (!sb || !wrap) return setTimeout(install, 500);
    var item = document.createElement('div');
    item.className = 'sb-item'; item.id = 'sb-fbv2';
    item.innerHTML = '<span class="sb-icon">✨</span><span>Facebook Ads (ใหม่)</span>';
    item.onclick = function () { open(item); };
    sb.parentNode.insertBefore(item, sb.nextSibling);
    var view = document.createElement('div');
    view.id = 'fbV2View'; view.style.display = 'none';
    view.innerHTML = '<div class="v2-wrap" id="fbV2Inner"></div>';
    wrap.appendChild(view);
    var css = document.createElement('style');
    css.textContent = [
      '.v2-wrap{--ink:#0F172A;--mute:#475569;--line:#E5E7EB;--bg:#F5F6FA;--blue:#2563EB;font-family:"IBM Plex Sans Thai","Sarabun",system-ui,sans-serif;color:var(--ink);background:var(--bg);padding:24px 28px 64px;font-variant-numeric:tabular-nums;min-height:100vh;box-sizing:border-box}',
      '.v2-wrap *{box-sizing:border-box}.v2-wrap h1{margin:0;font-size:26px;font-weight:700;color:var(--ink)}.v2-wrap h2{margin:0;font-size:16px;font-weight:600;color:var(--ink)}',
      '.v2-crumbs{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px;color:var(--mute);margin-bottom:12px}.v2-crumbs b{color:var(--ink)}',
      '.v2-link{border:0;background:none;padding:0;font:inherit;color:#1D4ED8;font-weight:600;cursor:pointer;text-align:left}.v2-link:hover{text-decoration:underline}',
      '.v2-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:14px;margin-bottom:16px}.v2-sub{font-size:14px;color:var(--mute);margin-top:2px}',
      '.v2-seg{display:flex;flex-wrap:wrap;gap:4px;background:#E9EDF4;padding:4px;border-radius:10px}.v2-seg button{height:36px;padding:0 14px;border:0;border-radius:7px;background:transparent;color:var(--mute);font:inherit;font-size:13px;cursor:pointer}.v2-seg button.on{background:#fff;color:var(--ink);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.06)}.v2-seg-sm button{height:32px;padding:0 10px}',
      '.v2-card{background:#fff;border:1px solid var(--line);border-radius:12px}.v2-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}.v2-kpi{padding:14px 16px}.v2-lbl{font-size:12px;color:var(--mute)}.v2-val{font-size:24px;font-weight:700;margin:2px 0}.v2-note{font-size:12px;color:var(--mute);min-height:16px}',
      '.v2-t-good{color:#15803D}.v2-t-warn{color:#B45309}.v2-t-bad{color:#B91C1C}.v2-t-mute{color:var(--mute)}',
      '.v2-row3{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px}.v2-flag{flex:1 1 200px;display:flex;gap:12px;align-items:center;border-radius:12px;padding:12px 16px;font-size:13px}.v2-flag b{font-size:24px}',
      '.v2-flag.v2-good{background:#F0FDF4;border:1px solid #BBF7D0;color:#14532D}.v2-flag.v2-warn{background:#FFFBEB;border:1px solid #FDE68A;color:#78350F}.v2-flag.v2-bad{background:#FEF2F2;border:1px solid #FECACA;color:#7F1D1D}',
      '.v2-tablecard{overflow:hidden;margin-bottom:16px}.v2-tablehead{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid var(--line)}.v2-scroll{overflow-x:auto}',
      '.v2-table{width:100%;border-collapse:collapse;font-size:13px;min-width:860px}.v2-table th{padding:10px 12px;font-size:12px;font-weight:600;color:var(--mute);text-align:left;border-bottom:1px solid var(--line);white-space:nowrap;background:#FAFBFD}.v2-table td{padding:10px 12px;border-bottom:1px solid #F0F2F6;vertical-align:middle}.v2-table .r{text-align:right}.v2-table .c{text-align:center}',
      '.v2-click{cursor:pointer}.v2-click:hover td{background:#F8FAFF}.v2-dot{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:8px}.v2-dim{color:var(--mute);font-size:12px}.v2-chev{color:#94A3B8;font-size:18px}',
      '.v2-share{display:flex;align-items:center;gap:8px}.v2-share span{width:84px;text-align:right}.v2-share i{width:90px;height:8px;background:#EEF1F6;border-radius:99px;overflow:hidden;display:block}.v2-share em{display:block;height:100%;background:#94A3B8;border-radius:99px}.v2-share small{color:var(--mute)}',
      '.v2-pill{display:inline-block;min-width:44px;text-align:center;padding:3px 9px;border-radius:99px;font-size:12px;font-weight:700;white-space:nowrap}.v2-pill.v2-good{background:#DCFCE7;color:#15803D}.v2-pill.v2-warn{background:#FEF3C7;color:#B45309}.v2-pill.v2-bad{background:#FEE2E2;color:#B91C1C}.v2-pill.v2-mute{background:#F1F5F9;color:var(--mute)}',
      '.v2-foot{padding:10px 18px;font-size:12px;color:var(--mute);border-top:1px solid var(--line)}.v2-ell{max-width:440px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}.v2-tags{display:flex;gap:6px;margin-top:4px;flex-wrap:wrap}.v2-tag{font-size:11px;padding:1px 8px;border-radius:99px;background:#EFF4FF;color:#1D4ED8}.v2-tag-mute{background:#F1F5F9;color:#334155}',
      '.v2-head2{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin:8px 0 12px}.v2-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.v2-chips button{height:34px;padding:0 14px;border-radius:99px;border:1px solid #D7DBE3;background:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer;color:var(--ink)}.v2-chips button.on{background:var(--blue);border-color:var(--blue);color:#fff}',
      '.v2-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.v2-pagecard{display:flex;flex-direction:column;gap:12px;padding:16px;text-align:left;font:inherit;color:var(--ink);cursor:pointer}.v2-pagecard:hover{border-color:#93C5FD}.v2-pc-top{display:flex;justify-content:space-between;gap:8px}.v2-pc-nums{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;font-weight:600;font-size:14px}.v2-pc-nums small,.v2-acct-nums small{display:block;font-size:11px;color:var(--mute);font-weight:400}.v2-more{font-size:13px;font-weight:600;color:#1D4ED8}',
      '.v2-h2{margin:8px 0 12px!important}.v2-list{display:flex;flex-direction:column;gap:10px}.v2-acct{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:14px 18px;text-align:left;font:inherit;color:var(--ink);cursor:pointer;width:100%}.v2-acct:hover{border-color:#93C5FD}.v2-av{width:42px;height:42px;border-radius:50%;background:#EFF4FF;color:#1D4ED8;display:flex;align-items:center;justify-content:center;font-weight:700;flex:none}',
      '.v2-acct-name{flex:1 1 200px;display:flex;flex-direction:column}.v2-acct-name small{font-size:12px;color:var(--mute)}.v2-acct-nums{display:flex;gap:22px;font-weight:600}.v2-empty{color:var(--mute);cursor:default}',
      '.v2-banner{padding:12px 16px;border-radius:12px;font-size:14px;margin-bottom:14px}.v2-b-bad{background:#FEF2F2;border:1px solid #FECACA;color:#7F1D1D}.v2-b-mute{background:#fff;border:1px dashed #CBD5E1;color:#334155}',
      '.v2-actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}.v2-actions button{height:40px;padding:0 14px;border-radius:10px;border:1px solid #D7DBE3;background:#fff;font:inherit;font-size:13px;cursor:pointer;color:var(--ink)}',
      '.v2-camp .v2-cname{max-width:320px}.v2-plan{background:#FFFBEB!important}.v2-plan input{width:66px;height:34px;border:1px solid #FCD34D;border-radius:6px;text-align:center;font:inherit;font-size:13px;font-weight:600;background:#fff;color:var(--ink)}',
      '.v2-btns{white-space:nowrap}.v2-btns button{height:32px;padding:0 10px;margin:0 2px;border-radius:8px;border:1px solid #D7DBE3;background:#fff;font:inherit;font-size:12px;cursor:pointer;color:var(--ink)}',
      '@media (max-width:640px){.v2-wrap{padding:16px}.v2-acct-nums{gap:14px}}'
    ].join('\n');
    document.head.appendChild(css);
    document.addEventListener('click', function (e) { var it = e.target.closest && e.target.closest('.sb-item'); if (it && it.id !== 'sb-fbv2') { var v = document.getElementById('fbV2View'); if (v) v.style.display = 'none'; } }, true);
    var last = -1;
    setInterval(function () { var v = document.getElementById('fbV2View'); if (!v || v.style.display === 'none' || !window.fbDataMap) return; if (document.activeElement && document.activeElement.closest && document.activeElement.closest('#fbV2View input')) return; var n = 0; for (var k in fbDataMap) n += (fbDataMap[k] || []).length; if (n !== last) { last = n; render(); } }, 15000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
