/* v2-budlog.js — ประวัติการแก้ไข: รวมประวัติของทุกคนจากเซิร์ฟเวอร์ (ไม่ใช่แค่เครื่องนี้) */
(function () {
  var W = 'https://richbiotech-fb-proxy.ads02.workers.dev/_camplog?kind=bud';
  var SRV = null, LOADING = false, LAST = 0;
  var localGet = window._rbLogGet;
  if (typeof localGet !== 'function') return;

  function conv(x) {
    var act = String(x.action || ''), i = act.indexOf(':');
    var type = i >= 0 ? act.slice(0, i) : act, sub = i >= 0 ? act.slice(i + 1) : '';
    var e = { ts: x.ts, date: x.date, time: x.time, user: x.actor || 'Unknown', account: x.campaignId || '', campaign: x.campaignName || '', type: type, _srv: 1 };
    if (type === 'budget') {
      var o = Number(x.oldValue), n = Number(x.newValue);
      e.budType = sub === 'auto' ? 'อัตโนมัติ · วัน' : (sub || 'วัน');
      e.oldVal = isNaN(o) ? x.oldValue : o; e.newVal = isNaN(n) ? x.newValue : n;
      e.diff = (isNaN(o) || isNaN(n)) ? 0 : n - o; e.isUp = e.diff > 0;
    } else if (type === 'date' && sub === 'auto') { e.oldVal = 'ต่อวันอัตโนมัติ (เที่ยงคืน)'; e.newVal = 'งบ ฿' + Number(x.newValue || 0).toLocaleString('th-TH') + (String(x.oldValue) === String(x.newValue) ? ' เท่าเดิม' : ' (เดิม ฿' + Number(x.oldValue || 0).toLocaleString('th-TH') + ')'); }
    else { e.oldVal = x.oldValue; e.newVal = x.newValue; }
    return e;
  }
  function same(a, b) {
    return a.account === b.account && a.campaign === b.campaign && a.type === b.type &&
      String(a.oldVal) === String(b.oldVal) && String(a.newVal) === String(b.newVal) && Math.abs((a.ts || 0) - (b.ts || 0)) < 180000;
  }
  function merged() {
    var loc = []; try { loc = localGet() || []; } catch (e) {}
    if (!SRV) return loc;
    var out = SRV.slice();
    loc.forEach(function (l) { if (!out.some(function (s) { return same(s, l); })) out.push(l); });
    out.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    return out.slice(0, 1500);
  }
  function rerender() {
    var el = document.getElementById('budgetLogView');
    if (el && el.offsetParent !== null && typeof window._renderBudgetLog === 'function') window._renderBudgetLog(el);
  }
  function load(force) {
    if (LOADING || (!force && SRV && Date.now() - LAST < 60000)) return;
    LOADING = true;
    fetch(W, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      SRV = (j.log || []).map(conv); LAST = Date.now(); LOADING = false; rerender();
    }).catch(function () { LOADING = false; });
  }
  window._rbLogGet = function () { load(false); return merged(); };

  // เติมตัวกรอง "ผู้แก้ไข" + หมายเหตุว่าเป็นของทุกคน
  var origRender = window._renderBudgetLog;
  if (typeof origRender === 'function') {
    window._renderBudgetLog = function (el) {
      var fu = el._filterUser || '';
      var g = window._rbLogGet;
      if (fu) window._rbLogGet = function () { return g().filter(function (e) { return e.user === fu; }); };
      try { origRender(el); } finally { window._rbLogGet = g; }
      try {
        var users = []; g().forEach(function (e) { if (users.indexOf(e.user) < 0) users.push(e.user); });
        users.sort();
        var acc = el.querySelector('#bl-acc');
        if (acc && !el.querySelector('#bl-user')) {
          var s = document.createElement('select'); s.id = 'bl-user'; s.style.cssText = acc.style.cssText;
          s.innerHTML = '<option value="">ทุกคน</option>' + users.map(function (u) { return '<option' + (u === fu ? ' selected' : '') + '>' + u.replace(/</g, '&lt;') + '</option>'; }).join('');
          s.onchange = function () { el._filterUser = this.value; window._renderBudgetLog(el); };
          acc.parentNode.insertBefore(s, acc);
        }
        var sub = el.querySelector('div[style*="margin-top:2px"]');
        if (sub) sub.textContent = 'บันทึกทุกครั้งที่ปรับงบ / ปรับวันที่แคมเปญ · รวมของทุกคน' + (SRV ? '' : ' (กำลังโหลด…)');
      } catch (e) {}
    };
  }
  load(true);
})();
