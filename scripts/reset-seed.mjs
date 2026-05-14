// Tam reset + temiz seed
const BASE = 'http://localhost:3001';

// Fresh login
const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
});
const setCookie = loginRes.headers.get('set-cookie') || '';
const COOKIE = setCookie.split(';')[0];
console.log('Login:', (await loginRes.json()).ok ? 'OK' : 'FAIL');

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Cookie': COOKIE },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

// ── RESET ──────────────────────────────────────────────────

// Giderler
const expenses = await api('GET', '/api/expenses');
for (const e of (Array.isArray(expenses) ? expenses : [])) {
  await api('DELETE', `/api/expenses/${e.id}`);
}

// Sahipleri hard delete (cascade: binalar → daireler → sözleşmeler → alacaklar → ödemeler)
const owners = await api('GET', '/api/owners');
const ownerList = Array.isArray(owners) ? owners : (owners.owners || []);
for (const o of ownerList) {
  const r = await api('DELETE', `/api/owners/${o.id}`);
  console.log(`Sahip ${o.id} silindi:`, r.ok ? 'OK' : r.error || r);
}

// Kalan kiracılar (sözleşmesiz olanlar)
const tenants = await api('GET', '/api/tenants');
const tenantList = Array.isArray(tenants) ? tenants : (tenants.tenants || []);
for (const t of tenantList) {
  await api('DELETE', `/api/tenants/${t.id}`);
}

console.log('Reset tamamlandı.\n');

// ── SEED ──────────────────────────────────────────────────

// Mülk sahipleri
const ownerData = [
  { name: 'Ahmet Yılmaz',  phone: '0 (520) 444 11 22', email: 'ahmet.yilmaz@ornek.com',  nationalId: '12345678901' },
  { name: 'Fatma Kaya',    phone: '0 (520) 444 33 44', email: 'fatma.kaya@ornek.com',    nationalId: '98765432109' },
  { name: 'Mehmet Demir',  phone: '0 (520) 444 55 66', email: 'mehmet.demir@ornek.com',  nationalId: '11223344556' },
];
const O = [];
for (const o of ownerData) {
  const r = await api('POST', '/api/owners', o);
  O.push(r); console.log('Sahip:', r.name, '→', r.id);
}

// Binalar
const propertyData = [
  { title: 'Bağcılar Rezidans',  address: 'Bağcılar Mah. Atatürk Cad. No:12, İstanbul',        ownerId: O[0].id },
  { title: 'Kadıköy Apartmanı',  address: 'Moda Cad. No:45, Kadıköy, İstanbul',                ownerId: O[0].id },
  { title: 'Ankara Plaza',       address: 'Kızılay Mah. İnkılap Sok. No:8, Çankaya, Ankara',   ownerId: O[1].id },
  { title: 'İzmir Konutları',    address: 'Alsancak Mah. Kıbrıs Şehitleri Cad. No:33, İzmir', ownerId: O[2].id },
];
const P = [];
for (const p of propertyData) {
  const r = await api('POST', '/api/properties', p);
  P.push(r); console.log('Bina:', r.title, '→', r.id);
}

// Daireler
const unitData = [
  { propertyId: P[0].id, unitNo: 'D-1',   floor: 1, type: '2+1', area: 85,  status: 'occupied' },
  { propertyId: P[0].id, unitNo: 'D-2',   floor: 1, type: '3+1', area: 110, status: 'occupied' },
  { propertyId: P[0].id, unitNo: 'D-3',   floor: 2, type: '1+1', area: 60,  status: 'occupied' },
  { propertyId: P[0].id, unitNo: 'D-4',   floor: 2, type: '2+1', area: 85,  status: 'vacant'   },
  { propertyId: P[1].id, unitNo: 'A-1',   floor: 1, type: '2+1', area: 90,  status: 'occupied' },
  { propertyId: P[1].id, unitNo: 'A-2',   floor: 2, type: '3+1', area: 120, status: 'occupied' },
  { propertyId: P[1].id, unitNo: 'A-3',   floor: 3, type: '1+1', area: 55,  status: 'vacant'   },
  { propertyId: P[2].id, unitNo: 'K-101', floor: 1, type: '2+1', area: 95,  status: 'occupied' },
  { propertyId: P[2].id, unitNo: 'K-102', floor: 1, type: '2+1', area: 95,  status: 'occupied' },
  { propertyId: P[3].id, unitNo: 'P-01',  floor: 1, type: '3+1', area: 130, status: 'occupied' },
];
const U = [];
for (const u of unitData) {
  const r = await api('POST', '/api/units', u);
  U.push(r); console.log('Daire:', r.unitNo, '→', r.id);
}

