/* v2-mgrcom.js — หน้า "ทีมกราฟิก" (แทนเมนู วิเคราะห์ Cohort)
   คนดูแลเพจ (manager ใน FB_HIERARCHY) แต่ละคน ยิงสินค้าไหน วันละเท่าไร ได้ค่าคอมเท่าไร
   - ยอดยิง = ค่าแอด Facebook รวมทุกบัญชีในเพจที่คนนั้นดูแล แยกตามสินค้า รายวัน (fbDataMap)
   - ค่าคอมต่อ (คนดูแล × สินค้า × วัน) ตามตารางขั้นยอดยิง */
(function () {
  'use strict';
  // ยอดยิงแอด > ขั้น → ค่าคอม (บาท)
  var TIERS = [[75000, 400], [70000, 360], [65000, 320], [60000, 280], [55000, 240], [50000, 210], [45000, 180], [40000, 150], [35000, 130], [30000, 110], [25000, 90], [20000, 80], [15000, 70]];
  var ORDER = ['MOS', 'DOM', 'NUNE', 'JAM', 'BALL', 'TER', 'LINK'];
  var COL = { MOS: '#2563EB', DOM: '#0D9488', NUNE: '#DB2777', JAM: '#7C3AED', BALL: '#EA580C', TER: '#0891B2', LINK: '#64748B' };
  var THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var THD = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  var S = { m: '', who: '', p: '' };
  try { var sv = JSON.parse(localStorage.getItem('rb_mc_v2') || '{}'); if (sv.who) S.who = sv.who; } catch (e) {}

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jsq(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
  function B2(n) { return (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function B(n) { return '฿' + Math.round(n || 0).toLocaleString('en-US'); }
  function dTH(s) { var p = s.split('-'); return p[2] + '/' + p[1] + '/' + String(+p[0] + 543).slice(2); }
  function addD(s, n) { var d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); }
  // รอบค่าคอม: วันที่ 26 เดือนก่อน – 25 ของเดือน (คีย์ = เดือนที่จบรอบ YYYY-MM)
  function cyc(m) { var p = m.split('-'), e = new Date(+p[0], +p[1] - 1, 25), s = new Date(+p[0], +p[1] - 2, 26); return [ymd(s), ymd(e)]; }
  function dS(s) { var p = s.split('-'); return (+p[2]) + ' ' + THM[+p[1] - 1]; }
  function mLabel(m) { var c = cyc(m); return dS(c[0]) + ' – ' + dS(c[1]) + ' ' + String(+c[1].slice(0, 4) + 543).slice(2); }
  function monthsBack(n) { var out = [], d = new Date(); if (d.getDate() > 25) d.setDate(28), d.setMonth(d.getMonth() + 1); d.setDate(1); for (var i = 0; i < n; i++) { out.push(d.getFullYear() + '-' + pad(d.getMonth() + 1)); d.setMonth(d.getMonth() - 1); } return out; }
  function com(sp) { for (var i = 0; i < TIERS.length; i++) if (sp > TIERS[i][0]) return TIERS[i][1]; return 0; }
  function nextTier(sp) { for (var i = TIERS.length - 1; i >= 0; i--) if (sp <= TIERS[i][0]) return TIERS[i]; return null; }
  function mgrOf(v) { v = String(v == null ? '' : v).trim(); return !v || v === '-' ? 'ไม่ระบุ' : v.toUpperCase(); }
  function ord(a) { var i = ORDER.indexOf(a); return a === 'ไม่ระบุ' ? 999 : i < 0 ? 500 : i; }

  // รวมยอด: R[mgr][prod][date] = spend · pages[mgr][prod] = [ชื่อเพจ]
  function build(m) {
    var R = {}, PG = {}, dates = {}, minD = '', C = cyc(m);
    (window.FB_HIERARCHY || []).forEach(function (p) {
      (p.pages || []).forEach(function (pg) {
        var mg = mgrOf(pg.manager);
        ((PG[mg] = PG[mg] || {})[p.product] = PG[mg][p.product] || []).push(pg.name);
        (pg.accounts || []).forEach(function (h) {
          (h.adAccounts || []).forEach(function (a) {
            ((window.fbDataMap || {})[a] || []).forEach(function (r) {
              if (!r.date) return; if (!minD || r.date < minD) minD = r.date;
              if (r.date < C[0] || r.date > C[1]) return;
              var s = num(r.spend); if (!s) return;
              var x = (R[mg] = R[mg] || {}), y = (x[p.product] = x[p.product] || {});
              y[r.date] = (y[r.date] || 0) + s; dates[r.date] = 1;
            });
          });
        });
      });
    });
    return { R: R, PG: PG, dates: Object.keys(dates).sort(), minD: minD, C: C };
  }
  function sumMgr(x) {
    var t = { s: 0, c: 0, days: 0, prods: 0 };
    Object.keys(x || {}).forEach(function (p) { var any = 0; Object.keys(x[p]).forEach(function (d) { var s = x[p][d], c = com(s); t.s += s; t.c += c; if (c) t.days++; any = 1; }); t.prods += any; });
    return t;
  }

  function render() {
    var box = document.getElementById('mcView'); if (!box || box.style.display === 'none') return;
    var h = '<div class="c2-wrap ai2 mc">';
    var MS = monthsBack(4); if (!S.m) S.m = MS[0];
    h += '<div class="c2-head"><div><h1>ทีมกราฟิก</h1><div class="c2-subhead">คนดูแลเพจแต่ละคน ยิงสินค้าไหน วันละเท่าไร ได้ค่าคอมเท่าไร · ยอดยิง = ค่าแอด Facebook รวมทุกบัญชีในเพจที่ดูแล แยกตามสินค้า · ค่าคอมคิดต่อสินค้าต่อวัน · รอบค่าคอม 26 – 25 ของเดือน</div></div>' +
      '<div class="c2-seg" role="group" aria-label="รอบค่าคอม">' + MS.map(function (m) { return '<button class="' + (S.m === m ? 'on' : '') + '" onclick="mcV2.set(\'m\',\'' + m + '\')">' + mLabel(m) + '</button>'; }).join('') + '</div></div>';
    if (!window.FB_HIERARCHY || !window.fbDataMap) { box.innerHTML = h + '<div class="c2-card c2-empty">กำลังโหลดข้อมูล Facebook…</div></div>'; setTimeout(render, 1500); return; }
    var D = build(S.m), R = D.R;
    var mgrs = Object.keys(D.PG).sort(function (a, b) { return ord(a) - ord(b) || (a < b ? -1 : 1); });
    if (S.who && mgrs.indexOf(S.who) < 0) S.who = '';
    if (D.minD && D.C[1] >= D.minD && D.minD > D.C[0]) h += '<div class="ai2-banner warn"><b>ข้อมูลเดือนนี้ไม่ครบ</b><span>ข้อมูล Facebook ในแดชบอร์ดเริ่มที่ ' + dTH(D.minD) + '</span></div>';
    if (D.minD && D.C[1] < D.minD) h += '<div class="ai2-banner warn"><b>ไม่มีข้อมูลเดือนนี้</b><span>ข้อมูล Facebook ในแดชบอร์ดเริ่มที่ ' + dTH(D.minD) + '</span></div>';

    // การ์ดคนดูแล
    var all = { s: 0, c: 0 };
    h += '<div class="mc-people"><button class="c2-card mc-p' + (!S.who ? ' on' : '') + '" style="--c:#0F172A" onclick="mcV2.set(\'who\',\'\')"><b>ทุกคน</b><span class="mc-big">สรุปรวม</span><span class="c2-dim ai2-sm">เทียบทุกคนดูแล</span></button>' +
      mgrs.map(function (k) { var t = sumMgr(R[k]); all.s += t.s; all.c += t.c; return '<button class="c2-card mc-p' + (S.who === k ? ' on' : '') + '" style="--c:' + (COL[k] || '#94A3B8') + '" onclick="mcV2.set(\'who\',\'' + jsq(k) + '\')"><b>' + esc(k) + '</b><span class="mc-big">' + B(t.c) + '</span><span class="c2-dim ai2-sm">ยิง ' + B(t.s) + ' · ได้คอม ' + t.days + ' วัน-สินค้า</span></button>'; }).join('') + '</div>';

    if (!S.who) {
      // ตารางสรุปทุกคน × สินค้า
      var prods = {}; mgrs.forEach(function (k) { Object.keys(R[k] || {}).forEach(function (p) { prods[p] = 1; }); });
      var PL = Object.keys(prods);
      h += '<div class="c2-card c2-pad"><div class="c2-h2row"><h2>สรุปรอบ ' + mLabel(S.m) + ' · ค่าคอมแยกคนดูแล × สินค้า</h2><span class="c2-note">ตัวเลขบน = ค่าคอม · ล่าง = ยอดยิงรวม · กดชื่อคนดูแลเพื่อดูรายวัน</span></div><div class="c2-scroll"><table class="c2-t ai2-t mc-sum"><thead><tr><th>คนดูแล</th>' + PL.map(function (p) { return '<th class="r">' + esc(p) + '</th>'; }).join('') + '<th class="r">รวม</th></tr></thead><tbody>';
      mgrs.forEach(function (k) {
        var t = sumMgr(R[k]);
        h += '<tr><td><button class="mc-who" style="--c:' + (COL[k] || '#94A3B8') + '" onclick="mcV2.set(\'who\',\'' + jsq(k) + '\')">' + esc(k) + '</button></td>' + PL.map(function (p) { var y = (R[k] || {})[p]; if (!y) return '<td class="r c2-dim">–</td>'; var s = 0, c = 0; Object.keys(y).forEach(function (d) { s += y[d]; c += com(y[d]); }); return '<td class="r"><b class="' + (c ? 'mc-g' : '') + '">' + B(c) + '</b><div class="c2-dim ai2-sm">' + B(s) + '</div></td>'; }).join('') + '<td class="r"><b class="mc-g">' + B(t.c) + '</b><div class="c2-dim ai2-sm">' + B(t.s) + '</div></td></tr>';
      });
      h += '<tr class="mc-tot"><td><b>รวม</b></td>' + PL.map(function (p) { var s = 0, c = 0; mgrs.forEach(function (k) { var y = (R[k] || {})[p]; if (y) Object.keys(y).forEach(function (d) { s += y[d]; c += com(y[d]); }); }); return '<td class="r"><b>' + B(c) + '</b><div class="c2-dim ai2-sm">' + B(s) + '</div></td>'; }).join('') + '<td class="r"><b>' + B(all.c) + '</b><div class="c2-dim ai2-sm">' + B(all.s) + '</div></td></tr>';
      h += '</tbody></table></div></div>';
    } else {
      var x = R[S.who] || {}, pl = Object.keys(D.PG[S.who] || {});
      pl.sort(function (a, b) { var sa = 0, sb = 0; Object.keys(x[a] || {}).forEach(function (d) { sa += x[a][d]; }); Object.keys(x[b] || {}).forEach(function (d) { sb += x[b][d]; }); return sb - sa; });
      h += '<div class="mc-grid">';
      pl.forEach(function (p) {
        var y = x[p] || {}, ds = [], s = 0, c = 0, nd = 0, lastD = D.C[1] < today() ? D.C[1] : today();
        for (var dd = D.C[0]; dd <= lastD; dd = addD(dd, 1)) ds.push(dd);
        Object.keys(y).forEach(function (d) { s += y[d]; var cc = com(y[d]); c += cc; if (cc) nd++; });
        var td = y[today()] || 0, nt = nextTier(td);
        h += '<section class="c2-card c2-pad mc-card"><div class="mc-ch"><div><div class="mc-who2" style="--c:' + (COL[S.who] || '#94A3B8') + '">' + esc(S.who) + '</div><h2>' + esc(p) + '</h2><div class="c2-dim ai2-sm">' + esc((D.PG[S.who][p] || []).join(' · ')) + '</div></div><div class="mc-tt"><small>ค่าคอมรอบนี้</small><b>' + B(c) + '</b><span>ยิงรวม ' + B(s) + ' · ได้คอม ' + nd + ' วัน</span></div></div>';
        if (today() >= D.C[0] && today() <= D.C[1] && nt) h += '<div class="mc-next">วันนี้ยิงแล้ว ' + B(td) + ' · อีก ' + B(nt[0] - td + 0.01) + ' ถึงขั้น ' + B(nt[1]) + '</div>';
        h += '<table class="c2-t mc-t"><thead><tr><th>วันที่</th><th class="r">ยิง</th><th class="r">ค่าคอม</th></tr></thead><tbody>';
        if (!ds.length) h += '<tr><td colspan="3" class="c2-dim">รอบนี้ยังไม่เริ่ม</td></tr>';
        ds.forEach(function (d) { var v = y[d] || 0, cc = com(v); h += '<tr' + (d === today() ? ' class="mc-today"' : '') + '><td>' + dTH(d) + (d === today() ? ' <span class="ai2-tag none">วันนี้ ยังไม่จบ</span>' : '') + '</td><td class="r' + (v ? '' : ' c2-dim') + '">' + (v ? B2(v) : '–') + '</td><td class="r"><b class="' + (cc ? 'mc-g' : 'c2-dim') + '">' + (cc ? cc : '–') + '</b></td></tr>'; });
        h += '</tbody></table></section>';
      });
      if (!pl.length) h += '<div class="c2-card c2-empty">คนดูแลนี้ยังไม่มีเพจ</div>';
      h += '</div>';
    }
    h += '<div class="mc-foot"><details class="c2-card c2-pad"><summary><b>ตารางค่าคอม</b> <span class="c2-dim">(ยอดยิงแอดต่อสินค้าต่อวัน)</span></summary><table class="c2-t mc-tier"><thead><tr><th>ยอดยิงแอด</th><th class="r">ค่าคอม (บาท)</th></tr></thead><tbody>' + TIERS.slice().reverse().map(function (t) { return '<tr><td>&gt; ' + t[0].toLocaleString('en-US') + '</td><td class="r">' + t[1].toFixed(2) + '</td></tr>'; }).join('') + '</tbody></table><div class="c2-note">ไม่ถึง 15,000 = ไม่มีค่าคอม · รอบค่าคอม = วันที่ 26 เดือนก่อน ถึง 25 ของเดือน · คนดูแลอิงจากผู้ดูแลเพจปัจจุบัน · ยอดยิงเป็นค่าแอด Facebook (ไม่รวม VAT) อาจต่างจากที่ดูใน Ads Manager คนละเวลาเล็กน้อย</div></details>' +
      '<button class="ai2-btn" onclick="mcV2.csv()">ดาวน์โหลด CSV รอบ ' + mLabel(S.m) + '</button></div>';
    h += '</div>';
    box.innerHTML = h;
  }
  function csv() {
    var D = build(S.m), R = D.R, lines = [['คนดูแล', 'สินค้า', 'วันที่', 'ยิง', 'ค่าคอม']];
    Object.keys(R).sort(function (a, b) { return ord(a) - ord(b); }).forEach(function (k) { if (S.who && k !== S.who) return; Object.keys(R[k]).forEach(function (p) { Object.keys(R[k][p]).sort().forEach(function (d) { lines.push([k, p, dTH(d), R[k][p][d].toFixed(2), com(R[k][p][d])]); }); }); });
    var t = String.fromCharCode(65279) + lines.map(function (r) { return r.map(function (v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv;charset=utf-8' })); a.download = 'ทีมกราฟิก-รอบ' + D.C[0] + '_' + D.C[1] + (S.who ? '-' + S.who : '') + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  function open(el) {
    document.querySelectorAll('[id$="View"]').forEach(function (v) { v.style.display = 'none'; });
    var db = document.querySelector('.dbar'); if (db) db.style.display = 'none';
    var ab = document.getElementById('abar'); if (ab) ab.style.display = 'none';
    document.querySelectorAll('.sb-item').forEach(function (i) { i.classList.remove('active'); });
    var v = document.getElementById('mcView'); if (v) v.style.display = '';
    var it = el || document.getElementById('sb-mgrcom'); if (it) it.classList.add('active');
    css(); render(); window.scrollTo(0, 0);
  }
  window.mcV2 = {
    open: open, csv: csv, render: render,
    set: function (k, v) { S[k] = v; try { localStorage.setItem('rb_mc_v2', JSON.stringify({ who: S.who })); } catch (e) {} render(); window.scrollTo(0, 0); }
  };
  function css() {
    if (document.getElementById('mccss')) return;
    var s = document.createElement('style'); s.id = 'mccss';
    var V = '#mcView#mcView';
    s.textContent = [
      V + '{padding:0!important;background:#F5F6FA!important}',
      V + ' .mc button{font-family:inherit!important}' + V + ' .mc .c2-seg button{border-radius:7px!important}' + V + ' .mc .ai2-btn{border-radius:10px!important}',
      '.mc-people{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}',
      V + ' .mc-p{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;cursor:pointer;padding:14px 16px!important;border:1px solid #E5E7EB!important;border-top:4px solid var(--c)!important;border-radius:14px!important;background:#fff!important;color:#0F172A!important;font:inherit!important}',
      V + ' .mc-p.on{outline:2px solid var(--c);outline-offset:-1px;background:#F8FAFF!important}',
      '.mc-p b{font-size:15px}.mc-big{font-size:22px;font-weight:700;color:#15803D}',
      '.mc-sum td,.mc-sum th{white-space:nowrap}.mc-g{color:#15803D}.mc-tot td{background:#F8FAFC;border-top:2px solid #E2E8F0}',
      V + ' .mc-who{border:0!important;background:var(--c)!important;color:#fff!important;border-radius:99px!important;padding:3px 12px!important;font-weight:700;cursor:pointer;font-size:13px!important}',
      '.mc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px;align-items:start}@media (max-width:600px){.mc-grid{grid-template-columns:minmax(0,1fr)}}',
      '.mc-card{gap:10px}.mc-ch{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.mc-ch h2{margin:4px 0 2px;font-size:18px}',
      '.mc-who2{display:inline-block;padding:1px 10px;border-radius:99px;background:var(--c);color:#fff;font-size:12px;font-weight:700}',
      '.mc-tt{display:flex;flex-direction:column;align-items:flex-end;text-align:right}.mc-tt small{font-size:11px;color:#64748B}.mc-tt b{font-size:22px;color:#15803D}.mc-tt span{font-size:12px;color:#475569}',
      '.mc-next{font-size:12px;color:#1D4ED8;background:#EFF6FF;border-radius:8px;padding:5px 10px}',
      '.mc-t{width:100%;min-width:0}.mc-t td,.mc-t th{padding:7px 8px}.mc-today td{background:#F8FAFC}',
      '.mc-foot{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}.mc-foot details{flex:1;min-width:280px}.mc-foot summary{cursor:pointer}.mc-tier{max-width:360px;margin-top:10px}.mc-tier td:first-child{background:#FDE2E2}.mc-tier td:last-child{background:#FEF7E0}'
    ].join('\n');
    document.head.appendChild(s);
  }
  var tries = 0;
  function install() {
    var it = document.querySelector('.sb-item[onclick^="sbCohort"]') || document.getElementById('sb-mgrcom'), wrap = document.querySelector('.content-wrap');
    if (!it || !wrap || !window.FB_HIERARCHY) return setTimeout(install, 500);
    var navOff = false; try { navOff = localStorage.getItem('rb_nav_v2') === 'off'; } catch (e) {}
    var grouped = it.parentNode && it.parentNode.classList && it.parentNode.classList.contains('v2nav-items');
    if (!grouped && !navOff && ++tries < 30) return setTimeout(install, 500);
    if (document.getElementById('mcView')) return;
    it.id = 'sb-mgrcom';
    it.setAttribute('onclick', 'mcV2.open(this)');
    var sp = [].slice.call(it.querySelectorAll('span')).filter(function (x) { return /Cohort/.test(x.textContent) && !x.querySelector('span'); })[0];
    if (sp) sp.textContent = 'ทีมกราฟิก';
    var v = document.createElement('div'); v.id = 'mcView'; v.style.display = 'none'; wrap.appendChild(v);
    document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('.sb-item'); if (t && t.id !== 'sb-mgrcom') { var mv = document.getElementById('mcView'); if (mv) mv.style.display = 'none'; } }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
