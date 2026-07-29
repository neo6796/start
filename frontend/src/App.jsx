import React, { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

export default function App() {
  // ?tab=admin umožní poslať nákupcovi priamy odkaz na Spracovanie.
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return ['order', 'summary', 'admin'].includes(t) ? t : 'order';
  });
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ ok: false }));
  }, []);

  // Samostatná stránka pre kuriéra: /kurier?t=<token>
  if (window.location.pathname === '/kurier') {
    return <CourierPage />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="logo-img" src="/logo.png" alt="Aha farma" />
          <div>
            <h1>Objednávanie mlieka</h1>
            <p className="subtitle">Interný firemný nástroj</p>
          </div>
        </div>
        {health && (
          <span className={`badge ${health.whatsapp === 'live' ? 'live' : 'dev'}`}>
            WhatsApp: {health.whatsapp === 'live' ? 'aktívne' : 'dev režim'}
          </span>
        )}
      </header>

      <InstallBanner />

      <nav className="tabs">
        <button className={tab === 'order' ? 'active' : ''} onClick={() => setTab('order')}>
          Objednať
        </button>
        <button className={tab === 'summary' ? 'active' : ''} onClick={() => setTab('summary')}>
          Súhrn
        </button>
        <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>
          Spracovanie
        </button>
      </nav>

      <main className="content">
        {tab === 'order' ? <OrderForm /> : tab === 'summary' ? <Summary /> : <AdminPanel />}
      </main>

      <footer className="foot">Objednávky sa uzatvárajú podľa dohody vo firme (napr. štvrtok 12:00).</footer>
    </div>
  );
}

function InstallBanner() {
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('mlieko_install_dismissed') === '1'
  );

  // Beží appka už ako "nainštalovaná" (standalone)? Potom banner nezobrazuj.
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault();
      setDeferred(e);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (standalone || dismissed) return null;

  function close() {
    setDismissed(true);
    localStorage.setItem('mlieko_install_dismissed', '1');
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    close();
  }

  // Android / Huawei / desktop Chromium – natívna výzva na inštaláciu.
  if (deferred) {
    return (
      <div className="install-banner">
        <span>📲 Pridať appku na plochu telefónu?</span>
        <div className="install-actions">
          <button className="ghost" onClick={close}>Neskôr</button>
          <button className="primary small" onClick={install}>Nainštalovať</button>
        </div>
      </div>
    );
  }

  // iPhone – Safari nemá automatickú výzvu, ukáž krátky návod.
  if (isIOS) {
    return (
      <div className="install-banner">
        <span>📲 Pridaj na plochu: klepni na <strong>Zdieľať</strong> → <strong>Pridať na plochu</strong>.</span>
        <div className="install-actions">
          <button className="ghost" onClick={close}>OK</button>
        </div>
      </div>
    );
  }

  return null;
}

