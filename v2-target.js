/* v2-target.js — หน้า "กลุ่มเป้าหมาย · TEST ทุกสัปดาห์" (เขียนใหม่ทั้งหน้า)
   ทีมวิเคราะห์ (มอส / ปาย / บุ๋มบิ๋ม / พิมพ์) บันทึกเทสกลุ่มเป้าหมาย / รูปแบบแอดใหม่ ๆ
   - เพิ่มเทสได้ 2 ทาง: ปุ่ม "+ เพิ่มเทส" ในหน้านี้ หรือปุ่ม "เทส" ในตารางแคมเปญหน้า Facebook Ads
   - ตัวเลขดึงจาก fbDataMap (Facebook) ตามช่วงที่เทส · ระบบเสนอผล ชนะ/แพ้ ตามเกณฑ์ทีม แล้วให้คนเทสกดยืนยัน
   - ข้อมูลเก็บใน ad-tests.json บน GitHub (ทุกเครื่องเห็นเหมือนกัน) */
(function () {
  'use strict';
  var FILE = 'ad-tests.json';
  var API = 'https://api.github.com/repos/ads02-ux/ads-dashboard/contents/' + FILE;
  var ANALYSTS = ['มอส', 'ปาย', 'บุ๋มบิ๋ม', 'พิมพ์'];
  var ACOL = { 'มอส': '#2563EB', 'ปาย': '#0D9488', 'บุ๋มบิ๋ม': '#DB2777', 'พิมพ์': '#7C3AED' };
  var TYPES = ['กลุ่มเป้าหมาย (Interest)', 'Lookalike', 'Broad / Advantage+', 'อายุ / เพศ / พื้นที่', 'รูปแบบแอด', 'Objective / การประมูล', 'Placement', 'คอนเทนต์ / Hook', 'อื่น ๆ'];
  var THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var ST = {
    run: { l: 'กำลังเทส', t: 'none' },
    win: { l: 'ชนะ', t: 'up' },
    loss: { l: 'แพ้', t: 'close' },
    meh: { l: 'ไม่ชัด', t: 'keep' }
  };
  var DATA = null, LOADING = false, ERR = '', SAVING = false;
  var S = { wk: 0, tab: 'week', who: '', q: '', ft: '', fp: '', fs: '' };
  var M = null; // ฟอร์มเพิ่ม/แก้เทส

  /* ---------- เครื่องมือ ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jsq(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' '); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addD(s, n) { var d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); }
  function diffD(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5); }
  function today() { return ymd(new Date()); }
  function dl(s) { if (!s) return '–'; var p = s.split('-'); return +p[2] + ' ' + THM[+p[1] - 1]; }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
  function B(n) { return '฿' + Math.round(n || 0).toLocaleString('en-US'); }
  function I(n) { return Math.round(n || 0).toLocaleString('en-US'); }
  function monday(s) { var d = new Date(s + 'T00:00:00'), w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return ymd(d); }
  function weekOf(off) { var m = addD(monday(today()), -7 * off); return [m, addD(m, 6)]; }
  function user() { try { return sessionStorage.getItem('rb_username') || 'ไม่ทราบชื่อ'; } catch (e) { return 'ไม่ทราบชื่อ'; } }
  function pat() { try { return localStorage.getItem('_ghPAT') || (window._nw ? window._nw.join('') : ''); } catch (e) { return ''; } }
  function hdr(raw) { return { Authorization: 'token ' + pat(), Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json' }; }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function uid() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---------- บัญชี / แคมเปญ ---------- */
  function accInfo() {
    var m = {};
    (window.FB_HIERARCHY || []).forEach(function (p, pi) { (p.pages || []).forEach(function (pg) { (pg.accounts || []).forEach(function (h) { (h.adAccounts || []).forEach(function (a) { if (!m[a]) m[a] = { pi: pi, prod: p.product, page: pg.name, mgr: (!pg.manager || pg.manager === '-') ? '' : pg.manager, disp: h.displayName || a }; }); }); }); });
    return m;
  }
  var AI = null;
  function info(acc) { if (!AI) AI = accInfo(); return AI[acc] || { pi: -1, prod: '', page: '', mgr: '', disp: acc }; }
  function campStart(acc, name) {
    var c = ((window.fbCampaignsMap || {})[acc] || {})[name];
    if (c && c.start_time) return String(c.start_time).slice(0, 10);
    var f = ''; ((window.fbDataMap || {})[acc] || []).forEach(function (r) { if (r.campaign === name && num(r.spend) > 0 && (!f || r.date < f)) f = r.date; });
    return f || today();
  }
  var MDD = null;
  function minDataDate() { if (MDD !== null) return MDD; var m = ''; for (var k in (window.fbDataMap || {})) (fbDataMap[k] || []).forEach(function (x) { if (x.date && (!m || x.date < m)) m = x.date; }); MDD = m; setTimeout(function () { MDD = null; }, 60000); return m; }

  /* ---------- ตัวเลขของเทส ---------- */
  function metrics(t) {
    var from = t.start, to = addD(t.start, (t.days || 3) - 1), now = today(), end = to < now ? to : now;
    var a = { s: 0, v: 0, ch: 0, b: 0, imp: 0, clk: 0, days: {} };
    var md = minDataDate();
    (t.camps || []).forEach(function (c) {
      ((window.fbDataMap || {})[c.acc] || []).forEach(function (r) {
        if (r.campaign !== c.name || r.date < from || r.date > end) return;
        a.s += num(r.spend); a.v += num(r.revenue); a.ch += num(r.conversations); a.b += num(r.purchases); a.imp += num(r.impressions); a.clk += num(r.clicks);
        if (num(r.spend) > 0) a.days[r.date] = 1;
      });
    });
    a.nd = Object.keys(a.days).length;
    a.elapsed = Math.max(0, Math.min(t.days || 3, diffD(from, now) + 1));
    a.complete = now > to;
    a.roas = a.s ? a.v / a.s : 0; a.cpa = a.b ? a.s / a.b : 0; a.cpc = a.ch ? a.s / a.ch : 0; a.ctr = a.imp ? a.clk / a.imp * 100 : 0;
    a.noData = md && from < md; // เทสเก่ากว่าข้อมูลที่มี
    if (t.snap && (a.noData || (!a.s && t.snap.s))) { var s = t.snap; a = { s: s.s, v: s.v, ch: s.ch, b: s.b, imp: s.imp || 0, clk: s.clk || 0, nd: s.nd || 0, elapsed: t.days, complete: true, roas: s.s ? s.v / s.s : 0, cpa: s.b ? s.s / s.b : 0, cpc: s.ch ? s.s / s.ch : 0, ctr: s.imp ? (s.clk || 0) / s.imp * 100 : 0, snap: true }; }
    return a;
  }
  // เสนอผลตามเกณฑ์ทีม
  function suggest(t, a) {
    if (!a.s) return { k: 'run', why: a.elapsed ? 'ยังไม่ใช้เงิน' : 'ยังไม่เริ่ม' };
    if (a.roas >= 2) return { k: 'win', why: 'ROAS ' + a.roas.toFixed(2) + ' ≥ 2' };
    if (a.b >= 2 && a.cpa <= 200) return { k: 'win', why: 'ต้นทุน/ซื้อ ' + B(a.cpa) + ' ≤ ฿200' };
    if (!a.b && a.s >= 1000) return { k: 'loss', why: 'ใช้ ' + B(a.s) + ' ยังไม่มีคนซื้อ' };
    if (a.roas < 1 && a.s >= 500) return { k: 'loss', why: 'ROAS ' + a.roas.toFixed(2) + ' < 1' };
    if (!a.complete) return { k: 'run', why: 'วันที่ ' + a.elapsed + '/' + (t.days || 3) + ' · ROAS ' + (a.roas ? a.roas.toFixed(2) : '–') };
    return { k: 'meh', why: 'ROAS ' + a.roas.toFixed(2) + ' (1–2)' };
  }

  /* ---------- โหลด / บันทึก (GitHub) ---------- */
  function load(quiet) {
    if (LOADING) return Promise.resolve();
    LOADING = true;
    var u = API + '?ref=main&t=' + Date.now();
    return fetch(u, { headers: hdr(true), cache: 'no-store' }).then(function (r) {
      LOADING = false;
      if (r.status === 404) { DATA = { tests: [], _history: [] }; ERR = ''; render(); return; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json().then(function (j) { ERR = ''; j.tests = j.tests || []; j._history = j._history || []; var ch = JSON.stringify(j) !== JSON.stringify(DATA); DATA = j; if (ch || !quiet) render(); });
    }).catch(function (e) { LOADING = false; ERR = 'โหลดรายการเทสไม่สำเร็จ (' + e.message + ')'; render(); });
  }
  function save(mutate, note) {
    SAVING = true; render();
    function attempt(n) {
      var u = API + '?ref=main&t=' + Date.now();
      return Promise.all([
        fetch(u, { headers: hdr(false), cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }),
        fetch(u, { headers: hdr(true), cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
      ]).then(function (res) {
        var remote = res[1] || { tests: [], _history: [] };
        remote.tests = remote.tests || []; remote._history = remote._history || [];
        mutate(remote);
        remote._history.push({ t: new Date().toISOString(), by: user(), txt: note });
        if (remote._history.length > 400) remote._history = remote._history.slice(-400);
        var body = { message: 'ad-tests: ' + note.slice(0, 60), content: b64(JSON.stringify(remote, null, 1)) };
        if (res[0] && res[0].sha) body.sha = res[0].sha;
        return fetch(API, { method: 'PUT', headers: { Authorization: 'token ' + pat(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) {
          if (r.ok) { DATA = remote; return true; }
          if ((r.status === 409 || r.status === 422) && n < 3) return attempt(n + 1);
          throw new Error('HTTP ' + r.status);
        });
      });
    }
    return attempt(0).then(function () { SAVING = false; render(); markRows(); toast('บันทึกแล้ว — ทุกเครื่องเห็นเหมือนกัน'); return true; })
      .catch(function (e) { SAVING = false; render(); toast('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง (' + e.message + ')', true); return false; });
  }
  function toast(t, bad) {
    var el = document.getElementById('tgToast');
    if (!el) { el = document.createElement('div'); el.id = 'tgToast'; document.body.appendChild(el); }
    el.textContent = t; el.className = 'on' + (bad ? ' bad' : '');
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.className = ''; }, 3500);
  }

  /* ---------- หน้า ---------- */
  function ownerChip(o) { return '<span class="tg-own" style="--c:' + (ACOL[o] || '#475569') + '">' + esc(o || '–') + '</span>'; }
  function stTag(k) { var s = ST[k] || ST.run; return '<span class="ai2-tag ' + s.t + '">' + s.l + '</span>'; }
  function tests() { return (DATA && DATA.tests) || []; }
  function inWeek(t, w) { return t.start >= w[0] && t.start <= w[1]; }

  function render() {
    var box = document.getElementById('tgView'); if (!box || box.style.display === 'none') return;
    var h = '<div class="c2-wrap ai2 tg">';
    var W = weekOf(S.wk);
    h += '<div class="c2-head"><div><h1>กลุ่มเป้าหมาย · เทสทุกอาทิตย์</h1><div class="c2-subhead">ทีมวิเคราะห์บันทึกสิ่งที่เทสใน Facebook (กลุ่มเป้าหมาย / รูปแบบแอดใหม่) · ตัวเลขดึงจาก Facebook อัตโนมัติ · ระบบเสนอผล คนเทสกดยืนยัน</div></div>' +
      '<div class="tg-headr"><div class="c2-seg" role="group" aria-label="สัปดาห์">' + [0, 1, 2, 3].map(function (i) { var w = weekOf(i); return '<button class="' + (S.wk === i ? 'on' : '') + '" onclick="tgV2.set(\'wk\',' + i + ')">' + (i === 0 ? 'อาทิตย์นี้' : i === 1 ? 'อาทิตย์ก่อน' : dl(w[0]) + '–' + dl(w[1])) + '</button>'; }).join('') + '</div>' +
      '<button class="ai2-btn pri" onclick="tgV2.add()">+ เพิ่มเทส</button></div></div>';
    if (ERR) h += '<div class="ai2-banner bad"><b>' + esc(ERR) + '</b><span><button class="c2-link" onclick="tgV2.reload()">ลองใหม่</button></span></div>';
    if (!DATA) { load(); box.innerHTML = h + '<div class="c2-card c2-empty">กำลังโหลดรายการเทส…</div></div>'; return; }
    if (!window.fbDataMap) { box.innerHTML = h + '<div class="c2-card c2-empty">กำลังโหลดข้อมูล Facebook…</div></div>'; setTimeout(render, 1500); return; }
    AI = accInfo();
    var all = tests().map(function (t) { var a = metrics(t), sg = suggest(t, a); return { t: t, a: a, sg: sg, st: t.status || 'run' }; });
    var wk = all.filter(function (x) { return inWeek(x.t, W); });

    // การ์ดรายคน
    var names = ANALYSTS.slice(); all.forEach(function (x) { if (x.t.owner && names.indexOf(x.t.owner) < 0) names.push(x.t.owner); });
    h += '<div class="tg-people">' + names.map(function (n) {
      var m = wk.filter(function (x) { return x.t.owner === n; }), c = { win: 0, loss: 0, meh: 0, run: 0 }, sp = 0;
      m.forEach(function (x) { c[x.st] = (c[x.st] || 0) + 1; sp += x.a.s; });
      var on = S.who === n;
      return '<button class="c2-card tg-person' + (on ? ' on' : '') + (m.length ? '' : ' zero') + '" style="--c:' + (ACOL[n] || '#475569') + '" onclick="tgV2.set(\'who\',\'' + (on ? '' : jsq(n)) + '\')">' +
        '<div class="tg-ph"><i>' + esc(n.slice(0, 1)) + '</i><b>' + esc(n) + '</b></div>' +
        '<div class="tg-pn">' + m.length + ' <small>เทส</small></div>' +
        (m.length ? '<div class="tg-pr"><span class="w">ชนะ ' + c.win + '</span><span class="l">แพ้ ' + c.loss + '</span><span>ไม่ชัด ' + c.meh + '</span><span>รอผล ' + c.run + '</span></div><div class="c2-dim ai2-sm">ค่าแอดที่ใช้เทส ' + B(sp) + '</div>' : '<div class="tg-warn">ยังไม่ได้เทส' + (S.wk === 0 ? 'อาทิตย์นี้' : 'ในอาทิตย์นี้') + '</div>') +
        '</button>';
    }).join('') + '</div>';

    // แท็บ
    var pend = all.filter(function (x) { return x.st === 'run'; });
    var wins = all.filter(function (x) { return x.st === 'win'; });
    var TABS = [['week', 'เทสของอาทิตย์ที่เลือก (' + wk.length + ')'], ['pending', 'รอสรุปผล (' + pend.length + ')'], ['win', 'ชนะ → ขยายต่อ (' + wins.length + ')'], ['all', 'คลังเทสทั้งหมด (' + all.length + ')']];
    h += '<div class="tg-bar"><div class="c2-seg">' + TABS.map(function (x) { return '<button class="' + (S.tab === x[0] ? 'on' : '') + '" onclick="tgV2.set(\'tab\',\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<input class="ai2-q" type="search" placeholder="ค้นหา สิ่งที่เทส / แคมเปญ / สินค้า" value="' + esc(S.q) + '" oninput="tgV2.q(this.value)"></div>';

    var list = S.tab === 'week' ? wk : S.tab === 'pending' ? pend : S.tab === 'win' ? wins : all;
    if (S.tab === 'all') {
      var prods = {}; all.forEach(function (x) { if (x.t.prod) prods[x.t.prod] = 1; });
      h += '<div class="tg-filt"><label>ประเภท<select onchange="tgV2.set(\'ft\',this.value)"><option value="">ทั้งหมด</option>' + TYPES.map(function (t) { return '<option' + (S.ft === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></label>' +
        '<label>สินค้า<select onchange="tgV2.set(\'fp\',this.value)"><option value="">ทั้งหมด</option>' + Object.keys(prods).sort().map(function (p) { return '<option' + (S.fp === p ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') + '</select></label>' +
        '<label>ผล<select onchange="tgV2.set(\'fs\',this.value)"><option value="">ทั้งหมด</option>' + Object.keys(ST).map(function (k) { return '<option value="' + k + '"' + (S.fs === k ? ' selected' : '') + '>' + ST[k].l + '</option>'; }).join('') + '</select></label></div>';
    }
    var q = S.q.toLowerCase();
    list = list.filter(function (x) {
      var t = x.t;
      if (S.who && t.owner !== S.who) return false;
      if (S.tab === 'all') { if (S.ft && t.type !== S.ft) return false; if (S.fp && t.prod !== S.fp) return false; if (S.fs && x.st !== S.fs) return false; }
      if (q && ((t.what || '') + ' ' + (t.detail || '') + ' ' + (t.compare || '') + ' ' + (t.prod || '') + ' ' + (t.type || '') + ' ' + (t.camps || []).map(function (c) { return c.name + ' ' + c.acc; }).join(' ')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    list.sort(function (a, b) { return (b.t.start || '').localeCompare(a.t.start || '') || (b.t.created || '').localeCompare(a.t.created || ''); });

    if (S.tab === 'week') h += '<div class="c2-note tg-wkn">อาทิตย์ ' + dl(W[0]) + ' – ' + dl(W[1]) + ' · นับเทสที่เริ่มยิงในอาทิตย์นี้' + (S.who ? ' · ของ ' + esc(S.who) + ' <button class="c2-link" onclick="tgV2.set(\'who\',\'\')">ดูทุกคน ✕</button>' : '') + '</div>';
    if (S.tab === 'pending') h += '<div class="c2-note tg-wkn">เทสที่ยังไม่ได้กดยืนยันผล · ระบบเสนอผลเมื่อมีสัญญาณชัด (ROAS ≥ 2 หรือ ต้นทุน/ซื้อ ≤ ฿200 = ชนะ · ใช้ ≥ ฿1,000 ไม่มีคนซื้อ หรือ ROAS &lt; 1 = แพ้) · ถ้าครบจำนวนวันแล้ว ROAS 1–2 = ไม่ชัด</div>';
    if (S.tab === 'win') h += '<div class="c2-note tg-wkn">เทสที่ชนะ · เอาไปใช้กับสินค้า / เพจอื่นได้ · กด "นำไปขยายแล้ว" เมื่อทีมเอาไปใช้ต่อ</div>';

    if (!list.length) h += '<div class="c2-card c2-empty">' + (all.length ? 'ไม่มีเทสตามตัวกรองนี้' : 'ยังไม่มีเทส · กด "+ เพิ่มเทส" หรือกดปุ่ม "เทส" ในตารางแคมเปญหน้า Facebook Ads') + '</div>';
    else h += '<div class="tg-list">' + list.map(card).join('') + '</div>';
    h += '</div>';
    box.innerHTML = h + (SAVING ? '<div class="tg-saving">กำลังบันทึก…</div>' : '');
    var qi = box.querySelector('.ai2-q'); if (qi && S._f) { qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); S._f = false; }
  }

  function card(x) {
    var t = x.t, a = x.a, sg = x.sg, st = x.st, id = jsq(t.id);
    var h = '<article class="c2-card tg-card st-' + st + '">';
    h += '<div class="tg-top"><div class="tg-tl">' + ownerChip(t.owner) + '<span class="tg-type">' + esc(t.type || 'อื่น ๆ') + '</span>' + stTag(st) + (t.scaled ? '<span class="ai2-tag up">ขยายแล้ว</span>' : '') + '</div>' +
      '<div class="tg-act"><button onclick="tgV2.edit(\'' + id + '\')">แก้ไข</button><button onclick="tgV2.del(\'' + id + '\')">ลบ</button></div></div>';
    h += '<h3 class="tg-what">' + esc(t.what || '(ไม่ได้ระบุ)') + '</h3>';
    if (t.detail || t.compare) h += '<div class="tg-det">' + (t.detail ? '<div><small>รายละเอียด</small>' + esc(t.detail) + '</div>' : '') + (t.compare ? '<div><small>เทียบกับ</small>' + esc(t.compare) + '</div>' : '') + '</div>';
    var pi = info(((t.camps || [])[0] || {}).acc || '');
    h += '<div class="tg-meta"><span><b>' + esc(t.prod || pi.prod || '–') + '</b>' + (pi.page ? ' · ' + esc(pi.page) : '') + (pi.mgr ? ' <span class="tg-mgr">ผู้ดูแลเพจ ' + esc(pi.mgr) + '</span>' : '') + '</span>' +
      '<span>เริ่ม ' + dl(t.start) + ' · ดูผล ' + (t.days || 3) + ' วัน (' + dl(t.start) + '–' + dl(addD(t.start, (t.days || 3) - 1)) + ')</span><span class="c2-dim">บันทึกโดย ' + esc(t.by || '') + '</span></div>';
    h += '<div class="tg-camps">' + (t.camps || []).map(function (c) { var ii = info(c.acc); return '<div><span class="tg-cn" title="' + esc(c.name) + '">' + esc(c.name) + '</span><span class="c2-dim ai2-sm">' + esc(ii.disp || c.acc) + '</span></div>'; }).join('') + '</div>';
    h += '<div class="tg-kpi"><div><small>ค่าแอด</small><b>' + (a.s ? B(a.s) : '–') + '</b></div><div><small>ยอดขาย (FB)</small><b>' + (a.v ? B(a.v) : '–') + '</b></div>' +
      '<div><small>ROAS</small><b class="' + (a.roas >= 2 ? 'g' : a.roas >= 1 ? 'w' : a.s ? 'b' : '') + '">' + (a.s ? a.roas.toFixed(2) : '–') + '</b></div>' +
      '<div><small>ซื้อ · ต้นทุน/ซื้อ</small><b>' + I(a.b) + ' · ' + (a.b ? B(a.cpa) : '–') + '</b></div><div><small>ทัก · ต้นทุน/ทัก</small><b>' + I(a.ch) + ' · ' + (a.ch ? B(a.cpc) : '–') + '</b></div>' +
      '<div><small>CTR</small><b>' + (a.imp ? a.ctr.toFixed(2) + '%' : '–') + '</b></div></div>';
    if (a.snap) h += '<div class="c2-note">ตัวเลขที่บันทึกไว้ตอนยืนยันผล (ข้อมูล Facebook ย้อนหลังไม่ถึงช่วงนี้แล้ว)</div>';
    // ผล
    h += '<div class="tg-res">';
    if (st === 'run') {
      h += '<div class="tg-sug sg-' + sg.k + '"><small>ระบบเสนอ</small><b>' + (sg.k === 'run' ? 'ยังรอผล' : ST[sg.k].l) + '</b><span>' + esc(sg.why) + '</span></div>' +
        '<div class="tg-conf"><span class="c2-dim ai2-sm">ยืนยันผล:</span>' + ['win', 'loss', 'meh'].map(function (k) { return '<button class="' + k + (sg.k === k ? ' hint' : '') + '" onclick="tgV2.verdict(\'' + id + '\',\'' + k + '\')">' + ST[k].l + '</button>'; }).join('') + '</div>';
    } else {
      h += '<div class="tg-sug sg-' + st + '"><small>ผลที่ยืนยัน</small><b>' + ST[st].l + '</b><span>' + esc(t.vBy || '') + (t.vAt ? ' · ' + dl(String(t.vAt).slice(0, 10)) : '') + (t.vNote ? ' · ' + esc(t.vNote) : '') + '</span></div>' +
        '<div class="tg-conf"><button class="c2-link" onclick="tgV2.verdict(\'' + id + '\',\'run\')">เปลี่ยนผล</button>' +
        (st === 'win' ? (t.scaled ? '<span class="tg-scaled">ขยายแล้ว: ' + esc(t.scaled.note || '') + ' <small>(' + esc(t.scaled.by || '') + ')</small></span><button class="c2-link" onclick="tgV2.scale(\'' + id + '\',0)">ยกเลิก</button>' : '<button class="pri" onclick="tgV2.scale(\'' + id + '\',1)">นำไปขยายแล้ว</button>') : '') + '</div>';
    }
    h += '</div>';
    if (t.note) h += '<div class="tg-note"><small>บันทึก</small>' + esc(t.note) + '</div>';
    return h + '</article>';
  }

  /* ---------- ฟอร์มเพิ่ม / แก้เทส ---------- */
  function campList(prod, q) {
    var info0 = AI || accInfo(), out = [], from = addD(today(), -30), seen = {};
    Object.keys(window.fbDataMap || {}).forEach(function (acc) {
      var ii = info0[acc]; if (!ii) return; if (prod && ii.prod !== prod) return;
      (fbDataMap[acc] || []).forEach(function (r) {
        if (r.date < from) return; var k = acc + '|' + r.campaign;
        var o = seen[k] || (seen[k] = { acc: acc, name: r.campaign, s: 0, last: '', first: r.date }); o.s += num(r.spend); if (r.date > o.last) o.last = r.date; if (r.date < o.first) o.first = r.date;
      });
    });
    Object.keys(seen).forEach(function (k) { out.push(seen[k]); });
    q = (q || '').toLowerCase();
    if (q) out = out.filter(function (o) { return (o.name + ' ' + o.acc + ' ' + (info0[o.acc] || {}).page).toLowerCase().indexOf(q) >= 0; });
    out.sort(function (a, b) { return b.first.localeCompare(a.first) || b.s - a.s; });
    return out.slice(0, 40);
  }
  function openForm(t) {
    AI = accInfo();
    M = t ? JSON.parse(JSON.stringify(t)) : { id: '', owner: lsGet('rb_tg_owner', ''), type: '', what: '', detail: '', compare: '', note: '', camps: [], start: today(), days: 3, prod: '' };
    M._cq = ''; M._cp = M.prod || '';
    drawForm();
  }
  function drawForm() {
    var ov = document.getElementById('tgModal');
    if (!ov) { ov = document.createElement('div'); ov.id = 'tgModal'; ov.onclick = function (e) { if (e.target === ov) close(); }; document.body.appendChild(ov); }
    ov.style.display = 'flex';
    var prods = (window.FB_HIERARCHY || []).map(function (p) { return p.product; });
    var h = '<div class="tgm-box" role="dialog" aria-label="' + (M.id ? 'แก้ไขเทส' : 'เพิ่มเทส') + '"><div class="tgm-head"><b>' + (M.id ? 'แก้ไขเทส' : 'เพิ่มเทสใหม่') + '</b><button class="tgm-x" aria-label="ปิด" onclick="tgV2.close()">✕</button></div><div class="tgm-body">';
    h += '<div class="tgm-f"><label>ใครเทส <em>*</em></label><div class="tgm-chips">' + ANALYSTS.map(function (n) { return '<button class="' + (M.owner === n ? 'on' : '') + '" style="--c:' + ACOL[n] + '" onclick="tgV2.f(\'owner\',\'' + jsq(n) + '\')">' + esc(n) + '</button>'; }).join('') + '</div></div>';
    h += '<div class="tgm-f"><label>เทสอะไร (ประเภท) <em>*</em></label><div class="tgm-chips">' + TYPES.map(function (n) { return '<button class="' + (M.type === n ? 'on' : '') + '" onclick="tgV2.f(\'type\',\'' + jsq(n) + '\')">' + esc(n) + '</button>'; }).join('') + '</div></div>';
    h += '<div class="tgm-f"><label for="tgWhat">สิ่งที่เทส <em>*</em></label><input id="tgWhat" value="' + esc(M.what) + '" placeholder="เช่น Interest สายฟิตเนส ชาย 35–55 / Advantage+ ไม่ล็อกอายุ" oninput="tgV2.fi(\'what\',this.value)"></div>';
    h += '<div class="tgm-2"><div class="tgm-f"><label for="tgDet">รายละเอียด</label><textarea id="tgDet" rows="2" placeholder="interest ที่ใช้ อายุ เพศ พื้นที่ งบ/วัน ฯลฯ" oninput="tgV2.fi(\'detail\',this.value)">' + esc(M.detail) + '</textarea></div>' +
      '<div class="tgm-f"><label for="tgCmp">เทียบกับ</label><textarea id="tgCmp" rows="2" placeholder="เช่น กลุ่มเดิม Broad ชาย 30+ ROAS ~1.8" oninput="tgV2.fi(\'compare\',this.value)">' + esc(M.compare) + '</textarea></div></div>';
    // แคมเปญ
    h += '<div class="tgm-f"><label>แคมเปญที่ใช้เทส <em>*</em> <span class="c2-dim">(เลือกได้หลายตัว)</span></label>';
    h += '<div class="tgm-sel">' + (M.camps.length ? M.camps.map(function (c, i) { var ii = info(c.acc); return '<div><span><b>' + esc(c.name) + '</b><small>' + esc(ii.prod) + ' · ' + esc(ii.page) + ' · ' + esc(ii.disp) + '</small></span><button aria-label="เอาออก" onclick="tgV2.rm(' + i + ')">✕</button></div>'; }).join('') : '<div class="c2-dim">ยังไม่ได้เลือก — ค้นหาแล้วกดเพิ่มด้านล่าง</div>') + '</div>';
    h += '<div class="tgm-pick"><select onchange="tgV2.fp(this.value)"><option value="">ทุกสินค้า</option>' + prods.map(function (p) { return '<option' + (M._cp === p ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') + '</select><input id="tgCq" type="search" placeholder="ค้นหาชื่อแคมเปญ / บัญชี" value="' + esc(M._cq) + '" oninput="tgV2.cq(this.value)"></div>';
    h += '<div class="tgm-list" id="tgCl">' + campRows() + '</div></div>';
    h += '<div class="tgm-2"><div class="tgm-f"><label for="tgStart">วันเริ่มเทส</label><input id="tgStart" type="date" value="' + esc(M.start) + '" onchange="tgV2.fi(\'start\',this.value)"></div>' +
      '<div class="tgm-f"><label>ดูผลกี่วัน</label><div class="tgm-chips">' + [3, 5, 7].map(function (d) { return '<button class="' + (+M.days === d ? 'on' : '') + '" onclick="tgV2.f(\'days\',' + d + ')">' + d + ' วัน</button>'; }).join('') + '</div></div></div>';
    h += '<div class="tgm-f"><label for="tgNote">บันทึกเพิ่ม</label><textarea id="tgNote" rows="2" placeholder="ข้อสังเกต / สิ่งที่เรียนรู้" oninput="tgV2.fi(\'note\',this.value)">' + esc(M.note) + '</textarea></div>';
    var sim = similar(); if (sim.length) h += '<div class="tgm-sim"><b>เคยเทสคล้ายกัน</b>' + sim.map(function (x) { return '<div>' + ownerChip(x.t.owner) + ' ' + stTag(x.t.status || 'run') + ' <span>' + esc(x.t.what) + '</span> <small class="c2-dim">' + esc(x.t.prod || '') + ' · ' + dl(x.t.start) + '</small></div>'; }).join('') + '</div>';
    h += '</div><div class="tgm-foot"><span id="tgErr" class="tgm-err"></span><button class="ai2-btn" onclick="tgV2.close()">ยกเลิก</button><button class="ai2-btn pri" onclick="tgV2.submit()"' + (SAVING ? ' disabled' : '') + '>' + (M.id ? 'บันทึกการแก้ไข' : 'บันทึกเทส') + '</button></div></div>';
    ov.innerHTML = h;
  }
  function campRows() {
    var have = {}; M.camps.forEach(function (c) { have[c.acc + '|' + c.name] = 1; });
    var L = campList(M._cp, M._cq);
    if (!L.length) return '<div class="c2-dim">ไม่พบแคมเปญที่มีค่าแอดใน 30 วัน</div>';
    return L.map(function (o) { var ii = info(o.acc), k = o.acc + '|' + o.name, on = have[k]; return '<button class="' + (on ? 'on' : '') + '" onclick="tgV2.pick(\'' + jsq(o.acc) + '\',\'' + jsq(o.name) + '\')"><span><b>' + esc(o.name) + '</b><small>' + esc(ii.prod) + ' · ' + esc(ii.disp) + ' · เริ่ม ' + dl(o.first) + ' · ' + B(o.s) + '</small></span><i>' + (on ? '✓' : '+') + '</i></button>'; }).join('');
  }
  function similar() {
    if (!M.type && !M.what) return [];
    var w = (M.what || '').toLowerCase().split(/\s+/).filter(function (x) { return x.length >= 3; });
    var prod = M.prod || M._cp;
    return tests().filter(function (t) { if (t.id === M.id) return false; var sc = 0; if (M.type && t.type === M.type) sc++; if (prod && t.prod === prod) sc++; var tw = (t.what + ' ' + (t.detail || '')).toLowerCase(); w.forEach(function (x) { if (tw.indexOf(x) >= 0) sc += 2; }); return sc >= 2; }).map(function (t) { return { t: t }; }).slice(0, 5);
  }
  function close() { var ov = document.getElementById('tgModal'); if (ov) { ov.style.display = 'none'; ov.innerHTML = ''; } M = null; }
  function submit() {
    var e = document.getElementById('tgErr');
    var miss = !M.owner ? 'เลือกคนเทส' : !M.type ? 'เลือกประเภท' : !String(M.what).trim() ? 'ใส่สิ่งที่เทส' : !M.camps.length ? 'เลือกแคมเปญอย่างน้อย 1 ตัว' : !M.start ? 'ใส่วันเริ่มเทส' : '';
    if (miss) { if (e) e.textContent = miss; return; }
    lsSet('rb_tg_owner', M.owner);
    var rec = { owner: M.owner, type: M.type, what: String(M.what).trim(), detail: String(M.detail || '').trim(), compare: String(M.compare || '').trim(), note: String(M.note || '').trim(), camps: M.camps.map(function (c) { return { acc: c.acc, name: c.name }; }), start: M.start, days: +M.days || 3, prod: info(M.camps[0].acc).prod };
    var isNew = !M.id, id = M.id || uid(), who = user();
    close();
    save(function (D) {
      if (isNew) { rec.id = id; rec.status = 'run'; rec.by = who; rec.created = new Date().toISOString(); D.tests.push(rec); }
      else { var t = D.tests.filter(function (x) { return x.id === id; })[0]; if (t) { for (var k in rec) t[k] = rec[k]; t.edited = new Date().toISOString(); t.editBy = who; } }
    }, (isNew ? 'เพิ่มเทส ' : 'แก้เทส ') + rec.owner + ' · ' + rec.what);
  }
  function byId(id) { return tests().filter(function (t) { return t.id === id; })[0]; }

  /* ---------- ปุ่มเทสในหน้า Facebook Ads ---------- */
  function testedSet() { var m = {}; tests().forEach(function (t) { (t.camps || []).forEach(function (c) { m[c.acc + '|' + c.name] = t; }); }); return m; }
  function markRows() {
    var rows = document.querySelectorAll('table.v2-camp tbody tr[data-camp]'); if (!rows.length) return;
    var acc = window.fbAccount; if (!acc) return;
    var T = testedSet();
    rows.forEach(function (tr) {
      var name = tr.getAttribute('data-camp'), td = tr.querySelector('td.v2-btns'); if (!td) return;
      var b = td.querySelector('.tg-fbb');
      if (!b) { b = document.createElement('button'); b.className = 'tg-fbb'; b.onclick = function (e) { e.stopPropagation(); quickAdd(window.fbAccount, tr.getAttribute('data-camp')); }; td.appendChild(b); }
      var t = T[acc + '|' + name];
      var lb = t ? 'เทส ✓' : 'เทส', tt = t ? 'อยู่ในเทส: ' + (t.owner || '') + ' · ' + (t.what || '') : 'ส่งแคมเปญนี้เข้าหน้ากลุ่มเป้าหมาย (เทส)';
      if (b.textContent !== lb) b.textContent = lb; if (b.title !== tt) b.title = tt; if (b.classList.contains('on') !== !!t) b.classList.toggle('on', !!t);
    });
  }
  function quickAdd(acc, name) {
    if (!acc || !name) return;
    css();
    var go = function () {
      var t = testedSet()[acc + '|' + name];
      if (t) { openForm(t); return; }
      openForm(null); M.camps = [{ acc: acc, name: name }]; M.start = campStart(acc, name); M.prod = info(acc).prod; M._cp = M.prod; drawForm();
    };
    if (!DATA) load(true).then(go); else go();
  }

  /* ---------- เปิดหน้า / ติดตั้ง ---------- */
  function open(el) {
    document.querySelectorAll('[id$="View"]').forEach(function (v) { v.style.display = 'none'; });
    var db = document.querySelector('.dbar'); if (db) db.style.display = 'none';
    var ab = document.getElementById('abar'); if (ab) ab.style.display = 'none';
    document.querySelectorAll('.sb-item').forEach(function (i) { i.classList.remove('active'); });
    var v = document.getElementById('tgView'); if (v) v.style.display = '';
    var it = el || document.getElementById('sb-home'); if (it) it.classList.add('active');
    css(); render(); load(true); window.scrollTo(0, 0);
  }
  var qT, cqT;
  window.tgV2 = {
    open: open, reload: function () { DATA = null; render(); },
    set: function (k, v) { S[k] = v; render(); if (k === 'wk' || k === 'tab') window.scrollTo(0, 0); },
    q: function (v) { S.q = v; clearTimeout(qT); qT = setTimeout(function () { S._f = true; render(); }, 250); },
    add: function () { css(); openForm(null); },
    edit: function (id) { var t = byId(id); if (t) openForm(t); },
    del: function (id) {
      var t = byId(id); if (!t) return;
      if (!window.confirm('ลบเทส "' + t.what + '" ของ ' + t.owner + '?\nลบแล้วกู้คืนไม่ได้')) return;
      save(function (D) { D.tests = D.tests.filter(function (x) { return x.id !== id; }); }, 'ลบเทส ' + t.owner + ' · ' + t.what);
    },
    verdict: function (id, k) {
      var t = byId(id); if (!t) return;
      var a = metrics(t), who = user();
      save(function (D) {
        var x = D.tests.filter(function (y) { return y.id === id; })[0]; if (!x) return;
        x.status = k;
        if (k === 'run') { delete x.vBy; delete x.vAt; delete x.snap; delete x.scaled; }
        else { x.vBy = who; x.vAt = new Date().toISOString(); if (a.s && !a.snap) x.snap = { s: Math.round(a.s), v: Math.round(a.v), ch: a.ch, b: a.b, imp: a.imp, clk: a.clk, nd: a.nd }; }
      }, 'ผลเทส ' + (ST[k] || {}).l + ' · ' + t.owner + ' · ' + t.what);
    },
    scale: function (id, on) {
      var t = byId(id); if (!t) return;
      var note = '';
      if (on) { note = window.prompt('นำไปขยายที่ไหน? (เช่น ใช้กับ JUDO ทุกเพจ / เพิ่มงบ 3 เท่า)', ''); if (note === null) return; }
      var who = user();
      save(function (D) { var x = D.tests.filter(function (y) { return y.id === id; })[0]; if (!x) return; if (on) x.scaled = { note: note, by: who, at: new Date().toISOString() }; else delete x.scaled; }, (on ? 'ขยายผล ' : 'ยกเลิกขยาย ') + t.what);
    },
    // ฟอร์ม
    f: function (k, v) { if (!M) return; M[k] = v; drawForm(); },
    fi: function (k, v) { if (M) M[k] = v; },
    fp: function (v) { if (!M) return; M._cp = v; var cl = document.getElementById('tgCl'); if (cl) cl.innerHTML = campRows(); },
    cq: function (v) { if (!M) return; M._cq = v; clearTimeout(cqT); cqT = setTimeout(function () { var cl = document.getElementById('tgCl'); if (cl) cl.innerHTML = campRows(); }, 200); },
    pick: function (acc, name) {
      if (!M) return; var i = -1; M.camps.forEach(function (c, j) { if (c.acc === acc && c.name === name) i = j; });
      if (i >= 0) M.camps.splice(i, 1); else { M.camps.push({ acc: acc, name: name }); if (M.camps.length === 1 && !M.id) { M.start = campStart(acc, name); M.prod = info(acc).prod; } }
      drawForm();
    },
    rm: function (i) { if (M) { M.camps.splice(i, 1); drawForm(); } },
    submit: submit, close: close, quick: quickAdd, mark: markRows
  };

  function css() {
    if (document.getElementById('tgcss')) return;
    var s = document.createElement('style'); s.id = 'tgcss';
    var V = '#tgView#tgView';
    s.textContent = [
      V + '{padding:0!important;background:#F5F6FA!important}',
      V + ' .tg button{font-family:inherit!important}' + V + ' .tg .c2-seg button{border-radius:7px!important}' + V + ' .tg .ai2-btn{border-radius:10px!important}',
      V + ' .tg input,' + V + ' .tg select{border:1px solid #D7DBE3!important;border-radius:8px!important;background:#fff!important}',
      '.tg-headr{display:flex;flex-wrap:wrap;gap:10px;align-items:center}',
      '.tg-people{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}',
      V + ' .tg-person{display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;cursor:pointer;padding:16px 18px!important;border:1px solid #E5E7EB!important;border-top:4px solid var(--c)!important;border-radius:14px!important;background:#fff!important;color:#0F172A!important;font:inherit!important}',
      V + ' .tg-person.on{outline:2px solid var(--c);outline-offset:-1px;background:#F8FAFF!important}',
      '.tg-ph{display:flex;align-items:center;gap:10px}.tg-ph i{width:32px;height:32px;border-radius:99px;background:var(--c);color:#fff;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:700}.tg-ph b{font-size:16px}',
      '.tg-pn{font-size:28px;font-weight:700;line-height:1.1}.tg-pn small{font-size:13px;font-weight:500;color:#64748B}',
      '.tg-pr{display:flex;flex-wrap:wrap;gap:6px 10px;font-size:12px;color:#475569}.tg-pr .w{color:#15803D;font-weight:600}.tg-pr .l{color:#B91C1C;font-weight:600}',
      '.tg-warn{font-size:13px;font-weight:600;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:4px 10px}',
      '.tg-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.tg-bar .ai2-q{margin-left:auto;min-width:240px}',
      '.tg-filt{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:#475569}.tg-filt label{display:flex;align-items:center;gap:6px}.tg-filt select{height:34px;padding:0 8px;font:inherit}',
      '.tg-wkn{margin:-4px 0 0}',
      '.tg-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(440px,1fr));gap:14px}@media (max-width:700px){.tg-list{grid-template-columns:minmax(0,1fr)}}',
      '.tg-card{padding:16px 18px!important;display:flex;flex-direction:column;gap:10px;border-left:4px solid #CBD5E1}.tg-card.st-win{border-left-color:#16A34A}.tg-card.st-loss{border-left-color:#DC2626}.tg-card.st-meh{border-left-color:#D97706}.tg-card.st-run{border-left-color:#2563EB}',
      '.tg-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.tg-tl{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
      '.tg-own{display:inline-block;padding:2px 10px;border-radius:99px;background:var(--c);color:#fff;font-size:12px;font-weight:700}',
      '.tg-type{display:inline-block;padding:2px 10px;border-radius:99px;background:#F1F5F9;color:#334155;font-size:12px;font-weight:600}',
      V + ' .tg-act{display:flex;gap:6px}' + V + ' .tg-act button{border:1px solid #E5E7EB!important;background:#fff!important;border-radius:8px!important;padding:3px 10px!important;font-size:12px!important;color:#475569!important;cursor:pointer}',
      '.tg-what{margin:0;font-size:16px;line-height:1.4;color:#0F172A}',
      '.tg-det{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;font-size:13px;color:#334155}.tg-det small,.tg-note small,.tg-sug small,.tg-kpi small{display:block;font-size:11px;color:#64748B}',
      '.tg-meta{display:flex;flex-direction:column;gap:2px;font-size:13px;color:#334155}.tg-mgr{display:inline-block;margin-left:4px;padding:0 8px;border-radius:99px;background:#EEF2FF;color:#4338CA;font-size:11px;font-weight:700}',
      '.tg-camps{display:flex;flex-direction:column;gap:4px;background:#F8FAFC;border-radius:8px;padding:8px 10px}.tg-camps>div{display:flex;flex-direction:column;min-width:0}.tg-cn{font-size:13px;font-weight:600;color:#1D4ED8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.tg-kpi{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 12px}.tg-kpi b{font-size:15px}.tg-kpi b.g{color:#15803D}.tg-kpi b.w{color:#B45309}.tg-kpi b.b{color:#B91C1C}',
      '.tg-res{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;border-top:1px solid #EEF1F6;padding-top:10px}',
      '.tg-sug{display:flex;flex-direction:column;padding:6px 12px;border-radius:10px;background:#F1F5F9;min-width:150px}.tg-sug b{font-size:15px}.tg-sug span{font-size:12px;color:#475569}.tg-sug.sg-win{background:#DCFCE7}.tg-sug.sg-win b{color:#15803D}.tg-sug.sg-loss{background:#FEE2E2}.tg-sug.sg-loss b{color:#B91C1C}.tg-sug.sg-meh{background:#FEF3C7}.tg-sug.sg-meh b{color:#B45309}',
      '.tg-conf{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
      V + ' .tg-conf button:not(.c2-link){border:1px solid #D7DBE3!important;background:#fff!important;border-radius:8px!important;padding:6px 12px!important;font-size:13px!important;font-weight:600;cursor:pointer;color:#0F172A!important}',
      V + ' .tg-conf button.win.hint{border-color:#16A34A!important;background:#F0FDF4!important;color:#15803D!important}' + V + ' .tg-conf button.loss.hint{border-color:#DC2626!important;background:#FEF2F2!important;color:#B91C1C!important}' + V + ' .tg-conf button.meh.hint{border-color:#D97706!important;background:#FFFBEB!important;color:#B45309!important}',
      V + ' .tg-conf button.pri{background:#16A34A!important;border-color:#16A34A!important;color:#fff!important}',
      '.tg-scaled{font-size:13px;color:#15803D;font-weight:600}.tg-note{font-size:13px;color:#334155;background:#FFFBEB;border-radius:8px;padding:6px 10px}',
      '.tg-saving{position:fixed;right:20px;bottom:20px;background:#0F172A;color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;z-index:9999}',
      '#tgToast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);opacity:0;background:#0F172A;color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;z-index:100000;transition:.2s;pointer-events:none;font-family:"IBM Plex Sans Thai","Sarabun",system-ui,sans-serif}#tgToast.on{opacity:1;transform:translateX(-50%)}#tgToast.bad{background:#B91C1C}',
      // ฟอร์ม
      '#tgModal{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99998;display:none;align-items:center;justify-content:center;padding:16px;font-family:"IBM Plex Sans Thai","Sarabun",system-ui,sans-serif;color:#0F172A}',
      '#tgModal .tgm-box{background:#fff;border-radius:14px;width:min(760px,100%);max-height:94vh;display:flex;flex-direction:column;overflow:hidden}',
      '#tgModal .tgm-head{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #E5E7EB;font-size:16px}#tgModal .tgm-x{width:34px;height:34px;border:1px solid #E5E7EB;border-radius:8px;background:#fff;cursor:pointer}',
      '#tgModal .tgm-body{padding:16px 18px;overflow:auto;display:flex;flex-direction:column;gap:14px;font-size:14px}',
      '#tgModal .tgm-f{display:flex;flex-direction:column;gap:6px;min-width:0}#tgModal label{font-size:13px;font-weight:600;color:#334155}#tgModal label em{color:#DC2626;font-style:normal}',
      '#tgModal input,#tgModal textarea,#tgModal select{border:1px solid #D7DBE3;border-radius:8px;padding:8px 10px;font:inherit;font-size:14px;background:#fff;color:#0F172A;width:100%;box-sizing:border-box}#tgModal textarea{resize:vertical}',
      '#tgModal .tgm-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media (max-width:600px){#tgModal .tgm-2{grid-template-columns:1fr}}',
      '#tgModal .tgm-chips{display:flex;flex-wrap:wrap;gap:6px}#tgModal .tgm-chips button{border:1px solid #D7DBE3;background:#fff;border-radius:99px;padding:6px 14px;font:inherit;font-size:13px;cursor:pointer;color:#0F172A}#tgModal .tgm-chips button.on{background:var(--c,#2563EB);border-color:var(--c,#2563EB);color:#fff}',
      '#tgModal .tgm-sel{display:flex;flex-direction:column;gap:6px}#tgModal .tgm-sel>div{display:flex;justify-content:space-between;gap:8px;align-items:center;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:6px 10px}#tgModal .tgm-sel span{display:flex;flex-direction:column;min-width:0}#tgModal .tgm-sel b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tgModal .tgm-sel small{font-size:12px;color:#475569}#tgModal .tgm-sel button{border:0;background:none;cursor:pointer;font-size:14px;color:#64748B}',
      '#tgModal .tgm-pick{display:grid;grid-template-columns:180px 1fr;gap:8px}',
      '#tgModal .tgm-list{max-height:220px;overflow:auto;border:1px solid #E5E7EB;border-radius:8px;display:flex;flex-direction:column}#tgModal .tgm-list button{display:flex;justify-content:space-between;gap:8px;align-items:center;text-align:left;border:0;border-bottom:1px solid #F1F5F9;background:#fff;padding:7px 10px;cursor:pointer;font:inherit;color:#0F172A}#tgModal .tgm-list button:hover{background:#F8FAFC}#tgModal .tgm-list button.on{background:#EFF6FF}#tgModal .tgm-list span{display:flex;flex-direction:column;min-width:0}#tgModal .tgm-list b{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tgModal .tgm-list small{font-size:12px;color:#64748B}#tgModal .tgm-list i{font-style:normal;font-weight:700;color:#2563EB;flex:none}#tgModal .tgm-list>.c2-dim{padding:10px}',
      '#tgModal .tgm-sim{background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:8px 10px;font-size:13px;display:flex;flex-direction:column;gap:4px}',
      '#tgModal .tgm-foot{display:flex;gap:8px;justify-content:flex-end;align-items:center;padding:12px 18px;border-top:1px solid #E5E7EB}#tgModal .tgm-err{margin-right:auto;color:#B91C1C;font-size:13px;font-weight:600}#tgModal .ai2-btn{border-radius:10px;height:38px;padding:0 16px;border:1px solid #D7DBE3;background:#fff;font:inherit;font-weight:600;cursor:pointer}#tgModal .ai2-btn.pri{background:#2563EB;border-color:#2563EB;color:#fff}',
      '#tgModal .tg-own{display:inline-block;padding:1px 8px;border-radius:99px;background:var(--c);color:#fff;font-size:11px;font-weight:700}#tgModal .ai2-tag{font-size:11px}',
      // ปุ่มในหน้า Facebook Ads
      '.v2-btns .tg-fbb{color:#7C3AED!important;border-color:#DDD6FE!important}.v2-btns .tg-fbb.on{background:#F5F3FF!important;color:#6D28D9!important;font-weight:700}'
    ].join('\n');
    document.head.appendChild(s);
  }

  var tries = 0;
  function install() {
    var home = document.getElementById('sb-home'), wrap = document.querySelector('.content-wrap');
    if (!home || !wrap || !window.FB_HIERARCHY) return setTimeout(install, 500);
    var navOff = false; try { navOff = localStorage.getItem('rb_nav_v2') === 'off'; } catch (e) {}
    var grouped = home.parentNode && home.parentNode.classList && home.parentNode.classList.contains('v2nav-items');
    if (!grouped && !navOff && ++tries < 30) return setTimeout(install, 500);
    if (document.getElementById('tgView')) return;
    css();
    home.setAttribute('onclick', 'tgV2.open(this)');
    var v = document.createElement('div'); v.id = 'tgView'; v.style.display = 'none'; wrap.appendChild(v);
    document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('.sb-item'); if (t && t.id !== 'sb-home') { var tv = document.getElementById('tgView'); if (tv) tv.style.display = 'none'; } }, true);
    // ปุ่ม "เทส" ในตารางแคมเปญ (หน้า Facebook Ads แบบใหม่)
    var mo = new MutationObserver(function () { clearTimeout(mo._t); mo._t = setTimeout(markRows, 120); });
    mo.observe(document.body, { childList: true, subtree: true });
    load(true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
