// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');

async function api(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(path, opts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data && data.error) || `Chyba ${res.status}`);
  return data;
}
const get = (p) => api('GET', p);

function toast(msg, kind = '') {
  let box = $('#toast');
  if (!box) { box = document.createElement('div'); box.id = 'toast'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
const err = (e) => toast(e.message || String(e), 'err');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtDate = (s) => { const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric' }); };
const fmtDeadline = (iso) => new Date(iso).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
const todayStr = () => new Date().toISOString().slice(0, 10);
function addDays(s, n) { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

let ME = null;
let CENTERS = [], CATERERS = [];

// ---------- bootstrap ----------
(async function init() {
  try { ME = await get('/api/me'); } catch { ME = null; }
  render();
})();

function render() {
  if (!ME) return renderLogin();
  return ME.role === 'admin' ? renderAdmin() : renderDiner();
}

// ---------- login ----------
function renderLogin() {
  app.innerHTML = `
    <div class="login-wrap">
      <div class="card">
        <h2>🍽️ Objednávanie obedov</h2>
        <p class="muted">Prihláste sa svojím kontom.</p>
        <form id="loginForm">
          <div class="field"><label>Prihlasovacie meno</label><input name="username" autocomplete="username" required></div>
          <div class="field"><label>Heslo</label><input name="password" type="password" autocomplete="current-password" required></div>
          <button class="btn" style="width:100%">Prihlásiť sa</button>
        </form>
      </div>
    </div>`;
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      ME = await api('POST', '/api/login', { username: f.get('username'), password: f.get('password') });
      render();
    } catch (ex) { err(ex); }
  });
}

function shell(tabs, activeTab) {
  const tabBtns = tabs.map((t) => `<button data-tab="${t.id}" class="${t.id === activeTab ? 'active' : ''}">${t.label}</button>`).join('');
  app.innerHTML = `
    <div class="topbar">
      <span class="brand">🍽️ Obedy</span>
      <span class="who">${esc(ME.full_name)} · ${ME.role === 'admin' ? 'administrátor' : 'stravník'}</span>
      <button class="btn ghost sm" id="logoutBtn">Odhlásiť</button>
    </div>
    <div class="container">
      <div class="tabs">${tabBtns}</div>
      <div id="view"></div>
    </div>`;
  $('#logoutBtn').addEventListener('click', async () => { await api('POST', '/api/logout'); ME = null; render(); });
  app.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
    const t = tabs.find((x) => x.id === b.dataset.tab);
    shell(tabs, t.id); t.render($('#view'));
  }));
  tabs.find((t) => t.id === activeTab).render($('#view'));
}

// ==================== DINER ====================
function renderDiner() {
  const tabs = [
    { id: 'menu', label: 'Menu a objednávky', render: dinerMenu },
    { id: 'history', label: 'Moje objednávky', render: dinerHistory },
    { id: 'absence', label: 'Odhlásenie (neprítomnosť)', render: dinerAbsences },
  ];
  shell(tabs, 'menu');
}

