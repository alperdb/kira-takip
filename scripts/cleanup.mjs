// Tüm alacak ve ödemeleri temizle, sonra yeniden üret
const BASE   = 'http://localhost:3001';
const COOKIE = 'kira_session=07424d93-ce6d-4658-ab8f-c84df38684db';

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Cookie': COOKIE },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

// 1. Tüm alacakları sil
const charges = await api('GET', '/api/charges');
const list = Array.isArray(charges) ? charges : [];
console.log(`${list.length} alacak siliniyor...`);
for (const c of list) {
  await api('DELETE', `/api/charges/${c.id}`);
}
console.log('Alacaklar silindi.');

// 2. Alacakları yeniden üret (son 4 ay + bu ay)
console.log('\nAlacaklar üretiliyor...');
for (const month of ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05']) {
  const r = await api('POST', '/api/charges?action=generate', { date: `${month}-15T12:00:00.000Z` });
  console.log(`${month}: ${r.created} alacak`);
}

// 3. Ödemeleri ekle
console.log('\nÖdemeler ekleniyor...');
const allCharges = await api('GET', '/api/charges');
const chargeList = Array.isArray(allCharges) ? allCharges : [];

const jan = chargeList.filter(c => c.periodStart?.startsWith('2026-01'));
const feb = chargeList.filter(c => c.periodStart?.startsWith('2026-02'));
const mar = chargeList.filter(c => c.periodStart?.startsWith('2026-03'));
const apr = chargeList.filter(c => c.periodStart?.startsWith('2026-04'));

for (const c of [...jan, ...feb, ...mar]) {
  await api('POST', `/api/charges/${c.id}/payments`, {
    amount: Number(c.chargeAmount),
    paidAt: new Date().toISOString(),
    method: 'bank_transfer',
  });
}
console.log(`${jan.length + feb.length + mar.length} alacak tam ödendi (Oca-Mar)`);

for (const c of apr.slice(0, 4)) {
  await api('POST', `/api/charges/${c.id}/payments`, {
    amount: Math.floor(Number(c.chargeAmount) * 0.5),
    paidAt: new Date().toISOString(),
    method: 'cash',
  });
}
console.log(`4 alacak kısmi ödendi (Nis)`);

await api('POST', '/api/charges?action=update-overdue', {});
console.log('Gecikme statüsü güncellendi.');

const final = await api('GET', '/api/charges');
console.log('\nSonuç:', Array.isArray(final) ? final.length : '?', 'alacak');
console.log('✓ Temizlik tamamlandı!');
