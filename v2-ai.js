/* v2-ai.js — หน้า "AI วิเคราะห์ Ads" และ "AI แนะนำคอนเทนต์" แบบใหม่
   ใช้ข้อมูลเดิม (fbDataMap) · ใช้สไตล์ร่วมกับหน้ากราฟ (คลาส c2-*) · แทนที่ _renderAdsAI / _renderAIContent */
(function () {
  'use strict';
  var PAL = ['#2563EB', '#0EA5E9', '#6366F1', '#14B8A6', '#8B5CF6', '#0891B2', '#F59E0B', '#EC4899', '#10B981', '#64748B', '#EF4444', '#84CC16', '#A855F7', '#06B6D4'];
  var A = { p: -1, acc: null, act: 'all', q: '', sort: 'sp7' };
  try { var sv = JSON.parse(localStorage.getItem('rb_adsai_v2') || 'null'); if (sv) { A.p = sv.p; A.sort = sv.sort || 'sp7'; } } catch (e) {}

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jsq(s) { return esc(JSON.stringify(String(s))); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dayShift(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
  function B(n) { return '฿' + Math.round(n || 0).toLocaleString('en-US'); }
  function K(n) { n = n || 0; return Math.abs(n) >= 1e6 ? '฿' + (n / 1e6).toFixed(2) + 'M' : (Math.abs(n) >= 1e3 ? '฿' + (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : '฿' + Math.round(n)); }
  function I(n) { return Math.round(n || 0).toLocaleString('en-US'); }
  function prods() { return window.FB_HIERARCHY || []; }
  function accsOf(p) { var a = []; (p.pages || []).forEach(function (pg) { (pg.accounts || []).forEach(function (h) { (h.adAccounts || []).forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); }); }); return a; }
  function allAccs() { var a = []; prods().forEach(function (p) { accsOf(p).forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); }); return a; }
  function pageOf(acc) { var r = ''; prods().forEach(function (p) { (p.pages || []).forEach(function (pg) { (pg.accounts || []).forEach(function (h) { if ((h.adAccounts || []).indexOf(acc) >= 0 && !r) r = pg.name; }); }); }); return r; }
  function dispOf(acc) { var r = acc; prods().forEach(function (p) { (p.pages || []).forEach(function (pg) { (pg.accounts || []).forEach(function (h) { if ((h.adAccounts || []).indexOf(acc) >= 0 && h.displayName) r = h.displayName; }); }); }); return r; }
  function blank() { return { spend: 0, rev: 0, buy: 0, chat: 0, imp: 0, clk: 0 }; }
  function fin(a) { a.roas = a.spend ? a.rev / a.spend : 0; a.cpa = a.buy ? a.spend / a.buy : 0; a.cpc = a.chat ? a.spend / a.chat : 0; return a; }
  function addRow(a, r) { a.spend += num(r.spend); a.rev += num(r.revenue); a.buy += num(r.purchases); a.chat += num(r.conversations); a.imp += num(r.impressions); a.clk += num(r.clicks); }
  // ช่วง: today = วันนี้ · y = เมื่อวาน · 3 / 7 / 14 / 30 = วันที่จบแล้ว ถึงเมื่อวาน
  function inP(date, k) {
    var t = dayShift(0);
    if (k === 'today') return date === t;
    if (k === 'yesterday' || k === 'y') return date === dayShift(1);
    var n = parseInt(k, 10) || 7; return date >= dayShift(n) && date < t;
  }
  function loadAll() {
    allAccs().forEach(function (n) {
      try { if (!window.fbLoadedMap[n] && !(window._fbLoadingMap || {})[n]) { (window._fbLoadingMap = window._fbLoadingMap || {})[n] = true; var m = (window.FB_ACCOUNTS_META || []).find(function (a) { return a.name === n; }); if (m && window._loadFBFromAPI) window._loadFBFromAPI(m, n); } } catch (e) {}
    });
  }
  function pill(v, has) { if (!has) return '<span class="c2-dim">–</span>'; return '<span class="c2-pill ' + (v >= 2 ? 'g' : v >= 1 ? 'w' : 'b') + '">' + v.toFixed(2) + '</span>'; }

  /* ================= AI วิเคราะห์ Ads ================= */
  var PK = [['today', 'วันนี้', 'ถึงตอนนี้'], ['y', 'เมื่อวาน', ''], ['3', '3 วัน', 'ถึงเมื่อวาน'], ['7', '7 วัน', 'ถึงเมื่อวาน']];
  // กติกาทีม: ต้นทุน/ซื้อ ≤ ฿200 (3 วัน ซื้อ ≥ 2 มียอดขาย) → เพิ่มได้ · 3 วัน + 7 วัน ROAS < 1 → ปิด · < 1.5 ทั้งคู่ → ลด 50%
  function decide(c) {
    var t = c.p.today, y = c.p.y, d3 = c.p['3'], d7 = c.p['7'];
    if (!t.spend && !y.spend && !d3.spend && !d7.spend) return { k: 'none', t: 'ไม่มีค่าใช้จ่าย', adj: 0 };
    if (c.first && c.first >= dayShift(2) && !(d3.spend && d3.roas >= 1.5)) return { k: 'keep', t: 'ตัวใหม่ (เริ่ม ' + c.first.slice(8) + '/' + c.first.slice(5, 7) + ') รอครบ 3 วัน', adj: 0 };
    if (!d7.rev && !d3.rev && d7.spend > 0 && !d7.buy) return d7.chat >= 5 && d7.cpc && d7.cpc < 80 && c.first >= dayShift(4) ? { k: 'keep', t: 'ทักถูก ยังไม่ขาย → รอครบ 5 วัน', adj: 0 } : { k: 'close', t: 'ยังไม่มียอดขาย → ปิด', adj: -1 };
    if (d3.spend && d7.spend && d3.roas < 1 && d7.roas < 1) return { k: 'close', t: 'ปิด (3 วัน + 7 วัน < 1)', adj: -1 };
    if (d3.buy >= 2 && d3.rev > 0 && d3.cpa <= 200) return { k: 'up', t: 'เพิ่มงบ (ต้นทุน/ซื้อ ' + B(d3.cpa) + ')', adj: d3.cpa <= 120 ? 0.5 : 0.3 };
    if (d7.roas >= 2 && (!d3.spend || d3.roas >= 2) && (!y.spend || y.roas >= 2)) return { k: 'up', t: 'เพิ่มงบ 30–50% (≥ 2 ทุกช่วง)', adj: 0.4 };
    if (d3.roas < 1.5 && d7.roas < 1.5) return { k: 'down', t: 'ลด 50% (3 วัน + 7 วัน < 1.5)', adj: -0.5 };
    if ((d3.spend && d3.roas < 1) || (y.spend && y.roas < 1)) return { k: 'down', t: 'ลด 30% + เฝ้าดู', adj: -0.3 };
    if (d7.roas >= 1.7 && y.roas >= d3.roas) return { k: 'up', t: 'กำลังดีขึ้น +10–20%', adj: 0.15 };
    return { k: 'keep', t: 'คงงบ + ปรับครีเอทีฟ', adj: 0 };
  }
  function adsData() {
    var accs = A.p >= 0 && prods()[A.p] ? accsOf(prods()[A.p]) : allAccs();
    var tot = {}, cm = {}, first = {}, loaded = 0;
    PK.forEach(function (p) { tot[p[0]] = blank(); });
    accs.forEach(function (acc) {
      var rows = (window.fbDataMap || {})[acc]; if (window.fbLoadedMap && window.fbLoadedMap[acc]) loaded++;
      (rows || []).forEach(function (r) {
        if (!r.date) return;
        var key = acc + '|' + (r.campaign || '(ไม่มีชื่อ)');
        if (num(r.spend) > 0) { var f0 = (first[key] || '9'); if (r.date < f0) first[key] = r.date; }
        PK.forEach(function (p) {
          if (!inP(r.date, p[0])) return;
          addRow(tot[p[0]], r);
          var c = cm[key] || (cm[key] = { acc: acc, name: r.campaign || '(ไม่มีชื่อ)', p: { today: blank(), y: blank(), '3': blank(), '7': blank() } });
          addRow(c.p[p[0]], r);
        });
      });
    });
    PK.forEach(function (p) { fin(tot[p[0]]); });
    var camps = Object.keys(cm).map(function (k) { var c = cm[k]; c.first = first[k] || ''; PK.forEach(function (p) { fin(c.p[p[0]]); }); c.d = decide(c); return c; })
      .filter(function (c) { return c.p.today.spend > 0 || c.p.y.spend > 0 || c.p['3'].spend > 0; });
    return { accs: accs, loaded: loaded, tot: tot, camps: camps };
  }
  function insights(T) {
    var o = [], t = T.today, y = T.y, d3 = T['3'], d7 = T['7'];
    if (t.spend && t.roas < 1) o.push(['bad', 'ROAS วันนี้ ' + t.roas.toFixed(2) + ' ต่ำกว่า 1 — ตอนนี้ยังขาดทุน', 'เช็กแคมเปญที่ขึ้นสีแดงในตารางด้านล่างก่อน']);
    if (d3.spend && d3.roas < 1) o.push(['bad', 'ROAS 3 วัน ' + d3.roas.toFixed(2) + ' ต่ำกว่า 1', 'ขาดทุนต่อเนื่อง ควรปิดตัวที่แดงทั้ง 3 วันและ 7 วัน']);
    if (t.spend && d7.spend && t.roas >= d7.roas * 1.1) o.push(['good', 'ROAS วันนี้ (' + t.roas.toFixed(2) + ') ดีกว่าค่าเฉลี่ย 7 วัน (' + d7.roas.toFixed(2) + ')', 'ดันงบตัวที่อยู่ในกลุ่ม "เพิ่มงบ" ได้']);
    else if (t.spend && d7.spend && t.roas <= d7.roas * 0.85) o.push(['warn', 'ROAS วันนี้ (' + t.roas.toFixed(2) + ') ต่ำกว่าค่าเฉลี่ย 7 วัน (' + d7.roas.toFixed(2) + ')', 'วันนี้ยังไม่จบ แต่ควรระวังก่อนเพิ่มงบ']);
    if (d3.buy && d3.cpa > 200) o.push(['warn', 'ต้นทุนต่อซื้อ 3 วัน ' + B(d3.cpa) + ' สูงกว่าเกณฑ์ ฿200', 'ย้ายงบจากตัวที่แพงไปตัวที่ต้นทุน/ซื้อ ≤ ฿200']);
    if (d7.spend && d7.roas >= 2) o.push(['good', 'ROAS 7 วัน ' + d7.roas.toFixed(2) + ' ถึงเป้า 2 แล้ว', 'ขยายคลิปที่ดีด้วยการรุมยิงในเพจเดิม']);
    return o.slice(0, 3);
  }
  function renderAds(el) {
    el = el || document.getElementById('adsaiView'); if (!el) return;
    loadAll();
    window._adsaiProduct = A.p; window._adsaiFilterAccount = A.acc;
    var P = prods(), D = adsData(), T = D.tot, h = '';
    var selP = A.p >= 0 ? P[A.p] : null;
    h += '<div class="c2-wrap ai2">';
    h += '<div class="c2-head"><div><h1>AI วิเคราะห์ Ads' + (selP ? ' · ' + esc(selP.product) : '') + '</h1><div class="c2-subhead">ROAS ข้ามช่วงเวลา วันนี้ / เมื่อวาน / 3 วัน / 7 วัน · ใช้กติกาทีม: ต้นทุน/ซื้อ ≤ ฿200 เพิ่มงบ · 3 วัน + 7 วัน &lt; 1 ปิด</div></div>' +
      '<button class="ai2-btn" onclick="_renderAdsAI()">รีเฟรช</button></div>';
    h += '<div class="c2-tabs"><button class="' + (A.p < 0 ? 'on' : '') + '" onclick="aiV2.p(-1)">ทุกสินค้า</button>' + P.map(function (p, i) { var on = A.p === i; return '<button class="' + (on ? 'on' : '') + '" onclick="aiV2.p(' + i + ')"><i style="background:' + (on ? '#fff' : PAL[i % PAL.length]) + '"></i>' + esc(p.product) + '</button>'; }).join('') + '</div>';
    if (D.loaded < D.accs.length) h += '<div class="ai2-banner warn">กำลังโหลดข้อมูล ' + D.loaded + '/' + D.accs.length + ' บัญชี… <button class="c2-link" onclick="_renderAdsAI()">รีเฟรช</button></div>';
    if (!D.camps.length) { h += '<div class="c2-card c2-empty">ยังไม่มีข้อมูลแคมเปญ — รอโหลดข้อมูลจาก Facebook</div></div>'; el.innerHTML = h; return; }

    h += '<div class="c2-kpis">' + PK.map(function (p) {
      var a = T[p[0]];
      return '<div class="c2-card c2-kpi"><div class="c2-lbl">' + p[1] + (p[2] ? ' <span class="c2-dim">· ' + p[2] + '</span>' : '') + '</div><div class="c2-val ' + (a.spend ? (a.roas >= 2 ? 'c2-good' : a.roas >= 1 ? 'c2-warn' : 'c2-bad') : '') + '">' + (a.spend ? a.roas.toFixed(2) : '–') + '<small> ROAS</small></div>' +
        '<div class="c2-sub c2-dim">' + K(a.spend) + ' → ' + K(a.rev) + '</div><div class="c2-sub">ต้นทุน/ซื้อ <b class="' + (a.buy && a.cpa <= 200 ? 'c2-good' : a.buy ? 'c2-bad' : '') + '">' + (a.buy ? B(a.cpa) : '–') + '</b> · ซื้อ ' + I(a.buy) + '</div></div>';
    }).join('') + '</div>';

    var ins = insights(T);
    if (ins.length) h += '<div class="ai2-ins">' + ins.map(function (x) { return '<div class="ai2-banner ' + x[0] + '"><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span></div>'; }).join('') + '</div>';

    // กรอง
    var camps = D.camps.slice();
    if (A.acc) camps = camps.filter(function (c) { return c.acc === A.acc; });
    var cnt = { all: camps.length, up: 0, keep: 0, down: 0, close: 0 };
    camps.forEach(function (c) { if (cnt[c.d.k] != null) cnt[c.d.k]++; });
    if (A.act !== 'all') camps = camps.filter(function (c) { return c.d.k === A.act; });
    if (A.q) { var q = A.q.toLowerCase(); camps = camps.filter(function (c) { return (c.name + ' ' + c.acc + ' ' + pageOf(c.acc)).toLowerCase().indexOf(q) >= 0; }); }
    var SK = { sp7: function (c) { return -c.p['7'].spend; }, sp1: function (c) { return -c.p.y.spend; }, r3: function (c) { return -c.p['3'].roas; }, cpa: function (c) { return c.p['3'].buy ? c.p['3'].cpa : 1e9; } }[A.sort] || function (c) { return -c.p['7'].spend; };
    camps.sort(function (a, b) { return SK(a) - SK(b); });

    h += '<div class="c2-card c2-pad">';
    h += '<div class="c2-h2row"><h2>แคมเปญ (' + I(camps.length) + ')' + (A.acc ? ' · ' + esc(dispOf(A.acc)) + ' <button class="c2-link ai2-x" onclick="aiV2.acc(null)">ดูทุกบัญชี ✕</button>' : '') + '</h2>' +
      '<input class="ai2-q" type="search" placeholder="ค้นหาแคมเปญ / บัญชี / เพจ" value="' + esc(A.q) + '" oninput="aiV2.q(this.value)"></div>';
    h += '<div class="ai2-chips">' + [['all', 'ทั้งหมด'], ['up', 'เพิ่มงบ'], ['keep', 'คงงบ'], ['down', 'ลดงบ'], ['close', 'ปิด']].map(function (x) { return '<button class="ai2-chip ' + x[0] + (A.act === x[0] ? ' on' : '') + '" onclick="aiV2.act(\'' + x[0] + '\')">' + x[1] + ' <b>' + cnt[x[0]] + '</b></button>'; }).join('') +
      '<span class="ai2-sort">เรียง: ' + [['sp7', 'ค่าแอด 7 วัน'], ['sp1', 'ค่าแอดเมื่อวาน'], ['r3', 'ROAS 3 วัน'], ['cpa', 'ต้นทุน/ซื้อต่ำ']].map(function (x) { return '<button class="' + (A.sort === x[0] ? 'on' : '') + '" onclick="aiV2.sort(\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</span></div>';
    h += '<div class="c2-scroll"><table class="c2-t ai2-t"><thead><tr><th>แคมเปญ</th><th class="r">วันนี้</th><th class="r">เมื่อวาน</th><th class="r">3 วัน</th><th class="r">7 วัน</th><th class="r">ต้นทุน/ซื้อ 3 วัน</th><th class="r">ค่าแอดเมื่อวาน</th><th class="r">ค่าแอด 7 วัน</th><th class="r">งบแนะนำ</th><th>คำแนะนำ</th></tr></thead><tbody>';
    var MAX = 300;
    camps.slice(0, MAX).forEach(function (c) {
      var d3 = c.p['3'], sp1 = c.p.y.spend, rec = '<span class="c2-dim">–</span>';
      if (sp1 > 0) {
        if (c.d.adj === -1) rec = '<b class="c2-bad">ปิด</b>';
        else { var dl = Math.round(sp1 * c.d.adj / 100) * 100, nb = Math.max(200, Math.round((sp1 + dl) / 100) * 100); rec = dl ? '<b class="' + (dl > 0 ? 'c2-good' : 'c2-warn') + '">' + (dl > 0 ? '+' : '−') + B(Math.abs(dl)) + '</b> → ' + B(nb) : B(Math.round(sp1 / 100) * 100); }
      }
      h += '<tr class="ai2-' + c.d.k + '"><td class="ai2-name"><div title="' + esc(c.name) + '">' + esc(c.name) + '</div>' +
        '<button class="ai2-acc" onclick="aiV2.acc(' + jsq(c.acc) + ')">' + esc(pageOf(c.acc).replace(/^เจ้าขุน /, '')) + ' · ' + esc(dispOf(c.acc)) + '</button></td>' +
        '<td class="r">' + pill(c.p.today.roas, c.p.today.spend > 0) + '</td><td class="r">' + pill(c.p.y.roas, c.p.y.spend > 0) + '</td><td class="r">' + pill(d3.roas, d3.spend > 0) + '</td><td class="r">' + pill(c.p['7'].roas, c.p['7'].spend > 0) + '</td>' +
        '<td class="r ' + (d3.buy && d3.rev && d3.cpa <= 200 ? 'c2-good' : '') + '">' + (d3.buy ? B(d3.cpa) + ' <span class="c2-dim">· ' + I(d3.buy) + '</span>' : '<span class="c2-dim">–</span>') + '</td>' +
        '<td class="r">' + (sp1 ? B(sp1) : '<span class="c2-dim">–</span>') + '</td><td class="r">' + B(c.p['7'].spend) + '</td><td class="r ai2-nw">' + rec + '</td>' +
        '<td><span class="ai2-tag ' + c.d.k + '">' + esc(c.d.t) + '</span></td></tr>';
    });
    if (!camps.length) h += '<tr><td colspan="10" class="c2-dim">ไม่มีแคมเปญตามตัวกรองนี้</td></tr>';
    h += '</tbody></table></div>' + (camps.length > MAX ? '<div class="c2-note">แสดง ' + MAX + ' จาก ' + I(camps.length) + ' แคมเปญ — ใช้ช่องค้นหาหรือเลือกสินค้าเพื่อแคบลง</div>' : '') +
      '<div class="c2-note">ROAS / ยอดขายเป็นตัวเลขที่ Facebook นับ · "งบแนะนำ" คิดจากค่าแอดเมื่อวาน · ขั้นต่ำ ฿200 · กดชื่อเพจ·บัญชีเพื่อดูเฉพาะบัญชีนั้น</div></div>';

    // วางแผนงบ (ใช้ตัวคำนวณเดิม _adsaiCalcBudget)
    if (selP) {
      h += '<div class="c2-card c2-pad ai2-plan" id="adsai-planner"><h2>วางแผนงบวันนี้ · ' + esc(selP.product) + '</h2><div class="c2-note">ใส่งบรวมที่อยากยิงวันนี้ ระบบจะจัดงบให้แต่ละแคมเปญตาม ROAS เมื่อวาน / 3 วัน / 7 วัน</div>' +
        '<div class="ai2-form">' +
        '<label>งบวันนี้ (฿)<input id="adsai-budget" type="number" placeholder="เช่น 20000" value="' + (T.y.spend > 0 ? Math.round(T.y.spend) : '') + '"></label>' +
        '<label>เป้า ROAS<input id="adsai-target" type="number" step="0.1" value="2.0"></label>' +
        '<label>ต้นทุน/ซื้อ ≤ (฿) <small>ไม่บังคับ</small><input id="adsai-cpp" type="number" placeholder="เช่น 200"></label>' +
        '<label>ต้นทุน/ทัก ≤ (฿) <small>ไม่บังคับ</small><input id="adsai-conv" type="number" placeholder="เช่น 80"></label>' +
        '<button class="ai2-btn pri" onclick="_adsaiCalcBudget()">คำนวณ</button></div>' +
        '<div id="adsai-plan-result"></div><div id="adsai-history-panel"></div></div>';
    }
    h += '<div class="c2-note">อัปเดต ' + new Date().toLocaleTimeString('th-TH') + '</div></div>';
    el.innerHTML = h;
    // ข้อมูลให้ตัววางแผนงบเดิม (ใช้ชื่อแคมเปญเป็นคีย์)
    try {
      var rows = []; D.accs.forEach(function (n) { if (window.fbDataMap[n]) rows = rows.concat(window.fbDataMap[n]); });
      var mk = function (f, fld) { var m = {}; window._aiAggCamps(window._aiFilterRows(rows, f)).forEach(function (c) { m[c.campaign] = c[fld]; }); return m; };
      window._adsaiCamps7 = window._aiAggCamps(window._aiFilterRows(rows, '7d'));
      window._adsaiRoasTMap = mk('today', 'roas'); window._adsaiRoas1Map = mk('yesterday', 'roas'); window._adsaiSpend1Map = mk('yesterday', 'spend');
      window._adsaiSpendTMap = mk('today', 'spend'); window._adsaiRoas3Map = mk('3d', 'roas');
    } catch (e) {}
    var qi = el.querySelector('.ai2-q'); if (qi && A._focus) { qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); A._focus = false; }
  }
  function save() { try { localStorage.setItem('rb_adsai_v2', JSON.stringify({ p: A.p, sort: A.sort })); } catch (e) {} }
  var qT;
  window.aiV2 = {
    p: function (i) { A.p = i; A.acc = null; A.act = 'all'; save(); renderAds(); window.scrollTo(0, 0); },
    acc: function (a) { A.acc = a; A.act = 'all'; renderAds(); },
    act: function (k) { A.act = k; renderAds(); },
    sort: function (k) { A.sort = k; save(); renderAds(); },
    q: function (v) { A.q = v; clearTimeout(qT); qT = setTimeout(function () { A._focus = true; renderAds(); }, 250); },
    content: function (i, btn) { analyze(i, btn); },
    cperiod: function (f) { window.fbFilter = f; renderContent(); },
    chat: function (k, v) { CH[k] = v; if (k === 'sup') CH.p = ''; try { localStorage.setItem('rb_chat_v2', JSON.stringify(CH)); } catch (e) {} renderChat(); },
    bm: function (k, v) { BM[k] = v; if (k === 'mode' || k === 'p' || k === 'per') BM.tier = ''; try { localStorage.setItem('rb_bm_v2', JSON.stringify({ mode: BM.mode, per: BM.per, p: BM.p })); } catch (e) {} renderBench(); },
    bmq: function (v) { BM.q = v; clearTimeout(qT); qT = setTimeout(function () { BM._focus = true; renderBench(); }, 250); },
    cr: function (k, v) { CR[k] = v; try { localStorage.setItem('rb_cr_v2', JSON.stringify(CR)); } catch (e) {} renderRank(); }
  };

  /* ================= AI แนะนำคอนเทนต์ ================= */
  // ประเภทคอนเทนต์ตามวิธีตั้งชื่อแคมเปญของทีม
  var TYPES = [
    ['comment', 'เล่าคอมเมนต์ / คำถามลูกค้า', /คอมเม้น|คอมเมนต์|comment/i],
    ['qa', 'คำถาม-ตอบ', /คำถาม|ถาม-ตอบ|q&a/i],
    ['owner', 'เจ้าของแบรนด์', /เจ้าของแบรนด์/],
    ['expert', 'ผู้เชี่ยวชาญ', /ผู้เชี่ยวชาญ|มาโนช|หมอ|เภสัช|expert/i],
    ['mix', 'ยำคลิป (ตัดต่อคลิปคนดัง)', /ยำคลิป|ยำ/],
    ['promo', 'รูปโปร / โปรโมชัน', /รูปโปร|โปร |โปรโมชั่น|promo|ลดราคา/i],
    ['review', 'รีวิว / ผู้ใช้จริง', /รีวิว|แฟนผู้ใช้|ผู้ใช้จริง|review|ugc/i],
    ['compare', 'กินเปรียบเทียบ', /เปรียบเทียบ/],
    ['story', 'เล่าเรื่อง / วัย 40', /วัย ?40|เรื่องเล่า|story|เล่าเรื่อง/i],
    ['live', 'ไลฟ์', /ไลฟ์|live/i],
    ['ai', 'AI / กราฟิก', /\bai\b|กราฟิก/i]
  ];
  function ctype(name) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i][2].test(name || '')) return TYPES[i]; return ['other', 'อื่น ๆ', null]; }
  var CP = [['today', 'วันนี้'], ['yesterday', 'เมื่อวาน'], ['3d', '3 วัน'], ['7d', '7 วัน'], ['14d', '14 วัน'], ['30d', '30 วัน']];
  function curF() { var f = window.fbFilter; return CP.some(function (x) { return x[0] === f; }) ? f : '7d'; }
  function prodCamps(p, f) {
    var m = {};
    accsOf(p).forEach(function (acc) {
      ((window.fbDataMap || {})[acc] || []).forEach(function (r) {
        if (!r.date || !inP(r.date, { today: 'today', yesterday: 'y', '3d': '3', '7d': '7', '14d': '14', '30d': '30' }[f] || '7')) return;
        var k = acc + '|' + (r.campaign || '');
        var c = m[k] || (m[k] = Object.assign(blank(), { acc: acc, name: r.campaign || '(ไม่มีชื่อ)' }));
        addRow(c, r);
      });
    });
    return Object.keys(m).map(function (k) { return fin(m[k]); }).filter(function (c) { return c.spend > 0; });
  }
  function renderContent(el) {
    el = el || document.getElementById('aiView'); if (!el) return;
    loadAll();
    var f = curF(), P = prods(), h = '';
    h += '<div class="c2-wrap ai2">';
    h += '<div class="c2-head"><div><h1>AI แนะนำคอนเทนต์</h1><div class="c2-subhead">ดูว่าคอนเทนต์แนวไหนขายดี จากผลแคมเปญจริง · เทียบกับโฆษณาคู่แข่งใน Facebook Ad Library</div></div>' +
      '<div class="c2-seg" role="group" aria-label="ช่วงเวลา">' + CP.map(function (x) { return '<button class="' + (f === x[0] ? 'on' : '') + '" onclick="aiV2.cperiod(\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div></div>';
    P.forEach(function (p, i) {
      var cs = prodCamps(p, f), a = blank(); cs.forEach(function (c) { a.spend += c.spend; a.rev += c.rev; a.buy += c.buy; a.chat += c.chat; }); fin(a);
      var cached = (window._aiResults || {})[p.product];
      h += '<div class="c2-card ai2-prod"><div class="ai2-ph"><div class="ai2-pn"><i class="c2-dot" style="background:' + PAL[i % PAL.length] + '"></i><div><b>' + esc(p.product) + '</b><div class="c2-dim">' + esc(p.desc || '') + (p.desc ? ' · ' : '') + I(cs.length) + ' แคมเปญที่มีค่าแอด</div></div></div>' +
        '<div class="ai2-pm"><div><small>ค่าแอด</small><b>' + K(a.spend) + '</b></div><div><small>ยอดขาย (FB)</small><b>' + K(a.rev) + '</b></div><div><small>ROAS</small>' + pill(a.roas, a.spend > 0) + '</div><div><small>ต้นทุน/ซื้อ</small><b class="' + (a.buy && a.cpa <= 200 ? 'c2-good' : '') + '">' + (a.buy ? B(a.cpa) : '–') + '</b></div></div>' +
        '<button class="ai2-btn pri" id="ai-btn-' + i + '" onclick="aiV2.content(' + i + ',this)">' + (cached ? 'วิเคราะห์ใหม่' : 'วิเคราะห์') + '</button></div>' +
        '<div class="ai2-res" id="ai-result-' + i + '">' + (cached && cached.v2 ? cached.html : '<span class="c2-dim">กด "วิเคราะห์" เพื่อดูว่าคอนเทนต์แนวไหนทำยอดได้ดีในช่วง ' + esc(CP.filter(function (x) { return x[0] === f; })[0][1]) + '</span>') + '</div></div>';
    });
    h += '</div>';
    el.innerHTML = h;
  }
  function analyze(i, btn) {
    var p = prods()[i], el = document.getElementById('ai-result-' + i); if (!p || !el) return;
    var f = curF(), cs = prodCamps(p, f);
    if (!cs.length) { el.innerHTML = '<span class="c2-dim">ช่วงนี้ยังไม่มีแคมเปญที่มีค่าแอด</span>'; return; }
    var tm = {}, tot = blank();
    cs.forEach(function (c) { var t = ctype(c.name), x = tm[t[0]] || (tm[t[0]] = Object.assign(blank(), { k: t[0], l: t[1], n: 0, camps: [] })); x.spend += c.spend; x.rev += c.rev; x.buy += c.buy; x.chat += c.chat; x.n++; x.camps.push(c); tot.spend += c.spend; tot.rev += c.rev; });
    fin(tot);
    var types = Object.keys(tm).map(function (k) { return fin(tm[k]); }).sort(function (a, b) { return b.roas - a.roas; });
    var minSp = Math.max(300, tot.spend * 0.01);
    var good = cs.filter(function (c) { return c.spend >= minSp && c.buy >= 2; }).sort(function (a, b) { return b.roas - a.roas; }).slice(0, 5);
    var bad = cs.filter(function (c) { return c.spend >= Math.max(500, tot.spend / cs.length) && c.roas < 1; }).sort(function (a, b) { return b.spend - a.spend; }).slice(0, 5);
    var used = types.map(function (t) { return t.k; }), notTried = TYPES.filter(function (t) { return used.indexOf(t[0]) < 0; }).slice(0, 3);
    var solid = types.filter(function (t) { return t.spend >= tot.spend * 0.05; });
    var best = solid[0], worst = solid.length > 1 ? solid[solid.length - 1] : null;
    var h = '<div class="ai2-grid"><div><h3>ผลตามประเภทคอนเทนต์</h3><div class="c2-scroll"><table class="c2-t ai2-small"><thead><tr><th>ประเภท</th><th class="r">แคมเปญ</th><th class="r">ค่าแอด</th><th class="r">สัดส่วน</th><th class="r">ROAS</th><th class="r">ต้นทุน/ซื้อ</th><th class="r">ซื้อ</th></tr></thead><tbody>' +
      types.map(function (t) { return '<tr><td><b>' + esc(t.l) + '</b></td><td class="r">' + t.n + '</td><td class="r">' + B(t.spend) + '</td><td class="r">' + (tot.spend ? Math.round(t.spend / tot.spend * 100) : 0) + '%</td><td class="r">' + pill(t.roas, t.spend > 0) + '</td><td class="r ' + (t.buy && t.cpa <= 200 ? 'c2-good' : '') + '">' + (t.buy ? B(t.cpa) : '–') + '</td><td class="r">' + I(t.buy) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';
    var recs = [];
    if (best && best.roas >= 1) recs.push(['good', 'ทำแนว "' + best.l + '" เพิ่ม', 'ROAS ' + best.roas.toFixed(2) + ' ดีที่สุดในกลุ่มที่ใช้งบจริง (' + Math.round(best.spend / tot.spend * 100) + '% ของค่าแอด)']);
    if (good[0] && good[0].roas >= 1.5) recs.push(['good', 'รุมยิงซ้ำคลิปที่ดีที่สุด', esc(good[0].name.slice(0, 60)) + ' · ROAS ' + good[0].roas.toFixed(2) + ' · ทำในเพจเดิม ใช้โพสต์เดิม']);
    if (worst && worst.roas < 1.2 && worst !== best) recs.push(['warn', 'ลดแนว "' + worst.l + '"', 'ROAS ' + worst.roas.toFixed(2) + ' ใช้ค่าแอด ' + B(worst.spend) + ' — ย้ายงบไปแนวที่ดีกว่า']);
    if (notTried.length) recs.push(['info', 'ลองแนวที่ยังไม่มีในช่วงนี้', notTried.map(function (t) { return t[1]; }).join(' · ')]);
    h += '<div><h3>แนะนำคอนเทนต์ถัดไป</h3><div class="ai2-recs">' + recs.map(function (r) { return '<div class="ai2-banner ' + r[0] + '"><b>' + esc(r[1]) + '</b><span>' + r[2] + '</span></div>'; }).join('') + '</div></div></div>';
    h += '<div class="ai2-grid"><div><h3>คลิปที่ขายดีที่สุด</h3>' + (good.length ? '<ol class="ai2-list">' + good.map(function (c) { return '<li><span title="' + esc(c.name) + '">' + esc(c.name) + '<small>' + esc(pageOf(c.acc)) + ' · ' + esc(dispOf(c.acc)) + '</small></span>' + pill(c.roas, true) + '<em>' + B(c.spend) + ' · ซื้อ ' + I(c.buy) + '</em></li>'; }).join('') + '</ol>' : '<span class="c2-dim">ยังไม่มีแคมเปญที่ซื้อ ≥ 2 ครั้ง</span>') + '</div>';
    h += '<div><h3>ใช้งบเยอะแต่ขาดทุน (ROAS &lt; 1)</h3>' + (bad.length ? '<ol class="ai2-list bad">' + bad.map(function (c) { return '<li><span title="' + esc(c.name) + '">' + esc(c.name) + '<small>' + esc(pageOf(c.acc)) + ' · ' + esc(dispOf(c.acc)) + '</small></span>' + pill(c.roas, true) + '<em>' + B(c.spend) + '</em></li>'; }).join('') + '</ol>' : '<span class="c2-good">ไม่มีแคมเปญที่ใช้งบเยอะแล้วขาดทุน</span>') + '</div></div>';
    h += '<div class="ai2-comp"><div><b>วิเคราะห์คู่แข่ง</b><div class="c2-dim">ค้นโฆษณาหมวดเดียวกันใน Facebook Ad Library ว่าคู่แข่งใช้มุมไหน</div></div><button class="ai2-btn" onclick="_aiCompetitor(' + i + ',this)">ดูคู่แข่ง</button></div><div id="ai-comp-' + i + '" class="ai2-compres"></div>';
    h += '<div class="c2-note">ช่วง ' + esc(CP.filter(function (x) { return x[0] === f; })[0][1]) + ' · วิเคราะห์เมื่อ ' + new Date().toLocaleTimeString('th-TH') + ' · แยกประเภทจากชื่อแคมเปญ</div>';
    el.innerHTML = h;
    (window._aiResults = window._aiResults || {})[p.product] = { html: h, v2: 1 };
    if (btn) btn.textContent = 'วิเคราะห์ใหม่';
  }

  /* ================= คนทักรายเพจ ================= */
  var CH = { sup: '', p: '', sort: 'prod' };
  try { var cs0 = JSON.parse(localStorage.getItem('rb_chat_v2') || 'null'); if (cs0) { CH.sup = cs0.sup || ''; CH.p = cs0.p || ''; CH.sort = cs0.sort || 'prod'; } } catch (e) {}
  function supMap() { return window.CHAT_SUP_MAP || {}; }
  function renderChat() {
    var box = document.getElementById('chatPageInner'); if (!box) return;
    if (!window.FB_HIERARCHY || !window.fbDataMap) { box.innerHTML = '<div class="c2-wrap ai2"><div class="c2-card c2-empty">กำลังโหลดข้อมูล…</div></div>'; return; }
    loadAll();
    var lock = ''; try { lock = window._cpLockedSup ? window._cpLockedSup() : ''; } catch (e) {}
    if (lock) CH.sup = lock;
    var SM = supMap(), allowed = CH.sup && SM[CH.sup] ? SM[CH.sup] : null;
    var P = prods().filter(function (p) { return !allowed || allowed.indexOf(p.product) >= 0; });
    if (CH.p && !P.some(function (p) { return p.product === CH.p; })) CH.p = '';
    var T = dayShift(0), Yd = dayShift(1), D2 = dayShift(2), W = []; for (var i = 1; i <= 7; i++) W.push(dayShift(i));
    var rows = [], tot = { t: 0, y: 0, y2: 0, w: 0, sw: 0, bw: 0, st: 0 };
    prods().forEach(function (p, pi) {
      if (P.indexOf(p) < 0 || (CH.p && p.product !== CH.p)) return;
      (p.pages || []).forEach(function (pg) {
        var r = { prod: p.product, ci: pi, page: pg.name, t: 0, y: 0, y2: 0, w: 0, sw: 0, bw: 0, st: 0, n: 0, d: {} };
        (pg.accounts || []).forEach(function (a) { (a.adAccounts || []).forEach(function (acc) {
          r.n++;
          ((window.fbDataMap || {})[acc] || []).forEach(function (x) {
            var c = num(x.conversations), s = num(x.spend), b = num(x.purchases);
            if (x.date === T) { r.t += c; r.st += s; }
            if (x.date === Yd) r.y += c;
            if (x.date === D2) r.y2 += c;
            if (W.indexOf(x.date) >= 0) { r.w += c; r.sw += s; r.bw += b; r.d[x.date] = (r.d[x.date] || 0) + c; }
          });
        }); });
        if (!r.n) return;
        ['t', 'y', 'y2', 'w', 'sw', 'bw', 'st'].forEach(function (k) { tot[k] += r[k]; });
        rows.push(r);
      });
    });
    var SRT = { today: function (a, b) { return b.t - a.t; }, week: function (a, b) { return b.w - a.w; }, cpc: function (a, b) { return (a.w ? a.sw / a.w : 1e9) - (b.w ? b.sw / b.w : 1e9); } }[CH.sort];
    if (SRT) rows.sort(SRT);
    var maxW = rows.reduce(function (m, r) { return Math.max(m, r.w); }, 1);
    function dl(cur, prev, lbl) { if (!prev) return '<span class="c2-dim">ไม่มีข้อมูลเทียบ</span>'; var d = (cur - prev) / prev * 100; return '<span class="' + (Math.abs(d) < 1 ? 'c2-dim' : d > 0 ? 'c2-good' : 'c2-bad') + '">' + (d > 0 ? '▲' : d < 0 ? '▼' : '') + ' ' + Math.abs(d).toFixed(0) + '%</span> <span class="c2-dim">' + lbl + '</span>'; }
    var h = '<div class="c2-wrap ai2">';
    h += '<div class="c2-head"><div><h1>คนทักรายเพจ</h1><div class="c2-subhead">จำนวนคนทัก (การสนทนา) จาก Facebook Ads ของทุกเพจ · วันนี้ถึงเวลาที่โหลดล่าสุด · 7 วัน = ถึงเมื่อวาน</div></div>' +
      '<div class="c2-seg" role="group" aria-label="ทีมซุป">' + [''].concat(Object.keys(SM)).map(function (s) { var dis = lock && s !== lock; return dis ? '' : '<button class="' + (CH.sup === s ? 'on' : '') + '" onclick="aiV2.chat(\'sup\',' + jsq(s) + ')">' + (s ? esc(s) : 'ทุกทีม') + '</button>'; }).join('') + '</div></div>';
    h += '<div class="c2-tabs"><button class="' + (!CH.p ? 'on' : '') + '" onclick="aiV2.chat(\'p\',\'\')">ทุกสินค้า</button>' + P.map(function (p) { var i = prods().indexOf(p), on = CH.p === p.product; return '<button class="' + (on ? 'on' : '') + '" onclick="aiV2.chat(\'p\',' + jsq(p.product) + ')"><i style="background:' + (on ? '#fff' : PAL[i % PAL.length]) + '"></i>' + esc(p.product) + '</button>'; }).join('') + '</div>';
    h += '<div class="c2-kpis">' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">คนทักวันนี้</div><div class="c2-val">' + I(tot.t) + '</div><div class="c2-sub c2-dim">ต้นทุน ' + (tot.t ? B(tot.st / tot.t) : '–') + '/ทัก · ยังไม่จบวัน</div></div>' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">เมื่อวาน</div><div class="c2-val">' + I(tot.y) + '</div><div class="c2-sub">' + dl(tot.y, tot.y2, 'จากวันก่อน') + '</div></div>' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">7 วัน</div><div class="c2-val">' + I(tot.w) + '</div><div class="c2-sub c2-dim">เฉลี่ย ' + I(tot.w / 7) + ' คน/วัน</div></div>' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">ต้นทุนต่อทัก · 7 วัน</div><div class="c2-val">' + (tot.w ? B(tot.sw / tot.w) : '–') + '</div><div class="c2-sub c2-dim">ค่าแอด ' + K(tot.sw) + '</div></div>' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">ปิดได้ · 7 วัน</div><div class="c2-val">' + (tot.w ? (tot.bw / tot.w * 100).toFixed(1) + '%' : '–') + '</div><div class="c2-sub c2-dim">ซื้อ ' + I(tot.bw) + ' ครั้ง (ตาม FB)</div></div>' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">เพจ</div><div class="c2-val">' + I(rows.length) + '</div><div class="c2-sub c2-dim">' + I(rows.filter(function (r) { return r.t > 0; }).length) + ' เพจมีคนทักวันนี้</div></div></div>';
    h += '<div class="c2-card c2-pad"><div class="c2-h2row"><h2>รายเพจ</h2><span class="ai2-sort">เรียง: ' + [['prod', 'ตามสินค้า'], ['today', 'ทักวันนี้มากสุด'], ['week', 'ทัก 7 วันมากสุด'], ['cpc', 'ต้นทุน/ทักต่ำสุด']].map(function (x) { return '<button class="' + (CH.sort === x[0] ? 'on' : '') + '" onclick="aiV2.chat(\'sort\',\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</span></div>';
    h += '<div class="c2-scroll"><table class="c2-t"><thead><tr><th>สินค้า</th><th>เพจ</th><th class="r">วันนี้</th><th class="r">เมื่อวาน</th><th style="min-width:200px">7 วัน</th><th class="r">ต้นทุน/ทัก 7 วัน</th><th class="r">ปิดได้ 7 วัน</th><th>คนทักรายวัน (7 วัน)</th></tr></thead><tbody>';
    if (!rows.length) h += '<tr><td colspan="8" class="c2-dim">ไม่มีข้อมูล</td></tr>';
    var lastP = null;
    rows.forEach(function (r) {
      var cpc = r.w ? r.sw / r.w : 0, cl = r.w ? r.bw / r.w * 100 : 0, col = PAL[r.ci % PAL.length];
      var sp = W.slice().reverse().map(function (d) { return r.d[d] || 0; });
      var mx = Math.max.apply(null, sp.concat([1])), spark = '<svg class="c2-spark" viewBox="0 0 120 28" aria-hidden="true"><path d="' + sp.map(function (v, i) { return (i ? 'L' : 'M') + (i / 6 * 120).toFixed(1) + ' ' + (26 - v / mx * 24).toFixed(1); }).join('') + '" fill="none" stroke="' + col + '" stroke-width="2"/></svg>';
      var first = CH.sort === 'prod' && r.prod !== lastP; lastP = r.prod;
      h += '<tr' + (first ? ' class="ai2-grp"' : '') + '><td class="ai2-nw">' + (CH.sort !== 'prod' || first ? '<i class="c2-dot" style="background:' + col + '"></i><b>' + esc(r.prod) + '</b>' : '') + '</td><td>' + esc(r.page) + ' <span class="c2-dim">· ' + r.n + ' บัญชี</span></td>' +
        '<td class="r"><b>' + I(r.t) + '</b></td><td class="r">' + I(r.y) + '</td>' +
        '<td><div class="c2-share"><div><i style="width:' + (r.w / maxW * 100).toFixed(1) + '%;background:' + col + '"></i></div><span>' + I(r.w) + ' <span class="c2-dim">· ' + I(r.w / 7) + '/วัน</span></span></div></td>' +
        '<td class="r">' + (r.w ? B(cpc) : '<span class="c2-dim">–</span>') + '</td><td class="r ' + (r.w && cl >= 25 ? 'c2-good' : r.w && cl < 15 ? 'c2-bad' : '') + '">' + (r.w ? cl.toFixed(1) + '%' : '<span class="c2-dim">–</span>') + '</td><td>' + spark + '</td></tr>';
    });
    h += '</tbody></table></div><div class="c2-note">ปิดได้ = ซื้อ ÷ คนทัก ตามที่ Facebook นับ (หลังบ้านอาจต่างกัน) · สีเขียว ≥ 25% · สีแดง &lt; 15%' + (lock ? ' · บัญชีนี้ดูได้เฉพาะทีม ' + esc(lock) : '') + '</div></div></div>';
    box.innerHTML = h;
  }

  /* ================= BenchMark มาตรวัดแอด + ชาร์ตอันดับ ================= */
  var PER = [['today', 'วันนี้'], ['y', 'เมื่อวาน'], ['3', '3 วัน'], ['7', '7 วัน'], ['14', '14 วัน'], ['30', '30 วัน']];
  var BM = { mode: 'msg', per: '7', p: -1, tier: '', q: '' }, CR = { per: '7', p: -1, by: 'acc', m: 'roas', dir: 'top', n: 20 };
  try { var b0 = JSON.parse(localStorage.getItem('rb_bm_v2') || 'null'); if (b0) { BM.mode = b0.mode || 'msg'; BM.per = b0.per || '7'; BM.p = b0.p == null ? -1 : b0.p; } } catch (e) {}
  try { var c0 = JSON.parse(localStorage.getItem('rb_cr_v2') || 'null'); if (c0) Object.keys(c0).forEach(function (k) { CR[k] = c0[k]; }); } catch (e) {}
  function perLbl(k) { return (PER.filter(function (x) { return x[0] === k; })[0] || ['', ''])[1]; }
  function segPer(cur, fn) { return '<div class="c2-seg" role="group" aria-label="ช่วงเวลา">' + PER.map(function (x) { return '<button class="' + (cur === x[0] ? 'on' : '') + '" onclick="aiV2.' + fn + '(\'per\',\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div>'; }
  function prodTabs(cur, fn) { return '<div class="c2-tabs"><button class="' + (cur < 0 ? 'on' : '') + '" onclick="aiV2.' + fn + '(\'p\',-1)">ทุกสินค้า</button>' + prods().map(function (p, i) { var on = cur === i; return '<button class="' + (on ? 'on' : '') + '" onclick="aiV2.' + fn + '(\'p\',' + i + ')"><i style="background:' + (on ? '#fff' : PAL[i % PAL.length]) + '"></i>' + esc(p.product) + '</button>'; }).join('') + '</div>'; }
  function accList(pi) { return pi >= 0 && prods()[pi] ? accsOf(prods()[pi]) : allAccs(); }
  function prodOf(acc) { var r = ''; prods().forEach(function (p) { if (!r && accsOf(p).indexOf(acc) >= 0) r = p.product; }); return r; }
  function median(a) { a = a.filter(function (v) { return v > 0 && isFinite(v); }).sort(function (x, y) { return x - y; }); if (!a.length) return 0; var m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  function grp(accs, per, keyFn) {
    var m = {};
    accs.forEach(function (acc) { ((window.fbDataMap || {})[acc] || []).forEach(function (r) {
      if (!r.date || !inP(r.date, per)) return;
      var k = keyFn(acc, r); if (k == null) return;
      var x = m[k.id] || (m[k.id] = Object.assign(blank(), k));
      addRow(x, r);
    }); });
    return Object.keys(m).map(function (k) { var x = fin(m[k]); x.ctr = x.imp ? x.clk / x.imp * 100 : 0; x.cpm = x.imp ? x.spend / x.imp * 1000 : 0; return x; }).filter(function (x) { return x.spend > 0 || x.chat > 0; });
  }
  function cmpCls(v, med, lowGood) { if (!v || !med) return ''; var r = v / med; if (lowGood) r = 1 / r; return r >= 1.15 ? 'c2-good' : r <= 0.85 ? 'c2-bad' : ''; }

  function renderBench() {
    var el = document.getElementById('benchmarkViewInner'); if (!el) return;
    if (!window.FB_HIERARCHY || !window.fbDataMap) { el.innerHTML = '<div class="c2-wrap ai2"><div class="c2-card c2-empty">กำลังโหลดข้อมูล…</div></div>'; return; }
    loadAll();
    var msg = BM.mode === 'msg';
    var list = grp(accList(BM.p), BM.per, function (acc, r) { var n = r.adset || r.campaign || '(ไม่มีชื่อ)'; return { id: acc + '|' + n, name: n, camp: r.campaign || '', acc: acc }; });
    list.forEach(function (a) {
      if (msg) a.tier = a.chat && a.cpc <= 50 ? 'top' : a.chat && a.cpc <= 100 ? 'mid' : 'low';
      else a.tier = (a.roas >= 2 || (a.buy >= 2 && a.rev > 0 && a.cpa <= 200)) ? 'top' : a.roas >= 1 ? 'mid' : 'low';
    });
    var big = list.filter(function (a) { return a.spend >= 100; });
    var MED = { cpc: median(big.map(function (a) { return a.cpc; })), cpa: median(big.filter(function (a) { return a.rev > 0; }).map(function (a) { return a.cpa; })), ctr: median(big.map(function (a) { return a.ctr; })), cpm: median(big.map(function (a) { return a.cpm; })), roas: median(big.filter(function (a) { return a.rev > 0; }).map(function (a) { return a.roas; })) };
    var tot = blank(); list.forEach(function (a) { tot.spend += a.spend; });
    var T = { top: { n: 0, s: 0 }, mid: { n: 0, s: 0 }, low: { n: 0, s: 0 } }; list.forEach(function (a) { T[a.tier].n++; T[a.tier].s += a.spend; });
    var DESC = msg ? { top: 'ต้นทุน/ทัก ≤ ฿50', mid: 'ต้นทุน/ทัก ฿51–100', low: 'ต้นทุน/ทัก > ฿100 หรือไม่มีคนทัก' } : { top: 'ROAS ≥ 2 หรือ ต้นทุน/ซื้อ ≤ ฿200', mid: 'ROAS 1–2', low: 'ROAS < 1' };
    var rows = list.slice();
    if (BM.tier) rows = rows.filter(function (a) { return a.tier === BM.tier; });
    if (BM.q) { var q = BM.q.toLowerCase(); rows = rows.filter(function (a) { return (a.name + ' ' + a.camp + ' ' + a.acc).toLowerCase().indexOf(q) >= 0; }); }
    rows.sort(function (a, b) { return b.spend - a.spend; });
    var top10 = list.slice().sort(function (a, b) { return b.spend - a.spend; }).slice(0, 10), mx = top10.length ? top10[0].spend : 1;
    var TC = { top: '#16A34A', mid: '#F59E0B', low: '#EF4444' };
    var h = '<div class="c2-wrap ai2">';
    h += '<div class="c2-head"><div><h1>BenchMark มาตรวัดแอด</h1><div class="c2-subhead">เทียบทุกชุดโฆษณากับค่ากลางของกลุ่ม · ' + perLbl(BM.per) + (BM.per === 'today' ? ' (ถึงตอนนี้)' : BM.per === 'y' ? '' : ' ถึงเมื่อวาน') + '</div></div>' + segPer(BM.per, 'bm') + '</div>';
    h += prodTabs(BM.p, 'bm');
    h += '<div class="ai2-chips"><span class="c2-dim">วัดผลแบบ:</span><button class="ai2-chip' + (msg ? ' on' : '') + '" onclick="aiV2.bm(\'mode\',\'msg\')">ต้นทุนต่อทัก</button><button class="ai2-chip' + (!msg ? ' on' : '') + '" onclick="aiV2.bm(\'mode\',\'buy\')">ยอดขาย (ROAS / ต้นทุนต่อซื้อ)</button></div>';
    h += '<div class="c2-kpis">' + [['top', 'ดี'], ['mid', 'กลาง'], ['low', 'ต่ำ']].map(function (x) { var t = T[x[0]]; return '<button class="c2-card c2-kpi ai2-tier ' + x[0] + (BM.tier === x[0] ? ' on' : '') + '" onclick="aiV2.bm(\'tier\',\'' + (BM.tier === x[0] ? '' : x[0]) + '\')"><div class="c2-lbl"><i class="c2-dot" style="background:' + TC[x[0]] + '"></i>กลุ่ม' + x[1] + '</div><div class="c2-val">' + I(t.n) + ' <small>ชุดโฆษณา</small></div><div class="c2-sub c2-dim">' + DESC[x[0]] + '</div><div class="c2-sub">ใช้งบ ' + K(t.s) + ' · ' + (tot.spend ? Math.round(t.s / tot.spend * 100) : 0) + '%</div></button>'; }).join('') + '</div>';
    h += '<div class="c2-grid"><div class="c2-card c2-pad"><h2>ค่ากลาง (มาตรฐานของกลุ่มนี้)</h2><div class="c2-note">ค่ากลางของชุดโฆษณาที่ใช้งบ ≥ ฿100 · ใช้เทียบในตาราง: เขียว = ดีกว่าค่ากลาง 15% ขึ้นไป แดง = แย่กว่า</div><div class="ai2-meds">' +
      [['ต้นทุน/ทัก', MED.cpc ? B(MED.cpc) : '–'], ['ต้นทุน/ซื้อ', MED.cpa ? B(MED.cpa) : '–'], ['ROAS', MED.roas ? MED.roas.toFixed(2) : '–'], ['CTR', MED.ctr ? MED.ctr.toFixed(2) + '%' : '–'], ['CPM', MED.cpm ? B(MED.cpm) : '–']].map(function (x) { return '<div><small>' + x[0] + '</small><b>' + x[1] + '</b></div>'; }).join('') + '</div></div>';
    h += '<div class="c2-card c2-pad"><h2>10 ชุดที่ใช้งบสูงสุด</h2><div class="ai2-bars">' + (top10.length ? top10.map(function (a) { return '<div title="' + esc(a.name) + '"><span>' + esc(a.name) + '</span><div><i style="width:' + (a.spend / mx * 100).toFixed(1) + '%;background:' + TC[a.tier] + '"></i></div><em>' + K(a.spend) + ' · ' + (tot.spend ? (a.spend / tot.spend * 100).toFixed(0) : 0) + '%</em></div>'; }).join('') : '<span class="c2-dim">ไม่มีข้อมูล</span>') + '</div></div></div>';
    h += '<div class="c2-card c2-pad"><div class="c2-h2row"><h2>ชุดโฆษณา (' + I(rows.length) + ')' + (BM.tier ? ' · กลุ่ม' + { top: 'ดี', mid: 'กลาง', low: 'ต่ำ' }[BM.tier] + ' <button class="c2-link ai2-x" onclick="aiV2.bm(\'tier\',\'\')">ดูทั้งหมด ✕</button>' : '') + '</h2><input class="ai2-q" type="search" placeholder="ค้นหาชุดโฆษณา / แคมเปญ / บัญชี" value="' + esc(BM.q) + '" oninput="aiV2.bmq(this.value)"></div>';
    h += '<div class="c2-scroll"><table class="c2-t ai2-t"><thead><tr><th>ชุดโฆษณา</th><th class="r">ค่าแอด</th><th class="r">คนทัก</th><th class="r">ต้นทุน/ทัก</th><th class="r">ซื้อ</th><th class="r">ต้นทุน/ซื้อ</th><th class="r">ROAS</th><th class="r">CTR</th><th class="r">CPM</th><th>กลุ่ม</th></tr></thead><tbody>';
    rows.slice(0, 300).forEach(function (a) {
      h += '<tr><td class="ai2-name"><div title="' + esc(a.name) + '">' + esc(a.name) + '</div><span class="c2-dim ai2-sm">' + esc(prodOf(a.acc)) + ' · ' + esc(dispOf(a.acc)) + '</span></td>' +
        '<td class="r">' + B(a.spend) + '</td><td class="r">' + I(a.chat) + '</td><td class="r ' + cmpCls(a.cpc, MED.cpc, 1) + '">' + (a.chat ? B(a.cpc) : '–') + '</td>' +
        '<td class="r">' + I(a.buy) + '</td><td class="r ' + (a.rev ? cmpCls(a.cpa, MED.cpa, 1) : '') + '">' + (a.buy ? B(a.cpa) : '–') + '</td><td class="r">' + pill(a.roas, a.spend > 0 && a.rev > 0) + '</td>' +
        '<td class="r ' + cmpCls(a.ctr, MED.ctr) + '">' + (a.imp ? a.ctr.toFixed(2) + '%' : '–') + '</td><td class="r ' + cmpCls(a.cpm, MED.cpm, 1) + '">' + (a.imp ? B(a.cpm) : '–') + '</td>' +
        '<td><span class="ai2-tag ' + { top: 'up', mid: 'down', low: 'close' }[a.tier] + '">' + { top: 'ดี', mid: 'กลาง', low: 'ต่ำ' }[a.tier] + '</span></td></tr>';
    });
    if (!rows.length) h += '<tr><td colspan="10" class="c2-dim">ไม่มีชุดโฆษณาในช่วงนี้</td></tr>';
    h += '</tbody></table></div>' + (rows.length > 300 ? '<div class="c2-note">แสดง 300 จาก ' + I(rows.length) + ' ชุด — ใช้ช่องค้นหาหรือเลือกสินค้า</div>' : '') + '<div class="c2-note">ตัวเลขจาก Facebook · หน่วยเงินเป็นบาท</div></div></div>';
    el.innerHTML = h;
    var qi = el.querySelector('.ai2-q'); if (qi && BM._focus) { qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); BM._focus = false; }
  }

  var CRM = [['roas', 'ROAS', function (x) { return x.roas; }], ['spend', 'ค่าแอด', function (x) { return x.spend; }], ['rev', 'ยอดขาย (FB)', function (x) { return x.rev; }], ['buy', 'ซื้อ', function (x) { return x.buy; }], ['chat', 'คนทัก', function (x) { return x.chat; }], ['cpa', 'ต้นทุน/ซื้อ', function (x) { return x.cpa; }], ['cpc', 'ต้นทุน/ทัก', function (x) { return x.cpc; }], ['ctr', 'CTR', function (x) { return x.ctr; }]];
  var LOWGOOD = { cpa: 1, cpc: 1 };
  function fmtM(k, v) { return k === 'roas' ? v.toFixed(2) : k === 'ctr' ? v.toFixed(2) + '%' : (k === 'buy' || k === 'chat') ? I(v) : B(v); }
  function renderRank(el) {
    el = el || document.getElementById('chartrankView'); if (!el) return;
    if (!window.FB_HIERARCHY || !window.fbDataMap) { el.innerHTML = '<div class="c2-wrap ai2"><div class="c2-card c2-empty">กำลังโหลดข้อมูล…</div></div>'; return; }
    loadAll();
    var BY = [['prod', 'สินค้า'], ['page', 'เพจ'], ['acc', 'บัญชีโฆษณา'], ['camp', 'แคมเปญ'], ['adset', 'ชุดโฆษณา']];
    var pageMap = {}; prods().forEach(function (p) { (p.pages || []).forEach(function (pg) { (pg.accounts || []).forEach(function (hh) { (hh.adAccounts || []).forEach(function (a) { if (!pageMap[a]) pageMap[a] = { pg: pg.name, p: p.product }; }); }); }); });
    var list = grp(accList(CR.p), CR.per, function (acc, r) {
      var pm = pageMap[acc] || { pg: '', p: '' };
      if (CR.by === 'prod') return { id: pm.p, name: pm.p, sub: '' };
      if (CR.by === 'page') return { id: pm.p + '|' + pm.pg, name: pm.pg, sub: pm.p };
      if (CR.by === 'acc') return { id: acc, name: dispOf(acc), sub: pm.p + ' · ' + pm.pg };
      if (CR.by === 'camp') return { id: acc + '|' + r.campaign, name: r.campaign || '(ไม่มีชื่อ)', sub: pm.p + ' · ' + dispOf(acc) };
      return { id: acc + '|' + (r.adset || r.campaign), name: r.adset || r.campaign || '(ไม่มีชื่อ)', sub: pm.p + ' · ' + dispOf(acc) };
    });
    var M = CRM.filter(function (x) { return x[0] === CR.m; })[0] || CRM[0], f = M[2], low = !!LOWGOOD[CR.m];
    var minSp = CR.by === 'prod' || CR.by === 'page' ? 0 : (CR.per === 'today' || CR.per === 'y' ? 100 : 300);
    var cand = list.filter(function (x) {
      if (CR.m === 'roas') return x.spend >= minSp && x.rev > 0;
      if (CR.m === 'cpa') return x.buy > 0 && x.spend >= minSp;
      if (CR.m === 'cpc') return x.chat > 0 && x.spend >= minSp;
      if (CR.m === 'ctr') return x.imp > 0 && x.spend >= minSp;
      return true;
    });
    var best = CR.dir === 'top';
    cand.sort(function (a, b) { var d = f(b) - f(a); if (low) d = -d; return best ? d : -d; });
    var shown = cand.slice(0, CR.n), mx = shown.reduce(function (m, x) { return Math.max(m, f(x)); }, 0) || 1;
    var h = '<div class="c2-wrap ai2">';
    h += '<div class="c2-head"><div><h1>ชาร์ตอันดับ</h1><div class="c2-subhead">จัดอันดับ' + (BY.filter(function (x) { return x[0] === CR.by; })[0] || BY[0])[1] + 'ตาม ' + M[1] + ' · ' + (best ? 'ดีที่สุด' : 'แย่ที่สุด') + ' ' + CR.n + ' อันดับ · ' + perLbl(CR.per) + '</div></div>' + segPer(CR.per, 'cr') + '</div>';
    h += prodTabs(CR.p, 'cr');
    h += '<div class="c2-card c2-pad ai2-ctl">' +
      '<div><small>จัดอันดับ</small><div class="ai2-chips">' + BY.map(function (x) { return '<button class="ai2-chip' + (CR.by === x[0] ? ' on' : '') + '" onclick="aiV2.cr(\'by\',\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div></div>' +
      '<div><small>วัดจาก</small><div class="ai2-chips">' + CRM.map(function (x) { return '<button class="ai2-chip' + (CR.m === x[0] ? ' on' : '') + '" onclick="aiV2.cr(\'m\',\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="ai2-ctlrow"><div><small>แสดง</small><div class="c2-seg">' + [['top', 'ดีที่สุด'], ['bottom', 'แย่ที่สุด']].map(function (x) { return '<button class="' + (CR.dir === x[0] ? 'on' : '') + '" onclick="aiV2.cr(\'dir\',\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div></div>' +
      '<div><small>จำนวน</small><div class="c2-seg">' + [5, 10, 20, 50].map(function (n) { return '<button class="' + (CR.n === n ? 'on' : '') + '" onclick="aiV2.cr(\'n\',' + n + ')">' + n + '</button>'; }).join('') + '</div></div></div></div>';
    h += '<div class="c2-card c2-pad"><div class="c2-scroll"><table class="c2-t ai2-t ai2-rank"><thead><tr><th class="r">#</th><th>' + esc((BY.filter(function (x) { return x[0] === CR.by; })[0] || BY[0])[1]) + '</th><th style="min-width:200px">' + esc(M[1]) + '</th>' +
      CRM.filter(function (x) { return x[0] !== CR.m; }).map(function (x) { return '<th class="r">' + x[1] + '</th>'; }).join('') + '</tr></thead><tbody>';
    shown.forEach(function (x, i) {
      var v = f(x), w = low ? (v ? Math.min(100, (shown.reduce(function (m, y) { return Math.min(m, f(y) || 1e9); }, 1e9) / v) * 100) : 0) : v / mx * 100;
      h += '<tr><td class="r"><b class="ai2-rk' + (i < 3 ? ' t' + (i + 1) : '') + '">' + (i + 1) + '</b></td><td class="ai2-name"><div title="' + esc(x.name) + '">' + esc(x.name) + '</div>' + (x.sub ? '<span class="c2-dim ai2-sm">' + esc(x.sub) + '</span>' : '') + '</td>' +
        '<td><div class="c2-share"><div><i style="width:' + w.toFixed(1) + '%;background:' + (best ? '#2563EB' : '#EF4444') + '"></i></div><span><b>' + fmtM(CR.m, v) + '</b></span></div></td>' +
        CRM.filter(function (y) { return y[0] !== CR.m; }).map(function (y) { var vv = y[2](x); return '<td class="r">' + (y[0] === 'roas' ? pill(vv, x.spend > 0 && x.rev > 0) : (vv || y[0] === 'buy' || y[0] === 'chat' ? fmtM(y[0], vv) : '<span class="c2-dim">–</span>')) + '</td>'; }).join('') + '</tr>';
    });
    if (!shown.length) h += '<tr><td colspan="10" class="c2-dim">ยังไม่มีข้อมูลในช่วงนี้</td></tr>';
    h += '</tbody></table></div><div class="c2-note">' + (minSp ? 'จัดอันดับ ROAS / ต้นทุน / CTR เฉพาะรายการที่ใช้งบ ≥ ' + B(minSp) + ' เพื่อตัดตัวที่ข้อมูลน้อย · ' : '') + 'ตัวเลขจาก Facebook · ทั้งหมด ' + I(cand.length) + ' รายการ</div></div></div>';
    el.innerHTML = h;
  }

  function css() {
    if (document.getElementById('ai2css')) return;
    var s = document.createElement('style'); s.id = 'ai2css';
    // ใช้ id ซ้ำ 2 ครั้งเพื่อให้ชนะกฎของ v2-skin.js ที่คลุมหน้าเดิม
    function sc(x) { return x.split(',').map(function (y) { return ['adsaiView', 'aiView', 'chatPageView', 'benchmarkView', 'chartrankView'].map(function (v) { return '#' + v + '#' + v + ' .ai2 ' + y; }).join(','); }).join(','); }
    s.textContent = [
      '#adsaiView#adsaiView,#aiView#aiView,#chartrankView#chartrankView,#chatPageView#chatPageView,#chatPageView#chatPageView .page,#benchmarkView#benchmarkView,#benchmarkView#benchmarkView .page{padding:0!important;background:#F5F6FA!important;max-width:none!important}',
      sc('button') + '{border-radius:10px!important}',
      sc('.c2-tabs button') + '{border-radius:99px!important}', sc('.c2-seg button') + '{border-radius:7px!important}',
      sc('.c2-link,.ai2-acc') + '{border-radius:0!important}', sc('.ai2-chip') + '{border-radius:99px!important}',
      '.ai2-btn{height:38px;padding:0 16px;border:1px solid #D7DBE3;background:#fff;color:#0F172A;font:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}.ai2-btn.pri{background:#2563EB!important;border-color:#2563EB!important;color:#fff!important}.ai2-btn:disabled{opacity:.6}',
      '.ai2-banner{display:flex;flex-direction:column;gap:2px;padding:11px 14px;border-radius:10px;border:1px solid;font-size:13px}.ai2-banner b{font-weight:600}.ai2-banner span{color:#475569}',
      '.ai2-banner.good{background:#F0FDF4;border-color:#BBF7D0}.ai2-banner.good b{color:#15803D}.ai2-banner.warn{background:#FFFBEB;border-color:#FDE68A}.ai2-banner.warn b{color:#B45309}.ai2-banner.bad{background:#FEF2F2;border-color:#FECACA}.ai2-banner.bad b{color:#B91C1C}.ai2-banner.info{background:#EFF6FF;border-color:#BFDBFE}.ai2-banner.info b{color:#1D4ED8}',
      '.ai2-ins{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}',
      '.ai2-q{height:38px;min-width:240px;padding:0 12px;border:1px solid #D7DBE3;border-radius:8px;font:inherit;font-size:13px}',
      '.ai2-chips{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.ai2-chip{height:34px;padding:0 12px;border:1px solid #E5E7EB;background:#fff;font:inherit;font-size:13px;cursor:pointer;color:#0F172A}.ai2-chip b{margin-left:4px;font-weight:700}',
      '.ai2-chip.up b{color:#15803D}.ai2-chip.down b{color:#B45309}.ai2-chip.close b{color:#B91C1C}.ai2-chip.on{background:#0F172A!important;border-color:#0F172A!important;color:#fff!important}.ai2-chip.on b{color:#fff}',
      '.ai2-sort{margin-left:auto;display:flex;gap:4px;align-items:center;font-size:12px;color:#64748B;flex-wrap:wrap}.ai2-sort button{height:30px;padding:0 10px;border:0;background:transparent;font:inherit;font-size:12px;color:#475569;cursor:pointer}.ai2-sort button.on{background:#E9EDF4;color:#0F172A;font-weight:600}',
      '.ai2-t{min-width:1080px}.ai2-name{max-width:340px}.ai2-name div{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ai2-acc{border:0;background:none;padding:0;margin-top:3px;font:inherit;font-size:12px;color:#1D4ED8;cursor:pointer}.ai2-acc:hover{text-decoration:underline}.ai2-nw{white-space:nowrap}.ai2-x{font-size:12px;margin-left:8px}',
      '.ai2-t tr.ai2-close td{background:#FEF7F7}.ai2-tag{display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;white-space:nowrap}.ai2-tag.up{background:#DCFCE7;color:#15803D}.ai2-tag.keep{background:#EEF2F7;color:#334155}.ai2-tag.down{background:#FEF3C7;color:#B45309}.ai2-tag.close{background:#FEE2E2;color:#B91C1C}.ai2-tag.none{background:#F1F5F9;color:#64748B}',
      '.ai2-form{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}.ai2-form label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#475569;font-weight:600;flex:1;min-width:140px}.ai2-form small{font-weight:400;color:#94A3B8}.ai2-form input{height:40px;padding:0 10px;border:1px solid #D7DBE3;border-radius:8px;font:inherit;font-size:14px}',
      '.ai2-prod{overflow:hidden}.ai2-ph{display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:16px 20px;border-bottom:1px solid #EEF1F6}.ai2-pn{display:flex;align-items:center;gap:4px;flex:1;min-width:220px}.ai2-pn b{font-size:15px}.ai2-pn .c2-dim{font-size:12px;margin-top:2px}',
      '.ai2-pm{display:flex;gap:22px;flex-wrap:wrap}.ai2-pm div{display:flex;flex-direction:column;gap:2px;align-items:flex-end}.ai2-pm small{font-size:11px;color:#64748B}.ai2-pm b{font-size:14px}',
      '.ai2-res{padding:16px 20px;display:flex;flex-direction:column;gap:16px;font-size:13px}.ai2-res h3{margin:0 0 8px;font-size:14px;font-weight:700}',
      '.ai2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}@media (max-width:1000px){.ai2-grid{grid-template-columns:minmax(0,1fr)}}.ai2-small{min-width:520px}.ai2-recs{display:flex;flex-direction:column;gap:8px}',
      '.ai2-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;counter-reset:n}.ai2-list li{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #EEF1F6;border-radius:8px;counter-increment:n}.ai2-list li:before{content:counter(n);width:20px;color:#64748B;font-weight:600}',
      '.ai2-list li span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}.ai2-list small{display:block;font-weight:400;color:#64748B;font-size:11px;overflow:hidden;text-overflow:ellipsis}.ai2-list em{font-style:normal;color:#475569;font-size:12px;white-space:nowrap}.ai2-list.bad li{border-color:#FEE2E2}.ai2-list li span.c2-pill{flex:none;overflow:visible}',
      '.ai2-comp{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px}.ai2-compres:empty{display:none}',
      '.ai2-grp td{border-top:1px solid #E5E7EB}.ai2-sm{font-size:12px}',
      '.ai2-tier{text-align:left;font:inherit;cursor:pointer;color:inherit}.ai2-tier.on{outline:2px solid #2563EB;outline-offset:-1px}',
      '.ai2-meds{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px}.ai2-meds div{background:#F8FAFC;border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}.ai2-meds small{font-size:12px;color:#64748B}.ai2-meds b{font-size:20px}',
      '.ai2-bars{display:flex;flex-direction:column;gap:7px}.ai2-bars>div{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) 108px;gap:10px;align-items:center;font-size:12px}.ai2-bars span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ai2-bars>div>div{height:8px;background:#EEF1F6;border-radius:99px;overflow:hidden}.ai2-bars i{display:block;height:100%;border-radius:99px}.ai2-bars em{font-style:normal;text-align:right;color:#475569;white-space:nowrap}',
      '.ai2-ctl{gap:14px}.ai2-ctl small{display:block;font-size:12px;color:#64748B;margin-bottom:6px}.ai2-ctlrow{display:flex;flex-wrap:wrap;gap:24px}',
      '.ai2-rk{display:inline-flex;width:26px;height:26px;border-radius:99px;align-items:center;justify-content:center;background:#F1F5F9;color:#475569;font-size:12px}.ai2-rk.t1{background:#FEF3C7;color:#92400E}.ai2-rk.t2{background:#E2E8F0;color:#334155}.ai2-rk.t3{background:#FFEDD5;color:#9A3412}.ai2-rank{min-width:1000px}',
      '@media (max-width:640px){.ai2-q{min-width:0;width:100%}.ai2-sort{margin-left:0}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function install() {
    if (typeof window._renderAdsAI !== 'function' || typeof window._renderAIContent !== 'function' || !window.FB_HIERARCHY) return setTimeout(install, 400);
    css();
    window._renderAdsAI = function (el) { try { renderAds(el); } catch (e) { var v = el || document.getElementById('adsaiView'); if (v) v.innerHTML = '<div class="c2-wrap ai2"><div class="ai2-banner bad"><b>หน้านี้แสดงไม่ได้</b><span>' + esc(e.message) + '</span></div></div>'; } };
    window._renderAIContent = function (el) { try { renderContent(el); } catch (e) { var v = el || document.getElementById('aiView'); if (v) v.innerHTML = '<div class="c2-wrap ai2"><div class="ai2-banner bad"><b>หน้านี้แสดงไม่ได้</b><span>' + esc(e.message) + '</span></div></div>'; } };
    window._aiAnalyzeProduct = function (i, btn) { analyze(i, btn); };
    function safe(fn, id) { return function (el) { try { fn(el); } catch (e) { var b = (el && el.nodeType ? el : null) || document.getElementById(id); if (b) b.innerHTML = '<div class="c2-wrap ai2"><div class="ai2-banner bad"><b>หน้านี้แสดงไม่ได้</b><span>' + esc(e.message) + '</span></div></div>'; } }; }
    window.chatPageRender = safe(function () { renderChat(); }, 'chatPageInner');
    window.renderBenchmark = safe(function () { renderBench(); }, 'benchmarkViewInner');
    window._renderChartRank = safe(renderRank, 'chartrankView');
    [['chatPageView', window.chatPageRender], ['benchmarkView', window.renderBenchmark], ['chartrankView', window._renderChartRank]].forEach(function (x) { var v = document.getElementById(x[0]); if (v && v.style.display !== 'none' && v.offsetParent) x[1](); });
    ['adsaiView', 'aiView'].forEach(function (id) { var v = document.getElementById(id); if (v && v.style.display !== 'none' && v.offsetParent) (id === 'adsaiView' ? window._renderAdsAI : window._renderAIContent)(v); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