// Kiracılar
const tenantData = [
  { name: 'Ali Çelik',     phone: '0 (520) 444 10 01', email: 'ali.celik@ornek.com',     nationalId: '11122233344' },
  { name: 'Zeynep Arslan', phone: '0 (520) 444 10 02', email: 'zeynep.arslan@ornek.com', nationalId: '22233344455' },
  { name: 'Burak Şahin',   phone: '0 (520) 444 10 03', email: 'burak.sahin@ornek.com',   nationalId: '33344455566' },
  { name: 'Selin Koç',     phone: '0 (520) 444 10 04', email: 'selin.koc@ornek.com',     nationalId: '44455566677' },
  { name: 'Emre Yıldız',   phone: '0 (520) 444 10 05', email: 'emre.yildiz@ornek.com',   nationalId: '55566677788' },
  { name: 'Ayşe Doğan',    phone: '0 (520) 444 10 06', email: 'ayse.dogan@ornek.com',    nationalId: '66677788899' },
  { name: 'Murat Öztürk',  phone: '0 (520) 444 10 07', email: 'murat.ozturk@ornek.com',  nationalId: '77788899900' },
];
const T = [];
for (const t of tenantData) {
  const r = await api('POST', '/api/tenants', t);
  T.push(r); console.log('Kiracı:', r.name, '→', r.id);
}

// Sözleşmeler (dolu daireler: 0,1,2,4,5,7,8,9)
const contractDefs = [
  { unitId: U[0].id, tenantId: T[0].id, rentAmount: 9500,  paymentDay: 5,  depositAmount: 19000 },
  { unitId: U[1].id, tenantId: T[1].id, rentAmount: 13000, paymentDay: 1,  depositAmount: 26000 },
  { unitId: U[2].id, tenantId: T[2].id, rentAmount: 6500,  paymentDay: 10, depositAmount: 13000 },
  { unitId: U[4].id, tenantId: T[3].id, rentAmount: 10500, paymentDay: 3,  depositAmount: 21000 },
  { unitId: U[5].id, tenantId: T[4].id, rentAmount: 16000, paymentDay: 1,  depositAmount: 32000 },
  { unitId: U[7].id, tenantId: T[5].id, rentAmount: 11000, paymentDay: 5,  depositAmount: 22000 },
  { unitId: U[8].id, tenantId: T[6].id, rentAmount: 10500, paymentDay: 15, depositAmount: 21000 },
];
const C = [];
for (const c of contractDefs) {
  const r = await api('POST', '/api/contracts', {
    ...c, startDate: '2024-01-01', endDate: '2027-12-31', currency: 'TRY',
  });
  C.push(r); console.log('Sözleşme → id:', r.id, 'daire:', r.unitId);
}

// Alacaklar
console.log('\nAlacaklar üretiliyor...');
for (const m of ['2026-01','2026-02','2026-03','2026-04','2026-05']) {
  const r = await api('POST', '/api/charges?action=generate', { date: `${m}-15T12:00:00.000Z` });
  console.log(`${m}: ${r.created} alacak`);
}

// Ödemeler
console.log('\nÖdemeler ekleniyor...');
const allCharges = await api('GET', '/api/charges');
const charges = Array.isArray(allCharges) ? allCharges : [];

const byMonth = (prefix) => charges.filter(c => c.periodStart?.startsWith(prefix));
const jan = byMonth('2026-01'), feb = byMonth('2026-02'), mar = byMonth('2026-03');
const apr = byMonth('2026-04');

for (const c of [...jan, ...feb, ...mar]) {
  await api('POST', `/api/charges/${c.id}/payments`, {
    amount: Number(c.chargeAmount), paidAt: new Date().toISOString(), method: 'bank_transfer',
  });
}
console.log(`${jan.length + feb.length + mar.length} tam ödeme (Oca-Mar)`);

for (const c of apr.slice(0, 4)) {
  await api('POST', `/api/charges/${c.id}/payments`, {
    amount: Math.floor(Number(c.chargeAmount) * 0.5), paidAt: new Date().toISOString(), method: 'cash',
  });
}
console.log(`4 kısmi ödeme (Nis)`);

await api('POST', '/api/charges?action=update-overdue', {});

// Giderler
for (const e of [
  { description: 'Asansör bakımı',    amount: 2500, date: '2026-03-10', category: 'maintenance', propertyId: P[0].id },
  { description: 'Çatı onarımı',      amount: 8500, date: '2026-02-20', category: 'repair',      propertyId: P[1].id },
  { description: 'Boya badana',       amount: 3200, date: '2026-04-05', category: 'repair',      propertyId: P[2].id },
  { description: 'Yangın sigortası',  amount: 4800, date: '2026-05-01', category: 'insurance'                        },
  { description: 'Bahçe düzenlemesi', amount: 1800, date: '2026-04-15', category: 'maintenance', propertyId: P[0].id },
]) { await api('POST', '/api/expenses', e); }
console.log('5 gider eklendi');

const finalCharges = await api('GET', '/api/charges');
console.log(`\n✓ Bitti — ${Array.isArray(finalCharges) ? finalCharges.length : '?'} alacak, ${charges.length > 0 ? jan.length+feb.length+mar.length : 0} ödeme`);