async function dinerMenu(view) {
  view.innerHTML = '<div class="card">Načítavam menu…</div>';
  const from = todayStr(); const to = addDays(from, 14);
  let days;
  try { days = await get(`/api/menu/available?from=${from}&to=${to}`); } catch (e) { return err(e); }
  if (!days.length) { view.innerHTML = '<div class="card">Momentálne nie je nahraté žiadne menu na najbližšie dni.</div>'; return; }
  view.innerHTML = `<div class="card"><h2>Vyberte si obed</h2>
    <p class="muted">Po objednaní už nie je možná spätná zmena. Zrušiť sa dá len do termínu uzávierky.</p>
    <div id="days"></div></div>`;
  const wrap = $('#days', view);
  for (const day of days) {
    const el = document.createElement('div');
    el.className = 'day';
    const lockBadge = day.locked ? '<span class="badge locked">Uzavreté</span>'
      : `<span class="badge warn">do ${fmtDeadline(day.deadline)}</span>`;
    const choices = day.items.map((it) => {
      const selected = day.my_order && day.my_order.menu_item_id === it.id;
      const disabled = day.locked || (day.my_order && !selected);
      return `<div class="choice ${selected ? 'selected' : ''}">
        <div class="info"><strong>${esc(it.label)}</strong> — ${esc(it.name)}
          <div class="muted">${esc(it.caterer_name)}${it.description ? ' · ' + esc(it.description) : ''}</div></div>
        <span class="price">${it.price} €</span>
        ${selected
          ? (day.locked ? '<span class="badge ok">Objednané</span>' : `<button class="btn danger sm" data-cancel="${day.my_order.id}">Zrušiť</button>`)
          : `<button class="btn sm" data-order="${it.id}" ${disabled ? 'disabled' : ''}>Objednať</button>`}
      </div>`;
    }).join('');
    el.innerHTML = `<div class="day-head"><span class="date">${fmtDate(day.service_date)}</span> ${lockBadge}
      ${day.my_order ? `<span class="badge ok">Vybraté: ${esc(day.my_order.label)}</span>` : ''}</div>${choices}`;
    wrap.appendChild(el);
  }
  wrap.querySelectorAll('[data-order]').forEach((b) => b.addEventListener('click', async () => {
    try { await api('POST', '/api/orders', { menu_item_id: Number(b.dataset.order) }); toast('Objednané ✓', 'ok'); dinerMenu(view); }
    catch (e) { err(e); }
  }));
  wrap.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', async () => {
    try { await api('DELETE', `/api/orders/${b.dataset.cancel}`); toast('Objednávka zrušená', 'ok'); dinerMenu(view); }
    catch (e) { err(e); }
  }));
}

async function dinerHistory(view) {
  const from = addDays(todayStr(), -60); const to = addDays(todayStr(), 30);
  let rows; try { rows = await get(`/api/orders/mine?from=${from}&to=${to}`); } catch (e) { return err(e); }
  view.innerHTML = `<div class="card"><h2>Moje objednávky</h2>
    <p class="muted">Prehľad (bez možnosti spätnej zmeny).</p>
    <div class="table-wrap"><table><thead><tr>
      <th>Dátum</th><th>Menu</th><th>Názov</th><th>Partner</th><th class="right">Cena</th><th>Stav</th></tr></thead>
      <tbody>${rows.map((r) => `<tr>
        <td>${fmtDate(r.service_date)}</td><td>${esc(r.label)}</td><td>${esc(r.item_name)}</td>
        <td>${esc(r.caterer_name)}</td><td class="right">${r.price} €</td>
        <td>${r.status === 'cancelled' ? '<span class="badge locked">zrušené</span>'
          : r.is_faulty ? '<span class="badge bad">chybné</span>' : '<span class="badge ok">platné</span>'}</td></tr>`).join('')
        || '<tr><td colspan="6" class="muted">Žiadne objednávky.</td></tr>'}</tbody></table></div></div>`;
}

