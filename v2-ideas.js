/* เสนอคอนเทนต์ประจำเดือน (ทีม SA) — เพิ่มโดย Claude 16 พ.ย. 2569
   เก็บใน Cloudflare Worker /_auth/idea/* (KV idea:list) · ต้องล็อกอินระบบใหม่ (rb_auth_token) */
(function () {
  if (window.ideaV2) return;
  var API = 'https://richbiotech-fb-proxy.ads02.workers.dev/_auth/idea/';
  var ST = { open: 'เสนอแล้ว', doing: 'รับไปทำ', done: 'ทำแล้ว', back: 'ยังไม่ทำ' };
  var TYPES = ['รีวิวจากลูกค้าจริง', 'ผู้เชี่ยวชาญ / หมอ', 'สัมภาษณ์', 'ละครสั้น / สถานการณ์', 'ก่อน-หลังใช้', 'ตอบคำถามที่ลูกค้าถามบ่อย', 'โปรโมชั่น', 'อื่น ๆ'];
  var MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var S = { list: [], loaded: false, loading: false, err: '', month: '', team: '', prod: '', st: '', form: null, sel: null, busy: false };
  try { var s0 = JSON.parse(localStorage.getItem('rb_idea_v2') || 'null'); if (s0) { S.team = s0.team || ''; S.st = s0.st || ''; } } catch (e) {}
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function curMonth() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  S.month = curMonth();
  function shift(m, n) { var p = m.split('-'), d = new Date(+p[0], +p[1] - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function mLabel(m) { var p = m.split('-'); return MONTHS[+p[1] - 1] + ' ' + (+p[0] + 543); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jsq(s) { return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }
  function tok() { try { return localStorage.getItem('rb_auth_token') || ''; } catch (e) { return ''; } }
  function me() { try { return sessionStorage.getItem('rb_username') || ''; } catch (e) { return ''; } }
  function isAdmin() { try { return sessionStorage.getItem('rb_auth') === '1'; } catch (e) { return false; } }
  function readOnly() { try { return sessionStorage.getItem('rb_perm') === 'view'; } catch (e) { return false; } }
  var ISS_TEAM = { iss_nook: 'ซุปนุ๊ก', iss_au: 'Au Supad1', iss_honey: 'ซุปน้ำผึ้ง' };
  function accArr() { try { var a = sessionStorage.getItem('rb_access') || '', x; try { x = JSON.parse(a); } catch (e) { x = a; } return Array.isArray(x) ? x : [x]; } catch (e) { return []; } }
  function lockTeam() { if (isAdmin()) return ''; var a = accArr(); for (var i = 0; i < a.length; i++) if (ISS_TEAM[a[i]]) return ISS_TEAM[a[i]]; try { return window._cpLockedSup ? (window._cpLockedSup() || '') : ''; } catch (e) { return ''; } }
  /* SA = บัญชีที่มีสิทธิ์ "แจ้งปัญหา · ทีม…" (iss_nook / iss_au / iss_honey) */
  function saOnly() { return !isAdmin() && accArr().some(function (k) { return !!ISS_TEAM[k]; }); }
  function teams() { return Object.keys(window.CHAT_SUP_MAP || {}); }
  function teamOf(prod) { var M = window.CHAT_SUP_MAP || {}, r = ''; Object.keys(M).forEach(function (k) { if (!r && (M[k] || []).indexOf(prod) >= 0) r = k; }); return r; }
  function prods() { var t = lockTeam(); return (window.FB_HIERARCHY || []).filter(function (p) { return p && p.product && (!t || teamOf(p.product) === t); }).map(function (p) { return p.product; }); }
  function curTeam() { return lockTeam() || S.team || ''; }
  function post(path, body) {
    body = body || {}; body.token = tok();
    return fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error || ('HTTP ' + r.status)); e.code = j.error; throw e; } return j; }); });
  }
  function errMsg(e) { var c = e && e.code; return c === 'unauthorized' ? 'หมดเวลาเข้าสู่ระบบ ให้ออกแล้วเข้าสู่ระบบใหม่' : c === 'forbidden' ? 'ไม่มีสิทธิ์ทำรายการนี้' : 'เกิดข้อผิดพลาด: ' + (e && e.message || e); }
  function when(t) { if (!t) return ''; var d = new Date(t); return d.getDate() + '/' + (d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function toast(t, bad) { var el = document.getElementById('ideaToast'); if (!el) { el = document.createElement('div'); el.id = 'ideaToast'; document.body.appendChild(el); } el.textContent = t; el.className = bad ? 'bad on' : 'on'; clearTimeout(el._t); el._t = setTimeout(function () { el.className = ''; }, 3500); }
  function saveUi() { try { localStorage.setItem('rb_idea_v2', JSON.stringify({ team: S.team, st: S.st })); } catch (e) {} }
  function cleanUrl(u) { u = String(u || '').trim(); if (!u) return ''; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; try { var x = new URL(u); return (x.protocol === 'http:' || x.protocol === 'https:') ? x.href : ''; } catch (e) { return ''; } }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }

  function load(silent) {
    if (!tok() || S.loading) return Promise.resolve();
    S.loading = true; if (!silent) render();
    return post('list').then(function (j) { S.list = j.list || []; S.loaded = true; S.err = ''; })
      .catch(function (e) { S.err = errMsg(e); })
      .then(function () { S.loading = false; badge(); if (visible()) { if (S.sel) S.sel = byId(S.sel.id) || null; render(); } });
  }
  function byId(id) { return S.list.filter(function (x) { return x.id === id; })[0] || null; }
  function upsert(it) { var i = -1; S.list.forEach(function (x, k) { if (x.id === it.id) i = k; }); if (i >= 0) S.list[i] = it; else S.list.unshift(it); }
  function send(item, msg, done) {
    if (S.busy) return; S.busy = true; render();
    post('save', { item: item, msg: msg }).then(function (j) { upsert(j.item); if (done) done(j.item); toast('บันทึกแล้ว'); })
      .catch(function (e) { toast(errMsg(e), true); })
      .then(function () { S.busy = false; badge(); render(); });
  }
  function visible() { var v = document.getElementById('ideaView'); return v && v.style.display !== 'none'; }
  function inScope(x) { var t = curTeam(); return (x.meta && x.meta.month) === S.month && (!t || teamOf(x.prod) === t); }
  function pill(st) { return '<span class="id-st ' + (st || 'open') + '">' + (ST[st] || ST.open) + '</span>'; }
  function linksHtml(L) { return (L || []).map(function (u) { var h = cleanUrl(u); return h ? '<a class="id-link" href="' + esc(h) + '" title="' + esc(h) + '" target="_blank" rel="noopener noreferrer">▶ ' + esc(host(h)) + '</a>' : ''; }).join(''); }

  function render() {
    var box = document.getElementById('ideaView'); if (!box) return;
    var LT = lockTeam(), TM = curTeam();
    var h = '<div class="id-wrap"><div class="id-head"><div><h1>เสนอคอนเทนต์ประจำเดือน' + (LT ? ' <span class="id-team">ทีม ' + esc(LT) + '</span>' : '') + '</h1><div class="id-sub">ทีม SA เสนอคอนเทนต์ที่อยากได้ (จากสิ่งที่ลูกค้าถาม/สนใจ) พร้อมลิงก์คลิปตัวอย่าง · ทีม ADS/กราฟิกรับไปทำและอัปเดตสถานะ</div></div>' +
      '<div class="id-month"><button aria-label="เดือนก่อน" onclick="ideaV2.m(-1)">‹</button><b>' + mLabel(S.month) + '</b><button aria-label="เดือนถัดไป" onclick="ideaV2.m(1)">›</button></div>' +
      (tok() && !readOnly() ? '<button class="id-btn pri" onclick="ideaV2.newForm()">+ เสนอคอนเทนต์</button>' : '') + '</div>';
    if (!tok()) { box.innerHTML = h + '<div class="id-card id-empty">หน้านี้ใช้ได้เมื่อเข้าสู่ระบบด้วยอีเมล/ชื่อผู้ใช้ + รหัสผ่านแบบใหม่</div></div>'; return; }
    var scope = S.list.filter(inScope);
    var cnt = { open: 0, doing: 0, done: 0, back: 0 }; scope.forEach(function (x) { cnt[x.status || 'open'] = (cnt[x.status || 'open'] || 0) + 1; });
    h += '<div class="id-kpis">' + [['', 'ทั้งหมด', scope.length], ['open', ST.open, cnt.open], ['doing', ST.doing, cnt.doing], ['done', ST.done, cnt.done], ['back', ST.back, cnt.back]].map(function (k) { return '<button class="id-card id-kpi' + (S.st === k[0] ? ' on' : '') + '" onclick="ideaV2.f(\'st\',\'' + k[0] + '\')"><div class="id-lbl">' + k[1] + '</div><div class="id-val">' + k[2] + '</div></button>'; }).join('') + '</div>';
    if (!LT) h += '<div class="id-bar"><div class="id-seg" role="group" aria-label="ทีม SA">' + [''].concat(teams()).map(function (t) { return '<button class="' + (S.team === t ? 'on' : '') + '" onclick="ideaV2.f(\'team\',' + jsq(t) + ')">' + (t ? esc(t) : 'ทุกทีม') + '</button>'; }).join('') + '</div><button class="id-btn" onclick="ideaV2.reload()">' + (S.loading ? 'กำลังโหลด…' : 'โหลดใหม่') + '</button></div>';
    if (S.err) h += '<div class="id-card id-err">' + esc(S.err) + '</div>';
    var L = scope.filter(function (x) { return !S.st || (x.status || 'open') === S.st; }).sort(function (a, b) { return (b.u || b.t) - (a.u || a.t); });
    var by = {}; L.forEach(function (x) { (by[x.prod] = by[x.prod] || []).push(x); });
    var order = (window.FB_HIERARCHY || []).map(function (p) { return p.product; });
    var keys = Object.keys(by).sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
    if (!S.loaded && S.loading) h += '<div class="id-card id-empty">กำลังโหลด…</div>';
    else if (!keys.length) h += '<div class="id-card id-empty">ยังไม่มีคอนเทนต์ที่เสนอใน' + mLabel(S.month) + (S.st ? ' (สถานะ ' + ST[S.st] + ')' : '') + (tok() && !readOnly() ? ' · กด "+ เสนอคอนเทนต์" เพื่อเริ่ม' : '') + '</div>';
    keys.forEach(function (p) {
      h += '<div class="id-grp"><h2>' + esc(p) + ' <span class="id-dim">' + by[p].length + ' เรื่อง' + (teamOf(p) ? ' · ทีม ' + esc(teamOf(p)) : '') + '</span></h2><div class="id-cards">';
      by[p].forEach(function (x) {
        var desc = ((x.msgs || [])[0] || {}).txt || '', links = (x.meta && x.meta.links) || [];
        h += '<button class="id-card id-item" onclick="ideaV2.open(' + jsq(x.id) + ')"><div class="id-r1">' + pill(x.status) + (x.cat ? '<span class="id-cat">' + esc(x.cat) + '</span>' : '') + '</div><b class="id-title">' + esc(x.title) + '</b><div class="id-desc">' + esc(desc.length > 160 ? desc.slice(0, 160) + '…' : desc) + '</div>' +
          (links.length ? '<div class="id-dim">🔗 ' + links.length + ' ลิงก์ตัวอย่าง</div>' : '') + '<div class="id-dim">เสนอโดย ' + esc(x.by) + ' · ' + when(x.t) + ((x.msgs || []).length > 1 ? ' · ' + ((x.msgs || []).length - 1) + ' ความเห็น' : '') + '</div></button>';
      });
      h += '</div></div>';
    });
    h += '</div>';
    if (S.form) h += formHtml(); else if (S.sel) h += detailHtml(S.sel);
    var keepR = document.getElementById('idReply'); keepR = keepR && document.activeElement === keepR ? keepR.value : null;
    box.innerHTML = h;
    if (keepR != null) { var r = document.getElementById('idReply'); if (r) { r.value = keepR; r.focus(); } }
  }
  function formHtml() {
    var f = S.form;
    var h = '<div class="id-ov" onclick="if(event.target===this)ideaV2.close()"><div class="id-modal" role="dialog" aria-modal="true" aria-label="เสนอคอนเทนต์"><div class="id-mh"><h2>เสนอคอนเทนต์ · ' + mLabel(S.month) + '</h2><button class="id-x" aria-label="ปิด" onclick="ideaV2.close()">×</button></div>';
    h += '<div class="id-grid"><label class="id-fg"><span class="id-lbl">สินค้า</span><select id="idProd"><option value="">— เลือก —</option>' + prods().map(function (p) { return '<option' + (f.prod === p ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') + '</select></label>' +
      '<label class="id-fg"><span class="id-lbl">แนวคอนเทนต์</span><select id="idCat">' + TYPES.map(function (c) { return '<option' + (f.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></label></div>';
    h += '<label class="id-fg"><span class="id-lbl">หัวข้อ</span><input id="idTitle" maxlength="150" placeholder="เช่น คลิปตอบเรื่องกินแล้วใจสั่นไหม" value="' + esc(f.title || '') + '"></label>';
    h += '<label class="id-fg"><span class="id-lbl">อธิบายคอนเทนต์ที่อยากได้</span><textarea id="idDesc" rows="6" placeholder="ลูกค้าถามเรื่องอะไรบ่อย อยากให้คลิปพูดถึงอะไร ใครพูด โทนแบบไหน ยาวประมาณไหน">' + esc(f.desc || '') + '</textarea></label>';
    h += '<div class="id-fg"><span class="id-lbl">ลิงก์ตัวอย่างคลิปที่อยากได้ (TikTok / Facebook / YouTube ฯลฯ)</span><div id="idLinks">' + (f.links || ['']).map(function (u, i) { return '<div class="id-lrow"><input type="url" inputmode="url" placeholder="https://…" value="' + esc(u) + '" aria-label="ลิงก์ที่ ' + (i + 1) + '">' + (i ? '<button type="button" class="id-btn sm" aria-label="ลบลิงก์" onclick="ideaV2.rmLink(' + i + ')">×</button>' : '') + '</div>'; }).join('') + '</div>' +
      ((f.links || ['']).length < 5 ? '<button type="button" class="id-btn sm" onclick="ideaV2.addLink()">+ เพิ่มลิงก์</button>' : '') + '</div>';
    h += '<div class="id-mf"><button class="id-btn" onclick="ideaV2.close()">ยกเลิก</button><button class="id-btn pri" ' + (S.busy ? 'disabled' : '') + ' onclick="ideaV2.create()">' + (S.busy ? 'กำลังส่ง…' : 'ส่งข้อเสนอ') + '</button></div></div></div>';
    return h;
  }
  function detailHtml(x) {
    var links = (x.meta && x.meta.links) || [], first = (x.msgs || [])[0] || {}, rest = (x.msgs || []).slice(1);
    var canStatus = !saOnly() && !readOnly(), canDel = isAdmin() || (x.by && x.by === me());
    var h = '<div class="id-ov" onclick="if(event.target===this)ideaV2.close()"><div class="id-modal wide" role="dialog" aria-modal="true" aria-label="รายละเอียดข้อเสนอ"><div class="id-mh"><div><div class="id-r1">' + pill(x.status) + (x.cat ? '<span class="id-cat">' + esc(x.cat) + '</span>' : '') + '</div><h2>' + esc(x.title) + '</h2><div class="id-dim">' + esc(x.prod) + (teamOf(x.prod) ? ' · ทีม ' + esc(teamOf(x.prod)) : '') + ' · เสนอโดย ' + esc(x.by) + ' ' + when(x.t) + ' · ' + mLabel((x.meta && x.meta.month) || S.month) + '</div></div><button class="id-x" aria-label="ปิด" onclick="ideaV2.close()">×</button></div>';
    h += '<div class="id-body">' + esc(first.txt || '').replace(/\n/g, '<br>') + '</div>';
    if (links.length) h += '<div class="id-lbl" style="margin-top:12px">ลิงก์ตัวอย่างคลิป</div><div class="id-links">' + linksHtml(links) + '</div>';
    if (rest.length) h += '<div class="id-thread">' + rest.map(function (m) { return '<div class="id-msg"><div class="id-dim"><b>' + esc(m.by) + '</b> · ' + when(m.t) + (m.st ? ' · เปลี่ยนเป็น ' + pill(m.st) : '') + '</div>' + (m.txt ? '<div>' + esc(m.txt).replace(/\n/g, '<br>') + '</div>' : '') + '</div>'; }).join('') + '</div>';
    if (!readOnly()) {
      h += '<label class="id-fg" style="margin-top:12px"><span class="id-lbl">ความเห็น</span><textarea id="idReply" rows="2" placeholder="' + (canStatus ? 'เช่น รับไปทำ จะได้คลิปวันที่… / ยังไม่ทำเพราะ…' : 'เพิ่มรายละเอียด หรือตอบคำถาม') + '"></textarea></label>';
      h += '<div class="id-mf">' + (canDel ? '<button class="id-btn danger" onclick="ideaV2.del(' + jsq(x.id) + ')">ลบ</button>' : '') + '<span style="flex:1"></span>' +
        (canStatus ? ['doing', 'done', 'back'].filter(function (s) { return s !== x.status; }).map(function (s) { return '<button class="id-btn ' + s + '" ' + (S.busy ? 'disabled' : '') + ' onclick="ideaV2.reply(\'' + s + '\')">' + ST[s] + '</button>'; }).join('') : '') +
        '<button class="id-btn pri" ' + (S.busy ? 'disabled' : '') + ' onclick="ideaV2.reply(\'\')">ส่งความเห็น</button></div>';
    }
    return h + '</div></div>';
  }
  function badge() {
    var it = document.getElementById('sb-ideas'); if (!it) return;
    var ic = it.querySelector('.sb-icon') || it, b = it.querySelector('.id-badge'); if (!b) { b = document.createElement('span'); b.className = 'id-badge'; ic.appendChild(b); }
    var t = lockTeam(), m = curMonth(), n = saOnly() ? 0 : S.list.filter(function (x) { return (x.status || 'open') === 'open' && (x.meta && x.meta.month) === m && (!t || teamOf(x.prod) === t); }).length;
    b.textContent = n > 99 ? '99+' : String(n); b.style.display = n ? '' : 'none'; b.setAttribute('aria-label', n + ' ข้อเสนอรอรับ');
  }
  function open(el) {
    document.querySelectorAll('[id$="View"]').forEach(function (v) { v.style.display = 'none'; });
    document.querySelectorAll('.sb-item').forEach(function (i) { i.classList.remove('active'); });
    var v = document.getElementById('ideaView'); if (v) v.style.display = '';
    var it = el || document.getElementById('sb-ideas'); if (it) it.classList.add('active');
    render(); load(); window.scrollTo(0, 0);
  }
  function css() {
    if (document.getElementById('ideacss')) return;
    var s = document.createElement('style'); s.id = 'ideacss';
    s.textContent = [
      '#ideaView{background:#F5F6FA;min-height:100vh;color:#0F172A}#ideaView .id-wrap{max-width:1280px;margin:0 auto;padding:28px 32px 60px}#ideaView h1{font-size:26px;font-weight:800;margin:0 0 4px}#ideaView h2{font-size:17px;font-weight:700;margin:0}',
      '#ideaView .id-head{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:16px}#ideaView .id-head>div:first-child{flex:1;min-width:260px}#ideaView .id-sub,#ideaView .id-dim{color:#64748B;font-size:13px}',
      '#ideaView .id-team{font-size:14px;font-weight:700;vertical-align:middle;background:#ECFEFF;color:#155E75;border:1px solid #A5F3FC;padding:3px 10px;border-radius:99px;margin-left:6px}',
      '#ideaView .id-month{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:4px 6px}#ideaView .id-month button{border:0;background:#F1F5F9;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:18px}#ideaView .id-month b{min-width:90px;text-align:center}',
      '#ideaView .id-card{background:#fff;border:1px solid #E5E7EB;border-radius:14px}#ideaView .id-empty{padding:28px;text-align:center;color:#64748B}#ideaView .id-err{padding:12px 16px;color:#B91C1C;background:#FEF2F2;border-color:#FECACA;margin-bottom:12px}',
      '#ideaView .id-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:14px}#ideaView .id-kpi{padding:12px 16px;text-align:left;font:inherit;color:inherit;cursor:pointer}#ideaView .id-kpi.on{border-color:#2563EB;box-shadow:0 0 0 2px #BFDBFE}#ideaView .id-lbl{font-size:13px;color:#64748B;display:block;margin-bottom:4px}#ideaView .id-val{font-size:24px;font-weight:800}',
      '#ideaView .id-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}#ideaView .id-seg{display:inline-flex;background:#EEF0F4;border-radius:10px;padding:3px;gap:2px}#ideaView .id-seg button{border:0;background:none;padding:6px 12px;border-radius:7px;font:inherit;font-size:14px;color:#334155;cursor:pointer}#ideaView .id-seg button.on{background:#fff;color:#0F172A;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.08)}',
      '#ideaView .id-btn{height:36px;padding:0 14px;border-radius:9px;border:1px solid #E5E7EB;background:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer;color:#0F172A}#ideaView .id-btn.pri{background:#2563EB;border-color:#2563EB;color:#fff}#ideaView .id-btn.sm{height:30px;padding:0 10px;font-size:13px}#ideaView .id-btn.danger{color:#DC2626;border-color:#FECACA}#ideaView .id-btn.doing{color:#1E40AF;border-color:#BFDBFE;background:#EFF6FF}#ideaView .id-btn.done{color:#fff;background:#16A34A;border-color:#16A34A}#ideaView .id-btn.back{color:#B91C1C;border-color:#FCA5A5;background:#FEF2F2}#ideaView .id-btn:disabled{opacity:.6}',
      '#ideaView .id-grp{margin-bottom:18px}#ideaView .id-grp h2{margin-bottom:8px}#ideaView .id-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}#ideaView .id-item{text-align:left;font:inherit;color:inherit;padding:12px 14px;cursor:pointer;display:flex;flex-direction:column;gap:6px}#ideaView .id-item:hover{border-color:#93C5FD}',
      '#ideaView .id-r1{display:flex;gap:6px;flex-wrap:wrap;align-items:center}#ideaView .id-title{font-size:15px}#ideaView .id-desc{font-size:13px;color:#334155;line-height:1.5}#ideaView .id-cat{font-size:12px;color:#475569;border:1px solid #E5E7EB;padding:1px 8px;border-radius:99px}',
      '#ideaView .id-st{font-size:12px;font-weight:700;padding:2px 9px;border-radius:99px;background:#FEF3C7;color:#92400E}#ideaView .id-st.doing{background:#DBEAFE;color:#1E40AF}#ideaView .id-st.done{background:#DCFCE7;color:#166534}#ideaView .id-st.back{background:#F1F5F9;color:#475569}',
      '#ideaView .id-ov{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto}#ideaView .id-modal{background:#fff;border-radius:16px;width:100%;max-width:580px;padding:20px 22px;box-shadow:0 20px 50px rgba(0,0,0,.25)}#ideaView .id-modal.wide{max-width:740px}',
      '#ideaView .id-mh{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}#ideaView .id-mh h2{font-size:19px;margin:6px 0 2px}#ideaView .id-x{border:0;background:#F1F5F9;width:34px;height:34px;border-radius:9px;font-size:20px;cursor:pointer;flex:none}',
      '#ideaView .id-fg{display:block;margin-bottom:12px}#ideaView .id-fg select,#ideaView .id-fg input,#ideaView .id-fg textarea{width:100%;box-sizing:border-box;border:1px solid #CBD5E1;border-radius:9px;padding:8px 10px;font:inherit;font-size:14px;background:#fff}#ideaView .id-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}#ideaView .id-lrow{display:flex;gap:6px;margin-bottom:6px}',
      '#ideaView .id-mf{display:flex;gap:8px;justify-content:flex-end;align-items:center;flex-wrap:wrap;margin-top:6px}#ideaView .id-body{font-size:14px;line-height:1.6;background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;padding:12px}',
      '#ideaView .id-links{display:flex;flex-wrap:wrap;gap:8px}#ideaView .id-link{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;background:#EFF6FF;color:#1D4ED8;text-decoration:none;font-size:13px;font-weight:600;border:1px solid #BFDBFE}#ideaView .id-link:hover{background:#DBEAFE}',
      '#ideaView .id-thread{display:flex;flex-direction:column;gap:8px;margin-top:12px;max-height:40vh;overflow:auto}#ideaView .id-msg{background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;padding:8px 12px;font-size:14px}',
      '#sb-ideas .sb-icon{position:relative;overflow:visible}#sb-ideas .id-badge{position:absolute;top:-8px;right:-10px;background:#EF4444;color:#fff;font-size:10px;font-weight:700;min-width:17px;height:17px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;padding:0 4px;line-height:1;box-shadow:0 0 0 2px #0B1220}',
      '#ideaToast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0F172A;color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;opacity:0;pointer-events:none;transition:.2s;z-index:9500}#ideaToast.on{opacity:1}#ideaToast.bad{background:#B91C1C}',
      '@media (max-width:700px){#ideaView .id-wrap{padding:18px 14px 40px}#ideaView .id-grid{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  var ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>';
  var tries = 0;
  function install() {
    var anchor = document.getElementById('sb-issues') || document.getElementById('sb-chatpage'), wrap = document.querySelector('.content-wrap');
    if (!anchor || !wrap) { if (++tries < 60) setTimeout(install, 500); return; }
    var navOff = false; try { navOff = localStorage.getItem('rb_nav_v2') === 'off'; } catch (e) {}
    var grouped = anchor.parentNode && anchor.parentNode.classList && anchor.parentNode.classList.contains('v2nav-items') && document.getElementById('sb-issues');
    if (!grouped && !navOff && ++tries < 40) { setTimeout(install, 500); return; }
    if (document.getElementById('sb-ideas')) return;
    css();
    var it = document.createElement('div'); it.className = 'sb-item'; it.id = 'sb-ideas';
    it.innerHTML = '<span class="sb-icon">' + ICON + '</span><span>เสนอคอนเทนต์ (SA)</span>';
    it.onclick = function () { open(it); };
    anchor.parentNode.insertBefore(it, anchor.nextSibling);
    var v = document.createElement('div'); v.id = 'ideaView'; v.style.display = 'none';
    wrap.appendChild(v);
    document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('.sb-item'); if (t && t.id !== 'sb-ideas') { var iv = document.getElementById('ideaView'); if (iv) iv.style.display = 'none'; it.classList.remove('active'); } }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && visible() && (S.form || S.sel)) ideaV2.close(); });
    setTimeout(function () { load(true); }, 3500);
    setInterval(function () { if (!document.hidden && !S.form && !S.sel && !S.busy) load(true); }, 120000);
  }
  function readForm() { var f = S.form; if (!f) return; var g = function (id) { var e = document.getElementById(id); return e ? e.value : ''; }; f.prod = g('idProd'); f.cat = g('idCat'); f.title = g('idTitle'); f.desc = g('idDesc'); f.links = [].map.call(document.querySelectorAll('#idLinks input'), function (i) { return i.value; }); if (!f.links.length) f.links = ['']; }
  window.ideaV2 = {
    f: function (k, v) { S[k] = v; saveUi(); render(); },
    m: function (n) { S.month = shift(S.month, n); render(); },
    reload: function () { load(); },
    newForm: function () { S.form = { prod: '', cat: TYPES[0], title: '', desc: '', links: [''] }; S.sel = null; render(); var p = document.getElementById('idProd'); if (p) p.focus(); },
    addLink: function () { readForm(); if (S.form.links.length < 5) S.form.links.push(''); render(); var ins = document.querySelectorAll('#idLinks input'); if (ins.length) ins[ins.length - 1].focus(); },
    rmLink: function (i) { readForm(); S.form.links.splice(i, 1); render(); },
    close: function () { if (S.form) { readForm(); if ((S.form.desc || S.form.title) && !confirm('ยังไม่ได้ส่ง จะปิดหน้าต่างนี้ไหม?')) return; } S.form = null; S.sel = null; render(); },
    open: function (id) { S.sel = byId(id); S.form = null; render(); },
    create: function () {
      readForm(); var f = S.form;
      if (!f.prod) { toast('เลือกสินค้าก่อน', true); return; }
      if (!String(f.title).trim()) { toast('ใส่หัวข้อก่อน', true); return; }
      if (!String(f.desc).trim()) { toast('อธิบายคอนเทนต์ที่อยากได้ก่อน', true); return; }
      var bad = f.links.filter(function (u) { return String(u).trim() && !cleanUrl(u); });
      if (bad.length) { toast('ลิงก์ไม่ถูกต้อง: ' + bad[0], true); return; }
      var links = f.links.map(cleanUrl).filter(Boolean).slice(0, 5);
      send({ dir: 'idea', title: String(f.title).trim(), prod: f.prod, cat: f.cat, status: 'open', meta: { month: S.month, links: links } }, { txt: String(f.desc).trim() }, function () { S.form = null; S.sel = null; });
    },
    reply: function (st) {
      var x = S.sel; if (!x) return; var r = document.getElementById('idReply'), txt = r ? r.value.trim() : '';
      if (!txt && !st) { toast('พิมพ์ความเห็นก่อน', true); return; }
      if (st === 'back' && !txt) { toast('ใส่เหตุผลที่ยังไม่ทำก่อน', true); if (r) r.focus(); return; }
      var item = { id: x.id }; if (st) item.status = st;
      send(item, { txt: txt, st: st || '' }, function (it) { S.sel = it; });
    },
    del: function (id) {
      if (!confirm('ลบข้อเสนอนี้ถาวร? ลบแล้วกู้คืนไม่ได้')) return;
      post('delete', { id: id }).then(function () { S.list = S.list.filter(function (x) { return x.id !== id; }); S.sel = null; toast('ลบแล้ว'); render(); badge(); }).catch(function (e) { toast(errMsg(e), true); });
    },
    _S: S
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
