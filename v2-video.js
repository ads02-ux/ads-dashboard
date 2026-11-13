/* v2-video.js — หน้า "วิเคราะห์วีดีโอ" แบบใหม่ (แทน vaiLoad เดิม)
   ดึงข้อมูลระดับโฆษณาจาก Facebook ตามสินค้าที่เลือก · เทียบอัตราฮุก/อัตราซื้อกับค่ากลางของกลุ่มที่เลือก */
(function () {
  'use strict';
  var PAL = ['#2563EB', '#0EA5E9', '#6366F1', '#14B8A6', '#8B5CF6', '#0891B2', '#F59E0B', '#EC4899', '#10B981', '#64748B', '#EF4444', '#84CC16', '#A855F7', '#06B6D4'];
  var PER = [['today', 'วันนี้'], ['last_3d', '3 วัน'], ['last_7d', '7 วัน'], ['last_14d', '14 วัน'], ['last_30d', '30 วัน'], ['last_90d', '90 วัน']];
  var QD = {
    scale: { l: 'ขยายผล', d: 'ฮุกดี + ขายดี → เพิ่มงบ / รุมยิง', c: '#16A34A', t: 'up' },
    cta: { l: 'แก้ CTA', d: 'คนหยุดดูเยอะ แต่ขายน้อย → ปรับท้ายคลิป / ข้อเสนอ', c: '#F59E0B', t: 'down' },
    hook: { l: 'แก้ฮุก', d: 'ขายได้ แต่คนหยุดดูน้อย → เปลี่ยน 3 วิแรก', c: '#2563EB', t: 'keep' },
    close: { l: 'พิจารณาปิด', d: 'อ่อนทั้งฮุกและการขาย', c: '#EF4444', t: 'close' }
  };
  var S = { per: 'last_30d', p: -1, q: '', quad: '', ms: 1000, mi: 1000, low: false, sort: 'score' }, CACHE = {}, LOAD = {};
  try { var sv = JSON.parse(localStorage.getItem('rb_vai_v2') || 'null'); if (sv) { S.per = sv.per || S.per; S.p = sv.p == null ? -1 : sv.p; S.ms = sv.ms == null ? 1000 : sv.ms; S.mi = sv.mi == null ? 1000 : sv.mi; S.sort = sv.sort || 'score'; } } catch (e) {}

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function B(n) { return '฿' + Math.round(n || 0).toLocaleString('en-US'); }
  function K(n) { n = n || 0; return Math.abs(n) >= 1e6 ? '฿' + (n / 1e6).toFixed(2) + 'M' : (Math.abs(n) >= 1e3 ? '฿' + (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : '฿' + Math.round(n)); }
  function I(n) { return Math.round(n || 0).toLocaleString('en-US'); }
  function P(n) { return (n * 100).toFixed(1) + '%'; }
  function prods() { return window.FB_HIERARCHY || []; }
  function accInfo() { var m = {}; prods().forEach(function (p, pi) { (p.pages || []).forEach(function (pg) { (pg.accounts || []).forEach(function (h) { (h.adAccounts || []).forEach(function (a) { if (!m[a]) m[a] = { pi: pi, prod: p.product, page: pg.name, disp: h.displayName || a }; }); }); }); }); return m; }
  function accsOf(pi) { var info = accInfo(); return Object.keys(info).filter(function (a) { return pi < 0 || info[a].pi === pi; }); }
  function med(a) { a = a.filter(function (v) { return v > 0 && isFinite(v); }).sort(function (x, y) { return x - y; }); if (!a.length) return 0; var m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  function act(arr, types) { for (var i = 0; i < types.length; i++) { var x = (arr || []).filter(function (y) { return y.action_type === types[i]; })[0]; if (x && num(x.value) > 0) return num(x.value); } return 0; }
  var BUY = ['purchase', 'omni_purchase', 'onsite_conversion.purchase', 'offsite_conversion.fb_pixel_purchase'];

  /* ---------- ดึงข้อมูล ---------- */
  function key() { return S.p + '|' + S.per; }
  function getJSON(u) { return fetch(u).then(function (r) { return r.json(); }); }
  function pages(u, out) { return getJSON(u).then(function (j) { (j.data || []).forEach(function (x) { out.push(x); }); if (j.paging && j.paging.next && out.length < 2000) return pages(j.paging.next, out); return out; }); }
  function load() {
    var k = key(); if (CACHE[k] || LOAD[k]) return;
    var info = accInfo(), accs = accsOf(S.p), meta = window.FB_ACCOUNTS_META || [], L = LOAD[k] = { done: 0, total: accs.length, rows: [] }, q = accs.slice();
    var f = 'ad_id,ad_name,campaign_name,spend,impressions,reach,actions,action_values,video_play_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_thruplay_watched_actions';
    function one() {
      var acc = q.shift(); if (!acc) return Promise.resolve();
      var mm = meta.filter(function (x) { return x.name === acc || x.configKey === 'FB_GID_' + acc; })[0], tok = (window.FB_TOKENS || {})[acc] || window.FB_TOKEN;
      if (!mm || !mm.id) { L.done++; return one(); }
      var ins = [], ads = [];
      return pages(window.FB_API + mm.id + '/insights?level=ad&fields=' + f + '&date_preset=' + S.per + '&limit=300&access_token=' + tok, ins).then(function () {
        if (!ins.length) return;
        return pages(window.FB_API + mm.id + '/ads?fields=id,created_time,creative{thumbnail_url,video_id,effective_object_story_id}&limit=300&effective_status=' + encodeURIComponent('["ACTIVE","PAUSED","CAMPAIGN_PAUSED","ADSET_PAUSED","DISAPPROVED","WITH_ISSUES"]') + '&access_token=' + tok, ads);
      }).then(function () {
        var cm = {}; ads.forEach(function (a) { cm[a.id] = a; });
        ins.forEach(function (r) {
          var cr = (cm[r.ad_id] || {}).creative || {}, v3 = act(r.video_play_actions, ['video_view']);
          if (!v3) return;
          var ai = info[acc] || {}, created = (cm[r.ad_id] || {}).created_time;
          L.rows.push({ id: r.ad_id, name: r.ad_name || '', camp: r.campaign_name || '', acc: acc, pi: ai.pi, prod: ai.prod || '', page: ai.page || '', disp: ai.disp || acc,
            spend: num(r.spend), imp: num(r.impressions), reach: num(r.reach), v3: v3,
            p25: act(r.video_p25_watched_actions, ['video_view']), p50: act(r.video_p50_watched_actions, ['video_view']), p75: act(r.video_p75_watched_actions, ['video_view']), p95: act(r.video_p95_watched_actions, ['video_view']),
            buy: act(r.actions, BUY), rev: act(r.action_values, BUY), chat: act(r.actions, ['onsite_conversion.messaging_conversation_started_7d']),
            thumb: cr.thumbnail_url || '', vid: cr.video_id || '', story: cr.effective_object_story_id || '',
            days: created ? Math.max(0, Math.floor((Date.now() - new Date(created).getTime()) / 86400000)) : 0 });
        });
      }).catch(function () {}).then(function () { L.done++; if (L.done % 8 === 0 || L.done === L.total) render(); return one(); });
    }
    var n = Math.min(6, Math.max(1, q.length)), ps = []; for (var i = 0; i < n; i++) ps.push(one());
    Promise.all(ps).then(function () { CACHE[k] = L.rows; delete LOAD[k]; render(); });
  }

  /* ---------- คำนวณ ---------- */
  function calc(rows) {
    var list = rows.filter(function (d) { return S.low || (d.spend >= S.ms && d.imp >= S.mi); });
    list.forEach(function (d) { d.hook = d.imp ? d.v3 / d.imp : 0; d.conv = d.imp ? d.buy / d.imp * 1000 : 0; d.hold = d.v3 ? d.p50 / d.v3 : 0; d.roas = d.spend ? d.rev / d.spend : 0; d.cpa = d.buy ? d.spend / d.buy : 0; d.cpc = d.chat ? d.spend / d.chat : 0; });
    var mh = med(list.map(function (d) { return d.hook; })), mc = med(list.map(function (d) { return d.conv; }));
    list.forEach(function (d) {
      d.qx = mh ? d.hook / mh : 1; d.qy = mc ? d.conv / mc : (d.buy ? 1 : 0);
      d.score = Math.round(Math.min(100, Math.min(50, d.qx * 35) + Math.min(40, d.qy * 30) + Math.min(10, d.hold * 10)));
      d.quad = d.qx >= 1 && d.qy >= 1 ? 'scale' : d.qx >= 1 ? 'cta' : d.qy >= 1 ? 'hook' : 'close';
    });
    return { list: list, mh: mh, mc: mc, all: rows.length };
  }

  /* ---------- กราฟจุด (SVG) ---------- */
  function scatter(list) {
    var W = 760, H = 330, L = 56, R = 18, T = 16, Bm = 44, pw = W - L - R, ph = H - T - Bm;
    var lg = function (v) { return Math.log(Math.min(4, Math.max(0.25, v || 0.25))) / Math.LN2; }; // ล็อก 2 · 0.25–4 เท่า
    var x = function (v) { return L + (lg(v) + 2) / 4 * pw; }, y = function (v) { return T + ph - (lg(v) + 2) / 4 * ph; };
    var mx = list.reduce(function (m, d) { return Math.max(m, d.spend); }, 1), cx = x(1), cy = y(1);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="vd-svg" role="img" aria-label="กราฟจุด อัตราฮุกเทียบอัตราซื้อ">';
    s += '<rect x="' + cx + '" y="' + T + '" width="' + (L + pw - cx) + '" height="' + (cy - T) + '" fill="#F0FDF4"/><rect x="' + L + '" y="' + T + '" width="' + (cx - L) + '" height="' + (cy - T) + '" fill="#EFF6FF"/><rect x="' + cx + '" y="' + cy + '" width="' + (L + pw - cx) + '" height="' + (T + ph - cy) + '" fill="#FFFBEB"/><rect x="' + L + '" y="' + cy + '" width="' + (cx - L) + '" height="' + (T + ph - cy) + '" fill="#FEF2F2"/>';
    [0.25, 0.5, 1, 2, 4].forEach(function (v) { s += '<line x1="' + x(v) + '" x2="' + x(v) + '" y1="' + T + '" y2="' + (T + ph) + '" stroke="#E5E7EB"/><line x1="' + L + '" x2="' + (L + pw) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="#E5E7EB"/><text x="' + x(v) + '" y="' + (T + ph + 16) + '" class="vd-ax" text-anchor="middle">' + v + '×</text><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" class="vd-ax" text-anchor="end">' + v + '×</text>'; });
    s += '<line x1="' + cx + '" x2="' + cx + '" y1="' + T + '" y2="' + (T + ph) + '" stroke="#94A3B8" stroke-dasharray="5 4"/><line x1="' + L + '" x2="' + (L + pw) + '" y1="' + cy + '" y2="' + cy + '" stroke="#94A3B8" stroke-dasharray="5 4"/>';
    s += '<text x="' + (L + pw - 8) + '" y="' + (T + 18) + '" text-anchor="end" class="vd-ql" fill="#15803D">ขยายผล</text><text x="' + (L + 8) + '" y="' + (T + 18) + '" class="vd-ql" fill="#1D4ED8">แก้ฮุก</text><text x="' + (L + pw - 8) + '" y="' + (T + ph - 8) + '" text-anchor="end" class="vd-ql" fill="#B45309">แก้ CTA</text><text x="' + (L + 8) + '" y="' + (T + ph - 8) + '" class="vd-ql" fill="#B91C1C">พิจารณาปิด</text>';
    s += '<text x="' + (L + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="vd-at">อัตราฮุก (คนหยุดดู ÷ คนเห็น) เทียบค่ากลาง</text><text transform="translate(14 ' + (T + ph / 2) + ') rotate(-90)" text-anchor="middle" class="vd-at">อัตราซื้อต่อคนเห็น เทียบค่ากลาง</text>';
    list.slice().sort(function (a, b) { return b.spend - a.spend; }).slice(0, 250).reverse().forEach(function (d) {
      var r = 3 + Math.sqrt(d.spend / mx) * 9, q = QD[d.quad];
      s += '<circle cx="' + x(d.qx).toFixed(1) + '" cy="' + y(d.qy).toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + q.c + '" fill-opacity=".55" stroke="' + q.c + '" data-id="' + esc(d.id) + '" class="vd-dot"><title>' + esc(d.name) + ' · ฮุก ' + d.qx.toFixed(2) + '× · ซื้อ ' + d.qy.toFixed(2) + '× · ' + B(d.spend) + '</title></circle>';
    });
    return s + '</svg>';
  }
  function retention(d) {
    var a = [d.p25, d.p50, d.p75, d.p95].map(function (v) { return d.v3 ? v / d.v3 : 0; });
    return '<div class="vd-ret" title="ดูถึง 25% / 50% / 75% / 95% ของคนที่หยุดดู">' + a.map(function (v, i) { return '<div><i style="height:' + Math.max(2, Math.round(v * 100)) + '%"></i><span>' + Math.round(v * 100) + '</span></div>'; }).join('') + '</div>';
  }

  /* ---------- หน้า ---------- */
  function render() {
    var box = document.getElementById('vdV2'); if (!box) return;
    var v = document.getElementById('videoaiView'); if (!v || v.style.display === 'none') return;
    var k = key(), rows = CACHE[k], Ld = LOAD[k], Pr = prods(), h = '<div class="c2-wrap ai2 vd">';
    h += '<div class="c2-head"><div><h1>วิเคราะห์วีดีโอ</h1><div class="c2-subhead">ทุกคลิปที่มีคนหยุดดู เทียบกับค่ากลางของคลิปในกลุ่มที่เลือก · ดูว่าคลิปไหนควรขยาย แก้ฮุก แก้ท้ายคลิป หรือปิด · ข้อมูลจาก Facebook</div></div>' +
      '<div class="c2-seg" role="group" aria-label="ช่วงเวลา">' + PER.map(function (x) { return '<button class="' + (S.per === x[0] ? 'on' : '') + '" onclick="vdV2.set(\'per\',\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div></div>';
    h += '<div class="c2-tabs"><button class="' + (S.p < 0 ? 'on' : '') + '" onclick="vdV2.set(\'p\',-1)">ทุกสินค้า</button>' + Pr.map(function (p, i) { var on = S.p === i; return '<button class="' + (on ? 'on' : '') + '" onclick="vdV2.set(\'p\',' + i + ')"><i style="background:' + (on ? '#fff' : PAL[i % PAL.length]) + '"></i>' + esc(p.product) + '</button>'; }).join('') + '</div>';
    if (!rows) {
      load(); Ld = LOAD[k];
      var pct = Ld && Ld.total ? Math.round(Ld.done / Ld.total * 100) : 0;
      h += '<div class="c2-card c2-pad vd-load"><b>กำลังดึงข้อมูลคลิปจาก Facebook…</b><div class="vd-bar"><i style="width:' + pct + '%"></i></div><span class="c2-dim">' + (Ld ? Ld.done + ' / ' + Ld.total + ' บัญชี · เจอคลิปแล้ว ' + I(Ld.rows.length) + ' ตัว' : '') + (S.p < 0 ? ' · ทุกสินค้าใช้เวลานาน เลือกสินค้าเดียวจะเร็วกว่า' : '') + '</span></div></div>';
      box.innerHTML = h; return;
    }
    var C = calc(rows), list = C.list;
    var q = S.q.toLowerCase(), shown = list.filter(function (d) { return (!S.quad || d.quad === S.quad) && (!q || (d.name + ' ' + d.camp + ' ' + d.disp + ' ' + d.page).toLowerCase().indexOf(q) >= 0); });
    var SK = { score: function (a, b) { return b.score - a.score; }, spend: function (a, b) { return b.spend - a.spend; }, roas: function (a, b) { return b.roas - a.roas; }, hook: function (a, b) { return b.hook - a.hook; } }[S.sort];
    shown.sort(SK);
    var t = { spend: 0, rev: 0, buy: 0 }, qc = { scale: [0, 0], cta: [0, 0], hook: [0, 0], close: [0, 0] };
    list.forEach(function (d) { t.spend += d.spend; t.rev += d.rev; t.buy += d.buy; qc[d.quad][0]++; qc[d.quad][1] += d.spend; });
    var win = list.filter(function (d) { return d.score >= 55; }).length;
    h += '<div class="c2-kpis">' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">ค่าแอดคลิปที่ผ่านเกณฑ์</div><div class="c2-val">' + K(t.spend) + '</div><div class="c2-sub c2-dim">' + I(list.length) + ' คลิป จากทั้งหมด ' + I(C.all) + '</div></div>' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">ยอดขาย (FB) · ROAS</div><div class="c2-val">' + K(t.rev) + ' <small>· ' + (t.spend ? (t.rev / t.spend).toFixed(2) : '–') + '</small></div><div class="c2-sub c2-dim">ซื้อ ' + I(t.buy) + ' ครั้ง</div></div>' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">ค่ากลางอัตราฮุก</div><div class="c2-val">' + P(C.mh) + '</div><div class="c2-sub c2-dim">คนหยุดดู ÷ คนเห็น</div></div>' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">ค่ากลางอัตราซื้อ</div><div class="c2-val">' + C.mc.toFixed(2) + ' <small>ต่อ 1,000 คนเห็น</small></div><div class="c2-sub c2-dim">ใช้เป็นเส้นแบ่งในกราฟ</div></div>' +
      '<div class="c2-card c2-kpi"><div class="c2-lbl">คลิปชนะ (คะแนน ≥ 55)</div><div class="c2-val c2-good">' + I(win) + '</div><div class="c2-sub c2-dim">' + (list.length ? Math.round(win / list.length * 100) : 0) + '% ของคลิปที่ผ่านเกณฑ์</div></div></div>';
    h += '<div class="c2-card c2-pad vd-filter"><span class="c2-dim">เกณฑ์ขั้นต่ำ:</span><label>ค่าแอด ≥ ฿<input type="number" min="0" step="100" value="' + S.ms + '" onchange="vdV2.set(\'ms\',+this.value||0)"></label><label>คนเห็น ≥ <input type="number" min="0" step="500" value="' + S.mi + '" onchange="vdV2.set(\'mi\',+this.value||0)"></label><label class="vd-chk"><input type="checkbox"' + (S.low ? ' checked' : '') + ' onchange="vdV2.set(\'low\',this.checked)"> แสดงคลิปข้อมูลน้อยด้วย</label></div>';
    h += '<div class="c2-grid"><div class="c2-card c2-pad c2-wide vd-quad"><div class="c2-h2row"><h2>อัตราฮุก × อัตราซื้อ</h2><span class="c2-note">1 จุด = 1 คลิป · ขนาดจุด = ค่าแอด · เส้นประ = ค่ากลาง · กดจุดเพื่อไปที่คลิปนั้น</span></div><div class="vd-qgrid"><div>' + scatter(list) + '</div><div class="vd-side">' +
      Object.keys(QD).map(function (k2) { var x = QD[k2], c = qc[k2]; return '<button class="vd-qb' + (S.quad === k2 ? ' on' : '') + '" onclick="vdV2.set(\'quad\',\'' + (S.quad === k2 ? '' : k2) + '\')"><i style="background:' + x.c + '"></i><span><b>' + x.l + ' · ' + I(c[0]) + '</b><small>' + x.d + '</small><small>ค่าแอด ' + K(c[1]) + ' · ' + (t.spend ? Math.round(c[1] / t.spend * 100) : 0) + '%</small></span></button>'; }).join('') + '</div></div></div></div>';
    h += '<div class="c2-card c2-pad"><div class="c2-h2row"><h2>คลิป (' + I(shown.length) + ')' + (S.quad ? ' · ' + QD[S.quad].l + ' <button class="c2-link ai2-x" onclick="vdV2.set(\'quad\',\'\')">ดูทั้งหมด ✕</button>' : '') + '</h2><div class="vd-tools"><span class="ai2-sort">เรียง: ' + [['score', 'คะแนน'], ['spend', 'ค่าแอด'], ['roas', 'ROAS'], ['hook', 'อัตราฮุก']].map(function (x) { return '<button class="' + (S.sort === x[0] ? 'on' : '') + '" onclick="vdV2.set(\'sort\',\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</span><input class="ai2-q" type="search" placeholder="ค้นหาคลิป / แคมเปญ / บัญชี" value="' + esc(S.q) + '" oninput="vdV2.q(this.value)"></div></div>';
    h += '<div class="c2-scroll"><table class="c2-t ai2-t vd-t"><thead><tr><th>คลิป</th><th class="r">คะแนน</th><th>ผลประเมิน</th><th class="r">ค่าแอด</th><th class="r">ยอดขาย</th><th class="r">ROAS</th><th class="r">อัตราฮุก</th><th>ดูต่อ 25/50/75/95%</th><th class="r">ซื้อ · ต้นทุน</th><th class="r">ทัก · ต้นทุน</th><th class="r">อายุ</th></tr></thead><tbody>';
    shown.slice(0, 300).forEach(function (d) {
      var qd = QD[d.quad];
      h += '<tr id="vdr-' + esc(d.id) + '"><td class="vd-clip"><button class="vd-th" onclick="vdV2.play(\'' + esc(d.id) + '\')" title="เล่นคลิป">' + (d.thumb ? '<img src="' + esc(d.thumb) + '" alt="" loading="lazy">' : '<span>ไม่มีภาพ</span>') + '<b aria-hidden="true">▶</b></button><div><button class="ag-clip vd-nm" onclick="vdV2.play(\'' + esc(d.id) + '\')" title="' + esc(d.name) + '">' + esc(d.name) + '</button><span class="c2-dim ai2-sm">' + esc(d.prod) + ' · ' + esc(d.disp) + '</span></div></td>' +
        '<td class="r"><b class="vd-sc ' + (d.score >= 55 ? 'g' : d.score >= 40 ? 'w' : 'b') + '">' + d.score + '</b></td><td><span class="ai2-tag ' + qd.t + '">' + qd.l + '</span></td>' +
        '<td class="r">' + B(d.spend) + '</td><td class="r">' + (d.rev ? B(d.rev) : '<span class="c2-dim">–</span>') + '</td><td class="r"><span class="c2-pill ' + (d.roas >= 2 ? 'g' : d.roas >= 1 ? 'w' : 'b') + '">' + (d.rev ? d.roas.toFixed(2) : '–') + '</span></td>' +
        '<td class="r">' + P(d.hook) + '<div class="c2-dim ai2-sm">' + d.qx.toFixed(2) + '×</div></td><td>' + retention(d) + '</td>' +
        '<td class="r">' + I(d.buy) + '<div class="c2-dim ai2-sm">' + (d.buy ? B(d.cpa) : '–') + '</div></td><td class="r">' + I(d.chat) + '<div class="c2-dim ai2-sm">' + (d.chat ? B(d.cpc) : '–') + '</div></td><td class="r">' + d.days + ' วัน</td></tr>';
    });
    if (!shown.length) h += '<tr><td colspan="11" class="c2-dim">ไม่มีคลิปตามตัวกรองนี้' + (!S.low ? ' · ลองติ๊ก "แสดงคลิปข้อมูลน้อยด้วย"' : '') + '</td></tr>';
    h += '</tbody></table></div>' + (shown.length > 300 ? '<div class="c2-note">แสดง 300 จาก ' + I(shown.length) + ' คลิป</div>' : '') +
      '<div class="c2-note">คะแนน = อัตราฮุก (สูงสุด 50) + อัตราซื้อ (40) + คนดูถึงครึ่งคลิป (10) · เทียบกับค่ากลางของคลิปในกลุ่มนี้ · ซื้อ / ยอดขาย / ROAS เป็นตัวเลขที่ Facebook นับ</div></div></div>';
    box.innerHTML = h;
    window._vdShown = shown;
    var qi = box.querySelector('.ai2-q'); if (qi && S._f) { qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); S._f = false; }
    box.querySelectorAll('.vd-dot').forEach(function (c) { c.addEventListener('click', function () { var id = c.getAttribute('data-id'); if (S.quad || S.q) { S.quad = ''; S.q = ''; render(); } var r = document.getElementById('vdr-' + id); if (r) { r.scrollIntoView({ behavior: 'smooth', block: 'center' }); r.classList.add('vd-hl'); setTimeout(function () { r.classList.remove('vd-hl'); }, 2000); } }); });
  }
  function play(id) {
    var d = (CACHE[key()] || []).filter(function (x) { return x.id === id; })[0]; if (!d) return;
    var ov = document.getElementById('agClip');
    if (!ov) { ov = document.createElement('div'); ov.id = 'agClip'; document.body.appendChild(ov); }
    ov.onclick = function (e) { if (e.target === ov) close(); };
    var pg = (d.story || '').split('_')[0], post = d.story ? 'https://www.facebook.com/' + d.story : '';
    var src = d.vid ? 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(pg ? 'https://www.facebook.com/' + pg + '/videos/' + d.vid + '/' : 'https://www.facebook.com/video.php?v=' + d.vid) + '&show_text=false&width=360' : '';
    ov.style.display = 'flex';
    ov.innerHTML = '<div class="agc-box" role="dialog" aria-label="เล่นคลิป"><div class="agc-head"><div><b>' + esc(d.name) + '</b><div class="c2-dim ai2-sm">' + esc(d.prod) + ' · ' + esc(d.page) + ' · ' + esc(d.disp) + '</div></div><button class="agc-x" aria-label="ปิด" onclick="vdV2.close()">✕</button></div><div class="agc-body"><div class="agc-ad">' +
      (src ? '<iframe class="agc-vid" src="' + src + '" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen title="คลิปโฆษณา"></iframe>' : (d.thumb ? '<img class="agc-img" src="' + esc(d.thumb) + '" alt="">' : '<div class="c2-dim">ไม่มีวิดีโอ</div>')) +
      '<div class="agc-meta">' + (post ? '<a class="c2-link" href="' + post + '" target="_blank" rel="noopener">เปิดโพสต์ใน Facebook ↗</a>' : '') + '</div></div>' +
      '<div class="vd-mstat"><div><small>คะแนน</small><b>' + (d.score == null ? '–' : d.score) + '</b></div><div><small>ค่าแอด</small><b>' + B(d.spend) + '</b></div><div><small>ยอดขาย · ROAS</small><b>' + B(d.rev) + ' · ' + (d.spend ? (d.rev / d.spend).toFixed(2) : '–') + '</b></div><div><small>อัตราฮุก</small><b>' + P(d.imp ? d.v3 / d.imp : 0) + '</b></div><div><small>ซื้อ · ทัก</small><b>' + I(d.buy) + ' · ' + I(d.chat) + '</b></div><div><small>แคมเปญ</small><span class="ai2-sm">' + esc(d.camp) + '</span></div><div class="c2-note">ถ้าคลิปไม่เล่น (โพสต์โฆษณาบางตัวไม่เปิดให้ฝัง) ให้กด "เปิดโพสต์ใน Facebook"</div></div></div></div>';
  }
  function close() { var ov = document.getElementById('agClip'); if (ov) { ov.style.display = 'none'; ov.innerHTML = ''; } }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  function save() { try { localStorage.setItem('rb_vai_v2', JSON.stringify({ per: S.per, p: S.p, ms: S.ms, mi: S.mi, sort: S.sort })); } catch (e) {} }
  var qT;
  window.vdV2 = {
    set: function (k, v) { S[k] = v; if (k === 'p' || k === 'per') S.quad = ''; save(); render(); if (k === 'p' || k === 'per') window.scrollTo(0, 0); },
    q: function (v) { S.q = v; clearTimeout(qT); qT = setTimeout(function () { S._f = true; render(); }, 250); },
    play: play, close: close, render: render,
    reload: function () { delete CACHE[key()]; render(); }
  };

  function css() {
    if (document.getElementById('vdcss')) return;
    var s = document.createElement('style'); s.id = 'vdcss';
    var V = '#videoaiView#videoaiView';
    s.textContent = [
      V + '{padding:0!important;background:#F5F6FA!important}',
      V + ' .vd button{border-radius:10px!important;font-family:inherit!important}' + V + ' .vd .c2-tabs button{border-radius:99px!important}' + V + ' .vd .c2-seg button{border-radius:7px!important}' + V + ' .vd .ag-clip,' + V + ' .vd .c2-link{border-radius:0!important}',
      V + ' .vd input{border:1px solid #D7DBE3!important;border-radius:8px!important;background:#fff!important}',
      '.vd .ag-clip{display:block;max-width:100%;border:0;background:none;padding:0;font:inherit;font-weight:600;color:#1D4ED8;cursor:pointer;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vd .ag-clip:hover{text-decoration:underline}',
      '.vd-load{gap:10px}.vd-bar{height:8px;background:#EEF1F6;border-radius:99px;overflow:hidden}.vd-bar i{display:block;height:100%;background:#2563EB;border-radius:99px;transition:width .3s}',
      '.vd-filter{flex-direction:row!important;flex-wrap:wrap;align-items:center;gap:16px!important;padding:12px 18px!important;font-size:13px}.vd-filter label{display:flex;align-items:center;gap:6px;color:#475569}.vd-filter input[type=number]{width:96px;height:34px;padding:0 8px;font:inherit}.vd-chk input{width:16px;height:16px}',
      '.vd-qgrid{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:18px;align-items:start}@media (max-width:1000px){.vd-qgrid{grid-template-columns:minmax(0,1fr)}}',
      '.vd-svg{width:100%;height:auto;display:block}.vd-ax{font-size:11px;fill:#64748B}.vd-at{font-size:12px;fill:#475569}.vd-ql{font-size:13px;font-weight:700}.vd-dot{cursor:pointer}.vd-dot:hover{fill-opacity:.9;stroke-width:2}',
      '.vd-side{display:flex;flex-direction:column;gap:8px}.vd-qb{display:flex;gap:10px;align-items:flex-start;text-align:left;border:1px solid #E5E7EB;background:#fff;padding:10px 12px;cursor:pointer;font:inherit;color:#0F172A}.vd-qb.on{outline:2px solid #2563EB;outline-offset:-1px}.vd-qb i{width:10px;height:10px;border-radius:99px;margin-top:5px;flex:none}.vd-qb span{display:flex;flex-direction:column;gap:2px}.vd-qb b{font-size:14px}.vd-qb small{font-size:12px;color:#64748B}',
      '.vd-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.vd-tools .ai2-sort{margin-left:0}',
      '.vd-t{min-width:1180px}.vd-clip{display:flex;gap:10px;align-items:center;max-width:380px}.vd-clip>div{min-width:0;display:flex;flex-direction:column}.vd-th{position:relative;width:44px;height:56px;flex:none;border:0;padding:0;background:#E5E7EB;overflow:hidden;cursor:pointer;border-radius:8px!important}.vd-th img{width:100%;height:100%;object-fit:cover;display:block}.vd-th span{font-size:9px;color:#64748B}.vd-th b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;background:rgba(15,23,42,.25)}',
      '.vd-sc{display:inline-flex;width:34px;height:34px;border-radius:99px;align-items:center;justify-content:center;font-size:13px}.vd-sc.g{background:#DCFCE7;color:#15803D}.vd-sc.w{background:#FEF3C7;color:#B45309}.vd-sc.b{background:#FEE2E2;color:#B91C1C}',
      '.vd-ret{display:flex;gap:4px;align-items:flex-end;height:34px}.vd-ret div{width:22px;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;position:relative}.vd-ret i{display:block;width:100%;background:#93C5FD;border-radius:3px 3px 0 0}.vd-ret span{font-size:10px;color:#475569;position:absolute;top:-2px}',
      '.vd-t tr.vd-hl td{background:#FEF9C3!important;transition:background .3s}',
      '#agClip .vd-mstat{flex:1;min-width:220px;display:flex;flex-direction:column;gap:10px}#agClip .vd-mstat>div{display:flex;flex-direction:column;gap:2px}#agClip .vd-mstat small{font-size:12px;color:#64748B}#agClip .vd-mstat b{font-size:16px}'
    ].join('');
    document.head.appendChild(s);
  }
  // หน้าต่างเล่นคลิป ใช้สไตล์เดียวกับหน้าคัดนางฟ้า (ใส่ซ้ำเผื่อหน้าคัดนางฟ้ายังไม่โหลด)
  function modalCss() {
    if (document.getElementById('vdmcss')) return;
    var s = document.createElement('style'); s.id = 'vdmcss';
    s.textContent = '#agClip{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:99999;display:none;align-items:center;justify-content:center;padding:16px;font-family:"IBM Plex Sans Thai","Sarabun",system-ui,sans-serif}#agClip .agc-box{background:#fff;border-radius:14px;width:min(820px,100%);max-height:92vh;display:flex;flex-direction:column;overflow:hidden}#agClip .agc-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:14px 18px;border-bottom:1px solid #E5E7EB;font-size:14px}#agClip .agc-x{width:34px;height:34px;border:1px solid #E5E7EB;border-radius:8px;background:#fff;cursor:pointer;flex:none}#agClip .agc-body{padding:16px 18px;overflow:auto;display:flex;flex-wrap:wrap;gap:16px;font-size:13px}#agClip .agc-ad{width:360px;max-width:100%;display:flex;flex-direction:column;gap:8px}#agClip .agc-vid{width:360px;max-width:100%;height:640px;max-height:70vh;border:0;border-radius:10px;background:#000}#agClip .agc-img{width:100%;border-radius:10px}#agClip .agc-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center}';
    document.head.appendChild(s);
  }
  function open() {
    var v = document.getElementById('videoaiView'); if (!v) return;
    css(); modalCss();
    if (!document.getElementById('vdV2')) { v.innerHTML = '<div id="vdV2"></div>'; }
    render();
  }
  function install() {
    if (typeof window.vaiLoad !== 'function' || !window.FB_HIERARCHY || !document.getElementById('videoaiView')) return setTimeout(install, 400);
    window.vaiLoad = function () { setTimeout(open, 0); };
    var v = document.getElementById('videoaiView'); if (v && v.style.display !== 'none' && v.offsetParent) open();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