async function dinerAbsences(view) {
  let rows; try { rows = await get('/api/absences/mine'); } catch (e) { return err(e); }
  view.innerHTML = `<div class="card"><h2>Odhlásenie na obdobie neprítomnosti</h2>
    <p class="muted">Objednávky v tomto období (ktoré ešte nie sú po uzávierke) budú automaticky zrušené.</p>
    <form id="absForm" class="row">
      <div class="grow"><label>Od</label><input type="date" name="from_date" value="${todayStr()}" required></div>
      <div class="grow"><label>Do</label><input type="date" name="to_date" value="${todayStr()}" required></div>
      <div class="grow"><label>Poznámka</label><input name="note" placeholder="napr. dovolenka"></div>
      <button class="btn">Odhlásiť</button>
    </form>
    <div class="table-wrap" style="margin-top:1rem"><table><thead><tr><th>Od</th><th>Do</th><th>Poznámka</th><th></th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td>${r.from_date}</td><td>${r.to_date}</td><td>${esc(r.note || '')}</td>
      <td><button class="btn ghost sm" data-del="${r.id}">Zrušiť</button></td></tr>`).join('')
      || '<tr><td colspan="4" class="muted">Žiadne odhlásenia.</td></tr>'}</tbody></table></div></div>`;
  $('#absForm', view).addEventListener('submit', async (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    try { await api('POST', '/api/absences', Object.fromEntries(f)); toast('Odhlásené ✓', 'ok'); dinerAbsences(view); }
    catch (ex) { err(ex); }
  });
  view.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    try { await api('DELETE', `/api/absences/${b.dataset.del}`); dinerAbsences(view); } catch (e) { err(e); }
  }));
}

// ==================== ADMIN ====================
async function loadLookups() {
  [CENTERS, CATERERS] = await Promise.all([get('/api/centers'), get('/api/caterers')]);
}

function renderAdmin() {
  const tabs = [
    { id: 'orders', label: 'Objednávky', render: adminOrders },
    { id: 'menu', label: 'Menu', render: adminMenu },
    { id: 'users', label: 'Stravníci', render: adminUsers },
    { id: 'org', label: 'Strediská a partneri', render: adminOrg },
    { id: 'report', label: 'Rozúčtovanie', render: adminReport },
    { id: 'data', label: 'Export / Import', render: adminData },
    { id: 'settings', label: 'Nastavenia', render: adminSettings },
  ];
  loadLookups().then(() => shell(tabs, 'orders')).catch(err);
}

// ----- Objednávky (view / aggregate) -----
async function adminOrders(view) {
  view.innerHTML = `<div class="card">
    <h2>Objednávky</h2>
    <div class="row">
      <div><label>Obdobie</label><select id="period">
        <option value="day">Deň</option><option value="week">Týždeň</option>
        <option value="month" selected>Mesiac</option><option value="year">Rok</option></select></div>
      <div><label>Referenčný dátum</label><input type="date" id="ref" value="${todayStr()}"></div>
      <div><label>Stredisko</label><select id="center"><option value="">— všetky —</option>
        ${CENTERS.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
      <div><label>Zoskupenie</label><select id="group">
        <option value="none">Jednotlivo</option><option value="user">Podľa stravníka</option>
        <option value="center">Podľa strediska</option><option value="date">Podľa dňa</option>
        <option value="caterer">Podľa partnera</option></select></div>
      <button class="btn" id="load">Zobraziť</button>
    </div>
    <div id="ordersOut" style="margin-top:1rem"></div></div>`;

  async function load() {
    const period = $('#period', view).value, ref = $('#ref', view).value;
    const center = $('#center', view).value, group = $('#group', view).value;
    const q = new URLSearchParams({ period, ref, group });
    if (center) q.set('center_id', center);
    let data; try { data = await get(`/api/orders?${q}`); } catch (e) { return err(e); }
    const out = $('#ordersOut', view);
    const head = `<p class="muted">Obdobie ${data.from} – ${data.to}</p>`;
    if (group !== 'none') {
      out.innerHTML = head + `<div class="table-wrap"><table><thead><tr>
        <th>${{ user: 'Stravník', center: 'Stredisko', date: 'Deň', caterer: 'Partner' }[group]}</th>
        <th class="right">Počet</th><th class="right">Chybné</th><th class="right">Suma (€)</th></tr></thead><tbody>
        ${data.rows.map((r) => `<tr><td>${esc(r.label ?? '—')}</td><td class="right">${r.count}</td>
          <td class="right">${r.faulty_count || 0}</td><td class="right">${r.total}</td></tr>`).join('')
          || '<tr><td colspan="4" class="muted">Žiadne dáta.</td></tr>'}
        <tr><th>Spolu</th><th class="right">${data.rows.reduce((s, r) => s + r.count, 0)}</th><th></th>
          <th class="right">${data.rows.reduce((s, r) => s + Number(r.total), 0).toFixed(2)}</th></tr>
        </tbody></table></div>`;
    } else {
      out.innerHTML = head + `<div class="table-wrap"><table><thead><tr>
        <th>Dátum</th><th>Stravník</th><th>Stredisko</th><th>Menu</th><th>Názov</th><th>Partner</th>
        <th class="right">Cena</th><th>Chyba</th></tr></thead><tbody>
        ${data.rows.map((r) => `<tr>
          <td>${fmtDate(r.service_date)}</td><td>${esc(r.full_name)}</td><td>${esc(r.center_name || '')}</td>
          <td>${esc(r.label)}</td><td>${esc(r.item_name)}</td><td>${esc(r.caterer_name)}</td>
          <td class="right">${r.price} €</td>
          <td>${r.is_faulty ? `<span class="badge bad" title="${esc(r.faulty_note || '')}">chyba</span>` : ''}
            <button class="btn ghost sm" data-faulty="${r.id}" data-cur="${r.is_faulty ? 1 : 0}">${r.is_faulty ? 'zrušiť' : 'označiť'}</button>
          </td></tr>`).join('') || '<tr><td colspan="8" class="muted">Žiadne objednávky.</td></tr>'}
        </tbody></table></div>`;
      out.querySelectorAll('[data-faulty]').forEach((b) => b.addEventListener('click', async () => {
        const cur = b.dataset.cur === '1';
        const note = cur ? null : prompt('Poznámka k chybnej objednávke / dodávke:') || '';
        try { await api('PATCH', `/api/orders/${b.dataset.faulty}/faulty`, { is_faulty: !cur, note }); load(); }
        catch (e) { err(e); }
      }));
    }
  }
  $('#load', view).addEventListener('click', load);
  load();
}

// ----- Menu management -----
async function adminMenu(view) {
  const from = todayStr(), to = addDays(from, 21);
  view.innerHTML = `<div class="card"><h2>Nahrať / editovať menu</h2>
    <form id="menuForm" class="row">
      <div><label>Partner</label><select name="caterer_id" required>
        ${CATERERS.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
      <div><label>Dátum</label><input type="date" name="service_date" value="${todayStr()}" required></div>
      <div><label>Označenie</label><input name="label" placeholder="Menu A" required style="width:90px"></div>
      <div class="grow"><label>Názov jedla</label><input name="name" placeholder="Sviečková…" required></div>
      <div class="grow"><label>Popis</label><input name="description" placeholder="príloha…"></div>
      <div><label>Cena €</label><input name="price" type="number" step="0.01" value="5.90" style="width:90px" required></div>
      <button class="btn">Pridať</button>
    </form></div>
    <div class="card"><h3>Nahraté menu (najbližšie 3 týždne)</h3><div id="menuList">…</div></div>`;

  $('#menuForm', view).addEventListener('submit', async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    try { await api('POST', '/api/menu', { ...f, caterer_id: Number(f.caterer_id), price: Number(f.price) }); toast('Pridané ✓', 'ok'); loadList(); e.target.reset(); }
    catch (ex) { err(ex); }
  });

  async function loadList() {
    let rows; try { rows = await get(`/api/menu?from=${from}&to=${to}`); } catch (e) { return err(e); }
    $('#menuList', view).innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>Dátum</th><th>Partner</th><th>Menu</th><th>Názov</th><th class="right">Cena</th><th>Stav</th><th></th></tr></thead><tbody>
      ${rows.map((r) => `<tr>
        <td>${fmtDate(r.service_date)}</td><td>${esc(r.caterer_name)}</td><td>${esc(r.label)}</td>
        <td>${esc(r.name)}${r.description ? `<div class="muted">${esc(r.description)}</div>` : ''}</td>
        <td class="right">${r.price} €</td>
        <td>${r.active ? '<span class="badge ok">aktívne</span>' : '<span class="badge locked">neaktívne</span>'}</td>
        <td><button class="btn ghost sm" data-toggle="${r.id}" data-active="${r.active ? 1 : 0}">${r.active ? 'skryť' : 'obnoviť'}</button>
            <button class="btn danger sm" data-del="${r.id}">×</button></td></tr>`).join('')
        || '<tr><td colspan="7" class="muted">Žiadne položky.</td></tr>'}</tbody></table></div>`;
    $('#menuList', view).querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', async () => {
      try { await api('PATCH', `/api/menu/${b.dataset.toggle}`, { active: b.dataset.active !== '1' }); loadList(); } catch (e) { err(e); }
    }));
    $('#menuList', view).querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Zmazať položku menu?')) return;
      try { await api('DELETE', `/api/menu/${b.dataset.del}`); loadList(); } catch (e) { err(e); }
    }));
  }
  loadList();
}

