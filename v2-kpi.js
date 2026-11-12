/* v2-kpi.js — หน้า "เป้าประจำเดือน" (แทน KPI Overview)
   เป้าเก็บใน monthly-targets.json บน GitHub (ทุกเครื่องเห็นเหมือนกัน)
   ค่าแอดที่ยิงแล้ว = Facebook (fbDataMap) ตั้งแต่วันที่ 1 ของเดือน
   %ADS / ยอดขายจริง = CasperCall (เก็บใน _casper ของไฟล์เดียวกัน) */
(function () {
  'use strict';
  var FILE = 'monthly-targets.json';
  var API = 'https://api.github.com/repos/ads02-ux/ads-dashboard/contents/' + FILE;
  var PAL = ['#2563EB', '#0EA5E9', '#6366F1', '#14B8A6', '#8B5CF6', '#0891B2', '#64748B'];
  var THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var THF = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  var DATA = null, SHA = null, LOADING = false, ERR = '';
  var S = { month: '', sel: 'all', editing: false, draft: null, saving: false };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function curMonth() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function shiftMonth(k, n) { var p = k.split('-'), d = new Date(+p[0], +p[1] - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function mInfo(k) {
    var p = k.split('-'), y = +p[0], m = +p[1] - 1, days = new Date(y, m + 1, 0).getDate(), now = new Date();
    var cm = curMonth(), done = k < cm ? days : (k > cm ? 0 : now.getDate() - 1 + (now.getHours() * 60 + now.getMinutes()) / 1440);
    return { y: y, m: m, days: days, done: done, label: THF[m] + ' ' + (y + 543), short: THM[m], first: k + '-01', last: k + '-' + pad(days), isCur: k === cm, isPast: k < cm };
  }
  function B(n) { return '฿' + Math.round(n || 0).toLocaleString('en-US'); }
  function M(n) { n = n || 0; return Math.abs(n) >= 1e6 ? '฿' + (n / 1e6).toFixed(2) + 'M' : (Math.abs(n) >= 1e3 ? '฿' + Math.round(n / 1000) + 'K' : '฿' + Math.round(n)); }
  function N(n) { return Math.round(n || 0).toLocaleString('en-US'); }
  function P(x, d) { return (x * 100).toFixed(d == null ? 0 : d) + '%'; }
  function user() { try { return sessionStorage.getItem('rb_username') || 'ไม่ทราบชื่อ'; } catch (e) { return 'ไม่ทราบชื่อ'; } }
  function pat() { try { return localStorage.getItem('_ghPAT') || (window._nw ? window._nw.join('') : ''); } catch (e) { return ''; } }
  function hdr(raw) { return { Authorization: 'token ' + pat(), Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json' }; }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }

  /* ---------- โหลด / บันทึก ---------- */
  function load(quiet) {
    if (LOADING) return Promise.resolve();
    LOADING = true;
    var u = API + '?ref=main&t=' + Date.now();
    return Promise.all([
      fetch(u, { headers: hdr(false), cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }),
      fetch(u, { headers: hdr(true), cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
    ]).then(function (res) {
      LOADING = false;
      if (!res[1]) { ERR = 'โหลดเป้าไม่สำเร็จ'; if (!quiet) render(); return; }
      ERR = ''; SHA = res[0] && res[0].sha;
      var changed = JSON.stringify(res[1]) !== JSON.stringify(DATA);
      DATA = res[1]; DATA.months = DATA.months || {}; DATA._history = DATA._history || []; DATA._casper = DATA._casper || {};
      if (changed && !S.editing) render();
    }).catch(function () { LOADING = false; ERR = 'โหลดเป้าไม่สำเร็จ'; if (!quiet) render(); });
  }
  function save(mutate, note, month) {
    S.saving = true; render();
    function attempt(n) {
      var u = API + '?ref=main&t=' + Date.now();
      return Promise.all([
        fetch(u, { headers: hdr(false), cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }),
        fetch(u, { headers: hdr(true), cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
      ]).then(function (res) {
        var remote = res[1] || { months: {}, _history: [], _casper: {} };
        remote.months = remote.months || {}; remote._history = remote._history || []; remote._casper = remote._casper || {};
        mutate(remote);
        remote._history.push({ t: new Date().toISOString(), by: user(), month: month, txt: note });
        if (remote._history.length > 300) remote._history = remote._history.slice(-300);
        var body = { message: 'targets ' + new Date().toISOString(), content: b64(JSON.stringify(remote, null, 2)) };
        if (res[0] && res[0].sha) body.sha = res[0].sha;
        return fetch(API, { method: 'PUT', headers: { Authorization: 'token ' + pat(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) {
          if (r.ok) return r.json().then(function (j) { DATA = remote; SHA = j && j.content && j.content.sha; return true; });
          if ((r.status === 409 || r.status === 422) && n < 3) return attempt(n + 1);
          throw new Error('HTTP ' + r.status);
        });
      });
    }
    return attempt(0).then(function () { S.saving = false; S.editing = false; S.draft = null; render(); toast('บันทึกแล้ว — ทุกเครื่องเห็นค่าใหม่'); })
      .catch(function (e) { S.saving = false; render(); toast('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง (' + e.message + ')', true); });
  }
  function toast(t, bad) {
    var el = document.getElementById('k2Toast'); if (!el) return;
    el.textContent = t; el.className = 'k2-toast on' + (bad ? ' bad' : '');
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.className = 'k2-toast'; }, 3500);
  }

  /* ---------- ข้อมูลจริง ---------- */
  function prodByName(name) { return (window.FB_HIERARCHY || []).filter(function (p) { return p.product === name; })[0]; }
  function accsOf(p) { var a = []; (p && p.pages || []).forEach(function (pg) { (pg.accounts || []).forEach(function (h) { (h.adAccounts || []).forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); }); }); return a; }
  function fbSpend(product, info) {
    var p = prodByName(product); if (!p || !window.fbDataMap) return null;
    var s = 0, maxD = '';
    accsOf(p).forEach(function (acc) { (fbDataMap[acc] || []).forEach(function (r) { if (r.date >= info.first && r.date <= info.last) { s += +r.spend || 0; if (r.date > maxD) maxD = r.date; } }); });
    return { spend: s, through: maxD };
  }
  function casperOf(month, product) { var c = DATA && DATA._casper && DATA._casper[month]; return c && c[product] || null; }

  function compute(list, info, month) {
    var pace = info.days ? info.done / info.days : 0;
    return list.map(function (r, i) {
      var fb = fbSpend(r.product, info), c = casperOf(month, r.product);
      var spend = fb ? fb.spend : 0;
      var prog = r.target ? spend / r.target : 0;
      var fc = info.done >= 1 ? spend / info.done * info.days : 0;
      var adsA = c && c.sales ? c.adsAmt / c.sales * 100 : null;
      var cacA = c && c.orders ? c.adsAmt / c.orders : null;
      var st;
      if (!info.done) st = ['ยังไม่เริ่ม', 'mute'];
      else if (adsA != null && r.ads && adsA > r.ads) st = ['%ADS เกินเป้า', 'bad'];
      else if (r.target && prog < pace * 0.85) st = ['ยิงช้ากว่าแผน', 'warn'];
      else if (r.target && fc > r.target * 1.15) st = ['ยิงเร็วกว่าแผน', 'info'];
      else st = ['ตามแผน', 'good'];
      return { i: i, r: r, fb: fb, c: c, spend: spend, prog: prog, fc: fc, adsA: adsA, cacA: cacA, st: st,
        needSales: r.ads ? r.target / (r.ads / 100) : 0, needOrders: r.cac ? r.target / r.cac : 0 };
    });
  }
  function agg(rows) {
    var a = { target: 0, spend: 0, needSales: 0, needOrders: 0, cSales: 0, cAds: 0, cOrders: 0, fc: 0, nC: 0, okAds: 0, n: rows.length };
    rows.forEach(function (x) {
      a.target += x.r.target || 0; a.spend += x.spend; a.needSales += x.needSales; a.needOrders += x.needOrders; a.fc += x.fc;
      if (x.c) { a.cSales += x.c.sales || 0; a.cAds += x.c.adsAmt || 0; a.cOrders += x.c.orders || 0; a.nC++; }
      if (x.adsA != null && x.r.ads && x.adsA <= x.r.ads) a.okAds++;
    });
    a.adsT = a.needSales ? a.target / a.needSales * 100 : 0;
    a.adsA = a.cSales ? a.cAds / a.cSales * 100 : null;
    a.cacT = a.needOrders ? a.target / a.needOrders : 0;
    a.cacA = a.cOrders ? a.cAds / a.cOrders : null;
    return a;
  }

  /* ---------- หน้าจอ ---------- */
  function people(list) { var o = []; list.forEach(function (r) { if (r.who && o.indexOf(r.who) < 0) o.push(r.who); }); return o; }
  function colorOf(who, all) { var i = all.indexOf(who); return PAL[(i < 0 ? 0 : i) % PAL.length]; }
  function bar(prog, pace, color) {
    return '<div class="k2-bar"><i style="width:' + Math.min(prog * 100, 100).toFixed(1) + '%;background:' + color + '"></i>' +
      (pace > 0 && pace < 1 ? '<b style="left:' + (pace * 100).toFixed(1) + '%"></b>' : '') + '</div>';
  }
  function adsCell(v, t) { if (v == null) return '<span class="k2-dim">รอยอด</span>'; return '<span class="' + (t && v > t ? 'k2-bad' : 'k2-good') + '">' + v.toFixed(1) + '%</span>'; }
  function pill(st) { return '<span class="k2-pill k2-' + st[1] + '">' + st[0] + '</span>'; }

  function render() {
    var box = document.getElementById('kpiV2Inner'); if (!box) return;
    var v = document.getElementById('kpiV2View'); if (!v || v.style.display === 'none') return;
    if (!S.month) S.month = curMonth();
    var info = mInfo(S.month), h = '';
    var monthData = DATA && DATA.months[S.month];
    var list = S.editing ? S.draft : (monthData && monthData.items) || null;
    var lastH = DATA && DATA._history.length ? DATA._history[DATA._history.length - 1] : null;

    h += '<div class="k2-head"><div><h1>เป้าประจำเดือน</h1><div class="k2-sub">' +
      (DATA ? 'เก็บบนเซิร์ฟเวอร์ · แก้จากเครื่องไหน ทุกเครื่องเห็นเหมือนกัน' + (lastH ? ' · แก้ล่าสุด ' + esc(fmtT(lastH.t)) + ' โดย ' + esc(lastH.by) : '') : (ERR ? '<span class="k2-bad">' + esc(ERR) + '</span> <button class="k2-link" onclick="kpiV2.reload()">ลองใหม่</button>' : 'กำลังโหลดเป้า…')) +
      '</div></div><div class="k2-tools">' +
      '<div class="k2-month"><button aria-label="เดือนก่อน" onclick="kpiV2.month(-1)">‹</button><span>' + info.label + '</span><button aria-label="เดือนถัดไป" onclick="kpiV2.month(1)">›</button></div>';
    if (S.editing) h += '<button class="k2-btn" onclick="kpiV2.cancel()">ยกเลิก</button><button class="k2-btn k2-ok" ' + (S.saving ? 'disabled' : '') + ' onclick="kpiV2.save()">' + (S.saving ? 'กำลังบันทึก…' : 'บันทึกเป้า') + '</button>';
    else if (list) h += '<button class="k2-btn k2-pri" onclick="kpiV2.edit()">แก้ไขเป้า</button>';
    h += '</div></div>';

    if (!DATA) { box.innerHTML = h + '<div class="k2-card k2-empty">กำลังโหลด…</div>'; return; }
    if (!list) {
      var prev = DATA.months[shiftMonth(S.month, -1)];
      h += '<div class="k2-card k2-empty"><h2>ยังไม่ได้ตั้งเป้า ' + info.label + '</h2>' +
        (prev ? '<p>เริ่มจากเป้าเดือนก่อน แล้วแก้เฉพาะตัวที่เปลี่ยน</p><button class="k2-btn k2-pri" onclick="kpiV2.copyPrev()">คัดลอกเป้าจากเดือนก่อน</button>'
          : '<p>เริ่มตั้งเป้าใหม่ทั้งหมด</p><button class="k2-btn k2-pri" onclick="kpiV2.startBlank()">ตั้งเป้าเดือนนี้</button>') + '</div>';
      box.innerHTML = h + toastEl(); return;
    }

    var allP = people(list), rows = compute(list, info, S.month), pace = info.days ? info.done / info.days : 0;
    if (S.sel !== 'all' && allP.indexOf(S.sel) < 0) S.sel = 'all';
    var shown = S.sel === 'all' ? rows : rows.filter(function (x) { return x.r.who === S.sel; });
    var k = agg(shown), T = agg(rows);
    var remainDays = Math.max(info.days - Math.ceil(info.done), 0);

    h += '<div class="k2-tabs"><button class="' + (S.sel === 'all' ? 'on' : '') + '" onclick="kpiV2.sel(\'all\')"><i style="background:' + (S.sel === 'all' ? '#fff' : '#0F172A') + '"></i>ภาพรวมทุกคน</button>' +
      allP.map(function (p) { var on = S.sel === p; return '<button class="' + (on ? 'on' : '') + '" onclick="kpiV2.sel(' + esc(JSON.stringify(p)) + ')"><i style="background:' + (on ? '#fff' : colorOf(p, allP)) + '"></i>' + esc(p) + '</button>'; }).join('') + '</div>';

    var casperThrough = '';
    shown.forEach(function (x) { if (x.c && x.c.through && x.c.through > casperThrough) casperThrough = x.c.through; });
    h += '<div class="k2-kpis">' +
      kcard('ยิงแล้ว / เป้า', M(k.spend), 'เป้า ' + M(k.target) + ' · ' + P(k.target ? k.spend / k.target : 0) + ' (ควรถึง ' + P(pace) + ')', bar(k.target ? k.spend / k.target : 0, pace, '#2563EB')) +
      kcard('%ADS ทำได้', k.adsA == null ? '–' : '<span class="' + (k.adsA > k.adsT ? 'k2-bad' : 'k2-good') + '">' + k.adsA.toFixed(1) + '%</span>', 'เป้า ' + k.adsT.toFixed(1) + '% · CasperCall' + (casperThrough ? ' ถึง ' + dshort(casperThrough) : '')) +
      kcard('ยอดขายจริง', k.nC ? M(k.cSales) : '–', 'ต้องได้ทั้งเดือน ' + M(k.needSales) + (k.nC < k.n ? ' · มียอด ' + k.nC + '/' + k.n + ' สินค้า' : '')) +
      kcard('คาดการณ์ค่าแอดสิ้นเดือน', info.done >= 1 ? M(k.fc) : '–', info.done >= 1 ? P(k.target ? k.fc / k.target : 0) + ' ของเป้า ถ้ายิงเท่าตอนนี้' : 'ยังไม่เริ่มเดือน') +
      kcard('ต้องยิงต่อวันที่เหลือ', remainDays ? M(Math.max(k.target - k.spend, 0) / remainDays) : '–', remainDays ? 'เหลือ ' + remainDays + ' วัน · ตอนนี้เฉลี่ย ' + M(info.done >= 1 ? k.spend / info.done : 0) + '/วัน' : 'จบเดือนแล้ว') +
      '</div>';

    // แถบรายคน
    var groups = allP.map(function (p) { return { name: p, a: agg(rows.filter(function (x) { return x.r.who === p; })) }; });
    var maxT = Math.max.apply(null, groups.map(function (g) { return Math.max(g.a.target, g.a.spend); }).concat([1]));
    h += '<div class="k2-card k2-pad"><h2>ยอดยิงแยกตามคนวิเคราะห์</h2><div class="k2-note">แถบเทา = เป้าของแต่ละคน · แถบสี = ยิงแล้ว · ขีดดำ = ควรยิงถึงตรงนี้วันนี้</div><div class="k2-blist">' +
      groups.map(function (g) {
        var col = colorOf(g.name, allP), dim = S.sel !== 'all' && S.sel !== g.name;
        var tw = g.a.target / maxT * 100, sw = Math.min(g.a.spend / maxT * 100, 100);
        return '<div class="k2-brow' + (dim ? ' dim' : '') + '"><div class="k2-bname"><i style="background:' + col + '"></i>' + esc(g.name) + '</div>' +
          '<div class="k2-btrack"><div class="k2-btarget" style="width:' + tw.toFixed(1) + '%">' + (pace > 0 && pace < 1 ? '<b style="left:' + (pace * 100).toFixed(1) + '%"></b>' : '') + '</div>' +
          '<div class="k2-bfill" style="width:' + sw.toFixed(1) + '%;background:' + col + '"><span>' + M(g.a.spend) + '</span></div></div>' +
          '<div class="k2-bmeta">' + P(g.a.target ? g.a.spend / g.a.target : 0) + ' ของ ' + M(g.a.target) + ' · %ADS ' + (g.a.adsA == null ? '–' : '<b class="' + (g.a.adsA > g.a.adsT ? 'k2-bad' : 'k2-good') + '">' + g.a.adsA.toFixed(1) + '%</b>') + ' / ' + g.a.adsT.toFixed(0) + '%</div></div>';
      }).join('') + '</div></div>';

    // สรุปรายคน
    h += '<div class="k2-card k2-pad"><h2>สรุปรายคน</h2><div class="k2-scroll"><table class="k2-t"><thead><tr><th>คนวิเคราะห์</th><th class="r">สินค้า</th><th class="r">เป้ายอดยิง</th><th class="r">ยิงแล้ว</th><th style="width:150px">ความคืบหน้า</th><th class="r">%ADS เป้า</th><th class="r">%ADS ทำได้</th><th class="r">ยอดขายจริง</th><th class="r">ยอดขายที่ต้องได้</th><th class="r">ถึงเป้า %ADS</th></tr></thead><tbody>' +
      groups.map(function (g) {
        var col = colorOf(g.name, allP), dim = S.sel !== 'all' && S.sel !== g.name;
        return '<tr class="' + (dim ? 'dim' : '') + '"><td><b><i class="k2-dot" style="background:' + col + '"></i>' + esc(g.name) + '</b></td><td class="r">' + g.a.n + '</td><td class="r">' + B(g.a.target) + '</td><td class="r">' + B(g.a.spend) + '</td><td>' + bar(g.a.target ? g.a.spend / g.a.target : 0, pace, col) + '</td>' +
          '<td class="r">' + g.a.adsT.toFixed(0) + '%</td><td class="r"><b>' + adsCell(g.a.adsA, g.a.adsT) + '</b></td><td class="r">' + (g.a.nC ? B(g.a.cSales) : '–') + '</td><td class="r">' + B(g.a.needSales) + '</td><td class="r">' + g.a.okAds + '/' + g.a.n + '</td></tr>';
      }).join('') +
      '<tr class="k2-total"><td>รวมทั้งทีม</td><td class="r">' + T.n + '</td><td class="r">' + B(T.target) + '</td><td class="r">' + B(T.spend) + '</td><td>' + bar(T.target ? T.spend / T.target : 0, pace, '#2563EB') + '</td><td class="r">' + T.adsT.toFixed(1) + '%</td><td class="r">' + adsCell(T.adsA, T.adsT) + '</td><td class="r">' + (T.nC ? B(T.cSales) : '–') + '</td><td class="r">' + B(T.needSales) + '</td><td class="r">' + T.okAds + '/' + T.n + '</td></tr>' +
      '</tbody></table></div><div class="k2-note">%ADS = ค่าแอด ÷ ยอดขาย (ยิ่งต่ำยิ่งดี) · ยอดขายที่ต้องได้ = เป้ายอดยิง ÷ เป้า %ADS</div></div>';

    // รายสินค้า
    var ord = shown.slice().sort(function (a, b) { return (b.r.target || 0) - (a.r.target || 0); });
    var E = S.editing;
    var prodOpts = (window.FB_HIERARCHY || []).map(function (p) { return p.product; });
    h += '<div class="k2-card k2-pad"><div class="k2-h2row"><h2>ทุกสินค้า (เรียงตามเป้ายอดยิง มาก→น้อย)</h2><span class="k2-note">' + (E ? 'แก้ในช่องสีฟ้า แล้วกด บันทึกเป้า ด้านบน' : 'ค่าแอดจาก Facebook อัปเดตตามข้อมูลล่าสุดที่แดชบอร์ดดึง · %ADS จาก CasperCall') + '</span></div>' +
      '<div class="k2-scroll"><table class="k2-t"><thead><tr><th>สินค้า</th><th>คนวิเคราะห์</th><th class="r">เป้ายอดยิง</th><th class="r">ยิงแล้ว</th><th style="width:150px">ความคืบหน้า</th><th class="r">คาดการณ์สิ้นเดือน</th><th class="r">%ADS เป้า</th><th class="r">%ADS ทำได้</th><th class="r">CAC เป้า</th><th class="r">CAC ทำได้</th><th>สถานะ</th>' + (E ? '<th></th>' : '') + '</tr></thead><tbody>' +
      ord.map(function (x) {
        var r = x.r, col = colorOf(r.who, allP), i = x.i;
        var who = E ? '<input class="k2-in" list="k2People" value="' + esc(r.who) + '" onchange="kpiV2.set(' + i + ',\'who\',this.value)" aria-label="คนวิเคราะห์ ' + esc(r.product) + '" style="width:96px">' : '<b><i class="k2-dot" style="background:' + col + '"></i>' + esc(r.who) + '</b>';
        var tgt = E ? '<input class="k2-in" inputmode="numeric" value="' + (r.target || '') + '" onchange="kpiV2.set(' + i + ',\'target\',this.value)" aria-label="เป้ายอดยิง ' + esc(r.product) + '" style="width:118px">' : B(r.target);
        var ads = E ? '<input class="k2-in" inputmode="decimal" value="' + (r.ads || '') + '" onchange="kpiV2.set(' + i + ',\'ads\',this.value)" aria-label="เป้า %ADS ' + esc(r.product) + '" style="width:58px">' : (r.ads ? r.ads + '%' : '–');
        var cac = E ? '<input class="k2-in" inputmode="numeric" value="' + (r.cac || '') + '" placeholder="–" onchange="kpiV2.set(' + i + ',\'cac\',this.value)" aria-label="เป้า CAC ' + esc(r.product) + '" style="width:70px">' : (r.cac ? B(r.cac) : '–');
        var nm = esc(r.product) + (prodByName(r.product) ? '' : ' <span class="k2-pill k2-warn" title="ไม่พบสินค้านี้ในแดชบอร์ด">ไม่พบ</span>');
        return '<tr><td><b>' + nm + '</b></td><td>' + who + '</td><td class="r">' + tgt + '</td><td class="r">' + B(x.spend) + '</td><td>' + bar(x.prog, pace, x.st[1] === 'bad' ? '#EF4444' : col) + '<div class="k2-mini">' + P(x.prog) + '</div></td>' +
          '<td class="r">' + (info.done >= 1 ? M(x.fc) : '–') + '</td><td class="r">' + ads + '</td><td class="r"><b>' + adsCell(x.adsA, r.ads) + '</b></td><td class="r">' + cac + '</td><td class="r">' + (x.cacA == null ? '<span class="k2-dim">–</span>' : '<span class="' + (r.cac && x.cacA > r.cac ? 'k2-bad' : '') + '">' + B(x.cacA) + '</span>') + '</td>' +
          '<td>' + pill(x.st) + '</td>' + (E ? '<td><button class="k2-x" aria-label="ลบ ' + esc(r.product) + '" onclick="kpiV2.del(' + i + ')">×</button></td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>' +
      (E ? '<div class="k2-add"><select id="k2AddSel" aria-label="เลือกสินค้าที่จะเพิ่ม"><option value="">+ เพิ่มสินค้า…</option>' + prodOpts.filter(function (p) { return !list.some(function (r) { return r.product === p; }); }).map(function (p) { return '<option>' + esc(p) + '</option>'; }).join('') + '</select><button class="k2-btn" onclick="kpiV2.add()">เพิ่ม</button></div>' +
        '<datalist id="k2People">' + allP.map(function (p) { return '<option value="' + esc(p) + '">'; }).join('') + '</datalist>' : '') +
      '<div class="k2-note">สถานะ: <b class="k2-bad">%ADS เกินเป้า</b> ดูก่อนเรื่องอื่น · <b class="k2-warnt">ยิงช้ากว่าแผน</b> ยิงไม่ถึง 85% ของที่ควรถึงวันนี้ · <b class="k2-info">ยิงเร็วกว่าแผน</b> คาดการณ์เกินเป้า 15% · CAC = ค่าแอด ÷ ออเดอร์</div></div>';

    // ประวัติ
    var hist = DATA._history.filter(function (x) { return x.month === S.month; }).slice(-8).reverse();
    h += '<div class="k2-card k2-pad"><h2>ประวัติการแก้เป้า</h2>' + (hist.length ? hist.map(function (x) { return '<div class="k2-hist"><span>' + esc(fmtT(x.t)) + '</span><span>' + esc(x.by) + ' — ' + esc(x.txt) + '</span></div>'; }).join('') : '<div class="k2-note">ยังไม่มี</div>') + '</div>';

    box.innerHTML = h + toastEl();
  }
  function kcard(l, v, sub, extra) { return '<div class="k2-card k2-kpi"><div class="k2-lbl">' + l + '</div><div class="k2-val">' + v + '</div>' + (extra || '') + '<div class="k2-ksub">' + sub + '</div></div>'; }
  function toastEl() { return '<div id="k2Toast" class="k2-toast" role="status" aria-live="polite"></div>'; }
  function fmtT(t) { var d = new Date(t); if (isNaN(d)) return t; return d.getDate() + ' ' + THM[d.getMonth()] + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dshort(s) { var p = s.split('-'); return +p[2] + ' ' + THM[+p[1] - 1]; }

  /* ---------- การกระทำ ---------- */
  function cloneItems(a) { return (a || []).map(function (r) { return { product: r.product, who: r.who, target: r.target, ads: r.ads, cac: r.cac }; }); }
  function diffNote(oldL, newL, label) {
    var out = [], om = {}; (oldL || []).forEach(function (r) { om[r.product] = r; });
    newL.forEach(function (r) {
      var o = om[r.product];
      if (!o) { out.push('เพิ่ม ' + r.product); return; }
      if (+o.target !== +r.target) out.push(r.product + ' เป้ายอดยิง ' + N(o.target) + ' → ' + N(r.target));
      if (+o.ads !== +r.ads) out.push(r.product + ' %ADS ' + o.ads + '% → ' + r.ads + '%');
      if ((+o.cac || 0) !== (+r.cac || 0)) out.push(r.product + ' CAC ' + (o.cac || '–') + ' → ' + (r.cac || '–'));
      if (o.who !== r.who) out.push(r.product + ' ย้ายจาก ' + o.who + ' ไป ' + r.who);
      delete om[r.product];
    });
    Object.keys(om).forEach(function (p) { out.push('ลบ ' + p); });
    return label + ': ' + (out.length ? out.join(' · ') : 'บันทึก (ไม่มีการเปลี่ยน)');
  }
  function num(v) { var n = parseFloat(String(v).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; }

  window.kpiV2 = {
    open: open, render: render, reload: function () { load(); },
    month: function (n) { if (S.editing && !confirm('ยังไม่ได้บันทึกเป้า จะออกจากโหมดแก้ไขไหม?')) return; S.editing = false; S.draft = null; S.month = shiftMonth(S.month || curMonth(), n); render(); },
    sel: function (p) { S.sel = p; render(); },
    edit: function () { S.editing = true; S.draft = cloneItems(DATA.months[S.month].items); render(); },
    cancel: function () { S.editing = false; S.draft = null; render(); },
    set: function (i, f, v) { if (!S.draft || !S.draft[i]) return; S.draft[i][f] = f === 'who' ? String(v).trim() : num(v); render(); },
    del: function (i) { if (!S.draft) return; if (!confirm('ลบ ' + S.draft[i].product + ' ออกจากเป้าเดือนนี้?')) return; S.draft.splice(i, 1); render(); },
    add: function () { var s = document.getElementById('k2AddSel'); if (!s || !s.value || !S.draft) return; S.draft.push({ product: s.value, who: S.sel !== 'all' ? S.sel : '', target: 0, ads: 0, cac: 0 }); render(); },
    copyPrev: function () { var p = DATA.months[shiftMonth(S.month, -1)]; S.editing = true; S.draft = cloneItems(p && p.items); render(); },
    startBlank: function () { S.editing = true; S.draft = []; render(); },
    save: function () {
      if (!S.draft) return;
      var bad = S.draft.filter(function (r) { return !r.who || !r.target; });
      if (bad.length) { toast('ใส่คนวิเคราะห์และเป้ายอดยิงให้ครบก่อน: ' + bad.map(function (r) { return r.product; }).join(', '), true); return; }
      var m = S.month, items = cloneItems(S.draft), info = mInfo(m);
      var note = diffNote(DATA.months[m] && DATA.months[m].items, items, 'เป้า' + info.short + ' ' + (info.y + 543));
      save(function (remote) { remote.months[m] = { items: items, updatedAt: new Date().toISOString(), updatedBy: user() }; }, note, m);
    }
  };

  function open(el) {
    document.querySelectorAll('[id$="View"]').forEach(function (v) { v.style.display = 'none'; });
    document.querySelectorAll('.sb-item').forEach(function (i) { i.classList.remove('active'); });
    var v = document.getElementById('kpiV2View'); if (v) v.style.display = '';
    if (el) el.classList.add('active');
    render(); load(); window.scrollTo(0, 0);
  }

  function install() {
    if (document.getElementById('sb-kpiv2')) return;
    var old = Array.prototype.filter.call(document.querySelectorAll('.sb-item'), function (i) { return /KPI Overview/.test(i.textContent); })[0];
    var wrap = document.querySelector('.content-wrap');
    if (!old || !wrap) return setTimeout(install, 500);
    var item = document.createElement('div');
    item.className = 'sb-item'; item.id = 'sb-kpiv2';
    item.innerHTML = '<span class="sb-icon">🎯</span><span>เป้าประจำเดือน</span>';
    item.onclick = function () { open(item); };
    old.parentNode.insertBefore(item, old);
    var view = document.createElement('div');
    view.id = 'kpiV2View'; view.style.display = 'none';
    view.innerHTML = '<div class="k2-wrap" id="kpiV2Inner"></div>';
    wrap.appendChild(view);
    var css = document.createElement('style');
    css.textContent = [
      '.k2-wrap{--ink:#0F172A;--mute:#475569;--line:#E5E7EB;--blue:#2563EB;font-family:"IBM Plex Sans Thai","Sarabun",system-ui,sans-serif;color:var(--ink);background:#F5F6FA;padding:24px 28px 64px;font-variant-numeric:tabular-nums;min-height:100vh;box-sizing:border-box;display:flex;flex-direction:column;gap:16px}',
      '.k2-wrap *{box-sizing:border-box}.k2-wrap h1{margin:0;font-size:26px;font-weight:700;color:var(--ink)}.k2-wrap h2{margin:0;font-size:16px;font-weight:700;color:var(--ink)}',
      '.k2-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:14px}.k2-sub{font-size:13px;color:var(--mute);margin-top:4px}',
      '.k2-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.k2-month{display:flex;align-items:center;background:#fff;border:1px solid var(--line);border-radius:10px}.k2-month button{border:0;background:none;width:40px;height:40px;font-size:18px;color:var(--mute);cursor:pointer}.k2-month span{min-width:130px;text-align:center;font-weight:600}',
      '.k2-btn{height:40px;padding:0 16px;border-radius:10px;border:1px solid var(--line);background:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer;color:var(--ink)}.k2-pri{background:var(--blue);border-color:var(--blue);color:#fff}.k2-ok{background:#16A34A;border-color:#16A34A;color:#fff}.k2-btn[disabled]{opacity:.6;cursor:wait}',
      '.k2-link{border:0;background:none;padding:0;font:inherit;color:#1D4ED8;font-weight:600;cursor:pointer}',
      '.k2-tabs{display:flex;flex-wrap:wrap;gap:8px;padding-bottom:14px;border-bottom:1px solid var(--line)}.k2-tabs button{height:38px;padding:0 16px;border-radius:99px;border:1px solid var(--line);background:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer;color:var(--ink);display:flex;align-items:center;gap:8px}.k2-tabs button.on{background:var(--blue);border-color:var(--blue);color:#fff}.k2-tabs i{width:9px;height:9px;border-radius:99px;display:inline-block}',
      '.k2-card{background:#fff;border:1px solid var(--line);border-radius:12px}.k2-pad{padding:18px 20px;display:flex;flex-direction:column;gap:12px}.k2-empty{padding:40px;text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center}.k2-empty p{margin:0;color:var(--mute)}',
      '.k2-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.k2-kpi{padding:16px 18px;display:flex;flex-direction:column;gap:6px}.k2-lbl{font-size:13px;color:var(--mute)}.k2-val{font-size:26px;font-weight:700;line-height:1.2}.k2-ksub{font-size:12px;color:var(--mute)}',
      '.k2-bar{position:relative;height:8px;border-radius:99px;background:#EEF1F6}.k2-bar i{display:block;height:100%;border-radius:99px}.k2-bar b{position:absolute;top:-3px;width:2px;height:14px;background:var(--ink);border-radius:1px}.k2-mini{font-size:11px;color:var(--mute);margin-top:2px}',
      '.k2-note{font-size:12px;color:var(--mute)}.k2-h2row{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px}',
      '.k2-blist{display:flex;flex-direction:column;gap:12px}.k2-brow{display:flex;flex-wrap:wrap;align-items:center;gap:12px}.k2-brow.dim,.k2-t tr.dim{opacity:.4}.k2-bname{width:110px;font-weight:600;display:flex;align-items:center;gap:8px}.k2-bname i,.k2-dot{width:9px;height:9px;border-radius:99px;display:inline-block}.k2-dot{margin-right:8px}',
      '.k2-btrack{flex:1 1 320px;position:relative;height:28px}.k2-btarget{position:absolute;inset:0 auto 0 0;background:#EEF1F6;border:1px solid var(--line);border-radius:8px}.k2-btarget b{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--ink)}.k2-bfill{position:absolute;inset:0 auto 0 0;border-radius:8px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;min-width:62px}.k2-bfill span{color:#fff;font-size:12px;font-weight:700}',
      '.k2-bmeta{min-width:260px;text-align:right;font-size:13px;color:#334155}',
      '.k2-scroll{overflow-x:auto}.k2-t{width:100%;border-collapse:collapse;font-size:13px;min-width:980px}.k2-t th{padding:10px 12px;font-size:12px;font-weight:600;color:var(--mute);text-align:left;background:#F8FAFC;border-bottom:1px solid var(--line);white-space:nowrap}.k2-t td{padding:10px 12px;border-bottom:1px solid #EEF1F6;vertical-align:middle}.k2-t .r{text-align:right}',
      '.k2-total td{background:#EFF6FF;border-top:2px solid var(--blue);font-weight:700}',
      '.k2-good{color:#15803D}.k2-bad{color:#B91C1C}.k2-warnt{color:#B45309}.k2-info{color:#1D4ED8}.k2-dim{color:#94A3B8;font-weight:400}',
      '.k2-pill{display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;white-space:nowrap}.k2-pill.k2-good{background:#DCFCE7}.k2-pill.k2-bad{background:#FEE2E2}.k2-pill.k2-warn{background:#FEF3C7;color:#B45309}.k2-pill.k2-info{background:#DBEAFE}.k2-pill.k2-mute{background:#F1F5F9;color:var(--mute)}',
      '.k2-in{height:34px;padding:0 8px;border:1px solid #93C5FD;border-radius:8px;background:#EFF6FF;font:inherit;font-size:13px;text-align:right}.k2-in[list]{text-align:left}',
      '.k2-x{width:30px;height:30px;border-radius:8px;border:1px solid #FECACA;background:#fff;color:#B91C1C;cursor:pointer;font-size:16px}',
      '.k2-add{display:flex;gap:8px;align-items:center}.k2-add select{height:40px;border:1px solid var(--line);border-radius:10px;padding:0 10px;font:inherit;font-size:14px;background:#fff}',
      '.k2-hist{display:flex;gap:12px;font-size:13px}.k2-hist span:first-child{color:var(--mute);width:110px;flex:none}',
      '.k2-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);opacity:0;pointer-events:none;background:#0F172A;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;transition:.2s;z-index:3000}.k2-toast.on{opacity:1;transform:translateX(-50%)}.k2-toast.bad{background:#B91C1C}',
      '@media (max-width:640px){.k2-wrap{padding:16px}.k2-bmeta{min-width:0;text-align:left}}'
    ].join('\n');
    document.head.appendChild(css);
    document.addEventListener('click', function (e) { var it = e.target.closest && e.target.closest('.sb-item'); if (it && it.id !== 'sb-kpiv2') { var v = document.getElementById('kpiV2View'); if (v) v.style.display = 'none'; } }, true);
    // สิทธิ์: เห็นเมนูนี้เมื่อเห็นเมนู KPI Overview เดิม · รีเฟรชข้อมูลเป็นระยะ
    setInterval(function () {
      item.style.display = old.style.display === 'none' ? 'none' : '';
      var v = document.getElementById('kpiV2View'); if (!v || v.style.display === 'none' || S.editing) return;
      if (document.activeElement && document.activeElement.closest && document.activeElement.closest('#kpiV2View input,#kpiV2View select')) return;
      render();
    }, 20000);
    setInterval(function () { var v = document.getElementById('kpiV2View'); if (v && v.style.display !== 'none' && !S.editing) load(true); }, 60000);
    load(true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
