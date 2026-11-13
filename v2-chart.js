/* v2-chart.js — หน้า "กราฟ" รายสินค้า (แทนเมนูกราฟเดิม)
   ข้อมูล: fbDataMap (Facebook) รวมทุกบัญชีของสินค้าตาม FB_HIERARCHY · ช่วงเวลาสิ้นสุดเมื่อวาน */
(function () {
  'use strict';
  var S = { p: 'all', days: 14 };
  var THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var PAL = ['#2563EB', '#0EA5E9', '#6366F1', '#14B8A6', '#8B5CF6', '#0891B2', '#F59E0B', '#EC4899', '#10B981', '#64748B', '#EF4444', '#84CC16', '#A855F7', '#06B6D4'];
  var CHARTS = {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dayShift(n) { var d = new Date(); d.setDate(d.getDate() - n); return ymd(d); }
  function dlabel(s) { var p = s.split('-'); return +p[2] + ' ' + THM[+p[1] - 1]; }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
  function B(n) { return '฿' + Math.round(n || 0).toLocaleString('en-US'); }
  function K(n) { n = n || 0; return Math.abs(n) >= 1e6 ? '฿' + (n / 1e6).toFixed(2) + 'M' : (Math.abs(n) >= 1e3 ? '฿' + (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : '฿' + Math.round(n)); }
  function I(n) { return Math.round(n || 0).toLocaleString('en-US'); }

  function prods() { return window.FB_HIERARCHY || []; }
  function accsOf(p) { var a = []; (p.pages || []).forEach(function (pg) { (pg.accounts || []).forEach(function (h) { (h.adAccounts || []).forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); }); }); return a; }
  function blank() { return { spend: 0, rev: 0, buy: 0, chat: 0, imp: 0, clk: 0 }; }
  function add(a, r) { a.spend += num(r.spend); a.rev += num(r.revenue); a.buy += num(r.purchases); a.chat += num(r.conversations); a.imp += num(r.impressions); a.clk += num(r.clicks); }
  function fin(a) { a.roas = a.spend ? a.rev / a.spend : 0; a.cpa = a.buy ? a.spend / a.buy : 0; a.cpc = a.chat ? a.spend / a.chat : 0; a.close = a.chat ? a.buy / a.chat * 100 : 0; return a; }

  // รายวันของชุดบัญชี ตั้งแต่ from ถึง to
  function daily(accs, from, to) {
    var m = {};
    accs.forEach(function (acc) { (window.fbDataMap && fbDataMap[acc] || []).forEach(function (r) { if (r.date >= from && r.date <= to) { var a = m[r.date] || (m[r.date] = blank()); add(a, r); } }); });
    return m;
  }
  function dateList(n, endBack) { var out = []; for (var i = n + endBack - 1; i >= endBack; i--) out.push(dayShift(i)); return out; }
  function sum(dmap, dates) { var a = blank(); dates.forEach(function (d) { var x = dmap[d]; if (x) { a.spend += x.spend; a.rev += x.rev; a.buy += x.buy; a.chat += x.chat; a.imp += x.imp; a.clk += x.clk; } }); return fin(a); }
  function period(k) {
    if (k === 'today') return { n: 1, end: 0, btn: 'วันนี้', label: 'วันนี้ถึงตอนนี้' };
    if (k === 'yday') return { n: 1, end: 1, btn: 'เมื่อวาน', label: 'เมื่อวาน' };
    k = +k || 14; return { n: k, end: 1, btn: k + ' วัน', label: k + ' วัน ถึงเมื่อวาน' };
  }
  function minDate() { var m = ''; for (var k in (window.fbDataMap || {})) (fbDataMap[k] || []).forEach(function (r) { if (r.date && (!m || r.date < m)) m = r.date; }); return m; }

  /* ---------- กราฟ SVG ---------- */
  var W = 760, H = 230, PL = 52, PR = 44, PT = 14, PB = 28;
  function size(w, h) { W = w; H = h; return ''; }
  function niceMax(v) { if (v <= 0) return 1; var e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; }
  function xAt(i, n) { var w = (W - PL - PR) / n; return PL + w * i + w / 2; }
  function yAt(v, max) { return PT + (H - PT - PB) * (1 - Math.min(v / max, 1.08)); }
  function axisL(max, fmt) { var s = ''; for (var i = 0; i <= 4; i++) { var v = max * i / 4, y = yAt(v, max); s += '<line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + y + '" y2="' + y + '" stroke="#EEF1F6"/><text x="' + (PL - 8) + '" y="' + (y + 4) + '" text-anchor="end" class="c2-ax">' + fmt(v) + '</text>'; } return s; }
  function axisR(max, fmt, color) { var s = ''; for (var i = 0; i <= 4; i++) { var v = max * i / 4, y = yAt(v, max); s += '<text x="' + (W - PR + 8) + '" y="' + (y + 4) + '" class="c2-ax" fill="' + color + '">' + fmt(v) + '</text>'; } return s; }
  function xLabels(dates) { var n = dates.length, step = n > 16 ? 3 : n > 9 ? 2 : 1, s = ''; dates.forEach(function (d, i) { if ((i % step === 0 && n - 1 - i >= step) || i === n - 1) s += '<text x="' + xAt(i, n) + '" y="' + (H - 8) + '" text-anchor="middle" class="c2-ax">' + dlabel(d) + '</text>'; }); return s; }
  function path(vals, max, n) { var s = '', pen = false; vals.forEach(function (v, i) { if (v == null) { pen = false; return; } s += (pen ? 'L' : 'M') + xAt(i, n).toFixed(1) + ' ' + yAt(v, max).toFixed(1); pen = true; }); return s; }
  function dots(vals, max, n, color) { return vals.map(function (v, i) { return v == null ? '' : '<circle cx="' + xAt(i, n).toFixed(1) + '" cy="' + yAt(v, max).toFixed(1) + '" r="3" fill="#fff" stroke="' + color + '" stroke-width="2"/>'; }).join(''); }
  function hits(id, n) { var w = (W - PL - PR) / n, s = ''; for (var i = 0; i < n; i++) s += '<rect x="' + (PL + w * i) + '" y="' + PT + '" width="' + w + '" height="' + (H - PT - PB) + '" fill="transparent" data-c="' + id + '" data-i="' + i + '"/>'; return s; }
  function svg(id, label, inner) { return '<div class="c2-svgwrap" data-chart="' + id + '"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '">' + inner + '</svg><div class="c2-tip" role="status"></div></div>'; }
  function legend(items) { return '<div class="c2-legend">' + items.map(function (x) { return '<span><i style="background:' + x[1] + (x[2] ? ';height:2px;border-radius:0' : '') + '"></i>' + x[0] + '</span>'; }).join('') + '</div>'; }

  function chartSpendRoas(id, dates, D) {
    var n = dates.length, sp = dates.map(function (d) { return D[d] ? D[d].spend : 0; }), ro = dates.map(function (d) { return D[d] && D[d].spend ? D[d].rev / D[d].spend : null; });
    var mS = niceMax(Math.max.apply(null, sp.concat([1]))), mR = niceMax(Math.max.apply(null, ro.filter(function (v) { return v != null; }).concat([1.5])));
    var bw = (W - PL - PR) / n * 0.62, bars = sp.map(function (v, i) { var y = yAt(v, mS); return '<rect x="' + (xAt(i, n) - bw / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(H - PB - y, 0).toFixed(1) + '" rx="3" fill="#BFDBFE"/>'; }).join('');
    var one = yAt(1, mR);
    CHARTS[id] = dates.map(function (d, i) { return [dlabel(d), 'ค่าแอด ' + B(sp[i]), 'ROAS ' + (ro[i] == null ? '–' : ro[i].toFixed(2)), 'ยอดขาย FB ' + B(D[d] ? D[d].rev : 0)]; });
    return legend([['ค่าแอด', '#BFDBFE'], ['ROAS', '#EA580C'], ['ROAS 1.0', '#0F172A', 1]]) +
      svg(id, 'ค่าแอดและ ROAS รายวัน', axisL(mS, K) + axisR(mR, function (v) { return v.toFixed(1); }, '#EA580C') + bars +
        '<line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + one + '" y2="' + one + '" stroke="#0F172A" stroke-dasharray="5 4"/>' +
        '<path d="' + path(ro, mR, n) + '" fill="none" stroke="#EA580C" stroke-width="2.5"/>' + dots(ro, mR, n, '#EA580C') + xLabels(dates) + hits(id, n));
  }
  function chartCost(id, dates, D) {
    var n = dates.length, cpa = dates.map(function (d) { return D[d] && D[d].buy ? D[d].spend / D[d].buy : null; }), cpc = dates.map(function (d) { return D[d] && D[d].chat ? D[d].spend / D[d].chat : null; });
    var m = niceMax(Math.max.apply(null, cpa.concat(cpc).filter(function (v) { return v != null; }).concat([250])));
    var t = yAt(200, m);
    CHARTS[id] = dates.map(function (d, i) { return [dlabel(d), 'ต้นทุน/ซื้อ ' + (cpa[i] == null ? '–' : B(cpa[i])), 'ต้นทุน/ทัก ' + (cpc[i] == null ? '–' : B(cpc[i]))]; });
    return legend([['ต้นทุนต่อซื้อ', '#2563EB'], ['ต้นทุนต่อทัก', '#14B8A6'], ['เกณฑ์ ฿200', '#16A34A', 1]]) +
      svg(id, 'ต้นทุนต่อซื้อและต้นทุนต่อทักรายวัน', axisL(m, function (v) { return '฿' + Math.round(v); }) +
        '<line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + t + '" y2="' + t + '" stroke="#16A34A" stroke-dasharray="5 4"/>' +
        '<path d="' + path(cpc, m, n) + '" fill="none" stroke="#14B8A6" stroke-width="2.5"/>' + dots(cpc, m, n, '#14B8A6') +
        '<path d="' + path(cpa, m, n) + '" fill="none" stroke="#2563EB" stroke-width="2.5"/>' + dots(cpa, m, n, '#2563EB') + xLabels(dates) + hits(id, n));
  }
  function chartChatBuy(id, dates, D) {
    var n = dates.length, ch = dates.map(function (d) { return D[d] ? D[d].chat : 0; }), bu = dates.map(function (d) { return D[d] ? D[d].buy : 0; });
    var m = niceMax(Math.max.apply(null, ch.concat(bu).concat([1])));
    var bw = (W - PL - PR) / n * 0.3, s = '';
    for (var i = 0; i < n; i++) {
      var x = xAt(i, n), y1 = yAt(ch[i], m), y2 = yAt(bu[i], m);
      s += '<rect x="' + (x - bw - 1).toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(H - PB - y1, 0).toFixed(1) + '" rx="2" fill="#C7D2FE"/>';
      s += '<rect x="' + (x + 1).toFixed(1) + '" y="' + y2.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(H - PB - y2, 0).toFixed(1) + '" rx="2" fill="#4F46E5"/>';
    }
    CHARTS[id] = dates.map(function (d, i) { return [dlabel(d), 'ทัก ' + I(ch[i]), 'ซื้อ ' + I(bu[i]), 'ปิดได้ ' + (ch[i] ? (bu[i] / ch[i] * 100).toFixed(1) + '%' : '–')]; });
    return legend([['ทัก', '#C7D2FE'], ['ซื้อ', '#4F46E5']]) + svg(id, 'จำนวนทักและซื้อรายวัน', axisL(m, I) + s + xLabels(dates) + hits(id, n));
  }
  function spark(vals, color) {
    var w = 120, h = 28, mx = Math.max.apply(null, vals.concat([1])), n = vals.length;
    var d = vals.map(function (v, i) { return (i ? 'L' : 'M') + (n > 1 ? i / (n - 1) * w : 0).toFixed(1) + ' ' + (h - 2 - (v / mx) * (h - 4)).toFixed(1); }).join('');
    return '<svg class="c2-spark" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2"/></svg>';
  }

  /* ---------- หน้า ---------- */
  var DLBL = 'จากช่วงก่อน';
  function delta(cur, prev, good, fmt) {
    if (prev == null || !isFinite(prev) || prev === 0) return '<span class="c2-dim">ไม่มีช่วงก่อนเทียบ</span>';
    var d = cur - prev, pct = d / Math.abs(prev) * 100, up = d > 0;
    var cls = (good === 'flat' || Math.abs(pct) < 1) ? 'c2-dim' : ((up === (good === 'up')) ? 'c2-good' : 'c2-bad');
    return '<span class="' + cls + '">' + (up ? '▲' : (d < 0 ? '▼' : '')) + ' ' + (fmt ? fmt(Math.abs(d)) : Math.abs(pct).toFixed(0) + '%') + '</span> <span class="c2-dim">' + DLBL + '</span>';
  }
  function kpi(l, v, d) { return '<div class="c2-card c2-kpi"><div class="c2-lbl">' + l + '</div><div class="c2-val">' + v + '</div><div class="c2-sub">' + d + '</div></div>'; }

  function render() {
    var box = document.getElementById('chartV2Inner'), v = document.getElementById('chartV2View');
    if (!box || !v || v.style.display === 'none') return;
    if (!window.FB_HIERARCHY || !window.fbDataMap) { box.innerHTML = '<div class="c2-card c2-empty">กำลังโหลดข้อมูล…</div>'; return; }
    var P = prods(), selP = S.p === 'all' ? null : P.filter(function (p) { return p.product === S.p; })[0];
    if (S.p !== 'all' && !selP) S.p = 'all';
    var accs = [];
    (selP ? [selP] : P).forEach(function (p) { accsOf(p).forEach(function (a) { if (accs.indexOf(a) < 0) accs.push(a); }); });
    var pr = period(S.days), n0 = pr.n, e0 = pr.end;
    var dates = dateList(n0, e0), prevDates = dateList(n0, e0 + n0);
    var cdates = n0 < 7 ? dateList(7, e0) : dates; // กราฟรายวันแสดงอย่างน้อย 7 วัน
    var D = daily(accs, (cdates[0] < prevDates[0] ? cdates[0] : prevDates[0]), dates[dates.length - 1]);
    var cur = sum(D, dates), md = minDate(), hasPrev = md && md <= prevDates[0];
    var prev = hasPrev ? sum(D, prevDates) : null;
    DLBL = n0 === 1 ? (e0 === 0 ? 'จากเมื่อวาน' : 'จากวันก่อน') : 'จากช่วงก่อน';
    var cntPrev = (e0 === 0) ? null : prev; // วันนี้ยังไม่จบวัน: ไม่เทียบยอดรวมกับเมื่อวานทั้งวัน
    var today = daily(accs, dayShift(0), dayShift(0)), td = sum(today, [dayShift(0)]);

    var h = '<div class="c2-head"><div><h1>กราฟ' + (selP ? ' · ' + esc(selP.product) : ' · ทุกสินค้า') + '</h1><div class="c2-subhead">' + dlabel(dates[0]) + (n0 === 1 ? '' : ' – ' + dlabel(dates[dates.length - 1])) + ' (' + pr.label + ') · ข้อมูลจาก Facebook' + (e0 === 0 ? ' · ยังไม่จบวัน ยอดรวมจึงไม่เทียบกับเมื่อวาน · กราฟแสดง 7 วันล่าสุด' : (n0 < 7 ? ' · กราฟแสดง 7 วันถึง ' + dlabel(dates[dates.length - 1]) : ' · วันนี้ถึงตอนนี้ ค่าแอด ' + K(td.spend) + ' ROAS ' + (td.spend ? td.roas.toFixed(2) : '–'))) + '</div></div>' +
      '<div class="c2-seg" role="group" aria-label="ช่วงเวลา">' + ['today', 'yday', 3, 7, 14, 30].map(function (n) { return '<button class="' + (S.days === n ? 'on' : '') + '" aria-pressed="' + (S.days === n) + '" onclick="chartV2.days(' + (typeof n === 'string' ? "'" + n + "'" : n) + ')">' + period(n).btn + '</button>'; }).join('') + '</div></div>';

    h += '<div class="c2-tabs"><button class="' + (S.p === 'all' ? 'on' : '') + '" onclick="chartV2.p(\'all\')">ทุกสินค้า</button>' +
      P.map(function (p, i) { var on = S.p === p.product; return '<button class="' + (on ? 'on' : '') + '" onclick="chartV2.p(' + esc(JSON.stringify(p.product)) + ')"><i style="background:' + (on ? '#fff' : PAL[i % PAL.length]) + '"></i>' + esc(p.product) + '</button>'; }).join('') + '</div>';

    h += '<div class="c2-kpis">' +
      kpi('ค่าแอด', K(cur.spend), cntPrev ? delta(cur.spend, cntPrev.spend, 'flat') : delta(0, null)) +
      kpi('ยอดขาย (FB)', K(cur.rev), cntPrev ? delta(cur.rev, cntPrev.rev, 'up') : delta(0, null)) +
      kpi('ROAS', cur.spend ? '<span class="' + (cur.roas >= 1.3 ? 'c2-good' : cur.roas >= 1 ? 'c2-warn' : 'c2-bad') + '">' + cur.roas.toFixed(2) + '</span>' : '–', prev ? delta(cur.roas, prev.roas, 'up', function (x) { return x.toFixed(2); }) : delta(0, null)) +
      kpi('ซื้อ', I(cur.buy), cntPrev ? delta(cur.buy, cntPrev.buy, 'up') : delta(0, null)) +
      kpi('ต้นทุนต่อซื้อ', cur.buy ? '<span class="' + (cur.cpa <= 200 ? 'c2-good' : 'c2-bad') + '">' + B(cur.cpa) + '</span>' : '–', prev && prev.cpa ? delta(cur.cpa, prev.cpa, 'down', B) : delta(0, null)) +
      kpi('ทัก · ต้นทุนต่อทัก', I(cur.chat) + ' <small>· ' + (cur.chat ? B(cur.cpc) : '–') + '</small>', prev && prev.cpc ? delta(cur.cpc, prev.cpc, 'down', B) : delta(0, null)) +
      '</div>';

    CHARTS = {};
    h += '<div class="c2-grid">' +
      '<div class="c2-card c2-pad c2-wide"><h2>ค่าแอดและ ROAS รายวัน</h2>' + size(1100, 300) + chartSpendRoas('sr', cdates, D) + '</div>' +
      '<div class="c2-card c2-pad"><h2>ต้นทุนต่อซื้อ / ต่อทัก</h2>' + size(560, 290) + chartCost('cost', cdates, D) + '</div>' +
      '<div class="c2-card c2-pad"><h2>ทักและซื้อรายวัน</h2>' + chartChatBuy('cb', cdates, D) + '</div>' +
      '</div>';

    // เทียบสินค้า
    if (!selP) {
      var list = P.map(function (p, i) {
        var dm = daily(accsOf(p), dates[0], dates[dates.length - 1]);
        return { p: p, i: i, a: sum(dm, dates), sp: dates.map(function (d) { return dm[d] ? dm[d].spend : 0; }) };
      }).filter(function (x) { return x.a.spend > 0; }).sort(function (a, b) { return b.a.spend - a.a.spend; });
      var tot = list.reduce(function (s, x) { return s + x.a.spend; }, 0) || 1, mx = list.length ? list[0].a.spend : 1;
      h += '<div class="c2-card c2-pad"><div class="c2-h2row"><h2>เทียบทุกสินค้า</h2><span class="c2-note">กดชื่อสินค้าเพื่อดูกราฟของสินค้านั้น</span></div><div class="c2-scroll"><table class="c2-t"><thead><tr><th>สินค้า</th><th style="min-width:220px">ค่าแอด (สัดส่วน)</th><th class="r">ROAS</th><th class="r">ต้นทุน/ซื้อ</th><th class="r">ต้นทุน/ทัก</th><th class="r">ทัก</th><th class="r">ซื้อ</th><th>แนวโน้มค่าแอด</th></tr></thead><tbody>' +
        list.map(function (x) {
          var col = PAL[x.i % PAL.length], a = x.a;
          return '<tr><td><button class="c2-link" onclick="chartV2.p(' + esc(JSON.stringify(x.p.product)) + ')"><i class="c2-dot" style="background:' + col + '"></i>' + esc(x.p.product) + '</button></td>' +
            '<td><div class="c2-share"><div><i style="width:' + (a.spend / mx * 100).toFixed(1) + '%;background:' + col + '"></i></div><span>' + K(a.spend) + ' · ' + (a.spend / tot * 100).toFixed(0) + '%</span></div></td>' +
            '<td class="r"><span class="c2-pill ' + (a.roas >= 1.3 ? 'g' : a.roas >= 1 ? 'w' : 'b') + '">' + a.roas.toFixed(2) + '</span></td>' +
            '<td class="r ' + (a.buy && a.cpa <= 200 ? 'c2-good' : '') + '">' + (a.buy ? B(a.cpa) : '–') + '</td><td class="r">' + (a.chat ? B(a.cpc) : '–') + '</td><td class="r">' + I(a.chat) + '</td><td class="r">' + I(a.buy) + '</td><td>' + spark(x.sp, col) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    } else {
      // รายเพจของสินค้านี้
      var pl = (selP.pages || []).map(function (pg) {
        var a = []; (pg.accounts || []).forEach(function (hh) { (hh.adAccounts || []).forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); });
        var dm = daily(a, dates[0], dates[dates.length - 1]);
        return { name: pg.name, a: sum(dm, dates), sp: dates.map(function (d) { return dm[d] ? dm[d].spend : 0; }) };
      }).filter(function (x) { return x.a.spend > 0; }).sort(function (a, b) { return b.a.spend - a.a.spend; });
      var mx2 = pl.length ? pl[0].a.spend : 1;
      h += '<div class="c2-card c2-pad"><h2>รายเพจของ ' + esc(selP.product) + '</h2><div class="c2-scroll"><table class="c2-t"><thead><tr><th>เพจ</th><th style="min-width:220px">ค่าแอด</th><th class="r">ROAS</th><th class="r">ต้นทุน/ซื้อ</th><th class="r">ต้นทุน/ทัก</th><th class="r">ทัก</th><th class="r">ซื้อ</th><th>แนวโน้มค่าแอด</th></tr></thead><tbody>' +
        (pl.length ? pl.map(function (x) {
          var a = x.a;
          return '<tr><td><b>' + esc(x.name) + '</b></td><td><div class="c2-share"><div><i style="width:' + (a.spend / mx2 * 100).toFixed(1) + '%;background:#2563EB"></i></div><span>' + K(a.spend) + '</span></div></td>' +
            '<td class="r"><span class="c2-pill ' + (a.roas >= 1.3 ? 'g' : a.roas >= 1 ? 'w' : 'b') + '">' + a.roas.toFixed(2) + '</span></td><td class="r ' + (a.buy && a.cpa <= 200 ? 'c2-good' : '') + '">' + (a.buy ? B(a.cpa) : '–') + '</td><td class="r">' + (a.chat ? B(a.cpc) : '–') + '</td><td class="r">' + I(a.chat) + '</td><td class="r">' + I(a.buy) + '</td><td>' + spark(x.sp, '#2563EB') + '</td></tr>';
        }).join('') : '<tr><td colspan="8" class="c2-dim">ไม่มีค่าแอดในช่วงนี้</td></tr>') + '</tbody></table></div></div>';
    }
    h += '<div class="c2-note">ROAS และยอดขายในหน้านี้เป็นตัวเลขที่ Facebook นับ ไม่ใช่ยอดหลังบ้าน · ต้นทุนต่อซื้อ ≤ ฿200 = เพิ่มงบได้ตามกฎทีม (ต้องมียอดขาย)</div>';
    box.innerHTML = h;
  }

  // tooltip
  function onMove(e) {
    var t = e.target; if (!t || !t.getAttribute) return;
    var id = t.getAttribute('data-c'); var wrap = t.closest && t.closest('.c2-svgwrap'); if (!wrap) return;
    var tip = wrap.querySelector('.c2-tip');
    if (!id) { tip.style.display = 'none'; return; }
    var row = (CHARTS[id] || [])[+t.getAttribute('data-i')]; if (!row) return;
    tip.innerHTML = '<b>' + esc(row[0]) + '</b>' + row.slice(1).map(function (x) { return '<div>' + esc(x) + '</div>'; }).join('');
    var r = wrap.getBoundingClientRect(), x = e.clientX - r.left;
    tip.style.display = 'block'; tip.style.left = Math.min(Math.max(x + 12, 0), r.width - 170) + 'px'; tip.style.top = '8px';
  }
  function onLeave(e) { var w = e.target.closest && e.target.closest('.c2-svgwrap'); if (w) w.querySelector('.c2-tip').style.display = 'none'; }

  window.chartV2 = {
    open: open, render: render,
    p: function (x) { S.p = x; render(); try { localStorage.setItem('rb_chart_v2', JSON.stringify(S)); } catch (e) {} window.scrollTo(0, 0); },
    days: function (n) { S.days = n; render(); try { localStorage.setItem('rb_chart_v2', JSON.stringify(S)); } catch (e) {} }
  };
  function open(el) {
    document.querySelectorAll('[id$="View"]').forEach(function (v) { v.style.display = 'none'; });
    document.querySelectorAll('.sb-item').forEach(function (i) { i.classList.remove('active'); });
    var v = document.getElementById('chartV2View'); if (v) v.style.display = '';
    if (el) el.classList.add('active');
    render(); window.scrollTo(0, 0);
  }

  function install() {
    if (document.getElementById('sb-chartv2')) return;
    var old = Array.prototype.filter.call(document.querySelectorAll('.sb-item'), function (i) { return (i.getAttribute('onclick') || '').indexOf("'chartSection'") >= 0; })[0];
    var wrap = document.querySelector('.content-wrap');
    if (!old || !wrap) return setTimeout(install, 500);
    old.id = 'sb-chartold';
    try { var sv = JSON.parse(localStorage.getItem('rb_chart_v2') || 'null'); if (sv && sv.days) S = sv; } catch (e) {}
    var item = document.createElement('div');
    item.className = 'sb-item'; item.id = 'sb-chartv2';
    item.innerHTML = '<span class="sb-icon">📈</span><span>กราฟ</span>';
    item.onclick = function () { open(item); };
    old.parentNode.insertBefore(item, old);
    var view = document.createElement('div');
    view.id = 'chartV2View'; view.style.display = 'none';
    view.innerHTML = '<div class="c2-wrap" id="chartV2Inner"></div>';
    wrap.appendChild(view);
    view.addEventListener('mousemove', onMove); view.addEventListener('mouseleave', onLeave, true);
    var css = document.createElement('style');
    css.textContent = [
      '.c2-wrap{--ink:#0F172A;--mute:#475569;--line:#E5E7EB;--blue:#2563EB;font-family:"IBM Plex Sans Thai","Sarabun",system-ui,sans-serif;color:var(--ink);background:#F5F6FA;padding:24px 28px 64px;font-variant-numeric:tabular-nums;min-height:100vh;box-sizing:border-box;display:flex;flex-direction:column;gap:16px}',
      '.c2-wrap *{box-sizing:border-box}.c2-wrap h1{margin:0;font-size:26px;font-weight:700;color:var(--ink)}.c2-wrap h2{margin:0;font-size:16px;font-weight:700;color:var(--ink)}',
      '.c2-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:14px}.c2-subhead{font-size:13px;color:var(--mute);margin-top:4px}',
      '.c2-seg{display:flex;gap:4px;background:#E9EDF4;padding:4px;border-radius:10px}.c2-seg button{height:36px;padding:0 14px;border:0;border-radius:7px;background:transparent;color:var(--mute);font:inherit;font-size:13px;cursor:pointer}.c2-seg button.on{background:#fff;color:var(--ink);font-weight:600;box-shadow:0 1px 2px rgba(15,23,42,.08)}',
      '.c2-tabs{display:flex;flex-wrap:wrap;gap:8px;padding-bottom:14px;border-bottom:1px solid var(--line)}.c2-tabs button{height:36px;padding:0 14px;border-radius:99px;border:1px solid var(--line);background:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer;color:var(--ink);display:flex;align-items:center;gap:7px}.c2-tabs button.on{background:var(--blue);border-color:var(--blue);color:#fff}.c2-tabs i{width:8px;height:8px;border-radius:99px;display:inline-block}',
      '.c2-card{background:#fff;border:1px solid var(--line);border-radius:12px}.c2-pad{padding:18px 20px;display:flex;flex-direction:column;gap:10px;min-width:0}.c2-empty{padding:40px;text-align:center;color:var(--mute)}',
      '.c2-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}.c2-kpi{padding:14px 16px;display:flex;flex-direction:column;gap:4px}.c2-lbl{font-size:12px;color:var(--mute)}.c2-val{font-size:24px;font-weight:700;line-height:1.2}.c2-val small{font-size:14px;color:var(--mute);font-weight:600}.c2-sub{font-size:12px}',
      '.c2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.c2-wide{grid-column:1/-1}@media (max-width:1000px){.c2-grid{grid-template-columns:minmax(0,1fr)}}',
      '.c2-legend{display:flex;flex-wrap:wrap;gap:14px;font-size:12px;color:var(--mute)}.c2-legend i{display:inline-block;width:12px;height:10px;border-radius:2px;margin-right:6px;vertical-align:middle}',
      '.c2-svgwrap{position:relative}.c2-svgwrap svg{width:100%;height:auto;display:block}.c2-ax{font-size:11px;fill:#64748B}',
      '.c2-tip{display:none;position:absolute;min-width:160px;background:#0F172A;color:#fff;border-radius:8px;padding:8px 10px;font-size:12px;pointer-events:none;z-index:5;line-height:1.5}.c2-tip b{display:block;margin-bottom:2px}',
      '.c2-h2row{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px}.c2-scroll{overflow-x:auto}',
      '.c2-t{width:100%;border-collapse:collapse;font-size:13px;min-width:860px}.c2-t th{padding:10px 12px;font-size:12px;font-weight:600;color:var(--mute);text-align:left;background:#F8FAFC;border-bottom:1px solid var(--line);white-space:nowrap}.c2-t td{padding:9px 12px;border-bottom:1px solid #EEF1F6;vertical-align:middle}.c2-t .r{text-align:right}',
      '.c2-link{border:0;background:none;padding:0;font:inherit;font-weight:600;color:#1D4ED8;cursor:pointer;text-align:left}.c2-link:hover{text-decoration:underline}.c2-dot{display:inline-block;width:9px;height:9px;border-radius:99px;margin-right:8px}',
      '.c2-share{display:flex;align-items:center;gap:10px}.c2-share div{flex:1;height:8px;background:#EEF1F6;border-radius:99px;overflow:hidden}.c2-share i{display:block;height:100%;border-radius:99px}.c2-share span{white-space:nowrap;font-size:12px;min-width:92px}',
      '.c2-pill{display:inline-block;min-width:46px;text-align:center;padding:2px 9px;border-radius:99px;font-size:12px;font-weight:700}.c2-pill.g{background:#DCFCE7;color:#15803D}.c2-pill.w{background:#FEF3C7;color:#B45309}.c2-pill.b{background:#FEE2E2;color:#B91C1C}',
      '.c2-spark{width:120px;height:28px;display:block}',
      '.c2-good{color:#15803D}.c2-bad{color:#B91C1C}.c2-warn{color:#B45309}.c2-dim{color:#64748B}.c2-note{font-size:12px;color:var(--mute)}',
      '@media (max-width:640px){.c2-wrap{padding:16px}}'
    ].join('\n');
    document.head.appendChild(css);
    document.addEventListener('click', function (e) { var it = e.target.closest && e.target.closest('.sb-item'); if (it && it.id !== 'sb-chartv2') { var v = document.getElementById('chartV2View'); if (v) v.style.display = 'none'; } }, true);
    var last = -1;
    setInterval(function () {
      item.style.display = old.style.display === 'none' ? 'none' : '';
      var v = document.getElementById('chartV2View'); if (!v || v.style.display === 'none' || !window.fbDataMap) return;
      var n = 0; for (var k in fbDataMap) n += (fbDataMap[k] || []).length;
      if (n !== last) { last = n; render(); }
    }, 15000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