// ----- Users (stravníci) -----
async function adminUsers(view) {
  view.innerHTML = `<div class="card"><h2>Stravníci</h2>
    <form id="userForm" class="row">
      <div><label>Login</label><input name="username" required style="width:120px"></div>
      <div class="grow"><label>Celé meno</label><input name="full_name" required></div>
      <div><label>Heslo</label><input name="password" required style="width:120px"></div>
      <div><label>Stredisko</label><select name="center_id"><option value="">—</option>
        ${CENTERS.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
      <div><label>Rola</label><select name="role"><option value="diner">stravník</option><option value="admin">admin</option></select></div>
      <button class="btn">Pridať</button>
    </form></div>
    <div class="card"><div id="usersList">…</div></div>`;
  $('#userForm', view).addEventListener('submit', async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    try { await api('POST', '/api/users', { ...f, center_id: f.center_id ? Number(f.center_id) : null }); toast('Pridaný ✓', 'ok'); loadList(); e.target.reset(); }
    catch (ex) { err(ex); }
  });
  async function loadList() {
    let rows; try { rows = await get('/api/users'); } catch (e) { return err(e); }
    $('#usersList', view).innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>Login</th><th>Meno</th><th>Stredisko</th><th>Rola</th><th>Stav</th><th>Akcie</th></tr></thead><tbody>
      ${rows.map((r) => `<tr>
        <td>${esc(r.username)}</td><td>${esc(r.full_name)}</td>
        <td><select data-center="${r.id}"><option value="">—</option>
          ${CENTERS.map((c) => `<option value="${c.id}" ${c.id === r.center_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></td>
        <td>${r.role}</td>
        <td>${r.active ? '<span class="badge ok">aktívny</span>' : '<span class="badge locked">neaktívny</span>'}</td>
        <td>
          <button class="btn ghost sm" data-pass="${r.id}">heslo</button>
          <button class="btn ghost sm" data-toggle="${r.id}" data-active="${r.active ? 1 : 0}">${r.active ? 'deaktiv.' : 'aktiv.'}</button>
        </td></tr>`).join('')}</tbody></table></div>`;
    const list = $('#usersList', view);
    list.querySelectorAll('[data-center]').forEach((s) => s.addEventListener('change', async () => {
      try { await api('PATCH', `/api/users/${s.dataset.center}`, { center_id: s.value ? Number(s.value) : null }); toast('Uložené', 'ok'); } catch (e) { err(e); }
    }));
    list.querySelectorAll('[data-pass]').forEach((b) => b.addEventListener('click', async () => {
      const p = prompt('Nové heslo:'); if (!p) return;
      try { await api('PATCH', `/api/users/${b.dataset.pass}`, { password: p }); toast('Heslo zmenené', 'ok'); } catch (e) { err(e); }
    }));
    list.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', async () => {
      try { await api('PATCH', `/api/users/${b.dataset.toggle}`, { active: b.dataset.active !== '1' }); loadList(); } catch (e) { err(e); }
    }));
  }
  loadList();
}

