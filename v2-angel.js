/* v2-angel.js — หน้า "คัดนางฟ้า": คัดคอนเทนต์ประจำเดือน 2 เกณฑ์ (แยกกัน)
   1) ทักถูก: วันที่ 1–5 ของแคมเปญ · ต้นทุน/ทัก ≤ เกณฑ์ของกลุ่มสินค้า · คนทักรวม 5 วัน ≥ ขั้นต่ำ → ค่าคอมทีมกราฟิก
   2) เกรด ROAS: 3 วันติดกันในเดือน · งบทุกวัน ≥ เกณฑ์ · ROAS 3 วัน ≥ เกณฑ์ → ค่าคอมต่อชิ้น */
(function () {
  'use strict';
  var PAL = ['#2563EB', '#0EA5E9', '#6366F1', '#14B8A6', '#8B5CF6', '#0891B2', '#F59E0B', '#EC4899', '#10B981', '#64748B', '#EF4444', '#84CC16', '#A855F7', '#06B6D4'];
  // เกณฑ์ทักถูก (ต้นทุน/ทัก ≤ , คนทักรวม 5 วัน ≥ , ค่าคอม)
  var CHAT_RULES = {
    g199: { name: 'กลุ่ม 199', prods: ['ขุนแผน', 'THE LORD', 'Olymplus', 'Wolf', 'Sopink'], g: [['A+', 30, 30, 100], ['A', 40, 20, 70], ['B', 50, 15, 50]] },
    g249: { name: 'กลุ่ม 249', prods: ['OlymplusMax', 'เจ้าขุน', 'BLING&SYN', 'Dragon Blood'], g: [['A+', 50, 20, 100], ['A', 60, 15, 70], ['B', 70, 10, 50]] },
    g538: { name: 'กลุ่ม 538', prods: ['Heavenplus+', 'JUDO', 'LIV CARE'], g: [['A+', 50, 20, 100], ['A', 60, 15, 70], ['B', 70, 10, 50]] }
  };
  // เกรดคอนเทนต์ (งบทุกวัน ≥ , ROAS 3 วัน ≥ , ค่าคอมต่อชิ้น)
  var ROAS_RULES = [['A+', 5000, 3, 500], ['A', 3000, 2.5, 300], ['B', 1000, 2, 200]];
  var S = { m: '', p: -1, tab: 'chat', q: '', mg: '' }, CACHE = {}, LOADING = {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addD(s, n) { var d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
  function B(n) { return '฿' + Math.round(n || 0).toLocaleString('en-US'); }
  function I(n) { return Math.round(n || 0).toLocaleString('en-US'); }
  var THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  function dl(s) { var p = s.split('-'); return +p[2] + ' ' + THM[+p[1] - 1]; }
  function mLabel(m) { var r = mRange(m), a = r[0].split('-'), b = r[1].split('-'); return (+a[2]) + ' ' + THM[+a[1] - 1] + ' – ' + (+b[2]) + ' ' + THM[+b[1] - 1] + ' ' + String(+b[0] + 543).slice(2); }
  function prods() { return window.FB_HIERARCHY || []; }
  var MG_ORDER = ['MOS', 'DOM', 'NUNE', 'JAM', 'BALL', 'TER', 'LINK'];
  function mgrOf(v) { v = String(v == null ? '' : v).trim(); return !v || v === '-' ? 'ไม่ระบุ' : v.toUpperCase(); }
  function mgOrd(a) { var i = MG_ORDER.indexOf(a); return a === 'ไม่ระบุ' ? 999 : i < 0 ? 500 : i; }
  function accInfo() {
    var m = {};
    prods().forEach(function (p, pi) { (p.pages || []).forEach(function (pg) { (pg.accounts || []).forEach(function (h) { (h.adAccounts || []).forEach(function (a) { if (!m[a]) m[a] = { pi: pi, prod: p.product, page: pg.name, disp: h.displayName || a, mgr: mgrOf(pg.manager) }; }); }); }); });
    return m;
  }
  function ruleOf(prod) { for (var k in CHAT_RULES) if (CHAT_RULES[k].prods.indexOf(prod) >= 0) return CHAT_RULES[k]; return null; }
  function today() { return ymd(new Date()); }
  function monthsBack(n) { var out = [], d = new Date(); if (d.getDate() > 25) { d.setDate(28); d.setMonth(d.getMonth() + 1); } d.setDate(1); for (var i = 0; i < n; i++) { out.push(d.getFullYear() + '-' + pad(d.getMonth() + 1)); d.setMonth(d.getMonth() - 1); } return out; }
  // รอบค่าคอม: 26 ของเดือนก่อน – 25 ของเดือน (คีย์ = เดือนที่จบรอบ)
  function mRange(m) { var p = m.split('-'); return [ymd(new Date(+p[0], +p[1] - 2, 26)), ymd(new Date(+p[0], +p[1] - 1, 25))]; }

  /* ---------- ข้อมูล: เดือนปัจจุบันใช้ fbDataMap (30 วัน) · เดือนก่อนดึงจาก Facebook ---------- */
  function fromMap(from) {
    var rows = [], info = accInfo();
    Object.keys(info).forEach(function (acc) { ((window.fbDataMap || {})[acc] || []).forEach(function (r) { if (r.date && r.date >= from) rows.push({ acc: acc, c: r.campaign || '(ไม่มีชื่อ)', d: r.date, s: num(r.spend), v: num(r.revenue), ch: num(r.conversations), b: num(r.purchases) }); }); });
    return rows;
  }
  function act(arr, types) { for (var i = 0; i < types.length; i++) { var x = (arr || []).filter(function (y) { return y.action_type === types[i]; })[0]; if (x) return num(x.value); } return 0; }
  function fetchMonth(m) {
    if (LOADING[m]) return; LOADING[m] = { done: 0, total: 0, rows: [] };
    var L = LOADING[m], r = mRange(m), from = addD(r[0], -14), to = r[1] < today() ? r[1] : today();
    var info = accInfo(), accs = Object.keys(info); L.total = accs.length;
    var meta = window.FB_ACCOUNTS_META || [];
    var q = accs.slice();
    function one() {
      var acc = q.shift(); if (!acc) return Promise.resolve();
      var mm = meta.filter(function (x) { return x.name === acc || x.configKey === 'FB_GID_' + acc; })[0];
      var tok = (window.FB_TOKENS || {})[acc] || window.FB_TOKEN;
      if (!mm || !mm.id) { L.done++; return one(); }
      var url = window.FB_API + mm.id + '/insights?level=campaign&time_increment=1&limit=500&fields=campaign_name,spend,actions,action_values&time_range=' + encodeURIComponent(JSON.stringify({ since: from, until: to })) + '&access_token=' + tok;
      function page(u) {
        return fetch(u).then(function (x) { return x.json(); }).then(function (j) {
          (j.data || []).forEach(function (x) { L.rows.push({ acc: acc, c: x.campaign_name || '(ไม่มีชื่อ)', d: x.date_start, s: num(x.spend), v: act(x.action_values, ['purchase', 'onsite_conversion.purchase', 'offsite_conversion.fb_pixel_purchase']), ch: act(x.actions, ['onsite_conversion.messaging_conversation_started_7d']), b: act(x.actions, ['purchase', 'onsite_conversion.purchase', 'offsite_conversion.fb_pixel_purchase']) }); });
          if (j.paging && j.paging.next) return page(j.paging.next);
        });
      }
      return page(url).catch(function () {}).then(function () { L.done++; if (L.done % 10 === 0) render(); return one(); });
    }
    Promise.all([one(), one(), one(), one(), one(), one()]).then(function () { CACHE[m] = L.rows; delete LOADING[m]; render(); });
  }
  function rowsFor(m) {
    var r = mRange(m), from = addD(r[0], -14);
    var minMap = ''; for (var k in (window.fbDataMap || {})) ((window.fbDataMap[k]) || []).forEach(function (x) { if (x.date && (!minMap || x.date < minMap)) minMap = x.date; });
    if (minMap && minMap <= from) return fromMap(from);
    if (CACHE[m]) return CACHE[m];
    fetchMonth(m); return null;
  }

  /* ---------- คำนวณ ---------- */
  // วันที่แรกในชื่อแคมเปญ (d/m/yy พ.ศ.) → YYYY-MM-DD · ไม่มี = ''
  function nameDate(s) {
    var re = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g, x;
    while ((x = re.exec(String(s || '')))) {
      var d = +x[1], mo = +x[2], y = +x[3];
      if (y < 100) y += 2500; if (y > 2400) y -= 543;
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 2020 && y <= 2035) return y + '-' + pad(mo) + '-' + pad(d);
    }
    return '';
  }
  // นับเฉพาะคอนเทนต์ที่วันที่แรกในชื่อ ≥ วันที่ 25 ของเดือนก่อน (เช่น พ.ย. → 25/10)
  function cutOf(m) { var p = m.split('-'), d = new Date(+p[0], +p[1] - 2, 25); return ymd(d); }
  // คีย์คอนเทนต์: ตัดส่วนหน้า "--" และเลขลำดับหน้าชื่อ แล้วเอาข้อความถึงวันที่แรก + เลข ver (วันรุมยิงไม่นับ) · ver ต่างกัน = คนละชิ้น
  function contentKey(c) {
    var s = String(c.name || '').replace(/^.*--\s*/, '').replace(/^[\s*().\[\]#_\-0-9]+/, '').replace(/\s+/g, ' ').trim().toLowerCase();
    var v = s.match(/\bver\.?\s*(\d+)/), d = s.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
    // ชื่อคอนเทนต์ = ข้อความก่อนวันที่แรก (ไม่มีวันที่ = ก่อน ver) · ตัด noedit / ช่องว่าง + วันที่แรก + ver → เช่น "ผู้เชี่ยวชาญยัยไหม TL อยู่ดีดี" 09/11/69 ver1
    s = (d ? s.slice(0, d.index) : v ? s.slice(0, v.index) : s).replace(/no\s*-?\s*edit(t?ing)?/g, '').replace(/[\s\-_.,:|]+/g, '') + '|' + nameDate(c.name) + '|ver' + (v ? v[1] : '1');
    return c.prod + '|' + s;
  }
  function dedupe(list, rank, ex) {
    var by = {}, out = [];
    list.forEach(function (x) { var k = contentKey(x.c), o = by[k]; if (!o) { by[k] = x; x.dups = []; out.push(x); return; } if (rank(x) < rank(o)) { x.dups = o.dups.concat([o]); o.dups = []; out[out.indexOf(o)] = x; by[k] = x; } else o.dups.push(x); ex.dup++; });
    return out;
  }
  function compute(m) {
    var rows = rowsFor(m); if (!rows) return null;
    var rg = mRange(m), info = accInfo(), T = today(), cm = {};
    rows.forEach(function (r) {
      var k = r.acc + '|' + r.c, c = cm[k] || (cm[k] = { acc: r.acc, name: r.c, days: {}, first: '' });
      var d = c.days[r.d] || (c.days[r.d] = { s: 0, v: 0, ch: 0, b: 0 });
      d.s += r.s; d.v += r.v; d.ch += r.ch; d.b += r.b;
      if (r.s > 0 && (!c.first || r.d < c.first)) c.first = r.d;
    });
    var fetchFrom = addD(rg[0], -14), chat = [], roas = [], cut = cutOf(m), ex = { old: 0, none: 0, dup: 0 };
    function okName(c) { if (c.nd === undefined) c.nd = nameDate(c.name); if (c.nd && c.nd >= cut) return true; if (c.nd) ex.old++; else ex.none++; return false; }
    Object.keys(cm).forEach(function (k) {
      var c = cm[k], ai = info[c.acc] || { pi: -1, prod: '', page: '', disp: c.acc, mgr: 'ไม่ระบุ' };
      c.pi = ai.pi; c.prod = ai.prod; c.page = ai.page; c.disp = ai.disp; c.mgr = ai.mgr;
      // เกณฑ์ 1: ทักถูก (แคมเปญที่เริ่มยิงในเดือนนี้)
      if (c.first && c.first >= rg[0] && c.first <= rg[1] && c.first > fetchFrom) {
        var s = 0, ch = 0, end = addD(c.first, 4), n = 0;
        for (var i = 0; i < 5; i++) { var dd = addD(c.first, i), x = c.days[dd]; if (dd <= T) n++; if (x) { s += x.s; ch += x.ch; } }
        var rule = ruleOf(c.prod), cpc = ch ? s / ch : 0, grade = null;
        if (rule && ch) for (var g = 0; g < rule.g.length; g++) { if (cpc <= rule.g[g][1] && ch >= rule.g[g][2]) { grade = rule.g[g]; break; } }
        var done = end < T;
        if ((grade || (!done && rule && ch && cpc <= rule.g[rule.g.length - 1][1])) && okName(c)) chat.push({ c: c, s: s, ch: ch, cpc: cpc, grade: grade, rule: rule, end: end, done: done, n: Math.min(5, n) });
      }
      // เกณฑ์ 2: เกรด ROAS (3 วันติดกันภายในเดือน)
      var best = null;
      for (var d0 = rg[0]; d0 <= rg[1] && d0 <= T; d0 = addD(d0, 1)) {
        var w = [c.days[d0], c.days[addD(d0, 1)], c.days[addD(d0, 2)]];
        if (addD(d0, 2) > rg[1] || !w[0] || !w[1] || !w[2]) continue;
        var minS = Math.min(w[0].s, w[1].s, w[2].s), ss = w[0].s + w[1].s + w[2].s, vv = w[0].v + w[1].v + w[2].v, ro = ss ? vv / ss : 0;
        for (var q = 0; q < ROAS_RULES.length; q++) {
          var R = ROAS_RULES[q];
          if (minS >= R[1] && ro >= R[2]) { if (!best || q < best.gi || (q === best.gi && ro > best.ro)) best = { gi: q, grade: R, from: d0, ro: ro, s: ss, v: vv, minS: minS, ch: w[0].ch + w[1].ch + w[2].ch }; break; }
        }
      }
      if (best && okName(c)) roas.push({ c: c, b: best });
    });
    // ไม่นับคอนเทนต์ซ้ำ (เลขแคมเปญต่างกันแต่ชื่อเดียวกัน · ver ต่างกันนับแยก) เก็บตัวที่ดีที่สุด
    var GI = { 'A+': 0, A: 1, B: 2 };
    chat = dedupe(chat, function (x) { return (x.grade && x.done ? 0 : 10) + (x.grade ? GI[x.grade[0]] : 3) + (x.cpc || 999) / 10000; }, ex);
    roas = dedupe(roas, function (x) { return x.b.gi - x.b.ro / 1000; }, ex);
    return { chat: chat, roas: roas, cut: cut, ex: ex };
  }

  /* ---------- หน้า ---------- */
  function gtag(g) { return '<span class="ag-g ' + (g === 'A+' ? 'ap' : g === 'A' ? 'a' : 'b') + '">' + g + '</span>'; }
  function render() {
    var box = document.getElementById('angelView'); if (!box || box.style.display === 'none') return;
    if (!window.FB_HIERARCHY || !window.fbDataMap) { box.innerHTML = '<div class="c2-wrap ai2"><div class="c2-card c2-empty">กำลังโหลดข้อมูล…</div></div>'; return; }
    var MS = monthsBack(4); if (!S.m) S.m = MS[0];
    var R = compute(S.m), P = prods(), h = '<div class="c2-wrap ai2 ag">';
    var MR = mRange(S.m), toD = MR[1] < today() ? MR[1] : today();
    h += '<div class="c2-head"><div><h1>คัดนางฟ้า</h1><div class="c2-subhead">คัดคอนเทนต์ประจำเดือนด้วย 2 เกณฑ์ที่แยกกัน · ข้อมูลจาก Facebook</div>' +
      '<div class="ag-range">ช่วงที่คัด: <b>' + dl(MR[0]) + ' ' + (+MR[0].slice(0, 4) + 543) + ' – ' + dl(toD) + ' ' + (+toD.slice(0, 4) + 543) + '</b>' + (toD < MR[1] ? ' <span class="c2-dim">(ถึงวันนี้ · รอบยังไม่จบ)</span>' : '') + ' · ดึงข้อมูลเมื่อ ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + '<div class="ag-cut">นับเฉพาะคอนเทนต์ที่<b>วันที่แรกในชื่อแคมเปญ ตั้งแต่ ' + (function (s) { var p = s.split('-'); return +p[2] + '/' + (+p[1]) + '/' + String(+p[0] + 543).slice(2); })(cutOf(S.m)) + '</b> เป็นต้นไป' + (R && (R.ex.old || R.ex.none) ? ' <span class="c2-dim">· ไม่นับ ' + R.ex.old + ' ชิ้นที่วันที่ในชื่อเก่ากว่า · ' + R.ex.none + ' ชิ้นที่ไม่มีวันที่ในชื่อ</span>' : '') + (R && R.ex.dup ? ' <span class="c2-dim">· รวมคอนเทนต์ซ้ำ ' + R.ex.dup + ' แคมเปญ (นับชิ้นเดียว · เปลี่ยน ver ถึงนับใหม่)</span>' : '') + '</div></div></div>' +
      '<div class="c2-seg" role="group" aria-label="รอบ">' + MS.map(function (m) { return '<button class="' + (S.m === m ? 'on' : '') + '" onclick="angelV2.set(\'m\',\'' + m + '\')">' + mLabel(m) + '</button>'; }).join('') + '</div></div>';
    h += '<div class="c2-tabs"><button class="' + (S.p < 0 ? 'on' : '') + '" onclick="angelV2.set(\'p\',-1)">ทุกสินค้า</button>' + P.map(function (p, i) { var on = S.p === i; return '<button class="' + (on ? 'on' : '') + '" onclick="angelV2.set(\'p\',' + i + ')"><i style="background:' + (on ? '#fff' : PAL[i % PAL.length]) + '"></i>' + esc(p.product) + '</button>'; }).join('') + '</div>';
    if (!R) {
      var L = LOADING[S.m] || { done: 0, total: 0 };
      h += '<div class="c2-card c2-empty">กำลังดึงข้อมูล ' + mLabel(S.m) + ' จาก Facebook… ' + L.done + '/' + (L.total || '?') + ' บัญชี</div></div>'; box.innerHTML = h; return;
    }
    var q = S.q.toLowerCase();
    function keep0(c) { return (S.p < 0 || c.pi === S.p) && (!q || (c.name + ' ' + c.page + ' ' + c.disp + ' ' + c.prod + ' ' + c.mgr).toLowerCase().indexOf(q) >= 0); }
    function keep(c) { return keep0(c) && (!S.mg || c.mgr === S.mg); }
    // ผู้ดูแลเพจ: นับชิ้นที่ผ่าน + ค่าคอม แยกตามคน (ไม่สนตัวกรองผู้ดูแล)
    var MG = {};
    function mgAdd(c, k, com) { var o = MG[c.mgr] || (MG[c.mgr] = { c1: 0, c2: 0, com: 0 }); o[k]++; o.com += com; }
    R.chat.forEach(function (x) { if (keep0(x.c) && x.grade && x.done) mgAdd(x.c, 'c1', x.grade[3]); });
    R.roas.forEach(function (x) { if (keep0(x.c)) mgAdd(x.c, 'c2', x.b.grade[3]); });
    var MGK = Object.keys(MG).sort(function (a, b) { return (mgOrd(a) - mgOrd(b)) || (a < b ? -1 : 1); });
    if (S.mg && !MG[S.mg]) MGK.push(S.mg);
    h += '<div class="ag-mg" role="group" aria-label="ผู้ดูแล"><span class="ag-mgl">ผู้ดูแล</span><button class="' + (!S.mg ? 'on' : '') + '" onclick="angelV2.set(\'mg\',\'\')"><b>ทุกคน</b></button>' + MGK.map(function (k) { var o = MG[k] || { c1: 0, c2: 0, com: 0 }; return '<button class="' + (S.mg === k ? 'on' : '') + '" onclick="angelV2.set(\'mg\',\'' + esc(k) + '\')"><b>' + esc(k) + '</b><span>เกณฑ์ 1 ' + o.c1 + ' · เกณฑ์ 2 ' + o.c2 + '</span><span class="ag-mgc">' + B(o.com) + '</span></button>'; }).join('') + '</div>';
    var chat = R.chat.filter(function (x) { return keep(x.c); }), roas = R.roas.filter(function (x) { return keep(x.c); });
    var cg = { 'A+': 0, A: 0, B: 0 }, ccom = 0, rg = { 'A+': 0, A: 0, B: 0 }, rcom = 0, pend = 0;
    chat.forEach(function (x) { if (x.grade && x.done) { cg[x.grade[0]]++; ccom += x.grade[3]; } else pend++; });
    roas.forEach(function (x) { rg[x.b.grade[0]]++; rcom += x.b.grade[3]; });
    h += '<div class="c2-kpis">' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">เกณฑ์ 1 · ทักถูก (ผ่านแล้ว)</div><div class="c2-val">' + I(cg['A+'] + cg.A + cg.B) + ' <small>ชิ้น</small></div><div class="c2-sub">A+ ' + cg['A+'] + ' · A ' + cg.A + ' · B ' + cg.B + (pend ? ' <span class="c2-dim">· ยังไม่ครบ 5 วัน ' + pend + '</span>' : '') + '</div></div>' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">ค่าคอมทีมกราฟิก (เกณฑ์ 1)</div><div class="c2-val c2-good">' + B(ccom) + '</div><div class="c2-sub c2-dim">นับเฉพาะตัวที่ครบ 5 วันแล้ว</div></div>' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">เกณฑ์ 2 · เกรด ROAS</div><div class="c2-val">' + I(roas.length) + ' <small>ชิ้น</small></div><div class="c2-sub">A+ ' + rg['A+'] + ' · A ' + rg.A + ' · B ' + rg.B + '</div></div>' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">ค่าคอมเกรดคอนเทนต์ (เกณฑ์ 2)</div><div class="c2-val c2-good">' + B(rcom) + '</div><div class="c2-sub c2-dim">นับเกรดสูงสุดที่ทำได้ในเดือน</div></div></div>';
    h += '<div class="ag-switch"><div class="c2-seg">' + [['chat', 'เกณฑ์ 1 · ต้นทุนทักถูก (' + chat.length + ')'], ['roas', 'เกณฑ์ 2 · งบ + ROAS (' + roas.length + ')']].map(function (x) { return '<button class="' + (S.tab === x[0] ? 'on' : '') + '" onclick="angelV2.set(\'tab\',\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<input class="ai2-q" type="search" placeholder="ค้นหาแคมเปญ / เพจ / บัญชี" value="' + esc(S.q) + '" oninput="angelV2.q(this.value)"><button class="ai2-btn" onclick="angelV2.csv()">ดาวน์โหลด CSV</button></div>';
    if (S.tab === 'chat') {
      chat.sort(function (a, b) { var ga = a.grade ? 'A+AB'.indexOf(a.grade[0]) : 9, gb = b.grade ? 'A+AB'.indexOf(b.grade[0]) : 9; return (b.done - a.done) || (ga - gb) || (a.cpc - b.cpc); });
      h += '<div class="c2-card c2-pad"><h2>เกณฑ์ 1 · ต้นทุนทักถูก (ยิงวันแรก–วันที่ 5)</h2><div class="c2-note">นับแคมเปญที่เริ่มยิงระหว่าง <b>' + dl(MR[0]) + ' – ' + dl(toD) + '</b> · ดู 5 วันแรกของแต่ละตัว (คอลัมน์ "ช่วงที่ดู") · ต้นทุนต่อทักรวม 5 วัน ≤ เกณฑ์ และคนทักรวม 5 วัน ≥ ขั้นต่ำ ตามกลุ่มสินค้า</div>';
      h += '<div class="c2-scroll"><table class="c2-t ai2-t"><thead><tr><th>เกรด</th><th>แคมเปญ</th><th>สินค้า · เพจ · ผู้ดูแล</th><th>ช่วงที่ดู (วันที่ 1–5)</th><th class="r">ค่าแอด 5 วัน</th><th class="r">คนทัก 5 วัน</th><th class="r">ต้นทุน/ทัก</th><th>เกณฑ์ที่ผ่าน</th><th class="r">ค่าคอม</th></tr></thead><tbody>';
      chat.forEach(function (x, xi) {
        var c = x.c, g = x.grade;
        h += '<tr><td>' + (g ? gtag(g[0]) : '') + (x.done ? '' : '<span class="ai2-tag none">วันที่ ' + x.n + '/5</span>') + '</td><td class="ai2-name"><button class="ag-clip" title="ดูคลิป: ' + esc(c.name) + '" onclick="angelV2.clip(\'chat\',' + xi + ')">' + esc(c.name) + '</button><span class="c2-dim ai2-sm">' + esc(c.disp) + '</span>' + (x.dups && x.dups.length ? '<span class="ag-dup" title="' + esc(x.dups.map(function (d) { return d.c.name; }).join('\n')) + '">ซ้ำอีก ' + x.dups.length + ' แคมเปญ · นับชิ้นเดียว</span>' : '') + '</td>' +
          '<td><b>' + esc(c.prod) + '</b><div class="c2-dim ai2-sm">' + esc(c.page) + '</div><span class="ag-mgt' + (c.mgr === 'ไม่ระบุ' ? ' none' : '') + '">' + esc(c.mgr) + '</span></td><td class="ai2-nw">' + dl(c.first) + ' – ' + dl(x.end) + '</td>' +
          '<td class="r">' + B(x.s) + '</td><td class="r">' + I(x.ch) + '</td><td class="r"><b>' + B(x.cpc) + '</b></td>' +
          '<td class="ai2-sm">' + (g ? esc(x.rule.name) + ': ≤ ฿' + g[1] + ' · ≥ ' + g[2] + ' คน' : '<span class="c2-dim">' + (x.done ? 'ไม่ผ่าน' : 'ยังไม่ครบ 5 วัน · คนทักยังไม่ถึงขั้นต่ำ') + '</span>') + '</td>' +
          '<td class="r">' + (g && x.done ? '<b class="c2-good">' + B(g[3]) + '</b>' : '<span class="c2-dim">' + (g ? 'รอครบ 5 วัน' : '–') + '</span>') + '</td></tr>';
      });
      if (!chat.length) h += '<tr><td colspan="9" class="c2-dim">ยังไม่มีคอนเทนต์ที่ผ่านเกณฑ์นี้</td></tr>';
      h += '</tbody></table></div><div class="c2-note">I SURE PLUS ยังไม่มีเกณฑ์ทักถูก จึงไม่ถูกคัดในเกณฑ์นี้ · "คนทัก" = การสนทนาที่ Facebook นับ</div></div>';
    } else {
      roas.sort(function (a, b) { return (a.b.gi - b.b.gi) || (b.b.ro - a.b.ro); });
      h += '<div class="c2-card c2-pad"><h2>เกณฑ์ 2 · ใช้งบยิง + ROAS (3 วันติดกัน)</h2><div class="c2-note">หา 3 วันติดกันในช่วง <b>' + dl(MR[0]) + ' – ' + dl(toD) + '</b> · ทุกวันใน 3 วันต้องใช้งบ ≥ เกณฑ์ และ ROAS รวม 3 วัน ≥ เกณฑ์ · แสดงเกรดสูงสุดที่ทำได้ พร้อม 3 วันที่ผ่าน</div>';
      h += '<div class="c2-scroll"><table class="c2-t ai2-t"><thead><tr><th>เกรด</th><th>แคมเปญ</th><th>สินค้า · เพจ · ผู้ดูแล</th><th>3 วันที่ผ่าน</th><th class="r">งบต่ำสุด/วัน</th><th class="r">ค่าแอด 3 วัน</th><th class="r">ยอดขาย 3 วัน</th><th class="r">ROAS</th><th class="r">ค่าคอม</th></tr></thead><tbody>';
      roas.forEach(function (x, xi) {
        var c = x.c, b = x.b;
        h += '<tr><td>' + gtag(b.grade[0]) + '</td><td class="ai2-name"><button class="ag-clip" title="ดูคลิป: ' + esc(c.name) + '" onclick="angelV2.clip(\'roas\',' + xi + ')">' + esc(c.name) + '</button><span class="c2-dim ai2-sm">' + esc(c.disp) + '</span>' + (x.dups && x.dups.length ? '<span class="ag-dup" title="' + esc(x.dups.map(function (d) { return d.c.name; }).join('\n')) + '">ซ้ำอีก ' + x.dups.length + ' แคมเปญ · นับชิ้นเดียว</span>' : '') + '</td>' +
          '<td><b>' + esc(c.prod) + '</b><div class="c2-dim ai2-sm">' + esc(c.page) + '</div><span class="ag-mgt' + (c.mgr === 'ไม่ระบุ' ? ' none' : '') + '">' + esc(c.mgr) + '</span></td><td class="ai2-nw">' + dl(b.from) + ' – ' + dl(addD(b.from, 2)) + '</td>' +
          '<td class="r">' + B(b.minS) + '</td><td class="r">' + B(b.s) + '</td><td class="r">' + B(b.v) + '</td><td class="r"><span class="c2-pill g">' + b.ro.toFixed(2) + '</span></td><td class="r"><b class="c2-good">' + B(b.grade[3]) + '</b></td></tr>';
      });
      if (!roas.length) h += '<tr><td colspan="9" class="c2-dim">ยังไม่มีคอนเทนต์ที่ผ่านเกณฑ์นี้</td></tr>';
      h += '</tbody></table></div><div class="c2-note">ROAS / ยอดขายเป็นตัวเลขที่ Facebook นับ · 1 แคมเปญ = 1 ชิ้น</div></div>';
    }
    // ตารางเกณฑ์
    h += '<details class="c2-card ai2-cfg"><summary><b>ดูเกณฑ์ทั้งหมด</b><span class="c2-dim">เกณฑ์ 1 แยกตามกลุ่มสินค้า · เกณฑ์ 2 ใช้กับทุกสินค้า</span></summary><div class="ag-rules">' +
      Object.keys(CHAT_RULES).map(function (k) { var r = CHAT_RULES[k]; return '<div><b>เกณฑ์ 1 · ' + esc(r.name) + '</b><div class="c2-dim ai2-sm">' + esc(r.prods.join(' / ')) + '</div><table class="c2-t"><thead><tr><th></th>' + r.g.map(function (g) { return '<th>' + g[0] + '</th>'; }).join('') + '</tr></thead><tbody><tr><td>ต้นทุน/ทัก ≤</td>' + r.g.map(function (g) { return '<td>฿' + g[1] + '</td>'; }).join('') + '</tr><tr><td>คนทักรวม 5 วัน ≥</td>' + r.g.map(function (g) { return '<td>' + g[2] + '</td>'; }).join('') + '</tr><tr><td>ค่าคอม</td>' + r.g.map(function (g) { return '<td>฿' + g[3] + '</td>'; }).join('') + '</tr></tbody></table></div>'; }).join('') +
      '<div><b>เกณฑ์ 2 · เกรดคอนเทนต์</b><div class="c2-dim ai2-sm">ทุกสินค้า · 3 วันติดกัน</div><table class="c2-t"><thead><tr><th></th>' + ROAS_RULES.map(function (g) { return '<th>' + g[0] + '</th>'; }).join('') + '</tr></thead><tbody><tr><td>งบ/วัน ≥</td>' + ROAS_RULES.map(function (g) { return '<td>' + B(g[1]) + '</td>'; }).join('') + '</tr><tr><td>ROAS ≥</td>' + ROAS_RULES.map(function (g) { return '<td>' + g[2] + '</td>'; }).join('') + '</tr><tr><td>ค่าคอม/ชิ้น</td>' + ROAS_RULES.map(function (g) { return '<td>' + B(g[3]) + '</td>'; }).join('') + '</tr></tbody></table></div></div></details>';
    h += '</div>';
    box.innerHTML = h;
    window._angelLast = { chat: chat, roas: roas };
    var qi = box.querySelector('.ai2-q'); if (qi && S._f) { qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); S._f = false; }
  }
  function csv() {
    var L = window._angelLast; if (!L) return;
    var lines = [['เกณฑ์', 'เกรด', 'สถานะ', 'สินค้า', 'เพจ', 'ผู้ดูแล', 'บัญชี', 'แคมเปญ', 'ช่วงวันที่', 'ค่าแอด', 'คนทัก', 'ต้นทุน/ทัก', 'ยอดขาย', 'ROAS', 'ค่าคอม']];
    L.chat.forEach(function (x) { lines.push(['ทักถูก', x.grade ? x.grade[0] : '', x.done ? 'ครบ 5 วัน' : 'วันที่ ' + x.n + '/5', x.c.prod, x.c.page, x.c.mgr, x.c.disp, x.c.name, x.c.first + ' ถึง ' + x.end, Math.round(x.s), Math.round(x.ch), Math.round(x.cpc), '', '', x.grade && x.done ? x.grade[3] : 0]); });
    L.roas.forEach(function (x) { lines.push(['งบ+ROAS', x.b.grade[0], '', x.c.prod, x.c.page, x.c.mgr, x.c.disp, x.c.name, x.b.from + ' ถึง ' + addD(x.b.from, 2), Math.round(x.b.s), Math.round(x.b.ch), '', Math.round(x.b.v), x.b.ro.toFixed(2), x.b.grade[3]]); });
    var t = String.fromCharCode(65279) + lines.map(function (r) { return r.map(function (v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv;charset=utf-8' })); a.download = 'คัดนางฟ้า-' + S.m + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  /* ---------- ดูคลิปของแคมเปญ ---------- */
  function clip(tab, i) {
    var L = window._angelLast; var x = L && L[tab] && L[tab][i]; if (!x) return;
    var c = x.c, acc = c.acc, tok = (window.FB_TOKENS || {})[acc] || window.FB_TOKEN;
    var mm = (window.FB_ACCOUNTS_META || []).filter(function (m) { return m.name === acc || m.configKey === 'FB_GID_' + acc; })[0] || {};
    var ov = document.getElementById('agClip');
    if (!ov) { ov = document.createElement('div'); ov.id = 'agClip'; ov.onclick = function (e) { if (e.target === ov) closeClip(); }; document.body.appendChild(ov); document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeClip(); }); }
    ov.style.display = 'flex';
    ov.innerHTML = '<div class="agc-box" role="dialog" aria-label="คลิปของแคมเปญ"><div class="agc-head"><div><b>' + esc(c.name) + '</b><div class="c2-dim ai2-sm">' + esc(c.prod) + ' · ' + esc(c.page) + ' · ' + esc(c.disp) + '</div></div><button class="agc-x" aria-label="ปิด" onclick="angelV2.closeClip()">✕</button></div><div class="agc-body" id="agcBody"><div class="c2-dim">กำลังดึงโฆษณาจาก Facebook…</div></div></div>';
    var body = document.getElementById('agcBody');
    var fail = function (m) { body.innerHTML = '<div class="ai2-banner warn"><b>ดึงคลิปไม่ได้</b><span>' + esc(m) + '</span></div>'; };
    if (!mm.id) return fail('ไม่พบรหัสบัญชีโฆษณา');
    var f = encodeURIComponent(JSON.stringify([{ field: 'name', operator: 'EQUAL', value: c.name }]));
    fetch(window.FB_API + mm.id + '/campaigns?fields=id,name&limit=5&filtering=' + f + '&access_token=' + tok).then(function (r) { return r.json(); }).then(function (j) {
      if (j.error) return fail(j.error.message);
      var ids = (j.data || []).map(function (d) { return d.id; }); if (!ids.length) return fail('ไม่พบแคมเปญนี้ในบัญชี (อาจถูกเปลี่ยนชื่อหรือลบ)');
      return Promise.all(ids.map(function (cid) { return fetch(window.FB_API + cid + '/ads?fields=name,effective_status,creative{video_id,thumbnail_url,image_url,effective_object_story_id}&limit=20&access_token=' + tok).then(function (r) { return r.json(); }); })).then(function (res) {
        var ads = [], seen = {};
        res.forEach(function (r) { (r.data || []).forEach(function (a) { var cr = a.creative || {}, k = cr.video_id || cr.effective_object_story_id || a.id; if (seen[k]) return; seen[k] = 1; ads.push(a); }); });
        if (!ads.length) return fail('แคมเปญนี้ไม่มีโฆษณา');
        body.innerHTML = ads.map(function (a) {
          var cr = a.creative || {}, story = cr.effective_object_story_id || '', pg = story.split('_')[0], post = story ? 'https://www.facebook.com/' + story : '';
          var player = cr.video_id && pg ? '<iframe class="agc-vid" src="https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent('https://www.facebook.com/' + pg + '/videos/' + cr.video_id + '/') + '&show_text=false&width=360" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen loading="lazy" title="คลิปโฆษณา"></iframe>'
            : (cr.image_url || cr.thumbnail_url ? '<img class="agc-img" src="' + esc(cr.image_url || cr.thumbnail_url) + '" alt="ภาพโฆษณา">' : '<div class="c2-dim">ไม่มีตัวอย่าง</div>');
          return '<div class="agc-ad">' + player + '<div class="agc-meta"><span class="ai2-tag ' + (a.effective_status === 'ACTIVE' ? 'up' : a.effective_status === 'DISAPPROVED' ? 'close' : 'none') + '">' + esc(a.effective_status || '') + '</span> <span class="ai2-sm">' + esc(a.name || '') + '</span>' + (post ? '<a class="c2-link" href="' + post + '" target="_blank" rel="noopener">เปิดโพสต์ใน Facebook ↗</a>' : '') + '</div></div>';
        }).join('') + '<div class="c2-note">ถ้าคลิปไม่เล่น (โพสต์โฆษณาบางตัวไม่เปิดให้ฝัง) ให้กด "เปิดโพสต์ใน Facebook"</div>';
      });
    }).catch(function (e) { fail(e.message); });
  }
  function closeClip() { var ov = document.getElementById('agClip'); if (ov) { ov.style.display = 'none'; ov.innerHTML = ''; } }
  var qT;
  window.angelV2 = {
    set: function (k, v) { S[k] = v; render(); if (k !== 'tab') window.scrollTo(0, 0); },
    q: function (v) { S.q = v; clearTimeout(qT); qT = setTimeout(function () { S._f = true; render(); }, 250); },
    csv: csv, render: render, open: open, clip: clip, closeClip: closeClip
  };

  var ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/></svg>';
  function open(el) {
    document.querySelectorAll('[id$="View"]').forEach(function (v) { v.style.display = 'none'; });
    document.querySelectorAll('.sb-item').forEach(function (i) { i.classList.remove('active'); });
    var v = document.getElementById('angelView'); if (v) v.style.display = '';
    var it = el || document.getElementById('sb-angel'); if (it) it.classList.add('active');
    render(); window.scrollTo(0, 0);
  }
  function css() {
    if (document.getElementById('agcss')) return;
    var s = document.createElement('style'); s.id = 'agcss';
    s.textContent = [
      '#angelView .ag-g{display:inline-block;min-width:34px;text-align:center;padding:3px 8px;border-radius:99px;font-size:12px;font-weight:700;margin-right:6px}#angelView .ag-g.ap{background:#FEF3C7;color:#92400E}#angelView .ag-g.a{background:#DBEAFE;color:#1D4ED8}#angelView .ag-g.b{background:#E2E8F0;color:#334155}',
      '#angelView .ag-range{margin-top:6px;font-size:14px;color:#0F172A;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:6px 10px;display:inline-block}#angelView .ag-cut{margin-top:4px;font-size:13px;color:#92400E}#angelView .ag-dup{display:inline-block;margin-top:3px;padding:1px 8px;border-radius:99px;background:#FEF3C7;color:#92400E;font-size:11px;font-weight:600}',
      '#angelView .ag-mg{display:flex;flex-wrap:wrap;gap:8px;align-items:stretch}#angelView .ag-mgl{align-self:center;font-size:13px;color:#64748B;margin-right:4px}#angelView .ag-mg button{display:flex;flex-direction:column;align-items:flex-start;gap:1px;border:1px solid #E5E7EB!important;background:#fff!important;border-radius:10px!important;padding:7px 12px!important;cursor:pointer;font:inherit!important;color:#0F172A!important;min-width:92px;text-align:left}#angelView .ag-mg button b{font-size:13px}#angelView .ag-mg button span{font-size:11px;color:#64748B}#angelView .ag-mg button .ag-mgc{color:#15803D;font-weight:600;font-size:12px}#angelView .ag-mg button.on{background:#2563EB!important;border-color:#2563EB!important;color:#fff!important}#angelView .ag-mg button.on span{color:#DBEAFE!important}#angelView .ag-mg button:not(:first-of-type){}#angelView .ag-mgt{display:inline-block;margin-top:3px;padding:1px 8px;border-radius:99px;background:#EEF2FF;color:#4338CA;font-size:11px;font-weight:700}#angelView .ag-mgt.none{background:#F1F5F9;color:#94A3B8;font-weight:500}',
      '#angelView .ag-switch{display:flex;flex-wrap:wrap;gap:10px;align-items:center}#angelView .ag-switch .ai2-q{margin-left:auto}',
      '#angelView .ag-rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:14px}#angelView .ag-rules .c2-t{min-width:0;margin-top:6px}',
      '#angelView .ag-clip{display:block;max-width:100%;border:0;background:none;padding:0;font:inherit;font-weight:600;color:#1D4ED8;cursor:pointer;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#angelView .ag-clip:hover{text-decoration:underline}',
      '#agClip{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:99999;display:none;align-items:center;justify-content:center;padding:16px;font-family:"IBM Plex Sans Thai","Sarabun",system-ui,sans-serif}#agClip .agc-box{background:#fff;border-radius:14px;width:min(820px,100%);max-height:92vh;display:flex;flex-direction:column;overflow:hidden}',
      '#agClip .agc-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:14px 18px;border-bottom:1px solid #E5E7EB;font-size:14px}#agClip .agc-x{width:34px;height:34px;border:1px solid #E5E7EB;border-radius:8px;background:#fff;cursor:pointer;flex:none}',
      '#agClip .agc-body{padding:16px 18px;overflow:auto;display:flex;flex-wrap:wrap;gap:16px;font-size:13px}#agClip .agc-ad{width:360px;max-width:100%;display:flex;flex-direction:column;gap:8px}#agClip .agc-vid{width:360px;max-width:100%;height:640px;max-height:70vh;border:0;border-radius:10px;background:#000}#agClip .agc-img{width:100%;border-radius:10px}#agClip .agc-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center}#agClip .c2-note{width:100%}',
      '#angelView .c2-tabs button{border-radius:99px}#angelView .c2-seg button{border-radius:7px}'
    ].join('\n');
    document.head.appendChild(s);
  }
  var tries = 0;
  function install() {
    var cr = document.getElementById('sb-chartrank'), wrap = document.querySelector('.content-wrap');
    if (!cr || !wrap || !window.FB_HIERARCHY) return setTimeout(install, 500);
    var navOff = false; try { navOff = localStorage.getItem('rb_nav_v2') === 'off'; } catch (e) {}
    var grouped = cr.parentNode && cr.parentNode.classList && cr.parentNode.classList.contains('v2nav-items');
    if (!grouped && !navOff && ++tries < 30) return setTimeout(install, 500);
    if (document.getElementById('sb-angel')) return;
    css();
    var it = document.createElement('div'); it.className = 'sb-item'; it.id = 'sb-angel';
    it.innerHTML = '<span class="sb-icon">' + ICON + '</span><span>คัดนางฟ้า</span>';
    it.onclick = function () { open(it); };
    cr.parentNode.insertBefore(it, cr.nextSibling);
    var v = document.createElement('div'); v.id = 'angelView'; v.style.display = 'none';
    wrap.appendChild(v);
    document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('.sb-item'); if (t && t.id !== 'sb-angel') { var av = document.getElementById('angelView'); if (av) av.style.display = 'none'; it.classList.remove('active'); } }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