function OrderForm() {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState(() => localStorage.getItem('mlieko_name') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('mlieko_phone') || '');
  const [note, setNote] = useState('');
  const [qtys, setQtys] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [deadline, setDeadline] = useState(null);

  useEffect(() => {
    api.products()
      .then((p) => setProducts(p))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    api.config().then((c) => setDeadline(c.deadline)).catch(() => {});
  }, []);

  const closed = deadline && deadline.enforced && !deadline.open;

  const categories = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category).push(p);
    }
    return [...map.entries()];
  }, [products]);

  const totalUnits = Object.values(qtys).reduce((s, q) => s + (Number(q) || 0), 0);

  function setQty(id, value) {
    const n = Math.max(0, Math.min(999, Math.floor(Number(value) || 0)));
    setQtys((prev) => ({ ...prev, [id]: n }));
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const items = Object.entries(qtys)
      .filter(([, q]) => Number(q) > 0)
      .map(([productId, qty]) => ({ productId, qty: Number(qty) }));

    if (!name.trim()) return setError('Zadaj svoje meno.');
    if (items.length === 0) return setError('Vyber aspoň jeden produkt.');

    setSubmitting(true);
    try {
      localStorage.setItem('mlieko_name', name.trim());
      localStorage.setItem('mlieko_phone', phone.trim());
      const res = await api.createOrder({
        employeeName: name.trim(),
        employeePhone: phone.trim(),
        note: note.trim(),
        items,
      });
      setResult(res);
      setQtys({});
      setNote('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="muted">Načítavam katalóg…</p>;

  if (result) {
    const notif = result.notifications?.employee;
    return (
      <div className="card success">
        <h2>✅ Objednávka prijatá</h2>
        <p>Ďakujeme, {result.order.employeeName}! Objednávka bola zaznamenaná pre týždeň {result.order.weekOf}.</p>
        <p className="muted">
          {notif?.ok
            ? notif.dev
              ? 'WhatsApp potvrdenie: dev režim (vypísané do konzoly backendu).'
              : 'WhatsApp potvrdenie bolo odoslané.'
            : 'WhatsApp potvrdenie sa neodoslalo (chýba telefón alebo konfigurácia).'}
        </p>
        <button className="primary" onClick={() => setResult(null)}>Nová objednávka</button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      {deadline && (
        <div className={`deadline-strip ${closed ? 'closed' : 'open'}`}>
          {closed
            ? <>🔒 Objednávky na tento týždeň sú <strong>uzavreté</strong> (uzávierka bola {deadline.label}).</>
            : <>⏳ Objednávky na tento týždeň prijímame do <strong>{deadline.label}</strong>.</>}
        </div>
      )}

      <div className="fields">
        <label>
          Meno *
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Napr. Erik Solár" />
        </label>
        <label>
          WhatsApp číslo (pre potvrdenie)
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+421900123456" />
        </label>
      </div>

      <h3>Vyber si mlieko</h3>
      {categories.map(([cat, items]) => (
        <div key={cat} className="category">
          <div className="category-title">{cat}</div>
          {items.map((p) => (
            <div key={p.id} className="product-row">
              <div className="product-info">
                <span className="product-name">{p.name}</span>
                <span className="product-desc">{p.description || p.unit}</span>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => setQty(p.id, (qtys[p.id] || 0) - 1)}>−</button>
                <input
                  type="number"
                  min="0"
                  value={qtys[p.id] || 0}
                  onChange={(e) => setQty(p.id, e.target.value)}
                />
                <button type="button" onClick={() => setQty(p.id, (qtys[p.id] || 0) + 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      <label className="note-field">
        Poznámka (voliteľné)
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Napr. dodať do piatku" rows={2} />
      </label>

      {error && <p className="error">{error}</p>}

      <div className="submit-bar">
        <span className="total">Spolu: <strong>{totalUnits} ks</strong></span>
        <button className="primary" type="submit" disabled={submitting || closed}>
          {closed ? 'Uzavreté' : submitting ? 'Odosielam…' : 'Odoslať objednávku'}
        </button>
      </div>
    </form>
  );
}

function Summary() {
  const [week, setWeek] = useState('');
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [productNames, setProductNames] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    api.currentWeek().then(({ week }) => setWeek(week)).catch((e) => setError(e.message));
    api.products()
      .then((ps) => setProductNames(Object.fromEntries(ps.map((p) => [p.id, p.name]))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!week) return;
    Promise.all([api.summary(week), api.orders(week)])
      .then(([s, o]) => { setSummary(s); setOrders(o); })
      .catch((e) => setError(e.message));
  }, [week]);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return <p className="muted">Načítavam súhrn…</p>;

  return (
    <div className="stack">
      <div className="card">
        <div className="summary-head">
          <h2>Nákupný zoznam · {summary.week}</h2>
          <span className="muted">{summary.ordersCount} objednávok · {summary.totalUnits} ks celkom</span>
        </div>
        {summary.items.length === 0 ? (
          <p className="muted">Za tento týždeň zatiaľ žiadne objednávky.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Produkt</th><th className="num">Množstvo</th></tr>
            </thead>
            <tbody>
              {summary.items.map((it) => (
                <tr key={it.productId}>
                  <td>{it.name}</td>
                  <td className="num"><strong>{it.qty}×</strong> {it.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Jednotlivé objednávky</h3>
        {orders.length === 0 ? (
          <p className="muted">Žiadne objednávky.</p>
        ) : (
          <ul className="order-list">
            {orders.map((o) => (
              <li key={o.id}>
                <div className="order-top">
                  <strong>{o.employeeName} <StatusChip status={o.status} /></strong>
                  <span className="muted">{new Date(o.createdAt).toLocaleString('sk-SK')}</span>
                </div>
                <div className="order-items">
                  {o.items.map((it, i) => (
                    <span key={i} className="chip">{it.qty}× {productNames[it.productId] || 'produkt'}</span>
                  ))}
                </div>
                {o.note && <div className="order-note">📝 {o.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const STATUS_LABELS = {
  received: { text: 'prijatá', cls: 'st-received' },
  confirmed: { text: 'potvrdená', cls: 'st-confirmed' },
  partially_confirmed: { text: 'čiastočne', cls: 'st-partial' },
  unavailable: { text: 'nedostupná', cls: 'st-unavailable' },
  delivered: { text: 'doručená', cls: 'st-delivered' },
};

function StatusChip({ status }) {
  const s = STATUS_LABELS[status] || { text: status, cls: '' };
  return <span className={`status-chip ${s.cls}`}>{s.text}</span>;
}

function AdminPanel() {
  const [info, setInfo] = useState(null);
  const [pin, setPin] = useState(() => localStorage.getItem('mlieko_admin_pin') || '');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [unavailable, setUnavailable] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  async function refresh() {
    try {
      const i = await api.adminInfo();
      setInfo(i);
      if (!deliveryDate) setDeliveryDate(i.suggestedDeliveryDate);
      const [ps, os] = await Promise.all([api.products(), api.orders(i.week)]);
      setProducts(ps);
      setOrders(os);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => { refresh(); }, []);

  if (error) return <p className="error">{error}</p>;
  if (!info) return <p className="muted">Načítavam…</p>;

  const pending = orders.filter((o) => o.status === 'received');
  const toDeliver = orders.filter((o) => ['confirmed', 'partially_confirmed'].includes(o.status));

  function toggleUnavailable(pid) {
    setUnavailable((prev) => ({ ...prev, [pid]: !prev[pid] }));
  }

  async function runProcess() {
    setBusy(true); setMsg(null); setError(null);
    try {
      localStorage.setItem('mlieko_admin_pin', pin);
      const unavailableProductIds = Object.keys(unavailable).filter((k) => unavailable[k]);
      const r = await api.adminProcess(pin, { deliveryDate, unavailableProductIds });
      setMsg(r.processed === 0
        ? 'Žiadne nespracované objednávky.'
        : `Spracovaných ${r.processed} objednávok (potvrdené: ${r.counts.confirmed}, čiastočné: ${r.counts.partially_confirmed}, nedostupné: ${r.counts.unavailable}). WhatsApp odoslaný ${r.notified}×. Doručenie: ${r.deliveryLabel}.`);
      await refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function runDelivered() {
    setBusy(true); setMsg(null); setError(null);
    try {
      localStorage.setItem('mlieko_admin_pin', pin);
      const r = await api.adminDelivered(pin);
      setMsg(r.delivered === 0
        ? 'Žiadne objednávky na naskladnenie (už sú doručené alebo nespracované).'
        : `📦 Naskladnené: ${r.delivered} objednávok, notifikácií odoslaných ${r.notified}.`);
      await refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="stack">
      {info.pinRequired && (
        <div className="card">
          <label>Admin PIN
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" />
          </label>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>1 · Potvrdenie po uzávierke</h3>
        <p className="muted">Nespracované objednávky: <strong>{pending.length}</strong> (týždeň {info.week})</p>
        <label>Deň doručenia
          <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </label>
        <h3>Nedostupné položky (nezaškrtnuté = potvrdené)</h3>
        {products.map((p) => (
          <label key={p.id} className="check-row">
            <input type="checkbox" checked={!!unavailable[p.id]} onChange={() => toggleUnavailable(p.id)} />
            <span>{p.name}</span>
          </label>
        ))}
        <div className="submit-bar">
          <span className="muted">Pošle WhatsApp potvrdenia s dňom doručenia.</span>
          <button className="primary" disabled={busy || pending.length === 0} onClick={runProcess}>
            Potvrdiť objednávky
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>2 · Deň D — naskladnenie do boxu</h3>
        <p className="muted">Čaká na doručenie: <strong>{toDeliver.length}</strong> objednávok</p>
        <div className="submit-bar">
          <span className="muted">Pošle „📦 tovar je v boxe" všetkým potvrdeným.</span>
          <button className="primary" disabled={busy || toDeliver.length === 0} onClick={runDelivered}>
            📦 Tovar naskladnený
          </button>
        </div>
        {info.courierLinkEnabled && (
          <p className="muted" style={{ marginTop: 12 }}>
            Kuriér môže naskladnenie potvrdiť sám cez odkaz <code>{window.location.origin}/kurier?t=&lt;token&gt;</code> (token je v nastavení servera).
          </p>
        )}
      </div>

      {msg && <div className="card success"><p style={{ margin: 0 }}>{msg}</p></div>}
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Objednávky týždňa</h3>
        {orders.length === 0 ? <p className="muted">Žiadne objednávky.</p> : (
          <ul className="order-list">
            {orders.map((o) => (
              <li key={o.id}>
                <div className="order-top">
                  <strong>{o.employeeName} <StatusChip status={o.status} /></strong>
                  <span className="muted">{new Date(o.createdAt).toLocaleString('sk-SK')}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CourierPage() {
  const token = new URLSearchParams(window.location.search).get('t') || '';
  const [state, setState] = useState('ready'); // ready | busy | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function confirm() {
    setState('busy'); setError(null);
    try {
      const r = await api.courierDelivered(token);
      setResult(r);
      setState('done');
    } catch (e) {
      setError(e.message);
      setState('error');
    }
  }

  return (
    <div className="app courier">
      <header className="topbar" style={{ justifyContent: 'center' }}>
        <div className="brand">
          <img className="logo-img" src="/logo.png" alt="Aha farma" />
          <div>
            <h1>Potvrdenie doručenia</h1>
            <p className="subtitle">Chladený príjmový box</p>
          </div>
        </div>
      </header>

      <div className="card" style={{ textAlign: 'center' }}>
        {state === 'done' ? (
          <>
            <h2>✅ Ďakujeme!</h2>
            <p>Naskladnených objednávok: <strong>{result.delivered}</strong>, notifikácií odoslaných: <strong>{result.notified}</strong>.</p>
            {result.delivered === 0 && <p className="muted">Všetko už bolo potvrdené skôr — netreba nič robiť.</p>}
          </>
        ) : (
          <>
            <p>Po vložení tovaru do chladeného boxu stlač tlačidlo — zákazníkom odíde WhatsApp notifikácia, že tovar je pripravený.</p>
            <button className="primary big" disabled={state === 'busy' || !token} onClick={confirm}>
              {state === 'busy' ? 'Odosielam…' : '📦 Tovar je v boxe'}
            </button>
            {!token && <p className="error">V odkaze chýba token (parameter ?t=).</p>}
            {error && <p className="error">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
