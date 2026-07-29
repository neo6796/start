// Tenká vrstva nad fetch-om pre komunikáciu s backendom.
async function req(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Chyba ${res.status}`);
  return data;
}

export const api = {
  health: () => req('/health'),
  config: () => req('/config'),
  currentWeek: () => req('/current-week'),
  products: () => req('/products'),
  createOrder: (order) => req('/orders', { method: 'POST', body: JSON.stringify(order) }),
  orders: (week) => req(`/orders${week ? `?week=${encodeURIComponent(week)}` : ''}`),
  summary: (week) => req(`/summary${week ? `?week=${encodeURIComponent(week)}` : ''}`),
  adminInfo: () => req('/admin/info'),
  adminProcess: (pin, body) =>
    req('/admin/process', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin }, body: JSON.stringify(body) }),
  adminDelivered: (pin) =>
    req('/admin/delivered', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin }, body: '{}' }),
  courierDelivered: (token) =>
    req('/courier/delivered', { method: 'POST', body: JSON.stringify({ token }) }),
};