// ----- Org (centers + caterers) -----
async function adminOrg(view) {
  view.innerHTML = `
    <div class="card"><h2>Strediská</h2>
      <form id="cForm" class="row"><div class="grow"><label>Názov strediska</label><input name="name" required></div><button class="btn">Pridať</button></form>
      <div id="cList" style="margin-top:.8rem"></div></div>
    <div class="card"><h2>Catering partneri</h2>
      <form id="pForm" class="row"><div class="grow"><label>Názov partnera</label><input name="name" required></div><button class="btn">Pridať</button></form>
      <div id="pList" style="margin-top:.8rem"></div></div>`;
  async function reload() {
    await loadLookups();
    $('#cList', view).innerHTML = CENTERS.map((c) => `<div class="choice"><div class="info">${esc(c.name)}</div>
      ${c.active ? '' : '<span class="badge locked">neaktívne</span>'}
      <button class="btn ghost sm" data-ctoggle="${c.id}" data-active="${c.active ? 1 : 0}">${c.active ? 'skryť' : 'obnoviť'}</button></div>`).join('') || '<p class="muted">Žiadne.</p>';
    $('#pList', view).innerHTML = CATERERS.map((c) => `<div class="choice"><div class="info">${esc(c.name)}</div>
      ${c.active ? '' : '<span class="badge locked">neaktívne</span>'}
      <button class="btn ghost sm" data-ptoggle="${c.id}" data-active="${c.active ? 1 : 0}">${c.active ? 'skryť' : 'obnoviť'}</button></div>`).join('') || '<p class="muted">Žiadni.</p>';
    view.querySelectorAll('[data-ctoggle]').forEach((b) => b.addEventListener('click', async () => {
      try { await api('PATCH', `/api/centers/${b.dataset.ctoggle}`, { active: b.dataset.active !== '1' }); reload(); } catch (e) { err(e); }
    }));
    view.querySelectorAll('[data-ptoggle]').forEach((b) => b.addEventListener('click', async () => {
      try { await api('PATCH', `/api/caterers/${b.dataset.ptoggle}`, { active: b.dataset.active !== '1' }); reload(); } catch (e) { err(e); }
    }));
  }
  $('#cForm', view).addEventListener('submit', async (e) => {
    e.preventDefault(); try { await api('POST', '/api/centers', { name: new FormData(e.target).get('name') }); e.target.reset(); reload(); } catch (ex) { err(ex); }
  });
  $('#pForm', view).addEventListener('submit', async (e) => {
    e.preventDefault(); try { await api('POST', '/api/caterers', { name: new FormData(e.target).get('name') }); e.target.reset(); reload(); } catch (ex) { err(ex); }
  });
  reload();
}

