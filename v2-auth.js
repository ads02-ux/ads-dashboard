/* v2-auth.js — ล็อกอินผ่าน Cloudflare (รายชื่อผู้ใช้เก็บบนเซิร์ฟเวอร์ รหัสเข้ารหัสทางเดียว)
   + หน้าจัดการผู้ใช้แบบใหม่ · ช่วงเปลี่ยนผ่านยังเข้าด้วยรหัสแบบเดิมได้ */
(function () {
  'use strict';
  var API = 'https://richbiotech-fb-proxy.ads02.workers.dev/_auth/';
  var TK = 'rb_auth_token';
  var PAGES = [['fb', 'FB Ads'], ['ai', 'AI แนะนำ'], ['adsai', 'AI วิเคราะห์'], ['track', 'ติดตาม'], ['benchmark', 'Benchmark'], ['chartrank', 'ชาร์ต'], ['hunter', 'Hunter'], ['hr', 'ค่าคอม'], ['leave', 'วันหยุด'], ['dailytask', 'งานรายวัน'], ['videoai', 'วิเคราะห์วีดีโอ'], ['buyerdemo', 'ข้อมูลผู้ซื้อ'], ['chat', 'คนทัก (ทุกซุป)'], ['chat_nook', 'คนทัก-ซุปนุ๊ก'], ['chat_au', 'คนทัก-Au Supad1'], ['chat_honey', 'คนทัก-ซุปน้ำผึ้ง']];
  var ERR = { bad_login: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', locked: 'ใส่รหัสผิดหลายครั้ง ลองใหม่ใน 15 นาที', invalid: 'กรอกอีเมลและรหัสผ่านอย่างน้อย 6 ตัว', already_setup: 'ตั้งค่าผู้ดูแลไปแล้ว ให้เข้าสู่ระบบแทน', short_password: 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว', duplicate: 'ชื่อหรืออีเมลนี้มีอยู่แล้ว', name_required: 'ใส่ชื่อผู้ใช้', password_required: 'ใส่รหัสผ่าน', need_admin: 'ต้องมีผู้ใช้สิทธิ์ทุกหน้าอย่างน้อย 1 คน', self: 'ลบบัญชีตัวเองไม่ได้', unauthorized: 'หมดเวลาเข้าสู่ระบบ ให้เข้าสู่ระบบใหม่', forbidden: 'เฉพาะผู้ใช้สิทธิ์ทุกหน้าเท่านั้น', bad_old: 'รหัสเดิมไม่ถูกต้อง' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tok() { try { return localStorage.getItem(TK) || ''; } catch (e) { return ''; } }
  function setTok(t) { try { if (t) localStorage.setItem(TK, t); else localStorage.removeItem(TK); } catch (e) {} }
  function post(path, body) {
    return fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error || ('HTTP ' + r.status)); e.code = j.error; throw e; } return j; }); });
  }
  function msg(e) { return ERR[e && e.code] || ('เกิดข้อผิดพลาด: ' + (e && e.message || e)); }
  function genPw() { var cs = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', a = new Uint32Array(10); crypto.getRandomValues(a); var s = ''; for (var i = 0; i < 10; i++) s += cs[a[i] % cs.length]; return s; }
  function accLabel(a) { if (a === 'all') return 'ทุกหน้า'; var arr = Array.isArray(a) ? a : [a]; return arr.map(function (k) { var p = PAGES.filter(function (x) { return x[0] === k; })[0]; return p ? p[1] : k; }).join(', '); }

  /* ---------- ใช้สิทธิ์ผู้ใช้กับหน้าเว็บ (แบบเดียวกับ pwCheck เดิม) ---------- */
  function apply(u) {
    try {
      sessionStorage.setItem('rb_username', u.name);
      sessionStorage.setItem('rb_email', u.email || '');
      sessionStorage.setItem('rb_access', Array.isArray(u.access) ? JSON.stringify(u.access) : u.access);
      sessionStorage.setItem('rb_perm', u.perm || 'edit');
      sessionStorage.setItem('rb_login', 'cloud');
    } catch (e) {}
    var gate = document.getElementById('pw-gate');
    if (u.access === 'all') { sessionStorage.setItem('rb_auth', '1'); if (gate) gate.style.display = 'none'; }
    else if (u.access === 'hr') { sessionStorage.setItem('rb_auth', 'hr'); if (gate) gate.style.display = 'none'; try { switchView('commission', document.getElementById('sb-comm')); enableHrMode(); } catch (e) {} if (u.perm === 'view' && window._applyReadOnly) setTimeout(_applyReadOnly, 800); }
    else { sessionStorage.setItem('rb_auth', 'limited'); if (gate) gate.style.display = 'none'; try { _applyLimitedAccess(u.access); } catch (e) {} if (u.perm === 'view' && window._applyReadOnly) setTimeout(_applyReadOnly, 800); }
    var chip = document.querySelector('.v2top-user'); if (chip) { chip.firstChild.textContent = String(u.name).slice(0, 2).toUpperCase(); chip.lastChild.textContent = u.name; }
  }
  window.rbLogout = function () { if (!confirm('ออกจากระบบ?')) return; setTok(''); try { sessionStorage.clear(); } catch (e) {} location.reload(); };

  /* ---------- หน้า Login ---------- */
  function card(inner) { var c = document.getElementById('v2auth'); if (c) c.innerHTML = inner; }
  function field(id, label, type, ph, ac) { return '<label class="v2a-l" for="' + id + '">' + label + '</label><div class="v2a-f"><input id="' + id + '" type="' + type + '" placeholder="' + ph + '" autocomplete="' + ac + '">' + (type === 'password' ? '<button type="button" class="v2a-eye" aria-label="แสดงรหัสผ่าน" onclick="var i=this.previousSibling;i.type=i.type===\'password\'?\'text\':\'password\'">👁</button>' : '') + '</div>'; }
  function head(sub) { return '<div class="v2a-logo"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" aria-hidden="true"><path d="M4 19V10M10 19V5M16 19v-6M22 19H2"/></svg></div><h1>Richbiotech Ads</h1><div class="v2a-sub">' + sub + '</div>'; }
  function showLogin(note) {
    card(head('Ads Analytics Dashboard') + '<form class="v2a-card" onsubmit="event.preventDefault();rbAuth.login()">' + field('v2a-user', 'อีเมลหรือชื่อผู้ใช้', 'text', 'email หรือ ชื่อ', 'username') + field('v2a-pass', 'รหัสผ่าน', 'password', 'password', 'current-password') +
      '<div class="v2a-err" id="v2a-err" role="alert">' + (note || '') + '</div><button class="v2a-btn" id="v2a-go" type="submit">เข้าสู่ระบบ</button></form>' +
      '<button type="button" class="v2a-old" onclick="rbAuth.old()">เข้าด้วยรหัสแบบเดิม</button>');
    var i = document.getElementById('v2a-user'); if (i) i.focus();
  }
  function showSetup() {
    card(head('ตั้งค่าผู้ดูแลระบบครั้งแรก') + '<form class="v2a-card" onsubmit="event.preventDefault();rbAuth.setup()"><div class="v2a-note">ระบบล็อกอินใหม่ยังไม่มีผู้ใช้ ตั้งบัญชีผู้ดูแล (สิทธิ์ทุกหน้า) ของคุณก่อน แล้วค่อยเพิ่มคนอื่นในหน้าจัดการผู้ใช้</div>' +
      field('v2a-name', 'ชื่อที่แสดง', 'text', 'เช่น Admin', 'name') + field('v2a-mail', 'อีเมล (ใช้เข้าสู่ระบบ)', 'email', 'name@richbiotech.com', 'username') + field('v2a-p1', 'ตั้งรหัสผ่าน (อย่างน้อย 6 ตัว)', 'password', 'password', 'new-password') + field('v2a-p2', 'ยืนยันรหัสผ่าน', 'password', 'password', 'new-password') +
      '<div class="v2a-err" id="v2a-err" role="alert"></div><button class="v2a-btn" id="v2a-go" type="submit">สร้างบัญชีผู้ดูแล</button></form>' +
      '<button type="button" class="v2a-old" onclick="rbAuth.old()">เข้าด้วยรหัสแบบเดิม</button>');
  }
  function busy(on, label) { var b = document.getElementById('v2a-go'); if (b) { b.disabled = on; if (label) b.textContent = label; } }
  function err(t) { var e = document.getElementById('v2a-err'); if (e) e.textContent = t; }

  window.rbAuth = {
    login: function () {
      var u = (document.getElementById('v2a-user').value || '').trim(), p = document.getElementById('v2a-pass').value || '';
      if (!u || !p) { err('กรอกชื่อผู้ใช้และรหัสผ่าน'); return; }
      busy(true, 'กำลังเข้าสู่ระบบ…'); err('');
      post('login', { login: u, password: p }).then(function (j) { setTok(j.token); apply(j.user); })
        .catch(function (e) { busy(false, 'เข้าสู่ระบบ'); err(msg(e)); var pi = document.getElementById('v2a-pass'); if (pi) { pi.value = ''; pi.focus(); } });
    },
    setup: function () {
      var n = (document.getElementById('v2a-name').value || '').trim() || 'Admin', m = (document.getElementById('v2a-mail').value || '').trim(), p1 = document.getElementById('v2a-p1').value || '', p2 = document.getElementById('v2a-p2').value || '';
      if (!m || p1.length < 6) { err(ERR.invalid); return; } if (p1 !== p2) { err('รหัสผ่านสองช่องไม่ตรงกัน'); return; }
      busy(true, 'กำลังสร้าง…'); err('');
      post('setup', { name: n, email: m, password: p1 }).then(function (j) { setTok(j.token); apply(j.user); })
        .catch(function (e) { busy(false, 'สร้างบัญชีผู้ดูแล'); err(msg(e)); if (e.code === 'already_setup') showLogin(); });
    },
    old: function () { var c = document.getElementById('v2auth'), b = document.getElementById('pw-box'); if (c) c.style.display = 'none'; if (b) { b.style.display = ''; var back = document.getElementById('v2a-back'); if (!back) { back = document.createElement('button'); back.id = 'v2a-back'; back.type = 'button'; back.className = 'v2a-old'; back.style.color = '#cbd5e1'; back.textContent = 'กลับไปหน้าเข้าสู่ระบบแบบใหม่'; back.onclick = function () { b.style.display = 'none'; c.style.display = ''; }; b.appendChild(back); } } }
  };

  function installLogin() {
    var gate = document.getElementById('pw-gate'), box = document.getElementById('pw-box');
    if (!gate || !box || document.getElementById('v2auth')) return;
    var st = document.createElement('style');
    st.textContent = [
      '#pw-gate.v2a-on{background:#F5F6FA!important}#pw-gate.v2a-on #pw-bg-video,#pw-gate.v2a-on #pw-bg-ov{display:none!important}',
      '#v2auth{position:relative;z-index:2;width:100%;max-width:420px;padding:24px 16px;box-sizing:border-box;font-family:"IBM Plex Sans Thai","Sarabun",system-ui,sans-serif;color:#0F172A;text-align:center}',
      '#v2auth *{box-sizing:border-box}#v2auth h1{margin:14px 0 2px;font-size:24px;font-weight:700}.v2a-sub{font-size:14px;color:#475569;margin-bottom:22px}',
      '.v2a-logo{width:64px;height:64px;margin:0 auto;border-radius:16px;background:#2563EB;display:flex;align-items:center;justify-content:center}',
      '.v2a-card{background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:24px;text-align:left;box-shadow:0 12px 32px rgba(15,23,42,.08)}',
      '.v2a-l{display:block;font-size:14px;font-weight:600;margin:0 0 6px}.v2a-f{position:relative;margin-bottom:16px}.v2a-f input{width:100%;height:46px;border:1px solid #D7DBE3;border-radius:10px;padding:0 44px 0 14px;font:inherit;font-size:15px;color:#0F172A;background:#fff}.v2a-f input:focus{outline:2px solid #2563EB;outline-offset:0;border-color:#93C5FD}',
      '.v2a-eye{position:absolute;right:6px;top:6px;width:34px;height:34px;border:0;background:none;cursor:pointer;opacity:.6;font-size:15px}',
      '.v2a-btn{width:100%;height:48px;border:0;border-radius:10px;background:#2563EB;color:#fff;font:inherit;font-size:16px;font-weight:700;cursor:pointer}.v2a-btn[disabled]{opacity:.6;cursor:wait}',
      '.v2a-err{min-height:20px;font-size:13px;color:#B91C1C;margin:-4px 0 10px}.v2a-note{font-size:13px;color:#334155;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:10px 12px;margin-bottom:16px}',
      '.v2a-old{margin-top:16px;border:0;background:none;color:#64748B;font:inherit;font-size:13px;text-decoration:underline;cursor:pointer}'
    ].join('\n');
    document.head.appendChild(st);
    var c = document.createElement('div'); c.id = 'v2auth'; c.innerHTML = '<div class="v2a-sub">กำลังโหลด…</div>';
    gate.appendChild(c); gate.classList.add('v2a-on'); box.style.display = 'none';
    var t = tok();
    var after = function () {
      fetch(API + 'status').then(function (r) { return r.json(); }).then(function (j) { if (j.setup) showSetup(); else showLogin(); })
        .catch(function () { showLogin('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ใช้ "เข้าด้วยรหัสแบบเดิม" ไปก่อน'); });
    };
    if (t) post('me', { token: t }).then(function (j) { apply(j.user); }).catch(function () { setTok(''); after(); });
    else after();
  }

  /* ---------- หน้าจัดการผู้ใช้ ---------- */
  var UM = { users: null, err: '', reveal: null, adding: false };
  function umBox() { return document.getElementById('userMgmtView'); }
  function umLoad() {
    var t = tok(); if (!t) { UM.users = null; umRender(); return; }
    post('users', { token: t }).then(function (j) { UM.users = j.users; UM.err = ''; umRender(); }).catch(function (e) { UM.err = msg(e); UM.users = null; umRender(); });
  }
  function umSave(user, note) {
    return post('save', { token: tok(), user: user }).then(function (j) { UM.users = j.users; UM.err = ''; if (note) UM.flash = note; umRender(); return j; })
      .catch(function (e) { alert(msg(e)); throw e; });
  }
  function pill(on, label, js) { return '<button type="button" class="um-p' + (on ? ' on' : '') + '" onclick="' + js + '">' + esc(label) + '</button>'; }
  function umRender() {
    var el = umBox(); if (!el) return;
    var h = '<div class="um"><div class="um-head"><div><h1>จัดการผู้ใช้ &amp; สิทธิ์</h1><div class="um-sub">เก็บบนเซิร์ฟเวอร์ · ทุกเครื่องใช้รายชื่อเดียวกัน · รหัสผ่านเข้ารหัสไว้ ดูย้อนหลังไม่ได้</div></div>' +
      (UM.users ? '<div class="um-tools"><button class="um-b" onclick="rbUM.importOld()">ดึงรายชื่อจากระบบเดิม</button><button class="um-b um-pri" onclick="rbUM.add()">+ เพิ่มผู้ใช้</button></div>' : '') + '</div>';
    if (!tok()) {
      h += '<div class="um-card um-pad">หน้านี้ใช้กับระบบล็อกอินใหม่ · ตอนนี้เข้าด้วยรหัสแบบเดิมอยู่ <button class="um-b um-pri" onclick="rbLogout()">ออกแล้วเข้าสู่ระบบแบบใหม่</button></div></div>';
      el.innerHTML = h; return;
    }
    if (UM.err) h += '<div class="um-card um-pad um-bad">' + esc(UM.err) + '</div>';
    if (UM.flash) { h += '<div class="um-card um-pad um-ok" role="status">' + esc(UM.flash) + '</div>'; UM.flash = ''; }
    if (UM.reveal) {
      h += '<div class="um-card um-pad um-reveal"><b>รหัสผ่านที่ตั้ง — แสดงครั้งเดียว คัดลอกส่งให้แต่ละคนตอนนี้เลย</b><table class="um-t"><thead><tr><th>ชื่อ</th><th>เข้าสู่ระบบด้วย</th><th>รหัสผ่าน</th></tr></thead><tbody>' +
        UM.reveal.map(function (r) { return '<tr><td>' + esc(r.name) + '</td><td>' + esc(r.email || r.name) + '</td><td><code>' + esc(r.pw) + '</code></td></tr>'; }).join('') +
        '</tbody></table><div class="um-tools"><button class="um-b um-pri" onclick="rbUM.copy()">คัดลอกทั้งหมด</button><button class="um-b" onclick="rbUM.hide()">ปิด (จะดูอีกไม่ได้)</button></div></div>';
    }
    if (UM.adding) {
      h += '<form class="um-card um-pad um-form" onsubmit="event.preventDefault();rbUM.create()"><b>เพิ่มผู้ใช้</b><div class="um-grid">' +
        '<label>ชื่อที่แสดง<input id="um-n" required></label><label>อีเมล (ไม่บังคับ)<input id="um-e" type="email"></label>' +
        '<label>สิทธิ์<select id="um-a"><option value="all">ทุกหน้า</option>' + PAGES.map(function (p) { return '<option value="' + p[0] + '">' + esc(p[1]) + '</option>'; }).join('') + '</select></label>' +
        '<label>การใช้งาน<select id="um-v"><option value="edit">แก้ไขได้</option><option value="view">ดูอย่างเดียว</option></select></label>' +
        '<label>รหัสผ่าน<input id="um-p" type="text" placeholder="เว้นว่าง = ระบบสุ่มให้" autocomplete="off"></label></div>' +
        '<div class="um-tools"><button class="um-b um-pri" type="submit">บันทึก</button><button class="um-b" type="button" onclick="rbUM.cancel()">ยกเลิก</button></div><div class="um-note">เพิ่มแล้วปรับสิทธิ์เพิ่มได้จากตารางด้านล่าง (เลือกได้หลายหน้า)</div></form>';
    }
    if (!UM.users) { h += '<div class="um-card um-pad">กำลังโหลด…</div></div>'; el.innerHTML = h; return; }
    var me = sessionStorage.getItem('rb_username');
    h += '<div class="um-card"><div class="um-scroll"><table class="um-t"><thead><tr><th>ผู้ใช้</th><th>สิทธิ์</th><th>การใช้งาน</th><th>รหัสผ่าน</th><th></th></tr></thead><tbody>' +
      UM.users.map(function (u) {
        var all = u.access === 'all', arr = all ? [] : (Array.isArray(u.access) ? u.access : [u.access]);
        var pills = pill(all, 'ทุกหน้า', 'rbUM.setAll(\'' + u.id + '\')') + PAGES.map(function (p) { return pill(!all && arr.indexOf(p[0]) >= 0, p[1], 'rbUM.toggle(\'' + u.id + '\',\'' + p[0] + '\')'); }).join('');
        return '<tr><td><div class="um-user"><span class="um-av">' + esc(String(u.name).slice(0, 2).toUpperCase()) + '</span><div><b>' + esc(u.name) + (u.name === me ? ' <small>(คุณ)</small>' : '') + '</b><small>' + esc(u.email || '—') + '</small></div></div></td>' +
          '<td><div class="um-pills">' + pills + '</div></td>' +
          '<td><select onchange="rbUM.perm(\'' + u.id + '\',this.value)" aria-label="การใช้งานของ ' + esc(u.name) + '"><option value="edit"' + (u.perm !== 'view' ? ' selected' : '') + '>แก้ไขได้</option><option value="view"' + (u.perm === 'view' ? ' selected' : '') + '>ดูอย่างเดียว</option></select></td>' +
          '<td><button class="um-b" onclick="rbUM.reset(\'' + u.id + '\')">ตั้งรหัสใหม่</button></td>' +
          '<td>' + (u.name === me ? '' : '<button class="um-b um-del" onclick="rbUM.del(\'' + u.id + '\')">ลบ</button>') + '</td></tr>';
      }).join('') + '</tbody></table></div></div><div class="um-note">ผู้ใช้เข้าสู่ระบบด้วยอีเมลหรือชื่อที่แสดง · ต้องมีผู้ใช้สิทธิ์ "ทุกหน้า" อย่างน้อย 1 คน</div></div>';
    el.innerHTML = h;
  }
  function find(id) { return (UM.users || []).filter(function (u) { return u.id === id; })[0]; }
  function base(u) { return { id: u.id, name: u.name, email: u.email, access: u.access, perm: u.perm }; }
  window.rbUM = {
    add: function () { UM.adding = true; umRender(); var n = document.getElementById('um-n'); if (n) n.focus(); },
    cancel: function () { UM.adding = false; umRender(); },
    create: function () {
      var n = document.getElementById('um-n').value.trim(), e = document.getElementById('um-e').value.trim(), a = document.getElementById('um-a').value, v = document.getElementById('um-v').value, p = document.getElementById('um-p').value.trim();
      var pw = p || genPw();
      umSave({ name: n, email: e, access: a === 'all' ? 'all' : [a], perm: v, password: pw }).then(function () { UM.adding = false; UM.reveal = (UM.reveal || []).concat([{ name: n, email: e, pw: pw }]); umRender(); });
    },
    setAll: function (id) { var u = find(id); if (!u || u.access === 'all') return; var b = base(u); b.access = 'all'; umSave(b); },
    toggle: function (id, k) {
      var u = find(id); if (!u) return; var arr = u.access === 'all' ? [] : (Array.isArray(u.access) ? u.access.slice() : [u.access]);
      var i = arr.indexOf(k); if (i >= 0) arr.splice(i, 1); else arr.push(k);
      if (!arr.length) { alert('ต้องเลือกอย่างน้อย 1 หน้า'); return; }
      var b = base(u); b.access = arr; umSave(b);
    },
    perm: function (id, v) { var u = find(id); if (!u) return; var b = base(u); b.perm = v; umSave(b); },
    reset: function (id) {
      var u = find(id); if (!u) return;
      var p = prompt('ตั้งรหัสใหม่ให้ ' + u.name + '\nพิมพ์รหัสใหม่ (อย่างน้อย 6 ตัว) หรือเว้นว่างให้ระบบสุ่ม\nเครื่องที่ ' + u.name + ' ล็อกอินค้างไว้จะถูกออกจากระบบ', '');
      if (p === null) return; var pw = p.trim() || genPw();
      var b = base(u); b.password = pw; umSave(b).then(function () { UM.reveal = (UM.reveal || []).concat([{ name: u.name, email: u.email, pw: pw }]); umRender(); });
    },
    del: function (id) { var u = find(id); if (!u || !confirm('ลบผู้ใช้ ' + u.name + ' ?\nคนนี้จะเข้าระบบไม่ได้อีก')) return; post('delete', { token: tok(), id: id }).then(function (j) { UM.users = j.users; umRender(); }).catch(function (e) { alert(msg(e)); }); },
    copy: function () { var t = (UM.reveal || []).map(function (r) { return r.name + '\t' + (r.email || r.name) + '\t' + r.pw; }).join('\n'); try { navigator.clipboard.writeText(t).then(function () { UM.flash = 'คัดลอกแล้ว'; umRender(); }); } catch (e) { prompt('คัดลอกข้อความนี้', t); } },
    hide: function () { if (confirm('ปิดตารางรหัส? หลังปิดจะดูรหัสเหล่านี้อีกไม่ได้')) { UM.reveal = null; umRender(); } },
    importOld: function () {
      var old = []; try { old = JSON.parse(localStorage.getItem('rb_access_users') || '[]') || []; } catch (e) {}
      var have = (UM.users || []).map(function (u) { return String(u.name).toLowerCase(); });
      var todo = old.filter(function (u) { return u && u.name && have.indexOf(String(u.name).toLowerCase()) < 0; });
      if (!todo.length) { alert('ไม่มีรายชื่อในระบบเดิมของเครื่องนี้ที่ยังไม่ได้ย้าย'); return; }
      if (!confirm('ย้าย ' + todo.length + ' คนจากระบบเดิมในเครื่องนี้:\n' + todo.map(function (u) { return '• ' + u.name + ' (' + accLabel(u.access) + ')'; }).join('\n') + '\n\nระบบจะสุ่มรหัสใหม่ให้ทุกคน (ไม่ใช้รหัสเดิม) แล้วแสดงให้คัดลอกครั้งเดียว')) return;
      var reveal = [], chain = Promise.resolve();
      todo.forEach(function (u) { chain = chain.then(function () { var pw = genPw(); return post('save', { token: tok(), user: { name: u.name, email: u.email || '', access: u.access || 'all', perm: u.perm === 'view' ? 'view' : 'edit', password: pw } }).then(function (j) { UM.users = j.users; reveal.push({ name: u.name, email: u.email, pw: pw }); }).catch(function (e) { reveal.push({ name: u.name, email: u.email, pw: '(ไม่สำเร็จ: ' + msg(e) + ')' }); }); }); });
      chain.then(function () { UM.reveal = (UM.reveal || []).concat(reveal); umRender(); });
    }
  };
  function installUM() {
    if (window._renderUserMgmt && !window._renderUserMgmt.v2) {
      var f = function (el) { umRender(); umLoad(); }; f.v2 = true; window._renderUserMgmt = f;
    }
    var st = document.createElement('style');
    st.textContent = [
      '#userMgmtView .um{font-family:"IBM Plex Sans Thai","Sarabun",system-ui,sans-serif;color:#0F172A;display:flex;flex-direction:column;gap:14px}',
      '#userMgmtView .um h1{margin:0;font-size:26px;font-weight:700}#userMgmtView .um-sub,#userMgmtView .um-note{font-size:13px;color:#475569}',
      '#userMgmtView .um-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px}#userMgmtView .um-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
      '#userMgmtView .um-card{background:#fff;border:1px solid #E5E7EB;border-radius:12px}#userMgmtView .um-pad{padding:16px 18px;display:flex;flex-direction:column;gap:10px}',
      '#userMgmtView .um-b{height:38px;padding:0 14px;border-radius:10px;border:1px solid #D7DBE3;background:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer;color:#0F172A}#userMgmtView .um-pri{background:#2563EB;border-color:#2563EB;color:#fff}#userMgmtView .um-del{color:#B91C1C;border-color:#FECACA}',
      '#userMgmtView .um-bad{color:#7F1D1D;background:#FEF2F2;border-color:#FECACA}#userMgmtView .um-ok{color:#14532D;background:#F0FDF4;border-color:#BBF7D0}#userMgmtView .um-reveal{background:#FFFBEB;border-color:#FDE68A}',
      '#userMgmtView .um-scroll{overflow-x:auto}#userMgmtView .um-t{width:100%;border-collapse:collapse;font-size:13px;min-width:900px}#userMgmtView .um-t th{padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#475569;background:#F8FAFC;border-bottom:1px solid #E5E7EB}#userMgmtView .um-t td{padding:12px 14px;border-bottom:1px solid #EEF1F6;vertical-align:middle}',
      '#userMgmtView .um-user{display:flex;gap:10px;align-items:center}#userMgmtView .um-user b{display:block}#userMgmtView .um-user small{display:block;color:#64748B;font-size:12px;font-weight:400}#userMgmtView .um-av{width:36px;height:36px;border-radius:50%;background:#EFF4FF;color:#1D4ED8;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex:none}',
      '#userMgmtView .um-pills{display:flex;flex-wrap:wrap;gap:4px;max-width:460px}#userMgmtView .um-p{height:28px;padding:0 10px;border-radius:99px;border:1px solid #E5E7EB;background:#fff;font:inherit;font-size:12px;cursor:pointer;color:#334155}#userMgmtView .um-p.on{background:#2563EB;border-color:#2563EB;color:#fff;font-weight:600}',
      '#userMgmtView select,#userMgmtView .um-form input{height:38px;border:1px solid #D7DBE3;border-radius:8px;padding:0 10px;font:inherit;font-size:13px;background:#fff}',
      '#userMgmtView .um-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}#userMgmtView .um-grid label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#475569}',
      '#userMgmtView code{background:#fff;border:1px solid #FDE68A;border-radius:6px;padding:2px 8px;font-size:14px}'
    ].join('\n');
    document.head.appendChild(st);
  }
  function addLogout() {
    var chip = document.querySelector('.v2top-user'); if (!chip || chip.getAttribute('data-lo')) return;
    chip.setAttribute('data-lo', '1'); chip.style.cursor = 'pointer'; chip.title = 'ออกจากระบบ'; chip.setAttribute('role', 'button'); chip.tabIndex = 0;
    chip.addEventListener('click', function () { window.rbLogout(); });
  }
  function start() { installLogin(); installUM(); var n = 0; var iv = setInterval(function () { addLogout(); if (++n > 20) clearInterval(iv); }, 1000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
