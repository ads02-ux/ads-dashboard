/* เพจที่ใช้งานอยู่ — เพิ่มโดย Claude 16 พ.ย. 2569
   ดึงเฉพาะเพจที่ยังมีค่าแอด (FB) ในช่วงล่าสุด จาก FB_HIERARCHY + fbDataMap */
(function () {
  if (window.apV2) return;
  var WIN = [['1', 'วันนี้ / เมื่อวาน'], ['0', 'วันนี้'], ['3', '3 วัน'], ['7', '7 วัน']];
  var S = { win: '1', team: '', prod: '', mgr: '', q: '', sort: 'today', open: {} };
  try { var s0 = JSON.parse(localStorage.getItem('rb_ap_v2') || 'null'); if (s0) { S.win = s0.win || '1'; S.prod = s0.prod || ''; S.mgr = s0.mgr || ''; S.sort = s0.sort || 'today'; S.team = s0.team || ''; } } catch (e) {}
  function save() { try { localStorage.setItem('rb_ap_v2', JSON.stringify({ win: S.win, team: S.team, prod: S.prod, mgr: S.mgr, sort: S.sort })); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jsq(s) { return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function day(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
  function B(v) { return '฿' + Math.round(v).toLocaleString(); }
  function I(v) { return Math.round(v).toLocaleString(); }
  function dm(s) { if (!s) return '–'; var p = s.split('-'); return +p[2] + '/' + +p[1]; }
  var PAL = ['#2563EB', '#0EA5E9', '#8B5CF6', '#A855F7', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#14B8A6', '#6366F1', '#F97316', '#84CC16', '#64748B', '#06B6D4'];
  /* SA (สิทธิ์ iss_nook / iss_au / iss_honey หรือ chat_*) เห็นเฉพาะสินค้าที่ทีมตัวเองดูแล (CHAT_SUP_MAP) */
  var ISS_TEAM = { iss_nook: 'ซุปนุ๊ก', iss_au: 'Au Supad1', iss_honey: 'ซุปน้ำผึ้ง' };
  function lockTeam() {
    try {
      if (sessionStorage.getItem('rb_auth') === '1') return '';
      var a = sessionStorage.getItem('rb_access') || '', x; try { x = JSON.parse(a); } catch (e) { x = a; } if (!Array.isArray(x)) x = [x];
      for (var i = 0; i < x.length; i++) if (ISS_TEAM[x[i]]) return ISS_TEAM[x[i]];
      return window._cpLockedSup ? (window._cpLockedSup() || '') : '';
    } catch (e) { return ''; }
  }
  function teams() { return Object.keys(window.CHAT_SUP_MAP || {}); }
  function teamOf(prod) { var M = window.CHAT_SUP_MAP || {}, r = ''; Object.keys(M).forEach(function (k) { if (!r && (M[k] || []).indexOf(prod) >= 0) r = k; }); return r; }
  function prodColor(prod) { var i = (window.FB_HIERARCHY || []).map(function (p) { return p.product; }).indexOf(prod); return PAL[(i < 0 ? 0 : i) % PAL.length]; }
  function prods() { var t = lockTeam(), M = (window.CHAT_SUP_MAP || {})[t] || []; return (window.FB_HIERARCHY || []).filter(function (p) { return p && p.product && (!t || M.indexOf(p.product) >= 0); }); }
  function liveCamp(i) { return !!i && i.status === 'ACTIVE' && (!i.stop_time || new Date(i.stop_time).getTime() > Date.now()); }

  function build() {
    var T = day(0), Y = day(1), W7 = [], lim = S.win === '0' ? T : S.win === '1' ? Y : day(+S.win - 1);
    for (var i = 1; i <= 7; i++) W7.push(day(i));
    var rows = [], all = 0;
    prods().forEach(function (p, pi) {
      (p.pages || []).forEach(function (pg) {
        var r = { prod: p.product, ci: pi, page: pg.name, mgr: pg.manager && pg.manager !== '-' ? pg.manager : '', t: 0, y: 0, w: 0, wr: 0, wc: 0, wb: 0, rec: 0, last: '', camps: {}, accs: [] };
        var n = 0;
        (pg.accounts || []).forEach(function (a) { (a.adAccounts || []).forEach(function (acc) {
          n++;
          var A = { acc: acc, name: a.displayName || acc, t: 0, y: 0, w: 0, last: '' }, cm = (window.fbCampaignsMap || {})[acc] || {};
          ((window.fbDataMap || {})[acc] || []).forEach(function (x) {
            var s = num(x.spend); if (!x.date) return;
            if (s > 0 && x.date > A.last) A.last = x.date;
            if (x.date === T) { A.t += s; }
            if (x.date === Y) { A.y += s; }
            if (W7.indexOf(x.date) >= 0) { A.w += s; r.wr += num(x.revenue); r.wc += num(x.conversations); r.wb += num(x.purchases); }
            if (x.date >= lim && s > 0) { r.rec += s; if (x.campaign) r.camps[acc + '|' + x.campaign] = liveCamp(cm[x.campaign]) ? 1 : (r.camps[acc + '|' + x.campaign] || 0); }
          });
          r.t += A.t; r.y += A.y; r.w += A.w; if (A.last > r.last) r.last = A.last;
          r.accs.push(A);
        }); });
        if (!n) return;
        all++;
        r.nAcc = r.accs.filter(function (A) { return A.last >= lim; }).length;
        r.nCamp = Object.keys(r.camps).length;
        r.nLive = Object.keys(r.camps).filter(function (k) { return r.camps[k]; }).length;
        if (r.rec > 0) rows.push(r);
      });
    });
    return { rows: rows, all: all, T: T, lim: lim };
  }
  function render() {
    var box = document.getElementById('apView'); if (!box) return;
    if (!window.FB_HIERARCHY || !window.fbDataMap) { box.innerHTML = '<div class="ap-wrap"><div class="ap-card ap-empty">กำลังโหลดข้อมูล…</div></div>'; return; }
    var D = build(), LT = lockTeam(), TM = LT || S.team;
    var scope = D.rows.filter(function (r) { return !TM || teamOf(r.prod) === TM; });
    if (S.prod && !scope.some(function (r) { return r.prod === S.prod; })) S.prod = '';
    var rows = scope.slice();
    if (S.prod) rows = rows.filter(function (r) { return r.prod === S.prod; });
    var mgrs = {}, noMgr = false; rows.forEach(function (r) { if (r.mgr) mgrs[r.mgr] = 1; else noMgr = true; });
    if (S.mgr && S.mgr !== '-' && !mgrs[S.mgr]) S.mgr = ''; if (S.mgr === '-' && !noMgr) S.mgr = '';
    if (S.mgr) rows = rows.filter(function (r) { return S.mgr === '-' ? !r.mgr : r.mgr === S.mgr; });
    if (S.q) { var q = S.q.toLowerCase(); rows = rows.filter(function (r) { return (r.page + ' ' + r.prod + ' ' + r.mgr + ' ' + r.accs.map(function (a) { return a.name + ' ' + a.acc; }).join(' ')).toLowerCase().indexOf(q) >= 0; }); }
    var SRT = { today: function (a, b) { return b.t - a.t || b.y - a.y; }, y: function (a, b) { return b.y - a.y; }, week: function (a, b) { return b.w - a.w; }, roas: function (a, b) { return (b.w ? b.wr / b.w : 0) - (a.w ? a.wr / a.w : 0); }, prod: function (a, b) { return a.ci - b.ci || b.t - a.t; } };
    rows.sort(SRT[S.sort] || SRT.today);
    var tot = { t: 0, y: 0, w: 0, wr: 0, wc: 0 }; rows.forEach(function (r) { tot.t += r.t; tot.y += r.y; tot.w += r.w; tot.wr += r.wr; tot.wc += r.wc; });
    var maxT = rows.reduce(function (m, r) { return Math.max(m, r.t, r.y); }, 1);
    var winLbl = (WIN.filter(function (w) { return w[0] === S.win; })[0] || WIN[0])[1];
    var h = '<div class="ap-wrap">';
    h += '<div class="ap-head"><div><h1>เพจที่ใช้งานอยู่' + (lockTeam() ? ' <span class="ap-team">ทีม ' + esc(lockTeam()) + '</span>' : '') + '</h1><div class="ap-sub">' + (lockTeam() ? 'เฉพาะสินค้าที่ทีม ' + esc(lockTeam()) + ' ดูแล · ' : '') + 'แสดงเฉพาะเพจที่มีค่าแอดใน <b>' + esc(winLbl) + '</b> (ตั้งแต่ ' + dm(D.lim) + ') · ค่าแอดจาก Facebook · วันนี้ถึงเวลาที่โหลดล่าสุด</div></div>' +
      '<div class="ap-seg" role="group" aria-label="ช่วงที่ใช้เงิน">' + WIN.map(function (w) { return '<button class="' + (S.win === w[0] ? 'on' : '') + '" onclick="apV2.f(\'win\',\'' + w[0] + '\')">' + w[1] + '</button>'; }).join('') + '</div></div>';
    h += '<div class="ap-kpis">' +
      '<div class="ap-card ap-kpi"><div class="ap-lbl">เพจที่ใช้งานอยู่</div><div class="ap-val">' + scope.length + ' <small>' + (TM ? 'เพจ · ทีม ' + esc(TM) : '/ ' + D.all + ' เพจ') + '</small></div><div class="ap-dim">' + (TM ? 'ทั้งบริษัท ' + D.rows.length + ' / ' + D.all + ' เพจ' : 'อีก ' + (D.all - D.rows.length) + ' เพจไม่มีค่าแอดในช่วงนี้') + '</div></div>' +
      '<div class="ap-card ap-kpi"><div class="ap-lbl">ค่าแอดวันนี้' + (rows.length !== D.rows.length ? ' (ตามตัวกรอง)' : '') + '</div><div class="ap-val">' + B(tot.t) + '</div><div class="ap-dim">เมื่อวาน ' + B(tot.y) + '</div></div>' +
      '<div class="ap-card ap-kpi"><div class="ap-lbl">ค่าแอด 7 วัน</div><div class="ap-val">' + B(tot.w) + '</div><div class="ap-dim">ROAS ' + (tot.w ? (tot.wr / tot.w).toFixed(2) : '–') + ' · ทัก ' + I(tot.wc) + ' คน</div></div>' +
      '<div class="ap-card ap-kpi"><div class="ap-lbl">แสดงอยู่</div><div class="ap-val">' + rows.length + ' <small>เพจ</small></div><div class="ap-dim">' + rows.reduce(function (a, r) { return a + r.nAcc; }, 0) + ' บัญชี · ' + rows.reduce(function (a, r) { return a + r.nCamp; }, 0) + ' แคมเปญที่ใช้เงิน</div></div></div>';
    var PC = prods().map(function (p) { return { p: p.product, n: scope.filter(function (r) { return r.prod === p.product; }).length }; }).filter(function (x) { return x.n > 0; });
    if (!LT) h += '<div class="ap-teams"><span class="ap-dim">ทีม SA:</span><div class="ap-seg" role="group" aria-label="ทีม SA">' + [''].concat(teams()).map(function (t) { var n = D.rows.filter(function (r) { return !t || teamOf(r.prod) === t; }).length; return '<button class="' + (S.team === t ? 'on' : '') + '" onclick="apV2.team(' + jsq(t) + ')">' + (t ? esc(t) : 'ทุกทีม') + ' <span class="ap-n">' + n + '</span></button>'; }).join('') + '</div></div>';
    h += '<div class="ap-chips" role="group" aria-label="สินค้า"><button class="' + (!S.prod ? 'on' : '') + '" onclick="apV2.f(\'prod\',\'\')">ทุกสินค้า <span class="ap-n">' + scope.length + '</span></button>' + PC.map(function (x) { var on = S.prod === x.p; return '<button class="' + (on ? 'on' : '') + '" onclick="apV2.f(\'prod\',' + jsq(x.p) + ')"><i style="background:' + (on ? '#fff' : prodColor(x.p)) + '"></i>' + esc(x.p) + ' <span class="ap-n">' + x.n + '</span></button>'; }).join('') + '</div>';
    h += '<div class="ap-bar">' +
      '<select aria-label="ผู้ดูแล" onchange="apV2.f(\'mgr\',this.value)"><option value="">ทุกผู้ดูแล</option>' + Object.keys(mgrs).sort().map(function (m) { return '<option' + (S.mgr === m ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + (noMgr ? '<option value="-"' + (S.mgr === '-' ? ' selected' : '') + '>ยังไม่ระบุผู้ดูแล</option>' : '') + '</select>' +
      '<input type="search" placeholder="ค้นหาเพจ / บัญชี" aria-label="ค้นหา" value="' + esc(S.q) + '" oninput="apV2.q(this.value)">' +
      '<span class="ap-sort">เรียง: ' + [['today', 'วันนี้'], ['y', 'เมื่อวาน'], ['week', '7 วัน'], ['roas', 'ROAS'], ['prod', 'สินค้า']].map(function (x) { return '<button class="' + (S.sort === x[0] ? 'on' : '') + '" onclick="apV2.f(\'sort\',\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</span></div>';
    h += '<div class="ap-card"><div class="ap-scroll"><table class="ap-t"><thead><tr><th>สินค้า</th><th>เพจ</th><th>ผู้ดูแล</th><th class="r">วันนี้</th><th class="r">เมื่อวาน</th><th style="min-width:130px"></th><th class="r">7 วัน</th><th class="r">ROAS 7 วัน</th><th class="r">ทัก 7 วัน</th><th class="r">บัญชี / แคมเปญ</th><th class="r">ใช้เงินล่าสุด</th></tr></thead><tbody>';
    if (!rows.length) h += '<tr><td colspan="11" class="ap-empty">ไม่มีเพจที่ใช้เงินตามตัวกรองนี้</td></tr>';
    rows.forEach(function (r) {
      var col = PAL[r.ci % PAL.length], roas = r.w ? r.wr / r.w : 0, k = r.prod + '|' + r.page, op = !!S.open[k];
      var trend = r.y ? (r.t - r.y) / r.y : 0;
      h += '<tr class="ap-row' + (op ? ' op' : '') + '" onclick="apV2.tog(' + jsq(k) + ')"><td class="ap-nw"><i class="ap-dot" style="background:' + col + '"></i><b>' + esc(r.prod) + '</b></td><td><span class="ap-caret" aria-hidden="true">' + (op ? '▾' : '▸') + '</span> ' + esc(r.page) + '</td><td>' + (r.mgr ? '<span class="ap-mgr">' + esc(r.mgr) + '</span>' : '<span class="ap-dim">–</span>') + '</td>' +
        '<td class="r"><b>' + (r.t ? B(r.t) : '<span class="ap-dim">฿0</span>') + '</b></td><td class="r">' + (r.y ? B(r.y) : '<span class="ap-dim">฿0</span>') + '</td>' +
        '<td><div class="ap-bars" title="วันนี้ ' + B(r.t) + ' · เมื่อวาน ' + B(r.y) + '"><i class="t" style="width:' + (r.t / maxT * 100).toFixed(1) + '%;background:' + col + '"></i><i class="y" style="width:' + (r.y / maxT * 100).toFixed(1) + '%"></i></div></td>' +
        '<td class="r">' + B(r.w) + '</td><td class="r ' + (r.w ? (roas >= 2 ? 'ap-good' : roas < 1 ? 'ap-bad' : '') : '') + '">' + (r.w ? roas.toFixed(2) : '–') + '</td><td class="r">' + I(r.wc) + '</td>' +
        '<td class="r">' + r.nAcc + ' / ' + r.nCamp + (r.nLive < r.nCamp ? '<div class="ap-dim">เปิดอยู่ ' + r.nLive + '</div>' : '') + '</td><td class="r">' + (r.last === D.T ? '<span class="ap-good">วันนี้</span>' : dm(r.last)) + '</td></tr>';
      if (op) {
        h += '<tr class="ap-sub-row"><td colspan="11"><div class="ap-accs">' + r.accs.slice().sort(function (a, b) { return b.t - a.t || b.y - a.y || b.w - a.w; }).map(function (A) {
          var on = A.last >= D.lim;
          return '<div class="ap-acc' + (on ? '' : ' off') + '"><b>' + esc(A.name) + '</b><span>วันนี้ ' + B(A.t) + ' · เมื่อวาน ' + B(A.y) + ' · 7 วัน ' + B(A.w) + '</span><span class="ap-dim">' + (A.last ? 'ใช้เงินล่าสุด ' + dm(A.last) : 'ไม่มีค่าแอดในข้อมูล') + '</span></div>';
        }).join('') + '</div></td></tr>';
      }
    });
    h += '</tbody></table></div><div class="ap-note">กดแถวเพื่อดูรายบัญชี · ROAS = ยอดขาย ÷ ค่าแอด ตาม FB 7 วันถึงเมื่อวาน (เขียว ≥ 2 · แดง &lt; 1) · บัญชี / แคมเปญ = จำนวนที่มีค่าแอดในช่วงที่เลือก</div></div></div>';
    box.innerHTML = h;
  }
  function css() {
    if (document.getElementById('apcss')) return;
    var s = document.createElement('style'); s.id = 'apcss';
    s.textContent = [
      '#apView{background:#F5F6FA;min-height:100vh;color:#0F172A}#apView .ap-wrap{max-width:1360px;margin:0 auto;padding:28px 32px 60px}#apView h1{font-size:26px;font-weight:800;margin:0 0 4px}',
      '#apView .ap-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:18px}#apView .ap-sub,#apView .ap-dim{color:#64748B;font-size:13px}',
      '#apView .ap-card{background:#fff;border:1px solid #E5E7EB;border-radius:14px}#apView .ap-empty{padding:28px;text-align:center;color:#64748B}',
      '#apView .ap-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:16px}#apView .ap-kpi{padding:16px 18px}#apView .ap-lbl{font-size:13px;color:#64748B;margin-bottom:4px}#apView .ap-val{font-size:26px;font-weight:800}#apView .ap-val small{font-size:14px;color:#64748B;font-weight:600}',
      '#apView .ap-seg{display:inline-flex;background:#EEF0F4;border-radius:10px;padding:3px;gap:2px}#apView .ap-seg button{border:0;background:none;padding:6px 12px;border-radius:7px;font:inherit;font-size:14px;color:#334155;cursor:pointer}#apView .ap-seg button.on{background:#fff;color:#0F172A;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.08)}',
      '#apView .ap-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px}#apView .ap-bar select,#apView .ap-bar input{height:36px;border:1px solid #E5E7EB;border-radius:9px;padding:0 10px;font:inherit;font-size:14px;background:#fff}#apView .ap-bar input{flex:1;min-width:180px}',
      '#apView .ap-sort{font-size:13px;color:#64748B;display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap}#apView .ap-sort button{border:1px solid #E5E7EB;background:#fff;border-radius:99px;padding:4px 10px;font:inherit;font-size:13px;cursor:pointer;color:#334155}#apView .ap-sort button.on{background:#0F172A;color:#fff;border-color:#0F172A}',
      '#apView .ap-scroll{overflow-x:auto}#apView .ap-t{width:100%;border-collapse:collapse;font-size:14px}#apView .ap-t th{font-size:12px;color:#64748B;font-weight:600;text-align:left;padding:10px 10px;border-bottom:1px solid #E5E7EB;background:#F8FAFC;white-space:nowrap}#apView .ap-t td{padding:10px;border-bottom:1px solid #F1F5F9;vertical-align:middle}#apView .ap-t .r{text-align:right;white-space:nowrap}',
      '#apView .ap-row{cursor:pointer}#apView .ap-row:hover td{background:#F8FAFC}#apView .ap-row.op td{background:#F1F5F9}#apView .ap-caret{color:#94A3B8;font-size:11px}#apView .ap-nw{white-space:nowrap}#apView .ap-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px;vertical-align:middle}',
      '#apView .ap-teams{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}#apView .ap-n{font-size:12px;color:#64748B;font-weight:600;margin-left:2px}#apView .ap-seg button.on .ap-n{color:#2563EB}#apView .ap-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}#apView .ap-chips button{display:inline-flex;align-items:center;gap:6px;border:1px solid #E5E7EB;background:#fff;border-radius:99px;padding:6px 12px;font:inherit;font-size:14px;cursor:pointer;color:#0F172A}#apView .ap-chips button i{width:8px;height:8px;border-radius:50%;display:inline-block}#apView .ap-chips button.on{background:#2563EB;border-color:#2563EB;color:#fff;font-weight:700}#apView .ap-chips button.on .ap-n{color:#DBEAFE}#apView .ap-team{font-size:14px;font-weight:700;vertical-align:middle;background:#ECFEFF;color:#155E75;border:1px solid #A5F3FC;padding:3px 10px;border-radius:99px;margin-left:6px}#apView .ap-mgr{font-size:12px;font-weight:700;background:#EEF2FF;color:#3730A3;padding:2px 8px;border-radius:99px}#apView .ap-good{color:#16A34A;font-weight:700}#apView .ap-bad{color:#DC2626;font-weight:700}',
      '#apView .ap-bars{display:flex;flex-direction:column;gap:3px;width:130px}#apView .ap-bars i{display:block;height:6px;border-radius:3px;min-width:2px}#apView .ap-bars i.y{background:#CBD5E1}',
      '#apView .ap-sub-row td{background:#F8FAFC;padding:8px 10px 12px 36px}#apView .ap-accs{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}#apView .ap-acc{background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:2px;font-size:13px}#apView .ap-acc.off{opacity:.55}',
      '#apView .ap-note{font-size:12px;color:#64748B;padding:10px 14px;border-top:1px solid #F1F5F9}',
      '@media (max-width:700px){#apView .ap-wrap{padding:18px 14px 40px}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function open(el) {
    document.querySelectorAll('[id$="View"]').forEach(function (v) { v.style.display = 'none'; });
    document.querySelectorAll('.sb-item').forEach(function (i) { i.classList.remove('active'); });
    var v = document.getElementById('apView'); if (v) v.style.display = '';
    var it = el || document.getElementById('sb-activepages'); if (it) it.classList.add('active');
    render(); window.scrollTo(0, 0);
  }
  var ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><circle cx="16" cy="15" r="2.5"/><path d="M7 14h4"/></svg>';
  var tries = 0;
  function install() {
    var anchor = document.getElementById('sb-fbv2'), wrap = document.querySelector('.content-wrap');
    if (!anchor || !wrap) return setTimeout(install, 500);
    var navOff = false; try { navOff = localStorage.getItem('rb_nav_v2') === 'off'; } catch (e) {}
    var grouped = anchor.parentNode && anchor.parentNode.classList && anchor.parentNode.classList.contains('v2nav-items');
    if (!grouped && !navOff && ++tries < 30) return setTimeout(install, 500);
    if (document.getElementById('sb-activepages')) return;
    css();
    var it = document.createElement('div'); it.className = 'sb-item'; it.id = 'sb-activepages';
    it.innerHTML = '<span class="sb-icon">' + ICON + '</span><span>เพจที่ใช้งานอยู่</span>';
    it.onclick = function () { open(it); };
    anchor.parentNode.insertBefore(it, anchor.nextSibling);
    var v = document.createElement('div'); v.id = 'apView'; v.style.display = 'none';
    wrap.appendChild(v);
    document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('.sb-item'); if (t && t.id !== 'sb-activepages') { var av = document.getElementById('apView'); if (av) av.style.display = 'none'; it.classList.remove('active'); } }, true);
    setInterval(function () { var av = document.getElementById('apView'); if (av && av.style.display !== 'none' && !document.hidden) render(); }, 60000);
  }
  window.apV2 = {
    f: function (k, v) { S[k] = v; save(); render(); },
    team: function (t) { S.team = t; S.prod = ''; S.mgr = ''; save(); render(); },
    q: function (v) { S.q = v; clearTimeout(S._t); S._t = setTimeout(function () { render(); var i = document.querySelector('#apView .ap-bar input'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 250); },
    tog: function (k) { S.open[k] = !S.open[k]; render(); },
    render: render
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