// ----- Report / billing -----
async function adminReport(view) {
  view.innerHTML = `<div class="card"><h2>Rozúčtovanie</h2>
    <div class="row">
      <div><label>Obdobie</label><select id="period"><option value="month" selected>Mesiac</option>
        <option value="week">Týždeň</option><option value="year">Rok</option><option value="day">Deň</option></select></div>
      <div><label>Referenčný dátum</label><input type="date" id="ref" value="${todayStr()}"></div>
      <div><label>Stredisko</label><select id="center"><option value="">— všetky —</option>
        ${CENTERS.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
      <button class="btn" id="load">Zobraziť</button>
      <button class="btn ok" id="csv">Export CSV</button>
    </div>
    <div id="repOut" style="margin-top:1rem"></div></div>`;
  function params() {
    const q = new URLSearchParams({ period: $('#period', view).value, ref: $('#ref', view).value });
    const c = $('#center', view).value; if (c) q.set('center_id', c); return q;
  }
  async function load() {
    let d; try { d = await get(`/api/report/billing?${params()}`); } catch (e) { return err(e); }
    $('#repOut', view).innerHTML = `<p class="muted">Obdobie ${d.from} – ${d.to} · Na účtovanie spolu: <strong>${d.total_billable} €</strong> (chybné dodávky sa neúčtujú)</p>
      <div class="table-wrap"><table><thead><tr><th>Stravník</th><th>Stredisko</th>
        <th class="right">Obedy</th><th class="right">Chybné</th><th class="right">Na účtovanie (€)</th></tr></thead><tbody>
        ${d.rows.map((r) => `<tr><td>${esc(r.full_name)}</td><td>${esc(r.center_name || '')}</td>
          <td class="right">${r.meals}</td><td class="right">${r.faulty || 0}</td><td class="right">${r.billable}</td></tr>`).join('')
          || '<tr><td colspan="5" class="muted">Žiadne dáta.</td></tr>'}</tbody></table></div>`;
  }
  $('#load', view).addEventListener('click', load);
  $('#csv', view).addEventListener('click', () => { window.location = `/api/export/billing.csv?${params()}`; });
  load();
}

// ----- Data export / import -----
async function adminData(view) {
  view.innerHTML = `
    <div class="card"><h2>Export objednávok</h2>
      <div class="row">
        <div><label>Od</label><input type="date" id="from" value="${addDays(todayStr(), -30)}"></div>
        <div><label>Do</label><input type="date" id="to" value="${todayStr()}"></div>
        <button class="btn ok" id="expRange">Export CSV (rozsah)</button>
      </div>
      <p class="muted" style="margin-top:.6rem">Rýchly export:</p>
      <div class="row">
        <button class="btn ghost sm" data-p="week">Tento týždeň</button>
        <button class="btn ghost sm" data-p="month">Tento mesiac</button>
        <button class="btn ghost sm" data-p="year">Tento rok</button>
      </div>
    </div>
    <div class="card"><h2>Import historických objednávok (CSV)</h2>
      <p class="muted">Stĺpce: <code>datum;login;partner;menu;nazov;cena;chybna</code> (oddeľovač ; alebo ,). Neznámi stravníci sa preskočia.</p>
      <textarea id="csvText" placeholder="datum;login;partner;menu;nazov;cena&#10;2025-01-15;jnovak;Gastro Plus;Menu A;Guláš;5.90"></textarea>
      <div class="row" style="margin-top:.5rem">
        <input type="file" id="csvFile" accept=".csv,text/csv" style="width:auto">
        <button class="btn" id="doImport">Importovať</button>
      </div>
      <div id="importOut" class="muted" style="margin-top:.6rem"></div>
    </div>`;
  $('#expRange', view).addEventListener('click', () => {
    const q = new URLSearchParams({ from: $('#from', view).value, to: $('#to', view).value });
    window.location = `/api/export/orders.csv?${q}`;
  });
  view.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
    window.location = `/api/export/orders.csv?period=${b.dataset.p}&ref=${todayStr()}`;
  }));
  $('#csvFile', view).addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader(); r.onload = () => { $('#csvText', view).value = r.result; }; r.readAsText(file);
  });
  $('#doImport', view).addEventListener('click', async () => {
    const text = $('#csvText', view).value.trim();
    if (!text) return toast('Vložte CSV dáta', 'err');
    try {
      const res = await fetch('/api/import/orders', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: text });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      $('#importOut', view).innerHTML = `Importovaných ${d.imported} z ${d.total} riadkov.` +
        (d.errors.length ? `<br>Chyby:<br>${d.errors.slice(0, 20).map(esc).join('<br>')}` : '');
      toast('Import hotový ✓', 'ok');
    } catch (e) { err(e); }
  });
}

// ----- Settings (cutoff) -----
async function adminSettings(view) {
  let s; try { s = await get('/api/settings'); } catch (e) { return err(e); }
  view.innerHTML = `<div class="card"><h2>Termíny uzávierky</h2>
    <p class="muted">Dokedy sa musí stravník zahlásiť / odhlásiť na obed pre daný deň.</p>
    <form id="setForm" class="row">
      <div><label>Počet dní pred obedom</label><input type="number" name="cutoff_days_before" min="0" value="${s.cutoff_days_before}" style="width:120px"></div>
      <div><label>Čas uzávierky</label><input type="time" name="cutoff_time" value="${s.cutoff_time}"></div>
      <button class="btn">Uložiť</button>
    </form>
    <p class="muted" style="margin-top:.6rem">Príklad: 1 deň, 10:00 → na pondelok sa treba zahlásiť do piatku (resp. predch. dňa) 10:00.</p>
    </div>`;
  $('#setForm', view).addEventListener('submit', async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    try { await api('PUT', '/api/settings', { cutoff_days_before: Number(f.cutoff_days_before), cutoff_time: f.cutoff_time }); toast('Uložené ✓', 'ok'); }
    catch (ex) { err(ex); }
  });
}
